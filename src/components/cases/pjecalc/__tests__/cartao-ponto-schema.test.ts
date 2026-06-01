/**
 * Testes de paridade — marcações de jornada do Cartão de Ponto (Seção 7, Model B).
 * Regras: OcorrenciaJornadaApuracaoCartao.validar() (Java).
 */
import { describe, it, expect } from "vitest";
import { validarJornadaDia, horaParaMinutos } from "../cartao-ponto-schema";

/** Helper: monta 12 marcações a partir de pares [e,s]. */
const marcs = (...pares: Array<[string | null, string | null]>): Array<string | null> => {
  const out: Array<string | null> = Array(12).fill(null);
  pares.forEach(([e, s], i) => { out[i * 2] = e; out[i * 2 + 1] = s; });
  return out;
};

describe("horaParaMinutos", () => {
  it("converte HH:mm", () => {
    expect(horaParaMinutos("08:00")).toBe(480);
    expect(horaParaMinutos("23:59")).toBe(1439);
    expect(horaParaMinutos("")).toBeNull();
    expect(horaParaMinutos("24:00")).toBeNull();
    expect(horaParaMinutos("8h")).toBeNull();
  });
});

describe("validarJornadaDia — paridade", () => {
  it("jornada simples 08-12 / 13-17 é válida", () => {
    expect(validarJornadaDia(marcs(["08:00", "12:00"], ["13:00", "17:00"])).ok).toBe(true);
  });
  it("dia totalmente vazio é válido", () => {
    expect(validarJornadaDia(Array(12).fill(null)).ok).toBe(true);
    expect(validarJornadaDia(marcs(["", ""])).ok).toBe(true);
  });
  it("par incompleto (entrada sem saída) bloqueia", () => {
    const r = validarJornadaDia(marcs(["08:00", null]));
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/par incompleto|entrada e sa/i);
  });
  it("saída sem entrada bloqueia", () => {
    expect(validarJornadaDia(marcs([null, "12:00"])).ok).toBe(false);
  });
  it("turnos sobrepostos bloqueiam (MSG0185)", () => {
    // turno 2 começa antes do fim do turno 1
    const r = validarJornadaDia(marcs(["08:00", "12:00"], ["11:00", "15:00"]));
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/sobrep/i);
  });
  it("turnos em ordem sem sobreposição são válidos", () => {
    expect(validarJornadaDia(marcs(["08:00", "12:00"], ["13:00", "17:00"], ["18:00", "20:00"])).ok).toBe(true);
  });
  it("hora inválida bloqueia", () => {
    expect(validarJornadaDia(marcs(["08:00", "25:00"])).ok).toBe(false);
  });
  it("jornada noturna cruzando meia-noite é válida (22:00-06:00)", () => {
    expect(validarJornadaDia(marcs(["22:00", "06:00"])).ok).toBe(true);
  });
  it("noturna + segundo turno no dia seguinte (22-02 / 03-05) válida", () => {
    expect(validarJornadaDia(marcs(["22:00", "02:00"], ["03:00", "05:00"])).ok).toBe(true);
  });
});
