import type { CtpsLocalTrabalho } from '../../../tipos-dominio.ts';
import { mergeCamposKV } from '../helpers.ts';

export function parseLocalTrabalho(linhas: string[]): CtpsLocalTrabalho | null {
  if (linhas.length === 0) return null;
  const c = mergeCamposKV(linhas);
  if (!c.has('estabelecimento') || !c.has('cnpj')) return null;

  // UF/PAIS vem como "PR Brasil" — divide no primeiro espaço.
  const ufPais = (c.get('uf_pais') ?? '').trim();
  const ufPaisParts = ufPais.split(/\s+/);

  return {
    estabelecimento: c.get('estabelecimento') ?? '',
    matriz_filial: (c.get('matriz_filial') as 'Matriz' | 'Filial' | undefined) ?? null,
    cnpj: c.get('cnpj') ?? '',
    inscricao_estadual: c.get('insc_estadual') || null,
    endereco_rua: c.get('endereco') ?? '',
    endereco_numero: c.get('n') ?? '',
    endereco_complemento: c.get('complemento') || null,
    endereco_bairro: c.get('bairro') ?? '',
    endereco_cep: (c.get('cep') ?? '').replace(/\D/g, ''),
    endereco_telefone: c.get('telefone') || null,
    endereco_municipio: c.get('municipio') ?? '',
    endereco_uf: ufPaisParts[0] ?? '',
    endereco_pais: ufPaisParts.slice(1).join(' '),
  };
}
