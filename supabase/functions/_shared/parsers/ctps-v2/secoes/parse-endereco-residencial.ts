import type { CtpsEnderecoResidencial } from '../../../tipos-dominio.ts';
import { mergeCamposKV } from '../helpers.ts';

export function parseEnderecoResidencial(linhas: string[]): CtpsEnderecoResidencial | null {
  if (linhas.length === 0) return null;
  const c = mergeCamposKV(linhas);
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
