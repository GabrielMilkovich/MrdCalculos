/**
 * =====================================================
 * MÓDULOS: FGTS RESCISÓRIO + MULTA 40%
 * =====================================================
 * 
 * Art. 18 Lei 8.036/90: FGTS = 8% sobre remuneração
 * Art. 18 §1º: Multa = 40% sobre saldo FGTS
 * Súmula 305 TST: multa incide sobre todos os depósitos
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

// ── FGTS sobre diferenças ──
export class FGTSDiferencasModule implements VerbaModule {
  readonly id = 'FGTS_DIF';
  readonly nome = 'FGTS sobre Diferenças';
  readonly familia = 'tributario' as const;
  readonly dependencias = ['HE_50', 'HE_100', 'DSR', 'SALDO_SAL', 'AVISO_PREVIO', 'DECIMO_PROP', 'FERIAS_VENC', 'FERIAS_PROP'];

  canApply(): boolean {
    return true;
  }

  resolveInputs(ctx: VerbaModuleContext): ResolvedInputs {
    // Base = soma de todas as diferenças salariais que incidem FGTS
    let totalBase = new Decimal(0);
    const sources: string[] = [];

    for (const [verbaId, resultados] of ctx.resultadosAnteriores) {
      for (const r of resultados) {
        if (r.competencia === ctx.competencia && r.diferenca > 0) {
          totalBase = totalBase.plus(r.diferenca);
          sources.push(verbaId);
        }
      }
    }

    return {
      base: totalBase.toDP(2).toNumber(),
      baseSource: `soma_diferencas:${sources.join(',')}`,
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: 1,
      divisorSource: 'fixo',
      multiplicador: 8, // 8%
      metadata: { aliquota: 8 },
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    return new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(100).toDP(2)
      .toNumber();
  }

  getReflections(): ReflectionSpec[] {
    return [];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: false, inss: false, irrf: false, natureza: 'indenizatoria' };
  }

  buildAuditTrail(_ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base_fgts', valor: inputs.base, fonte: inputs.baseSource, regra: 'Art. 18 Lei 8.036/90' },
      { campo: 'aliquota', valor: '8%', fonte: 'lei_8036_90' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:base×8%' },
    ];
  }
}

// ── Multa 40% FGTS ──
export class Multa40FGTSModule implements VerbaModule {
  readonly id = 'MULTA_40_FGTS';
  readonly nome = 'Multa 40% FGTS';
  readonly familia = 'rescisoria' as const;
  readonly dependencias = ['FGTS_DIF'];

  canApply(ctx: VerbaModuleContext): boolean {
    return !!ctx.demissao;
  }

  resolveInputs(ctx: VerbaModuleContext): ResolvedInputs {
    // Base = total de FGTS devidos (soma de todas as competências)
    let totalFGTS = new Decimal(0);
    const fgtsResults = ctx.resultadosAnteriores.get('FGTS_DIF') || [];
    for (const r of fgtsResults) {
      if (r.diferenca > 0) {
        totalFGTS = totalFGTS.plus(r.diferenca);
      }
    }

    return {
      base: totalFGTS.toDP(2).toNumber(),
      baseSource: 'soma_fgts_diferencas',
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: 1,
      divisorSource: 'fixo',
      multiplicador: 40, // 40%
      metadata: { percentualMulta: 40 },
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    return new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(100).toDP(2)
      .toNumber();
  }

  getReflections(): ReflectionSpec[] {
    return [];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: false, inss: false, irrf: false, natureza: 'indenizatoria' };
  }

  buildAuditTrail(_ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base_multa', valor: inputs.base, fonte: inputs.baseSource, regra: 'Art. 18 §1º Lei 8.036/90' },
      { campo: 'percentual', valor: '40%', fonte: 'lei_8036_90', regra: 'Súmula 305 TST' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:base_fgts×40%' },
    ];
  }
}

registerVerbaModule(new FGTSDiferencasModule());
registerVerbaModule(new Multa40FGTSModule());
