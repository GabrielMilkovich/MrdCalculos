/**
 * Score de confiança da extração (0-100) por tipo de documento.
 *
 * Filosofia:
 *   - Determinístico (mesma entrada → mesmo score).
 *   - Combina sinais negativos (warnings, unparsed, datas fora de janela)
 *     com sinais positivos (cobertura de competências, eventos ricos).
 *   - Nunca passa de 100 nem fica abaixo de 0.
 *   - `reasons` lista as razões do score em linguagem humana, ordem de
 *     maior penalidade pra menor.
 *
 * Faixas:
 *   90-100  alta confiança       (download liberado direto)
 *   60-89   média confiança      (download liberado, banner de aviso)
 *   0-59    baixa confiança      (sugerir IA / bloquear download por padrão)
 */

import type { ParseCartaoPontoResult } from "../parsers/cartao-ponto";
import type { ParseFeriasResult } from "../parsers/ferias";
import type { ParseFaltasResult } from "../parsers/faltas";
import type { HoleriteParseResult } from "../parsers/holerite/types";
import {
  detectarJanelasPeriodo,
  datasForaDaJanela,
  type JanelaPeriodo,
} from "./window";
import {
  checkHorasTrabalhadas,
  checkSomaMensalHT,
  checkHoleriteTotais,
  checkFerias,
  checkFaltas,
} from "./cross-validation";

export type ConfianceLevel = "alta" | "media" | "baixa";

export interface ConfidenceScore {
  /** 0-100 inteiro. */
  score: number;
  level: ConfianceLevel;
  /** Razões em linguagem humana, da maior penalidade pra menor. */
  reasons: string[];
  /**
   * FASE 1.4 + F0.5 — true quando o pipeline detectou inconsistência grave
   * que recomenda revisão manual antes do download. NÃO trava o botão
   * (decisão de produto: operador SEMPRE decide). Dialogs renderizam banner
   * vermelho explicativo. Razões típicas:
   *   - holerite: parser soma > 20% acima/abaixo do bruto/líquido declarado
   *   - holerite: 0 rubricas extraídas
   *   - cartão-ponto: 0 apurações em OCR não-vazio ou marcação impossível
   */
  bloqueador: boolean;
  /** Motivo legível do bloqueio (mostrado no banner). null/undefined se não bloqueado. */
  bloqueador_motivo?: string | null;
  /** Janelas de competência detectadas no OCR (cartão-ponto). */
  janelas?: JanelaPeriodo[];
  /** Datas fora de qualquer janela detectada (cartão-ponto). */
  datasForaJanela?: string[];
}

/**
 * Marcação considerada IMPOSSÍVEL — saída cronologicamente antes da entrada,
 * sem flag explícita de virada-meia-noite. Quando aparece numa apuração, é
 * forte indício de que o parser concatenou totalizadores HT/HE na linha das
 * batidas e formou pares cronologicamente inválidos.
 */
function marcacaoImpossivel(m: { e: string; s: string }): boolean {
  if (!m.e || !m.s) return false;
  const me = m.e.match(/^(\d{1,2}):(\d{2})$/);
  const ms = m.s.match(/^(\d{1,2}):(\d{2})$/);
  if (!me || !ms) return false;
  const e = parseInt(me[1], 10) * 60 + parseInt(me[2], 10);
  const s = parseInt(ms[1], 10) * 60 + parseInt(ms[2], 10);
  return s < e;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function nivel(score: number): ConfianceLevel {
  if (score >= 90) return "alta";
  if (score >= 60) return "media";
  return "baixa";
}

const RE_DATA_BR = /\b\d{2}\/\d{2}\/\d{4}\b/g;
const RE_HORA = /\b\d{1,2}:\d{2}\b/g;

/** Conta linhas (não vazias) que têm pelo menos uma data dd/MM/yyyy. */
function linhasComData(ocr: string): number {
  let n = 0;
  for (const linha of ocr.split(/\r?\n/)) {
    if (linha.trim() && RE_DATA_BR.test(linha)) n++;
    RE_DATA_BR.lastIndex = 0;
  }
  return n;
}

// ============================================================
// Cartão-Ponto
// ============================================================

/**
 * Score de confiança do cartão-ponto.
 *
 * Filosofia da fórmula:
 *   - Base 60 (neutro). Sobe com sinais positivos, cai com sinais negativos.
 *   - PENALIDADES PROPORCIONAIS: unparsed e warnings escalam pelo % do
 *     volume extraído, não por contagem absoluta — assim 23 unparsed em
 *     213 apurações (~10%) penaliza menos que 23 em 30 apurações (~75%).
 *   - PENALIDADE SEMÂNTICA mantida: data fora da janela do espelho é
 *     timestamp vazando, sempre pesa muito.
 *   - BONUS POR CROSS-VALIDATION MATEMÁTICA: quando a soma das batidas
 *     E/S bate com o evento "Horas Trabalhadas" do OCR (±5min), é o sinal
 *     mais forte de extração correta — vale +12. Soma mensal batendo
 *     vale +5 adicional.
 *   - BONUS POR COBERTURA, EVENTOS RICOS, JANELA LIMPA.
 *   - REASONS amigáveis com amostras das primeiras linhas problemáticas.
 */
export function scoreCartaoPonto(
  parsed: ParseCartaoPontoResult,
  ocr: string,
): ConfidenceScore {
  const reasons: string[] = [];
  const apuracoes = parsed.apuracoes;

  // Curto-circuito: nada extraído. FASE 1.4 — bloqueador.
  if (apuracoes.length === 0) {
    const janelas = detectarJanelasPeriodo(ocr);
    return {
      score: 5,
      level: "baixa",
      reasons: ["Nenhuma apuração extraída."],
      bloqueador: true,
      bloqueador_motivo:
        "Nenhuma apuração extraída — OCR pode estar corrompido.",
      janelas,
      datasForaJanela: [],
    };
  }

  let score = 60; // base neutra
  let bonusTotal = 0;
  let penalidadeTotal = 0;
  const unparsed = parsed.unparsed_lines.length;

  // === SINAIS NEGATIVOS ===

  // (1) unparsed proporcional ao total de "linhas com sinal de dado"
  // (apurações + suspeitas). 23/213 = ~10% → penalidade leve.
  const totalSinalizado = apuracoes.length + unparsed;
  const unparsedRatio = totalSinalizado > 0 ? unparsed / totalSinalizado : 0;
  let penUnparsed = 0;
  if (unparsedRatio >= 0.30) penUnparsed = 25;
  else if (unparsedRatio >= 0.15) penUnparsed = 15;
  else if (unparsedRatio >= 0.05) penUnparsed = 5;
  if (penUnparsed > 0) {
    penalidadeTotal += penUnparsed;
    const pct = Math.round(unparsedRatio * 100);
    const amostras = parsed.unparsed_lines
      .slice(0, 3)
      .map((u) => `L${u.linha}: "${u.conteudo.slice(0, 60)}${u.conteudo.length > 60 ? "…" : ""}"`)
      .join(" | ");
    reasons.push(
      `−${penUnparsed}: ${unparsed} linha(s) suspeita(s) sem casar (~${pct}% do total)${amostras ? ` — ${amostras}` : ""}`,
    );
  }

  // (2) warnings do parser (proporcional, cap -10).
  const warns = parsed.warnings.length;
  if (warns > 0) {
    const warnRatio = warns / apuracoes.length;
    const penWarn = Math.min(10, Math.round(warnRatio * 30) || warns);
    penalidadeTotal += penWarn;
    reasons.push(`−${penWarn}: ${warns} warning(s) emitido(s) pelo parser`);
  }

  // (3) Datas fora da janela do espelho — semântico, peso alto.
  const janelas = detectarJanelasPeriodo(ocr);
  const datasIso = apuracoes.map((a) => a.data);
  const fora = datasForaDaJanela(datasIso, janelas);
  if (fora.length > 0) {
    const penFora = Math.min(50, 15 + fora.length * 8);
    penalidadeTotal += penFora;
    reasons.push(
      `−${penFora}: ${fora.length} data(s) fora do período do espelho — possível timestamp de aprovação ou ruído`,
    );
  }

  // (4) Cobertura linhas-com-data → apurações.
  const totalDataLinhas = linhasComData(ocr);
  let cobertura = 1;
  if (totalDataLinhas > 5) {
    cobertura = apuracoes.length / totalDataLinhas;
    if (cobertura < 0.3) {
      penalidadeTotal += 20;
      reasons.push(
        `−20: só ${Math.round(cobertura * 100)}% das linhas com data viraram apuração (esperado ≥30%)`,
      );
    }
  }

  // (5) Cross-validation: soma de batidas E/S vs evento "Horas Trabalhadas".
  // É o sinal MATEMÁTICO mais forte. Quando a maioria dos dias falha, é
  // erro semântico (batidas mal pareadas) — mais grave que linhas órfãs.
  let diasComCheck = 0;
  let diasFalha = 0;
  for (const a of apuracoes) {
    if (a.marcacoes.length === 0) continue;
    const temHT = a.eventos.some((e) => e.tipo === "horas_trabalhadas");
    if (!temHT) continue;
    diasComCheck++;
    if (!checkHorasTrabalhadas(a).ok) diasFalha++;
  }
  const failRatio = diasComCheck > 0 ? diasFalha / diasComCheck : 0;
  if (diasComCheck >= 3) {
    if (failRatio > 0.30) {
      penalidadeTotal += 20;
      reasons.push(
        `−20: ${diasFalha}/${diasComCheck} dias com soma E/S divergente do "Horas Trabalhadas" do OCR (>30%) — possível erro de pareamento`,
      );
    } else if (failRatio > 0.10) {
      penalidadeTotal += 10;
      reasons.push(
        `−10: ${diasFalha}/${diasComCheck} dias com HT divergente (10–30%)`,
      );
    }
  }

  // === SINAIS POSITIVOS (bonus) ===

  // Bonus 1: cross-check matemático passando na maioria dos dias com batidas.
  if (diasComCheck >= 3) {
    if (failRatio <= 0.05) {
      bonusTotal += 12;
      reasons.push(
        `+12: soma E/S bate com "Horas Trabalhadas" em ${diasComCheck - diasFalha}/${diasComCheck} dias (±5min)`,
      );
    } else if (failRatio <= 0.20) {
      bonusTotal += 6;
      reasons.push(
        `+6: HT diário bate em ${Math.round((1 - failRatio) * 100)}% dos dias`,
      );
    }
  }

  // Bonus 2: soma mensal das HT bate com o totalizador do espelho.
  const checkMensal = checkSomaMensalHT(apuracoes, ocr);
  if (checkMensal && checkMensal.ok) {
    bonusTotal += 5;
    reasons.push(`+5: soma mensal das Horas Trabalhadas bate com o total do espelho`);
  }

  // Bonus 3: cobertura alta de linhas-com-data.
  if (totalDataLinhas > 5) {
    if (cobertura >= 0.90) {
      bonusTotal += 8;
      reasons.push(`+8: ${Math.round(cobertura * 100)}% das linhas com data viraram apuração`);
    } else if (cobertura >= 0.70) {
      bonusTotal += 4;
    }
  }

  // Bonus 4: janela detectada e zero datas fora.
  if (janelas.length >= 1 && fora.length === 0) {
    bonusTotal += 4;
  }

  // Bonus 5: eventos estruturados ricos (HE, banco de horas, RSR…).
  const totalEventos = apuracoes.reduce((a, b) => a + b.eventos.length, 0);
  const eventosRatio = totalEventos / apuracoes.length;
  if (eventosRatio >= 0.5) bonusTotal += 4;
  const tiposEventoDistintos = new Set(
    apuracoes.flatMap((a) => a.eventos.map((e) => e.tipo)),
  ).size;
  if (tiposEventoDistintos >= 3) {
    bonusTotal += 3;
    reasons.push(`+3: ${tiposEventoDistintos} tipos de evento distintos extraídos`);
  } else if (totalEventos === 0 && apuracoes.length > 5) {
    // Sem nenhum evento num espelho longo é sinal de layout não reconhecido.
    penalidadeTotal += 10;
    reasons.push(
      `−10: nenhum evento estruturado (HE/banco de horas/HT) extraído — layout pode ter mudado`,
    );
  }

  // Bonus 6: competências limpas (1 mês ou meses contíguos).
  if (parsed.competencias.size === 1) {
    bonusTotal += 3;
  } else if (parsed.competencias.size >= 2 && parsed.competencias.size <= 3) {
    bonusTotal += 1;
  }

  score = score + bonusTotal - penalidadeTotal;
  const final = clamp(score);

  // Bloqueador: marcação impossível (saída < entrada sem flag virada) ou
  // score muito baixo. Inconsistências graves não podem ser sobrescritas
  // por checkbox humano — operador precisa corrigir antes de baixar.
  let bloqueador = false;
  let bloqueador_motivo: string | null = null;
  const apuracaoComMarcacaoImpossivel = apuracoes.find((a) =>
    a.marcacoes.some((m) => marcacaoImpossivel(m)),
  );
  if (apuracaoComMarcacaoImpossivel) {
    bloqueador = true;
    const mImp = apuracaoComMarcacaoImpossivel.marcacoes.find((m) =>
      marcacaoImpossivel(m),
    );
    bloqueador_motivo = `Marcação impossível detectada em ${apuracaoComMarcacaoImpossivel.data} (entrada ${mImp?.e} → saída ${mImp?.s}). Provável totalizador HT/HE classificado como batida.`;
  } else if (final < 30) {
    bloqueador = true;
    bloqueador_motivo = `Score ${final} abaixo do mínimo aceitável (30).`;
  }

  return {
    score: final,
    level: nivel(final),
    reasons,
    bloqueador,
    bloqueador_motivo,
    janelas,
    datasForaJanela: fora,
  };
}

// ============================================================
// Férias
// ============================================================

export function scoreFerias(
  parsed: ParseFeriasResult,
  ocr: string,
): ConfidenceScore {
  const reasons: string[] = [];

  if (parsed.ferias.length === 0) {
    return {
      score: 15,
      level: "baixa",
      reasons: ["Nenhum período de férias detectado."],
      // Vazio em férias pode ser legítimo (CTPS sem férias gozadas).
      // Não bloqueia.
      bloqueador: false,
      bloqueador_motivo: null,
    };
  }

  let score = 60;
  let bonusTotal = 0;
  let penalidadeTotal = 0;

  // === SINAIS NEGATIVOS ===

  // (1) cobertura blocos RECIBO/TERMO/AVISO vs períodos parseados.
  const blocos = (ocr.match(/\b(?:recibo|termo|aviso)\s+de\s+f[ée]rias\b/gi) ?? [])
    .length;
  let coberturaBlocos = 1;
  if (blocos > 0) {
    coberturaBlocos = parsed.ferias.length / blocos;
    if (coberturaBlocos < 0.7) {
      const pen = Math.round((1 - coberturaBlocos) * 30);
      penalidadeTotal += pen;
      reasons.push(
        `−${pen}: ${blocos} bloco(s) de férias no OCR mas só ${parsed.ferias.length} parseado(s)`,
      );
    }
  }

  // (2) warnings — 1 warning é normal (informativo), só penaliza a partir de 2.
  if (parsed.warnings.length > 0) {
    const pen =
      parsed.warnings.length === 1
        ? 2
        : Math.min(10, parsed.warnings.length * 3);
    penalidadeTotal += pen;
    reasons.push(`−${pen}: ${parsed.warnings.length} warning(s) do parser`);
  }

  // (3) unparsed lines (proporcional).
  const unparsed = parsed.unparsed_lines.length;
  if (unparsed > 0) {
    const total = parsed.ferias.length + unparsed;
    const ratio = unparsed / total;
    let pen = 0;
    if (ratio >= 0.30) pen = 18;
    else if (ratio >= 0.15) pen = 10;
    else if (ratio >= 0.05) pen = 4;
    if (pen > 0) {
      penalidadeTotal += pen;
      reasons.push(`−${pen}: ${unparsed} linha(s) com data não casaram em nenhum bloco`);
    }
  }

  // (4) cross-validation: dias entre gozos batem com prazo?
  // Recibos com abono pecuniário (gozo + abono > prazo) são comuns e
  // legítimos. Penalizamos apenas divergências grandes (>15 dias), que
  // indicam erro real de extração de datas.
  let coerentes = 0;
  let levesDivergencias = 0;
  let incoerentes = 0;
  for (const f of parsed.ferias) {
    const check = checkFerias(f);
    if (check.ok) coerentes++;
    else if (Math.abs(check.diff) <= 15) levesDivergencias++;
    else incoerentes++;
  }
  if (incoerentes > 0) {
    const pen = Math.min(15, incoerentes * 6);
    penalidadeTotal += pen;
    reasons.push(
      `−${pen}: ${incoerentes} período(s) com soma dos gozos muito divergente do prazo (>15 dias)`,
    );
  }

  // === SINAIS POSITIVOS ===

  // Bonus 1: TODOS os períodos com cross-check perfeito (±1 dia).
  if (parsed.ferias.length >= 1 && incoerentes === 0 && levesDivergencias === 0) {
    bonusTotal += 12;
    reasons.push(
      `+12: dias dos gozos batem com o prazo em ${coerentes}/${parsed.ferias.length} período(s)`,
    );
  } else if (parsed.ferias.length >= 1 && incoerentes === 0) {
    bonusTotal += 6;
  }

  // Bonus 2: cobertura completa de blocos detectados.
  if (blocos > 0 && coberturaBlocos >= 1) {
    bonusTotal += 6;
    reasons.push(`+6: 100% dos blocos de férias detectados foram parseados`);
  }

  // Bonus 3: extração saudável — campos completos + ao menos um gozo válido.
  // Este é o sinal mais importante: o parser entendeu toda a estrutura
  // do recibo (relativa, prazo, situação, gozo). Vale +12 quando todos os
  // períodos passam.
  const REGEX_DATA_BR = /^\d{2}\/\d{2}\/\d{4}$/;
  const saudaveis = parsed.ferias.filter((f) => {
    const camposOk =
      /^\d{4}\/\d{4}$/.test(f.relativa) && f.prazo > 0 && !!f.situacao;
    const g = f.gozo1 ?? f.gozo2 ?? f.gozo3;
    const gozoOk = g && REGEX_DATA_BR.test(g.inicio) && REGEX_DATA_BR.test(g.fim);
    return camposOk && gozoOk;
  }).length;
  if (saudaveis === parsed.ferias.length && parsed.ferias.length > 0) {
    bonusTotal += 12;
    reasons.push(`+12: extração completa em ${saudaveis}/${parsed.ferias.length} períodos (relativa, prazo, situação, gozo)`);
  }

  score = score + bonusTotal - penalidadeTotal;
  const final = clamp(score);
  const bloqueador = final < 30 && parsed.ferias.length > 0;
  return {
    score: final,
    level: nivel(final),
    reasons,
    bloqueador,
    bloqueador_motivo: bloqueador
      ? `Score ${final} abaixo do mínimo aceitável (30) com ${parsed.ferias.length} período(s) de férias extraído(s).`
      : null,
  };
}

// ============================================================
// Faltas
// ============================================================

export function scoreFaltas(
  parsed: ParseFaltasResult,
  ocr: string,
): ConfidenceScore {
  const reasons: string[] = [];

  if (parsed.faltas.length === 0) {
    // Faltas é frequente vir vazio (empregado pontual). Score neutro,
    // não baixo — diferente de cartão-ponto/férias.
    return {
      score: 60,
      level: "media",
      reasons: ["Nenhuma falta detectada (pode ser legítimo)."],
      bloqueador: false,
      bloqueador_motivo: null,
    };
  }

  let score = 60;
  let bonusTotal = 0;
  let penalidadeTotal = 0;

  // === SINAIS NEGATIVOS ===

  // (1) Cobertura de menções de falta/atestado.
  const mencoes = (
    ocr.match(/\b(falt\w*|atestado|aus[êe]nc\w+|afastamento|licen[çc]a)\b/gi) ?? []
  ).length;
  let coberturaMencoes = 1;
  if (mencoes > 0) {
    coberturaMencoes = parsed.faltas.length / mencoes;
    if (coberturaMencoes < 0.4) {
      const pen = Math.round((1 - coberturaMencoes) * 25);
      penalidadeTotal += pen;
      reasons.push(
        `−${pen}: ${mencoes} menção(ões) de falta/atestado no OCR mas só ${parsed.faltas.length} parseada(s)`,
      );
    }
  }

  // (2) Warnings (proporcional).
  if (parsed.warnings.length > 0) {
    const ratio = parsed.warnings.length / parsed.faltas.length;
    const pen = Math.min(8, Math.round(ratio * 16) || parsed.warnings.length);
    penalidadeTotal += pen;
    reasons.push(`−${pen}: ${parsed.warnings.length} warning(s) do parser`);
  }

  // (3) Unparsed (proporcional).
  const unparsed = parsed.unparsed_lines.length;
  if (unparsed > 0) {
    const total = parsed.faltas.length + unparsed;
    const ratio = unparsed / total;
    let pen = 0;
    if (ratio >= 0.30) pen = 18;
    else if (ratio >= 0.15) pen = 10;
    else if (ratio >= 0.05) pen = 4;
    if (pen > 0) {
      penalidadeTotal += pen;
      reasons.push(`−${pen}: ${unparsed} linha(s) suspeita(s) não casaram`);
    }
  }

  // (4) Cross-validation: ordem cronológica + sem overlap.
  const checkOrdem = checkFaltas(parsed.faltas);
  if (!checkOrdem.ok) {
    const pen = Math.min(15, checkOrdem.problemas.length * 5);
    penalidadeTotal += pen;
    reasons.push(
      `−${pen}: ${checkOrdem.problemas.length} problema(s) de ordem/overlap em faltas`,
    );
  }

  // === SINAIS POSITIVOS ===

  // Bonus 1: cross-check passou — sem overlap, ordem ok.
  if (checkOrdem.ok) {
    bonusTotal += 8;
  }

  // Bonus 2: cobertura completa de menções.
  if (mencoes > 0 && coberturaMencoes >= 0.7) {
    bonusTotal += 5;
  }

  // Bonus 3: todas as faltas com data válida e não-vazia.
  const completas = parsed.faltas.filter(
    (f) => /^\d{4}-\d{2}-\d{2}$/.test(f.data_inicio) && /^\d{4}-\d{2}-\d{2}$/.test(f.data_fim),
  ).length;
  if (completas === parsed.faltas.length) {
    bonusTotal += 5;
    reasons.push(`+5: todas as faltas com datas válidas`);
  }

  score = score + bonusTotal - penalidadeTotal;
  const final = clamp(score);
  const bloqueador = final < 30 && parsed.faltas.length > 0;
  return {
    score: final,
    level: nivel(final),
    reasons,
    bloqueador,
    bloqueador_motivo: bloqueador
      ? `Score ${final} abaixo do mínimo aceitável (30) com ${parsed.faltas.length} falta(s) extraída(s).`
      : null,
  };
}

// ============================================================
// Holerite
// ============================================================

/**
 * FASE 1.4 — detecta condições BLOQUEADORAS de holerite (parser produziu
 * lixo, não dá pra mascarar com score baixo). Retorna razão explicativa ou
 * null. Quando bloqueador, score é forçado a ≤ 30 e dialogs desabilitam
 * download mesmo se humano marcou os 3 checkboxes.
 */
function detectarBloqueadorHolerite(
  parsed: HoleriteParseResult,
  ocr: string,
): string | null {
  if (parsed.rubricas.length === 0) {
    return "0 rubricas extraídas — parser falhou";
  }
  const check = checkHoleriteTotais(parsed.rubricas, ocr);
  if (
    check.totalBrutoOcr !== null &&
    check.totalBrutoOcr > 0 &&
    Math.abs(check.diffBruto) / check.totalBrutoOcr > 0.20
  ) {
    const pct = ((Math.abs(check.diffBruto) / check.totalBrutoOcr) * 100).toFixed(0);
    return `Soma das rubricas difere ${pct}% do Total Bruto declarado no OCR (R$ ${check.totalBrutoOcr.toFixed(2)})`;
  }
  if (
    check.liquidoOcr !== null &&
    check.liquidoOcr > 0 &&
    Math.abs(check.diffLiquido) / check.liquidoOcr > 0.20
  ) {
    const pct = ((Math.abs(check.diffLiquido) / check.liquidoOcr) * 100).toFixed(0);
    return `Líquido computado difere ${pct}% do Total Líquido declarado no OCR (R$ ${check.liquidoOcr.toFixed(2)})`;
  }
  return null;
}

export function scoreHolerite(
  parsed: HoleriteParseResult,
  ocr: string,
): ConfidenceScore {
  const reasons: string[] = [];

  if (parsed.rubricas.length === 0) {
    // FASE 1.4 — sem rubrica = parser falhou completamente. Bloqueador.
    return {
      score: 10,
      level: "baixa",
      reasons: ["Nenhuma rubrica extraída."],
      bloqueador: true,
    };
  }

  let score = 60;
  let bonusTotal = 0;
  let penalidadeTotal = 0;

  // === SINAIS NEGATIVOS ===

  // (1) Layout genérico/fallback — empregador não tem parser específico.
  if (parsed.layout_usado === "generico_v1" || parsed.layout_usado === "fallback") {
    penalidadeTotal += 12;
    reasons.push(
      `−12: layout '${parsed.layout_usado}' usado (parser específico para o empregador não encontrado)`,
    );
  }

  // (2) Poucas rubricas — holerite normalmente tem 5+.
  if (parsed.rubricas.length < 3) {
    penalidadeTotal += 18;
    reasons.push(
      `−18: apenas ${parsed.rubricas.length} rubrica(s) extraída(s) — holerite normalmente tem 5+`,
    );
  }

  // (3) Warnings (proporcional).
  if (parsed.warnings.length > 0) {
    const ratio = parsed.warnings.length / Math.max(parsed.rubricas.length, 1);
    const pen = Math.min(10, Math.round(ratio * 25) || parsed.warnings.length);
    penalidadeTotal += pen;
    reasons.push(`−${pen}: ${parsed.warnings.length} warning(s) do parser`);
  }

  // (4) Competência ausente ou inválida.
  if (!parsed.competencia || !/^\d{2}\/\d{4}$/.test(parsed.competencia)) {
    penalidadeTotal += 15;
    reasons.push(`−15: competência não detectada ou formato inválido`);
  }

  // (5) Cross-validation: soma rubricas vs totais declarados no OCR.
  const checkTot = checkHoleriteTotais(parsed.rubricas, ocr);
  if (!checkTot.ok) {
    let pen = 0;
    const detalhes: string[] = [];
    if (checkTot.totalBrutoOcr !== null && Math.abs(checkTot.diffBruto) > 0.5) {
      pen += 8;
      detalhes.push(
        `bruto Δ=${checkTot.diffBruto.toFixed(2)}`,
      );
    }
    if (
      checkTot.totalDescontosOcr !== null &&
      Math.abs(checkTot.diffDescontos) > 0.5
    ) {
      pen += 6;
      detalhes.push(`descontos Δ=${checkTot.diffDescontos.toFixed(2)}`);
    }
    if (checkTot.liquidoOcr !== null && Math.abs(checkTot.diffLiquido) > 0.5) {
      pen += 6;
      detalhes.push(`líquido Δ=${checkTot.diffLiquido.toFixed(2)}`);
    }
    if (pen > 0) {
      penalidadeTotal += Math.min(20, pen);
      reasons.push(
        `−${Math.min(20, pen)}: soma das rubricas não bate com totais do OCR (${detalhes.join(", ")})`,
      );
    }
  }

  // === SINAIS POSITIVOS ===

  // Bonus 1: cross-check rubricas × totais OK (sinal forte).
  const algumTotalDeclarado =
    checkTot.totalBrutoOcr !== null ||
    checkTot.totalDescontosOcr !== null ||
    checkTot.liquidoOcr !== null;
  if (algumTotalDeclarado && checkTot.ok) {
    bonusTotal += 12;
    reasons.push(
      `+12: soma das rubricas bate com os totais declarados no OCR (±R$ 0,50)`,
    );
  }

  // Bonus 2: layout específico do empregador reconhecido.
  if (
    parsed.layout_usado !== "generico_v1" &&
    parsed.layout_usado !== "fallback" &&
    parsed.layout_usado !== "llm_v1"
  ) {
    bonusTotal += 10;
    reasons.push(`+10: layout específico '${parsed.layout_usado}' reconhecido`);
  }

  // Bonus 3: número saudável de rubricas.
  if (parsed.rubricas.length >= 5) {
    bonusTotal += 5;
  } else if (parsed.rubricas.length >= 3) {
    bonusTotal += 3;
  }

  // Bonus 4: rubricas com nome + valor (vencimento OU desconto).
  const completas = parsed.rubricas.filter(
    (r) => r.nome && (r.valor_vencimento !== null || r.valor_desconto !== null),
  ).length;
  if (completas === parsed.rubricas.length && parsed.rubricas.length >= 3) {
    bonusTotal += 7;
    reasons.push(`+7: todas as ${parsed.rubricas.length} rubricas com nome + valor`);
  }

  score = score + bonusTotal - penalidadeTotal;

  // FASE 1.4 — bloqueador: força score ≤ 30 e flag.
  // detectarBloqueadorHolerite() cobre: 0 rubricas, |diff bruto/líquido|/total > 20%.
  // Banner é visual apenas (não trava download — operador decide).
  const bloqueio = detectarBloqueadorHolerite(parsed, ocr);
  if (bloqueio) {
    reasons.unshift(`BLOQUEADOR: ${bloqueio}`);
    const scoreFinal = Math.min(clamp(score), 30);
    return {
      score: scoreFinal,
      level: nivel(scoreFinal),
      reasons,
      bloqueador: true,
      bloqueador_motivo: bloqueio,
    };
  }

  return {
    score: clamp(score),
    level: nivel(clamp(score)),
    reasons,
    bloqueador: false,
    bloqueador_motivo: null,
  };
}
