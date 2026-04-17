/**
 * Verificador de assinaturas ICP-Brasil (XML-DSig / CAdES).
 *
 * Complementa `icp-brasil.ts`: abre o artefato assinado, extrai o
 * elemento Signature (XML) ou o CMS (PDF), valida o digest do conteúdo,
 * a assinatura criptográfica sobre SignedInfo e retorna os dados do
 * signatário embutidos no certificado X.509 (CN + OID ICP-Brasil).
 */
import forge from 'node-forge';
import type { DadosAssinatura } from './icp-brasil';

export interface ResultadoVerificacaoXml {
  valido: boolean;
  signatario?: DadosAssinatura;
  erros: string[];
}

export interface ResultadoVerificacaoPdf {
  valido: boolean;
  signatarios: DadosAssinatura[];
  erros: string[];
}

const OID_ICP_PF = '2.16.76.1.3.1';
const OID_ICP_PJ = '2.16.76.1.3.4';

function extrairCpfCnpj(cert: forge.pki.Certificate): string {
  const ext = cert.getExtension({ name: 'subjectAltName' }) as
    | { altNames?: Array<{ type: number; value: string; oid?: string }> }
    | null
    | undefined;
  for (const alt of ext?.altNames ?? []) {
    if (alt.type === 0) {
      const numeros = (alt.value ?? '').replace(/\D/g, '');
      if (numeros.length >= 14) return numeros.slice(-14);
      if (numeros.length >= 11) return numeros.slice(-11);
    }
  }
  const cn = cert.subject.getField('CN');
  if (cn?.value && typeof cn.value === 'string') {
    const m = /:(\d{11,14})$/.exec(cn.value);
    if (m) return m[1];
  }
  return '';
}

function dadosDoCert(cert: forge.pki.Certificate): DadosAssinatura {
  const cn = cert.subject.getField('CN');
  const nome =
    cn && typeof cn.value === 'string' ? cn.value.split(':')[0] : '';
  return {
    nomeSignatario: nome,
    cpfCnpj: extrairCpfCnpj(cert),
    dataAssinatura: cert.validity.notBefore,
    algoritmo: 'SHA256withRSA',
  };
}

function extrairTag(xml: string, tag: string): string | null {
  const re = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`,
    'i',
  );
  const m = re.exec(xml);
  return m ? m[1].trim() : null;
}

/**
 * Verifica assinatura XML-DSig enveloped produzida por `assinarXml`.
 * Cheques: presença da tag Signature, digest SHA-256 do XML sem
 * Signature, verificação RSA sobre SignedInfo, OID ICP-Brasil presente.
 */
export function verificarAssinaturaXml(xml: string): ResultadoVerificacaoXml {
  const erros: string[] = [];
  const sigMatch =
    /<Signature[\s\S]*?<\/Signature>/.exec(xml);
  if (!sigMatch) {
    return { valido: false, erros: ['XML sem elemento Signature'] };
  }
  const signatureBlock = sigMatch[0];
  const xmlSemSig = xml.replace(signatureBlock, '');

  const digestValue = extrairTag(signatureBlock, 'DigestValue');
  const signatureValue = extrairTag(signatureBlock, 'SignatureValue');
  const certB64 = extrairTag(signatureBlock, 'X509Certificate');
  const signedInfo = extrairTag(signatureBlock, 'SignedInfo');
  if (!digestValue) erros.push('DigestValue ausente');
  if (!signatureValue) erros.push('SignatureValue ausente');
  if (!certB64) erros.push('X509Certificate ausente');
  if (!signedInfo) erros.push('SignedInfo ausente');
  if (erros.length > 0) return { valido: false, erros };

  // Confere DigestValue sobre o XML sem o Signature.
  const md = forge.md.sha256.create();
  md.update(xmlSemSig, 'utf8');
  const calc = forge.util.encode64(md.digest().bytes());
  if (calc !== digestValue) erros.push('DigestValue não confere com o XML');

  let cert: forge.pki.Certificate;
  try {
    const der = forge.util.decode64(certB64 as string);
    const asn1 = forge.asn1.fromDer(der);
    cert = forge.pki.certificateFromAsn1(asn1);
  } catch {
    return { valido: false, erros: [...erros, 'Certificado X.509 inválido'] };
  }
  // Reaproveita o bloco SignedInfo original (byte-a-byte) para RSA.
  const rawSignedInfo =
    /<SignedInfo[\s\S]*?<\/SignedInfo>/.exec(signatureBlock)?.[0] ?? '';
  const siMd = forge.md.sha256.create();
  siMd.update(rawSignedInfo, 'utf8');
  const sigBytes = forge.util.decode64(signatureValue as string);
  const pub = cert.publicKey as forge.pki.rsa.PublicKey;
  let rsaOk = false;
  try {
    rsaOk = pub.verify(siMd.digest().bytes(), sigBytes);
  } catch {
    rsaOk = false;
  }
  if (!rsaOk) erros.push('SignatureValue não confere (RSA)');

  // OID ICP-Brasil (não bloqueia; apenas informa em caso de ausência).
  const san = cert.getExtension({ name: 'subjectAltName' }) as
    | { altNames?: Array<{ oid?: string }> }
    | null
    | undefined;
  const temIcp = (san?.altNames ?? []).some(
    (a) => a.oid === OID_ICP_PF || a.oid === OID_ICP_PJ,
  );
  if (!temIcp && !extrairCpfCnpj(cert)) {
    erros.push('Certificado sem OID ICP-Brasil');
  }

  return {
    valido: erros.length === 0,
    signatario: dadosDoCert(cert),
    erros,
  };
}

/**
 * Verificação de assinatura CAdES-BES embutida em PDF.
 * TODO: parsing de /ByteRange + /Contents e validação do CMS requer
 * leitura low-level do PDF. Retornamos stub com interface estável.
 */
export async function verificarAssinaturaPdf(
  pdf: Blob,
): Promise<ResultadoVerificacaoPdf> {
  void pdf;
  return {
    valido: false,
    signatarios: [],
    erros: ['verificarAssinaturaPdf: não implementado (TODO CAdES embed)'],
  };
}
