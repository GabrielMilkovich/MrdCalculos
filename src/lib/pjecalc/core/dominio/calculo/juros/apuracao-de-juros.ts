/**
 * PJe-Calc v2.15.1 — ApuracaoDeJuros
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.ApuracaoDeJuros
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/juros/ApuracaoDeJuros.java
 *
 * Linha-mensal da apuração de juros do cálculo. Para cada competência do
 * `Calculo`, armazena:
 *   - valorCorrigido (total do mês, já com correção monetária)
 *   - valores base do INSS (CS normal + CS 13º) e da Prev. Privada
 *   - valores corrigidos separados para IRPF (13º, férias, demais)
 *   - contribuição social e previdência privada mensais (parcelas já deduzidas)
 *   - taxa de juros da competência (% mensal)
 *
 * Derivados:
 *   getCapital()  — valorCorrigido − contribuiçãoSocial − previdenciaPrivada
 *   getJuros()    — capital × (taxa / 100)
 *   getTotal()    — capital + juros
 *   getJurosParaIrpf{DecimoTerceiro,Ferias,DemaisVerbas}() — juros rateados
 *                    proporcionalmente ao componente de IRPF.
 */
import Decimal from 'decimal.js';
import type { Calculo } from '../calculo';

const ZERO = new Decimal(0);

function somar(a: Decimal | null | undefined, b: Decimal | null | undefined): Decimal {
  const va = a ?? ZERO;
  const vb = b ?? ZERO;
  return va.plus(vb);
}

/** Utils.obterPercentualPara (Java) — transforma taxa em % para fator decimal. */
function obterPercentualPara(taxa: Decimal): Decimal {
  return taxa.div(100);
}

export class ApuracaoDeJuros {
  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null;
  private competencia: Date | null = null;
  private dataInicial: Date | null = null;
  private valorCorrigido: Decimal = ZERO;
  private valorVerbaParaContribuicaoSocial: Decimal = ZERO;
  private valorVerbaParaContribuicaoSocialDecimoTerceiro: Decimal = ZERO;
  private valorVerbaParaPrevidenciaPrivada: Decimal = ZERO;
  private valorCorrigidoParaIrpfDecimoTerceiro: Decimal = ZERO;
  private valorCorrigidoParaIrpfFerias: Decimal = ZERO;
  private valorCorrigidoParaIrpfDemaisVerbas: Decimal = ZERO;
  private contribuicaoSocialNormal: Decimal = ZERO;
  private contribuicaoSocialDecimoTerceiro: Decimal = ZERO;
  private previdenciaPrivada: Decimal = ZERO;
  private taxaDeJuros: Decimal | null = null;

  constructor(calculo: Calculo | null = null) {
    this.calculo = calculo;
  }

  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getCompetencia(): Date | null { return this.competencia; }
  setCompetencia(c: Date): void { this.competencia = c; }

  getDataInicial(): Date | null { return this.dataInicial; }
  setDataInicial(d: Date): void { this.dataInicial = d; }

  getValorCorrigido(): Decimal { return this.valorCorrigido; }
  setValorCorrigido(v: Decimal): void { this.valorCorrigido = v; }

  getValorVerbaParaContribuicaoSocial(): Decimal { return this.valorVerbaParaContribuicaoSocial; }
  setValorVerbaParaContribuicaoSocial(v: Decimal): void { this.valorVerbaParaContribuicaoSocial = v; }

  getValorVerbaParaContribuicaoSocialDecimoTerceiro(): Decimal {
    return this.valorVerbaParaContribuicaoSocialDecimoTerceiro;
  }
  setValorVerbaParaContribuicaoSocialDecimoTerceiro(v: Decimal): void {
    this.valorVerbaParaContribuicaoSocialDecimoTerceiro = v;
  }

  getValorVerbaParaPrevidenciaPrivada(): Decimal { return this.valorVerbaParaPrevidenciaPrivada; }
  setValorVerbaParaPrevidenciaPrivada(v: Decimal): void { this.valorVerbaParaPrevidenciaPrivada = v; }

  getValorCorrigidoParaIrpfDecimoTerceiro(): Decimal { return this.valorCorrigidoParaIrpfDecimoTerceiro; }
  setValorCorrigidoParaIrpfDecimoTerceiro(v: Decimal): void { this.valorCorrigidoParaIrpfDecimoTerceiro = v; }

  getValorCorrigidoParaIrpfFerias(): Decimal { return this.valorCorrigidoParaIrpfFerias; }
  setValorCorrigidoParaIrpfFerias(v: Decimal): void { this.valorCorrigidoParaIrpfFerias = v; }

  getValorCorrigidoParaIrpfDemaisVerbas(): Decimal { return this.valorCorrigidoParaIrpfDemaisVerbas; }
  setValorCorrigidoParaIrpfDemaisVerbas(v: Decimal): void { this.valorCorrigidoParaIrpfDemaisVerbas = v; }

  getContribuicaoSocialNormal(): Decimal { return this.contribuicaoSocialNormal; }
  setContribuicaoSocialNormal(v: Decimal): void { this.contribuicaoSocialNormal = v; }

  getContribuicaoSocialDecimoTerceiro(): Decimal { return this.contribuicaoSocialDecimoTerceiro; }
  setContribuicaoSocialDecimoTerceiro(v: Decimal): void { this.contribuicaoSocialDecimoTerceiro = v; }

  /** getContribuicaoSocial (Java linha 218) — soma normal + 13º */
  getContribuicaoSocial(): Decimal {
    return somar(this.contribuicaoSocialNormal, this.contribuicaoSocialDecimoTerceiro);
  }

  getPrevidenciaPrivada(): Decimal { return this.previdenciaPrivada; }
  setPrevidenciaPrivada(v: Decimal): void { this.previdenciaPrivada = v; }

  getTaxaDeJuros(): Decimal | null { return this.taxaDeJuros; }
  setTaxaDeJuros(t: Decimal | null): void { this.taxaDeJuros = t; }

  /**
   * getCapital (Java linha 238)
   * Capital = valorCorrigido − (CS normal + CS 13º) − previdenciaPrivada
   * Retorna null se valorCorrigido for null (paridade com Java).
   */
  getCapital(): Decimal | null {
    if (this.valorCorrigido === null || this.valorCorrigido === undefined) return null;
    let capital = this.valorCorrigido;
    const cs = this.getContribuicaoSocial();
    if (cs !== null && cs !== undefined) {
      capital = capital.minus(cs);
    }
    if (this.previdenciaPrivada !== null && this.previdenciaPrivada !== undefined) {
      capital = capital.minus(this.previdenciaPrivada);
    }
    return capital;
  }

  /** getJuros (Java linha 252) — capital × (taxaDeJuros / 100). Null se capital ou taxa nulos. */
  getJuros(): Decimal | null {
    const capital = this.getCapital();
    if (capital === null || this.taxaDeJuros === null) return null;
    return capital.times(obterPercentualPara(this.taxaDeJuros));
  }

  /** getTotal (Java linha 260) — capital + juros */
  getTotal(): Decimal | null {
    const capital = this.getCapital();
    const juros = this.getJuros();
    if (capital === null || juros === null) return null;
    return capital.plus(juros);
  }

  /**
   * getJurosParaIrpfDecimoTerceiro (Java linha 267) — juros rateados
   * proporcionalmente ao componente de 13º dentro de valorCorrigido.
   */
  getJurosParaIrpfDecimoTerceiro(): Decimal {
    if (this.valorCorrigido.isZero()) return ZERO;
    const juros = this.getJuros() ?? ZERO;
    return juros.times(this.valorCorrigidoParaIrpfDecimoTerceiro).div(this.valorCorrigido);
  }

  /** getJurosParaIrpfFerias (Java linha 277) */
  getJurosParaIrpfFerias(): Decimal {
    if (this.valorCorrigido.isZero()) return ZERO;
    const juros = this.getJuros() ?? ZERO;
    return juros.times(this.valorCorrigidoParaIrpfFerias).div(this.valorCorrigido);
  }

  /** getJurosParaIrpfDemaisVerbas (Java linha 287) */
  getJurosParaIrpfDemaisVerbas(): Decimal {
    if (this.valorCorrigido.isZero()) return ZERO;
    const juros = this.getJuros() ?? ZERO;
    return juros.times(this.valorCorrigidoParaIrpfDemaisVerbas).div(this.valorCorrigido);
  }
}
