/**
 * PJe-Calc v2.15.1 — TotalizadorInssSobreSalarios
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.TotalizadorInssSobreSalarios
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/TotalizadorInssSobreSalarios.java
 *
 * Acumula 16 totais (4 grupos × 4 categorias) a partir das ocorrências do
 * InssSobreSalarios referenciado. `calcular()` é lazy (roda uma vez e guarda
 * `isCalculado`). `reset()` invalida o cache para recálculo.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../../base/comum/utils';
import type { InssSobreSalarios } from './inss-sobre-salarios';
import type { OcorrenciaDeInss } from './ocorrencia-de-inss';

const ZERO = new Decimal(0);

/** Mimetiza `br.jus.trt8.pjecalc.negocio.comum.Total` (acumulador Decimal) */
class Total {
  private valor: Decimal = ZERO;
  acumular(v: Decimal | null): void { if (v !== null) this.valor = this.valor.plus(v); }
  getValor(): Decimal { return this.valor; }
}

export class TotalizadorInssSobreSalarios {
  private inssSobreSalarios: InssSobreSalarios;
  private isCalculado = false;
  private seguradoReclamadoCorrigido = new Total();
  private jurosSeguradoReclamadoCorrigido = new Total();
  private multaSeguradoReclamadoCorrigido = new Total();
  private totalSeguradoReclamadoCorrigido = new Total();
  private empresaFinalCorrigido = new Total();
  private jurosEmpresaFinalCorrigido = new Total();
  private multaEmpresaFinalCorrigido = new Total();
  private totalEmpresaFinalCorrigido = new Total();
  private satCorrigido = new Total();
  private jurosSatCorrigido = new Total();
  private multaSatCorrigido = new Total();
  private totalSatCorrigido = new Total();
  private terceirosCorrigido = new Total();
  private jurosTerceirosCorrigido = new Total();
  private multaTerceirosCorrigido = new Total();
  private totalTerceirosCorrigido = new Total();

  constructor(inssSobreSalarios: InssSobreSalarios) {
    this.inssSobreSalarios = inssSobreSalarios;
  }

  reset(): void { this.isCalculado = false; }

  private calcular(): this {
    if (this.isCalculado) return this;
    // Reinicia totais
    this.seguradoReclamadoCorrigido = new Total();
    this.jurosSeguradoReclamadoCorrigido = new Total();
    this.multaSeguradoReclamadoCorrigido = new Total();
    this.totalSeguradoReclamadoCorrigido = new Total();
    this.empresaFinalCorrigido = new Total();
    this.jurosEmpresaFinalCorrigido = new Total();
    this.multaEmpresaFinalCorrigido = new Total();
    this.totalEmpresaFinalCorrigido = new Total();
    this.satCorrigido = new Total();
    this.jurosSatCorrigido = new Total();
    this.multaSatCorrigido = new Total();
    this.totalSatCorrigido = new Total();
    this.terceirosCorrigido = new Total();
    this.jurosTerceirosCorrigido = new Total();
    this.multaTerceirosCorrigido = new Total();
    this.totalTerceirosCorrigido = new Total();

    const ocorrencias = this.inssSobreSalarios.getOcorrencias();
    const iter: Iterable<OcorrenciaDeInss> = Array.isArray(ocorrencias)
      ? ocorrencias
      : (ocorrencias as Set<OcorrenciaDeInss>);
    for (const oc of iter) {
      if (oc.isBaseVazia()) continue;
      this.seguradoReclamadoCorrigido.acumular(oc.getValorDevidoSeguradoFinalCorrigido());
      this.jurosSeguradoReclamadoCorrigido.acumular(oc.getJurosValorDevidoSeguradoFinal());
      this.multaSeguradoReclamadoCorrigido.acumular(oc.getMultaValorDevidoSeguradoFinal());
      this.totalSeguradoReclamadoCorrigido.acumular(oc.getTotalValorDevidoSeguradoFinal());

      this.empresaFinalCorrigido.acumular(oc.getValorDevidoEmpresaFinalCorrigido());
      this.jurosEmpresaFinalCorrigido.acumular(oc.getJurosValorDevidoEmpresaFinal());
      this.multaEmpresaFinalCorrigido.acumular(oc.getMultaValorDevidoEmpresaFinal());
      this.totalEmpresaFinalCorrigido.acumular(oc.getTotalValorDevidoEmpresaFinal());

      this.satCorrigido.acumular(oc.getValorDevidoSATCorrigido());
      this.jurosSatCorrigido.acumular(oc.getJurosValorDevidoSAT());
      this.multaSatCorrigido.acumular(oc.getMultaValorDevidoSAT());
      this.totalSatCorrigido.acumular(oc.getTotalValorDevidoSAT());

      this.terceirosCorrigido.acumular(oc.getValorDevidoTerceirosCorrigido());
      this.jurosTerceirosCorrigido.acumular(oc.getJurosValorDevidoTerceiros());
      this.multaTerceirosCorrigido.acumular(oc.getMultaValorDevidoTerceiros());
      this.totalTerceirosCorrigido.acumular(oc.getTotalValorDevidoTerceiros());
    }
    this.isCalculado = true;
    return this;
  }

  getSeguradoReclamadoCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().seguradoReclamadoCorrigido.getValor()); }
  getJurosSeguradoReclamadoCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().jurosSeguradoReclamadoCorrigido.getValor()); }
  getMultaSeguradoReclamadoCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().multaSeguradoReclamadoCorrigido.getValor()); }
  getTotalSeguradoReclamadoCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().totalSeguradoReclamadoCorrigido.getValor()); }

  getEmpresaFinalCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().empresaFinalCorrigido.getValor()); }
  getJurosEmpresaFinalCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().jurosEmpresaFinalCorrigido.getValor()); }
  getMultaEmpresaFinalCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().multaEmpresaFinalCorrigido.getValor()); }
  getTotalEmpresaFinalCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().totalEmpresaFinalCorrigido.getValor()); }

  getSatCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().satCorrigido.getValor()); }
  getJurosSatCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().jurosSatCorrigido.getValor()); }
  getMultaSatCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().multaSatCorrigido.getValor()); }
  getTotalSatCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().totalSatCorrigido.getValor()); }

  getTerceirosCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().terceirosCorrigido.getValor()); }
  getJurosTerceirosCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().jurosTerceirosCorrigido.getValor()); }
  getMultaTerceirosCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().multaTerceirosCorrigido.getValor()); }
  getTotalTerceirosCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().totalTerceirosCorrigido.getValor()); }
}
