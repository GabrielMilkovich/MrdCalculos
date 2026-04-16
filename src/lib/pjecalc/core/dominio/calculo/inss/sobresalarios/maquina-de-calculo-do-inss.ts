/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDoInss
 * Porte parcial (structural) de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.MaquinaDeCalculoDoInss
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/MaquinaDeCalculoDoInss.java (~1640 linhas)
 *
 * Orquestrador central do cálculo de INSS. Consome:
 *   - Inss (configuração: alíquotas, atividade, Simples, períodos)
 *   - Calculo (histórico salarial, verbas, parametros de atualização)
 *   - TabelaPrevidenciaria* (otimizadores de faixas)
 *   - JurosSelicInss + TabelaDeJurosDeInss
 *
 * Responsabilidades:
 *   - liquidar(dataLiquidacao): popula OcorrenciaDeInssSobreSalariosDevidos
 *     e OcorrenciaDeInssSobreSalariosPagos a partir das verbas e históricos
 *   - liquidarAtualizacao(dataEvento): gera a lista de
 *     OcorrenciaDeInssSobreSalariosDevidosAtualizacao/PagosAtualizacao
 *   - calcularJurosDosSalariosDevidos / calcularJurosDosSalariosPagos
 *   - aplicarPagamento(pagamento, debitosDoReclamante, outrosDebitosDoReclamado):
 *     amortiza pagamentos contra as ocorrências corrigidas
 *
 * **Status**: stub estrutural. O fluxo de cálculo interno depende de
 * SimuladorDeBaseParaVerba, AplicadorDeDiferenca e do RepositorioDeInss
 * (ainda não portados). Mantemos as assinaturas 1:1 com o Java para permitir
 * implementação incremental.
 */
import type Decimal from 'decimal.js';
import type { Inss } from '../inss';
import type { OcorrenciaDeInssSobreSalariosDevidos } from './ocorrencia-de-inss-sobre-salarios-devidos';
import type { OcorrenciaDeInssSobreSalariosPagos } from './ocorrencia-de-inss-sobre-salarios-pagos';

// Placeholders para entidades de pagamento ainda não portadas.
export interface Pagamento { /* stub — ver Fase 9 */ }
export interface DebitosDoReclamante { /* stub */ }
export interface OutrosDebitosReclamado { /* stub */ }

export class MaquinaDeCalculoDoInss {
  private inss: Inss;

  constructor(inss: Inss) {
    this.inss = inss;
  }

  getInss(): Inss { return this.inss; }

  /**
   * liquidar (Java linha 146) — entry point do cálculo de INSS.
   * TODO(fase-6): implementar fluxo completo:
   *   1) obterListaOtimizadaAliquotasSeguradoEmpregado
   *   2) iterar meses [dataInicioPeriodo, dataTerminoPeriodo]
   *   3) para cada mês:
   *      - calcular base (histórico + verbas)
   *      - aplicar faixas progressivas
   *      - gerar OcorrenciaDeInssSobreSalariosDevidos/Pagos
   */
  liquidar(_dataLiquidacao: Date): void {
    // TODO(fase-6): ver RepositorioDeInss.geraOcorrenciasSobreSalariosDevidos / Pagos
  }

  /**
   * liquidarAtualizacao (Java linha 92) — gera a cadeia de atualizações
   * pós-liquidação para cada pagamento/evento (dataEvento).
   */
  liquidarAtualizacao(_dataEvento: Date): void {
    // TODO(fase-6)
  }

  /**
   * calcularJurosDosSalariosDevidos (Java linha 264/268) — preenche taxaDeJuros
   * em cada ocorrência a partir de TabelaDeJurosInssSalariosDevidos.
   */
  calcularJurosDosSalariosDevidos(
    _ocorrencias?: Iterable<OcorrenciaDeInssSobreSalariosDevidos>,
    _isAtualizacao?: boolean,
  ): void {
    // TODO(fase-6)
  }

  /**
   * calcularJurosDosSalariosPagos (Java linha 295/299) — idem para salários pagos.
   */
  calcularJurosDosSalariosPagos(
    _ocorrencias?: Iterable<OcorrenciaDeInssSobreSalariosPagos>,
    _isAtualizacao?: boolean,
  ): void {
    // TODO(fase-6)
  }

  /**
   * aplicarPagamento (Java linha 1562) — amortiza um Pagamento contra as
   * ocorrências de atualização. Distribui o valor entre segurado, empresa,
   * SAT e terceiros observando prioridades e tetos.
   */
  aplicarPagamento(
    _inss: Inss,
    _pagamento: Pagamento,
    _debitosDoReclamante: DebitosDoReclamante,
    _outrosDebitosDoReclamado: OutrosDebitosReclamado,
  ): void {
    // TODO(fase-6 / fase-9)
  }

  /** Utility: verifica se a máquina possui cálculo previamente rodado */
  hasResultado(): boolean {
    const devidos = this.inss.getInssSobreSalariosDevidos();
    return devidos !== null && devidos.existemOcorrencias();
  }

  /** Placeholder para somas — removido em implementação completa */
  protected somarOcorrencias(_valores: Iterable<Decimal | null>): Decimal | null {
    return null;
  }
}
