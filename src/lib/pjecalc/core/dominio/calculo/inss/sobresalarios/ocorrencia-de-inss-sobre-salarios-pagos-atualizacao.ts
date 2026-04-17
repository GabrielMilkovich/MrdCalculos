/**
 * PJe-Calc v2.15.1 — OcorrenciaDeInssSobreSalariosPagosAtualizacao
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagosAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/OcorrenciaDeInssSobreSalariosPagosAtualizacao.java
 *
 * Atualização (pós-liquidação) de uma ocorrência de INSS sobre salários pagos.
 * Mesma estrutura de `...DevidosAtualizacao`, substituindo a FK.
 */
import Decimal from 'decimal.js';
import { OcorrenciaDeInssAtualizacao } from './ocorrencia-de-inss-atualizacao';
import type { OcorrenciaDeInssSobreSalariosPagos } from './ocorrencia-de-inss-sobre-salarios-pagos';
import type { InssSobreSalariosPagos } from './inss-sobre-salarios-pagos';
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

export class OcorrenciaDeInssSobreSalariosPagosAtualizacao extends OcorrenciaDeInssAtualizacao {
  private id: number | null = null;
  private inssSobreSalariosPagos: InssSobreSalariosPagos | null = null;

  constructor(
    ocorrenciaPagos?: OcorrenciaDeInssSobreSalariosPagos,
    ultimaAmortizada?: OcorrenciaDeInssSobreSalariosPagosAtualizacao,
  ) {
    super();
    if (ocorrenciaPagos && ultimaAmortizada) {
      this.inicializarDeUltimaAmortizada(ocorrenciaPagos, ultimaAmortizada);
    } else if (ocorrenciaPagos) {
      this.inicializarDeOcorrencia(ocorrenciaPagos);
    }
  }

  getId(): number | null { return this.id; }

  getInssSobreSalariosPagos(): InssSobreSalariosPagos | null { return this.inssSobreSalariosPagos; }
  setInssSobreSalariosPagos(v: InssSobreSalariosPagos | null): void { this.inssSobreSalariosPagos = v; }

  private inicializarDeOcorrencia(oc: OcorrenciaDeInssSobreSalariosPagos): void {
    this.setInssSobreSalariosPagos(oc.getInssSobreSalariosPagos());
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

    // TODO(fase-6): atualizarJurosDoCalculoExterno (Java linha 131)

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

  private inicializarDeUltimaAmortizada(
    oc: OcorrenciaDeInssSobreSalariosPagos,
    ultima: OcorrenciaDeInssSobreSalariosPagosAtualizacao,
  ): void {
    this.setInssSobreSalariosPagos(oc.getInssSobreSalariosPagos());
    this.setDataInicioPeriodo(oc.getDataInicioPeriodo());
    this.setDataTerminoPeriodo(oc.getDataTerminoPeriodo());
    this.setDataOcorrenciaInss(oc.getDataOcorrenciaInss());
    this.setIndiceCorrecao(oc.getIndiceCorrecao());
    this.setOcorrenciaDecimoTerceiro(oc.getOcorrenciaDecimoTerceiro());
    this.setPago(ZERO);

    const valorDevidoTotal = ultima.getDevidoDiferenca();
    const valorDevidoCorrigidoTotal = aplicarCorrecao(oc.getIndiceCorrecao(), valorDevidoTotal);
    const valorJurosTotal = aplicarJuros(oc.getTaxaDeJuros(), valorDevidoCorrigidoTotal);
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
