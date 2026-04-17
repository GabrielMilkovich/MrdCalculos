/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDeIrpf
 * Porte estrutural (stub) de: br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.MaquinaDeCalculoDeIrpf
 *
 * Ref Java: pjecalc-fonte/.../calculo/irpf/MaquinaDeCalculoDeIrpf.java (~1675 linhas)
 *
 * Orquestrador do cálculo de IRPF trabalhista. Consome:
 *   - Irpf (configuração: deduções, regime, dependentes)
 *   - Calculo (verbas, histórico salarial, apurações de juros)
 *   - TabelaDeJurosDeIrpf (SELIC)
 *   - Tabela progressiva oficial (RFB) por data
 *
 * Responsabilidades:
 *   1) liquidar(): popula `Irpf.ocorrencias` aplicando Art. 12-A (RRA mensal)
 *      e separação por tipo (NORMAL, TRIBUTACAO_EXCLUSIVA, TRIB_EM_SEPARADO,
 *      RRA_ANOS_ANTERIORES) conforme flags do Irpf.
 *   2) liquidarAtualizacao(dataEvento, proporcoesIrpf, creditosRecl,
 *      debitosRecl, hasPagamentoPrincipal): cria OcorrenciaDeIrpfAtualizacao
 *      para cada ocorrência ativa usando proporções do ProporcoesIrpf.
 *   3) liquidarAtualizacaoCalculoExterno(...): variante para cálculo externo.
 *   4) aplicarPagamento(dataEvento, pagamento): amortiza pagamento nas
 *      OcorrenciaDeIrpfPagamento e distribui diferenças.
 *   5) aplicarPagamentoNoSaldo(dataLiquidacao): consolida pagamento final.
 *
 * **Status**: stub estrutural — assinaturas 1:1 com o Java para permitir
 * implementação incremental nas fases 9-10 (quando Pagamento, Calculo completo
 * e ParcelasAtualizaveis* estiverem portados).
 */
import Decimal from 'decimal.js';
import type { Irpf } from './irpf';
import type { ProporcoesIrpf } from './proporcoes-irpf';

// Placeholders — entidades de Pagamento (Fase 9) ainda não portadas.
export interface Pagamento { /* stub */ }
export interface CreditosDoReclamante {
  getPagoPrincipal?(): Decimal | null;
  getDiferencaPrincipal?(): Decimal | null;
  getValorPrincipal(): Decimal;
  getJuroPrincipal(): Decimal;
}
export interface DebitosDoReclamante { /* stub */ }

const ZERO = new Decimal(0);

export class MaquinaDeCalculoDeIrpf {
  private irpf: Irpf;

  constructor(irpf: Irpf) {
    this.irpf = irpf;
  }

  getIrpf(): Irpf { return this.irpf; }

  /** liquidar (Java linha 914) — entry point. TODO(fase-7): implementar. */
  liquidar(): void {
    // TODO(fase-7): percorrer `calculo.verbasAtivas`, agrupar por
    // competência + tipo (NORMAL/EXCLUSIVA/SEPARADO/ANOS_ANTERIORES),
    // aplicar tabela progressiva e criar OcorrenciaDeIrpf.
  }

  /**
   * liquidarAtualizacao (Java linha 233) — snapshot pós-pagamento.
   * Usa proporcoesIrpf para distribuir valores entre categorias.
   */
  liquidarAtualizacao(
    _dataEvento: Date,
    _proporcoesIrpf: ProporcoesIrpf,
    _creditoDoReclamante: CreditosDoReclamante,
    _debitosDoReclamante: DebitosDoReclamante,
    _hasPagamentoPrincipal: boolean,
  ): void {
    // TODO(fase-7)
  }

  /** liquidarAtualizacaoCalculoExterno (Java linha 74) */
  liquidarAtualizacaoCalculoExterno(
    _dataEvento: Date,
    _creditoDoReclamante: CreditosDoReclamante,
    _debitosDoReclamante: DebitosDoReclamante,
    _hasPagamentoPrincipal: boolean,
  ): void {
    // TODO(fase-7)
  }

  /** aplicarPagamento (Java linha 1617) */
  aplicarPagamento(_dataEvento: Date, _pagamento: Pagamento): void {
    // TODO(fase-7 / fase-9)
  }

  /** aplicarPagamentoNoSaldo (Java linha 1638) */
  aplicarPagamentoNoSaldo(_dataDeLiquidacao: Date): void {
    // TODO(fase-7 / fase-9)
  }

  /**
   * getTotalDiferencaComJurosEMultaAtualizacaoPagamentoNoSaldo (Java linha 1526)
   * Soma total da diferença devida incluindo juros e multa para pagamento no
   * dia do saldo.
   */
  getTotalDiferencaComJurosEMultaAtualizacaoPagamentoNoSaldo(_dataEvento: Date): Decimal {
    return ZERO; // TODO(fase-7)
  }

  /** getTotalDiferencaComJurosEMultaAtualizacao (Java linha 1535) */
  getTotalDiferencaComJurosEMultaAtualizacao(): Decimal {
    return ZERO; // TODO(fase-7)
  }

  /** getTotalDevidoComJurosEMultaAtualizacao (Java linha 1544) */
  getTotalDevidoComJurosEMultaAtualizacao(_dataEvento: Date): Decimal {
    return ZERO; // TODO(fase-7)
  }

  /** getTotalDevidoDeImpostoReferenteAoPagamento (referenciado pelo Irpf) */
  getTotalDevidoDeImpostoReferenteAoPagamento(_pagamento: Pagamento): Decimal {
    return ZERO; // TODO(fase-7)
  }
}
