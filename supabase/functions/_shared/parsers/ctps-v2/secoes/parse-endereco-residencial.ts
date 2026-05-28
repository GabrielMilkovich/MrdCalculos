import type { CtpsEnderecoResidencial } from '../../../tipos-dominio.ts';
import { mergeCamposKVConhecidos } from '../helpers.ts';

const CHAVES_ENDERECO_RESIDENCIAL = [
  'End(Rua,Av)',
  'Endereço',
  'No',
  'Nº',
  'Complemento',
  'Bairro',
  'CEP',
  'Telefone',
  'Município',
  'UF/PAIS',
];

export function parseEnderecoResidencial(linhas: string[]): CtpsEnderecoResidencial | null {
  if (linhas.length === 0) return null;
  const c = mergeCamposKVConhecidos(linhas, CHAVES_ENDERECO_RESIDENCIAL);
  if (!c.has('end_rua_av') && !c.has('endereco')) return null;

  const ufPais = (c.get('uf_pais') ?? '').trim();
  const ufPaisParts = ufPais.split(/\s+/);

  return {
    rua: c.get('end_rua_av') ?? c.get('endereco') ?? '',
    numero: c.get('no') ?? c.get('n') ?? '',
    complemento: c.get('complemento') || null,
    bairro: c.get('bairro') ?? '',
    cep: (c.get('cep') ?? '').replace(/\D/g, ''),
    telefone: c.get('telefone') || null,
    municipio: c.get('municipio') ?? '',
    uf: ufPaisParts[0] ?? '',
    pais: ufPaisParts.slice(1).join(' '),
  };
}
