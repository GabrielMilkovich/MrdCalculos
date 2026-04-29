/**
 * =====================================================
 * MÓDULOS: FÉRIAS VENCIDAS E PROPORCIONAIS
 * =====================================================
 * 
 * Art. 130 CLT: 30 dias para até 5 faltas, redução progressiva
 * Art. 146 CLT: férias vencidas devidas em qualquer rescisão
 * Terço constitucional (Art. 7º, XVII, CF)
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba, PjeFalta } from '../engine-types';
import { registerVerbaModule } from './types';

// ── Tabela Art. 130 CLT ──
function diasFeriasPorFaltas(faltas: number): number {
  if (faltas <= 5) return 30;
  if (faltas <= 14) return 24;
  if (faltas <= 23) return 18;
  if (faltas <= 32) return 12;
  return 0;
}

/**
 * Art. 130-A CLT (DL 2.318/87) + jurisprudencia (Sumula 46 TST analoga):
 *   Quando a falta tem flag reinicia=true (suspensao + retorno), o periodo
 *   aquisitivo de ferias REINICIA a partir da data de retorno (data_final + 1).
 *   Faltas anteriores sao desconsideradas para a redutora do art. 130 CLT.
 *
 *   Esta funcao pega a maior data_final entre faltas com reinicia=true e usa
 *   como data de inicio do periodo aquisitivo "efetivo". Filtra entao apenas
 *   faltas nao justificadas posteriores a esse marco.
 */
export function calcularInicioPeriodoAquisitivo(
  inicioOriginal: string,
  faltas: PjeFalta[],
): { inicio: string; reiniciado: boolean; faltaQueReiniciou?: string } {
  let inicio = inicioOriginal;
  let reiniciado = false;
  let faltaQueReiniciou: string | undefined;
  for (const f of faltas) {
    if (!f.reinicia) continue;
    if (f.data_final > inicio) {
      // data de retorno = data_final + 1 dia
      const retorno = new Date(f.data_final);
      retorno.setUTCDate(retorno.getUTCDate() + 1);
      const iso = retorno.toISOString().slice(0, 10);
      if (iso > inicio) {
        inicio = iso;
        reiniciado = true;
        faltaQueReiniciou = f.id;
      }
    }
  }
  return { inicio, reiniciado, faltaQueReiniciou };
}

/** Conta faltas nao justificadas que ocorrem em (ou apos) o marco do periodo aquisitivo. */
export function contarFaltasNoPeriodo(faltas: PjeFalta[], inicioPeriodo: string): number {
  return faltas.filter(f => !f.justificada && f.data_inicial >= inicioPeriodo).length;
}

function resolveBase(ctx: VerbaModuleContext): { base: number; source: string } {
  if (ctx.historicos.length > 0) {
    const hist = ctx.historicos[0];
    if (hist.tipo_valor === 'calculado' && hist.ocorrencias?.length > 0) {
      const ultimas = hist.ocorrencias.slice(-12);
      const soma = ultimas.reduce((s, o) => s + (o.valor || 0), 0);
      return { base: ultimas.length > 0 ? soma / ultimas.length : 0, source: `media_12m:${hist.nome}` };
    }
    return { base: hist.valor_informado || 0, source: `hist:${hist.nome}` };
  }
  return { base: 0, source: 'nenhum' };
}

// ── Férias Vencidas ──
export class FeriasVencidasModule implements VerbaModule {
  readonly id = 'FERIAS_VENC';
  readonly nome = 'Férias Vencidas + 1/3';
  readonly familia = 'rescisoria' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext): boolean {
    return !!ctx.demissao;
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    const { base, source } = resolveBase(ctx);

    // Art. 130-A CLT: aplicar reinicio do periodo aquisitivo se houver falta
    //   com flag reinicia=true. O marco e ctx.admissao (default) ou data de
    //   retorno da ultima falta grave.
    const { inicio: marcoPeriodo, reiniciado, faltaQueReiniciou } =
      calcularInicioPeriodoAquisitivo(ctx.admissao, ctx.faltas);

    // Contar faltas nao justificadas DENTRO do periodo aquisitivo efetivo.
    const faltasCount = contarFaltasNoPeriodo(ctx.faltas, marcoPeriodo);
    const dias = diasFeriasPorFaltas(faltasCount);

    const quantidadeSource = reiniciado
      ? `art130_clt:faltas=${faltasCount}|reiniciado=${marcoPeriodo}`
      : `art130_clt:faltas=${faltasCount}`;

    return {
      base, baseSource: source,
      quantidade: dias,
      quantidadeSource,
      divisor: 30,
      divisorSource: 'padrao',
      multiplicador: new Decimal(4).div(3).toDP(4).toNumber(), // 1/3 constitucional
      metadata: {
        faltasCount,
        tercoConstitucional: true,
        marcoPeriodoAquisitivo: marcoPeriodo,
        reiniciado,
        faltaQueReiniciou,
      },
    };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    return new Decimal(inputs.base)
      .div(inputs.divisor).toDP(2)
      .times(inputs.quantidade).toDP(2)
      .times(inputs.multiplicador).toDP(2)
      .toNumber();
  }

  getReflections(_verba?: PjeVerba): ReflectionSpec[] {
    return [
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    // Férias indenizadas: natureza indenizatória (isenta de INSS/IRRF)
    return { fgts: true, inss: false, irrf: false, natureza: 'indenizatoria' };
  }

  buildAuditTrail(_ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'dias', valor: inputs.quantidade, fonte: inputs.quantidadeSource, regra: 'Art. 130 CLT' },
      { campo: 'terco_constitucional', valor: '4/3', fonte: 'art7_xvii_cf', regra: 'Art. 7º, XVII, CF' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:base/30×dias×4/3' },
    ];
  }
}

// ── Férias Proporcionais ──
export class FeriasProporcionaisModule implements VerbaModule {
  readonly id = 'FERIAS_PROP';
  readonly nome = 'Férias Proporcionais + 1/3';
  readonly familia = 'rescisoria' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext): boolean {
    return !!ctx.demissao;
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    const { base, source } = resolveBase(ctx);

    // Avos proporcionais do período aquisitivo incompleto
    const admDate = new Date(ctx.admissao);
    const demDate = new Date(ctx.demissao!);

    // Último aniversário de admissão antes da demissão
    let ultimoAniversario = new Date(admDate);
    while (
      new Date(ultimoAniversario.getFullYear() + 1, ultimoAniversario.getMonth(), ultimoAniversario.getDate()) <= demDate
    ) {
      ultimoAniversario = new Date(ultimoAniversario.getFullYear() + 1, ultimoAniversario.getMonth(), ultimoAniversario.getDate());
    }

    let avos = 0;
    for (let m = 0; m < 12; m++) {
      const mesRef = new Date(ultimoAniversario.getFullYear(), ultimoAniversario.getMonth() + m, ultimoAniversario.getDate());
      if (mesRef > demDate) break;
      const mesFim = new Date(ultimoAniversario.getFullYear(), ultimoAniversario.getMonth() + m + 1, ultimoAniversario.getDate());
      const fim = demDate < mesFim ? demDate : mesFim;
      const dias = Math.floor((fim.getTime() - mesRef.getTime()) / 86400000);
      if (dias >= 15) avos++;
    }

    return {
      base, baseSource: source,
      quantidade: avos,
      quantidadeSource: `avos_proporcional`,
      divisor: 12,
      divisorSource: 'art146_clt',
      multiplicador: new Decimal(4).div(3).toDP(4).toNumber(),
      metadata: { avos, tercoConstitucional: true },
    };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    return new Decimal(inputs.base)
      .div(inputs.divisor).toDP(2)
      .times(inputs.quantidade).toDP(2)
      .times(inputs.multiplicador).toDP(2)
      .toNumber();
  }

  getReflections(_verba?: PjeVerba): ReflectionSpec[] {
    return [
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    return { fgts: true, inss: false, irrf: false, natureza: 'indenizatoria' };
  }

  buildAuditTrail(_ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource },
      { campo: 'avos', valor: inputs.quantidade, fonte: inputs.quantidadeSource, regra: 'Art. 146 CLT' },
      { campo: 'divisor', valor: 12, fonte: 'art146_clt' },
      { campo: 'terco_constitucional', valor: '4/3', fonte: 'art7_xvii_cf' },
      { campo: 'resultado', valor: resultado, fonte: 'formula:base/12×avos×4/3' },
    ];
  }
}

registerVerbaModule(new FeriasVencidasModule());
registerVerbaModule(new FeriasProporcionaisModule());
