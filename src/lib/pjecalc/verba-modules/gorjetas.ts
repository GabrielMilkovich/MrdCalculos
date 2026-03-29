/**
 * =====================================================
 * MÓDULO: Gorjetas
 * =====================================================
 * Art. 457 CLT — gorjetas integram o salário para todos os fins.
 *
 * Valor mensal obtido do histórico salarial ou cartão de ponto.
 * Natureza remuneratória: gera reflexos em 13°, férias, FGTS, DSR.
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class GorjetasModule implements VerbaModule {
  readonly id = 'GORJETA';
  readonly nome = 'Gorjetas';
  readonly familia = 'variavel' as const;
  readonly dependencias: string[] = [];

  canApply(_ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const name = verba.nome.toUpperCase();
    return name.includes('GORJETA') || name.includes('GORJET');
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    let base = 0;
    let baseSource = 'nenhum';

    // Try historico salarial first (specific gorjeta entries)
    for (const hist of ctx.historicos) {
      if (!hist.nome.toUpperCase().includes('GORJETA')) continue;
      const ocorr = hist.ocorrencias.find(o => o.competencia === ctx.competencia);
      if (ocorr) {
        base = ocorr.valor;
        baseSource = `hist:${hist.nome}:${ctx.competencia}`;
        break;
      }
    }

    // Fallback: try cartao de ponto gorjeta field
    if (base <= 0) {
      const cp = ctx.cartaoPonto.find(c => c.competencia === ctx.competencia);
      if (cp && (cp as Record<string, unknown>).gorjetas !== undefined) {
        base = Number((cp as Record<string, unknown>).gorjetas) || 0;
        baseSource = `cartao_ponto:gorjetas:${ctx.competencia}`;
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

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    if (inputs.base <= 0 || inputs.divisor <= 0) return 0;
    return new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(inputs.divisor)
      .times(inputs.quantidade)
      .toDP(2)
      .toNumber();
  }

  getReflections(_verba?: PjeVerba): ReflectionSpec[] {
    // Art. 457 CLT: gorjetas integram salário — reflexos em todos os títulos
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
      { campo: 'base_gorjeta', valor: inputs.base, fonte: inputs.baseSource, regra: 'Art. 457 CLT' },
      { campo: 'multiplicador', valor: inputs.multiplicador, fonte: 'verba_config' },
      { campo: 'divisor', valor: inputs.divisor, fonte: inputs.divisorSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:(base×mult/divisor)' },
    ];
  }
}

registerVerbaModule(new GorjetasModule());
