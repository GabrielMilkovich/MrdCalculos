/**
 * =====================================================
 * MODULO: DIFERENCAS SALARIAIS
 * =====================================================
 * General salary difference calculator.
 * Supports: reajuste nao concedido, reenquadramento, piso salarial.
 * Input: salario devido vs salario pago per competencia.
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class DiferencasSalariaisModule implements VerbaModule {
  readonly id = 'DIF_SALARIAIS';
  readonly nome = 'Diferencas Salariais';
  readonly familia = 'contratual' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Salario devido: first historico (what should have been paid)
    let salarioDevido = 0;
    let devidoSource = 'fallback';

    if (verba.base_calculo?.historicos?.length) {
      const histNome = verba.base_calculo.historicos[0];
      const hist = ctx.historicos.find(h => h.id === histNome || h.nome === histNome);
      if (hist) {
        const monthEntry = hist.ocorrencias?.find(o => o.competencia.startsWith(ctx.competencia));
        if (monthEntry) {
          salarioDevido = monthEntry.valor;
          devidoSource = `hist_devido_mes:${hist.nome}:${ctx.competencia}`;
        } else if (hist.valor_informado) {
          salarioDevido = hist.valor_informado;
          devidoSource = `hist_devido_fixo:${hist.nome}`;
        }
      }
    }

    // Salario pago: from second historico or pago_base
    let salarioPago = 0;
    let pagoSource = 'fallback';

    if (verba.base_calculo?.historicos && verba.base_calculo.historicos.length >= 2) {
      const pagoHistNome = verba.base_calculo.historicos[1];
      const pagoHist = ctx.historicos.find(h => h.id === pagoHistNome || h.nome === pagoHistNome);
      if (pagoHist) {
        const monthEntry = pagoHist.ocorrencias?.find(o => o.competencia.startsWith(ctx.competencia));
        if (monthEntry) {
          salarioPago = monthEntry.valor;
          pagoSource = `hist_pago_mes:${pagoHist.nome}:${ctx.competencia}`;
        } else if (pagoHist.valor_informado) {
          salarioPago = pagoHist.valor_informado;
          pagoSource = `hist_pago_fixo:${pagoHist.nome}`;
        }
      }
    } else if (verba.pago_base) {
      salarioPago = verba.pago_base;
      pagoSource = 'pago_base';
    }

    const diferenca = Math.max(0, salarioDevido - salarioPago);

    return {
      base: diferenca,
      baseSource: `diferenca:(${devidoSource})-(${pagoSource})`,
      quantidade: verba.quantidade_informada || 1,
      quantidadeSource: 'informada',
      divisor: verba.divisor_informado || 1,
      divisorSource: 'informado',
      multiplicador: verba.multiplicador || 1,
      metadata: { salario_devido: salarioDevido, salario_pago: salarioPago },
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
    return [
      { targetVerba: 'DSR', tipo: 'dsr', baseMultiplier: 1, divisor: 26 },
      { targetVerba: '13o Salario', tipo: '13_salario', baseMultiplier: 1, divisor: 12, periodoMedia: 'ano_civil' },
      { targetVerba: 'Ferias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12, periodoMedia: 'periodo_aquisitivo' },
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'salario_devido', valor: inputs.metadata?.salario_devido as number, fonte: 'hist_salarial_devido' },
      { campo: 'salario_pago', valor: inputs.metadata?.salario_pago as number, fonte: 'hist_salarial_pago' },
      { campo: 'diferenca', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:DifxMxQ/D' },
    ];
  }
}

registerVerbaModule(new DiferencasSalariaisModule());
