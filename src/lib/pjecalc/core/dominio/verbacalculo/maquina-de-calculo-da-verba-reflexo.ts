/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDaVerbaReflexo
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculoDaVerbaReflexo
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/MaquinaDeCalculoDaVerbaReflexo.java (~63 linhas)
 *
 * Além do porte 1:1 dos métodos de delegação (obterValorDaBase / obterValorDoDivisor
 * / obterValorDoMultiplicador / ...), esta classe expõe uma API estática que
 * resolve o problema de duplicação de reflexos detectado no v3 (13º sobre X com
 * mesmo valor de X, causando overshoot em 3-5 dos 17 PJCs de paridade).
 *
 * Essência (fórmula base):
 *   devido_reflexo(mes) = base_reflexo(mes) * multiplicador / divisor
 *
 * onde base_reflexo é resolvida conforme `ComportamentoDoReflexo`:
 *   - VALOR_MENSAL            → valor-base da MESMA competência
 *   - MEDIA_PELA_QUANTIDADE   → média aritmética dos valores-base no período
 *   - MEDIA_PELO_VALOR        → média aritmética dos valores-base no período
 *   - MEDIA_PELO_VALOR_CORRIG → média aritmética dos valores-base corrigidos
 *   (NAO_APLICAR / outros    → 0)
 *
 * O `PeriodoDaMediaDoReflexoEnum` define a janela da média:
 *   - PERIODO_AQUISITIVO                → ctx.periodoAquisitivoInicio..Fim
 *   - ANO_CIVIL                         → 1º jan..31 dez do ano da competência
 *   - ULTIMOS_DOZE_MESES_DO_CONTRATO    → últimos 12 meses dentro de admissao..demissao
 *   - DOZE_MESES_ANTERIORES_AO_VENCIMENTO_DA_PARCELA → 12 meses anteriores ao mês corrente
 *
 * Fração de mês (último mês parcial), via `TratamentoDaFracaoDeMesDoReflexoEnum`:
 *   - MANTER                        → avo proporcional (dias/30)
 *   - INTEGRALIZAR                  → sempre 1 avo (arredonda pra cima)
 *   - DESPREZAR                     → sempre 0 avos
 *   - DESPREZAR_MENOR_QUE_15_DIAS   → 1 se dias >= 15, senão 0
 */
import Decimal from 'decimal.js';
import type { Reflexo } from './reflexo';
import { VerbaDeCalculo } from './verba-de-calculo';
import { OcorrenciaDeVerba } from '../ocorrenciaverba/ocorrencia-de-verba';
import {
  ComportamentoDoReflexoEnum,
  ComportamentoDoReflexoEnumFull,
  PeriodoDaMediaDoReflexoEnum,
  TratamentoDaFracaoDeMesDoReflexoEnum,
} from '../../constantes/enums';

/** Contexto com as datas de apoio necessárias à resolução de janela de média. */
export interface ReflexoContext {
  /** Início do período aquisitivo (ex.: 13º / férias). Obrigatório para PERIODO_AQUISITIVO. */
  periodoAquisitivoInicio?: Date;
  /** Fim do período aquisitivo. */
  periodoAquisitivoFim?: Date;
  /** Admissão do empregado (limita `ULTIMOS_DOZE_MESES_DO_CONTRATO`). */
  dataAdmissao: Date;
  /** Demissão (limita `ULTIMOS_DOZE_MESES_DO_CONTRATO`). */
  dataDemissao: Date;
  /** Data final de liquidação (fallback). */
  dataLiquidacao: Date;
}

/** Comportamento aceito (aceita tanto o enum curto quanto o "Full"). */
type ComportamentoAceito =
  | ComportamentoDoReflexoEnum
  | ComportamentoDoReflexoEnumFull;

/** Util: primeiro dia do mês (zerando hora para evitar DST). */
function primeiroDiaDoMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Util: último dia do mês. */
function ultimoDiaDoMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Util: número de dias no mês. */
function diasNoMes(d: Date): number {
  return ultimoDiaDoMes(d).getDate();
}

/** Util: mesma competência (ano+mês iguais). */
function mesmaCompetencia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Util: `d >= ini && d <= fim` (inclusivo, por competência: usa 1º do mês). */
function dentroDoPeriodo(d: Date, ini: Date, fim: Date): boolean {
  const m = primeiroDiaDoMes(d).getTime();
  const a = primeiroDiaDoMes(ini).getTime();
  const b = primeiroDiaDoMes(fim).getTime();
  return m >= a && m <= b;
}

/** Util: somar `n` meses a uma data. */
function addMeses(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Comportamento pertence à família "média"? */
function isMedia(c: ComportamentoAceito): boolean {
  return (
    c === ComportamentoDoReflexoEnum.MEDIA ||
    c === ComportamentoDoReflexoEnum.MEDIA_PONDERADA ||
    c === ComportamentoDoReflexoEnum.MEDIA_PELO_VALOR ||
    c === ComportamentoDoReflexoEnumFull.MEDIA_PELA_QUANTIDADE ||
    c === ComportamentoDoReflexoEnumFull.MEDIA_PELO_VALOR ||
    c === ComportamentoDoReflexoEnumFull.MEDIA_PELO_VALOR_CORRIGIDO
  );
}

/** Comportamento é VALOR_MENSAL (usa base da competência corrente)? */
function isValorMensal(c: ComportamentoAceito): boolean {
  return c === ComportamentoDoReflexoEnumFull.VALOR_MENSAL;
}

/**
 * Resolve a janela (início, fim) do período usado na média.
 * Retorna null se não for possível resolver (resultará em base 0).
 */
function resolverJanelaMedia(
  periodo: PeriodoDaMediaDoReflexoEnum,
  competencia: Date,
  ctx: ReflexoContext,
): [Date, Date] | null {
  switch (periodo) {
    case PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO: {
      if (!ctx.periodoAquisitivoInicio || !ctx.periodoAquisitivoFim) return null;
      return [ctx.periodoAquisitivoInicio, ctx.periodoAquisitivoFim];
    }
    case PeriodoDaMediaDoReflexoEnum.ANO_CIVIL: {
      const ano = competencia.getFullYear();
      return [new Date(ano, 0, 1), new Date(ano, 11, 31)];
    }
    case PeriodoDaMediaDoReflexoEnum.ULTIMOS_DOZE_MESES_DO_CONTRATO: {
      // 12 meses contados da demissao (inclusive), limitados pela admissao
      const fim = ultimoDiaDoMes(ctx.dataDemissao);
      let ini = addMeses(ctx.dataDemissao, -11);
      if (ini.getTime() < primeiroDiaDoMes(ctx.dataAdmissao).getTime()) {
        ini = primeiroDiaDoMes(ctx.dataAdmissao);
      }
      return [ini, fim];
    }
    case PeriodoDaMediaDoReflexoEnum.DOZE_MESES_ANTERIORES_AO_VENCIMENTO_DA_PARCELA: {
      // 12 meses anteriores à competência (exclui a competência corrente)
      const fim = ultimoDiaDoMes(addMeses(competencia, -1));
      const ini = addMeses(competencia, -12);
      return [ini, fim];
    }
    default:
      return null;
  }
}

/**
 * Extrai o valor-base de uma verba para uma competência dada.
 * Procura a ocorrência cujo (dataInicial..dataFinal) intersecta a competência,
 * e retorna `oc.getBase()`. Se não houver base definida, retorna 0.
 */
function obterBaseDaVerbaNaCompetencia(verba: VerbaDeCalculo, competencia: Date): Decimal {
  const ocs = verba.getOcorrenciasAtivas();
  for (const oc of ocs) {
    const di = oc.getDataInicial();
    if (!di) continue;
    if (mesmaCompetencia(di, competencia)) {
      return oc.getBase() ?? oc.getDevido() ?? new Decimal(0);
    }
  }
  return new Decimal(0);
}

/**
 * Soma a base das verbas-base em uma competência.
 * (Várias verbas-base em um mesmo mês são somadas — ex.: 13º sobre HE + Adic.Not.)
 */
function somarBasesNaCompetencia(baseRef: VerbaDeCalculo[], competencia: Date): Decimal {
  let total = new Decimal(0);
  for (const v of baseRef) {
    total = total.plus(obterBaseDaVerbaNaCompetencia(v, competencia));
  }
  return total;
}

/**
 * Calcula a média dos valores-base em uma janela de competências.
 * Divisor = número de meses na janela com base > 0 (meses sem base não contam),
 * conforme comportamento MEDIA_PELO_VALOR do PJe-Calc (média aritmética dos
 * meses com pagamento).
 * Se a janela inteira estiver vazia, retorna 0 (evita NaN).
 */
function mediaBasesNoPeriodo(
  baseRef: VerbaDeCalculo[],
  ini: Date,
  fim: Date,
): Decimal {
  let soma = new Decimal(0);
  let meses = 0;
  const cursor = primeiroDiaDoMes(ini);
  const limite = primeiroDiaDoMes(fim);
  while (cursor.getTime() <= limite.getTime()) {
    const base = somarBasesNaCompetencia(baseRef, cursor);
    if (base.greaterThan(0)) {
      soma = soma.plus(base);
      meses += 1;
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  if (meses === 0) return new Decimal(0);
  return soma.dividedBy(meses);
}

export class MaquinaDeCalculoDaVerbaReflexo {
  private verba: Reflexo;

  constructor(verba: Reflexo) {
    this.verba = verba;
  }

  getVerba(): Reflexo {
    return this.verba;
  }

  /**
   * Gancho legado mantido para compatibilidade com a barrel + pontos de extensão.
   * A API útil da fase 11 é a coleção de métodos estáticos abaixo.
   */
  executarLiquidar(): void {
    // Intencionalmente no-op. O pipeline real passa pelos estáticos.
  }

  // ─────────────────────────────────────────────────────────────────────────
  // API estática — usada pelo Calculo.liquidar() para recalcular reflexos
  // quando há suspeita de duplicação.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retorna a base-reflexo a ser usada para uma competência,
   * aplicando comportamento + janela de média.
   */
  static obterBaseReflexo(
    reflexo: Reflexo,
    competencia: Date,
    baseRef: VerbaDeCalculo[],
    ctx: ReflexoContext,
  ): Decimal {
    const comp = reflexo.getComportamentoDoReflexo();

    if (isValorMensal(comp)) {
      return somarBasesNaCompetencia(baseRef, competencia);
    }

    if (isMedia(comp)) {
      const janela = resolverJanelaMedia(reflexo.getPeriodoMediaReflexo(), competencia, ctx);
      if (!janela) return new Decimal(0);
      return mediaBasesNoPeriodo(baseRef, janela[0], janela[1]);
    }

    // NAO_APLICAR ou qualquer outro → 0
    return new Decimal(0);
  }

  /**
   * Converte dias trabalhados no mês em "avos" (fator 0..1) conforme
   * o tratamento da fração de mês configurado no reflexo.
   */
  static aplicarFracaoDeMes(
    diasTrabalhados: number,
    diasMes: number,
    tratamento: TratamentoDaFracaoDeMesDoReflexoEnum,
  ): Decimal {
    const diasSeguros = diasMes > 0 ? diasMes : 30;
    const trab = Math.max(0, Math.min(diasTrabalhados, diasSeguros));

    switch (tratamento) {
      case TratamentoDaFracaoDeMesDoReflexoEnum.MANTER:
        // proporcional: trab/30 (PJe-Calc usa 30 como base comercial)
        return new Decimal(trab).dividedBy(30);
      case TratamentoDaFracaoDeMesDoReflexoEnum.INTEGRALIZAR:
        // >=1 dia já conta como 1 avo. 0 dias → 0.
        return trab > 0 ? new Decimal(1) : new Decimal(0);
      case TratamentoDaFracaoDeMesDoReflexoEnum.DESPREZAR_MENOR_QUE_15_DIAS:
        return trab >= 15 ? new Decimal(1) : new Decimal(0);
      case TratamentoDaFracaoDeMesDoReflexoEnum.DESPREZAR:
        // Se o mês está completo (trab === diasMes), 1; senão 0.
        return trab >= diasSeguros ? new Decimal(1) : new Decimal(0);
      default:
        return new Decimal(0);
    }
  }

  /**
   * Calcula o devido de um reflexo em UMA ocorrência específica.
   *
   *   devido = base_reflexo × multiplicador / divisor × fatorFracao
   *
   * O `fatorFracao` só se aplica se a ocorrência é parcial (último mês);
   * em meses completos, retorna 1.
   *
   * ATENÇÃO: trabalha em MathContext de 20 dígitos e não arredonda —
   * é responsabilidade do chamador normalizar para 2 casas.
   */
  static calcularDevidoOcorrencia(
    reflexo: Reflexo,
    ocorrencia: OcorrenciaDeVerba,
    baseRef: VerbaDeCalculo[],
    ctx: ReflexoContext,
  ): Decimal {
    const di = ocorrencia.getDataInicial();
    const df = ocorrencia.getDataFinal();
    if (!di || !df) return new Decimal(0);

    const competencia = primeiroDiaDoMes(di);
    const baseReflexo = this.obterBaseReflexo(reflexo, competencia, baseRef, ctx);
    if (baseReflexo.isZero()) return new Decimal(0);

    const div = ocorrencia.getDivisor();
    const mul = ocorrencia.getMultiplicador();
    if (!div || !mul || div.isZero()) return new Decimal(0);

    // Fator de fração de mês — só quando a ocorrência não cobre o mês inteiro.
    const diasCobertos = Math.floor(
      (df.getTime() - di.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
    const diasM = diasNoMes(competencia);
    let fator = new Decimal(1);
    if (diasCobertos > 0 && diasCobertos < diasM) {
      fator = this.aplicarFracaoDeMes(
        diasCobertos,
        diasM,
        reflexo.getTratamentoDaFracaoDeMesDoReflexo(),
      );
    }

    return baseReflexo.times(mul).dividedBy(div).times(fator);
  }
}
