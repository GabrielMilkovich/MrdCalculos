/**
 * =====================================================
 * MÓDULO: Intervalos (Intrajornada / Interjornadas / Art. 384)
 * =====================================================
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

// =====================================================
// INTERVALO INTRAJORNADA
// =====================================================

export class IntrajornadaModule implements VerbaModule {
  readonly id = 'INTRAJORNADA';
  readonly nome = 'Intervalo Intrajornada';
  readonly familia = 'jornada' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const name = verba.nome.toUpperCase();
    return name.includes('INTRAJORNADA') || name.includes('INTERVALO') && name.includes('SUPRIMIDO');
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    const cp = ctx.cartaoPonto.find(c => c.competencia === ctx.competencia);
    const horas = cp?.intervalo_suprimido || 0;

    // Base: salário-hora
    let salarioBase = 0;
    for (const h of ctx.historicos) {
      const ocorr = h.ocorrencias.find(o => o.competencia === ctx.competencia);
      if (ocorr && ocorr.valor > salarioBase) salarioBase = ocorr.valor;
    }

    return {
      base: salarioBase,
      baseSource: `salario:${ctx.competencia}`,
      quantidade: horas,
      quantidadeSource: `cartao_ponto:intervalo_suprimido:${ctx.competencia}`,
      divisor: ctx.cargaHoraria || 220,
      divisorSource: `carga_horaria:${ctx.cargaHoraria}`,
      multiplicador: verba.multiplicador || 1.5, // 50% adicional
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
      { targetVerba: 'DSR', tipo: 'dsr', baseMultiplier: 1, divisor: 1 },
      { targetVerba: '13º Salário', tipo: '13_salario', baseMultiplier: 1, divisor: 12, periodoMedia: 'ano_civil' },
      { targetVerba: 'Férias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12, periodoMedia: 'periodo_aquisitivo' },
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'salario_base', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'horas_suprimidas', valor: inputs.quantidade, fonte: inputs.quantidadeSource },
      { campo: 'divisor', valor: inputs.divisor, fonte: inputs.divisorSource },
      { campo: 'adicional', valor: inputs.multiplicador, fonte: 'verba_config' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:(sal/divisor×mult×qtd)' },
    ];
  }
}

// =====================================================
// INTERVALO INTERJORNADAS
// =====================================================

export class InterjornadaModule implements VerbaModule {
  readonly id = 'INTERJORNADA';
  readonly nome = 'Intervalo Interjornadas';
  readonly familia = 'jornada' as const;
  readonly dependencias: string[] = [];

  canApply(_ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    return verba.nome.toUpperCase().includes('INTERJORNADA');
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    let salarioBase = 0;
    for (const h of ctx.historicos) {
      const ocorr = h.ocorrencias.find(o => o.competencia === ctx.competencia);
      if (ocorr && ocorr.valor > salarioBase) salarioBase = ocorr.valor;
    }

    return {
      base: salarioBase,
      baseSource: `salario:${ctx.competencia}`,
      quantidade: verba.quantidade_informada || 0,
      quantidadeSource: 'verba:quantidade_informada',
      divisor: ctx.cargaHoraria || 220,
      divisorSource: `carga_horaria:${ctx.cargaHoraria}`,
      multiplicador: verba.multiplicador || 1.5,
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
      { campo: 'horas', valor: inputs.quantidade, fonte: inputs.quantidadeSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:(sal/divisor×mult×qtd)' },
    ];
  }
}

// =====================================================
// ART. 384 CLT
// =====================================================

export class Art384Module implements VerbaModule {
  readonly id = 'ART384';
  readonly nome = 'Art. 384 CLT';
  readonly familia = 'jornada' as const;
  readonly dependencias: string[] = [];

  canApply(_ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const name = verba.nome.toUpperCase();
    return name.includes('384') || name.includes('INTERVALO MULHER');
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    let salarioBase = 0;
    for (const h of ctx.historicos) {
      const ocorr = h.ocorrencias.find(o => o.competencia === ctx.competencia);
      if (ocorr && ocorr.valor > salarioBase) salarioBase = ocorr.valor;
    }

    // 15 minutes per day with overtime (0.25h × days with overtime)
    const cp = ctx.cartaoPonto.find(c => c.competencia === ctx.competencia);
    const diasComHE = cp ? (cp.horas_extras_50 > 0 || cp.horas_extras_100 > 0 ? cp.dias_trabalhados : 0) : 0;
    const horas = new Decimal(diasComHE).times(0.25).toNumber();

    return {
      base: salarioBase,
      baseSource: `salario:${ctx.competencia}`,
      quantidade: horas,
      quantidadeSource: `estimado:dias_com_he×0.25:${diasComHE}`,
      divisor: ctx.cargaHoraria || 220,
      divisorSource: `carga_horaria:${ctx.cargaHoraria}`,
      multiplicador: verba.multiplicador || 1.5,
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
      { targetVerba: 'DSR', tipo: 'dsr', baseMultiplier: 1, divisor: 1 },
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
      { campo: 'horas_art384', valor: inputs.quantidade, fonte: inputs.quantidadeSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:art384' },
    ];
  }
}

registerVerbaModule(new IntrajornadaModule());
registerVerbaModule(new InterjornadaModule());
registerVerbaModule(new Art384Module());
