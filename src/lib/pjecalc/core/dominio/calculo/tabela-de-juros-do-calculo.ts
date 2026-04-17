/**
 * PJe-Calc v2.15.1 — TabelaDeJurosDoCalculo (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculo.TabelaDeJurosDoCalculo
 *
 * Ref Java: pjecalc-fonte/.../calculo/TabelaDeJurosDoCalculo.java (~124 linhas)
 *
 * Extende `TabelaDeJuros` (fase 5) com informações específicas do Calculo:
 *   - jurosDoAjuizamento (OCORRENCIAS_VENCIDAS / TODAS)
 *   - dataInicialDeJuros
 *   - periodoDeJurosPadrao / periodoDeJurosFazendaPublica (calculado lazy)
 *
 * **Status**: stub — a lógica de `calcularDataInicialDoPrimeiroPeriodoDeJuros`
 * e `definirPeriodosDeJuros` depende do `PeriodoDeJuros.proximoPeriodo` e das
 * flags do ParametrosDeAtualizacao. Implementação virá quando MaquinaDeCalculo
 * precisar de juros calculados.
 */
import type Decimal from 'decimal.js';
import type { Periodo } from '../../base/comum/periodo';
import { JurosDoAjuizamentoEnum } from '../../constantes/enums';
import type { Calculo } from './calculo';

export class TabelaDeJurosDoCalculo {
  private calculo: Calculo;
  private dataInicialParaCalculo: Date | null = null;
  private dataFinalParaCalculo: Date | null = null;
  private dataInicialDeJuros: Date | null = null;
  private jurosDoAjuizamento: JurosDoAjuizamentoEnum | null = null;
  private periodoDeJurosPadrao: Periodo | null = null;
  private periodoDeJurosFazendaPublica: Periodo | null = null;
  private periodoDeJurosCalculado: boolean = false;

  constructor(
    calculo: Calculo,
    dataInicialParaCalculo: Date | null = null,
    dataFinalParaCalculo: Date | null = null,
  ) {
    this.calculo = calculo;
    this.dataInicialParaCalculo = dataInicialParaCalculo;
    this.dataFinalParaCalculo = dataFinalParaCalculo;
  }

  getCalculo(): Calculo { return this.calculo; }

  getDataInicialParaCalculo(): Date | null { return this.dataInicialParaCalculo; }
  setDataInicialParaCalculo(d: Date | null): void { this.dataInicialParaCalculo = d; }

  getDataFinalParaCalculo(): Date | null { return this.dataFinalParaCalculo; }
  setDataFinalParaCalculo(d: Date | null): void { this.dataFinalParaCalculo = d; }

  getDataInicialDeJuros(): Date | null { return this.dataInicialDeJuros; }
  setDataInicialDeJuros(d: Date | null): void { this.dataInicialDeJuros = d; }

  getJurosDoAjuizamento(): JurosDoAjuizamentoEnum | null { return this.jurosDoAjuizamento; }
  setJurosDoAjuizamento(v: JurosDoAjuizamentoEnum | null): void { this.jurosDoAjuizamento = v; }

  getPeriodoDeJurosPadrao(): Periodo | null {
    this.definirPeriodosDeJuros();
    return this.periodoDeJurosPadrao;
  }

  getPeriodoDeJurosFazendaPublica(): Periodo | null {
    this.definirPeriodosDeJuros();
    return this.periodoDeJurosFazendaPublica;
  }

  private definirPeriodosDeJuros(): void {
    if (this.periodoDeJurosCalculado) return;
    // TODO(fase-10): iterar PeriodoDeJuros encadeados e separar padrão vs Fazenda.
    this.periodoDeJurosCalculado = true;
  }

  /**
   * calcularTaxaDeJuros (Java linha 114) — stub.
   * TODO(fase-10): delegar para TabelaDeJuros de comum/tabela-de-juros.
   */
  calcularTaxaDeJuros(
    _data: Date,
    _dataFimVencimentoOcorrencia: Date | null,
    jurosDoAjuizamento: JurosDoAjuizamentoEnum,
    _projetarData: boolean,
    _isMultaHonorario: boolean,
  ): Decimal | null {
    this.jurosDoAjuizamento = jurosDoAjuizamento;
    return null;
  }

  /** calcularTaxaDeJurosPagamento (Java linha 119) — stub */
  calcularTaxaDeJurosPagamento(
    _data: Date,
    _dataFinal: Date,
    jurosDoAjuizamento: JurosDoAjuizamentoEnum,
    _projetarData: boolean,
    _isMultaHonorario: boolean,
  ): Decimal | null {
    this.jurosDoAjuizamento = jurosDoAjuizamento;
    return null;
  }
}
