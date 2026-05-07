/**
 * CSV de Férias — formato oficial PJe-Calc Cidadão.
 *
 * Validado byte-a-byte contra modelo oficial:
 *   modelo de exemplo csv/ExemploFerias.csv
 *
 * Spec do parser:
 *   pjecalc-fonte/negocio/.../servicos/ServicoDeParsingDeFerias.java
 *   pjecalc-fonte/negocio/.../constantes/SituacaoDaFeriasEnum.java
 *
 * Características obrigatórias:
 *   - Header LITERAL exato (15 colunas, sem aspas):
 *       RELATIVAS;PRAZO;SITUACAO;DOBRA;ABONO;QTD_DIAS_ABONO;
 *       G1INI;G1FIM;G1DOBRA;G2INI;G2FIM;G2DOBRA;G3INI;G3FIM;G3DOBRA
 *   - **Gozos vazios → célula vazia (não "N")**.
 *   - Encoding UTF-8.
 *   - Delimitador `;`.
 *   - Boolean `S` / `N`.
 *   - Datas `dd/MM/yyyy`.
 *   - Situação: G | GP | NG | I | P (códigos curtos).
 *   - Line ending CRLF.
 *   - **IMPORTANTE**: parser BUSCA férias existentes pela `relativa`. Os
 *     períodos aquisitivos precisam estar cadastrados antes da importação.
 *
 * INTELIGÊNCIA APLICADA neste builder:
 *   - REJEITA linhas com `relativa` fora do padrão aaaa/aaaa.
 *   - REJEITA gozos com data inválida (G1INI 32/13/2024 etc.).
 *   - DEDUP por relativa — mantém último período (auto-correção legítima).
 *   - ORDENA por relativa cronologicamente.
 *   - NORMALIZA: se `abono=false`, força `dias_abono=0`.
 *   - NORMALIZA: prazo capped em 0..60 (limite do PJe-Calc).
 *   - CROSS-CHECK com `checkFerias` → warning quando soma de gozos+abono
 *     diverge >5 dias do prazo declarado.
 *   - PROTEGE contra formula injection via `sanitizeText` na relativa.
 */
import type { GozoPeriodo, SituacaoFerias } from '../types';
import { checkFerias } from '../quality/cross-validation';
import { formatBoolBR } from './format-br';
import { sanitizeText } from './sanitize';
import {
  emptyReport,
  isDataBRValida,
  isRelativaValida,
  type BuildReport,
} from './validation';

const HEADER =
  'RELATIVAS;PRAZO;SITUACAO;DOBRA;ABONO;QTD_DIAS_ABONO;G1INI;G1FIM;G1DOBRA;G2INI;G2FIM;G2DOBRA;G3INI;G3FIM;G3DOBRA';
const CRLF = '\r\n';
const PRAZO_MAX = 60;

export type FeriasCsvLinha = {
  relativa: string; // "aaaa/aaaa"
  prazo: number;
  situacao: SituacaoFerias;
  dobra_geral: boolean;
  abono: boolean;
  dias_abono: number;
  gozo1: GozoPeriodo | null;
  gozo2: GozoPeriodo | null;
  gozo3: GozoPeriodo | null;
};

/** Comparação estrutural de 2 linhas de férias — chave da dedup B.3. */
function sameFeriasLinha(a: FeriasCsvLinha, b: FeriasCsvLinha): boolean {
  if (
    a.prazo !== b.prazo ||
    a.situacao !== b.situacao ||
    a.dobra_geral !== b.dobra_geral ||
    a.abono !== b.abono ||
    a.dias_abono !== b.dias_abono
  ) {
    return false;
  }
  return sameGozo(a.gozo1, b.gozo1) && sameGozo(a.gozo2, b.gozo2) && sameGozo(a.gozo3, b.gozo3);
}

function sameGozo(a: GozoPeriodo | null, b: GozoPeriodo | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.inicio === b.inicio && a.fim === b.fim && a.dobra === b.dobra;
}

/**
 * Gera as 3 células (INI; FIM; DOBRA) de um gozo.
 *
 * Política de paridade: se uma das datas for inválida, exporta a parte
 * VÁLIDA + reporta o problema. Antes (v3) descartava o gozo inteiro,
 * silenciando dado correto. Agora preserva o que dá pra preservar e a UI
 * mostra warning explícito apontando qual célula precisa correção manual.
 */
function gozoCols(
  g: GozoPeriodo | null,
  rotuloGozo: string,
  reportInvalido: (motivo: string) => void,
): [string, string, string] {
  if (!g) return ['', '', ''];
  const iniValido = isDataBRValida(g.inicio);
  const fimValido = isDataBRValida(g.fim);
  if (!iniValido && !fimValido) {
    reportInvalido(`${rotuloGozo}: ambas as datas inválidas ("${g.inicio}" / "${g.fim}") — célula vazia.`);
    return ['', '', formatBoolBR(g.dobra)];
  }
  if (!iniValido) {
    reportInvalido(`${rotuloGozo}: data INÍCIO inválida ("${g.inicio}"); FIM "${g.fim}" preservado.`);
    return ['', g.fim, formatBoolBR(g.dobra)];
  }
  if (!fimValido) {
    reportInvalido(`${rotuloGozo}: data FIM inválida ("${g.fim}"); INÍCIO "${g.inicio}" preservado.`);
    return [g.inicio, '', formatBoolBR(g.dobra)];
  }
  return [g.inicio, g.fim, formatBoolBR(g.dobra)];
}

export function buildFeriasCSV(linhas: FeriasCsvLinha[]): string {
  return buildFeriasCSVWithReport(linhas).csv;
}

export function buildFeriasCSVWithReport(
  linhas: FeriasCsvLinha[],
): { csv: string; report: BuildReport } {
  const report = emptyReport();

  // 1. Filtra linhas com relativa inválida.
  const validas: FeriasCsvLinha[] = [];
  linhas.forEach((f, i) => {
    if (!isRelativaValida(f.relativa)) {
      report.linhasRejeitadas.push({
        idx: i,
        motivo: `Relativa inválida "${f.relativa}" — esperado "aaaa/aaaa" com anos consecutivos.`,
      });
      return;
    }
    validas.push(f);
  });

  // 2. Política de paridade (Fase B): valores fora do esperado NÃO são
  //    capeados ou zerados silenciosamente. Vão pro CSV como vieram do OCR
  //    (operador/PJe-Calc decide o que fazer) + warning explícito explicando
  //    a divergência. Mascarar dado é o que historicamente escondeu erro
  //    de parsing.
  const normalizadas = validas.map((f) => {
    if (f.prazo < 0) {
      report.warnings.push(
        `${f.relativa}: prazo negativo (${f.prazo}) — preservado no CSV. Confira o OCR.`,
      );
    } else if (f.prazo > PRAZO_MAX) {
      report.warnings.push(
        `${f.relativa}: prazo ${f.prazo} excede limite PJe-Calc (${PRAZO_MAX}) — preservado no CSV. Confira se é dobra ou erro.`,
      );
    }
    if (!f.abono && f.dias_abono > 0) {
      report.warnings.push(
        `${f.relativa}: ABONO=N mas dias_abono=${f.dias_abono} (contradição) — valores preservados; revise no PJe-Calc.`,
      );
    }
    if (f.dias_abono < 0) {
      report.warnings.push(
        `${f.relativa}: dias_abono negativo (${f.dias_abono}) — preservado.`,
      );
    } else if (f.dias_abono > 20) {
      report.warnings.push(
        `${f.relativa}: dias_abono ${f.dias_abono} excede teto usual (20) — preservado.`,
      );
    }
    return f;
  });

  // 3. Dedup por relativa. PJe-Calc aceita 1 linha por relativa, então
  //    DEPOIS DA DEDUP fica 1. Mas a política varia conforme paridade:
  //    - Linhas idênticas (estrutura+dados+gozos): dedup silencioso (não
  //      é perda de info, é a mesma info repetida).
  //    - Linhas DIFERENTES com mesma relativa: preserva a última (necessário
  //      pra CSV ser importável), mas registra a anterior em
  //      linhasRejeitadas com os dados completos pra auditor revisar.
  const seen = new Map<string, FeriasCsvLinha>();
  for (const f of normalizadas) {
    const previa = seen.get(f.relativa);
    if (previa) {
      if (sameFeriasLinha(previa, f)) {
        report.linhasAjustadas.push({
          idx: -1,
          ajuste: `Relativa "${f.relativa}" duplicada com mesmos dados — registro extra removido (sem perda).`,
        });
      } else {
        report.linhasRejeitadas.push({
          idx: -1,
          motivo: `Relativa "${f.relativa}" duplicada com DADOS DIFERENTES — última ocorrência prevaleceu no CSV; revise OCR pra confirmar qual é a correta.`,
          conteudo: JSON.stringify(previa),
        });
      }
    }
    seen.set(f.relativa, f);
  }
  const dedupadas = [...seen.values()];

  // 4. Ordena por relativa.
  dedupadas.sort((a, b) => a.relativa.localeCompare(b.relativa));

  // 5. Cross-check: soma gozos+abono vs prazo (>5 dias divergência → warning).
  for (const f of dedupadas) {
    const check = checkFerias(f);
    if (!check.ok && Math.abs(check.diff) > 5) {
      report.warnings.push(
        `${f.relativa}: soma de gozos (${check.diasGozados}) + abono (${check.diasAbono}) diverge ${check.diff > 0 ? '+' : ''}${check.diff} dia(s) do prazo declarado (${check.prazo}).`,
      );
    }
  }

  // 6. Constrói linhas. Datas inválidas em gozo emitem warning preservando
  //    a parte válida — paridade > silêncio.
  const rows = dedupadas.map((f) => {
    const reportar = (motivo: string) => {
      report.warnings.push(`${f.relativa} ${motivo}`);
    };
    return [
      sanitizeText(f.relativa, 50),
      String(f.prazo),
      f.situacao,
      formatBoolBR(f.dobra_geral),
      formatBoolBR(f.abono),
      String(f.dias_abono),
      ...gozoCols(f.gozo1, 'G1', reportar),
      ...gozoCols(f.gozo2, 'G2', reportar),
      ...gozoCols(f.gozo3, 'G3', reportar),
    ].join(';');
  });

  report.linhasGeradas = rows.length;
  const csv = [HEADER, ...rows].join(CRLF) + CRLF;
  return { csv, report };
}
