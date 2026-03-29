/**
 * =====================================================
 * MODULO: ADICIONAL NOTURNO (Art. 73 CLT)
 * =====================================================
 * 20% sobre horas noturnas (22h-5h)
 * Hora noturna reduzida: 52min30s = 1 hora (fator 8/7)
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class AdicionalNoturnoModule implements VerbaModule {
  readonly id = 'ADIC_NOTURNO';
  readonly nome = 'Adicional Noturno';
  readonly familia = 'jornada' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, verba: PjeVerba): boolean {
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

    // Quantidade: horas noturnas from cartao de ponto
    let quantidade = verba.quantidade_informada || 0;
    let quantidadeSource = 'informada';

    if (verba.tipo_quantidade === 'cartao_ponto') {
      const cp = ctx.cartaoPonto.find(c => c.competencia === ctx.competencia);
      if (cp) {
        quantidade = cp.horas_noturnas || 0;
        quantidadeSource = 'cartao_ponto:horas_noturnas';
      } else {
        quantidade = 0;
        quantidadeSource = 'cartao_ponto:AUSENTE';
      }
    }

    // Divisor: carga horaria (ajustada se hora noturna ficticia)
    let divisor = verba.divisor_informado || ctx.cargaHoraria || 220;
    const divisorSource = verba.tipo_divisor === 'carga_horaria' ? 'carga_horaria' : 'informado';

    // Hora noturna reduzida: 52min30s = fator 8/7 sobre divisor
    if (verba.hora_noturna_ficticia) {
      divisor = new Decimal(divisor).times(7).div(8).toDP(4).toNumber();
    }

    return {
      base,
      baseSource,
      quantidade,
      quantidadeSource,
      divisor,
      divisorSource,
      multiplicador: verba.multiplicador || 0.20,
      metadata: { hora_noturna_ficticia: verba.hora_noturna_ficticia },
    };
  }

  applyFormula(inputs: ResolvedInputs): number {
    if (inputs.quantidade <= 0 || inputs.divisor <= 0) return 0;
    // Formula: (Base / Divisor) x Multiplicador x Quantidade
    const valorHora = new Decimal(inputs.base).div(inputs.divisor).toDP(2);
    const comMult = valorHora.times(inputs.multiplicador).toDP(2);
    const resultado = comMult.times(inputs.quantidade).toDP(2);
    return resultado.toNumber();
  }

  getReflections(): ReflectionSpec[] {
    return [
      { targetVerba: 'DSR', tipo: 'dsr', baseMultiplier: 1, divisor: 26 },
      { targetVerba: '13o Salario', tipo: '13_salario', baseMultiplier: 1, divisor: 12, periodoMedia: 'ano_civil' },
      { targetVerba: 'Ferias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12, periodoMedia: 'periodo_aquisitivo' },
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'divisor', valor: inputs.divisor, fonte: inputs.divisorSource, regra: 'Art. 73 CLT' },
      { campo: 'multiplicador', valor: inputs.multiplicador, fonte: 'config_verba (20% adicional noturno)' },
      { campo: 'quantidade', valor: inputs.quantidade, fonte: inputs.quantidadeSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:(B/D)xMxQ' },
      ...(inputs.metadata?.hora_noturna_ficticia ? [{ campo: 'hora_noturna_ficticia', valor: 'sim', fonte: 'Art. 73 §1 CLT — 52min30s = 1h (fator 8/7)' }] : []),
    ];
  }
}

registerVerbaModule(new AdicionalNoturnoModule());
