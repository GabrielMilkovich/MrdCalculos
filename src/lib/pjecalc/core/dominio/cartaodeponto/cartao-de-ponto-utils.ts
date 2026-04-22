/**
 * PJe-Calc v2.15.1 — CartaoDePontoUtils (stub com constantes)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePontoUtils
 *
 * Ref Java: pjecalc-fonte/.../cartaodeponto/CartaoDePontoUtils.java (~671 linhas)
 *
 * Utilitários estáticos para parsing de horas e cálculos de turnos.
 *
 * **Status**: stub com constantes críticas (FATOR_HORA_FICTA,
 * VINTE_QUATRO_HORAS_MILLIS) e funções básicas de parsing. A lógica
 * completa de `montarTurnos` e `preencherTurno` será implementada
 * junto com MaquinaDeCalculoDeCartaoDePonto.
 */
import Decimal from 'decimal.js';
import type { Jornada } from './jornada';

export class CartaoDePontoUtils {
  static readonly FORMATO_DATA = 'dd/MM/yyyy';
  static readonly FORMATO_HORA = 'HH:mm';

  /** 24 horas em millis — 24*60*60*1000 = 86400000 */
  static readonly VINTE_QUATRO_HORAS_MILLIS = new Decimal('86400000');

  /** Fator ficta hora noturna — 60/52.5 = 1.142857 (Art. 73 §1º CLT) */
  static readonly FATOR_HORA_FICTA = new Decimal('1.142857');

  /** 47:59 em millis (limite para turnos que cruzam dois dias) */
  static readonly QUARENTA_SETE_HORAS_CINQUENTA_NOVE_MINUTOS_MILLIS = new Decimal('172740000');

  static readonly NUMERO_MAXIMO_DE_TURNOS = 6;

  /**
   * converterHoraMinutoEmMilis — "HH:mm" → Decimal milissegundos.
   * Null/vazio ⇒ Decimal(0).
   */
  static converterHoraMinutoEmMilis(hora: string | null | undefined): Decimal {
    if (!hora) return new Decimal(0);
    const parts = hora.split(':');
    if (parts.length < 2) return new Decimal(0);
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return new Decimal(0);
    return new Decimal(h * 60 * 60 * 1000 + m * 60 * 1000);
  }

  /**
   * converterMilisEmHoraMinuto — Decimal ms → "HH:mm".
   */
  static converterMilisEmHoraMinuto(ms: Decimal): string {
    const totalMinutos = ms.div(60 * 1000).floor();
    const h = totalMinutos.div(60).floor().toNumber();
    const m = totalMinutos.mod(60).toNumber();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * montarTurnos — extrai até 6 pares [entrada, saída] de uma Jornada.
   * TODO(fase-13): implementar lógica completa (com `horasParaAcrescentar`,
   * prorrogação noturna, troca de dia).
   */
  static montarTurnos(jornada: Jornada, _horasParaAcrescentar?: Decimal): (Decimal | null)[] {
    const turnos: (Decimal | null)[] = new Array(12).fill(null);
    const pairs: [string | null, string | null][] = [
      [jornada.getHrEntrada1(), jornada.getHrSaida1()],
      [jornada.getHrEntrada2(), jornada.getHrSaida2()],
      [jornada.getHrEntrada3(), jornada.getHrSaida3()],
      [jornada.getHrEntrada4(), jornada.getHrSaida4()],
      [jornada.getHrEntrada5(), jornada.getHrSaida5()],
      [jornada.getHrEntrada6(), jornada.getHrSaida6()],
    ];
    for (let i = 0; i < pairs.length; i++) {
      const [ent, sai] = pairs[i];
      if (ent && sai) {
        turnos[i * 2] = CartaoDePontoUtils.converterHoraMinutoEmMilis(ent);
        turnos[i * 2 + 1] = CartaoDePontoUtils.converterHoraMinutoEmMilis(sai);
      }
    }
    return turnos;
  }

  // ──────────────────────────────────────────────────────────────────────
  //  Fase 4 — helpers puras portadas 1-a-1 do Java
  // ──────────────────────────────────────────────────────────────────────

  /**
   * `isPeriodosSemDescanso` — detecta se há "colagem" entre turnos da mesma
   * jornada (saída do turno N exatamente igual à entrada do turno N+1).
   *
   * Porte de CartaoDePontoUtils.java:203-220. Compara pares consecutivos
   * (saida1↔entrada2, saida2↔entrada3, ..., saida5↔entrada6). Igualdade é
   * testada com `trim()` (paridade Java) para ignorar espaços acidentais
   * nos strings "HH:mm".
   */
  static isPeriodosSemDescanso(jornada: Jornada): boolean {
    const pairs: [string | null, string | null][] = [
      [jornada.getHrSaida1(), jornada.getHrEntrada2()],
      [jornada.getHrSaida2(), jornada.getHrEntrada3()],
      [jornada.getHrSaida3(), jornada.getHrEntrada4()],
      [jornada.getHrSaida4(), jornada.getHrEntrada5()],
      [jornada.getHrSaida5(), jornada.getHrEntrada6()],
    ];
    for (const [saida, entrada] of pairs) {
      if (saida != null && entrada != null && saida.trim() === entrada.trim()) {
        return true;
      }
    }
    return false;
  }

  /**
   * `hasEntradaNoPeriodoNoturnoDaMadrugada` — verifica se ao menos uma das 6
   * entradas da jornada cai antes do fim do horário noturno
   * (madrugada, tipicamente `00:00–05:00`).
   *
   * Porte 1-a-1 de CartaoDePontoUtils.java:453-482. Cruzamento da primeira
   * entrada não-nula encontrada é suficiente (preservando a semântica Java
   * que faz short-circuit via `ehPeriodoNoturnoMadrugada`).
   *
   * Relevante para Sumula 60 TST — prorrogação do adicional noturno em
   * jornada mista.
   */
  static hasEntradaNoPeriodoNoturnoDaMadrugada(jornada: Jornada): boolean {
    const acp = jornada.getApuracaoCartaoDePonto();
    if (acp == null) return false;
    const fimHorarioNoturno = CartaoDePontoUtils.converterHoraMinutoEmMilis(
      acp.obterFimAtividadeHorarioNoturno(),
    );
    const entradas = [
      jornada.getHrEntrada1(),
      jornada.getHrEntrada2(),
      jornada.getHrEntrada3(),
      jornada.getHrEntrada4(),
      jornada.getHrEntrada5(),
      jornada.getHrEntrada6(),
    ];
    for (const ent of entradas) {
      if (ent == null) continue;
      const horaEntrada = CartaoDePontoUtils.converterHoraMinutoEmMilis(ent);
      if (horaEntrada.lessThan(fimHorarioNoturno)) return true;
    }
    return false;
  }

  /**
   * `getInicioAtividadeNoturna` — parseia `obterInicioAtividadeHorarioNoturno`
   * (tipicamente "22:00") e devolve um `Date` representando esse instante
   * relativo. Em caso de erro de parse, retorna fallback Calendar setado
   * em dia-1 22:00.
   *
   * Porte de CartaoDePontoUtils.java:130-144. Em TS o "Date" usado é o
   * instante relativo ao `Date(0)` + offset; o caller deve tratar como
   * time-of-day (não data absoluta).
   */
  static getInicioAtividadeNoturna(acp: ApuracaoCartaoDePontoLike): Date {
    const hhmm = acp.obterInicioAtividadeHorarioNoturno();
    const millis = CartaoDePontoUtils.parseHoraHHmmToMillisOrNull(hhmm);
    if (millis == null) {
      // Fallback Java: 22:00 no dia 1 (um dia atrás do "amanhã")
      // Usamos epoch UTC: 1970-01-01 22:00 UTC = 22*3600*1000 = 79200000
      return new Date(79200000);
    }
    return new Date(millis.toNumber());
  }

  /**
   * `getFimAtividadeNoturna` — parseia `obterFimAtividadeHorarioNoturno`
   * (tipicamente "05:00"), adiciona 24h (fim do período noturno cai no dia
   * seguinte), e devolve `Date`. Em caso de erro de parse, fallback:
   * dia-2 05:00.
   *
   * Porte de CartaoDePontoUtils.java:112-128.
   */
  static getFimAtividadeNoturna(acp: ApuracaoCartaoDePontoLike): Date {
    const hhmm = acp.obterFimAtividadeHorarioNoturno();
    const millis = CartaoDePontoUtils.parseHoraHHmmToMillisOrNull(hhmm);
    if (millis == null) {
      // Fallback Java: 05:00 no dia 2. Em millis UTC relativos ao epoch:
      // dia 2 = 1970-01-02 05:00 = 86400000 + 18000000 = 104400000
      return new Date(104400000);
    }
    return new Date(millis.plus(CartaoDePontoUtils.VINTE_QUATRO_HORAS_MILLIS).toNumber());
  }

  /**
   * `isJornadaDeMaisDeDoisDias` — verifica se a última saída (turno 6→1 em
   * ordem reversa) ultrapassa 47h59 (turno que cruza mais de dois dias).
   *
   * Porte de CartaoDePontoUtils.java:628-637. Percorre turnos de trás para
   * frente buscando a primeira saída não-nula; compara com o limite
   * constante de 47:59 em millis (172 740 000).
   */
  static isJornadaDeMaisDeDoisDias(jornada: Jornada): boolean {
    const turnos = CartaoDePontoUtils.montarTurnos(jornada);
    // índices de saída: 11 (turno 6), 9 (turno 5), ..., 1 (turno 1)
    let ultimaSaida: Decimal | null = null;
    for (let i = 11; i > 0; i -= 2) {
      if (turnos[i] != null) {
        ultimaSaida = turnos[i];
        break;
      }
    }
    if (ultimaSaida == null) return false;
    return ultimaSaida.greaterThan(CartaoDePontoUtils.QUARENTA_SETE_HORAS_CINQUENTA_NOVE_MINUTOS_MILLIS);
  }

  /**
   * Helper interno: parseia "HH:mm" e devolve millis OU null se inválido.
   * Tratamento de null segue Java `SimpleDateFormat.parse` que lança
   * ParseException para entradas vazias/malformadas.
   */
  private static parseHoraHHmmToMillisOrNull(hora: string | null | undefined): Decimal | null {
    if (!hora) return null;
    const parts = hora.split(':');
    if (parts.length < 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return new Decimal(h * 60 * 60 * 1000 + m * 60 * 1000);
  }
}

/**
 * Interface mínima para ApuracaoCartaoDePonto consumida pelos helpers.
 * Evita import circular em usos externos que não precisam da classe inteira.
 */
export interface ApuracaoCartaoDePontoLike {
  obterInicioAtividadeHorarioNoturno(): string;
  obterFimAtividadeHorarioNoturno(): string;
}
