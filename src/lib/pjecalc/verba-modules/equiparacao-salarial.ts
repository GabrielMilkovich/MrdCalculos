/**
 * =====================================================
 * MODULO: EQUIPARACAO SALARIAL (Art. 461 CLT)
 * =====================================================
 * Diferenca entre salario do empregado e salario do paradigma.
 * Input: paradigma salary per competencia.
 * Difference = paradigma_salary - employee_salary
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class EquiparacaoSalarialModule implements VerbaModule {
  readonly id = 'EQUIPARACAO_SALARIAL';
  readonly nome = 'Equiparacao Salarial';
  readonly familia = 'contratual' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: employee salary (from historico salarial)
    let salarioEmpregado = 0;
    let baseSource = 'fallback';

    if (verba.base_calculo?.historicos?.length) {
      const histNome = verba.base_calculo.historicos[0];
      const hist = ctx.historicos.find(h => h.id === histNome || h.nome === histNome);
      if (hist) {
        const monthEntry = hist.ocorrencias?.find(o => o.competencia.startsWith(ctx.competencia));
        if (monthEntry) {
          salarioEmpregado = monthEntry.valor;
          baseSource = `hist_salarial_mes:${hist.nome}:${ctx.competencia}`;
        } else if (hist.valor_informado) {
          salarioEmpregado = hist.valor_informado;
          baseSource = `hist_salarial_fixo:${hist.nome}`;
        }
      }
    }

    // Paradigma salary: from second historico or constante_mensal or valor_informado_devido
    let salarioParadigma = 0;
    let paradigmaSource = 'informado';

    if (verba.base_calculo?.historicos && verba.base_calculo.historicos.length >= 2) {
      const paradigmaHistNome = verba.base_calculo.historicos[1];
      const paradigmaHist = ctx.historicos.find(h => h.id === paradigmaHistNome || h.nome === paradigmaHistNome);
      if (paradigmaHist) {
        const monthEntry = paradigmaHist.ocorrencias?.find(o => o.competencia.startsWith(ctx.competencia));
        if (monthEntry) {
          salarioParadigma = monthEntry.valor;
          paradigmaSource = `hist_paradigma_mes:${paradigmaHist.nome}:${ctx.competencia}`;
        } else if (paradigmaHist.valor_informado) {
          salarioParadigma = paradigmaHist.valor_informado;
          paradigmaSource = `hist_paradigma_fixo:${paradigmaHist.nome}`;
        }
      }
    } else if (verba.valor_informado_devido) {
      salarioParadigma = verba.valor_informado_devido;
      paradigmaSource = 'valor_informado_devido';
    } else if (verba.constante_mensal) {
      salarioParadigma = verba.constante_mensal;
      paradigmaSource = 'constante_mensal';
    }

    // The difference is paradigma - empregado (base stores the difference)
    const diferenca = Math.max(0, salarioParadigma - salarioEmpregado);

    return {
      base: diferenca,
      baseSource: `diferenca:(${paradigmaSource})-(${baseSource})`,
      quantidade: verba.quantidade_informada || 1,
      quantidadeSource: 'informada',
      divisor: verba.divisor_informado || 1,
      divisorSource: 'informado',
      multiplicador: verba.multiplicador || 1,
      metadata: { salario_empregado: salarioEmpregado, salario_paradigma: salarioParadigma },
    };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    if (inputs.base <= 0) return 0;
    // Formula: Diferenca x Multiplicador x Quantidade / Divisor
    const resultado = new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(inputs.divisor)
      .times(inputs.quantidade)
      .toDP(2);
    return resultado.toNumber();
  }

  getReflections(_verba?: PjeVerba): ReflectionSpec[] {
    return [
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
      { campo: 'salario_empregado', valor: inputs.metadata?.salario_empregado as number, fonte: 'hist_salarial', regra: 'Art. 461 CLT' },
      { campo: 'salario_paradigma', valor: inputs.metadata?.salario_paradigma as number, fonte: 'hist_paradigma' },
      { campo: 'diferenca', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:DifxMxQ/D' },
    ];
  }
}

registerVerbaModule(new EquiparacaoSalarialModule());
