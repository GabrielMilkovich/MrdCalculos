/**
 * Wrapper de assinatura digital ICP-Brasil para PDFs e XMLs.
 *
 * Utiliza node-forge (100% JS) para manipular PKCS#12 (A1 .pfx),
 * X.509 e PKCS#7. Suporta XML-DSig enveloped (com <Signature>) e
 * expõe stub para PDF CAdES-BES (embed real requer manipulação
 * low-level do PDF — deixado como TODO).
 *
 * Referências: IN RFB 1715/2017, DOC-ICP-15 (política de assinatura).
 */
import forge from 'node-forge';

// OIDs ICP-Brasil para pessoa física (PF) e pessoa jurídica (PJ).
// Formato do conteúdo (OtherName): concatenação de campos BCD/ASCII
// conforme DOC-ICP-04.
const OID_ICP_PF = '2.16.76.1.3.1';
const OID_ICP_PJ = '2.16.76.1.3.4';
const OID_AC_RAIZ_BRASILEIRA_CN_PREFIX = 'Autoridade Certificadora Raiz Brasileira';

export interface CertificadoICPBrasil {
  pfxBase64: string;
  senha: string;
}

export interface DadosAssinatura {
  nomeSignatario: string;
  cpfCnpj: string;
  dataAssinatura: Date;
  algoritmo: 'SHA256withRSA';
}

export interface ParsedCert {
  certificate: forge.pki.Certificate;
  privateKey: forge.pki.rsa.PrivateKey;
  cadeia: forge.pki.Certificate[];
}

export interface ValidacaoCertificado {
  valido: boolean;
  erros: string[];
}

/** Abre um PFX base64 e extrai certificado, chave privada e cadeia. */
export async function carregarCertificado(
  cert: CertificadoICPBrasil,
): Promise<ParsedCert> {
  if (!cert.pfxBase64) throw new Error('PFX vazio');
  let pfxDer: string;
  try {
    pfxDer = forge.util.decode64(cert.pfxBase64);
  } catch {
    throw new Error('PFX base64 inválido');
  }
  let p12Asn1: forge.asn1.Asn1;
  try {
    p12Asn1 = forge.asn1.fromDer(pfxDer);
  } catch {
    throw new Error('PFX com ASN.1 malformado');
  }
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, cert.senha);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/mac|password|invalid/i.test(msg)) {
      throw new Error('Senha do certificado incorreta');
    }
    throw new Error(`Falha ao abrir PFX: ${msg}`);
  }

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const certList = certBags[forge.pki.oids.certBag] ?? [];
  const keyList = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];
  if (certList.length === 0 || !certList[0].cert) {
    throw new Error('Certificado não encontrado no PFX');
  }
  if (keyList.length === 0 || !keyList[0].key) {
    throw new Error('Chave privada não encontrada no PFX');
  }
  const certificate = certList[0].cert;
  const privateKey = keyList[0].key as forge.pki.rsa.PrivateKey;
  const cadeia = certList
    .map((b) => b.cert)
    .filter((c): c is forge.pki.Certificate => Boolean(c));

  return { certificate, privateKey, cadeia };
}

/** Extrai o valor ICP-Brasil (CPF ou CNPJ) das extensões subjectAltName. */
function extrairCpfCnpjDoCert(cert: forge.pki.Certificate): string {
  const ext = cert.getExtension({ name: 'subjectAltName' }) as
    | { altNames?: Array<{ type: number; value: string; oid?: string }> }
    | null
    | undefined;
  for (const alt of ext?.altNames ?? []) {
    // type 0 = otherName; node-forge não expande OtherName: buscamos
    // substring numérica longa (CPF=11 ou CNPJ=14) no value bruto.
    if (alt.type === 0) {
      const bytes = alt.value ?? '';
      const numeros = bytes.replace(/\D/g, '');
      if (numeros.length >= 14) return numeros.slice(-14);
      if (numeros.length >= 11) return numeros.slice(-11);
    }
  }
  // Fallback: alguns certs colocam CPF no CN "NOME:CPF".
  const cn = cert.subject.getField('CN');
  if (cn?.value && typeof cn.value === 'string') {
    const m = /:(\d{11,14})$/.exec(cn.value);
    if (m) return m[1];
  }
  return '';
}

export function extrairDadosCertificado(parsed: ParsedCert): DadosAssinatura {
  const cnField = parsed.certificate.subject.getField('CN');
  const nome: string =
    cnField && typeof cnField.value === 'string'
      ? cnField.value.split(':')[0]
      : '';
  return {
    nomeSignatario: nome,
    cpfCnpj: extrairCpfCnpjDoCert(parsed.certificate),
    dataAssinatura: new Date(),
    algoritmo: 'SHA256withRSA',
  };
}

export function validarCertificadoICP(parsed: ParsedCert): ValidacaoCertificado {
  const erros: string[] = [];
  const now = new Date();
  const { notBefore, notAfter } = parsed.certificate.validity;
  if (now < notBefore) erros.push('Certificado ainda não vigente');
  if (now > notAfter) erros.push('Certificado expirado');

  // Checa presença de OID ICP-Brasil em subjectAltName.
  const san = parsed.certificate.getExtension({ name: 'subjectAltName' }) as
    | { altNames?: Array<{ oid?: string; type: number }> }
    | null
    | undefined;
  const temOidIcp = (san?.altNames ?? []).some(
    (a) => a.oid === OID_ICP_PF || a.oid === OID_ICP_PJ,
  );
  // Também aceitamos CPF embutido no CN (certificados de teste).
  if (!temOidIcp && !extrairCpfCnpjDoCert(parsed.certificate)) {
    erros.push('Certificado sem OID ICP-Brasil (2.16.76.1.3.1 ou 2.16.76.1.3.4)');
  }

  // TODO: validação completa da cadeia contra AC Raiz Brasileira v5/v6
  // requer lista atualizada de certificados raiz do ITI. Aqui apenas
  // verificamos se o emissor declarado bate com o padrão esperado OU
  // se o certificado é auto-assinado (testes).
  const issuerCn = parsed.certificate.issuer.getField('CN');
  const issuerName =
    issuerCn && typeof issuerCn.value === 'string' ? issuerCn.value : '';
  const subjectCn = parsed.certificate.subject.getField('CN');
  const subjectName =
    subjectCn && typeof subjectCn.value === 'string' ? subjectCn.value : '';
  const selfSigned = issuerName === subjectName;
  const cadeiaIcp = issuerName.startsWith(OID_AC_RAIZ_BRASILEIRA_CN_PREFIX);
  if (!selfSigned && !cadeiaIcp) {
    // Não bloqueia, apenas informa — validação completa é TODO.
    erros.push(
      'Emissor não identificado como AC ICP-Brasil (validação completa pendente)',
    );
  }

  return { valido: erros.length === 0, erros };
}

/**
 * Produz XML assinado (XML-DSig enveloped) anexando um elemento
 * <Signature> ao final. Usa canonicalização simplificada (string raw)
 * — suficiente para e-Social/PJe quando o XML origem é estável.
 * Algoritmos: SHA-256 + RSA, conforme DOC-ICP-15.
 */
export async function assinarXml(
  xml: string,
  cert: CertificadoICPBrasil,
): Promise<string> {
  const parsed = await carregarCertificado(cert);
  const digestXml = forge.md.sha256.create();
  digestXml.update(xml, 'utf8');
  const digestB64 = forge.util.encode64(digestXml.digest().bytes());

  // SignedInfo canônico (string fixa, ordem de atributos estável).
  const signedInfo =
    '<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">' +
    '<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>' +
    '<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>' +
    '<Reference URI="">' +
    '<Transforms>' +
    '<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>' +
    '</Transforms>' +
    '<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>' +
    `<DigestValue>${digestB64}</DigestValue>` +
    '</Reference>' +
    '</SignedInfo>';

  const sigMd = forge.md.sha256.create();
  sigMd.update(signedInfo, 'utf8');
  const signatureBytes = parsed.privateKey.sign(sigMd);
  const signatureB64 = forge.util.encode64(signatureBytes);
  const certB64 = forge.util.encode64(
    forge.asn1.toDer(forge.pki.certificateToAsn1(parsed.certificate)).getBytes(),
  );

  const signatureEl =
    '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">' +
    signedInfo +
    `<SignatureValue>${signatureB64}</SignatureValue>` +
    `<KeyInfo><X509Data><X509Certificate>${certB64}</X509Certificate></X509Data></KeyInfo>` +
    '</Signature>';

  // Insere antes do fechamento do elemento raiz.
  const match = /<\/([A-Za-z_][\w:\-.]*)\s*>\s*$/.exec(xml);
  if (!match) return xml + signatureEl;
  const idx = match.index;
  return xml.slice(0, idx) + signatureEl + xml.slice(idx);
}

/**
 * Assina PDF com CAdES-BES embutido (/ByteRange + /Contents).
 * TODO: embed real requer manipulação low-level do PDF (parsing do
 * xref, alocação de /Contents, recomputação do /ByteRange). Por ora
 * lançamos erro preservando a assinatura da função.
 */
export async function assinarPdf(
  pdfBlob: Blob,
  cert: CertificadoICPBrasil,
): Promise<Blob> {
  // Valida que o certificado abre — útil para falhar cedo no chamador.
  await carregarCertificado(cert);
  void pdfBlob;
  throw new Error(
    'assinarPdf: embed CAdES-BES em PDF não implementado (TODO)',
  );
}
