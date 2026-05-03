/**
 * Validação anti-alucinação puramente determinística — verifica que toda
 * data/hora mencionada no output do LLM existe no OCR original.
 *
 * Separado de `client.ts` (que puxa supabase) para ser testável em Node
 * sem mockar localStorage.
 */
import type {
  CartaoPontoLLMOutput,
  FeriasLLMOutput,
  FaltasLLMOutput,
  HoleriteLLMOutput,
  LLMTipoDoc,
} from "./schemas";

export interface LLMExtractionError {
  code: "auth" | "schema" | "alucinacao" | "rede" | "openai" | "interna";
  message: string;
  detalhes?: unknown;
}

export class LLMExtractError extends Error {
  constructor(public payload: LLMExtractionError) {
    super(payload.message);
    this.name = "LLMExtractError";
  }
}

const RE_DATA_BR = /\b\d{2}\/\d{2}\/\d{4}\b/g;
const RE_DATA_ISO = /\b\d{4}-\d{2}-\d{2}\b/g;
const RE_HORA = /\b\d{1,2}:\d{2}\b/g;

function dataBRToIso(d: string): string {
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Verifica que toda data/hora mencionada no output do LLM existe no OCR
 * original (em alguma forma textual). Se o LLM alucinou uma data,
 * levanta LLMExtractError com code=alucinacao.
 */
export function validateAntiAlucinacao(
  tipo: LLMTipoDoc,
  output:
    | CartaoPontoLLMOutput
    | FeriasLLMOutput
    | FaltasLLMOutput
    | HoleriteLLMOutput,
  ocr: string,
): void {
  const datasBR = new Set([...ocr.matchAll(RE_DATA_BR)].map((m) => m[0]));
  const datasIso = new Set<string>();
  for (const d of datasBR) datasIso.add(dataBRToIso(d));
  for (const m of ocr.matchAll(RE_DATA_ISO)) datasIso.add(m[0]);

  const horas = new Set<string>();
  for (const m of ocr.matchAll(RE_HORA)) {
    const [hh, mm] = m[0].split(":");
    if (parseInt(hh, 10) <= 23 && parseInt(mm, 10) <= 59) {
      horas.add(`${hh.padStart(2, "0")}:${mm}`);
    }
  }

  if (tipo === "cartao_ponto") {
    const o = output as CartaoPontoLLMOutput;
    for (const a of o.apuracoes) {
      if (!datasIso.has(a.data)) {
        throw new LLMExtractError({
          code: "alucinacao",
          message: `LLM gerou data ${a.data} que não está no OCR`,
        });
      }
      for (const m of a.marcacoes) {
        for (const h of [m.e, m.s]) {
          if (h && h !== "" && !horas.has(h)) {
            throw new LLMExtractError({
              code: "alucinacao",
              message: `LLM gerou hora ${h} (data ${a.data}) que não está no OCR`,
            });
          }
        }
      }
    }
  } else if (tipo === "recibo_ferias") {
    const o = output as FeriasLLMOutput;
    for (const f of o.ferias) {
      for (const g of [f.gozo1, f.gozo2, f.gozo3]) {
        if (!g) continue;
        if (!datasBR.has(g.inicio) && !datasIso.has(dataBRToIso(g.inicio))) {
          throw new LLMExtractError({
            code: "alucinacao",
            message: `LLM gerou data de gozo ${g.inicio} que não está no OCR`,
          });
        }
        if (!datasBR.has(g.fim) && !datasIso.has(dataBRToIso(g.fim))) {
          throw new LLMExtractError({
            code: "alucinacao",
            message: `LLM gerou data de gozo ${g.fim} que não está no OCR`,
          });
        }
      }
    }
  } else if (tipo === "registro_faltas") {
    const o = output as FaltasLLMOutput;
    for (const f of o.faltas) {
      if (!datasIso.has(f.data_inicio)) {
        throw new LLMExtractError({
          code: "alucinacao",
          message: `LLM gerou data ${f.data_inicio} que não está no OCR`,
        });
      }
      if (!datasIso.has(f.data_fim)) {
        throw new LLMExtractError({
          code: "alucinacao",
          message: `LLM gerou data ${f.data_fim} que não está no OCR`,
        });
      }
    }
  } else if (tipo === "holerite") {
    const o = output as HoleriteLLMOutput;
    // Normaliza OCR: lowercase + remove acentos/pontuação pra match fuzzy.
    const ocrNorm = ocr
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]+/g, " ");
    for (const r of o.rubricas) {
      if (!r.nome || r.nome.length < 3) continue;
      const nomeNorm = r.nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9 ]+/g, " ")
        .trim();
      if (nomeNorm.length < 3) continue;
      // Toda palavra significativa (>3 chars) do nome deve aparecer no OCR.
      const palavras = nomeNorm.split(/\s+/).filter((p) => p.length >= 3);
      if (palavras.length === 0) continue;
      const hit = palavras.some((p) => ocrNorm.includes(p));
      if (!hit) {
        throw new LLMExtractError({
          code: "alucinacao",
          message: `LLM gerou rubrica "${r.nome}" cujas palavras não estão no OCR`,
        });
      }
    }
  }
}
