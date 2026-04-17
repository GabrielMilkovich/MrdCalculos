/**
 * PJe-Calc v2.15.1 — TabelaDeJurosDeIrpf
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.TabelaDeJurosDeIrpf
 *
 * Ref Java: pjecalc-fonte/.../calculo/irpf/TabelaDeJurosDeIrpf.java (~85 linhas)
 *
 * Monta a tabela acumulada de SELIC IRPF (JurosSelicIrpf) para um período.
 * Diferente de `TabelaDeJurosDeInss`, aqui não há lógica de Lei 11.941 —
 * apenas SELIC acumulada do período inicial até a liquidação.
 *
 * TODO(fase-7): o carregamento depende de JurosSelicIrpf.obterTodosPorPeriodo
 * (repositório ainda não portado). Por ora, `tabelaSelic` fica vazio e
 * `calcularTaxaDeJurosSelic` retorna null.
 */
import type Decimal from 'decimal.js';
import type { Calculo } from '../calculo';

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
    // TODO(fase-7): this.carregarTabelaDeJurosSelic(...)
  }

  getCalculo(): Calculo { return this.calculo; }

  /**
   * calcularTaxaDeJurosSelic (Java linha 74) — consulta o map pela data (ajustada
   * para 1º dia do mês). Retorna null se não achar.
   */
  protected calcularTaxaDeJurosSelic(data: Date): Decimal | null {
    const key = this.keyFor(data);
    return this.tabelaSelic.get(key) ?? null;
  }

  /** calcularTaxaDeJuros (Java linha 81) — delega para Selic. */
  calcularTaxaDeJuros(data: Date): Decimal | null {
    return this.calcularTaxaDeJurosSelic(data);
  }

  private keyFor(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }
}
