/**
 * =====================================================
 * MÓDULOS: VERBAS RESCISÓRIAS
 * =====================================================
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

// ── Saldo de Salário ──
export class SaldoSalarioModule implements VerbaModule {
  readonly id = 'SALDO_SAL';
  readonly nome = 'Saldo de Salário';
  readonly familia = 'rescisoria' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext): boolean {
    return !!ctx.demissao;
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    let base = 0;
    let baseSource = 'nenhum';
    
    if (ctx.historicos.length > 0) {
      const hist = ctx.historicos[0];
      base = hist.valor_informado || 0;
      baseSource = `hist:${hist.nome}`;
    }

    // Art. 64 CLT: dias trabalhados no mês da demissão, máximo 30
    const demDate = ctx.demissao ? new Date(ctx.demissao) : new Date();
    const dias = Math.min(demDate.getDate(), 30);

    return {
      base, baseSource,
      quantidade: dias,
      quantidadeSource: `art64_clt:dia_demissao=${demDate.getDate()}`,
      divisor: 30,
      divisorSource: 'art64_clt:mes_comercial',
      multiplicador: 1,
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    return new Decimal(inputs.base)
      .div(inputs.divisor).toDP(2)
      .times(inputs.quantidade).toDP(2)
      .toNumber();
  }

  getReflections(): ReflectionSpec[] {
    return [{ targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 }];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'dias', valor: inputs.quantidade, fonte: inputs.quantidadeSource, regra: 'Art. 64 CLT' },
      { campo: 'divisor', valor: 30, fonte: 'art64_clt', regra: 'Mês comercial = 30 dias' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:base/30×dias' },
    ];
  }
}

// ── Aviso Prévio ──
export class AvisoPrevioModule implements VerbaModule {
  readonly id = 'AVISO_PREVIO';
  readonly nome = 'Aviso Prévio Indenizado';
  readonly familia = 'rescisoria' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext): boolean {
    return !!ctx.demissao;
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    let base = 0;
    let baseSource = 'nenhum';
    if (ctx.historicos.length > 0) {
      base = ctx.historicos[0].valor_informado || 0;
      baseSource = `hist:${ctx.historicos[0].nome}`;
    }

    // Lei 12.506/2011: 30 dias + 3 por ano de serviço, máximo 90
    const adm = new Date(ctx.admissao);
    const dem = new Date(ctx.demissao!);
    const anos = Math.floor((dem.getTime() - adm.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const dias = Math.min(90, 30 + (anos * 3));

    return {
      base, baseSource,
      quantidade: dias,
      quantidadeSource: `lei_12506:anos=${anos}`,
      divisor: 30,
      divisorSource: 'mes_comercial',
      multiplicador: 1,
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    return new Decimal(inputs.base)
      .div(inputs.divisor).toDP(2)
      .times(inputs.quantidade).toDP(2)
      .toNumber();
  }

  getReflections(): ReflectionSpec[] {
    return [
      { targetVerba: '13º Salário', tipo: '13_salario', baseMultiplier: 1, divisor: 12 },
      { targetVerba: 'Férias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12 },
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: true, inss: false, irrf: false, natureza: 'indenizatoria' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'dias_aviso', valor: inputs.quantidade, fonte: inputs.quantidadeSource, regra: 'Lei 12.506/2011' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:base/30×dias' },
    ];
  }
}

registerVerbaModule(new SaldoSalarioModule());
registerVerbaModule(new AvisoPrevioModule());
