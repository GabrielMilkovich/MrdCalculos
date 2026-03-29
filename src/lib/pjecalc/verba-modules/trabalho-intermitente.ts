/**
 * =====================================================
 * MÓDULO: Trabalho Intermitente
 * =====================================================
 * Art. 443 §3° e 452-A CLT (Reforma Trabalhista)
 *
 * Trabalhador é convocado para períodos específicos.
 * Quando convocado: salário + férias proporcionais + 1/3 +
 * 13° proporcional + FGTS + INSS.
 * Base de cálculo: horas/dias efetivamente trabalhados do cartão de ponto.
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

export class TrabalhoIntermitenteModule implements VerbaModule {
  readonly id = 'TRABALHO_INTERMITENTE';
  readonly nome = 'Trabalho Intermitente';
  readonly familia = 'variavel' as const;
  readonly dependencias: string[] = [];

  canApply(_ctx: VerbaModuleContext, verba: PjeVerba): boolean {
    const name = verba.nome.toUpperCase();
    return name.includes('INTERMITENTE');
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Resolve base salary (hourly/daily rate) from salary history
    let base = 0;
    let baseSource = 'nenhum';

    for (const hist of ctx.historicos) {
      const ocorr = hist.ocorrencias.find(o => o.competencia === ctx.competencia);
      if (ocorr) {
        base = ocorr.valor;
        baseSource = `hist:${hist.nome}:${ctx.competencia}`;
        break;
      }
    }

    // Resolve quantity (hours/days worked) from cartao de ponto
    let quantidade = 0;
    let quantidadeSource = 'nenhum';

    const cp = ctx.cartaoPonto.find(c => c.competencia === ctx.competencia);
    if (cp) {
      // Use horas_trabalhadas if available, otherwise dias_trabalhados
      if (cp.horas_trabalhadas !== undefined && cp.horas_trabalhadas > 0) {
        quantidade = cp.horas_trabalhadas;
        quantidadeSource = `cartao_ponto:horas_trabalhadas:${ctx.competencia}`;
      } else if (cp.dias_trabalhados !== undefined && cp.dias_trabalhados > 0) {
        quantidade = cp.dias_trabalhados;
        quantidadeSource = `cartao_ponto:dias_trabalhados:${ctx.competencia}`;
      }
    }

    const divisor = verba.divisor_informado || ctx.cargaHoraria || 220;
    const multiplicador = verba.multiplicador || 1;

    return {
      base,
      baseSource,
      quantidade,
      quantidadeSource,
      divisor,
      divisorSource: verba.divisor_informado ? 'verba:divisor_informado' : 'ctx:cargaHoraria',
      multiplicador,
    };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    if (inputs.base <= 0 || inputs.divisor <= 0 || inputs.quantidade <= 0) return 0;
    // salário / divisor (carga horária) × horas trabalhadas × multiplicador
    return new Decimal(inputs.base)
      .div(inputs.divisor)
      .times(inputs.quantidade)
      .times(inputs.multiplicador)
      .toDP(2)
      .toNumber();
  }

  getReflections(_verba?: PjeVerba): ReflectionSpec[] {
    // Art. 452-A §6° CLT: ao final de cada período de prestação de serviço,
    // o empregado recebe férias proporcionais + 1/3, 13° proporcional, DSR e FGTS
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
      { campo: 'base_intermitente', valor: inputs.base, fonte: inputs.baseSource, regra: 'Art. 452-A CLT' },
      { campo: 'quantidade', valor: inputs.quantidade, fonte: inputs.quantidadeSource, observacao: 'horas/dias trabalhados' },
      { campo: 'divisor', valor: inputs.divisor, fonte: inputs.divisorSource },
      { campo: 'multiplicador', valor: inputs.multiplicador, fonte: 'verba_config' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:(base/divisor×qtd×mult)' },
    ];
  }
}

registerVerbaModule(new TrabalhoIntermitenteModule());
