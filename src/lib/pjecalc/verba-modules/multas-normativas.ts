/**
 * =====================================================
 * MODULO: MULTAS NORMATIVAS (CCT/ACT)
 * =====================================================
 * Multas de convencao coletiva (CCT/ACT).
 * Fixed value or per-day penalty as defined by collective agreement.
 * Configurable: valor_fixo or valor_diario x dias.
 * Natureza indenizatoria typically.
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class MultasNormativasModule implements VerbaModule {
  readonly id = 'MULTAS_NORMATIVAS';
  readonly nome = 'Multas de Convencao Coletiva (CCT/ACT)';
  readonly familia = 'contratual' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: valor fixo from verba config (valor_informado_devido or constante_mensal)
    const base = verba.valor_informado_devido || verba.constante_mensal || 0;
    const baseSource = verba.valor_informado_devido ? 'valor_informado_devido' : 'constante_mensal';

    // Quantidade: number of occurrences or days (for per-day penalties)
    const quantidade = verba.quantidade_informada || 1;

    return {
      base,
      baseSource,
      quantidade,
      quantidadeSource: 'informada',
      divisor: verba.divisor_informado || 1,
      divisorSource: 'informado',
      multiplicador: verba.multiplicador || 1,
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    if (inputs.base <= 0) return 0;
    // valor_fixo x multiplicador x quantidade / divisor
    const resultado = new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(inputs.divisor)
      .times(inputs.quantidade)
      .toDP(2);
    return resultado.toNumber();
  }

  getReflections(): ReflectionSpec[] {
    // Multas normativas NAO geram reflexos (natureza indenizatoria)
    return [];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: false, inss: false, irrf: false, natureza: 'indenizatoria' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'valor_base', valor: inputs.base, fonte: inputs.baseSource, regra: 'Multa normativa conforme CCT/ACT aplicavel' },
      { campo: 'quantidade', valor: inputs.quantidade, fonte: inputs.quantidadeSource, observacao: 'Ocorrencias ou dias (valor_fixo ou valor_diario x dias)' },
      { campo: 'natureza', valor: 'indenizatoria', fonte: 'convencao_coletiva', observacao: 'Sem FGTS, INSS ou IR' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:BxMxQ/D' },
    ];
  }
}

registerVerbaModule(new MultasNormativasModule());
