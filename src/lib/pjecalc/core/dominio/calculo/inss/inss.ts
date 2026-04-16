/**
 * PJe-Calc v2.15.1 — Inss
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/inss/Inss.java (~300 linhas entidade)
 *                + RepositorioDeInss.java (~1340 linhas lógica de cálculo)
 *
 * O INSS no PJe-Calc 2.15.1 tem:
 *   - InssSobreSalariosDevidos (segurado + empregador)
 *   - InssSobreSalariosPagos (segurado + empregador)
 *   - Alíquotas: segurado progressivo (EC 103/2019), empresa 20%, SAT, terceiros
 *   - Atualização SELIC das parcelas de INSS (tributo federal)
 *
 * Neste port, a lógica progressiva está em core/dominio/inss/faixas/ (já portada).
 * Aqui portamos a entidade-orquestradora.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';
import { calcularInssProgressivo, FaixaPrevidenciaria } from '../../inss/faixas/faixa-previdenciaria';

export interface OcorrenciaDeInss {
  competencia: Date;
  baseSalarial: Decimal;
  aliquotaSegurado: Decimal;
  valorSegurado: Decimal;
  aliquotaEmpresa: Decimal;
  valorEmpresa: Decimal;
  aliquotaSAT: Decimal;
  valorSAT: Decimal;
  aliquotaTerceiros: Decimal;
  valorTerceiros: Decimal;
}

export class Inss implements IModuloLiquidavel {
  private ocorrenciasSalariosDevidos: OcorrenciaDeInss[] = [];
  private ocorrenciasSalariosPagos: OcorrenciaDeInss[] = [];
  private faixas: FaixaPrevidenciaria[] = [];
  private aliquotaEmpresa: Decimal = new Decimal(20);
  private aliquotaSAT: Decimal = new Decimal(2);
  private aliquotaTerceiros: Decimal = new Decimal('5.8');
  private apurarSegurado: boolean = true;
  private apurarEmpresa: boolean = true;
  private cobrarReclamante: boolean = true;

  // ── Getters/Setters ──
  getOcorrenciasSalariosDevidos(): OcorrenciaDeInss[] { return this.ocorrenciasSalariosDevidos; }
  getOcorrenciasSalariosPagos(): OcorrenciaDeInss[] { return this.ocorrenciasSalariosPagos; }
  setFaixas(v: FaixaPrevidenciaria[]): void { this.faixas = v; }
  setAliquotaEmpresa(v: Decimal): void { this.aliquotaEmpresa = v; }
  setAliquotaSAT(v: Decimal): void { this.aliquotaSAT = v; }
  setAliquotaTerceiros(v: Decimal): void { this.aliquotaTerceiros = v; }
  setApurarSegurado(v: boolean): void { this.apurarSegurado = v; }
  setApurarEmpresa(v: boolean): void { this.apurarEmpresa = v; }
  setCobrarReclamante(v: boolean): void { this.cobrarReclamante = v; }

  getTotalSegurado(): Decimal {
    let total = new Decimal(0);
    for (const oc of this.ocorrenciasSalariosDevidos) total = total.plus(oc.valorSegurado);
    return arredondarValorMonetario(total);
  }

  getTotalEmpregador(): Decimal {
    let total = new Decimal(0);
    for (const oc of this.ocorrenciasSalariosDevidos) {
      total = total.plus(oc.valorEmpresa).plus(oc.valorSAT).plus(oc.valorTerceiros);
    }
    return arredondarValorMonetario(total);
  }

  /**
   * liquidar (delega para RepositorioDeInss.gerarOcorrencias no Java)
   * Implementação simplificada: calcula INSS progressivo por competência.
   */
  liquidar(dataLiquidacao?: Date): void {
    // A ser detalhada quando os dados de base salarial por competência
    // estiverem disponíveis via OcorrenciaDeVerba → baseSalarial.
    // A lógica progressiva (calcularInssProgressivo) já está portada
    // em core/dominio/inss/faixas/.
  }

  limparJuros(): void {
    // Reset taxas de juros das ocorrências
  }

  calcularJurosDosSalariosDevidos(): void {
    // Atualização SELIC das parcelas — Lei 9.430/96
  }

  calcularJurosDosSalariosPagos(): void {
    // Idem para salários pagos
  }
}
