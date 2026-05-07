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
  // Bases de cálculo (defesa-em-profundidade — parser genérico já filtra,
  // mas se OCR vazar "Base IR / Base INSS / Base FGTS" pra UI, classifier
  // ignora. Bases NÃO são remuneração; somá-las duplica o cálculo.
  {
    pattern: /^base\s+(de\s+)?(calculo\s+)?(ir|irrf|inss|fgts(\s+rescis\w*)?)\b/i,
    motivo: 'Base de cálculo (IR/INSS/FGTS) — totalizador, não é rubrica.',
  },
  // Totalizadores (Total Bruto, Salário Líquido, Líquido a Receber). Se
  // vazarem do OCR como rubrica, defesa explícita aqui.
  {
    pattern:
      /^(total\s+(bruto|venc\w*|proventos|descont\w*|liquido|geral)|valor\s+liquido|liquido\s+a\s+receber|salario\s+liquido|salario\s+bruto)\b/i,
    motivo: 'Totalizador — não é rubrica individual.',
  },
  // Horas extras (incluindo combinações com COMISS, DSR etc — precisa vir
  // antes de COMISSAO/PREMIACAO. Aceita "HORA EXT", "HORAS EXTRA", "H.EXTRA",
  // "HR EXT" etc.)
  {
    pattern: /\b(horas?\s*ext\w*|h\.?\s*ext\w*|hr\s*ext\w*)\b/i,
    motivo:
      'Horas extras não entram no histórico salarial — usadas como dedução em fase posterior do cálculo.',
  },
  // Descontos previdenciários e fiscais.
  // Inclui "IR Retido na Fonte" / "IR Retido" — variante comum em alguns
  // holerites (ADP, RH-Cloud) que não usa "IRRF".
  {
    pattern:
      /\b(inss|irrf|irpf|ir\s+retido|imposto\s+de\s+renda|contrib\w*\s+previd\w*)\b/i,
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
  // 13º salário (todas as variantes — adiantado, complemento, integral).
  // PJe-Calc tem campo dedicado fora do Histórico Salarial.
  {
    pattern: /\b(13\s*[ºo°]?\s*sal\w*|13\s*sal\w+|decimo\s+terceiro|gratifica\w*\s*natalina|13\s*proporcional)\b/i,
    motivo: '13º salário — campo separado no PJe-Calc, não entra no Histórico Salarial.',
  },
  // Aviso prévio (indenizado ou trabalhado) — verba rescisória
  {
    pattern: /\baviso\s*previo\b/i,
    motivo: 'Aviso prévio — verba rescisória, não entra no Histórico Salarial.',
  },
  // Multas e indenizações de FGTS
  {
    pattern: /\b(multa\s*(?:de\s*)?(?:40|fgts)|fgts\s*multa|multa\s*rescis\w*)\b/i,
    motivo: 'Multa rescisória/FGTS — não entra no Histórico Salarial.',
  },
  // Depósito de FGTS (linha informativa do holerite, não é remuneração)
  {
    pattern: /\b(deposito\s*fgts|fgts\s*(?:deposito|do\s*mes|mensal)?|fgts)\b/i,
    motivo: 'FGTS é depósito do empregador — informativo, não entra como remuneração.',
  },
  // Férias proporcionais / indenizadas (rescisão)
  {
    pattern: /\bferias?\s*(proporcionais?|indenizad\w*|rescis\w*|vencidas?\s+e\s+indeniz\w*)\b/i,
    motivo: 'Férias proporcionais/indenizadas — verba rescisória, fora do Histórico Salarial.',
  },
  // PIS/PASEP — não é remuneração mensal
  {
    pattern: /\b(pis(?:\/?\s*pasep)?|pasep)\b/i,
    motivo: 'PIS/PASEP — não entra no Histórico Salarial.',
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

const HINTS_MINIMO_GARANTIDO: Array<{ pattern: RegExp; motivo: string }> = [
  {
    pattern: /\bm[íi]nimo\s+garantido\b/i,
    motivo: 'Mínimo garantido — categoria Mínimo Garantido.',
  },
  {
    pattern: /\bgarantia\s+min(?:ima)?\b/i,
    motivo: 'Garantia mínima — categoria Mínimo Garantido.',
  },
];

const HINTS_SALARIO_FAMILIA: Array<{ pattern: RegExp; motivo: string }> = [
  {
    // Aceita "salario familia", "salario-familia", "sal familia", "sal.familia"
    pattern: /\bsal(?:[áa]rio)?[\s-.]*fam[íi]lia\b/i,
    motivo: 'Salário-família — natureza indenizatória.',
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
  // Salário-família e mínimo garantido antes de COMISSAO/PREMIACAO porque
  // "garantia" pode aparecer em ambos contextos; o nome explícito vence.
  for (const h of HINTS_SALARIO_FAMILIA) {
    if (h.pattern.test(norm)) {
      return {
        tipo: 'sugerir_categoria',
        slug: 'salario_familia',
        motivo: h.motivo,
      };
    }
  }
  for (const h of HINTS_MINIMO_GARANTIDO) {
    if (h.pattern.test(norm)) {
      return {
        tipo: 'sugerir_categoria',
        slug: 'minimo_garantido',
        motivo: h.motivo,
      };
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
