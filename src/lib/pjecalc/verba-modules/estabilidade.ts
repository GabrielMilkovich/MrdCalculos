/**
 * =====================================================
 * MODULO: ESTABILIDADE PROVISORIA
 * =====================================================
 * Stability indemnity when employee had job protection:
 * - Gestante: 5 months after birth (Art. 10, II, 'b', ADCT)
 * - CIPA: 1 year after mandate (Art. 10, II, 'a', ADCT)
 * - Acidentaria: 12 months after alta previdenciaria (Art. 118, Lei 8.213/91)
 * Calculates full salary for the stability period.
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class EstabilidadeModule implements VerbaModule {
  readonly id = 'ESTABILIDADE';
  readonly nome = 'Estabilidade Provisoria';
  readonly familia = 'contratual' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: salary from historico (full salary for stability period)
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
    // Full salary for each month of the stability period
    const resultado = new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(inputs.divisor)
      .times(inputs.quantidade)
      .toDP(2);
    return resultado.toNumber();
  }

  getReflections(): ReflectionSpec[] {
    return [
      { targetVerba: '13o Salario', tipo: '13_salario', baseMultiplier: 1, divisor: 12, periodoMedia: 'ano_civil' },
      { targetVerba: 'Ferias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12, periodoMedia: 'periodo_aquisitivo' },
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource, regra: 'Salario integral do periodo estabilitario' },
      { campo: 'quantidade', valor: inputs.quantidade, fonte: inputs.quantidadeSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:BxMxQ/D', observacao: 'Gera reflexos em 13o, ferias e FGTS' },
    ];
  }
}

registerVerbaModule(new EstabilidadeModule());
