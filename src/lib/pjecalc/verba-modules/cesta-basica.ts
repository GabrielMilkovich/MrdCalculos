/**
 * =====================================================
 * MODULO: CESTA BASICA / VALE-ALIMENTACAO NAO CONCEDIDO
 * =====================================================
 * Monthly fixed value (from verba.quantidade_informada or valor_informado).
 * Natureza indenizatoria: no FGTS, no INSS, no IR.
 * Simple: due_value - paid_value per month.
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class CestaBasicaModule implements VerbaModule {
  readonly id = 'CESTA_BASICA';
  readonly nome = 'Vale-Alimentacao / Cesta Basica';
  readonly familia = 'contratual' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: fixed monthly value from verba config
    const base = verba.valor_informado_devido || verba.constante_mensal || verba.quantidade_informada || 0;
    const baseSource = verba.valor_informado_devido
      ? 'valor_informado_devido'
      : verba.constante_mensal
        ? 'constante_mensal'
        : 'quantidade_informada';

    return {
      base,
      baseSource,
      quantidade: verba.quantidade_informada || 1,
      quantidadeSource: 'informada',
      divisor: verba.divisor_informado || 1,
      divisorSource: 'informado',
      multiplicador: verba.multiplicador || 1,
    };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    if (inputs.base <= 0) return 0;
    const resultado = new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(inputs.divisor)
      .times(inputs.quantidade)
      .toDP(2);
    return resultado.toNumber();
  }

  getReflections(_verba?: PjeVerba): ReflectionSpec[] {
    // Natureza indenizatoria — sem reflexos
    return [];
  }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    return { fgts: false, inss: false, irrf: false, natureza: 'indenizatoria' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'valor_mensal', valor: inputs.base, fonte: inputs.baseSource, regra: 'Valor fixo mensal de cesta basica / vale-alimentacao' },
      { campo: 'natureza', valor: 'indenizatoria', fonte: 'lei', observacao: 'Sem FGTS, INSS ou IR. PAT — Lei 6.321/76.' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:BxMxQ/D' },
    ];
  }
}

registerVerbaModule(new CestaBasicaModule());
