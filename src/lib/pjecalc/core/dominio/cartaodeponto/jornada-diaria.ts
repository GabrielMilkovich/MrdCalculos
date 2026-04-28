/**
 * PJe-Calc v2.15.1 — JornadaDiaria (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.JornadaDiaria
 *
 * Ref Java: pjecalc-fonte/.../cartaodeponto/JornadaDiaria.java (~234 linhas)
 *
 * Representa uma jornada de trabalho de um único dia: lista de turnos
 * (entrada/saída em milissegundos), data e carga horária diária esperada.
 *
 * Consome as ocorrências do cartão-ponto para calcular:
 *   - total de horas trabalhadas
 *   - horas noturnas (com fator ficta 52m30s → 60m)
 *   - horas extras
 *
 * **Status**: stub estrutural — a lógica de `getTotalHorasNoturnas` e afins
 * envolve regras de Sumula 60 TST + HelperDate; será implementada quando
 * MaquinaDeCalculoDeCartaoDePonto for preenchida.
 */
import Decimal from 'decimal.js';
import type { ApuracaoCartaoDePonto } from './apuracao-cartao-de-ponto';
import type { OcorrenciaJornadaApuracaoCartao } from './ocorrencia-jornada-apuracao-cartao';

const ZERO = new Decimal(0);

/** Turno — um par entrada/saída em milissegundos desde meia-noite. */
export class Turno {
  constructor(
    private readonly entrada: Decimal,
    private readonly saida: Decimal,
  ) {}

  getEntrada(): Decimal { return this.entrada; }
  getSaida(): Decimal { return this.saida; }

  /** getDuracaoMillis — diferença saida − entrada. */
  getDuracaoMillis(): Decimal {
    return this.saida.minus(this.entrada);
  }

  /**
   * `getQuantidadeHorasTrabalhadas` — alias de `getDuracaoMillis()`.
   * Porte 1-a-1 de JornadaDiaria.Turno.java:211-213 (que é simplesmente
   * `somar(diurnas, noturnas)`, cuja soma equivale à duração total do
   * turno quando diurnas e noturnas foram apurados sem overlap).
   *
   * Nota Fase 4: A decomposição em diurnas/noturnas exige porta do
   * `calcularQuantidadeHorasDiurnas` e do predicado `prorrogarHorarioNoturno`,
   * que dependem de reestruturar `Turno` para usar `Date` (como Java) em
   * vez de `Decimal` de millis. Decisão operacional: postergar para uma
   * sessão futura. A versão atual devolve duração total do turno — correto
   * para `getQuantidadeHorasTrabalhadas` por identidade algébrica.
   */
  getQuantidadeHorasTrabalhadas(): Decimal {
    return this.getDuracaoMillis();
  }
}

export class JornadaDiaria {
  private readonly data: Date;
  private readonly turnosDoDia: Turno[] = [];
  private readonly apuracaoCartaoDePonto: ApuracaoCartaoDePonto | null;
  private readonly horarioNoturnoTotal: boolean;
  private readonly cargaHorariaDiaria: Decimal;

  constructor(
    turnosInMilis: (Decimal | null)[],
    ocorrencia: OcorrenciaJornadaApuracaoCartao,
    horarioNoturnoTotal: boolean,
  ) {
    this.apuracaoCartaoDePonto = ocorrencia.getApuracaoCartaoDePonto?.() ?? null;
    this.horarioNoturnoTotal = horarioNoturnoTotal;
    this.data = ocorrencia.getDataOcorrencia?.() ?? new Date();
    this.cargaHorariaDiaria = ocorrencia.getCargaMillis?.() ?? ZERO;

    // Pares consecutivos: índices pares = entrada, ímpares = saída
    for (let i = 0; i < turnosInMilis.length; i += 2) {
      const ent = turnosInMilis[i];
      const sai = turnosInMilis[i + 1];
      if (ent === null || sai === null || ent === undefined || sai === undefined) continue;
      this.turnosDoDia.push(new Turno(ent, sai));
    }
  }

  getData(): Date { return this.data; }
  getTurnosDoDia(): Turno[] { return this.turnosDoDia; }
  getCargaHorariaDiaria(): Decimal { return this.cargaHorariaDiaria; }
  isHorarioNoturnoTotal(): boolean { return this.horarioNoturnoTotal; }

  /** getTotalHorasTrabalhadas — soma das durações dos turnos (em millis). */
  getTotalHorasTrabalhadas(): Decimal {
    let total = ZERO;
    for (const t of this.turnosDoDia) total = total.plus(t.getDuracaoMillis());
    return total;
  }

  /** getTotalHorasNoturnas — stub; lógica depende de Sumula 60 + CartaoDePontoUtils */
  getTotalHorasNoturnas(): Decimal {
    // TODO(fase-13): implementar cálculo de horas noturnas com prorrogação.
    return ZERO;
  }
}
