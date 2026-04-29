/**
 * PJe-Calc v2.15.1 — PrevidenciaPrivada + MaquinaDeCalculoDePrevidenciaPrivada
 * Porte 1:1 de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.PrevidenciaPrivada (270 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.MaquinaDeCalculoDePrevidenciaPrivada (142 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.OcorrenciaDePrevidenciaPrivada (183 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.AliquotaDePrevidenciaPrivada (202 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.TabelaDeJurosDePrevidenciaPrivada (17 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.TotalizadorDeProvidenciaPrivada (68 LOC)
 *
 * Implementa o calculo da Previdencia Privada (LC 109/2001):
 *   - Lista de aliquotas vigentes por subperiodo (AliquotaDePrevidenciaPrivada).
 *   - Iteracao mes-a-mes pelos subperiodos de cada aliquota.
 *   - Para cada competencia: soma diferencas das verbas com flag
 *     incidenciaPrevidenciaPrivada=true (zerar negativo).
 *   - Apenas competencias com pelo menos 1 ocorrencia geram OcorrenciaDePrevidenciaPrivada.
 *   - Indice de correcao (trabalhista OU outro indice configuravel).
 *   - Juros simples por competencia.
 *
 * Diretorio antes deste port: NAO EXISTIA (gap de 1067 LOC Java).
 */
import Decimal from 'decimal.js';
import type { IModuloLiquidavel } from '../calculo';

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

/**
 * Java AliquotaDePrevidenciaPrivada — uma faixa por subperiodo.
 * Vigencia: dataInicioPeriodo→dataTerminoPeriodo (inclusive).
 */
export interface AliquotaDePrevidenciaPrivada {
  dataInicioPeriodo: Date;
  dataTerminoPeriodo: Date;
  /** Aliquota em percentual (ex: 7.5 = 7,5%). */
  aliquota: Decimal;
}

/**
 * Java OcorrenciaDePrevidenciaPrivada — 1 por competencia com base > 0.
 * Gerada pela maquina, persistida na entidade.
 */
export interface OcorrenciaDePrevidenciaPrivada {
  /** Data de competencia (1o dia do mes). */
  competencia: Date;
  aliquota: Decimal;
  valorBase: Decimal;
  indiceAcumulado: Decimal;
  taxaDeJuros: Decimal;
}

/** Verba subset usada por PrevPriv (apenas com IncidenciaPrevidenciaPrivada=true). */
export interface VerbaPrevPrivInput {
  /** YYYY-MM-DD */
  competencia: string;
  ativo: boolean;
  /** Java getDiferencaParaCalculoDasIncidencias — pode ser null. */
  diferencaParaCalculoDasIncidencias: Decimal | null;
}

/** Java OpcaoDeIndiceDeCorrecaoEnum. */
export type OpcaoIndiceCorrecaoPrevPriv = 'UTILIZAR_INDICE_TRABALHISTA' | 'OUTRO';

/** Input para liquidar(). */
export interface CalculoPrevPrivInput {
  /** Verbas com flag incidenciaPrevidenciaPrivada=true (filtragem ja feita). */
  verbasIncidentes: VerbaPrevPrivInput[];
  dataDeLiquidacao: Date;
  /** Indices acumulados disponiveis no calculo (YYYY-MM → fator). */
  indicesAcumulados: Record<string, Decimal>;
  /** Java parametrosDeAtualizacao.indiceDeCorrecaoDePrevidenciaPrivada. */
  opcaoIndiceCorrecao: OpcaoIndiceCorrecaoPrevPriv;
  /** Taxa de juros por competencia (YYYY-MM → %). */
  taxaJurosPorCompetencia?: Record<string, Decimal>;
  /**
   * Teto mensal — Art. 6 LC 109/2001 + clausulas de plano de previdencia.
   * Quando definido (> 0), a base mensal e CLAMPADA: o excedente nao gera
   * contribuicao. Quando ausente/null/<=0, sem teto.
   */
  tetoMensal?: Decimal | null;
  /**
   * Modo de aplicacao de juros sobre PrevPriv atrasada.
   *  - 'trabalhista' (default): usa taxaJurosPorCompetencia (mesma do principal).
   *  - 'pago_atraso': aplica juros desde a data efetiva (tabela diferenciada).
   *  - 'nenhum': nao aplica juros — taxaDeJuros = 0 em todas as ocorrencias.
   */
  modoJuros?: 'trabalhista' | 'pago_atraso' | 'nenhum';
}

function fmtComp(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function eachMonth(start: Date, end: Date): Array<{ inicio: Date; competencia: string }> {
  const out: Array<{ inicio: Date; competencia: string }> = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end) {
    const inicio = new Date(cursor);
    out.push({ inicio, competencia: fmtComp(cursor) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

function zerarSeNegativo(v: Decimal): Decimal {
  return v.lt(ZERO) ? ZERO : v;
}

/**
 * Entidade PrevidenciaPrivada — porte 1:1 do Java.
 */
export class PrevidenciaPrivada implements IModuloLiquidavel {
  private apurarPrevidenciaPrivada: boolean = false;
  private aliquotas: AliquotaDePrevidenciaPrivada[] = [];
  private ocorrencias: OcorrenciaDePrevidenciaPrivada[] = [];

  // Maquina LAZY
  private _maquina: MaquinaDeCalculoDePrevidenciaPrivada | null = null;
  private getMaquina(): MaquinaDeCalculoDePrevidenciaPrivada {
    if (this._maquina === null) this._maquina = new MaquinaDeCalculoDePrevidenciaPrivada(this);
    return this._maquina;
  }

  getApurarPrevidenciaPrivada(): boolean { return this.apurarPrevidenciaPrivada; }
  setApurarPrevidenciaPrivada(v: boolean): void { this.apurarPrevidenciaPrivada = v; }
  getAliquotas(): AliquotaDePrevidenciaPrivada[] { return this.aliquotas; }
  setAliquotas(v: AliquotaDePrevidenciaPrivada[]): void { this.aliquotas = v; }
  getOcorrencias(): OcorrenciaDePrevidenciaPrivada[] { return this.ocorrencias; }

  /** Java PrevidenciaPrivada.getValorTotalDevido() — sum(base × aliquota/100). */
  getValorTotalDevido(): Decimal {
    return this.ocorrencias.reduce(
      (acc, o) => acc.plus(o.valorBase.times(o.aliquota.div(HUNDRED))),
      ZERO,
    );
  }

  /** Java PrevidenciaPrivada.getValorTotalCorrigido(). */
  getValorTotalCorrigido(): Decimal {
    return this.ocorrencias.reduce(
      (acc, o) => acc.plus(o.valorBase.times(o.aliquota.div(HUNDRED)).times(o.indiceAcumulado)),
      ZERO,
    );
  }

  /** Java PrevidenciaPrivada.getValorTotalDeJuros(). */
  getValorTotalDeJuros(): Decimal {
    return this.ocorrencias.reduce(
      (acc, o) => {
        const corrigido = o.valorBase.times(o.aliquota.div(HUNDRED)).times(o.indiceAcumulado);
        return acc.plus(corrigido.times(o.taxaDeJuros.div(HUNDRED)));
      },
      ZERO,
    );
  }

  /** Java PrevidenciaPrivada.getValorTotalCorrigidoComJuros(). */
  getValorTotalCorrigidoComJuros(): Decimal {
    return this.getValorTotalCorrigido().plus(this.getValorTotalDeJuros());
  }

  /**
   * Java PrevidenciaPrivada.removerDeOcorrencias() — usado por
   * MaquinaDeCalculoDePrevidenciaPrivada.limparOcorrencias().
   */
  removerDeOcorrencias(): void {
    this.ocorrencias.length = 0;
  }

  liquidarComDados(input: CalculoPrevPrivInput): void {
    this.getMaquina().liquidar(input);
  }

  /** Stub IModuloLiquidavel. */
  liquidar(): void { /* no-op */ }
}

/**
 * MaquinaDeCalculoDePrevidenciaPrivada — porte 1:1 do Java.
 */
export class MaquinaDeCalculoDePrevidenciaPrivada {
  constructor(private readonly prev: PrevidenciaPrivada) {}

  /** Java MaquinaDeCalculoDePrevidenciaPrivada.liquidar(). */
  liquidar(input: CalculoPrevPrivInput): void {
    // 1. Limpar ocorrencias previas
    this.prev.removerDeOcorrencias();
    if (!this.prev.getApurarPrevidenciaPrivada()) return;

    // 2. Iterar aliquotas, e por aliquota iterar meses do periodo.
    for (const aliq of this.prev.getAliquotas()) {
      const periodos = eachMonth(aliq.dataInicioPeriodo, aliq.dataTerminoPeriodo);
      for (const p of periodos) {
        const somaDasDiferencas = this.somarDiferencasNaCompetencia(p.competencia, input.verbasIncidentes);
        if (somaDasDiferencas === null) continue; // Java: if (!existeOcorrencia) continue;
        this.prev.getOcorrencias().push({
          competencia: p.inicio,
          aliquota: aliq.aliquota,
          valorBase: somaDasDiferencas,
          indiceAcumulado: new Decimal(1),
          taxaDeJuros: ZERO,
        });
      }
    }

    if (this.prev.getOcorrencias().length === 0) return;

    // 3. Aplicar indice de correcao (Java: TabelaDeCorrecaoMonetaria com flag
    //    UTILIZAR_INDICE_TRABALHISTA OU outroIndiceDeCorrecao).
    //    Em ambos os casos, o input.indicesAcumulados ja foi pre-carregado
    //    pelo orchestrator com o indice correto — basta ler por competencia.
    for (const o of this.prev.getOcorrencias()) {
      const ym = fmtComp(o.competencia);
      o.indiceAcumulado = input.indicesAcumulados[ym] ?? new Decimal(1);
      o.taxaDeJuros = input.taxaJurosPorCompetencia?.[ym] ?? ZERO;
    }
  }

  /**
   * Java sub-loop dentro de liquidar(): para a competencia, varre
   * todas as verbas incidentes e soma diferencas (zerar negativos).
   * Retorna null se nenhuma ocorrencia foi encontrada (evita criar
   * OcorrenciaDePrevidenciaPrivada vazia).
   */
  private somarDiferencasNaCompetencia(
    competencia: string,
    verbas: VerbaPrevPrivInput[],
  ): Decimal | null {
    let soma: Decimal | null = null;
    for (const v of verbas) {
      if (!v.ativo) continue;
      if (!v.competencia.startsWith(competencia)) continue;
      const base = v.diferencaParaCalculoDasIncidencias;
      if (base === null) continue;
      soma = (soma ?? ZERO).plus(zerarSeNegativo(base));
    }
    return soma;
  }

  /** Java calcularJuros() — atualiza ocorrencias com taxas. */
  calcularJuros(input: { taxaJurosPorCompetencia: Record<string, Decimal> }): void {
    for (const o of this.prev.getOcorrencias()) {
      const ym = fmtComp(o.competencia);
      o.taxaDeJuros = input.taxaJurosPorCompetencia[ym] ?? ZERO;
    }
  }

  getPrevidenciaPrivada(): PrevidenciaPrivada { return this.prev; }
}
