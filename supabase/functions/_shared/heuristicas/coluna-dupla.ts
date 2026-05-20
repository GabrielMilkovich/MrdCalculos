/**
 * Detecta layout coluna-dupla "Real vs Previsto" em cartões de ponto.
 *
 * PRINCÍPIO: falso negativo > falso positivo.
 * Errar pra "não detectar coluna dupla quando existia" é recuperável
 * (usuário vê batidas demais, revisa).
 * Errar pra "detectar coluna dupla quando não existia" é catastrófico
 * (dropa batidas reais, jornada some pela metade).
 *
 * Por isso a detecção por contagem (estatística) só dispara com
 * 4 salvaguardas combinadas (ver detectarColunaDupla).
 *
 * Diagnóstico completo do bug em /tmp/auditoria-coluna-dupla.md.
 */

export type PadraoColunaDupla =
  | 'registrado-trabalho'
  | 'marcacoes-escala'
  | 'real-previsto'
  | 'apontamento-programado';

export interface DetectarColunaDuplaPorHeaderResult {
  detectado: boolean;
  padrao: PadraoColunaDupla | null;
}

export interface DetectarColunaDuplaPorContagemResult {
  detectado: boolean;
  fracao: number;
  linhasOitoHorarios: number;
  total: number;
}

export interface DetectarColunaDuplaResult {
  detectado: boolean;
  origem: 'header' | 'contagem-com-salvaguarda' | null;
}

const RE_HORA_LINHA = /\b\d{1,2}:\d{2}\b/g;
const RE_HORA_CAPTURA_HH = /\b(\d{1,2}):\d{2}\b/g;
const RE_INDICIO_TURNOS_MULTIPLOS = /\bturno|escala\s+\d|6x1|12x36|noturno\b/i;

/**
 * Detecta coluna dupla a partir do header textual do cartão.
 *
 * Ordem (primeiro que casar vence):
 *  1. registrado-trabalho — Via Varejo / Casa Bahia / SAP
 *  2. marcacoes-escala — Senior corporativo
 *  3. real-previsto — ADP corporativo
 *  4. apontamento-programado — Totvs
 */
export function detectarColunaDuplaPorHeader(
  texto: string,
): DetectarColunaDuplaPorHeaderResult {
  // 1. Horário Registrado + (Horário de Trabalho | Horário Previsto)
  if (
    /Hor[áa]rio\s+Registrado/i.test(texto) &&
    /Hor[áa]rio\s+(?:de\s+)?Trabalho|Hor[áa]rio\s+Previsto/i.test(texto)
  ) {
    return { detectado: true, padrao: 'registrado-trabalho' };
  }
  // 2. Marcações + Escala
  if (/Marca[çc][õo]es/i.test(texto) && /\bEscala\b/i.test(texto)) {
    return { detectado: true, padrao: 'marcacoes-escala' };
  }
  // 3. Real + Previsto (palavras inteiras — não substring)
  if (/\bReal\b/i.test(texto) && /\bPrevisto\b/i.test(texto)) {
    return { detectado: true, padrao: 'real-previsto' };
  }
  // 4. Apontamento + (Programado/a | Jornada Prevista)
  if (
    /Apontamento/i.test(texto) &&
    /Programad[oa]|Jornada\s+Prevista/i.test(texto)
  ) {
    return { detectado: true, padrao: 'apontamento-programado' };
  }
  return { detectado: false, padrao: null };
}

/**
 * Detecta coluna dupla estatisticamente: conta quantas linhas têm
 * EXATAMENTE 8 horários e compara com o total de linhas com data.
 *
 * Cartão padrão (1 coluna) tem ≤4 horas/linha. Coluna dupla traz
 * 8 horas (4 reais + 4 previstas). Outro número é exceção.
 */
export function detectarColunaDuplaPorContagem(
  linhasComData: string[],
  opts?: { limiarFracao?: number },
): DetectarColunaDuplaPorContagemResult {
  const limiar = opts?.limiarFracao ?? 0.5;
  const total = linhasComData.length;
  if (total === 0) {
    return { detectado: false, fracao: 0, linhasOitoHorarios: 0, total: 0 };
  }
  let linhasOitoHorarios = 0;
  for (const linha of linhasComData) {
    const matches = linha.match(RE_HORA_LINHA);
    const n = matches ? matches.length : 0;
    if (n === 8) linhasOitoHorarios++;
  }
  const fracao = linhasOitoHorarios / total;
  return {
    detectado: fracao >= limiar,
    fracao,
    linhasOitoHorarios,
    total,
  };
}

/**
 * Detecção combinada com 4 salvaguardas que protegem o caminho
 * estatístico contra falsos positivos (jornada noturna, turnos,
 * cartão semanal sem amostra suficiente).
 *
 * Ordem:
 *  1. Header textual → fonte mais confiável.
 *  2. Contagem APENAS se TODAS as 4 salvaguardas passarem:
 *     a) linhasComData.length >= 7 (amostra mínima)
 *     b) Sem indício textual de turnos múltiplos
 *     c) Sem indício estrutural de jornada noturna (<30% linhas suspeitas)
 *     d) Fração de linhas com 8 horários ≥ limiar
 */
export function detectarColunaDupla(
  texto: string,
  linhasComData: string[],
): DetectarColunaDuplaResult {
  // 1. Header
  const porHeader = detectarColunaDuplaPorHeader(texto);
  if (porHeader.detectado) {
    return { detectado: true, origem: 'header' };
  }

  // 2.a — amostra mínima
  if (linhasComData.length < 7) {
    return { detectado: false, origem: null };
  }

  // 2.b — indício textual de turnos múltiplos
  if (RE_INDICIO_TURNOS_MULTIPLOS.test(texto)) {
    return { detectado: false, origem: null };
  }

  // 2.c — indício estrutural de jornada noturna
  const total = linhasComData.length;
  let linhasSuspeitas = 0;
  for (const linha of linhasComData) {
    RE_HORA_CAPTURA_HH.lastIndex = 0;
    let m: RegExpExecArray | null;
    let temNoturno = false;
    while ((m = RE_HORA_CAPTURA_HH.exec(linha)) !== null) {
      const h = parseInt(m[1], 10);
      if (h >= 22 || h <= 6) {
        temNoturno = true;
        break;
      }
    }
    if (temNoturno) linhasSuspeitas++;
  }
  if (linhasSuspeitas / total >= 0.30) {
    return { detectado: false, origem: null };
  }

  // 2.d — contagem
  const porContagem = detectarColunaDuplaPorContagem(linhasComData);
  if (porContagem.detectado) {
    return { detectado: true, origem: 'contagem-com-salvaguarda' };
  }

  return { detectado: false, origem: null };
}
