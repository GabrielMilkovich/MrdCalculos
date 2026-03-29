/**
 * =====================================================
 * MODULO: DANOS MATERIAIS
 * =====================================================
 * Material damages:
 * - Dano emergente: fixed amount
 * - Lucros cessantes: monthly income x period
 * - Pensao vitalicia: monthly value with present value calculation
 * Updated by monetary correction. No reflexos typically.
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class DanosMateriaisModule implements VerbaModule {
  readonly id = 'DANOS_MATERIAIS';
  readonly nome = 'Indenizacao por Danos Materiais';
  readonly familia = 'contratual' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: valor fixo (dano emergente) or salary-based (lucros cessantes / pensao)
    let base = 0;
    let baseSource = 'fallback';

    if (verba.valor_informado_devido) {
      base = verba.valor_informado_devido;
      baseSource = 'valor_informado_devido';
    } else if (verba.constante_mensal) {
      base = verba.constante_mensal;
      baseSource = 'constante_mensal';
    } else if (verba.base_calculo?.historicos?.length) {
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
    // Danos materiais typically have no reflexos (natureza indenizatoria)
    return [];
  }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    return { fgts: false, inss: false, irrf: false, natureza: 'indenizatoria' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource, regra: 'CC art. 186 + CLT' },
      { campo: 'natureza', valor: 'indenizatoria', fonte: 'lei', observacao: 'Sem reflexos. Correcao monetaria desde o dano.' },
      { campo: 'quantidade', valor: inputs.quantidade, fonte: inputs.quantidadeSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:BxMxQ/D' },
    ];
  }
}

registerVerbaModule(new DanosMateriaisModule());
