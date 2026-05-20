/**
 * Fase 3 v7 — Reconciliação contra totalizadores Via Varejo.
 *
 * CONTEXTO
 * --------
 * Mapper Via Varejo agora computa `reconciliacao[]` por período: soma
 * minutos das batidas extraídas e compara com totalizadores declarados
 * no rodapé (códigos 9000 Horas Normais + 9080 Horas Extras 75%).
 * Tolerância: 5 minutos por período, NÃO cumulativo.
 *
 * COMPORTAMENTO ESPERADO
 * ----------------------
 *   - Período com totalizador batendo dentro de ±5min → ok=true, delta calculado
 *   - Período com totalizador divergindo >5min       → ok=false, motivo detalhado
 *   - Período SEM totalizador (rodapé limpo)          → ok=true, declarado=null,
 *                                                       motivo "não foi possível validar"
 *   - reconciliacao_geral_ok === todas as recs ok
 *
 * CONVENÇÃO IMPORTANTE
 * --------------------
 * "Sem totalizador" NÃO é divergência. É ausência de dado pra validar.
 * Marcamos ok=true por convenção — Fase 4 (bloqueio de export) distingue
 * via `declarado_minutos === null` se precisar exibir banner diferente.
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
// Texto sintético com 3 períodos cobrindo os 3 cenários
// ============================================================
//
// Período 1 (BATENDO): 4 dias × (08:00→12:00 + 13:00→17:30) = 4 × 510 = 2040min = 34:00
// 9000 Horas Normais 34:00 → declarado=2040min, somado=2040min, delta=0, ok=TRUE
//
// Período 2 (DIVERGINDO): 2 dias × (08:00→12:00) = 2 × 240 = 480min = 8:00
// 9000 Horas Normais 20:00 → declarado=1200min, somado=480min, delta=-720min, ok=FALSE
//
// Período 3 (SEM TOTALIZADOR): 2 dias × (08:00→12:00 + 13:00→17:30) = 1020min = 17:00
// (sem linha 9000) → declarado=null, somado=1020min, delta=0, ok=TRUE com motivo

const TEXTO_3_PERIODOS = `
VIA VAREJO S/A 33.041.260/0652-90
CARTÃO DE PONTO
Empregado: 278823 ROQUE GUERREIRO TEIXEIRA

PERÍODO: 11/01/2016 A 15/02/2016
11 SEG 08:00 12:00 13:00 17:30
12 TER 08:00 12:00 13:00 17:30
13 QUA 08:00 12:00 13:00 17:30
14 QUI 08:00 12:00 13:00 17:30
9000 Horas Normais 34:00

PERÍODO: 16/02/2016 A 15/03/2016
16 TER 08:00 12:00
17 QUA 08:00 12:00
9000 Horas Normais 20:00

PERÍODO: 16/03/2016 A 15/04/2016
16 QUA 08:00 12:00 13:00 17:30
17 QUI 08:00 12:00 13:00 17:30

`.trim();

// ============================================================
// Período 4 (BATENDO COM 9000 + 9080): horas extras separadas
// ============================================================
//
// 3 dias × (08:00→12:00 + 13:00→18:00) = 3 × (240+300) = 1620min = 27:00
// 9000 Horas Normais 24:00 (1440min) + 9080 Horas Extras 75% 3:00 (180min) = 1620min
// → declarado=1620min, somado=1620min, delta=0, ok=TRUE

const TEXTO_COM_HE = `
VIA VAREJO S/A
CARTÃO DE PONTO
PERÍODO: 01/06/2018 A 30/06/2018
01 SEX 08:00 12:00 13:00 18:00
02 SAB 08:00 12:00 13:00 18:00
03 DOM 08:00 12:00 13:00 18:00
9000 Horas Normais 24:00
9080 Horas Extras 75% 3:00
`.trim();

// ============================================================
// Tests
// ============================================================

describe("mapper Via Varejo — reconciliação contra totalizadores (Fase 3 v7)", () => {
  it("3 períodos: batendo, divergindo, sem totalizador", () => {
    const r = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_3_PERIODOS));
    expect(r).not.toBeNull();
    expect(r!.reconciliacao).toBeDefined();
    expect(r!.reconciliacao).toHaveLength(3);

    const [p1, p2, p3] = r!.reconciliacao!;

    // ─── Período 1: batendo ─────────────────────────────────────
    expect(p1.periodo.inicio).toBe("2016-01-11");
    expect(p1.periodo.fim).toBe("2016-02-15");
    expect(p1.declarado_minutos).toBe(2040); // 34:00
    expect(p1.declarado_str).toBe("34:00");
    expect(p1.somado_minutos).toBe(2040);
    expect(p1.somado_str).toBe("34:00");
    expect(p1.delta_minutos).toBe(0);
    expect(p1.ok).toBe(true);
    expect(p1.motivo).toMatch(/OK/i);

    // ─── Período 2: divergindo ──────────────────────────────────
    expect(p2.periodo.inicio).toBe("2016-02-16");
    expect(p2.declarado_minutos).toBe(1200); // 20:00
    expect(p2.somado_minutos).toBe(480); // 8:00
    expect(p2.delta_minutos).toBe(-720);
    expect(p2.ok).toBe(false);
    expect(p2.motivo).toMatch(/DIVERGENTE/i);

    // ─── Período 3: sem totalizador ─────────────────────────────
    expect(p3.periodo.inicio).toBe("2016-03-16");
    expect(p3.declarado_minutos).toBeNull();
    expect(p3.declarado_str).toBeNull();
    expect(p3.somado_minutos).toBe(1020); // 17:00
    expect(p3.ok).toBe(true); // convenção: ausência ≠ divergência
    expect(p3.motivo).toMatch(/ausentes/i);

    // ─── Geral ──────────────────────────────────────────────────
    expect(r!.reconciliacao_geral_ok).toBe(false); // por causa do P2
    expect(r!.warnings.some((w) => /Reconciliação detectou 1/i.test(w))).toBe(true);
  });

  it("período com 9000 + 9080 (horas extras separadas) soma ambos", () => {
    const r = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_COM_HE));
    expect(r).not.toBeNull();
    expect(r!.reconciliacao).toHaveLength(1);
    const p = r!.reconciliacao![0];
    expect(p.declarado_minutos).toBe(1620); // 24:00 + 3:00
    expect(p.somado_minutos).toBe(1620);
    expect(p.delta_minutos).toBe(0);
    expect(p.ok).toBe(true);
    expect(p.motivo).toMatch(/9000=24:00/i);
    expect(p.motivo).toMatch(/9080=3:00/i);
  });

  it("delta dentro da tolerância de 5min ainda é ok=true", () => {
    // 4 dias × 8:30 = 34:00. Declara 33:56 (diff -4 min, dentro da tolerância).
    const txt = `
VIA VAREJO S/A
CARTÃO DE PONTO
PERÍODO: 11/01/2016 A 15/02/2016
11 SEG 08:00 12:00 13:00 17:30
12 TER 08:00 12:00 13:00 17:30
13 QUA 08:00 12:00 13:00 17:30
14 QUI 08:00 12:00 13:00 17:30
9000 Horas Normais 33:56
`.trim();
    const r = mapperCartaoViaVarejo.mapear(docSintetico(txt));
    expect(r!.reconciliacao_geral_ok).toBe(true);
    expect(r!.reconciliacao![0].ok).toBe(true);
    expect(Math.abs(r!.reconciliacao![0].delta_minutos)).toBeLessThanOrEqual(5);
  });

  it("delta de exatamente 6min (limite + 1) já é ok=false", () => {
    // 4 dias × 8:30 = 34:00 = 2040min. Declara 33:54 = 2034min. delta=+6min.
    const txt = `
VIA VAREJO S/A
CARTÃO DE PONTO
PERÍODO: 11/01/2016 A 15/02/2016
11 SEG 08:00 12:00 13:00 17:30
12 TER 08:00 12:00 13:00 17:30
13 QUA 08:00 12:00 13:00 17:30
14 QUI 08:00 12:00 13:00 17:30
9000 Horas Normais 33:54
`.trim();
    const r = mapperCartaoViaVarejo.mapear(docSintetico(txt));
    expect(r!.reconciliacao![0].delta_minutos).toBe(6);
    expect(r!.reconciliacao![0].ok).toBe(false);
    expect(r!.reconciliacao_geral_ok).toBe(false);
  });
});

// ============================================================
// Sample pra reporting (rodar com --reporter=verbose pra ver)
// ============================================================

describe("amostra do reconciliacao[] (para inspeção visual)", () => {
  it("imprime motivos completos dos 3 períodos do TEXTO_3_PERIODOS", () => {
    const r = mapperCartaoViaVarejo.mapear(docSintetico(TEXTO_3_PERIODOS));
    const linhas = r!.reconciliacao!.map(
      (rec, i) =>
        `[Período ${i + 1}: ${rec.periodo.inicio}↔${rec.periodo.fim}] ` +
        `ok=${rec.ok} declarado=${rec.declarado_str ?? "null"} ` +
        `somado=${rec.somado_str} delta=${rec.delta_minutos}min — ${rec.motivo}`,
    );
    // Não é assertion crítica — apenas tornar o resultado VISÍVEL no log.
    // Comentário de teste é mais útil que expect.toMatch() aqui.
    console.log("\n=== reconciliacao[] sample ===");
    linhas.forEach((l) => console.log(l));
    console.log("=== reconciliacao_geral_ok:", r!.reconciliacao_geral_ok);
    expect(linhas).toHaveLength(3);
  });
});
