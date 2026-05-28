import type { CtpsInformacoesSindicais } from '../../../tipos-dominio.ts';
import { mergeCamposKV } from '../helpers.ts';

export function parseInformacoesSindicais(linhas: string[]): CtpsInformacoesSindicais | null {
  if (linhas.length === 0) return null;
  const c = mergeCamposKV(linhas);
  if (!c.has('sindicato')) return null;

  return {
    sindicato: c.get('sindicato') ?? '',
    cnpj: (c.get('cnpj') ?? '').replace(/\s/g, ''),
    endereco_rua: c.get('end_rua_av') || null,
    endereco_numero: c.get('no') || null,
    endereco_complemento: c.get('complemento') || null,
  };
}
