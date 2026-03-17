/**
 * =====================================================
 * MÓDULO: DSR / RSR (Descanso Semanal Remunerado)
 * =====================================================
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class DSRModule implements VerbaModule {
  readonly id = 'DSR';
  readonly nome = 'DSR / RSR';
  readonly familia = 'reflexo' as const;
  readonly dependencias = ['HE_50', 'HE_100'];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    // DSR applies when there are HE results for this competência
    const heResults = ctx.resultadosAnteriores.get('HE_50') || [];
    const he100Results = ctx.resultadosAnteriores.get('HE_100') || [];
    return [...heResults, ...he100Results].some(r => r.competencia === ctx.competencia && r.diferenca > 0);
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: sum of HE differences for this competência
    let base = 0;
    const sources: string[] = [];

    for (const [key, results] of ctx.resultadosAnteriores) {
      if (!key.startsWith('HE_')) continue;
      const comp = results.find(r => r.competencia === ctx.competencia);
      if (comp && comp.diferenca > 0) {
        base += comp.diferenca;
        sources.push(`${key}:${comp.diferenca}`);
      }
    }

    return {
      base,
      baseSource: sources.join('+') || 'nenhuma_he',
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: ctx.calendario.diasUteis || 22,
      divisorSource: `dias_uteis:${ctx.competencia}`,
      multiplicador: ctx.calendario.repousos || 4,
      metadata: { diasUteis: ctx.calendario.diasUteis, repousos: ctx.calendario.repousos },
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    if (inputs.base <= 0 || inputs.divisor <= 0) return 0;
    // DSR = (soma_HE / dias_uteis) × repousos
    const result = new Decimal(inputs.base)
      .div(inputs.divisor)
      .toDP(2)
      .times(inputs.multiplicador)
      .toDP(2);
    return result.toNumber();
  }

  getReflections(): ReflectionSpec[] {
    return [
      { targetVerba: '13º Salário', tipo: '13_salario', baseMultiplier: 1, divisor: 12, periodoMedia: 'ano_civil' },
      { targetVerba: 'Férias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12, periodoMedia: 'periodo_aquisitivo' },
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base_he', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'dias_uteis', valor: inputs.divisor, fonte: inputs.divisorSource },
      { campo: 'repousos', valor: inputs.multiplicador, fonte: `calendario:${ctx.competencia}` },
      { campo: 'resultado', valor: resultado, fonte: 'formula:(soma_HE/dias_uteis)×repousos' },
    ];
  }
}

registerVerbaModule(new DSRModule());
