/**
 * Fase 0.5 — Relaxação de formato de período no mapperCartaoViaVarejo (edge).
 *
 * CONTEXTO
 * --------
 * Diagnóstico de 2026-05-20 (sessão Roque/v7) revelou que o PDF text-native
 * de Via Varejo / Casa Bahia pós-2018 usa formato moderno de período no
 * cabeçalho ("PERÍODO: 11/01/2016 A 15/02/2016", com barras + ":") em vez
 * do formato antigo Via Varejo 2011-2016 ("Período 11.01.2016 A 15.02.2016",
 * com pontos). O mapper edge `cartao-ponto-via-varejo.ts` rejeitava o
 * formato moderno via regex estrito, causando V6 → `mapper_returned_null`
 * → fallback para Mistral OCR + parser v5 OCR-based (que entrega CSV ruim).
 *
 * RELAXAÇÃO APLICADA
 * ------------------
 *   RE_PERIODO antigo: /Per[íi]odo\s+(\d{2})\.(\d{2})\.(\d{4})\s+A\s+...
 *   RE_PERIODO novo:   /Per[íi]odo\s*:?\s+(\d{2})[./](\d{2})[./](\d{4})\s+[Aa]\s+...
 *
 * VETO ANTI-REGRESSÃO
 * -------------------
 * O relaxamento sozinho faria documentos Casas Bahia pós-2018 (que usam
 * "Espelho de Ponto" em vez de "Cartão de Ponto") caírem incorretamente
 * neste mapper. Veto adicionado em `detectar()`: se texto tem "ESPELHO DE
 * PONTO" sem "CARTÃO DE PONTO", retorna aplica=false. Rosicleia 2022-2024
 * é o caso de regressão coberto.
 *
 * O QUE ESTE TESTE COBRE
 * ----------------------
 *  1. Roque-like (slashes + Via Varejo + Cartão de Ponto)        → aplica=true (FIX)
 *  2. Joseli-like (dots + Nova Casa Bahia + Cartão de Ponto)     → aplica=true (REGRESSION GUARD)
 *  3. Rosicleia-like (slashes + Casas Bahia + Espelho de Ponto)  → aplica=false (VETO)
 *  4. Híbrido (Cartão+Espelho juntos)                            → aplica=true (veto exige espelho SEM cartão)
 *  5. quebrarEmBlocos extrai período corretamente com slashes    → blocos.length > 0
 *
 * O QUE ESTE TESTE NÃO COBRE
 * --------------------------
 *  - Pipeline end-to-end (extrator geométrico → mapper → CSV). Esse só
 *    valida no Gate 6 com o PDF real do Roque.
 */
import { describe, expect, it } from "vitest";
import { mapperCartaoViaVarejo } from "../../../../../../supabase/functions/_shared/mappers/cartao-ponto-via-varejo";
import type { DocumentoTabular } from "../../../../../../supabase/functions/_shared/documento-tabular";

function docSintetico(texto: string): DocumentoTabular {
  return {
    textoCompleto: texto,
    numeroPaginas: 1,
    paginas: [],
    qualidade: { score: 0.95, razao: "sintético para teste" },
  } as unknown as DocumentoTabular;
}

// ============================================================
// Strings sintéticas refletindo cabeçalhos REAIS observados em produção
// ============================================================

const TEXTO_ROQUE = `
VIA VAREJO SA 33.041.260/0652-90 Cartão Ponto Página 1
PERÍODO: 11/01/2016 A 15/02/2016 Competência: FEVEREIRO/2016
VIA VAREJO S/A
Avenida Jacob Macanhan 449
Empregado: 278823 ROQUE GUERREIRO TEIXEIRA
Dia 1. Período 2. Período Ocorrências
11 SEG 08:00 12:00 13:00 17:30
12 TER 08:00 12:00 13:00 17:30
`.trim();

const TEXTO_JOSELI = `
NOVA CASA BAHIA S/A
C.G.C. 10.757.237/0556-62
JOSELI SILVA WANDERLEY Matrícula 01788485
CARTÃO DE PONTO
Período 21.06.2011 A 20.07.2011
21 TER 13:45 17:02 18:10 22:05
22 QUA 13:46 17:12 18:21 22:12
`.trim();

const TEXTO_ROSICLEIA = `
GRUPO CASAS BAHIA S.A.
CNPJ: 33.041.260/0501-88
ROSICLEIA PEREIRA CHAVES
ESPELHO DE PONTO
Período 16/12/2022 a 15/01/2023 - Data de emissão 13/08/2024
16 SEX 08:00 12:00 13:00 17:30
17 SAB FOLGA
`.trim();

const TEXTO_HIBRIDO = `
VIA VAREJO S/A
CARTÃO DE PONTO
ESPELHO DE PONTO (formulário interno alternativo)
Período 11/01/2016 A 15/02/2016
11 SEG 08:00 12:00
`.trim();

// ============================================================
// Testes
// ============================================================

describe("mapperCartaoViaVarejo.detectar() — relaxação de formato de período", () => {
  it("Roque (slashes + Via Varejo + Cartão de Ponto) → aplica=true [FIX 2026-05-20]", () => {
    const det = mapperCartaoViaVarejo.detectar(docSintetico(TEXTO_ROQUE));
    expect(det.aplica, `motivos: ${det.motivos.join(" | ")}`).toBe(true);
    // Motivos esperados: pelo menos formato Período + CGC Via Varejo + "Via Varejo" razão social + Cartão.
    expect(det.motivos.join(" ")).toMatch(/formato Período/i);
  });

  it("Joseli (dots + Nova Casa Bahia + Cartão de Ponto) → aplica=true [REGRESSION GUARD]", () => {
    const det = mapperCartaoViaVarejo.detectar(docSintetico(TEXTO_JOSELI));
    expect(det.aplica, `motivos: ${det.motivos.join(" | ")}`).toBe(true);
    expect(det.motivos.join(" ")).toMatch(/razão social Nova Casa Bahia/i);
    expect(det.motivos.join(" ")).toMatch(/formato Período/i);
  });

  it("Rosicleia (slashes + Casas Bahia + ESPELHO DE PONTO) → aplica=false [VETO]", () => {
    const det = mapperCartaoViaVarejo.detectar(docSintetico(TEXTO_ROSICLEIA));
    expect(det.aplica, `motivos: ${det.motivos.join(" | ")}`).toBe(false);
    expect(det.motivos.join(" ")).toMatch(/ESPELHO DE PONTO.*Casas Bahia/i);
  });

  it("Híbrido (Cartão E Espelho presentes) → aplica=true (veto só dispara se Espelho sem Cartão)", () => {
    const det = mapperCartaoViaVarejo.detectar(docSintetico(TEXTO_HIBRIDO));
    expect(det.aplica, `motivos: ${det.motivos.join(" | ")}`).toBe(true);
  });
});

describe("mapperCartaoViaVarejo.mapear() — quebra de blocos com novo formato", () => {
  it("Roque (slashes) — quebrarEmBlocos via mapear() detecta período corretamente", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_ROQUE));
    expect(resultado, "mapear retornou null — RE_PERIODO_GLOBAL não casou com slashes").not.toBeNull();
    expect(resultado!.apuracoes.length).toBeGreaterThanOrEqual(2); // 11/01 e 12/01
    // Data tem que ser 2016-01-11 (yyyy-mm-dd reconstruída do período, não do separator original).
    expect(resultado!.apuracoes[0].data).toBe("2016-01-11");
  });

  it("Joseli (dots) — regression guard, formato antigo continua produzindo apurações", () => {
    const resultado = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_JOSELI));
    expect(resultado).not.toBeNull();
    expect(resultado!.apuracoes.length).toBeGreaterThanOrEqual(2); // 21/06 e 22/06
    expect(resultado!.apuracoes[0].data).toBe("2011-06-21");
  });
});
