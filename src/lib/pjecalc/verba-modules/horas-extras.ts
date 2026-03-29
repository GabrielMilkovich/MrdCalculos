/**
 * =====================================================
 * MÓDULO: HORAS EXTRAS (50%, 100%, Feriados)
 * =====================================================
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';

export class HorasExtras50Module implements VerbaModule {
  readonly id = 'HE_50';
  readonly nome = 'Horas Extras 50%';
  readonly familia = 'jornada' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    // Applies if the verba is configured as HE and period includes this competência
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: from salary history
    let base = 0;
    let baseSource = 'fallback';
    
    if (verba.base_calculo?.historicos?.length) {
      const histNome = verba.base_calculo.historicos[0];
      const hist = ctx.historicos.find(h => h.id === histNome || h.nome === histNome);
      if (hist) {
        // Look for monthly entry
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

    // Quantidade: from cartão de ponto
    let quantidade = verba.quantidade_informada || 0;
    let quantidadeSource = 'informada';
    
    if (verba.tipo_quantidade === 'cartao_ponto') {
      const cp = ctx.cartaoPonto.find(c => c.competencia === ctx.competencia);
      if (cp) {
        quantidade = (cp.horas_extras_50 || 0);
        quantidadeSource = 'cartao_ponto:horas_extras_50';
      } else {
        quantidade = 0;
        quantidadeSource = 'cartao_ponto:AUSENTE';
      }
    }

    // Divisor
    const divisor = verba.divisor_informado || ctx.cargaHoraria || 220;
    const divisorSource = verba.tipo_divisor === 'carga_horaria' ? 'carga_horaria' : 'informado';

    return {
      base,
      baseSource,
      quantidade,
      quantidadeSource,
      divisor,
      divisorSource,
      multiplicador: verba.multiplicador || 1.5,
    };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    const base = new Decimal(inputs.base);
    const div = new Decimal(inputs.divisor);
    const mult = new Decimal(inputs.multiplicador);
    const qtd = new Decimal(inputs.quantidade);

    // PJe-Calc formula: (Base / Divisor) × Mult × Qtd (truncado a cada etapa)
    const valorHora = base.div(div).toDP(2);
    const comMult = valorHora.times(mult).toDP(2);
    const resultado = comMult.times(qtd).toDP(2);

    return resultado.toNumber();
  }

  getReflections(verba: PjeVerba): ReflectionSpec[] {
    return [
      { targetVerba: 'DSR', tipo: 'dsr', baseMultiplier: 1, divisor: 26 },
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
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'divisor', valor: inputs.divisor, fonte: inputs.divisorSource },
      { campo: 'multiplicador', valor: inputs.multiplicador, fonte: 'config_verba' },
      { campo: 'quantidade', valor: inputs.quantidade, fonte: inputs.quantidadeSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:(B/D)×M×Q' },
    ];
  }
}

export class HorasExtras100Module implements VerbaModule {
  readonly id = 'HE_100';
  readonly nome = 'Horas Extras 100%';
  readonly familia = 'jornada' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Same as HE50 but with 100% multiplier and horas_extras_100
    const he50 = new HorasExtras50Module();
    const base = he50.resolveInputs(ctx, verba);

    // Override quantidade for 100%
    let quantidade = verba.quantidade_informada || 0;
    let quantidadeSource = 'informada';
    if (verba.tipo_quantidade === 'cartao_ponto') {
      const cp = ctx.cartaoPonto.find(c => c.competencia === ctx.competencia);
      if (cp) {
        quantidade = (cp.horas_extras_100 || 0);
        quantidadeSource = 'cartao_ponto:horas_extras_100';
      }
    }

    return { ...base, quantidade, quantidadeSource, multiplicador: verba.multiplicador || 2.0 };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    return new HorasExtras50Module().applyFormula(inputs);
  }

  getReflections(verba: PjeVerba): ReflectionSpec[] {
    return new HorasExtras50Module().getReflections(verba);
  }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return new HorasExtras50Module().buildAuditTrail(ctx, inputs, resultado);
  }
}

// Register modules
import { registerVerbaModule } from './types';
registerVerbaModule(new HorasExtras50Module());
registerVerbaModule(new HorasExtras100Module());
