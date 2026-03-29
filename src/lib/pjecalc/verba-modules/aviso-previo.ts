/**
 * =====================================================
 * MODULO: AVISO PREVIO (Lei 12.506/2011)
 * =====================================================
 * Base: 30 days + 3 days per year of service (max 90 days)
 * Indenizado: no INSS, yes FGTS
 * Trabalhado: full incidencias
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

/**
 * Calculate proportional aviso previo days per Lei 12.506/2011
 */
function calcDiasAvisoProporcional(admissao: string, demissao?: string): number {
  if (!demissao) return 30;
  const d1 = new Date(admissao);
  const d2 = new Date(demissao);
  const anosServico = Math.floor((d2.getTime() - d1.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  // 30 base + 3 per year, max 90
  return Math.min(90, 30 + Math.max(0, anosServico) * 3);
}

export class AvisoPrevioModule implements VerbaModule {
  readonly id = 'AVISO_PREVIO_PROPORCIONAL';
  readonly nome = 'Aviso Previo';
  readonly familia = 'rescisoria' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    // Aviso previo only applies at desligamento
    if (verba.ocorrencia_pagamento !== 'desligamento') return false;
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    let base = 0;
    let baseSource = 'fallback';

    if (verba.base_calculo?.historicos?.length) {
      const histNome = verba.base_calculo.historicos[0];
      const hist = ctx.historicos.find(h => h.id === histNome || h.nome === histNome);
      if (hist) {
        const monthEntry = hist.ocorrencias?.find(o => o.competencia.startsWith(ctx.competencia));
        if (monthEntry) {
          base = monthEntry.valor;
          baseSource = `hist_salarial_mes:${hist.nome}:${ctx.competencia}`;
        } else if (hist.valor_informado) {
          base = hist.valor_informado;
          baseSource = `hist_salarial_fixo:${hist.nome}`;
        }
      }
    }

    // Quantidade: dias de aviso previo
    let quantidade = verba.quantidade_informada || 30;
    let quantidadeSource = 'informada';

    // If quantidade is 0 or default, calculate proportional
    if (verba.tipo_quantidade === 'apurada' || quantidade <= 0) {
      quantidade = calcDiasAvisoProporcional(ctx.admissao, ctx.demissao);
      quantidadeSource = `proporcional:Lei_12506/2011:${quantidade}dias`;
    }

    const divisor = verba.divisor_informado || 30;

    return {
      base,
      baseSource,
      quantidade,
      quantidadeSource,
      divisor,
      divisorSource: 'informado',
      multiplicador: verba.multiplicador || 1,
      metadata: { dias_aviso: quantidade },
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    if (inputs.base <= 0 || inputs.divisor <= 0) return 0;
    // Formula: (Base / Divisor) x Quantidade x Multiplicador
    const resultado = new Decimal(inputs.base)
      .div(inputs.divisor)
      .toDP(2)
      .times(inputs.quantidade)
      .toDP(2)
      .times(inputs.multiplicador)
      .toDP(2);
    return resultado.toNumber();
  }

  getReflections(verba: PjeVerba): ReflectionSpec[] {
    // Aviso previo indenizado: FGTS sim, mas sem 13o/ferias separados
    // (o proprio aviso previo projeta o contrato)
    return [
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(verba: PjeVerba): IncidenceSpec {
    // Aviso previo indenizado: FGTS sim, INSS/IRRF nao
    if (verba.caracteristica === 'aviso_previo') {
      return { fgts: true, inss: false, irrf: false, natureza: 'indenizatoria' };
    }
    // Aviso previo trabalhado: tudo incide
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'dias_aviso', valor: inputs.quantidade, fonte: inputs.quantidadeSource, regra: 'Lei 12.506/2011: 30d + 3d/ano (max 90d)' },
      { campo: 'divisor', valor: inputs.divisor, fonte: inputs.divisorSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:(B/D)xQxM' },
    ];
  }
}

registerVerbaModule(new AvisoPrevioModule());
