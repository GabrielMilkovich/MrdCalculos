/**
 * Classificador de rubricas trabalhistas contra a ontologia do escritório.
 *
 * Ordem de tentativa de match (do mais conservador ao mais permissivo):
 *   1. Match exato após normalização (caps + acento + pontuação)
 *      sobre `texto_canonico` -> métodos "exato" ou "normalizado"
 *   2. Match exato após normalização sobre `sinonimos` -> "sinonimo"
 *   3. Fuzzy via Levenshtein normalizado, threshold 0.85 -> "fuzzy"
 *   4. Caso contrário -> "nao_encontrado" / NAO_CLASSIFICADO
 *
 * Threshold de 0.85 escolhido para permitir variações OCR pequenas
 * (1-2 caracteres em strings de 10-15 chars) sem deixar passar
 * confusões grosseiras entre rubricas distintas.
 *
 * Levenshtein implementado inline (sem dependência externa), uso de
 * `Uint16Array` para evitar alocações desnecessárias por chamada.
 */

import { ONTOLOGIA, type CategoriaRubrica, type RubricaCanonica } from './index.ts';

export interface ResultadoClassificacao {
  rubrica_canonica: RubricaCanonica | null;
  categoria: CategoriaRubrica;
  metodo_match: 'exato' | 'normalizado' | 'sinonimo' | 'fuzzy' | 'nao_encontrado';
  score_match: number;
  texto_original: string;
  texto_normalizado: string;
}

const FUZZY_THRESHOLD = 0.85;

/**
 * Normaliza texto para comparação:
 *   - .trim() + lowercase
 *   - remove acentos via NFD
 *   - pontuação vira espaço
 *   - colapsa espaços múltiplos em 1
 *
 * Idempotente: normalizar(normalizar(x)) === normalizar(x).
 */
export function normalizarRubrica(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    // Unifica ordinal masculino (\u00ba, U+00BA) e sinal de grau (\u00b0, U+00B0)
    // ANTES do strip de pontua\u00e7\u00e3o. Defesa contra "13\u00ba Sal" vs "13\u00b0 Sal".
    // (Em pr\u00e1tica o strip seguinte mapeia ambos pra espa\u00e7o; manter aqui
    // por defensividade caso o pipeline de normaliza\u00e7\u00e3o mude no futuro.)
    .replace(/[\u00ba\u00b0]/g, '\u00b0')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distância de Levenshtein clássica (substituição/inserção/remoção custam 1).
 * Implementação em duas linhas (current/previous) para uso O(min(a,b)) de memória.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Uint16Array(b.length + 1);
  let curr = new Uint16Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      const del = prev[j] + 1;
      const ins = curr[j - 1] + 1;
      const sub = prev[j - 1] + cost;
      curr[j] = del < ins ? (del < sub ? del : sub) : (ins < sub ? ins : sub);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[b.length];
}

/**
 * Score de similaridade normalizado em [0, 1].
 * 1.0 = idêntico; 0.0 = totalmente diferente.
 */
function scoreFuzzy(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

/**
 * Classifica uma única rubrica contra a ontologia.
 *
 * Comportamento:
 *   - Match exato byte-a-byte sobre `texto_canonico` -> método "exato"
 *   - Match exato após normalização (.trim, lower, sem acento) -> "normalizado"
 *   - Match exato após normalização contra sinônimos -> "sinonimo"
 *   - Fuzzy >= 0.85 -> "fuzzy" (retorna melhor match global)
 *   - Caso contrário -> NAO_CLASSIFICADO, "nao_encontrado"
 */
export function classificarRubrica(textoOriginal: string): ResultadoClassificacao {
  const textoNormalizado = normalizarRubrica(textoOriginal);

  if (textoNormalizado === '') {
    return {
      rubrica_canonica: null,
      categoria: 'NAO_CLASSIFICADO',
      metodo_match: 'nao_encontrado',
      score_match: 0,
      texto_original: textoOriginal,
      texto_normalizado: textoNormalizado,
    };
  }

  // 1. Match exato byte-a-byte sobre `texto_canonico`.
  for (const rubrica of ONTOLOGIA) {
    if (rubrica.texto_canonico === textoOriginal) {
      return {
        rubrica_canonica: rubrica,
        categoria: rubrica.categoria,
        metodo_match: 'exato',
        score_match: 1,
        texto_original: textoOriginal,
        texto_normalizado: textoNormalizado,
      };
    }
  }

  // 2. Match exato após normalização sobre `texto_canonico` ou sinônimos.
  for (const rubrica of ONTOLOGIA) {
    if (normalizarRubrica(rubrica.texto_canonico) === textoNormalizado) {
      return {
        rubrica_canonica: rubrica,
        categoria: rubrica.categoria,
        metodo_match: 'normalizado',
        score_match: 1,
        texto_original: textoOriginal,
        texto_normalizado: textoNormalizado,
      };
    }
    for (const sinonimo of rubrica.sinonimos) {
      if (normalizarRubrica(sinonimo) === textoNormalizado) {
        return {
          rubrica_canonica: rubrica,
          categoria: rubrica.categoria,
          metodo_match: 'sinonimo',
          score_match: 1,
          texto_original: textoOriginal,
          texto_normalizado: textoNormalizado,
        };
      }
    }
  }

  // 3. Fuzzy global: percorre tudo, fica com o melhor score acima do threshold.
  let melhorMatch: RubricaCanonica | null = null;
  let melhorScore = 0;
  for (const rubrica of ONTOLOGIA) {
    const scoreCanon = scoreFuzzy(normalizarRubrica(rubrica.texto_canonico), textoNormalizado);
    if (scoreCanon > melhorScore) {
      melhorScore = scoreCanon;
      melhorMatch = rubrica;
    }
    for (const sinonimo of rubrica.sinonimos) {
      const scoreSin = scoreFuzzy(normalizarRubrica(sinonimo), textoNormalizado);
      if (scoreSin > melhorScore) {
        melhorScore = scoreSin;
        melhorMatch = rubrica;
      }
    }
  }

  if (melhorMatch !== null && melhorScore >= FUZZY_THRESHOLD) {
    return {
      rubrica_canonica: melhorMatch,
      categoria: melhorMatch.categoria,
      metodo_match: 'fuzzy',
      score_match: melhorScore,
      texto_original: textoOriginal,
      texto_normalizado: textoNormalizado,
    };
  }

  // 4. Nada bateu.
  return {
    rubrica_canonica: null,
    categoria: 'NAO_CLASSIFICADO',
    metodo_match: 'nao_encontrado',
    score_match: 0,
    texto_original: textoOriginal,
    texto_normalizado: textoNormalizado,
  };
}
