/**
 * Detecta e corta a parte de totalizadores/eventos de uma linha de cartão
 * de ponto, isolando a `parteBatidas` (batidas reais E/S) da
 * `parteTotalizadores` (BCre, BDeb, HExt, AdNot, Abono, Desc, etc).
 *
 * PRINCÍPIO: falso negativo > falso positivo.
 * Errar "não detectar totalizador quando existia" é recuperável
 * (usuário vê batidas demais, revisa).
 * Errar "detectar totalizador quando não existia" é catastrófico
 * (dropa batidas reais, jornada some pela metade).
 *
 * Estratégia em cascata (2→1→3, com side-exit no primeiro match):
 *   2. label-depois-backtrack: valor SEGUIDO de palavra-âncora — split
 *      no valor inclusive. Cobre layouts ADP/Senior onde
 *      "7:25 BCre 1:28 BDeb" embaralha entrada e totalizador.
 *      Prioridade ALTA: quando o padrão "valor LABEL" existe, preserva
 *      a defesa cortando antes do valor (caso contrário, 1 cortaria
 *      apenas no label deixando o valor como batida fantasma).
 *   1. label-antes: palavra-âncora aparece ANTES do valor — split direto.
 *      Cobre layouts Casa Bahia/Senior padrão e variantes corporativas.
 *      Roda quando 2 falhou.
 *   3. posicao: sem palavra-âncora — heurística posicional defensiva.
 *      Roda apenas se 1 e 2 falharam. Cronologia rigorosa é a
 *      salvaguarda principal contra falso positivo em turnos noturnos
 *      legítimos (vigilante 12x36).
 *
 * Diagnóstico completo do bug em /tmp/auditoria-debito-bh.md.
 */

export interface CortarTotalizadoresResult {
  parteBatidas: string;
  parteTotalizadores: string;
  origem: 'label-antes' | 'label-depois-backtrack' | 'posicao' | null;
  confianca: 'alta' | 'media' | 'baixa';
}

// =====================================================
// Whitelist de tokens — 3 famílias
// =====================================================

// Família camelCase corporativa (totalizadores compostos)
const RE_TOTALIZADOR_FAMILIA_CAMELCASE: RegExp[] = [
  /\bH(?:Ext|CIe|Emb|Norm|Trab)\b/i, // HExt, HCIe, HEmb, HNorm, HTrab
  /\bAd(?:Not|Diu|Trab)\b/i, // AdNot, AdDiu, AdTrab
  /\bB(?:Cre|Deb|Co)\b/i, // BCre, BDeb, BCo
];

// Tokens com abreviação/ponto (whitelist textual ampla)
const RE_TOTALIZADOR_ABREVIADO: RegExp[] = [
  /\bH\.?\s*Extras?\b/i, // "H. Extras", "H Extras", "HExtras"
  /\bHr\.?\s*Trab(?:alhadas?)?\b/i, // "Hr Trab", "Hr. Trabalhadas"
];

// Tokens com tempo obrigatório (evitar falso positivo em headers)
const RE_TOTALIZADOR_COM_TEMPO: RegExp[] = [
  /\bTot(?:al)?\.?\s+\d{1,3}:\d{2}\b/i, // "Tot 7:25", "Total 7:25"
  /\bDesc\.?\s+\d{1,3}:\d{2}\b/i, // "Desc 7:25" — abreviado seguido de tempo
];

// Literais estritos (palavras completas conhecidas)
const RE_TOTALIZADOR_LITERAL: RegExp[] = [
  /\bDescanso\b/i, // DSR (palavra completa)
  /\bDesconto\b/i, // Desconto (palavra completa)
  /\bSaldo\s+(?:Banco|BCO|Negativo|Positivo)\b/i,
  /\bCr[ée]dito\b/i,
  /\bD[ée]bito\b/i,
  /\bSa[íi]da\s+do\s+Sistema\b/i,
  /\bAbono\b/i,
  /\bFOLGA\s+DIAS\s+TRABALHADOS?\b/i,
  /\bArmazena\s+BCO\b/i,
];

// União de todas as estratégias 1 (label-antes)
const RE_TOTALIZADORES_LABEL_ANTES: RegExp[] = [
  ...RE_TOTALIZADOR_FAMILIA_CAMELCASE,
  ...RE_TOTALIZADOR_ABREVIADO,
  ...RE_TOTALIZADOR_COM_TEMPO,
  ...RE_TOTALIZADOR_LITERAL,
];

// =====================================================
// Estratégia 1: label-antes
// =====================================================

function tentarLabelAntes(
  linha: string,
): { idx: number; pattern: RegExp } | null {
  let menorIdx = -1;
  let patternMatch: RegExp | null = null;
  for (const re of RE_TOTALIZADORES_LABEL_ANTES) {
    re.lastIndex = 0;
    const m = re.exec(linha);
    if (m && m.index !== undefined && (menorIdx === -1 || m.index < menorIdx)) {
      menorIdx = m.index;
      patternMatch = re;
    }
  }
  return menorIdx === -1 ? null : { idx: menorIdx, pattern: patternMatch! };
}

// =====================================================
// Estratégia 2: label-depois-backtrack
// =====================================================

// Regex específica para Estratégia 2 — não reutilizar RE_TOTALIZADORES_LABEL_ANTES.
//
// DISCRIMINADOR CRÍTICO: o valor antes do label PRECISA ser 1-dígito (`H:MM`).
// Valores `HH:MM` (2 dígitos) são batidas reais — não totalizadores —
// e cortá-los antes do label seria falso positivo catastrófico
// (ex: "17:25 BCre 7:25" — 17:25 é batida, 7:25 é totalizador).
// Um `H:MM` natural (`7:25`) só ocorre em saldos/durações, nunca em
// relógio de batida real (que sempre tem `HH:MM` zero-paddado).
const RE_LABEL_DEPOIS: RegExp[] = [
  /\b(\d{1}:\d{2})\s+(?:H(?:Ext|CIe|Emb|Norm|Trab)|Ad(?:Not|Diu|Trab)|B(?:Cre|Deb|Co))\b/gi,
  /\b(\d{1}:\d{2})\s+(?:Descanso|Desconto|Cr[ée]dito|D[ée]bito|Abono|Saldo\s+(?:Banco|BCO|Negativo|Positivo))\b/gi,
];

function tentarLabelDepois(linha: string): { idx: number } | null {
  let menorIdx = -1;
  for (const re of RE_LABEL_DEPOIS) {
    re.lastIndex = 0;
    const m = re.exec(linha);
    if (m && m.index !== undefined && (menorIdx === -1 || m.index < menorIdx)) {
      menorIdx = m.index;
    }
  }
  return menorIdx === -1 ? null : { idx: menorIdx };
}

// =====================================================
// Estratégia 3: posicao (heurística posicional defensiva)
// =====================================================

const RE_HORA_EM_LINHA = /\b(\d{1,2}):(\d{2})\b/g;

interface HoraExtraida {
  hora: number;
  minuto: number;
  idxStr: number; // índice no texto original
  matchLen: number; // comprimento do match (pra reconstruir corte)
  umDigito: boolean; // true se "H:MM" (não "HH:MM")
  raw: string; // string original do match
}

function extrairHorariosComPosicao(linha: string): HoraExtraida[] {
  const out: HoraExtraida[] = [];
  RE_HORA_EM_LINHA.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_HORA_EM_LINHA.exec(linha)) !== null) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) continue;
    out.push({
      hora: h,
      minuto: min,
      idxStr: m.index,
      matchLen: m[0].length,
      umDigito: m[1].length === 1,
      raw: m[0],
    });
  }
  return out;
}

function tentarPosicao(linha: string): { idx: number } | null {
  const horarios = extrairHorariosComPosicao(linha);
  if (horarios.length < 5) return null;

  // 1ª salvaguarda: primeiros 4 horários cronologicamente válidos
  // (E1 < S1 < E2 < S2 em minutos)
  const min4 = horarios.slice(0, 4).map((h) => h.hora * 60 + h.minuto);
  const cronologiaValida4 =
    min4[0] < min4[1] && min4[1] < min4[2] && min4[2] < min4[3];
  if (!cronologiaValida4) return null;

  // 2ª salvaguarda: a partir do 5º, precisa de SINAL de totalizador
  // (qualquer um dos 3 sinais basta)
  const min5 = horarios[4].hora * 60 + horarios[4].minuto;
  const min4ultimo = min4[3];

  const sinalUmDigito = horarios.slice(4).some((h) => h.umDigito);
  const sinalZeroExato = horarios
    .slice(4)
    .some((h) => h.hora === 0 && h.minuto === 0);
  const sinalCronologiaQuebra = min5 < min4ultimo;

  if (!sinalUmDigito && !sinalZeroExato && !sinalCronologiaQuebra) {
    // Os primeiros 4 cronológicos + horário 5+ continua cronológico +
    // sem sinal de totalizador → provavelmente jornada noturna legítima
    // (vigilante 12x36, motorista 6x1).
    return null;
  }

  // Corta a partir do 5º horário (inclusive)
  return { idx: horarios[4].idxStr };
}

// =====================================================
// Função pública combinada
// =====================================================

export function cortarTotalizadores(
  linha: string,
): CortarTotalizadoresResult {
  // ORDEM DE PRIORIDADE: estratégia 2 (label-depois-backtrack) é tentada
  // antes da 1 (label-antes) porque preserva a defesa quando ambas
  // poderiam disparar. Em "17:25 7:25 BCre", a estratégia 1 cortaria em
  // "BCre" deixando "7:25" como batida fantasma; a estratégia 2 corta
  // em "7:25", descartando o valor inclusive (comportamento desejado:
  // falso negativo > falso positivo).
  //
  // A estratégia 1 (label-antes) só dispara quando NÃO há padrão
  // "valor SEGUIDO de label" — i.e., quando o label está isolado de
  // qualquer valor numérico anterior (formato Casa Bahia/Senior padrão).
  //
  // Estratégia 3 (posicional) é o último recurso quando não há label
  // textual algum (caso do áudio do advogado).

  // Estratégia 2
  const tentativa2 = tentarLabelDepois(linha);
  if (tentativa2 !== null) {
    return {
      parteBatidas: linha.slice(0, tentativa2.idx),
      parteTotalizadores: linha.slice(tentativa2.idx),
      origem: 'label-depois-backtrack',
      confianca: 'media',
    };
  }
  // Estratégia 1 — só se 2 falhou
  const tentativa1 = tentarLabelAntes(linha);
  if (tentativa1 !== null) {
    return {
      parteBatidas: linha.slice(0, tentativa1.idx),
      parteTotalizadores: linha.slice(tentativa1.idx),
      origem: 'label-antes',
      confianca: 'alta',
    };
  }
  // Estratégia 3 — só se 1 e 2 falharam
  const tentativa3 = tentarPosicao(linha);
  if (tentativa3 !== null) {
    return {
      parteBatidas: linha.slice(0, tentativa3.idx),
      parteTotalizadores: linha.slice(tentativa3.idx),
      origem: 'posicao',
      confianca: 'baixa',
    };
  }
  // Nenhuma disparou
  return {
    parteBatidas: linha,
    parteTotalizadores: '',
    origem: null,
    confianca: 'alta',
  };
}
