/**
 * PJe-Calc v2.15.1 — OcorrenciaDeInss (abstract)
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInss
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/OcorrenciaDeInss.java (~503 linhas)
 *
 * Linha-mensal de INSS (uma por competência). Guarda:
 *   - período [dataInicioPeriodo, dataTerminoPeriodo] da ocorrência
 *   - dataOcorrenciaInss (competência de apuração)
 *   - valorBase (total de remuneração no período)
 *   - tipoValorDaBase (CALCULADO | INFORMADO)
 *   - alíquotas: segurado, empresa, SAT, terceiros (+ tetos)
 *   - valor total pago (segurado/empresa)
 *   - valor devido (segurado/empresa/SAT/terceiros) — depois da diferença do pago
 *   - índices de correção (trabalhista + previdenciária)
 *   - ocorrenciaDecimoTerceiro (flag)
 *   - taxaDeJuros e taxaDeMulta
 *
 * Subclasses concretas:
 *   OcorrenciaDeInssSobreSalariosDevidos
 *   OcorrenciaDeInssSobreSalariosPagos
 *   OcorrenciaDeInssSobreSalariosDevidosAtualizacao (pós-liquidação)
 *   OcorrenciaDeInssSobreSalariosPagosAtualizacao
 *
 * Responsabilidade abstrata: `isJurosEMultaPrevidenciario()` (true para
 * parcela previdenciária, altera rounding de juros para DOWN em 2 casas).
 */
import Decimal from 'decimal.js';
import { TipoValorEnum } from '../../../../constantes/enums';

const ZERO = new Decimal(0);

/** Utils.aplicarCorrecaoMonetaria — valor × indice (ambos null-safe) */
function aplicarCorrecaoMonetaria(indice: Decimal | null, valor: Decimal | null): Decimal | null {
  if (indice === null || valor === null) return null;
  return valor.times(indice);
}

/** Utils.aplicarJuros — valor × taxa/100 (null-safe) */
function aplicarJuros(taxa: Decimal | null, valor: Decimal | null): Decimal | null {
  if (taxa === null || valor === null) return null;
  return valor.times(taxa).div(100);
}

/** Utils.aplicarMulta — valor × taxa/100 (mesmo cálculo, semântica distinta) */
function aplicarMulta(taxa: Decimal | null, valor: Decimal | null): Decimal | null {
  return aplicarJuros(taxa, valor);
}

/** Utils.somar(a, b, fallback) — retorna a+b se ambos não-nulos, senão fallback */
function somar(a: Decimal | null, b: Decimal | null, fallback: Decimal | null): Decimal | null {
  if (a === null || b === null) return fallback;
  return a.plus(b);
}

export abstract class OcorrenciaDeInss {
  protected versao: number = 0;
  protected dataInicioPeriodo: Date | null = null;
  protected dataTerminoPeriodo: Date | null = null;
  protected dataOcorrenciaInss: Date | null = null;
  protected valorBase: Decimal = ZERO;
  protected tipoValorDaBase: TipoValorEnum = TipoValorEnum.CALCULADO;
  protected aliquotaSegurado: Decimal | null = null;
  protected valorTetoSegurado: Decimal | null = null;
  protected aliquotaEmpresa: Decimal | null = null;
  protected valorTetoEmpresa: Decimal | null = null;
  protected aliquotaSAT: Decimal | null = null;
  protected aliquotaTerceiros: Decimal | null = null;
  protected valorTotalInssSegurado: Decimal | null = null;
  protected valorDevidoSeguradoFinal: Decimal | null = null;
  protected indiceDeCorrecaoTrabalhistaUtilizado: Decimal | null = null;
  protected indiceDeCorrecaoPrevidenciariaUtilizado: Decimal | null = null;
  protected valorTotalInssEmpresa: Decimal | null = null;
  protected valorDevidoEmpresaFinal: Decimal | null = null;
  protected valorDevidoSAT: Decimal | null = null;
  protected valorDevidoTerceiros: Decimal | null = null;
  protected ocorrenciaDecimoTerceiro: boolean = false;
  protected taxaDeJuros: Decimal | null = null;
  protected taxaDeMulta: Decimal | null = null;

  // transient
  protected selecionada: boolean = false;
  protected baseVazia: boolean = true;
  protected valorDevidoSeguradoFinalCorrigido: Decimal | null = null;
  protected valorDevidoEmpresaFinalCorrigido: Decimal | null = null;
  protected valorDevidoSATCorrigido: Decimal | null = null;
  protected valorDevidoTerceirosCorrigido: Decimal | null = null;

  // ─── getters/setters (paridade com os Java bean accessors) ───
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getDataInicioPeriodo(): Date | null { return this.dataInicioPeriodo; }
  setDataInicioPeriodo(d: Date | null): void { this.dataInicioPeriodo = d; }

  getDataTerminoPeriodo(): Date | null { return this.dataTerminoPeriodo; }
  setDataTerminoPeriodo(d: Date | null): void { this.dataTerminoPeriodo = d; }

  getDataOcorrenciaInss(): Date | null { return this.dataOcorrenciaInss; }
  setDataOcorrenciaInss(d: Date | null): void { this.dataOcorrenciaInss = d; }

  getValorBase(): Decimal { return this.valorBase; }
  setValorBase(v: Decimal): void { this.valorBase = v; }

  getTipoValorDaBase(): TipoValorEnum { return this.tipoValorDaBase; }
  setTipoValorDaBase(t: TipoValorEnum): void { this.tipoValorDaBase = t; }

  getAliquotaSegurado(): Decimal | null { return this.aliquotaSegurado; }
  setAliquotaSegurado(v: Decimal | null): void { this.aliquotaSegurado = v; }

  getValorTetoSegurado(): Decimal | null { return this.valorTetoSegurado; }
  setValorTetoSegurado(v: Decimal | null): void { this.valorTetoSegurado = v; }

  getAliquotaEmpresa(): Decimal | null { return this.aliquotaEmpresa; }
  setAliquotaEmpresa(v: Decimal | null): void { this.aliquotaEmpresa = v; }

  getValorTetoEmpresa(): Decimal | null { return this.valorTetoEmpresa; }
  setValorTetoEmpresa(v: Decimal | null): void { this.valorTetoEmpresa = v; }

  getAliquotaSAT(): Decimal | null { return this.aliquotaSAT; }
  setAliquotaSAT(v: Decimal | null): void { this.aliquotaSAT = v; }

  getAliquotaTerceiros(): Decimal | null { return this.aliquotaTerceiros; }
  setAliquotaTerceiros(v: Decimal | null): void { this.aliquotaTerceiros = v; }

  getValorTotalInssSegurado(): Decimal | null { return this.valorTotalInssSegurado; }
  setValorTotalInssSegurado(v: Decimal | null): void { this.valorTotalInssSegurado = v; }

  getValorDevidoSeguradoFinal(): Decimal | null { return this.valorDevidoSeguradoFinal; }
  setValorDevidoSeguradoFinal(v: Decimal | null): void { this.valorDevidoSeguradoFinal = v; }

  getIndiceDeCorrecaoTrabalhistaUtilizado(): Decimal | null {
    return this.indiceDeCorrecaoTrabalhistaUtilizado;
  }
  setIndiceDeCorrecaoTrabalhistaUtilizado(v: Decimal | null): void {
    this.indiceDeCorrecaoTrabalhistaUtilizado = v;
  }

  getIndiceDeCorrecaoPrevidenciariaUtilizado(): Decimal | null {
    return this.indiceDeCorrecaoPrevidenciariaUtilizado;
  }
  setIndiceDeCorrecaoPrevidenciariaUtilizado(v: Decimal | null): void {
    this.indiceDeCorrecaoPrevidenciariaUtilizado = v;
  }

  getValorTotalInssEmpresa(): Decimal | null { return this.valorTotalInssEmpresa; }
  setValorTotalInssEmpresa(v: Decimal | null): void { this.valorTotalInssEmpresa = v; }

  getValorDevidoEmpresaFinal(): Decimal | null { return this.valorDevidoEmpresaFinal; }
  setValorDevidoEmpresaFinal(v: Decimal | null): void { this.valorDevidoEmpresaFinal = v; }

  getValorDevidoSAT(): Decimal | null { return this.valorDevidoSAT; }
  setValorDevidoSAT(v: Decimal | null): void { this.valorDevidoSAT = v; }

  getValorDevidoTerceiros(): Decimal | null { return this.valorDevidoTerceiros; }
  setValorDevidoTerceiros(v: Decimal | null): void { this.valorDevidoTerceiros = v; }

  getOcorrenciaDecimoTerceiro(): boolean { return this.ocorrenciaDecimoTerceiro; }
  setOcorrenciaDecimoTerceiro(v: boolean): void { this.ocorrenciaDecimoTerceiro = v; }

  getTaxaDeJuros(): Decimal | null { return this.taxaDeJuros; }
  setTaxaDeJuros(v: Decimal | null): void { this.taxaDeJuros = v; }

  getTaxaDeMulta(): Decimal | null { return this.taxaDeMulta; }
  setTaxaDeMulta(v: Decimal | null): void { this.taxaDeMulta = v; }

  getSelecionada(): boolean { return this.selecionada; }
  setSelecionada(v: boolean): void { this.selecionada = v; }

  isBaseVazia(): boolean { return this.baseVazia; }
  setBaseVazia(v: boolean): void { this.baseVazia = v; }

  // ─── predicates (Java linhas 415-445) ───

  isValorBaseCalculado(): boolean { return this.tipoValorDaBase === TipoValorEnum.CALCULADO; }
  isValorBaseInformado(): boolean { return this.tipoValorDaBase === TipoValorEnum.INFORMADO; }

  isLimitarTetoSegurado(): boolean { return this.valorTetoSegurado !== null; }
  isLimitarTetoEmpresa(): boolean { return this.valorTetoEmpresa !== null; }

  isRealizarCalculoParaEmpresa(): boolean { return this.aliquotaEmpresa !== null; }
  isRealizarCalculoParaSAT(): boolean { return this.aliquotaSAT !== null; }
  isRealizarCalculoParaTerceiros(): boolean { return this.aliquotaTerceiros !== null; }
  isRealizarCalculoParaSegurado(): boolean { return this.aliquotaSegurado !== null; }

  /** subclasses indicam se esta ocorrência é previdenciária (altera rounding). */
  abstract isJurosEMultaPrevidenciario(): boolean;

  // ─── getters derivados ───

  /**
   * getIndiceCorrecao (Java linha 281) — trabalhista × previdenciário.
   * Retorna ZERO se algum dos índices for null (null-safe diferente do Java).
   */
  getIndiceCorrecao(): Decimal {
    const a = this.indiceDeCorrecaoTrabalhistaUtilizado ?? ZERO;
    const b = this.indiceDeCorrecaoPrevidenciariaUtilizado ?? ZERO;
    return a.times(b);
  }

  // --- Segurado ---
  getValorDevidoSeguradoFinalCorrigido(): Decimal | null {
    if (this.valorDevidoSeguradoFinalCorrigido !== null) {
      return this.valorDevidoSeguradoFinalCorrigido;
    }
    return aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.valorDevidoSeguradoFinal);
  }

  getJurosValorDevidoSeguradoFinal(): Decimal | null {
    const juros = aplicarJuros(this.taxaDeJuros, this.getValorDevidoSeguradoFinalCorrigido());
    if (this.isJurosEMultaPrevidenciario() && juros !== null) {
      return new Decimal(juros.toFixed(2, Decimal.ROUND_DOWN));
    }
    return juros;
  }

  getMultaValorDevidoSeguradoFinal(): Decimal | null {
    return aplicarMulta(this.taxaDeMulta, this.getValorDevidoSeguradoFinalCorrigido());
  }

  getTotalValorDevidoSeguradoFinal(): Decimal | null {
    let valor = this.getValorDevidoSeguradoFinalCorrigido();
    valor = somar(valor, this.getJurosValorDevidoSeguradoFinal(), valor);
    valor = somar(valor, this.getMultaValorDevidoSeguradoFinal(), valor);
    return valor;
  }

  // --- Empresa ---
  getValorDevidoEmpresaFinalCorrigido(): Decimal | null {
    if (this.valorDevidoEmpresaFinalCorrigido !== null) {
      return this.valorDevidoEmpresaFinalCorrigido;
    }
    return aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.valorDevidoEmpresaFinal);
  }

  getJurosValorDevidoEmpresaFinal(): Decimal | null {
    const juros = aplicarJuros(this.taxaDeJuros, this.getValorDevidoEmpresaFinalCorrigido());
    if (this.isJurosEMultaPrevidenciario() && juros !== null) {
      return new Decimal(juros.toFixed(2, Decimal.ROUND_DOWN));
    }
    return juros;
  }

  getMultaValorDevidoEmpresaFinal(): Decimal | null {
    return aplicarMulta(this.taxaDeMulta, this.getValorDevidoEmpresaFinalCorrigido());
  }

  getTotalValorDevidoEmpresaFinal(): Decimal | null {
    let valor = this.getValorDevidoEmpresaFinalCorrigido();
    valor = somar(valor, this.getJurosValorDevidoEmpresaFinal(), valor);
    valor = somar(valor, this.getMultaValorDevidoEmpresaFinal(), valor);
    return valor;
  }

  // --- SAT ---
  getValorDevidoSATCorrigido(): Decimal | null {
    if (this.valorDevidoSATCorrigido !== null) return this.valorDevidoSATCorrigido;
    return aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.valorDevidoSAT);
  }

  getJurosValorDevidoSAT(): Decimal | null {
    const juros = aplicarJuros(this.taxaDeJuros, this.getValorDevidoSATCorrigido());
    if (this.isJurosEMultaPrevidenciario() && juros !== null) {
      return new Decimal(juros.toFixed(2, Decimal.ROUND_DOWN));
    }
    return juros;
  }

  getMultaValorDevidoSAT(): Decimal | null {
    return aplicarMulta(this.taxaDeMulta, this.getValorDevidoSATCorrigido());
  }

  getTotalValorDevidoSAT(): Decimal | null {
    let valor = this.getValorDevidoSATCorrigido();
    valor = somar(valor, this.getJurosValorDevidoSAT(), valor);
    valor = somar(valor, this.getMultaValorDevidoSAT(), valor);
    return valor;
  }

  // --- Terceiros ---
  getValorDevidoTerceirosCorrigido(): Decimal | null {
    if (this.valorDevidoTerceirosCorrigido !== null) return this.valorDevidoTerceirosCorrigido;
    return aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.valorDevidoTerceiros);
  }

  getJurosValorDevidoTerceiros(): Decimal | null {
    const juros = aplicarJuros(this.taxaDeJuros, this.getValorDevidoTerceirosCorrigido());
    if (this.isJurosEMultaPrevidenciario() && juros !== null) {
      return new Decimal(juros.toFixed(2, Decimal.ROUND_DOWN));
    }
    return juros;
  }

  getMultaValorDevidoTerceiros(): Decimal | null {
    return aplicarMulta(this.taxaDeMulta, this.getValorDevidoTerceirosCorrigido());
  }

  getTotalValorDevidoTerceiros(): Decimal | null {
    let valor = this.getValorDevidoTerceirosCorrigido();
    valor = somar(valor, this.getJurosValorDevidoTerceiros(), valor);
    valor = somar(valor, this.getMultaValorDevidoTerceiros(), valor);
    return valor;
  }

  /** compareTo (Java linha 466) — ordena por dataOcorrenciaInss */
  compareTo(o: OcorrenciaDeInss): number {
    const a = this.dataOcorrenciaInss;
    const b = o.dataOcorrenciaInss;
    if (!a || !b) return 0;
    return a.getTime() - b.getTime();
  }

  /** copiarValoresInformadosAnteriormente (Java linha 470) */
  copiarValoresInformadosAnteriormente(antiga: OcorrenciaDeInss | null): void {
    if (antiga === null) return;
    if (antiga.isValorBaseInformado()) {
      this.setValorBase(antiga.getValorBase());
      this.setTipoValorDaBase(antiga.getTipoValorDaBase());
    }
  }
}
