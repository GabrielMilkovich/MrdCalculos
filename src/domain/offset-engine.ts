/**
 * =====================================================
 * DOMAIN OFFSET ENGINE — Stubbed (lib/pjecalc/offset-engine deleted)
 * =====================================================
 *
 * Original dependency on ../lib/pjecalc/offset-engine removed.
 * Exports the same public interface with no-op implementations.
 */

import Decimal from 'decimal.js';
import type { CalculationItem, CalculationItemOffset, AuditTrailEntry, DocumentSourceType } from './types';
import { logger } from '@/lib/logger';

// =====================================================
// STUB TYPES (previously from lib/pjecalc/offset-engine)
// =====================================================

type OffsetMode = 'identico_titulo' | 'global' | 'por_rubrica';

interface OffsetItemResult {
  due_item_id: string;
  valor_abatido: number;
  matched_payments: { paid_item_id: string; rubrica: string; valor_usado: number; confidence: number; fonte: string }[];
}

interface OffsetSummary {
  total_devido: number;
  total_abatido: number;
  items: OffsetItemResult[];
  unmatched_payments: { id: string; valor_restante: number }[];
}

// =====================================================
// DOMAIN OFFSET CONTEXT
// =====================================================

export interface DomainOffsetContext {
  /** Items calculated by the engine */
  calculationItems: CalculationItem[];
  /** Amounts already paid (from payslips, TRCT, etc.) */
  paidItems: DomainPaidItem[];
  /** Offset mode */
  mode: OffsetMode;
}

export interface DomainPaidItem {
  id: string;
  rubrica: string;
  rubrica_canonica?: string;
  competencia: string;
  valor: number;
  fonte: DocumentSourceType;
  natureza?: 'salarial' | 'indenizatoria' | 'mista';
}

// =====================================================
// DOMAIN OFFSET RESULT
// =====================================================

export interface DomainOffsetResult {
  /** Updated calculation items with offsets applied */
  updatedItems: CalculationItem[];
  /** Summary of all offsets */
  summary: OffsetSummary;
  /** Audit trail entries */
  audit: AuditTrailEntry[];
}

// =====================================================
// NO-OP IMPLEMENTATION
// =====================================================

export function applyDomainOffsets(ctx: DomainOffsetContext): DomainOffsetResult {
  logger.warn('applyDomainOffsets: offset-engine removed, returning items unchanged')

  const summary: OffsetSummary = {
    total_devido: 0,
    total_abatido: 0,
    items: [],
    unmatched_payments: ctx.paidItems.map(p => ({ id: p.id, valor_restante: p.valor })),
  };

  return {
    updatedItems: ctx.calculationItems,
    summary,
    audit: [{
      campo: 'offset_summary',
      valor: 0,
      fonte: 'offset_engine',
      regra: 'Offset engine removed — no offsets applied',
      observacao: `${ctx.paidItems.length} pagamento(s) não processado(s)`,
    }],
  };
}
