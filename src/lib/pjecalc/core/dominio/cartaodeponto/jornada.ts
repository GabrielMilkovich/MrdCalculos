/**
 * PJe-Calc v2.15.1 — Jornada (interface)
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.Jornada
 *
 * Ref Java: pjecalc-fonte/.../cartaodeponto/Jornada.java
 *
 * Contrato de uma jornada de trabalho (até 6 pares entrada/saída por dia).
 * Formato das horas: string "HH:mm" (ex: "08:00").
 */
import type { ApuracaoCartaoDePonto } from './apuracao-cartao-de-ponto';

export interface Jornada {
  getHrEntrada1(): string | null;
  getHrEntrada2(): string | null;
  getHrEntrada3(): string | null;
  getHrEntrada4(): string | null;
  getHrEntrada5(): string | null;
  getHrEntrada6(): string | null;
  getHrSaida1(): string | null;
  getHrSaida2(): string | null;
  getHrSaida3(): string | null;
  getHrSaida4(): string | null;
  getHrSaida5(): string | null;
  getHrSaida6(): string | null;

  setHrEntrada1(v: string | null): void;
  setHrEntrada2(v: string | null): void;
  setHrEntrada3(v: string | null): void;
  setHrEntrada4(v: string | null): void;
  setHrEntrada5(v: string | null): void;
  setHrEntrada6(v: string | null): void;
  setHrSaida1(v: string | null): void;
  setHrSaida2(v: string | null): void;
  setHrSaida3(v: string | null): void;
  setHrSaida4(v: string | null): void;
  setHrSaida5(v: string | null): void;
  setHrSaida6(v: string | null): void;

  getDataOcorrencia(): Date | null;
  getApuracaoCartaoDePonto(): ApuracaoCartaoDePonto | null;

  validar(): Jornada;
}
