/**
 * PJe-Calc v2.15.1 — OperacaoDeFgts
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OperacaoDeFgts
 *
 * Ref Java: pjecalc-fonte/negocio/.../calculo/fgts/OperacaoDeFgts.java (226 linhas)
 *
 * Representa uma OPERAÇÃO (movimento) do extrato FGTS — depósito informado,
 * saque ou recolhimento avulso — usada na dedução de saldo e no cálculo da
 * base para multa "SOBRE_DEPOSITADO_SACADO".
 *
 * Campos persistidos no Java foram mapeados; anotações JPA/Hibernate/Seam
 * foram ignoradas (não aplicáveis ao back-end Supabase).
 */
import Decimal from 'decimal.js';
import { nulo, naoNulos, aplicarCorrecaoMonetaria, obterPercentualPara } from '../../../base/comum/utils';

/**
 * TipoDeOperacaoDoFgtsEnum — tipo de movimento no extrato FGTS.
 * Referência: br.jus.trt8.pjecalc.negocio.constantes.TipoDeOperacaoDoFgtsEnum
 */
export enum TipoDeOperacaoDoFgtsEnum {
  /** Depósito informado pelo reclamante no extrato */
  DEPOSITO = 'D',
  /** Saque efetuado (FGTS, moradia, saldo, etc.) */
  SAQUE = 'S',
  /** Recolhimento fora da folha (avulso) */
  RECOLHIMENTO = 'R',
}

/**
 * TipoDeCorrecaoDoFgtsEnum — data-alvo da correção monetária.
 * Referência: br.jus.trt8.pjecalc.negocio.constantes.TipoDeCorrecaoDoFgtsEnum
 */
export enum TipoDeCorrecaoDoFgtsEnum {
  PELA_DATA_DE_LIQUIDACAO = 'L',
  PELA_DATA_DE_DEMISSAO = 'D',
}

/**
 * Interface mínima do FGTS que a OperacaoDeFgts consulta para saber se só
 * deve contabilizar JAM e se é dedutível do FGTS. Evita dependência circular
 * com a classe Fgts completa.
 */
export interface IFgtsContextoParaOperacao {
  isSomenteJurosJAM(): boolean;
  getDeduzirDoFGTS(): boolean;
}

/**
 * OperacaoDeFgts — Porte 1:1 da entidade Java.
 * Getters/setters preservados para manter API legacy.
 */
export class OperacaoDeFgts {
  private id: number | null = null;
  private versao: number = 0;
  private fgts: IFgtsContextoParaOperacao | null = null;
  private competencia: Date;
  private tipoDeOperacaoDoFgts: TipoDeOperacaoDoFgtsEnum = TipoDeOperacaoDoFgtsEnum.DEPOSITO;
  private valor: Decimal = new Decimal(0);
  private indiceAcumulado: Decimal | null = null;
  private indiceAcumuladoDaMulta: Decimal | null = null;
  private taxaDeJuros: Decimal | null = null;

  constructor(competencia?: Date, valor?: Decimal) {
    this.competencia = competencia ?? new Date(0);
    if (valor !== undefined) this.valor = valor;
  }

  // ── Identidade/versionamento ──
  getId(): number | null { return this.id; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  // ── Relacionamento ──
  getFgts(): IFgtsContextoParaOperacao | null { return this.fgts; }
  setFgts(f: IFgtsContextoParaOperacao | null): void { this.fgts = f; }

  // ── Campos ──
  getCompetencia(): Date { return this.competencia; }
  setCompetencia(d: Date): void { this.competencia = d; }

  getTipoDeOperacaoDoFgts(): TipoDeOperacaoDoFgtsEnum { return this.tipoDeOperacaoDoFgts; }
  setTipoDeOperacaoDoFgts(t: TipoDeOperacaoDoFgtsEnum): void { this.tipoDeOperacaoDoFgts = t; }

  getValor(): Decimal { return this.valor; }
  setValor(v: Decimal): void { this.valor = v; }

  getIndiceAcumulado(): Decimal | null { return this.indiceAcumulado; }
  setIndiceAcumulado(v: Decimal | null): void { this.indiceAcumulado = v; }

  getIndiceAcumuladoDaMulta(): Decimal | null { return this.indiceAcumuladoDaMulta; }
  setIndiceAcumuladoDaMulta(v: Decimal | null): void { this.indiceAcumuladoDaMulta = v; }

  getTaxaDeJuros(): Decimal | null { return this.taxaDeJuros; }
  setTaxaDeJuros(v: Decimal | null): void { this.taxaDeJuros = v; }

  // ── Correção e juros (linhas 165-188 do Java) ──

  /**
   * Porte 1:1 de OperacaoDeFgts.getValorCorrigido (linha 165).
   * Se valor ou índice for null → ZERO.
   * PELA_DATA_DE_LIQUIDACAO → usa indiceAcumulado.
   * PELA_DATA_DE_DEMISSAO   → usa indiceAcumuladoDaMulta.
   */
  getValorCorrigido(tipoDeCorrecao: TipoDeCorrecaoDoFgtsEnum): Decimal {
    if (!naoNulos(this.valor, this.indiceAcumulado)) {
      return new Decimal(0);
    }
    if (tipoDeCorrecao === TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO) {
      const r = aplicarCorrecaoMonetaria(this.indiceAcumulado, this.valor);
      return r ?? new Decimal(0);
    }
    const r = aplicarCorrecaoMonetaria(this.indiceAcumuladoDaMulta, this.valor);
    return r ?? new Decimal(0);
  }

  /**
   * Porte 1:1 de OperacaoDeFgts.getJuros (linha 175).
   * Se fgts.isSomenteJurosJAM → null.
   * Se NÃO deduz do FGTS OU taxa null → ZERO.
   * Caso contrário: valorCorrigido × (taxa/100).
   */
  getJuros(tipoDeCorrecao: TipoDeCorrecaoDoFgtsEnum): Decimal | null {
    if (this.fgts && this.fgts.isSomenteJurosJAM()) {
      return null;
    }
    if (!this.fgts || !this.fgts.getDeduzirDoFGTS() || nulo(this.taxaDeJuros)) {
      return new Decimal(0);
    }
    const pct = obterPercentualPara(this.taxaDeJuros);
    if (pct === null) return new Decimal(0);
    return this.getValorCorrigido(tipoDeCorrecao).times(pct);
  }

  /**
   * Porte 1:1 de OperacaoDeFgts.getTotal (linha 185).
   * total = valorCorrigido + (juros ?? valorCorrigido).
   * Se juros é null → soma valorCorrigido duas vezes (espelha Utils.somar com padrão).
   */
  getTotal(tipoDeCorrecao: TipoDeCorrecaoDoFgtsEnum): Decimal {
    const corrigido = this.getValorCorrigido(tipoDeCorrecao);
    const juros = this.getJuros(tipoDeCorrecao);
    return corrigido.plus(juros ?? corrigido);
  }
}
