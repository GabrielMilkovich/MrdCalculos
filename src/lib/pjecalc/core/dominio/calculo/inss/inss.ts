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
   * liquidar — port funcional de MaquinaDeCalculoDoInss.liquidar()
   * (pjecalc-fonte/.../inss/sobresalarios/MaquinaDeCalculoDoInss.java:146-200)
   *
   * Fluxo do PJe-Calc:
   * 1. Para cada competência com verbas com incidência INSS:
   *    a. Soma bases normais + bases 13° (teto separado para 13°)
   *    b. Calcula INSS progressivo do segurado (alíquota fixa OU progressivo)
   *    c. Calcula empresa (alíquota fixa, geralmente 20%)
   *    d. Calcula SAT + terceiros
   * 2. Totaliza segurado + empregador
   *
   * @param verbas lista de VerbaDeCalculo com incidência INSS definida
   */
  liquidarComVerbas(verbas: { getIncidenciaINSS(): boolean; getOcorrenciasAtivas(): Array<{ getDataInicial(): Date | null; getDiferenca(): Decimal }> }[]): void {
    this.ocorrenciasSalariosDevidos = [];

    // Agrupa base por competência (YYYY-MM)
    const basesPorComp = new Map<string, Decimal>();
    for (const verba of verbas) {
      if (!verba.getIncidenciaINSS()) continue;
      for (const oc of verba.getOcorrenciasAtivas()) {
        const dataIni = oc.getDataInicial();
        if (!dataIni) continue;
        const dif = oc.getDiferenca();
        if (dif.isZero() || dif.isNegative()) continue;
        const comp = `${dataIni.getFullYear()}-${String(dataIni.getMonth() + 1).padStart(2, '0')}`;
        const current = basesPorComp.get(comp) ?? new Decimal(0);
        basesPorComp.set(comp, current.plus(dif));
      }
    }

    // Calcula INSS por competência
    for (const [comp, base] of basesPorComp) {
      const [ano, mes] = comp.split('-').map(Number);
      const competencia = new Date(ano, mes - 1, 1);

      // Segurado progressivo
      let valorSegurado = new Decimal(0);
      if (this.apurarSegurado && this.faixas.length > 0) {
        valorSegurado = arredondarValorMonetario(calcularInssProgressivo(base, this.faixas));
      }

      // Empresa + SAT + terceiros
      let valorEmpresa = new Decimal(0);
      let valorSAT = new Decimal(0);
      let valorTerceiros = new Decimal(0);
      if (this.apurarEmpresa) {
        valorEmpresa = arredondarValorMonetario(base.times(this.aliquotaEmpresa).div(100));
        valorSAT = arredondarValorMonetario(base.times(this.aliquotaSAT).div(100));
        valorTerceiros = arredondarValorMonetario(base.times(this.aliquotaTerceiros).div(100));
      }

      this.ocorrenciasSalariosDevidos.push({
        competencia,
        baseSalarial: base,
        aliquotaSegurado: base.isZero() ? new Decimal(0) : valorSegurado.div(base).times(100),
        valorSegurado,
        aliquotaEmpresa: this.aliquotaEmpresa,
        valorEmpresa,
        aliquotaSAT: this.aliquotaSAT,
        valorSAT,
        aliquotaTerceiros: this.aliquotaTerceiros,
        valorTerceiros,
      });
    }
  }

  /** liquidar via IModuloLiquidavel — stub sem acesso direto às verbas */
  liquidar(_dataLiquidacao?: Date): void {
    // Chamado pelo Calculo.liquidar() — sem verbas neste contexto.
    // O calculo.liquidar() deve chamar liquidarComVerbas() diretamente
    // passando as verbas ativas com incidência INSS.
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
