/**
 * Roteador de layouts de holerite. Tenta cada layout em ordem; o primeiro
 * que casa todos os sinais E produz ≥1 rubrica vence. Caso contrário,
 * cai pro `generico_v1` (sempre retorna algo, mesmo que vazio).
 *
 * Pra adicionar novo layout: criar arquivo em `layouts/{slug}.ts` e
 * adicioná-lo ao array `LAYOUTS` ANTES do generico (ordem: mais
 * específico primeiro).
 */

import { layoutGenericoV1 } from "./layouts/generico-v1";
import { layoutViaVarejoV1 } from "./layouts/via-varejo-v1";
import type { HoleriteParseResult, LayoutHolerite } from "./types";

const LAYOUTS: LayoutHolerite[] = [
  // Adicionar layouts específicos aqui (mais específico primeiro):
  layoutViaVarejoV1,
  // layoutMagazineLuizaV1,
  layoutGenericoV1, // fallback sempre por último
];

export function parseHolerite(ocrText: string): HoleriteParseResult {
  for (const layout of LAYOUTS) {
    if (layout.sinaisIdentificacao.length === 0) continue; // skip generico nesta passada
    const todosCasaram = layout.sinaisIdentificacao.every((re) =>
      re.test(ocrText),
    );
    if (!todosCasaram) continue;
    const result = layout.parse(ocrText);
    if (result && result.rubricas.length > 0) return result;
  }
  // Nenhum layout específico produziu rubricas — usa genérico.
  return (
    layoutGenericoV1.parse(ocrText) ?? {
      competencia: "00/0000",
      rubricas: [],
      layout_usado: "none",
      warnings: ["Nenhum layout reconhecido. Use a UI manual."],
    }
  );
}

export type { HoleriteParseResult, RubricaParseada, LayoutHolerite } from "./types";
