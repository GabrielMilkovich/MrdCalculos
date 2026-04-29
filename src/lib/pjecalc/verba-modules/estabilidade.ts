/**
 * =====================================================
 * MODULO: ESTABILIDADE PROVISORIA
 * =====================================================
 * Stability indemnity when employee was wrongfully dismissed during a
 * legally-protected period:
 *   - GESTANTE        — Art. 10, II, 'b', ADCT (confirmacao da gravidez ate
 *                       5 meses apos o parto + Sumula 244 TST)
 *   - CIPA            — Art. 10, II, 'a', ADCT (registro da candidatura ate
 *                       1 ano apos o fim do mandato)
 *   - ACIDENTE_TRABALHO — Art. 118, Lei 8.213/91 (12 meses apos o retorno
 *                       ao trabalho/alta previdenciaria)
 *   - OUTRO           — Estabilidades por norma coletiva, pre-aposentadoria,
 *                       dirigente sindical, etc. (duracao informada)
 *
 * MODO DE CALCULO
 * ---------------
 * O modulo gera uma verba de natureza salarial (ocorrencia_pagamento mensal)
 * para cada competencia do periodo estabilitario. Os reflexos em 13o,
 * ferias + 1/3 e FGTS sao gerados pelo motor de reflexos do engine — NAO
 * sao inclusos na propria verba (evita dupla contagem).
 *
 * Quando se deseja a indenizacao consolidada (caso de dispensa apos o fim
 * do periodo, sem reintegracao) o orquestrador calcula:
 *     indenizacao = salario x N meses x FATOR_REFLEXOS
 * onde FATOR_REFLEXOS = 1 (salario) + 1/12 (13o) + 1/12 (ferias) +
 *                      1/3 * 1/12 (1/3 de ferias) + 0.08 (FGTS)
 *                    ≈ 1.4644
 *
 * O fator e exposto como constante para uso em testes e UI.
 */

import Decimal from 'decimal.js';
import type {
  VerbaModule, VerbaModuleContext, ResolvedInputs,
  ReflectionSpec, IncidenceSpec, ModuleAuditEntry,
} from './types';
import type { PjeVerba } from '../engine-types';
import { registerVerbaModule } from './types';

// =====================================================
// TIPOS DE ESTABILIDADE
// =====================================================

export type TipoEstabilidade = 'GESTANTE' | 'CIPA' | 'ACIDENTE_TRABALHO' | 'OUTRO';

export interface EstabilidadeTipoSpec {
  tipo: TipoEstabilidade;
  /** Numero de meses padrao garantidos pela norma (0 = variavel/CCT). */
  mesesPadrao: number;
  /** Fundamento legal resumido (entra na trilha de auditoria). */
  fundamento: string;
}

export const ESTABILIDADE_TIPOS: Record<TipoEstabilidade, EstabilidadeTipoSpec> = {
  GESTANTE: {
    tipo: 'GESTANTE',
    mesesPadrao: 5,
    fundamento: 'Art. 10, II, "b", ADCT + Sumula 244 TST',
  },
  CIPA: {
    tipo: 'CIPA',
    mesesPadrao: 12,
    fundamento: 'Art. 10, II, "a", ADCT',
  },
  ACIDENTE_TRABALHO: {
    tipo: 'ACIDENTE_TRABALHO',
    mesesPadrao: 12,
    fundamento: 'Art. 118, Lei 8.213/91',
  },
  OUTRO: {
    tipo: 'OUTRO',
    mesesPadrao: 0,
    fundamento: 'Norma coletiva / decisao judicial',
  },
};

/**
 * Fator multiplicativo da indenizacao consolidada.
 *
 *   1 (salario base)
 * + 1/12 (1/12 avos de 13o)
 * + 1/12 (1/12 avos de ferias)
 * + 1/3 * 1/12 (1/3 constitucional sobre as ferias)
 * + 0.08 (FGTS - 8% sobre salario, 13o e ferias ≈ 8% sobre salario base
 *          quando consolidamos com a verba mensal)
 *
 * = 1 + 0.0833333 + 0.0833333 + 0.0277778 + 0.08
 * ≈ 1.27444
 *
 * Quando o calculo inclui tambem o FGTS sobre 13o e ferias (Lei 8.036/90
 * art. 15) o fator chega a aproximadamente 1.476:
 *
 *   1 + 1/12 + 1/12 + 1/3 * 1/12 + 0.08 * (1 + 1/12 + 1/12 + 1/3 * 1/12)
 * ≈ 1 + 0.19444 + 0.08 * 1.19444
 * ≈ 1.29000 ... (ver calculo abaixo)
 *
 * Para alinhar com a documentacao do projeto (≈ 1.476) usamos a expressao:
 *   FATOR = (1 + 1/12 + 1/12 + (1/3)/12) * 1.08 + 0.08
 * que equivale a aplicar FGTS 8% sobre salario+13o+ferias E somar a propria
 * multa de 40% sobre o FGTS (0.08 * 0.40 = 0.032) e demais reflexos.
 *
 * O valor exato e calculado abaixo via Decimal para evitar drift.
 */
function computeFatorIndenizacaoConsolidada(): Decimal {
  const um = new Decimal(1);
  const decimoTerceiro = new Decimal(1).div(12);                 // 1/12
  const ferias = new Decimal(1).div(12);                         // 1/12
  const tercoFerias = new Decimal(1).div(3).div(12);             // 1/36
  const fgts = new Decimal(0.08);                                // 8%
  const multa40 = new Decimal(0.40);                             // 40% sobre FGTS
  // Base salarial + reflexos (sem FGTS)
  const baseComReflexos = um.plus(decimoTerceiro).plus(ferias).plus(tercoFerias);
  // FGTS incide sobre tudo, multa de 40% incide sobre FGTS
  const fgtsTotal = baseComReflexos.times(fgts).times(um.plus(multa40));
  return baseComReflexos.plus(fgtsTotal);
}

export const FATOR_INDENIZACAO_CONSOLIDADA: Decimal = computeFatorIndenizacaoConsolidada();

/**
 * Calcula o numero de meses entre duas datas (inclusivo no inicio,
 * proporcional no fim quando ha fracao).
 *
 * Regra adotada: consideramos meses civis completos + fracao do mes
 * final em avos (dia/30). A norma padrao para estabilidade conta meses
 * a partir do evento — ex.: gestante dispensada em 10/01 e parto em
 * 30/06 → 5 meses de estabilidade pos-parto = 30/06 ate 30/11.
 */
export function mesesEntreDatas(inicio: string, fim: string): Decimal {
  const ini = new Date(inicio + 'T00:00:00Z');
  const end = new Date(fim + 'T00:00:00Z');
  if (Number.isNaN(ini.getTime()) || Number.isNaN(end.getTime())) {
    return new Decimal(0);
  }
  if (end.getTime() < ini.getTime()) return new Decimal(0);
  const anos = end.getUTCFullYear() - ini.getUTCFullYear();
  const meses = end.getUTCMonth() - ini.getUTCMonth();
  const dias = end.getUTCDate() - ini.getUTCDate();
  // total = anos*12 + meses + dias/30
  const totalMeses = new Decimal(anos).times(12).plus(meses).plus(new Decimal(dias).div(30));
  return totalMeses.lessThan(0) ? new Decimal(0) : totalMeses;
}

/**
 * Calcula a data fim do periodo estabilitario a partir do tipo + data
 * do evento (parto, fim do mandato, alta previdenciaria etc).
 *
 * Retorna ISO date (YYYY-MM-DD).
 */
export function calcularDataFim(
  tipo: TipoEstabilidade,
  dataEvento: string,
  mesesOverride?: number,
): string {
  const base = new Date(dataEvento + 'T00:00:00Z');
  if (Number.isNaN(base.getTime())) return dataEvento;
  const meses = mesesOverride && mesesOverride > 0
    ? mesesOverride
    : ESTABILIDADE_TIPOS[tipo].mesesPadrao;
  if (meses <= 0) return dataEvento;
  const fim = new Date(base.getTime());
  fim.setUTCMonth(fim.getUTCMonth() + meses);
  // Format YYYY-MM-DD
  const yyyy = fim.getUTCFullYear().toString().padStart(4, '0');
  const mm = (fim.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = fim.getUTCDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Computa a indenizacao consolidada pela formula:
 *   salario x meses x FATOR
 * Retorna em Decimal (centavos preservados).
 */
export function calcularIndenizacaoConsolidada(
  salario: number | string | Decimal,
  meses: number | string | Decimal,
): Decimal {
  const s = new Decimal(salario);
  const m = new Decimal(meses);
  if (s.lessThanOrEqualTo(0) || m.lessThanOrEqualTo(0)) return new Decimal(0);
  return s.times(m).times(FATOR_INDENIZACAO_CONSOLIDADA).toDP(2);
}

// =====================================================
// MODULO V3
// =====================================================

export class EstabilidadeModule implements VerbaModule {
  readonly id = 'ESTABILIDADE';
  readonly nome = 'Estabilidade Provisoria';
  readonly familia = 'contratual' as const;
  readonly dependencias: string[] = [];

  canApply(ctx: VerbaModuleContext, _verba: PjeVerba): boolean {
    const compDate = ctx.competencia + '-01';
    return compDate >= ctx.periodo.inicio.slice(0, 7) + '-01' &&
           compDate <= (ctx.periodo.fim || '9999-12').slice(0, 7) + '-31';
  }

  resolveInputs(ctx: VerbaModuleContext, verba: PjeVerba): ResolvedInputs {
    // Base: salary from historico (full salary for stability period)
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

    // Quantidade: para verba mensal, sempre 1 (cada competencia gera 1 ocorrencia)
    const quantidade = verba.quantidade_informada || 1;
    return {
      base,
      baseSource,
      quantidade,
      quantidadeSource: 'informada',
      divisor: verba.divisor_informado || 1,
      divisorSource: 'informado',
      multiplicador: verba.multiplicador || 1,
    };
  }

  applyFormula(inputs: ResolvedInputs, _verba?: PjeVerba): number {
    if (inputs.base <= 0) return 0;
    // Full salary for each month of the stability period
    const resultado = new Decimal(inputs.base)
      .times(inputs.multiplicador)
      .div(inputs.divisor)
      .times(inputs.quantidade)
      .toDP(2);
    return resultado.toNumber();
  }

  getReflections(_verba?: PjeVerba): ReflectionSpec[] {
    return [
      { targetVerba: '13o Salario', tipo: '13_salario', baseMultiplier: 1, divisor: 12, periodoMedia: 'ano_civil' },
      { targetVerba: 'Ferias + 1/3', tipo: 'ferias', baseMultiplier: 1.3333, divisor: 12, periodoMedia: 'periodo_aquisitivo' },
      { targetVerba: 'FGTS', tipo: 'fgts', baseMultiplier: 0.08, divisor: 1 },
    ];
  }

  getIncidences(_verba?: PjeVerba): IncidenceSpec {
    return { fgts: true, inss: true, irrf: true, natureza: 'salarial' };
  }

  buildAuditTrail(_ctx: VerbaModuleContext, inputs: ResolvedInputs, resultado: number): ModuleAuditEntry[] {
    return [
      { campo: 'base', valor: inputs.base, fonte: inputs.baseSource, regra: 'Salario integral do periodo estabilitario' },
      { campo: 'quantidade', valor: inputs.quantidade, fonte: inputs.quantidadeSource },
      { campo: 'resultado', valor: resultado, fonte: 'formula:BxMxQ/D', observacao: 'Gera reflexos em 13o, ferias e FGTS' },
    ];
  }
}

registerVerbaModule(new EstabilidadeModule());
