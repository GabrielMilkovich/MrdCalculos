/**
 * =====================================================
 * OFFSET ENGINE — MOTOR DE ABATIMENTOS POR IDENTIDADE DE TÍTULO
 * =====================================================
 * 
 * Implementa abatimento controlado verba-devida × verba-paga,
 * com rastreio de correspondência e origem do abatimento.
 * 
 * Regras:
 * - Abatimento a idêntico título (padrão)
 * - Abatimento por competência
 * - Abatimento global (quando juridicamente permitido)
 * - Nunca subtrai tudo sem correspondência
 */

import Decimal from 'decimal.js';

// =====================================================
// TYPES
// =====================================================

export type OffsetMode = 'identico_titulo' | 'competencia' | 'global';

export interface PaidItem {
  /** Unique identifier of the paid item */
  id: string;
  /** Rubric name or code from payslip/TRCT */
  rubrica: string;
  /** Canonical rubric code (mapped) */
  rubrica_canonica?: string;
  /** Competência (YYYY-MM) */
  competencia: string;
  /** Amount paid */
  valor: number;
  /** Source document */
  fonte: 'contracheque' | 'trct' | 'ficha_financeira' | 'pjc' | 'manual';
  /** Nature classification */
  natureza?: 'salarial' | 'indenizatoria' | 'mista';
  /** Already consumed by a previous offset? */
  consumed: boolean;
  /** How much of this item has been consumed */
  consumed_amount: number;
}

export interface DueItem {
  /** Verba ID from engine result */
  verba_id: string;
  /** Verba name */
  nome: string;
  /** Canonical rubric code */
  rubrica_canonica?: string;
  /** Competência (YYYY-MM) */
  competencia: string;
  /** Gross amount due */
  valor_devido: number;
  /** Nature classification */
  natureza?: 'salarial' | 'indenizatoria' | 'mista';
}

export interface OffsetResult {
  /** Due item this offset applies to */
  due_item_id: string;
  due_item_nome: string;
  competencia: string;
  /** Original due amount */
  valor_devido: number;
  /** Total offset applied */
  valor_abatido: number;
  /** Net amount after offset */
  valor_liquido: number;
  /** Which paid items were matched */
  matched_payments: OffsetMatch[];
  /** Offset mode used */
  mode: OffsetMode;
}

export interface OffsetMatch {
  paid_item_id: string;
  rubrica: string;
  competencia: string;
  valor_usado: number;
  fonte: string;
  /** How the match was determined */
  match_reason: 'rubrica_exata' | 'rubrica_canonica' | 'competencia' | 'global';
  /** Confidence of the match */
  confidence: number;
}

export interface OffsetSummary {
  total_devido: number;
  total_abatido: number;
  total_liquido: number;
  items: OffsetResult[];
  unmatched_payments: PaidItem[];
  unmatched_dues: DueItem[];
  warnings: string[];
}

// =====================================================
// OFFSET ENGINE
// =====================================================

export class OffsetEngine {
  private paidItems: PaidItem[];
  private mode: OffsetMode;
  private warnings: string[] = [];

  constructor(paidItems: PaidItem[], mode: OffsetMode = 'identico_titulo') {
    this.paidItems = paidItems.map(p => ({ ...p, consumed: false, consumed_amount: 0 }));
    this.mode = mode;
  }

  /**
   * Apply offsets to a list of due items.
   * Returns detailed offset results with full traceability.
   */
  apply(dueItems: DueItem[]): OffsetSummary {
    const results: OffsetResult[] = [];

    for (const due of dueItems) {
      const result = this.offsetSingleItem(due);
      results.push(result);
    }

    const totalDevido = results.reduce((s, r) => s + r.valor_devido, 0);
    const totalAbatido = results.reduce((s, r) => s + r.valor_abatido, 0);

    return {
      total_devido: totalDevido,
      total_abatido: totalAbatido,
      total_liquido: totalDevido - totalAbatido,
      items: results,
      unmatched_payments: this.paidItems.filter(p => !p.consumed && p.consumed_amount === 0),
      unmatched_dues: dueItems.filter(d => {
        const result = results.find(r => r.due_item_id === d.verba_id && r.competencia === d.competencia);
        return result && result.valor_abatido === 0;
      }),
      warnings: this.warnings,
    };
  }

  private offsetSingleItem(due: DueItem): OffsetResult {
    const matches: OffsetMatch[] = [];
    let remaining = new Decimal(due.valor_devido);

    if (remaining.lte(0)) {
      return {
        due_item_id: due.verba_id,
        due_item_nome: due.nome,
        competencia: due.competencia,
        valor_devido: due.valor_devido,
        valor_abatido: 0,
        valor_liquido: due.valor_devido,
        matched_payments: [],
        mode: this.mode,
      };
    }

    // Phase 1: Exact rubric match (idêntico título) in same competência
    if (this.mode === 'identico_titulo' || this.mode === 'competencia') {
      for (const paid of this.paidItems) {
        if (remaining.lte(0)) break;
        if (paid.consumed) continue;
        
        const rubricMatch = this.matchRubric(due, paid);
        if (!rubricMatch) continue;
        if (paid.competencia !== due.competencia) continue;

        const available = new Decimal(paid.valor - paid.consumed_amount);
        if (available.lte(0)) continue;

        const used = Decimal.min(remaining, available);
        remaining = remaining.minus(used);
        paid.consumed_amount += used.toNumber();
        if (new Decimal(paid.consumed_amount).gte(paid.valor)) paid.consumed = true;

        matches.push({
          paid_item_id: paid.id,
          rubrica: paid.rubrica,
          competencia: paid.competencia,
          valor_usado: used.toNumber(),
          fonte: paid.fonte,
          match_reason: rubricMatch,
          confidence: rubricMatch === 'rubrica_exata' ? 1.0 : 0.85,
        });
      }
    }

    // Phase 2: Same rubric, different competência (only for identico_titulo mode)
    if (this.mode === 'identico_titulo' && remaining.gt(0)) {
      for (const paid of this.paidItems) {
        if (remaining.lte(0)) break;
        if (paid.consumed) continue;
        
        const rubricMatch = this.matchRubric(due, paid);
        if (!rubricMatch) continue;
        // Different competência but same rubric
        if (paid.competencia === due.competencia) continue;

        const available = new Decimal(paid.valor - paid.consumed_amount);
        if (available.lte(0)) continue;

        const used = Decimal.min(remaining, available);
        remaining = remaining.minus(used);
        paid.consumed_amount += used.toNumber();
        if (new Decimal(paid.consumed_amount).gte(paid.valor)) paid.consumed = true;

        matches.push({
          paid_item_id: paid.id,
          rubrica: paid.rubrica,
          competencia: paid.competencia,
          valor_usado: used.toNumber(),
          fonte: paid.fonte,
          match_reason: rubricMatch,
          confidence: 0.7,
        });

        this.warnings.push(`Abatimento cross-competência: ${paid.rubrica} (${paid.competencia}) usado para ${due.nome} (${due.competencia})`);
      }
    }

    // Phase 3: Global mode — match any unmatched payment to any remaining due
    if (this.mode === 'global' && remaining.gt(0)) {
      for (const paid of this.paidItems) {
        if (remaining.lte(0)) break;
        if (paid.consumed) continue;

        const available = new Decimal(paid.valor - paid.consumed_amount);
        if (available.lte(0)) continue;

        const used = Decimal.min(remaining, available);
        remaining = remaining.minus(used);
        paid.consumed_amount += used.toNumber();
        if (new Decimal(paid.consumed_amount).gte(paid.valor)) paid.consumed = true;

        matches.push({
          paid_item_id: paid.id,
          rubrica: paid.rubrica,
          competencia: paid.competencia,
          valor_usado: used.toNumber(),
          fonte: paid.fonte,
          match_reason: 'global',
          confidence: 0.5,
        });
      }
    }

    const totalAbatido = matches.reduce((s, m) => s + m.valor_usado, 0);
    return {
      due_item_id: due.verba_id,
      due_item_nome: due.nome,
      competencia: due.competencia,
      valor_devido: due.valor_devido,
      valor_abatido: totalAbatido,
      valor_liquido: new Decimal(due.valor_devido).minus(totalAbatido).toNumber(),
      matched_payments: matches,
      mode: this.mode,
    };
  }

  private matchRubric(due: DueItem, paid: PaidItem): 'rubrica_exata' | 'rubrica_canonica' | null {
    // Exact name match
    const dueNorm = due.nome.toLowerCase().trim();
    const paidNorm = paid.rubrica.toLowerCase().trim();
    if (dueNorm === paidNorm) return 'rubrica_exata';

    // Canonical code match
    if (due.rubrica_canonica && paid.rubrica_canonica && due.rubrica_canonica === paid.rubrica_canonica) {
      return 'rubrica_canonica';
    }

    // Fuzzy matching for common aliases
    const aliases: Record<string, string[]> = {
      'horas extras': ['horas extras 50%', 'horas extras 100%', 'hora extra', 'he 50', 'he 100'],
      'rsr': ['dsr', 'repouso semanal', 'descanso semanal'],
      'comissões': ['comissão', 'comissoes', 'comissão sobre vendas'],
      '13º salário': ['13o salario', 'decimo terceiro', 'gratificação natalina'],
      'férias': ['ferias', 'férias + 1/3', 'ferias + 1/3', 'terço constitucional'],
    };

    for (const [key, aliasList] of Object.entries(aliases)) {
      const allTerms = [key, ...aliasList];
      const dueMatches = allTerms.some(t => dueNorm.includes(t));
      const paidMatches = allTerms.some(t => paidNorm.includes(t));
      if (dueMatches && paidMatches) return 'rubrica_canonica';
    }

    return null;
  }
}
