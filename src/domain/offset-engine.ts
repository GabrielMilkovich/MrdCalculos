/**
 * =====================================================
 * DOMAIN OFFSET ENGINE — Motor de Abatimentos Auditável
 * =====================================================
 * 
 * Wrapper de domínio sobre o offset-engine existente.
 * Adiciona:
 * - Integração com CalculationItem do domínio
 * - Trilha de auditoria por abatimento
 * - Conversão bidirecional
 */

import Decimal from 'decimal.js';
import { OffsetEngine, type PaidItem, type DueItem, type OffsetSummary, type OffsetMode } from '../lib/pjecalc/offset-engine';
import type { CalculationItem, CalculationItemOffset, AuditTrailEntry, DocumentSourceType } from './types';

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
// APPLY OFFSETS
// =====================================================

export function applyDomainOffsets(ctx: DomainOffsetContext): DomainOffsetResult {
  const audit: AuditTrailEntry[] = [];

  // Convert domain paid items to engine format
  const enginePaidItems: PaidItem[] = ctx.paidItems.map(p => ({
    id: p.id,
    rubrica: p.rubrica,
    rubrica_canonica: p.rubrica_canonica,
    competencia: p.competencia,
    valor: p.valor,
    fonte: mapFonte(p.fonte),
    natureza: p.natureza,
    consumed: false,
    consumed_amount: 0,
  }));

  // Convert calculation items to due items
  const dueItems: DueItem[] = ctx.calculationItems
    .filter(item => item.ativo && item.diferenca.gt(0))
    .map(item => ({
      verba_id: item.id,
      nome: item.rubric_name,
      rubrica_canonica: item.rubric_code,
      competencia: item.competencia,
      valor_devido: item.diferenca.toNumber(),
      natureza: undefined,
    }));

  // Run offset engine
  const engine = new OffsetEngine(enginePaidItems, ctx.mode);
  const summary = engine.apply(dueItems);

  // Apply results back to calculation items
  const updatedItems = ctx.calculationItems.map(item => {
    const offsetResult = summary.items.find(
      r => r.due_item_id === item.id
    );

    if (!offsetResult || offsetResult.valor_abatido === 0) return item;

    const offsets: CalculationItemOffset[] = offsetResult.matched_payments.map(m => ({
      id: crypto.randomUUID(),
      item_id: item.id,
      paid_item_id: m.paid_item_id,
      rubrica_paga: m.rubrica,
      valor_abatido: new Decimal(m.valor_usado),
      modo: ctx.mode,
      match_score: m.confidence,
      fonte: reverseMapFonte(m.fonte),
    }));

    const totalAbatido = new Decimal(offsetResult.valor_abatido);
    const novaDiferenca = item.diferenca.minus(totalAbatido);

    audit.push({
      campo: `abatimento_${item.rubric_code}_${item.competencia}`,
      valor: totalAbatido.toNumber(),
      fonte: 'offset_engine',
      regra: `Modo: ${ctx.mode} | ${offsets.length} pagamento(s) correspondido(s)`,
      observacao: `Abatido R$ ${totalAbatido.toFixed(2)} de R$ ${item.diferenca.toFixed(2)}`,
    });

    return {
      ...item,
      valor_pago: item.valor_pago.plus(totalAbatido),
      diferenca: novaDiferenca.lt(0) && item.diferenca.gt(0) ? new Decimal(0) : novaDiferenca,
      total: novaDiferenca.plus(item.correcao).plus(item.juros),
      offsets: [...item.offsets, ...offsets],
    };
  });

  audit.push({
    campo: 'offset_summary',
    valor: summary.total_abatido,
    fonte: 'offset_engine',
    regra: `Total devido: R$ ${summary.total_devido.toFixed(2)} | Abatido: R$ ${summary.total_abatido.toFixed(2)}`,
    observacao: `${summary.unmatched_payments.length} pagamento(s) não correspondido(s)`,
  });

  return { updatedItems, summary, audit };
}

// =====================================================
// HELPERS
// =====================================================

function mapFonte(fonte: DocumentSourceType): PaidItem['fonte'] {
  switch (fonte) {
    case 'contracheque': return 'contracheque';
    case 'trct': return 'trct';
    case 'ficha_financeira': return 'ficha_financeira';
    case 'planilha_pjc': return 'pjc';
    default: return 'manual';
  }
}

function reverseMapFonte(fonte: string): DocumentSourceType {
  switch (fonte) {
    case 'contracheque': return 'contracheque';
    case 'trct': return 'trct';
    case 'ficha_financeira': return 'ficha_financeira';
    case 'pjc': return 'planilha_pjc';
    default: return 'manual';
  }
}
