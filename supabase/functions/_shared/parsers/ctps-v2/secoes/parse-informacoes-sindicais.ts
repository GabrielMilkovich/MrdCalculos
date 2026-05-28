import type { CtpsInformacaoSindical } from '../../../tipos-dominio.ts';
import { mergeCamposKVConhecidos } from '../helpers.ts';

const CHAVES_SINDICATO = [
  'Sindicato',
  'CNPJ',
  'End(Rua,Av)',
  'No',
  'Complemento',
  'Bairro',
  'CEP',
  'Telefone',
  'Município',
  'UF/PAIS',
  'Base Territ',
];

const RE_INICIO_SINDICATO = /^\s*Sindicato\.{0,}:/;

/**
 * INFORMAÇÕES SINDICAIS pode ter MÚLTIPLAS ocorrências (ex.: JOSELI tem 2
 * sindicatos — SIND EMPR COMERCIO + SEC ITU). `seccionar` empilha todas as
 * linhas das duas seções no mesmo bucket; aqui dividimos onde aparece uma
 * nova linha começando com `Sindicato......:`.
 */
export function parseInformacoesSindicais(linhas: string[]): CtpsInformacaoSindical[] {
  if (linhas.length === 0) return [];

  const grupos: string[][] = [];
  let atual: string[] | null = null;
  for (const linha of linhas) {
    if (RE_INICIO_SINDICATO.test(linha)) {
      atual = [linha];
      grupos.push(atual);
    } else if (atual) {
      atual.push(linha);
    }
  }

  return grupos
    .map((g) => {
      const c = mergeCamposKVConhecidos(g, CHAVES_SINDICATO);
      if (!c.has('sindicato')) return null;
      return {
        sindicato: c.get('sindicato') ?? '',
        cnpj: (c.get('cnpj') ?? '').replace(/\s/g, ''),
        endereco_rua: c.get('end_rua_av') || null,
        endereco_numero: c.get('no') || null,
        endereco_complemento: c.get('complemento') || null,
      };
    })
    .filter((s): s is CtpsInformacaoSindical => s !== null);
}
