/**
 * =====================================================
 * MÓDULO: Multas CLT (Art. 467, Art. 477)
 * =====================================================
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

// =====================================================
// MULTA ART. 467 CLT
// =====================================================

export class Multa467Module implements VerbaModule {
  readonly id = 'MULTA_467';
  readonly nome = 'Multa Art. 467 CLT';
  readonly familia = 'rescisoria' as const;
  readonly dependencias: string[] = [];

  canApply(_ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    return verba.nome.toUpperCase().includes('467');
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: valor incontroverso × 50%
    const base = verba.valor_informado_devido || 0;
    return {
      base,
      baseSource: 'verba:valor_informado_devido',
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: 1,
      divisorSource: 'fixo',
      multiplicador: 0.5,
    };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    return new Decimal(inputs.base).times(inputs.multiplicador).toDP(2).toNumber();
  }

  getReflections(_verba?: PjeVerba): ReflectionSpec[] { return []; }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    return { fgts: false, inss: false, irrf: false, natureza: 'indenizatoria' };
  }

  buildAuditTrail(_ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base_incontroverso', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:base×50%' },
    ];
  }
}

// =====================================================
// MULTA ART. 477 CLT
// =====================================================

export class Multa477Module implements VerbaModule {
  readonly id = 'MULTA_477';
  readonly nome = 'Multa Art. 477 CLT';
  readonly familia = 'rescisoria' as const;
  readonly dependencias: string[] = [];

  canApply(_ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    return verba.nome.toUpperCase().includes('477');
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: última remuneração
    let ultimaRemuneracao = 0;
    for (const h of ctx.historicos) {
      const sorted = [...h.ocorrencias].sort((a, b) => b.competencia.localeCompare(a.competencia));
      if (sorted.length > 0 && sorted[0].valor > ultimaRemuneracao) {
        ultimaRemuneracao = sorted[0].valor;
      }
    }

    return {
      base: verba.valor_informado_devido || ultimaRemuneracao,
      baseSource: verba.valor_informado_devido ? 'verba:valor_informado_devido' : 'hist:ultima_remuneracao',
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: 1,
      divisorSource: 'fixo',
      multiplicador: 1,
    };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    return new Decimal(inputs.base).times(inputs.multiplicador).toDP(2).toNumber();
  }

  getReflections(_verba?: PjeVerba): ReflectionSpec[] { return []; }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    return { fgts: false, inss: false, irrf: false, natureza: 'indenizatoria' };
  }

  buildAuditTrail(_ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base_remuneracao', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:1×remuneração' },
    ];
  }
}

registerVerbaModule(new Multa467Module());
registerVerbaModule(new Multa477Module());
