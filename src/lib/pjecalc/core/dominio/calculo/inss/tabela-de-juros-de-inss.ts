/**
 * PJe-Calc v2.15.1 — TabelaDeJurosDeInss (abstract)
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.TabelaDeJurosDeInss
 *
 * Ref Java: pjecalc-fonte/.../calculo/inss/TabelaDeJurosDeInss.java
 *
 * Classe abstrata que constrói a tabela de taxas SELIC (acumuladas) de INSS
 * por competência. Subclasses: `TabelaDeJurosInssSalariosDevidos` e
 * `TabelaDeJurosInssSalariosPagos` (sobresalarios/), que diferem apenas pelas
 * flags sobre qual grupo de salários usar.
 *
 * Conceitos:
 *   tabelaSelic: Map<competência, taxaAcumulada>
 *   registrarValorDeJurosDoMesNaTabela — preenche o mapa mês a mês decrescente
 *   QTD_MESES_SEM_TAXA_APLICADA_AINDA (2) — período de carência da MP 1.596-14
 *
 * Porte simplificado: como o acesso a JurosSelicInss / ParametrosDeAtualizacao
 * depende de um repositório que ainda não foi portado, mantemos os métodos
 * como TODO-stubs com assinatura completa e documentação, para que a
 * `MaquinaDeCalculoDoInss` possa ser implementada posteriormente.
 */
import type Decimal from 'decimal.js';
import type { Calculo } from '../calculo';

export abstract class TabelaDeJurosDeInss {
  protected static readonly QTD_MESES_SEM_TAXA_APLICADA_AINDA = 2;
  protected calculo: Calculo;
  protected dataInicialParaCalculo: Date;
  protected dataFinalParaCalculo: Date | null;
  protected ocorrenciaAntesDaLei: boolean | null;
  protected tabelaSelic: Map<string, Decimal> = new Map();

  constructor(
    calculo: Calculo,
    dataInicialParaCalculo: Date,
    dataFinalParaCalculo: Date | null = null,
    ocorrenciaAntesDaLei: boolean | null = null,
  ) {
    this.calculo = calculo;
    this.dataInicialParaCalculo = dataInicialParaCalculo;
    this.dataFinalParaCalculo = dataFinalParaCalculo;
    this.ocorrenciaAntesDaLei = ocorrenciaAntesDaLei;
    // TODO(fase-6): this.carregarTabelaDeJurosSelic(...)
  }

  getCalculo(): Calculo { return this.calculo; }

  protected abstract isUsarJurosSelic(): boolean;
  protected abstract isUsarJurosBasico(): boolean;
  protected abstract getDataLimiteParaJurosBasico(): Date | null;

  /** isUsarJurosSelicEBasico (Java linha 43) */
  protected isUsarJurosSelicEBasico(): boolean {
    return (
      (this.isUsarJurosBasico() && this.isUsarJurosSelic()) ||
      (this.isUsarJurosSelic() && this.getDataLimiteParaJurosBasico() !== null)
    );
  }

  /**
   * calcularTaxaDeJuros (Java linha 175)
   *
   * Retorna a taxa SELIC/básica/combinada aplicável para a competência `data`.
   * Consulta `tabelaSelic` pré-calculada ou delega para o pai (`TabelaDeJuros`).
   *
   * TODO(fase-6): Portar carregamento via JurosSelicInss.obterTodosPorPeriodo.
   */
  calcularTaxaDeJuros(_data: Date): Decimal | null {
    return null;
  }

  /**
   * calcularTaxaDeJurosDaAtualizacao (Java linha 194)
   *
   * Variante para período de atualização (pós-liquidação). Similar ao método
   * acima mas considera `ocorrenciaAntesDaLei` para cálculos externos.
   *
   * TODO(fase-6): idem.
   */
  calcularTaxaDeJurosDaAtualizacao(_data: Date, _ocorrenciaAntesDaLei: boolean): Decimal | null {
    return null;
  }
}
