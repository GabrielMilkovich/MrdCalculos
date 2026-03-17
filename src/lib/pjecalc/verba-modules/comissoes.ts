/**
 * =====================================================
 * MÓDULO: Comissões e Variáveis Comerciais
 * =====================================================
 * Suporta: comissões, diferenças, estornos, prêmios
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

// =====================================================
// COMISSÕES PRINCIPAIS
// =====================================================

export class ComissoesModule implements VerbaModule {
  readonly id = 'COMISSAO';
  readonly nome = 'Comissões';
  readonly familia = 'variavel' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const name = verba.nome.toUpperCase();
    return name.includes('COMISS') || name.includes('COMMISSION');
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Resolve base from salary history for this competência
    let base = 0;
    let baseSource = 'nenhum';

    for (const hist of ctx.historicos) {
      if (!hist.nome.toUpperCase().includes('COMISS')) continue;
      const ocorr = hist.ocorrencias.find(o => o.competencia === ctx.competencia);
      if (ocorr) {
        base = ocorr.valor;
        baseSource = `hist:${hist.nome}:${ctx.competencia}`;
        break;
      }
    }

    return {
      base,
      baseSource,
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: verba.divisor_informado || 1,
      divisorSource: `verba:divisor_informado`,
      multiplicador: verba.multiplicador || 1,
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    if (inputs.base <= 0 || inputs.divisor <= 0) return 0;
    return new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(inputs.divisor)
      .times(inputs.quantidade)
      .toDP(2)
      .toNumber();
  }

  getReflections(): ReflectionSpec[] {
    return [
      { targetVerba: 'DSR', tipo: 'dsr', baseMultiplier: 1, divisor: 1 },
      { targetVerba: '13º Salário', tipo: '13_salario', baseMultiplier: 1, divisor: 12, periodoMedia: 'ano_civil' },
      { targetVerba: 'Férias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12, periodoMedia: 'periodo_aquisitivo' },
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base_comissao', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'multiplicador', valor: inputs.multiplicador, fonte: 'verba_config' },
      { campo: 'divisor', valor: inputs.divisor, fonte: inputs.divisorSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:(base×mult/divisor)' },
    ];
  }
}

// =====================================================
// PRÊMIO / META
// =====================================================

export class PremioModule implements VerbaModule {
  readonly id = 'PREMIO';
  readonly nome = 'Prêmio/Meta';
  readonly familia = 'variavel' as const;
  readonly dependencias: string[] = [];

  canApply(_ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const name = verba.nome.toUpperCase();
    return name.includes('PRÊMIO') || name.includes('PREMIO') || name.includes('META') || name.includes('BONIF');
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    let base = 0;
    let baseSource = 'nenhum';

    for (const hist of ctx.historicos) {
      const nameUp = hist.nome.toUpperCase();
      if (!nameUp.includes('PRÊMIO') && !nameUp.includes('PREMIO') && !nameUp.includes('META')) continue;
      const ocorr = hist.ocorrencias.find(o => o.competencia === ctx.competencia);
      if (ocorr) {
        base = ocorr.valor;
        baseSource = `hist:${hist.nome}:${ctx.competencia}`;
        break;
      }
    }

    return {
      base,
      baseSource,
      quantidade: 1,
      quantidadeSource: 'fixo',
      divisor: verba.divisor_informado || 1,
      divisorSource: 'verba:divisor_informado',
      multiplicador: verba.multiplicador || 1,
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    if (inputs.base <= 0) return 0;
    return new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(inputs.divisor)
      .toDP(2)
      .toNumber();
  }

  getReflections(): ReflectionSpec[] {
    return [
      { targetVerba: '13º Salário', tipo: '13_salario', baseMultiplier: 1, divisor: 12, periodoMedia: 'ano_civil' },
      { targetVerba: 'Férias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12, periodoMedia: 'periodo_aquisitivo' },
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(_ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base_premio', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:(base×mult/divisor)' },
    ];
  }
}

registerVerbaModule(new ComissoesModule());
registerVerbaModule(new PremioModule());
