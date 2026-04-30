// Heurísticas (regex) para pré-classificar rubricas.
// IMPORTANTE: a ordem das listas e a ordem de avaliação em getDefaultHint
// são CRÍTICAS para resolução de ambiguidades. Ler comentários antes de
// reordenar.
//
// Estratégia: normaliza o input (lowercase, sem acento) ANTES de testar os
// regexes. Isso permite usar patterns ASCII simples — `comissao` cobre
// `Comissões` automaticamente, e `\w*` em "contribuicao" funciona.

import { normalizeNomeRubrica } from './normalize';
import type { CategoriaSlug, HintResult } from '../types';

const HINTS_DSR: Array<{ pattern: RegExp; motivo: string }> = [
  // DSR sobre comissões — variante mais comum
  {
    pattern: /\bdsr\s*\(?\s*comissoes?\s*\)?/i,
    motivo: 'DSR sobre comissões — categoria DSR.',
  },
  // Integração de prêmio no DSR
  {
    pattern: /\bint\.?\s*premio\s+no\s+dsr\b/i,
    motivo: 'Integração de prêmio no DSR — categoria DSR.',
  },
  // DSR genérico, MAS NÃO se for sobre H.Extra (esse vai pra ignorar).
  // Lookahead sem `\b` no final pra cobrir "h.extra", "h.extras", etc.
  {
    pattern: /\bdsr\b(?!.*\b(?:h\.?\s*ext|horas?\s*ext|hora\s*ext|hr\s*ext))/i,
    motivo: 'DSR — categoria DSR.',
  },
];

const HINTS_IGNORAR: Array<{ pattern: RegExp; motivo: string }> = [
  // Horas extras (incluindo combinações com COMISS, DSR etc — precisa vir
  // antes de COMISSAO/PREMIACAO. Aceita "HORA EXT", "HORAS EXTRA", "H.EXTRA",
  // "HR EXT" etc.)
  {
    pattern: /\b(horas?\s*ext\w*|h\.?\s*ext\w*|hr\s*ext\w*)\b/i,
    motivo:
      'Horas extras não entram no histórico salarial — usadas como dedução em fase posterior do cálculo.',
  },
  // Descontos previdenciários e fiscais
  {
    pattern: /\b(inss|irrf|irpf|imposto\s+de\s+renda)\b/i,
    motivo: 'Desconto previdenciário/fiscal — não entra no histórico salarial.',
  },
  // Vale transporte
  {
    pattern: /\b(vale\s*transporte|vt)\b/i,
    motivo:
      'Vale transporte — natureza indenizatória, não entra no histórico salarial.',
  },
  // Vale alimentação / refeição / cesta básica
  {
    pattern:
      /\b(vale\s*alimentacao|va|vale\s*refeicao|vr|cesta\s*basica)\b/i,
    motivo:
      'Auxílio alimentação — natureza indenizatória, não entra no histórico salarial.',
  },
  // Adiantamentos e empréstimos (incluindo "prestação de carnê")
  {
    pattern: /\b(adiant\w*|emprestimo|prestacao\s+(de\s+)?carne)\b/i,
    motivo: 'Adiantamento/empréstimo/prestação — não é remuneração.',
  },
  // Planos de saúde e seguros
  {
    pattern:
      /\b(intermedica|unimed|amil|hapvida|bradesco\s*saude|seguro\s*saude|plano\s*de\s*saude|segvida|multich)\b/i,
    motivo:
      'Plano de saúde/seguro — desconto, não entra no histórico salarial.',
  },
  // Contribuições associativas/sindicais
  {
    pattern:
      /\b(contrib\w*\s*(sindical|confederativa|associativa)|mensalidade\s*sindical)\b/i,
    motivo: 'Contribuição associativa — desconto, não entra.',
  },
  // Despesas médicas/hospitalares avulsas
  {
    pattern: /\bdesp\w*\s*(med|hosp)|\bdesp\.?med\b/i,
    motivo: 'Despesa médica/hospitalar — desconto, não entra.',
  },
];

const HINTS_COMISSAO: Array<{ pattern: RegExp; motivo: string }> = [
  {
    pattern: /\bcomissoes?\b/i,
    motivo: 'Comissão — categoria Comissões.',
  },
  {
    pattern: /\bcom\.?\s*(garantia|seguros?|vendas?)\b/i,
    motivo: 'Variação de comissão — categoria Comissões.',
  },
  {
    pattern: /\bcompl\.?\s*vendedor\b/i,
    motivo: 'Complemento de vendedor — geralmente categoria Comissões.',
  },
];

const HINTS_PREMIACAO: Array<{ pattern: RegExp; motivo: string }> = [
  // Prêmio (mas NÃO "int prêmio no DSR" — esse já matchou em DSR antes)
  {
    pattern: /\bpremio\b/i,
    motivo: 'Prêmio — categoria Premiações.',
  },
  {
    pattern: /\bcampanha\b/i,
    motivo: 'Campanha — geralmente categoria Premiações.',
  },
  {
    pattern: /\bbonificacao\b/i,
    motivo: 'Bonificação — geralmente categoria Premiações.',
  },
];

/**
 * Sugere classificação automática para uma rubrica.
 *
 * ORDEM DE AVALIAÇÃO (não mudar sem entender):
 *   1. DSR primeiro: resolve "DSR(Comissão)" e "int prêmio no DSR".
 *   2. IGNORAR antes de COMISSAO/PREMIACAO: "HORAS EXT-COMISS" tem "COMISS"
 *      mas é HE — HE é critério dominante.
 *   3. COMISSAO antes de PREMIACAO: ordem arbitrária aqui.
 *
 * Retorna `null` para rubricas sem heurística óbvia. O usuário decide e o
 * memo aprende. Hints podem errar em ~1-5% — UI deixa claro que é hint via
 * ícone ⓘ + tooltip com o `motivo`.
 */
export function getDefaultHint(nome: string): HintResult {
  const norm = normalizeNomeRubrica(nome);

  for (const h of HINTS_DSR) {
    if (h.pattern.test(norm)) {
      return { tipo: 'sugerir_categoria', slug: 'dsr', motivo: h.motivo };
    }
  }
  for (const h of HINTS_IGNORAR) {
    if (h.pattern.test(norm)) {
      return { tipo: 'sugerir_ignorar', motivo: h.motivo };
    }
  }
  for (const h of HINTS_COMISSAO) {
    if (h.pattern.test(norm)) {
      return { tipo: 'sugerir_categoria', slug: 'comissao', motivo: h.motivo };
    }
  }
  for (const h of HINTS_PREMIACAO) {
    if (h.pattern.test(norm)) {
      return { tipo: 'sugerir_categoria', slug: 'premiacao', motivo: h.motivo };
    }
  }
  return null;
}

// Re-exporta o tipo para conveniência de imports.
export type { HintResult, CategoriaSlug };
