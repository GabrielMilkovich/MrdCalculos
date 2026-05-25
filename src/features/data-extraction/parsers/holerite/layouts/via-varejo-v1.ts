/**
 * Layout `via_varejo_v1` — holerites do Grupo Via Varejo / Casas Bahia /
 * Ponto Frio (CNPJ 33.041.260/xxxx-xx — Via Varejo S.A.).
 *
 * Identificação:
 *   - "VIA VAREJO" ou "VIA S.A." (pós-reorganização)
 *   - "CASAS BAHIA" / "PONTO FRIO" / "EXTRA"
 *   - CNPJ 33.041.260 (raiz do grupo)
 *
 * Layout típico:
 *   ```
 *   COD   DESCRIÇÃO              REF        VENCIMENTO    DESCONTO
 *   0001  SALARIO BASE           30,00       1.234,56
 *   0620  COMISSAO               -             234,56
 *   5560  INSS                                              123,45
 *   ```
 */

import {
  type HoleriteParseResult,
  type LayoutHolerite,
  type RubricaParseada,
  parseBR,
  MESES_PT,
} from "../types";

const RE_REFERENCIA_NUM = /\bREFER[ÊE]NCIA\b[^\n]*?\b(\d{2})\s*\/\s*(\d{4})\b/i;
const RE_REFERENCIA_MMM =
  /\bREFER[ÊE]NCIA\b[^\n]*?\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s*\/\s*(\d{4})\b/i;
const RE_VALOR_BR = /\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/g;
const RE_QUANTIDADE = /\b(\d{1,4},\d{2})\s/;

const RE_LINHA_COD = /^\s*(\d{3,5})\s+([\p{L}][\p{L}\s.\-()/%&']+)/u;

const SINAIS_VIA_VAREJO = [
  /\b(?:VIA\s*VAREJO|VIA\s*S\.?\s*A\.?|CASAS\s*BAHIA|PONTO\s*FRIO|EXTRA\.COM|33\.?041\.?260)\b/i,
  /\bREFER[ÊE]NCIA\b/i,
];

export const layoutViaVarejoV1: LayoutHolerite = {
  slug: "via_varejo_v1",
  nome: "Via Varejo / Casas Bahia",
  sinaisIdentificacao: SINAIS_VIA_VAREJO,
  parse(ocrText: string): HoleriteParseResult {
    const warnings: string[] = [];

    let competencia = detectCompetencia(ocrText);
    if (!competencia) {
      warnings.push("Competência não detectada — usando 00/0000.");
      competencia = "00/0000";
    }

    const rubricas: RubricaParseada[] = [];
    const lines = ocrText.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.length < 8) continue;

      const matchCod = line.match(RE_LINHA_COD);
      if (!matchCod) continue;

      const [, codigo, nomeRaw] = matchCod;
      const nome = nomeRaw.trim().replace(/\s+/g, " ");
      if (nome.length < 2) continue;

      const valores = [...line.matchAll(RE_VALOR_BR)].map((m) => m[1]);
      if (valores.length === 0) continue;

      const valsNum = valores.map(parseBR);
      let quantidade: number | null = null;
      let venc: number | null = null;
      let desc: number | null = null;

      const qMatch = line.match(RE_QUANTIDADE);
      if (qMatch && parseBR(qMatch[1]) > 0 && parseBR(qMatch[1]) < 1000) {
        const qVal = parseBR(qMatch[1]);
        const remaining = valsNum.filter((v) => v !== qVal);
        if (remaining.length > 0) {
          quantidade = qVal;
          venc = remaining[0] ?? null;
          desc = remaining[1] ?? null;
        } else {
          venc = valsNum[0] ?? null;
          desc = valsNum[1] ?? null;
        }
      } else {
        venc = valsNum[0] ?? null;
        desc = valsNum[1] ?? null;
      }

      rubricas.push({
        codigo,
        nome,
        quantidade,
        valor_vencimento: venc,
        valor_desconto: desc,
        ordem: rubricas.length,
      });
    }

    if (rubricas.length === 0) {
      warnings.push("Nenhuma rubrica casou com o padrão Via Varejo.");
    }

    return {
      competencia,
      rubricas,
      layout_usado: "via_varejo_v1",
      warnings,
    };
  },
};

function detectCompetencia(ocrText: string): string | null {
  const m1 = ocrText.match(RE_REFERENCIA_NUM);
  if (m1) return `${m1[1].padStart(2, "0")}/${m1[2]}`;
  const m2 = ocrText.match(RE_REFERENCIA_MMM);
  if (m2) {
    const mes = MESES_PT[m2[1].toUpperCase()];
    if (mes) return `${mes}/${m2[2]}`;
  }
  return null;
}
