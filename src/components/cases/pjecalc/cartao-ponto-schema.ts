/**
 * Validação — marcações de jornada do Cartão de Ponto (paridade PJe-Calc v2.15.1,
 * Model B / ApuracaoCartaoDePonto + OcorrenciaJornadaApuracaoCartao).
 *
 * Regras de OcorrenciaJornadaApuracaoCartao.validar() (Java:514-586) +
 * CartaoDePontoUtils:
 *  - 6 turnos × (entrada, saída) = 12 marcações/dia; HH:mm válido (00:00-23:59).
 *  - cada turno: entrada e saída ambas presentes ou ambas vazias (não pode uma só).
 *  - turnos em ordem cronológica e sem sobreposição (MSG0185).
 *  - saída ≥ entrada dentro do turno; jornada não pode exceder ~2 dias (MSG0187).
 * Ver docs/specs/cartao-de-ponto.md.
 *
 * Nota: jornada noturna pode cruzar a meia-noite (saída < entrada no relógio) —
 * tratado como turno que vira o dia; só bloqueamos quando a sequência entre
 * turnos é claramente inconsistente.
 */

export const HORA_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** "08:00" → minutos desde 00:00; null se inválido/vazio. */
export function horaParaMinutos(v: string | null | undefined): number | null {
  const s = (v ?? "").trim();
  if (!s || !HORA_RE.test(s)) return null;
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

export interface Turno {
  entrada: string | null;
  saida: string | null;
}

export interface ValidacaoJornada {
  ok: boolean;
  erro?: string;
}

/**
 * Valida os 6 turnos de um dia (paridade OcorrenciaJornadaApuracaoCartao).
 * Recebe os 12 campos na ordem entrada_1, saida_1, ..., entrada_6, saida_6.
 */
export function validarJornadaDia(marcacoes: Array<string | null>): ValidacaoJornada {
  const turnos: Turno[] = [];
  for (let i = 0; i < 12; i += 2) {
    turnos.push({ entrada: marcacoes[i] ?? null, saida: marcacoes[i + 1] ?? null });
  }

  // Os turnos são lançados em ordem cronológica de RELÓGIO no dia. Convertemos
  // para uma linha do tempo absoluta acumulando viradas de meia-noite SOMENTE
  // dentro de um turno (jornada noturna: saída < entrada). Entre turnos, a
  // entrada do turno seguinte deve ser ≥ saída do anterior (no relógio) —
  // caso contrário é sobreposição (MSG0185), não virada de dia.
  let ultimoFimAbs: number | null = null; // fim do turno anterior (minutos absolutos)
  let ultimoFimClock = 0; // fim do turno anterior no relógio (0-1439)
  let diasAcumulados = 0; // viradas já contadas (em dias)
  let jornadaInicioAbs: number | null = null; // início do primeiro turno preenchido

  for (let t = 0; t < turnos.length; t++) {
    const { entrada, saida } = turnos[t];
    const temE = !!(entrada && entrada.trim());
    const temS = !!(saida && saida.trim());

    if (!temE && !temS) continue; // turno vazio — ok

    if (temE !== temS) {
      return { ok: false, erro: `Turno ${t + 1}: informe entrada e saída (par incompleto).` };
    }

    const eMin = horaParaMinutos(entrada);
    const sMin = horaParaMinutos(saida);
    if (eMin == null || sMin == null) {
      return { ok: false, erro: `Turno ${t + 1}: horário inválido.` };
    }

    // entrada no relógio deve ser ≥ fim do turno anterior no relógio (mesmo dia).
    if (ultimoFimAbs != null && eMin < ultimoFimClock) {
      return { ok: false, erro: `Turno ${t + 1}: sobrepõe o turno anterior.` };
    }

    const entradaAbs = eMin + diasAcumulados * 1440;
    if (jornadaInicioAbs == null) jornadaInicioAbs = entradaAbs;

    // saída ≥ entrada no mesmo turno; se menor, jornada noturna → vira o dia.
    let saidaAbs = sMin + diasAcumulados * 1440;
    let fimClock = sMin;
    if (saidaAbs < entradaAbs) {
      diasAcumulados += 1;
      saidaAbs += 1440;
      fimClock = sMin; // no novo dia
    }

    // jornada acumulada não pode exceder ~2 dias (MSG0187)
    if (saidaAbs - jornadaInicioAbs > 2 * 1440) {
      return { ok: false, erro: `Turno ${t + 1}: jornada superior a dois dias.` };
    }

    ultimoFimAbs = saidaAbs;
    ultimoFimClock = fimClock;
  }

  return { ok: true };
}
