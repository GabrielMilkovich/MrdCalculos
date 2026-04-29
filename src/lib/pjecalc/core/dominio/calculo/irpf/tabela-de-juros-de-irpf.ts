/**
 * PJe-Calc v2.15.1 — TabelaDeJurosDeIrpf
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.TabelaDeJurosDeIrpf
 *
 * Ref Java: pjecalc-fonte/.../calculo/irpf/TabelaDeJurosDeIrpf.java (~85 linhas)
 *
 * Monta a tabela acumulada de SELIC IRPF (JurosSelicIrpf) para um periodo.
 * Diferente de `TabelaDeJurosDeInss`, aqui nao ha logica de Lei 11.941 —
 * apenas SELIC acumulada do periodo inicial ate a liquidacao.
 *
 * Estado anterior: stub que sempre retornava null (TODO fase-7).
 * Estado atual: usa TABELA_SELIC_MENSAL (ja portada) para calcular taxa
 * acumulada decrescente do periodoFinal ate o periodoInicial.
 */
import Decimal from 'decimal.js';
import { TABELA_SELIC_MENSAL } from '../../indices/selic/tabela-selic-mensal';
import type { Calculo } from '../calculo';

const ZERO = new Decimal(0);

function chaveCompetencia(data: Date): string {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function taxaSelicMensal(ano: number, mes: number): Decimal | null {
  const entrada = TABELA_SELIC_MENSAL.find(e => e.ano === ano && e.mes === mes);
  if (!entrada) return null;
  return new Decimal(entrada.taxa).div(100);
}

export class TabelaDeJurosDeIrpf {
  protected calculo: Calculo;
  protected dataInicialParaCalculo: Date;
  protected dataFinalParaCalculo: Date | null;
  protected tabelaSelic: Map<string, Decimal> = new Map();

  constructor(
    calculo: Calculo,
    dataInicialParaCalculo: Date,
    dataFinalParaCalculo: Date | null = null,
  ) {
    this.calculo = calculo;
    this.dataInicialParaCalculo = dataInicialParaCalculo;
    this.dataFinalParaCalculo = dataFinalParaCalculo;
    this.carregarTabelaDeJurosSelic();
  }

  getCalculo(): Calculo { return this.calculo; }

  /**
   * Java carregarTabelaDeJurosSelic — itera DECRESCENTEMENTE
   * (dataFinal → dataInicial) somando taxa SELIC mensal e
   * gravando o acumulado por competencia.
   */
  protected carregarTabelaDeJurosSelic(): void {
    const inicio = this.dataInicialParaCalculo;
    const fim = this.dataFinalParaCalculo ?? this.calculo.getDataDeLiquidacao() ?? new Date();
    if (!inicio || !fim) return;
    let acumulado = ZERO;
    // Cursor da dataFinal ao dataInicial.
    const cursor = new Date(Date.UTC(fim.getFullYear(), fim.getMonth(), 1));
    const limite = new Date(Date.UTC(inicio.getFullYear(), inicio.getMonth(), 1));
    while (cursor.getTime() >= limite.getTime()) {
      const taxa = taxaSelicMensal(cursor.getFullYear(), cursor.getMonth() + 1);
      if (taxa) acumulado = acumulado.plus(taxa);
      this.tabelaSelic.set(chaveCompetencia(cursor), acumulado);
      cursor.setUTCMonth(cursor.getUTCMonth() - 1);
    }
  }

  /**
   * calcularTaxaDeJurosSelic (Java linha 74) — consulta o map pela data
   * (ajustada para 1o dia do mes). Retorna null se nao achar.
   */
  protected calcularTaxaDeJurosSelic(data: Date): Decimal | null {
    const key = chaveCompetencia(data);
    return this.tabelaSelic.get(key) ?? null;
  }

  /** calcularTaxaDeJuros (Java linha 81) — delega para Selic. */
  calcularTaxaDeJuros(data: Date): Decimal | null {
    return this.calcularTaxaDeJurosSelic(data);
  }

  /** Helper para uso interno em testes. */
  getTabelaSelic(): Map<string, Decimal> {
    return this.tabelaSelic;
  }
}
