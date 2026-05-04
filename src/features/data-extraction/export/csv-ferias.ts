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

/** Gozo nulo OU com data inválida → 3 strings vazias. */
function gozoCols(g: GozoPeriodo | null): [string, string, string] {
  if (!g) return ['', '', ''];
  // Validação dura: se uma das datas é inválida, descarta o gozo inteiro.
  // Resultado fica vazio — operador deve corrigir manualmente no PJe-Calc.
  if (!isDataBRValida(g.inicio) || !isDataBRValida(g.fim)) {
    return ['', '', ''];
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

  // 2. Normaliza booleanos coerentes + capa prazo + zera abono se false.
  const normalizadas = validas.map((f, i) => {
    const ajustes: string[] = [];
    let prazo = f.prazo;
    if (prazo < 0) {
      prazo = 0;
      ajustes.push('prazo negativo → 0');
    } else if (prazo > PRAZO_MAX) {
      prazo = PRAZO_MAX;
      ajustes.push(`prazo > ${PRAZO_MAX} → ${PRAZO_MAX}`);
    }
    let dias_abono = f.dias_abono;
    if (!f.abono && dias_abono > 0) {
      dias_abono = 0;
      ajustes.push('abono=N mas dias_abono>0 → zerado');
    }
    if (dias_abono < 0) {
      dias_abono = 0;
      ajustes.push('dias_abono negativo → 0');
    }
    if (dias_abono > 20) {
      dias_abono = 20;
      ajustes.push('dias_abono > 20 → 20');
    }
    if (ajustes.length > 0) {
      report.linhasAjustadas.push({
        idx: i,
        ajuste: `${f.relativa}: ${ajustes.join('; ')}`,
      });
    }
    return { ...f, prazo, dias_abono };
  });

  // 3. Dedup por relativa (último ganha — coerente com retificações).
  const seen = new Map<string, FeriasCsvLinha>();
  for (const f of normalizadas) {
    if (seen.has(f.relativa)) {
      report.linhasAjustadas.push({
        idx: -1,
        ajuste: `Relativa "${f.relativa}" duplicada — última ocorrência prevaleceu.`,
      });
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

  // 6. Constrói linhas.
  const rows = dedupadas.map((f) => {
    return [
      sanitizeText(f.relativa, 50),
      String(f.prazo),
      f.situacao,
      formatBoolBR(f.dobra_geral),
      formatBoolBR(f.abono),
      String(f.dias_abono),
      ...gozoCols(f.gozo1),
      ...gozoCols(f.gozo2),
      ...gozoCols(f.gozo3),
    ].join(';');
  });

  report.linhasGeradas = rows.length;
  const csv = [HEADER, ...rows].join(CRLF) + CRLF;
  return { csv, report };
}
