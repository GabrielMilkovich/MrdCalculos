/**
 * PJe-Calc v2.15.1 — Fgts
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/fgts/Fgts.java (870 linhas)
 *
 * O FGTS no PJe-Calc tem:
 *   - Lista de OcorrenciaDeFgts (depósitos por competência)
 *   - OperacoesDeFgts (saques/depósitos do extrato)
 *   - Multa (40% rescisória, calculada ou informada)
 *   - LC 110/2001 (contribuição social 0,5% e 10%)
 *   - Correção via JAM (TR + 3% a.a.) ou índice trabalhista
 *
 * Neste port, a lógica de liquidação é delegada a MaquinaDeCalculoDoFgts
 * (a ser portado). Aqui portamos a estrutura de dados e os métodos essenciais.
 */
import Decimal from 'decimal.js';
import { naoNulo, nulo, arredondarValorMonetario, multiplicar } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';

/**
 * Representa uma ocorrência mensal de FGTS (depósito por competência).
 */
export interface OcorrenciaDeFgts {
  competencia: Date;
  baseVerba: Decimal;
  baseHistorico: Decimal;
  aliquota: Decimal;
  depositado: Decimal;
  diferenca: Decimal;
  diferencaCorrigida: Decimal | null;
  taxaDeJuros: Decimal | null;
  valorDaContribuicaoSocialDe05: Decimal;
}

export class Fgts implements IModuloLiquidavel {
  private ocorrencias: OcorrenciaDeFgts[] = [];
  private multa: boolean = false;
  private multaPercentual: Decimal = new Decimal(40);
  private contribuicaoSocial10: boolean = false;
  private contribuicaoSocial05: boolean = false;
  private valorDaMultaDoFgts: Decimal = new Decimal(0);
  private totalDaDiferenca: Decimal = new Decimal(0);
  private totalDaDiferencaCorrigida: Decimal = new Decimal(0);

  // ── Getters/Setters ──

  getOcorrencias(): OcorrenciaDeFgts[] { return this.ocorrencias; }
  setOcorrencias(v: OcorrenciaDeFgts[]): void { this.ocorrencias = v; }
  adicionarOcorrencia(o: OcorrenciaDeFgts): void { this.ocorrencias.push(o); }

  getMulta(): boolean { return this.multa; }
  setMulta(v: boolean): void { this.multa = v; }
  getMultaPercentual(): Decimal { return this.multaPercentual; }
  setMultaPercentual(v: Decimal): void { this.multaPercentual = v; }

  getContribuicaoSocial10(): boolean { return this.contribuicaoSocial10; }
  setContribuicaoSocial10(v: boolean): void { this.contribuicaoSocial10 = v; }
  getContribuicaoSocial05(): boolean { return this.contribuicaoSocial05; }
  setContribuicaoSocial05(v: boolean): void { this.contribuicaoSocial05 = v; }

  getValorDaMultaDoFgts(): Decimal { return this.valorDaMultaDoFgts; }
  getTotalDaDiferenca(): Decimal { return this.totalDaDiferenca; }
  getTotalDaDiferencaCorrigida(): Decimal { return this.totalDaDiferencaCorrigida; }

  // ── Liquidação ──

  /**
   * liquidar (linha 723) — delega para MaquinaDeCalculoDoFgts.
   * Implementação simplificada: totaliza diferenças e calcula multa.
   */
  liquidar(): void {
    let totalDiferenca = new Decimal(0);
    let totalCorrigida = new Decimal(0);

    for (const oc of this.ocorrencias) {
      totalDiferenca = totalDiferenca.plus(oc.diferenca);
      if (naoNulo(oc.diferencaCorrigida)) {
        totalCorrigida = totalCorrigida.plus(oc.diferencaCorrigida!);
      }
    }

    this.totalDaDiferenca = arredondarValorMonetario(totalDiferenca);
    this.totalDaDiferencaCorrigida = arredondarValorMonetario(totalCorrigida);

    // Multa: percentual sobre total corrigido (ou diferença se não corrigido)
    if (this.multa) {
      const baseMult = totalCorrigida.isZero() ? totalDiferenca : totalCorrigida;
      this.valorDaMultaDoFgts = arredondarValorMonetario(
        baseMult.times(this.multaPercentual).div(100)
      );
    }
  }

  limparJuros(): void {
    for (const oc of this.ocorrencias) {
      oc.taxaDeJuros = null;
    }
  }

  calcularJuros(): void {
    // Delega para MaquinaDeCalculoDoFgts — a ser portada
  }
}
