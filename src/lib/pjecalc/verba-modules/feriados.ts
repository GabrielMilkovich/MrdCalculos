/**
 * =====================================================
 * MÓDULO: Domingos e Feriados Laborados
 * =====================================================
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class FeriadosLaboradosModule implements VerbaModule {
  readonly id = 'DOM_FER';
  readonly nome = 'Domingos e Feriados Laborados';
  readonly familia = 'jornada' as const;
  readonly dependencias: string[] = [];

  canApply(_ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const name = verba.nome.toUpperCase();
    return name.includes('FERIADO') || name.includes('DOMINGO') || name.includes('DOM/FER');
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    let salarioBase = 0;
    for (const h of ctx.historicos) {
      const ocorr = h.ocorrencias.find(o => o.competencia === ctx.competencia);
      if (ocorr && ocorr.valor > salarioBase) salarioBase = ocorr.valor;
    }

    // Quantity from timecard or verba config
    const cp = ctx.cartaoPonto.find(c => c.competencia === ctx.competencia);
    const quantidade = cp?.dados_extras?.['feriados_laborados'] || verba.quantidade_informada || 0;

    return {
      base: salarioBase,
      baseSource: `salario:${ctx.competencia}`,
      quantidade,
      quantidadeSource: cp?.dados_extras?.['feriados_laborados'] 
        ? `cartao_ponto:feriados_laborados:${ctx.competencia}` 
        : 'verba:quantidade_informada',
      divisor: ctx.cargaHoraria || 220,
      divisorSource: `carga_horaria:${ctx.cargaHoraria}`,
      multiplicador: verba.multiplicador || 2, // 100% adicional
    };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    if (inputs.quantidade <= 0 || inputs.divisor <= 0) return 0;
    return new Decimal(inputs.base)
      .div(inputs.divisor)
      .toDP(2)
      .times(inputs.multiplicador)
      .toDP(2)
      .times(inputs.quantidade)
      .toDP(2)
      .toNumber();
  }

  getReflections(_verba?: PjeVerba): ReflectionSpec[] {
    return [
      { targetVerba: '13º Salário', tipo: '13_salario', baseMultiplier: 1, divisor: 12, periodoMedia: 'ano_civil' },
      { targetVerba: 'Férias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12, periodoMedia: 'periodo_aquisitivo' },
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(_ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'salario_base', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'dias_feriado', valor: inputs.quantidade, fonte: inputs.quantidadeSource },
      { campo: 'adicional', valor: inputs.multiplicador, fonte: 'verba_config' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:(sal/ch×mult×qtd)' },
    ];
  }
}

registerVerbaModule(new FeriadosLaboradosModule());
