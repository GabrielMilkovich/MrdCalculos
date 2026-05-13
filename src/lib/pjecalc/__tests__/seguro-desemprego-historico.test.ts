/**
 * Testes do Bug #2/#31 — seguro-desemprego com tabela histórica.
 *
 * Antes: função literalmente hardcoded para 2024
 * (`calcularParcelaSeguroDesemprego2024`). Para casos 2025+ usaria
 * faixas defasadas. Tabela do banco (`seguroDesempregoDB`) era
 * dead write — recebida no construtor mas nunca lida.
 *
 * Depois: função genérica `calcularParcelaSeguroDesemprego(salario,
 * dataRef?, tabela?)` consulta tabela por competência; fallback 2024
 * preserva comportamento quando tabela vazia.
 */
import { describe, expect, it } from "vitest";
import {
  calcularParcelaSeguroDesemprego,
  calcularParcelaSeguroDesemprego2024,
} from "../engine-v3";

describe("Seguro-Desemprego — fallback 2024 (sem tabela)", () => {
  it("Faixa 1 com piso SM 2024 (R$ 1.412)", () => {
    // 1500 × 0.8 = 1200 → piso aplica → 1412
    expect(calcularParcelaSeguroDesemprego(1500)).toBe(1412);
    // 2000 × 0.8 = 1600 (acima do piso)
    expect(calcularParcelaSeguroDesemprego(2000)).toBeCloseTo(1600, 2);
    // 2041.39 × 0.8 = 1633.11
    expect(calcularParcelaSeguroDesemprego(2041.39)).toBeCloseTo(1633.11, 2);
    // 1000 × 0.8 = 800 → piso
    expect(calcularParcelaSeguroDesemprego(1000)).toBe(1412);
  });

  it("Faixa 2: R$ 1.633,10 + (valor − 2.041,39) × 0.5", () => {
    const r = calcularParcelaSeguroDesemprego(3000);
    expect(r).toBeCloseTo(1633.10 + (3000 - 2041.39) * 0.5, 2);
  });

  it("Faixa 3: teto R$ 2.313,74", () => {
    expect(calcularParcelaSeguroDesemprego(10000)).toBe(2313.74);
    expect(calcularParcelaSeguroDesemprego(5000)).toBe(2313.74);
  });

  it("Alias 2024 funciona idêntico (retrocompat)", () => {
    expect(calcularParcelaSeguroDesemprego2024(2000)).toBeCloseTo(1600, 2);
    expect(calcularParcelaSeguroDesemprego2024(1500)).toBe(1412); // piso
  });
});

describe("Seguro-Desemprego — tabela histórica do banco", () => {
  // Fixture: faixas hipotéticas de 2025 (valores diferentes do 2024 fallback)
  const tabela2025 = [
    {
      competencia: "2025-01-01",
      faixa: 1,
      valor_inicial: 0,
      valor_final: 2200,
      percentual: 0.8,
      valor_soma: 0,
      valor_piso: 1518, // SM hipotético 2025
      valor_teto: 2500,
    },
    {
      competencia: "2025-01-01",
      faixa: 2,
      valor_inicial: 2200,
      valor_final: 3600,
      percentual: 0.5,
      valor_soma: 1760, // 2200 × 0.8
      valor_piso: 1518,
      valor_teto: 2500,
    },
    {
      competencia: "2025-01-01",
      faixa: 3,
      valor_inicial: 3600,
      valor_final: Infinity,
      percentual: 0,
      valor_soma: 2500, // teto fixo
      valor_piso: 1518,
      valor_teto: 2500,
    },
  ];

  it("Aplica tabela 2025 quando dataReferencia em 2025+", () => {
    // Salário R$ 2000 (faixa 1 de 2025): 2000 × 0.8 = 1600, mas piso 1518
    expect(
      calcularParcelaSeguroDesemprego(2000, "2025-03-15", tabela2025),
    ).toBe(1600);
  });

  it("Aplica piso da tabela 2025 (não usa fallback 2024)", () => {
    // Salário R$ 1000 (abaixo do piso 2025 = 1518)
    expect(
      calcularParcelaSeguroDesemprego(1000, "2025-03-15", tabela2025),
    ).toBe(1518); // piso 2025, não 1412 (piso 2024)
  });

  it("Aplica teto da tabela 2025", () => {
    expect(
      calcularParcelaSeguroDesemprego(10000, "2025-03-15", tabela2025),
    ).toBe(2500); // teto 2025, não 2313.74 (teto 2024)
  });

  it("Para dataReferencia em 2024 com tabela só de 2025: fallback 2024", () => {
    // Competência 2024 não existe na tabela → cai no fallback (piso 1412)
    expect(
      calcularParcelaSeguroDesemprego(2000, "2024-06-01", tabela2025),
    ).toBeCloseTo(1600, 2); // 2000 × 0.8 = 1600, acima do piso 1412
  });

  it("Tabela vazia + dataReferencia: fallback 2024", () => {
    expect(
      calcularParcelaSeguroDesemprego(2000, "2024-06-01", []),
    ).toBeCloseTo(1600, 2);
  });

  it("Sem dataReferencia: fallback 2024 mesmo com tabela presente", () => {
    expect(
      calcularParcelaSeguroDesemprego(2000, undefined, tabela2025),
    ).toBeCloseTo(1600, 2);
  });

  it("Salário zero ou negativo: retorna 0", () => {
    expect(calcularParcelaSeguroDesemprego(0, "2025-01-01", tabela2025)).toBe(0);
    expect(calcularParcelaSeguroDesemprego(-100, "2025-01-01", tabela2025)).toBe(0);
  });
});
