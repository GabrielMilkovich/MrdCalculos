/**
 * CartaoDePontoUtils — golden tests (Fase 4)
 *
 * Fidelidade 1-a-1 com CartaoDePontoUtils.java v2.15.1.
 *
 * Cobre as 5 helpers puras portadas nesta fase:
 *   - isPeriodosSemDescanso (L203-220 Java)
 *   - hasEntradaNoPeriodoNoturnoDaMadrugada (L453-482)
 *   - getInicioAtividadeNoturna (L130-144)
 *   - getFimAtividadeNoturna (L112-128)
 *   - isJornadaDeMaisDeDoisDias (L628-637)
 *
 * Também cobre os 2 métodos novos de ApuracaoCartaoDePonto:
 *   - obterInicioAtividadeHorarioNoturno (L809-817)
 *   - obterFimAtividadeHorarioNoturno (L819-827)
 */
import { describe, it, expect } from 'vitest';

import { CartaoDePontoUtils } from '../cartao-de-ponto-utils';
import { ApuracaoCartaoDePonto } from '../apuracao-cartao-de-ponto';
import { HorarioNoturnoApuracaroCartaoEnum } from '../../../constantes/enums';
import type { Jornada } from '../jornada';

// ──────────────────────────────────────────────────────────────────
//  Fábrica de Jornada mock para testes — só os getters que
//  os helpers usam são obrigatórios.
// ──────────────────────────────────────────────────────────────────

interface JornadaMockData {
  e1?: string | null; s1?: string | null;
  e2?: string | null; s2?: string | null;
  e3?: string | null; s3?: string | null;
  e4?: string | null; s4?: string | null;
  e5?: string | null; s5?: string | null;
  e6?: string | null; s6?: string | null;
  apuracao?: ApuracaoCartaoDePonto | null;
}

function makeJornada(data: JornadaMockData = {}): Jornada {
  const {
    e1 = null, s1 = null, e2 = null, s2 = null,
    e3 = null, s3 = null, e4 = null, s4 = null,
    e5 = null, s5 = null, e6 = null, s6 = null,
    apuracao = null,
  } = data;
  return {
    getHrEntrada1: () => e1, getHrSaida1: () => s1,
    getHrEntrada2: () => e2, getHrSaida2: () => s2,
    getHrEntrada3: () => e3, getHrSaida3: () => s3,
    getHrEntrada4: () => e4, getHrSaida4: () => s4,
    getHrEntrada5: () => e5, getHrSaida5: () => s5,
    getHrEntrada6: () => e6, getHrSaida6: () => s6,
    setHrEntrada1: () => { /* noop */ },
    setHrEntrada2: () => { /* noop */ },
    setHrEntrada3: () => { /* noop */ },
    setHrEntrada4: () => { /* noop */ },
    setHrEntrada5: () => { /* noop */ },
    setHrEntrada6: () => { /* noop */ },
    setHrSaida1: () => { /* noop */ },
    setHrSaida2: () => { /* noop */ },
    setHrSaida3: () => { /* noop */ },
    setHrSaida4: () => { /* noop */ },
    setHrSaida5: () => { /* noop */ },
    setHrSaida6: () => { /* noop */ },
    getDataOcorrencia: () => null,
    getApuracaoCartaoDePonto: () => apuracao,
    validar() { return this; },
  };
}

function makeApuracao(tipo: HorarioNoturnoApuracaroCartaoEnum = HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_URBANA): ApuracaoCartaoDePonto {
  const a = new ApuracaoCartaoDePonto();
  a.setHorarioNoturnoApuracaroCartao(tipo);
  return a;
}

// ──────────────────────────────────────────────────────────────────
//  ApuracaoCartaoDePonto.obterInicioAtividadeHorarioNoturno
//  ApuracaoCartaoDePonto.obterFimAtividadeHorarioNoturno
// ──────────────────────────────────────────────────────────────────

describe('ApuracaoCartaoDePonto — horários noturnos por atividade', () => {
  it('ATIVIDADE_URBANA: 22:00 → 05:00 (CLT art. 73)', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_URBANA);
    expect(a.obterInicioAtividadeHorarioNoturno()).toBe('22:00');
    expect(a.obterFimAtividadeHorarioNoturno()).toBe('05:00');
  });

  it('ATIVIDADE_AGRICOLA: 21:00 → 05:00 (Lei 5.889/73)', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_AGRICOLA);
    expect(a.obterInicioAtividadeHorarioNoturno()).toBe('21:00');
    expect(a.obterFimAtividadeHorarioNoturno()).toBe('05:00');
  });

  it('ATIVIDADE_PECUARIA: 20:00 → 04:00 (Lei 5.889/73)', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_PECUARIA);
    expect(a.obterInicioAtividadeHorarioNoturno()).toBe('20:00');
    expect(a.obterFimAtividadeHorarioNoturno()).toBe('04:00');
  });
});

// ──────────────────────────────────────────────────────────────────
//  isPeriodosSemDescanso
// ──────────────────────────────────────────────────────────────────

describe('CartaoDePontoUtils.isPeriodosSemDescanso', () => {
  it('jornada sem colagem: retorna false', () => {
    const j = makeJornada({
      e1: '08:00', s1: '12:00',
      e2: '13:00', s2: '17:00',
    });
    expect(CartaoDePontoUtils.isPeriodosSemDescanso(j)).toBe(false);
  });

  it('colagem s1 ≡ e2 (almoço de 0 minutos): retorna true', () => {
    const j = makeJornada({
      e1: '08:00', s1: '12:00',
      e2: '12:00', s2: '17:00',
    });
    expect(CartaoDePontoUtils.isPeriodosSemDescanso(j)).toBe(true);
  });

  it('colagem com whitespace (Java usa trim): retorna true', () => {
    const j = makeJornada({
      e1: '08:00', s1: ' 12:00 ',
      e2: '12:00', s2: '17:00',
    });
    expect(CartaoDePontoUtils.isPeriodosSemDescanso(j)).toBe(true);
  });

  it('colagem s5 ≡ e6 (sexto turno): retorna true', () => {
    const j = makeJornada({
      e1: '08:00', s1: '09:00',
      e2: '10:00', s2: '11:00',
      e3: '12:00', s3: '13:00',
      e4: '14:00', s4: '15:00',
      e5: '16:00', s5: '17:00',
      e6: '17:00', s6: '18:00',
    });
    expect(CartaoDePontoUtils.isPeriodosSemDescanso(j)).toBe(true);
  });

  it('campos null: ignora o par', () => {
    const j = makeJornada({
      e1: '08:00', s1: '17:00',
    });
    expect(CartaoDePontoUtils.isPeriodosSemDescanso(j)).toBe(false);
  });

  it('apenas um lado do par preenchido: ignora', () => {
    const j = makeJornada({
      e1: '08:00', s1: '12:00',
      e2: '12:00', // sem saida
    });
    // s1=12:00 e e2=12:00 iguais → detecta colagem mesmo sem s2
    expect(CartaoDePontoUtils.isPeriodosSemDescanso(j)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────
//  hasEntradaNoPeriodoNoturnoDaMadrugada
// ──────────────────────────────────────────────────────────────────

describe('CartaoDePontoUtils.hasEntradaNoPeriodoNoturnoDaMadrugada', () => {
  it('urbana, entrada 03:00 (antes de 05:00): true', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_URBANA);
    const j = makeJornada({ e1: '03:00', s1: '10:00', apuracao: a });
    expect(CartaoDePontoUtils.hasEntradaNoPeriodoNoturnoDaMadrugada(j)).toBe(true);
  });

  it('urbana, entrada 05:00 (exatamente fim): false (<)', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_URBANA);
    const j = makeJornada({ e1: '05:00', s1: '10:00', apuracao: a });
    expect(CartaoDePontoUtils.hasEntradaNoPeriodoNoturnoDaMadrugada(j)).toBe(false);
  });

  it('urbana, entrada 08:00: false', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_URBANA);
    const j = makeJornada({ e1: '08:00', s1: '17:00', apuracao: a });
    expect(CartaoDePontoUtils.hasEntradaNoPeriodoNoturnoDaMadrugada(j)).toBe(false);
  });

  it('pecuária (fim 04:00), entrada 03:30: true', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_PECUARIA);
    const j = makeJornada({ e1: '03:30', s1: '10:00', apuracao: a });
    expect(CartaoDePontoUtils.hasEntradaNoPeriodoNoturnoDaMadrugada(j)).toBe(true);
  });

  it('pecuária (fim 04:00), entrada 04:30: false', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_PECUARIA);
    const j = makeJornada({ e1: '04:30', s1: '10:00', apuracao: a });
    expect(CartaoDePontoUtils.hasEntradaNoPeriodoNoturnoDaMadrugada(j)).toBe(false);
  });

  it('primeira entrada diurna, segunda entrada na madrugada (turno noite): true', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_URBANA);
    const j = makeJornada({
      e1: '14:00', s1: '18:00',
      e2: '04:00', s2: '08:00',
      apuracao: a,
    });
    expect(CartaoDePontoUtils.hasEntradaNoPeriodoNoturnoDaMadrugada(j)).toBe(true);
  });

  it('apuracao null: retorna false (seguro)', () => {
    const j = makeJornada({ e1: '03:00', s1: '10:00', apuracao: null });
    expect(CartaoDePontoUtils.hasEntradaNoPeriodoNoturnoDaMadrugada(j)).toBe(false);
  });

  it('todas entradas null: retorna false', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_URBANA);
    const j = makeJornada({ apuracao: a });
    expect(CartaoDePontoUtils.hasEntradaNoPeriodoNoturnoDaMadrugada(j)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────
//  getInicioAtividadeNoturna / getFimAtividadeNoturna
// ──────────────────────────────────────────────────────────────────

describe('CartaoDePontoUtils.getInicioAtividadeNoturna', () => {
  it('ATIVIDADE_URBANA: 22:00 → millis(79200000)', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_URBANA);
    const date = CartaoDePontoUtils.getInicioAtividadeNoturna(a);
    // 22:00 = 22*3600*1000 = 79200000 ms
    expect(date.getTime()).toBe(79200000);
  });

  it('ATIVIDADE_PECUARIA: 20:00 → millis(72000000)', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_PECUARIA);
    const date = CartaoDePontoUtils.getInicioAtividadeNoturna(a);
    expect(date.getTime()).toBe(72000000);
  });
});

describe('CartaoDePontoUtils.getFimAtividadeNoturna', () => {
  it('ATIVIDADE_URBANA: 05:00 + 24h = 29:00 → millis(104400000)', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_URBANA);
    const date = CartaoDePontoUtils.getFimAtividadeNoturna(a);
    // 05:00 = 18000000 ms, + 24h (86400000) = 104400000
    expect(date.getTime()).toBe(104400000);
  });

  it('ATIVIDADE_PECUARIA: 04:00 + 24h = 28:00 → millis(100800000)', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_PECUARIA);
    const date = CartaoDePontoUtils.getFimAtividadeNoturna(a);
    expect(date.getTime()).toBe(100800000);
  });

  it('fim − início = duração canonica da atividade noturna', () => {
    const a = makeApuracao(HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_URBANA);
    const inicio = CartaoDePontoUtils.getInicioAtividadeNoturna(a);
    const fim = CartaoDePontoUtils.getFimAtividadeNoturna(a);
    // 22:00 → 05:00 do dia seguinte = 7h = 25200000 ms
    expect(fim.getTime() - inicio.getTime()).toBe(25200000);
  });
});

// ──────────────────────────────────────────────────────────────────
//  isJornadaDeMaisDeDoisDias
// ──────────────────────────────────────────────────────────────────

describe('CartaoDePontoUtils.isJornadaDeMaisDeDoisDias', () => {
  it('jornada comum 08:00-17:00: false', () => {
    const a = makeApuracao();
    const j = makeJornada({ e1: '08:00', s1: '17:00', apuracao: a });
    expect(CartaoDePontoUtils.isJornadaDeMaisDeDoisDias(j)).toBe(false);
  });

  it('sem turnos: false', () => {
    const a = makeApuracao();
    const j = makeJornada({ apuracao: a });
    expect(CartaoDePontoUtils.isJornadaDeMaisDeDoisDias(j)).toBe(false);
  });

  // Turno noturno não cruza 47h59 em apenas 1 noite (na verdade,
  // montarTurnos atual não implementa troca de dia, então jornadas noturnas
  // aparecem com saida < entrada. O teste aqui valida o ramo de saída.
  it('jornada diurna curta: false (safe-guard)', () => {
    const a = makeApuracao();
    const j = makeJornada({ e1: '10:00', s1: '12:00', apuracao: a });
    expect(CartaoDePontoUtils.isJornadaDeMaisDeDoisDias(j)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────
//  Constantes
// ──────────────────────────────────────────────────────────────────

describe('CartaoDePontoUtils — constantes Java preservadas', () => {
  it('VINTE_QUATRO_HORAS_MILLIS = 86400000', () => {
    expect(CartaoDePontoUtils.VINTE_QUATRO_HORAS_MILLIS.toString()).toBe('86400000');
  });

  it('FATOR_HORA_FICTA = 1.142857 (art. 73 §1º CLT: 60/52.5)', () => {
    expect(CartaoDePontoUtils.FATOR_HORA_FICTA.toString()).toBe('1.142857');
  });

  it('QUARENTA_SETE_HORAS_CINQUENTA_NOVE_MINUTOS_MILLIS = 172740000', () => {
    expect(CartaoDePontoUtils.QUARENTA_SETE_HORAS_CINQUENTA_NOVE_MINUTOS_MILLIS.toString()).toBe('172740000');
  });
});

// ──────────────────────────────────────────────────────────────────
//  converterHoraMinutoEmMilis (sanity regression)
// ──────────────────────────────────────────────────────────────────

describe('CartaoDePontoUtils.converterHoraMinutoEmMilis', () => {
  it('08:00 = 28800000', () => {
    expect(CartaoDePontoUtils.converterHoraMinutoEmMilis('08:00').toString()).toBe('28800000');
  });
  it('00:00 = 0', () => {
    expect(CartaoDePontoUtils.converterHoraMinutoEmMilis('00:00').toString()).toBe('0');
  });
  it('null / vazio = 0', () => {
    expect(CartaoDePontoUtils.converterHoraMinutoEmMilis(null).toString()).toBe('0');
    expect(CartaoDePontoUtils.converterHoraMinutoEmMilis('').toString()).toBe('0');
  });
});
