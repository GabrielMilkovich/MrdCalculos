/**
 * PJe-Calc v2.15.1 — OcorrenciaDeInssSobreSalariosDevidosAtualizacao
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidosAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/OcorrenciaDeInssSobreSalariosDevidosAtualizacao.java
 *
 * Snapshot da atualização (pós-liquidação) de uma OcorrenciaDeInssSobreSalariosDevidos.
 * Construtor consolida os 4 grupos (segurado/empresa/SAT/terceiros) em totais.
 */
import Decimal from 'decimal.js';
import { OcorrenciaDeInssAtualizacao } from './ocorrencia-de-inss-atualizacao';
import type { OcorrenciaDeInssSobreSalariosDevidos } from './ocorrencia-de-inss-sobre-salarios-devidos';
import type { InssSobreSalariosDevidos } from './inss-sobre-salarios-devidos';
import { arredondarValorMonetario } from '../../../../base/comum/utils';

const ZERO = new Decimal(0);

function somaSegura(a: Decimal, b: Decimal | null): Decimal {
  if (b === null) return a;
  return a.plus(b);
}

function aplicarCorrecao(indice: Decimal | null, valor: Decimal): Decimal {
  if (indice === null) return valor;
  return valor.times(indice);
}

function aplicarJuros(taxa: Decimal | null, valor: Decimal): Decimal {
  if (taxa === null) return ZERO;
  return valor.times(taxa).div(100);
}

function aplicarMulta(taxa: Decimal | null, valor: Decimal): Decimal {
  if (taxa === null) return ZERO;
  return valor.times(taxa).div(100);
}

export class OcorrenciaDeInssSobreSalariosDevidosAtualizacao extends OcorrenciaDeInssAtualizacao {
  private id: number | null = null;
  private inssSobreSalariosDevidos: InssSobreSalariosDevidos | null = null;

  constructor(
    ocorrenciaDevidos?: OcorrenciaDeInssSobreSalariosDevidos,
    ultimaAmortizada?: OcorrenciaDeInssSobreSalariosDevidosAtualizacao,
  ) {
    super();
    if (ocorrenciaDevidos && ultimaAmortizada) {
      this.inicializarDeUltimaAmortizada(ocorrenciaDevidos, ultimaAmortizada);
    } else if (ocorrenciaDevidos) {
      this.inicializarDeOcorrencia(ocorrenciaDevidos);
    }
  }

  getId(): number | null { return this.id; }

  getInssSobreSalariosDevidos(): InssSobreSalariosDevidos | null {
    return this.inssSobreSalariosDevidos;
  }
  setInssSobreSalariosDevidos(v: InssSobreSalariosDevidos | null): void {
    this.inssSobreSalariosDevidos = v;
  }

  /** Construtor Java linha 67 — consolida 4 grupos + aplica correção */
  private inicializarDeOcorrencia(oc: OcorrenciaDeInssSobreSalariosDevidos): void {
    this.setInssSobreSalariosDevidos(oc.getInssSobreSalariosDevidos());
    this.setDataInicioPeriodo(oc.getDataInicioPeriodo());
    this.setDataTerminoPeriodo(oc.getDataTerminoPeriodo());
    this.setDataOcorrenciaInss(oc.getDataOcorrenciaInss());
    this.setIndiceCorrecao(oc.getIndiceCorrecao());
    this.setOcorrenciaDecimoTerceiro(oc.getOcorrenciaDecimoTerceiro());
    this.setPago(ZERO);

    let valorDevidoTotal = ZERO;
    valorDevidoTotal = somaSegura(valorDevidoTotal, oc.getValorDevidoSeguradoFinal());
    valorDevidoTotal = somaSegura(valorDevidoTotal, oc.getValorDevidoEmpresaFinal());
    valorDevidoTotal = somaSegura(valorDevidoTotal, oc.getValorDevidoSAT());
    valorDevidoTotal = somaSegura(valorDevidoTotal, oc.getValorDevidoTerceiros());

    const valorDevidoCorrigidoTotal = aplicarCorrecao(oc.getIndiceCorrecao(), valorDevidoTotal);

    let valorJurosTotal = ZERO;
    valorJurosTotal = somaSegura(valorJurosTotal, oc.getJurosValorDevidoSeguradoFinal());
    valorJurosTotal = somaSegura(valorJurosTotal, oc.getJurosValorDevidoEmpresaFinal());
    valorJurosTotal = somaSegura(valorJurosTotal, oc.getJurosValorDevidoSAT());
    valorJurosTotal = somaSegura(valorJurosTotal, oc.getJurosValorDevidoTerceiros());

    // TODO(fase-6): atualizarJurosDoCalculoExterno (Java linha 132) —
    // depende de ParcelasAtualizaveisOutrosDebitosReclamado, ainda não portado.

    let valorMultaTotal = ZERO;
    valorMultaTotal = somaSegura(valorMultaTotal, oc.getMultaValorDevidoSeguradoFinal());
    valorMultaTotal = somaSegura(valorMultaTotal, oc.getMultaValorDevidoEmpresaFinal());
    valorMultaTotal = somaSegura(valorMultaTotal, oc.getMultaValorDevidoSAT());
    valorMultaTotal = somaSegura(valorMultaTotal, oc.getMultaValorDevidoTerceiros());

    const valorFinalTotal = valorDevidoCorrigidoTotal.plus(valorJurosTotal).plus(valorMultaTotal);

    this.setDevido(arredondarValorMonetario(valorDevidoTotal));
    this.setDevidoCorrigido(arredondarValorMonetario(valorDevidoCorrigidoTotal));
    this.setJuros(arredondarValorMonetario(valorJurosTotal));
    this.setMulta(arredondarValorMonetario(valorMultaTotal));
    this.setTotal(arredondarValorMonetario(valorFinalTotal));
    this.setDevidoDiferenca(this.getDevidoCorrigido());
    this.setJurosDiferenca(this.getJuros());
    this.setMultaDiferenca(this.getMulta());
    this.setTotalDiferenca(this.getTotal());
  }

  /** Construtor Java linha 151 — continua de uma amortização parcial anterior */
  private inicializarDeUltimaAmortizada(
    oc: OcorrenciaDeInssSobreSalariosDevidos,
    ultima: OcorrenciaDeInssSobreSalariosDevidosAtualizacao,
  ): void {
    this.setInssSobreSalariosDevidos(oc.getInssSobreSalariosDevidos());
    this.setDataInicioPeriodo(oc.getDataInicioPeriodo());
    this.setDataTerminoPeriodo(oc.getDataTerminoPeriodo());
    this.setDataOcorrenciaInss(oc.getDataOcorrenciaInss());
    this.setIndiceCorrecao(oc.getIndiceCorrecao());
    this.setOcorrenciaDecimoTerceiro(oc.getOcorrenciaDecimoTerceiro());
    this.setPago(ZERO);

    const valorDevidoTotal = ultima.getDevidoDiferenca();
    const valorDevidoCorrigidoTotal = aplicarCorrecao(oc.getIndiceCorrecao(), valorDevidoTotal);
    const valorJurosTotal = aplicarJuros(oc.getTaxaDeJuros(), valorDevidoCorrigidoTotal);
    // TODO(fase-6): se CalculoExterno, somar ultima.getJurosDiferenca()
    const valorMultaTotal = aplicarMulta(oc.getTaxaDeMulta(), valorDevidoCorrigidoTotal);
    const valorFinalTotal = valorDevidoCorrigidoTotal.plus(valorJurosTotal).plus(valorMultaTotal);

    this.setDevido(arredondarValorMonetario(valorDevidoTotal));
    this.setDevidoCorrigido(arredondarValorMonetario(valorDevidoCorrigidoTotal));
    this.setJuros(arredondarValorMonetario(valorJurosTotal));
    this.setMulta(arredondarValorMonetario(valorMultaTotal));
    this.setTotal(arredondarValorMonetario(valorFinalTotal));
    this.setDevidoDiferenca(this.getDevidoCorrigido());
    this.setJurosDiferenca(this.getJuros());
    this.setMultaDiferenca(this.getMulta());
    this.setTotalDiferenca(this.getTotal());
  }
}
