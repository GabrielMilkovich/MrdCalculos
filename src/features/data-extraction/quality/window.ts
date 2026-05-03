/**
 * Detecção de "janela de competência" do espelho de cartão-ponto.
 *
 * O OCR de espelho de ponto sempre tem cabeçalho do tipo:
 *   "Período 16/06/2021 a 15/07/2021"
 *
 * Qualquer apuração com data fora dessa janela é altamente suspeita —
 * normalmente vem de timestamps de aprovação eletrônica ou metadados.
 *
 * Múltiplos espelhos no mesmo OCR (caso típico: vários meses concatenados)
 * devolvem múltiplas janelas; uma data é considerada "dentro" se está em
 * QUALQUER janela detectada.
 */

const RE_JANELA_PERIODO =
  /\bPer[íi]odo\s+(\d{2})\/(\d{2})\/(\d{4})\s+a\s+(\d{2})\/(\d{2})\/(\d{4})\b/gi;

export interface JanelaPeriodo {
  inicio: string; // ISO yyyy-MM-dd
  fim: string;
}

export function detectarJanelasPeriodo(ocr: string): JanelaPeriodo[] {
  const out: JanelaPeriodo[] = [];
  for (const m of ocr.matchAll(RE_JANELA_PERIODO)) {
    const [, dd1, mm1, yyyy1, dd2, mm2, yyyy2] = m;
    const ini = `${yyyy1}-${mm1}-${dd1}`;
    const fim = `${yyyy2}-${mm2}-${dd2}`;
    if (ini <= fim) out.push({ inicio: ini, fim });
  }
  return out;
}

/** Retorna true se `dataIso` (yyyy-MM-dd) está dentro de QUALQUER janela. */
export function dataDentroDeAlgumaJanela(
  dataIso: string,
  janelas: JanelaPeriodo[],
): boolean {
  if (janelas.length === 0) return true; // sem janela detectada → não bloqueia
  for (const j of janelas) {
    if (dataIso >= j.inicio && dataIso <= j.fim) return true;
  }
  return false;
}

/** Datas que estão FORA de todas as janelas detectadas. */
export function datasForaDaJanela(
  datasIso: readonly string[],
  janelas: JanelaPeriodo[],
): string[] {
  if (janelas.length === 0) return [];
  return datasIso.filter((d) => !dataDentroDeAlgumaJanela(d, janelas));
}
