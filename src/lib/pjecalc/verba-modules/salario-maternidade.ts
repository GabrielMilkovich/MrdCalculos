/**
 * =====================================================
 * MODULO: SALARIO-MATERNIDADE (Art. 392 CLT)
 * =====================================================
 * 120 days of leave (4 months of full salary, or pro-rata).
 * Base: last salary before leave.
 * INSS incidence but employer-paid (no employee deduction).
 * No FGTS during leave period (already deposited by employer).
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class SalarioMaternidadeModule implements VerbaModule {
  readonly id = 'SALARIO_MATERNIDADE';
  readonly nome = 'Salario-Maternidade';
  readonly familia = 'contratual' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: last salary before leave (from historico salarial)
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

    // Quantidade: number of months (default 4 for 120 days, or pro-rata)
    const quantidade = verba.quantidade_informada || 4;

    return {
      base,
      baseSource,
      quantidade,
      quantidadeSource: verba.quantidade_informada ? 'informada' : 'default_120_dias',
      divisor: verba.divisor_informado || 1,
      divisorSource: 'informado',
      multiplicador: verba.multiplicador || 1,
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    if (inputs.base <= 0) return 0;
    // Full salary per month of maternity leave
    const resultado = new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(inputs.divisor)
      .times(inputs.quantidade)
      .toDP(2);
    return resultado.toNumber();
  }

  getReflections(): ReflectionSpec[] {
    // Salario-maternidade generates reflexos in 13o and ferias
    // but NOT in FGTS (employer already deposits during leave)
    return [
      { targetVerba: '13o Salario', tipo: '13_salario', baseMultiplier: 1, divisor: 12, periodoMedia: 'ano_civil' },
      { targetVerba: 'Ferias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12, periodoMedia: 'periodo_aquisitivo' },
    ];
  }

  getIncidences(): IncidenceSpec {
    // INSS incides but is employer-paid (no employee deduction)
    // No FGTS (already deposited); no IR on maternity pay
    return { fgts: false, inss: true, irrf: false, natureza: 'salarial' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource, regra: 'Art. 392 CLT — salario integral durante licenca-maternidade (120 dias)' },
      { campo: 'quantidade_meses', valor: inputs.quantidade, fonte: inputs.quantidadeSource, observacao: '120 dias = 4 meses (ou pro-rata)' },
      { campo: 'incidencias', valor: 'INSS empregador; sem FGTS; sem IR', fonte: 'lei', observacao: 'Art. 28 §2° Lei 8.212/91 — INSS patronal incide' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:BxMxQ/D' },
    ];
  }
}

registerVerbaModule(new SalarioMaternidadeModule());
