/**
 * Layout `via_varejo_v1` — holerites do Grupo Via Varejo / Casas Bahia /
 * Ponto Frio (CNPJ 33.041.260/xxxx-xx — Via Varejo S.A.).
 *
 * Identificação:
 *   - "VIA VAREJO" ou "VIA S.A." (mudança de razão social pós-reorganização)
 *   - "CASAS BAHIA" / "PONTO FRIO" / "EXTRA"
 *   - CNPJ 33.041.260 (raiz do grupo)
 *
 * Layout típico observado:
 *   ```
 *   COD   DESCRIÇÃO              REF        VENCIMENTO    DESCONTO
 *   0001  SALARIO BASE           30,00       1.234,56
 *   0190  COMISSAO               -             234,56
 *   8000  INSS                                              123,45
 *   ```
 *
 * Heurística:
 *   1. Competência: "REFERENCIA MM/AAAA" (mesmo do genérico).
 *   2. Linha de rubrica: 4 dígitos + descrição + opcional ref + valor BR.
 *      Detecta vencimento vs desconto pela coluna do valor (heurística de
 *      indentação/posicionamento, frágil em OCR).
 *
 * NOTA DE RISCO: este parser é provisório — foi escrito com base em
 * documentação de layout sem fixture real. Sempre emite warning para o
 * usuário revisar manualmente. Substituir quando houver fixture.
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

// Linha começando com código de 4 dígitos (padrão do grupo) + nome + valores.
const RE_LINHA_RUBRICA = /^(\d{4})\s+([\p{L}][\p{L}\s\.\-\(\)\/%&]*?)\s+(\d[\d\s.,]*)$/u;

const SINAIS_VIA_VAREJO = [
  /\b(?:VIA\s*VAREJO|VIA\s*S\.?\s*A\.?|CASAS\s*BAHIA|PONTO\s*FRIO|EXTRA\.COM)\b/i,
  // Pelo menos 1 sinal estrutural de holerite do grupo (cabeçalho típico)
  /\bREFER[ÊE]NCIA\b/i,
];

export const layoutViaVarejoV1: LayoutHolerite = {
  slug: "via_varejo_v1",
  nome: "Via Varejo / Casas Bahia (provisório)",
  sinaisIdentificacao: SINAIS_VIA_VAREJO,
  parse(ocrText: string): HoleriteParseResult {
    const warnings: string[] = [
      "Parser via_varejo_v1 é provisório (sem fixture real). Revise rubricas.",
    ];

    // 1. Competência
    let competencia = detectCompetencia(ocrText);
    if (!competencia) {
      warnings.push("Competência não detectada — usando 00/0000.");
      competencia = "00/0000";
    }

    // 2. Rubricas
    const rubricas: RubricaParseada[] = [];
    const lines = ocrText.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.length < 8) continue;

      const valores = [...line.matchAll(RE_VALOR_BR)].map((m) => m[1]);
      if (valores.length === 0) continue;

      const matchCod = line.match(RE_LINHA_RUBRICA);
      if (!matchCod) continue;

      const [, codigo, nomeRaw] = matchCod;
      const nome = nomeRaw.trim();
      if (nome.length < 3) continue;

      // Quantidade: primeiro número com vírgula que não seja parte de um valor BR.
      // Heurística: se o primeiro valor é "30,00" / "220,00" / "0,00" e aparece
      // ANTES dos demais, tratamos como quantidade.
      const valsNum = valores.map(parseBR);
      let quantidade: number | null = null;
      let venc: number | null = null;
      let desc: number | null = null;

      const qMatch = line.match(RE_QUANTIDADE);
      if (qMatch && parseBR(qMatch[1]) > 0 && parseBR(qMatch[1]) < 1000) {
        quantidade = parseBR(qMatch[1]);
        // Pega o restante dos valores — primeiro = vencimento, segundo = desconto
        const remaining = valsNum.filter((v) => v !== quantidade);
        venc = remaining[0] ?? null;
        desc = remaining[1] ?? null;
      } else {
        // Sem quantidade óbvia — primeiro valor = vencimento, segundo = desconto
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
