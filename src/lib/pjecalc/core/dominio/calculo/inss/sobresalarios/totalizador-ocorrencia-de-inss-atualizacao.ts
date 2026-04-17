/**
 * PJe-Calc v2.15.1 — TotalizadorOcorrenciaDeInssAtualizacao
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.TotalizadorOcorrenciaDeInssAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/TotalizadorOcorrenciaDeInssAtualizacao.java
 *
 * Acumula totais (devidoCorrigido, juros, multa, total, pago e as versões
 * "Diferenca") a partir de uma coleção de `OcorrenciaDeInssAtualizacao`.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../../base/comum/utils';
import type { OcorrenciaDeInssAtualizacao } from './ocorrencia-de-inss-atualizacao';

const ZERO = new Decimal(0);

class Total {
  private valor: Decimal = ZERO;
  acumular(v: Decimal | null): void { if (v !== null) this.valor = this.valor.plus(v); }
  getValor(): Decimal { return this.valor; }
}

export class TotalizadorOcorrenciaDeInssAtualizacao {
  private ocorrencias: Iterable<OcorrenciaDeInssAtualizacao>;
  private isCalculado = false;
  private devidoCorrigido = new Total();
  private juros = new Total();
  private multa = new Total();
  private total = new Total();
  private pago = new Total();
  private devidoCorrigidoDiferenca = new Total();
  private jurosDiferenca = new Total();
  private multaDiferenca = new Total();
  private totalDiferenca = new Total();

  constructor(ocorrencias: Iterable<OcorrenciaDeInssAtualizacao>) {
    this.ocorrencias = ocorrencias;
  }

  reset(): void { this.isCalculado = false; }

  private calcular(): this {
    if (this.isCalculado) return this;
    this.devidoCorrigido = new Total();
    this.juros = new Total();
    this.multa = new Total();
    this.total = new Total();
    this.pago = new Total();
    this.devidoCorrigidoDiferenca = new Total();
    this.jurosDiferenca = new Total();
    this.multaDiferenca = new Total();
    this.totalDiferenca = new Total();
    for (const oc of this.ocorrencias) {
      this.devidoCorrigido.acumular(oc.getDevidoCorrigido());
      this.juros.acumular(oc.getJuros());
      this.multa.acumular(oc.getMulta());
      this.total.acumular(oc.getTotal());
      this.pago.acumular(oc.getPago());
      this.devidoCorrigidoDiferenca.acumular(oc.getDevidoDiferenca());
      this.jurosDiferenca.acumular(oc.getJurosDiferenca());
      this.multaDiferenca.acumular(oc.getMultaDiferenca());
      this.totalDiferenca.acumular(oc.getTotalDiferenca());
    }
    this.isCalculado = true;
    return this;
  }

  getDevidoCorrigido(): Decimal { return arredondarValorMonetario(this.calcular().devidoCorrigido.getValor()); }
  getJuros(): Decimal { return arredondarValorMonetario(this.calcular().juros.getValor()); }
  getMulta(): Decimal { return arredondarValorMonetario(this.calcular().multa.getValor()); }
  getTotal(): Decimal { return arredondarValorMonetario(this.calcular().total.getValor()); }
  getPago(): Decimal { return arredondarValorMonetario(this.calcular().pago.getValor()); }
  getDevidoCorrigidoDiferenca(): Decimal { return arredondarValorMonetario(this.calcular().devidoCorrigidoDiferenca.getValor()); }
  getJurosDiferenca(): Decimal { return arredondarValorMonetario(this.calcular().jurosDiferenca.getValor()); }
  getMultaDiferenca(): Decimal { return arredondarValorMonetario(this.calcular().multaDiferenca.getValor()); }
  getTotalDiferenca(): Decimal { return arredondarValorMonetario(this.calcular().totalDiferenca.getValor()); }
}
