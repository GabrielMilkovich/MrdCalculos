/**
 * PJe-Calc v2.15.1 — OcorrenciaJornadaApuracaoCartao
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaJornadaApuracaoCartao
 *
 * Ref Java: pjecalc-fonte/.../cartaodeponto/OcorrenciaJornadaApuracaoCartao.java (~671 linhas)
 *
 * Registro efetivo de uma jornada diária: data + até 6 pares entrada/saída.
 * Implementa `Jornada`. Usado para cálculo real de horas trabalhadas.
 */
import type Decimal from 'decimal.js';
import type { ApuracaoCartaoDePonto } from './apuracao-cartao-de-ponto';
import type { Jornada } from './jornada';

export class OcorrenciaJornadaApuracaoCartao implements Jornada {
  private id: number | null = null;
  private versao: number = 0;
  private apuracaoCartaoDePonto: ApuracaoCartaoDePonto | null = null;
  private dataOcorrencia: Date | null = null;

  private hrEntrada1: string | null = null;
  private hrSaida1: string | null = null;
  private hrEntrada2: string | null = null;
  private hrSaida2: string | null = null;
  private hrEntrada3: string | null = null;
  private hrSaida3: string | null = null;
  private hrEntrada4: string | null = null;
  private hrSaida4: string | null = null;
  private hrEntrada5: string | null = null;
  private hrSaida5: string | null = null;
  private hrEntrada6: string | null = null;
  private hrSaida6: string | null = null;

  // transient
  private cargaMillis: Decimal | null = null;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getApuracaoCartaoDePonto(): ApuracaoCartaoDePonto | null { return this.apuracaoCartaoDePonto; }
  setApuracaoCartaoDePonto(v: ApuracaoCartaoDePonto | null): void { this.apuracaoCartaoDePonto = v; }

  getDataOcorrencia(): Date | null { return this.dataOcorrencia; }
  setDataOcorrencia(d: Date | null): void { this.dataOcorrencia = d; }

  getHrEntrada1(): string | null { return this.hrEntrada1; }
  setHrEntrada1(v: string | null): void { this.hrEntrada1 = v; }
  getHrEntrada2(): string | null { return this.hrEntrada2; }
  setHrEntrada2(v: string | null): void { this.hrEntrada2 = v; }
  getHrEntrada3(): string | null { return this.hrEntrada3; }
  setHrEntrada3(v: string | null): void { this.hrEntrada3 = v; }
  getHrEntrada4(): string | null { return this.hrEntrada4; }
  setHrEntrada4(v: string | null): void { this.hrEntrada4 = v; }
  getHrEntrada5(): string | null { return this.hrEntrada5; }
  setHrEntrada5(v: string | null): void { this.hrEntrada5 = v; }
  getHrEntrada6(): string | null { return this.hrEntrada6; }
  setHrEntrada6(v: string | null): void { this.hrEntrada6 = v; }

  getHrSaida1(): string | null { return this.hrSaida1; }
  setHrSaida1(v: string | null): void { this.hrSaida1 = v; }
  getHrSaida2(): string | null { return this.hrSaida2; }
  setHrSaida2(v: string | null): void { this.hrSaida2 = v; }
  getHrSaida3(): string | null { return this.hrSaida3; }
  setHrSaida3(v: string | null): void { this.hrSaida3 = v; }
  getHrSaida4(): string | null { return this.hrSaida4; }
  setHrSaida4(v: string | null): void { this.hrSaida4 = v; }
  getHrSaida5(): string | null { return this.hrSaida5; }
  setHrSaida5(v: string | null): void { this.hrSaida5 = v; }
  getHrSaida6(): string | null { return this.hrSaida6; }
  setHrSaida6(v: string | null): void { this.hrSaida6 = v; }

  getCargaMillis(): Decimal | null { return this.cargaMillis; }
  setCargaMillis(v: Decimal | null): void { this.cargaMillis = v; }

  /** validar (Java) — checa que saídas > entradas, formato HH:mm, etc. Stub. */
  validar(): this {
    return this;
  }

  /** compareTo — ordena por dataOcorrencia. */
  compareTo(o: OcorrenciaJornadaApuracaoCartao): number {
    const a = this.dataOcorrencia;
    const b = o.getDataOcorrencia();
    if (!a || !b) return 0;
    return a.getTime() - b.getTime();
  }
}
