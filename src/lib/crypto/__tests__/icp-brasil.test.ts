/**
 * Testes do wrapper ICP-Brasil.
 * Geramos um certificado auto-assinado em memória com node-forge para
 * evitar arquivos de teste e dependência de PKI externa.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import forge from 'node-forge';
import {
  carregarCertificado,
  extrairDadosCertificado,
  validarCertificadoICP,
  assinarXml,
  type CertificadoICPBrasil,
} from '../icp-brasil';
import { verificarAssinaturaXml } from '../icp-verificador';

interface CertTeste {
  pfxBase64: string;
  senha: string;
}

/** Gera um PFX auto-assinado embutindo CPF no CN ("NOME:CPF"). */
function gerarCertificadoTeste(opts: {
  nome: string;
  cpf: string;
  senha: string;
  validoAte?: Date;
  validoDe?: Date;
}): CertTeste {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = opts.validoDe ?? new Date(Date.now() - 86400000);
  cert.validity.notAfter =
    opts.validoAte ?? new Date(Date.now() + 365 * 86400000);
  const attrs = [{ name: 'commonName', value: `${opts.nome}:${opts.cpf}` }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, nonRepudiation: true },
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    keys.privateKey,
    [cert],
    opts.senha,
    { algorithm: '3des' },
  );
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return { pfxBase64: forge.util.encode64(p12Der), senha: opts.senha };
}

describe('icp-brasil wrapper', () => {
  let certTeste: CertTeste;

  beforeAll(() => {
    certTeste = gerarCertificadoTeste({
      nome: 'FULANO DE TAL',
      cpf: '12345678909',
      senha: 'senha123',
    });
  }, 30000);

  it('carregarCertificado lanca erro com PFX invalido', async () => {
    const bad: CertificadoICPBrasil = {
      pfxBase64: forge.util.encode64('nao-eh-um-pfx'),
      senha: 'x',
    };
    await expect(carregarCertificado(bad)).rejects.toThrow();
  });

  it('carregarCertificado lanca erro com senha errada', async () => {
    const cert: CertificadoICPBrasil = {
      pfxBase64: certTeste.pfxBase64,
      senha: 'errada',
    };
    await expect(carregarCertificado(cert)).rejects.toThrow(
      /senha/i,
    );
  });

  it('extrairDadosCertificado retorna CN e CPF', async () => {
    const parsed = await carregarCertificado(certTeste);
    const dados = extrairDadosCertificado(parsed);
    expect(dados.nomeSignatario).toBe('FULANO DE TAL');
    expect(dados.cpfCnpj).toBe('12345678909');
    expect(dados.algoritmo).toBe('SHA256withRSA');
  });

  it('validarCertificadoICP detecta expirado', async () => {
    const expirado = gerarCertificadoTeste({
      nome: 'VELHO',
      cpf: '11122233344',
      senha: 'p',
      validoDe: new Date(Date.now() - 2 * 365 * 86400000),
      validoAte: new Date(Date.now() - 86400000),
    });
    const parsed = await carregarCertificado(expirado);
    const res = validarCertificadoICP(parsed);
    expect(res.valido).toBe(false);
    expect(res.erros.some((e) => /expirado/i.test(e))).toBe(true);
  });

  it('assinarXml produz <Signature> e verificarAssinaturaXml valida', async () => {
    const xml = '<root><item>valor</item></root>';
    const assinado = await assinarXml(xml, certTeste);
    expect(assinado).toContain('<Signature');
    expect(assinado).toContain('</Signature>');
    expect(assinado).toContain('SignatureValue');
    expect(assinado).toContain('X509Certificate');

    const v = verificarAssinaturaXml(assinado);
    expect(v.erros).toEqual([]);
    expect(v.valido).toBe(true);
    expect(v.signatario?.nomeSignatario).toBe('FULANO DE TAL');
    expect(v.signatario?.cpfCnpj).toBe('12345678909');
  });

  it('verificarAssinaturaXml detecta XML sem Signature', () => {
    const v = verificarAssinaturaXml('<root/>');
    expect(v.valido).toBe(false);
    expect(v.erros.length).toBeGreaterThan(0);
  });
});
