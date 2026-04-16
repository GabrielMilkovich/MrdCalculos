/**
 * PJe-Calc v2.15.1 — Irpf
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/irpf/Irpf.java (~1675 linhas)
 *
 * O IRPF no PJe-Calc aplica:
 *   - Art. 12-A Lei 7.713/88 (RRA — Rendimentos Recebidos Acumuladamente)
 *   - Tributação exclusiva 13º salário
 *   - Tributação separada de férias
 *   - Dedução de CS (INSS), previdência privada, pensão alimentícia
 *   - Tabela progressiva mensal por NM (número de meses)
 *
 * Neste port, a estrutura está preparada mas a lógica completa será portada
 * quando o módulo de INSS estiver completo (IRPF depende do INSS para dedução).
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';

export interface FaixaDeIrpf {
  ate: Decimal;
  aliquota: Decimal;
  deducao: Decimal;
}

export class Irpf implements IModuloLiquidavel {
  private baseDeCalculo: Decimal = new Decimal(0);
  private deducoes: Decimal = new Decimal(0);
  private baseTributavel: Decimal = new Decimal(0);
  private impostoDevido: Decimal = new Decimal(0);
  private mesesRRA: number = 1;
  private faixas: FaixaDeIrpf[] = [];
  private deduzirCS: boolean = true;
  private dependentes: number = 0;
  private deducaoDependente: Decimal = new Decimal('189.59'); // 2025

  // ── Getters/Setters ──
  getBaseDeCalculo(): Decimal { return this.baseDeCalculo; }
  getDeducoes(): Decimal { return this.deducoes; }
  getBaseTributavel(): Decimal { return this.baseTributavel; }
  getImpostoDevido(): Decimal { return this.impostoDevido; }
  getMesesRRA(): number { return this.mesesRRA; }
  setMesesRRA(v: number): void { this.mesesRRA = v; }
  setFaixas(v: FaixaDeIrpf[]): void { this.faixas = v; }
  setDeduzirCS(v: boolean): void { this.deduzirCS = v; }
  setDependentes(v: number): void { this.dependentes = v; }
  setDeducaoDependente(v: Decimal): void { this.deducaoDependente = v; }

  /**
   * liquidar — calcula IR Art. 12-A RRA.
   * Implementação a completar quando os dados de base de cálculo + deduções
   * estiverem integrados via VerbaDeCalculo + Inss.
   */
  liquidar(): void {
    // Stub — lógica completa requer integração com Calculo + Inss
  }
}
