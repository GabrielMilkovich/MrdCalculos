/**
 * =====================================================
 * MODULO: DANOS MORAIS (Art. 223-G CLT)
 * =====================================================
 * Fixed amount decided by court.
 * Updated by monetary correction from sentenca date.
 * No reflexos (natureza indenizatoria).
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class DanosMoraisModule implements VerbaModule {
  readonly id = 'DANOS_MORAIS';
  readonly nome = 'Indenizacao por Danos Morais';
  readonly familia = 'contratual' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    // Danos morais is typically a single occurrence (desligamento or fixed date)
    // Applies if we are in the competencia range
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: valor fixo decidido pelo juiz
    const base = verba.valor_informado_devido || verba.constante_mensal || 0;
    const baseSource = verba.valor_informado_devido ? 'valor_informado_devido' : 'constante_mensal';

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

  applyFormula(inputs: ResolvedInputs): number {
    if (inputs.base <= 0) return 0;
    const resultado = new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(inputs.divisor)
      .times(inputs.quantidade)
      .toDP(2);
    return resultado.toNumber();
  }

  getReflections(): ReflectionSpec[] {
    // Danos morais NAO geram reflexos (natureza indenizatoria)
    return [];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: false, inss: false, irrf: false, natureza: 'indenizatoria' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'valor_fixo', valor: inputs.base, fonte: inputs.baseSource, regra: 'Art. 223-G CLT (Reforma Trabalhista)' },
      { campo: 'natureza', valor: 'indenizatoria', fonte: 'lei', observacao: 'Sem reflexos. Correcao monetaria desde a sentenca.' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:VxMxQ/D' },
    ];
  }
}

registerVerbaModule(new DanosMoraisModule());
