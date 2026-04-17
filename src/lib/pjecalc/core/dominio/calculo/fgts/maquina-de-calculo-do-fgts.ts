/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDoFgts
 * Porte 1:1 (essencial) de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.MaquinaDeCalculoDoFgts
 *
 * Ref Java: pjecalc-fonte/negocio/.../calculo/fgts/MaquinaDeCalculoDoFgts.java
 *
 * ## Escopo
 * O Java original (270+ LOC) delega a TabelaDeCorrecaoMonetaria + HistoricoSalarial
 * + OcorrenciaDeVerba para popular as ocorrências de FGTS com:
 *   - baseHistorico / depositado calculados (quando CALCULADA)
 *   - baseVerba / baseVerbaSemAvisoPrevio (processar ocorrências de verba)
 *   - indiceAcumulado (pela data de liquidação)
 *   - indiceAcumuladoDaMulta (pela data de demissão)
 *
 * No port TS, quando rodamos HEADLESS (sem o domínio Calculo completo), o
 * cliente é responsável por já ter preenchido baseHistorico/baseVerba e as
 * taxas. A máquina aqui então aplica:
 *   - fator JAM mês-a-mês a partir da competência (TR + 0,2466%/mês composto)
 *   - calcularJuros (percentual fixo da demissão ou por ocorrência)
 *
 * Quando o domínio Calculo estiver disponível, a máquina delega para
 * TabelaDeCorrecaoMonetaria (implementação original 1:1 em TS já existe
 * em core/dominio/verbacalculo/tabela-de-correcao-monetaria.ts).
 */
import Decimal from 'decimal.js';
import { naoNulo, nulo, arredondarValorMonetario } from '../../../base/comum/utils';
import type { Fgts, OcorrenciaDeFgts } from './fgts';
import { TipoDeCorrecaoDoFgtsEnum } from './operacao-de-fgts';
import type { OperacaoDeFgts } from './operacao-de-fgts';

/**
 * Juros JAM mensais = 3% a.a. → 0,2466%/mês (capitalizado).
 * Espelha a constante usada no bloco JAM do PJe-Calc (Caixa/FGTS).
 *
 * Deriva de (1.03)^(1/12) − 1 = 0.00246627… ≈ 0,002466
 */
export const JAM_MENSAL = new Decimal('0.002466');

/**
 * Opções de contexto para a máquina. Permite injetar:
 *  - TR mensal por competência YYYY-MM (para fator JAM real).
 *  - Fallback para 0 quando competência ausente.
 */
export interface IContextoMaquinaFgts {
  /** Mapa de TR mensal em frações (0.0012 = 0.12%). Se undefined, TR=0. */
  trMensal?: Record<string, number>;
  /** Data de liquidação — usada como fim da capitalização JAM. */
  dataDeLiquidacao: Date;
  /** Data de demissão (opcional) — usada para indiceAcumuladoDaMulta. */
  dataDemissao?: Date;
}

/**
 * Formata Date em YYYY-MM (UTC-safe).
 */
function ym(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${m.toString().padStart(2, '0')}`;
}

/**
 * Itera meses do início (inclusive) até o fim (exclusive) e retorna YYYY-MM.
 */
function mesesEntre(inicio: Date, fim: Date): string[] {
  const ms: string[] = [];
  const a = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1));
  const b = new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), 1));
  while (a.getTime() < b.getTime()) {
    ms.push(ym(a));
    a.setUTCMonth(a.getUTCMonth() + 1);
  }
  return ms;
}

/**
 * Calcula o fator JAM acumulado entre duas datas:
 *   fator = ∏ (1 + TR_mes + 0,002466)
 *
 * Se TR não existe para o mês → assume 0 (política do PJe-Calc pós-2017).
 *
 * Mês da competência NÃO é capitalizado (a correção começa no mês seguinte).
 */
export function fatorJamAcumulado(
  competencia: Date,
  dataFim: Date,
  trMensal: Record<string, number> | undefined
): Decimal {
  const meses = mesesEntre(competencia, dataFim);
  if (meses.length === 0) return new Decimal(1);

  let fator = new Decimal(1);
  for (const m of meses) {
    const tr = trMensal?.[m] ?? 0;
    // TR_MENSAL em indices-fallback está em PERCENTUAL (0.12 = 0,12%/mês).
    // Converte para fração.
    const trFrac = new Decimal(tr).div(100);
    const mensal = new Decimal(1).plus(trFrac).plus(JAM_MENSAL);
    fator = fator.times(mensal);
  }
  return fator;
}

/**
 * MaquinaDeCalculoDoFgts — orquestra a liquidação do FGTS.
 */
export class MaquinaDeCalculoDoFgts {
  private fgts: Fgts;
  private contexto: IContextoMaquinaFgts | null = null;

  constructor(fgts: Fgts) {
    this.fgts = fgts;
  }

  setContexto(ctx: IContextoMaquinaFgts): void {
    this.contexto = ctx;
  }

  getFgts(): Fgts { return this.fgts; }
  setFgts(f: Fgts): void { this.fgts = f; }

  /**
   * liquidar — porte simplificado de MaquinaDeCalculoDoFgts.liquidar (Java 49).
   *
   * No Java, este método:
   *  1. gera ocorrências se vazias
   *  2. carrega tabelas de correção (JAM / trabalhista / combinada)
   *  3. popula baseHistorico / depositado (se CALCULADA)
   *  4. processa baseVerba (ocorrência de verba)
   *  5. seta indiceAcumulado (liquidação) e indiceAcumuladoDaMulta (demissão)
   *
   * Em TS headless assumimos que as ocorrências já têm base/depositado e
   * calculamos apenas os índices JAM (mês-a-mês).
   */
  liquidar(): void {
    if (this.contexto === null) {
      // Contexto ausente: delega para Fgts.liquidar() que usa lógica simples
      // (totaliza diferenças + multa sobre o total corrigido já calculado).
      this.fgts.liquidarSemCorrecao();
      return;
    }

    const ctx = this.contexto;
    const ocs = this.fgts.getOcorrencias();
    for (const oc of ocs) {
      const fatorLiq = fatorJamAcumulado(oc.competencia, ctx.dataDeLiquidacao, ctx.trMensal);
      oc.indiceAcumulado = fatorLiq;

      // diferencaCorrigida = diferenca * fator (arredondado a 2 casas)
      const diff = oc.diferenca;
      oc.diferencaCorrigida = arredondarValorMonetario(diff.times(fatorLiq));

      // indiceAcumuladoDaMulta — pela data de demissão (se existir)
      if (naoNulo(ctx.dataDemissao)) {
        oc.indiceAcumuladoDaMulta = fatorJamAcumulado(oc.competencia, ctx.dataDemissao, ctx.trMensal);
      } else {
        oc.indiceAcumuladoDaMulta = new Decimal(1);
      }
    }

    // Operações (depósitos/saques) — corrige pelo JAM
    for (const op of this.fgts.getOperacoesDeFgts()) {
      const fator = fatorJamAcumulado(op.getCompetencia(), ctx.dataDeLiquidacao, ctx.trMensal);
      op.setIndiceAcumulado(fator);
      if (naoNulo(ctx.dataDemissao)) {
        op.setIndiceAcumuladoDaMulta(
          fatorJamAcumulado(op.getCompetencia(), ctx.dataDemissao, ctx.trMensal)
        );
      } else {
        op.setIndiceAcumuladoDaMulta(new Decimal(1));
      }
    }

    // Índice para multa (usa data de demissão)
    if (naoNulo(ctx.dataDemissao) && this.fgts.isDeveCobrarMulta()) {
      const fatorDemissao = fatorJamAcumulado(
        // competência da admissão (periodoInicial) até demissão
        this.fgts.getPeriodoInicial() ?? ocs[0]?.competencia ?? ctx.dataDemissao,
        ctx.dataDemissao,
        ctx.trMensal,
      );
      this.fgts.setIndiceMulta(fatorDemissao);
    }

    // Delega consolidação para Fgts.liquidar (totaliza + multa)
    this.fgts.liquidarAposCorrecao();
  }

  /**
   * calcularJuros (Java 239) — setta taxa da demissão/liquidação em todas
   * as ocorrências e na taxaDeJurosParaDataDemissao do Fgts.
   *
   * Em TS headless não há TabelaDeJurosDeFgts; o cliente passa a taxa final.
   */
  calcularJuros(taxaDemissao: Decimal | null = null): void {
    this.fgts.setTaxaDeJurosParaDataDemissao(taxaDemissao);
    if (this.fgts.isSomenteJurosJAM()) {
      for (const oc of this.fgts.getOcorrencias()) {
        oc.taxaDeJuros = null;
      }
      return;
    }
    for (const oc of this.fgts.getOcorrencias()) {
      oc.taxaDeJuros = taxaDemissao;
    }
    if (this.fgts.getDeduzirDoFGTS()) {
      for (const op of this.fgts.getOperacoesDeFgts()) {
        op.setTaxaDeJuros(taxaDemissao);
      }
    }
  }
}

export { TipoDeCorrecaoDoFgtsEnum } from './operacao-de-fgts';
export type { OperacaoDeFgts } from './operacao-de-fgts';
