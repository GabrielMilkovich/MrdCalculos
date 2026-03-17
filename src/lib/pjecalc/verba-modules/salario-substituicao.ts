/**
 * =====================================================
 * MÓDULO: SALÁRIO SUBSTITUIÇÃO
 * =====================================================
 * 
 * Súmula 159, I, TST: Enquanto perdurar a substituição que
 * não tenha caráter eventual, o substituto fará jus ao
 * salário contratual do substituído.
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class SalarioSubstituicaoModule implements VerbaModule {
  readonly id = 'SAL_SUBST';
  readonly nome = 'Diferenças Salariais - Substituição';
  readonly familia = 'contratual' as const;
  readonly dependencias: string[] = [];

  canApply(_ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const nome = (verba.nome || '').toUpperCase();
    return nome.includes('SUBSTITUI') || nome.includes('EQUIPARA');
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base = diferença entre salário do substituído e o do substituinte
    const salarioAtual = ctx.historicos.length > 0 ? (ctx.historicos[0].valor_informado || 0) : 0;
    const salarioSubstituido = verba.valor_informado_devido || verba.multiplicador || 0;
    const diferenca = Math.max(0, salarioSubstituido - salarioAtual);

    return {
      base: diferenca,
      baseSource: `diferenca:substituido(${salarioSubstituido})-atual(${salarioAtual})`,
      quantidade: 1,
      quantidadeSource: 'mensal',
      divisor: 1,
      divisorSource: 'fixo',
      multiplicador: 1,
      metadata: { salarioAtual, salarioSubstituido },
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    return new Decimal(inputs.base)
      .times(inputs.quantidade)
      .toDP(2)
      .toNumber();
  }

  getReflections(): ReflectionSpec[] {
    return [
      { targetVerba: 'DSR', tipo: 'dsr', baseMultiplier: 1, divisor: 1, periodoMedia: '12_meses' },
      { targetVerba: '13º Salário', tipo: '13_salario', baseMultiplier: 1, divisor: 12 },
      { targetVerba: 'Férias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12 },
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(_ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    const meta = inputs.metadata || {};
    return [
      { campo: 'salario_substituido', valor: meta.salarioSubstituido as number || 0, fonte: 'titulo_executivo', regra: 'Súmula 159, I, TST' },
      { campo: 'salario_atual', valor: meta.salarioAtual as number || 0, fonte: inputs.baseSource },
      { campo: 'diferenca', valor: inputs.base, fonte: 'calculo' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:diferenca_mensal' },
    ];
  }
}

registerVerbaModule(new SalarioSubstituicaoModule());
