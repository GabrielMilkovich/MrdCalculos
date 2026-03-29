/**
 * =====================================================
 * MODULO: INDENIZACAO ADICIONAL PRE-DATABASE (Lei 7.238/84)
 * =====================================================
 * When employee is dismissed 30 days before data-base (salary adjustment date).
 * Value: one additional monthly salary.
 * Single occurrence at dismissal.
 * Natureza indenizatoria.
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class IndenizacaoPreDatabaseModule implements VerbaModule {
  readonly id = 'INDENIZACAO_PRE_DATABASE';
  readonly nome = 'Indenizacao Adicional Lei 7.238/84';
  readonly familia = 'rescisoria' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    // Single occurrence at dismissal — applies if competencia matches demissao month
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: one monthly salary from historico
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
    // One additional monthly salary
    const resultado = new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(inputs.divisor)
      .times(inputs.quantidade)
      .toDP(2);
    return resultado.toNumber();
  }

  getReflections(): ReflectionSpec[] {
    // Natureza indenizatoria — sem reflexos
    return [];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: false, inss: false, irrf: false, natureza: 'indenizatoria' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource, regra: 'Lei 7.238/84, Art. 9° — demissao 30 dias antes da data-base' },
      { campo: 'natureza', valor: 'indenizatoria', fonte: 'lei', observacao: 'Valor equivalente a 1 salario mensal adicional. Sumula 314 TST.' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:BxMxQ/D' },
    ];
  }
}

registerVerbaModule(new IndenizacaoPreDatabaseModule());
