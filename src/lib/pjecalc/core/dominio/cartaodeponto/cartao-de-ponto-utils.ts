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
}
