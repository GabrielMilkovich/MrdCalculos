import { parseHistoricoFerias } from '../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-historico-ferias';
import { parseAfastamentos } from '../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-afastamentos';
import { adaptarFerias } from './adapters/to-ferias-parseada';
import { adaptarFaltas } from './adapters/to-falta-parseada';
import type { CtpsDominioV2 } from '@/domain/tipos-dominio';
import type { ParseFeriasResult } from '../ferias';
import type { ParseFaltasResult } from '../faltas';

function normalizarMistral(texto: string): string[] {
  return texto.split('\n').map(l =>
    l.replace(/\|/g, ' ')
     .replace(/^#+\s*/, '')  // markdown heading (#, ##, ...) presente em alguns formatos ADP
     .replace(/\s+/g, ' ')
     .trim()
  );
}

function recortar(linhas: string[], reIni: RegExp, reFim: RegExp): string[] {
  const i = linhas.findIndex(l => reIni.test(l));
  if (i < 0) return [];
  let j = linhas.slice(i + 1).findIndex(l => reFim.test(l));
  j = j < 0 ? linhas.length : i + 1 + j;
  return linhas.slice(i + 1, j);
}

// Âncoras robustas para variações do Mistral OCR:
//
//   RE_FERIAS_HEADER:
//     - [ÓO]  → HISTÓRICO com ou sem acento
//     - [FP]  → OCR às vezes lê "F" como "P" → "PERIAS" em vez de "FÉRIAS"
//     - [EÉ]  → cobre FÉRIAS (acento) e FERIAS / PERIAS (sem acento)
//
//   RE_AFASTAMENTOS_QUALQUER:
//     - \b após AFASTAMENTOS casa com qualquer variante:
//       "AFASTAMENTOS" exato, "AFASTAMENTOS OUTROS", "AFASTAMENTOS OUTRAS",
//       "AFASTAMENTOS USTAIS" (header corrompido do Roque)
//     - sem \b, exigiria linha vazia após a palavra
const RE_FERIAS_HEADER = /^HIST[ÓO]RICO\s+DE\s+[FP][EÉ]RIAS$/i;
const RE_AFASTAMENTOS_QUALQUER = /^AFASTAMENTOS\b/i;

/**
 * Extrai férias e faltas de texto Mistral OCR (CTPS ADP-Web/SAP).
 *
 * O Mistral formata tabelas com `|` como separador de colunas — o
 * normalizarMistral troca `|` por espaço, deixando o texto no mesmo
 * formato que os parsers `parseHistoricoFerias`/`parseAfastamentos`
 * já esperam do caminho geométrico V6.
 *
 * Seções recortadas por âncoras de texto, sem depender de numeração de
 * linha ou posição fixa de coluna (resiliente a OCR parcialmente corrompido).
 */
export function extrairFeriasFaltasMistral(ocrText: string): {
  feriasParsed: ParseFeriasResult;
  faltasParsed: ParseFaltasResult;
} {
  const linhas = normalizarMistral(ocrText);

  const feriasRaw = parseHistoricoFerias(
    recortar(linhas, RE_FERIAS_HEADER, /^Data:/i),
  );
  const faltasRaw = parseAfastamentos(
    recortar(linhas, RE_AFASTAMENTOS_QUALQUER, RE_FERIAS_HEADER),
    'outros',
  );

  // adaptarFerias lê só `.historico_ferias`; adaptarFaltas lê só
  // `.afastamentos` + `.afastamentos_outros`. Objeto parcial é seguro —
  // nenhum outro campo é acessado internamente pelos dois adaptadores.
  const syntheticCtps = {
    historico_ferias: feriasRaw,
    afastamentos: [],
    afastamentos_outros: faltasRaw,
  } as unknown as CtpsDominioV2;

  return {
    feriasParsed: adaptarFerias(syntheticCtps),
    faltasParsed: adaptarFaltas(syntheticCtps),
  };
}

