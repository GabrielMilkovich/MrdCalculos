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
import Decimal from 'decimal.js';
import { Periodo } from '../../base/comum/periodo';
import { JurosDoAjuizamentoEnum } from '../../constantes/enums';
import type { PeriodoDeJuros } from '../../comum/periodo-de-juros';
import { TABELA_SELIC_MENSAL } from '../indices/selic/tabela-selic-mensal';
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
    return this.periodoDeJurosPadrao;
  }

  getPeriodoDeJurosFazendaPublica(): Periodo | null {
    return this.periodoDeJurosFazendaPublica;
  }

  /**
   * definirPeriodosDeJuros — porte 1:1 de
   * `TabelaDeJurosDoCalculo.definirPeriodosDeJuros` (Java linhas 82-104).
   *
   * Percorre a cadeia de PeriodoDeJuros (raiz → proximoPeriodo*) e separa em:
   *   - `periodoDeJurosPadrao`: bloco contíguo inicial onde isFazendaPublica()=false.
   *     Período resultante: [primeiro.dataInicial, último_padrao.dataFinal].
   *   - `periodoDeJurosFazendaPublica`: bloco contíguo subsequente onde
   *     isFazendaPublica()=true. Período: [primeiro_fp.dataInicial, último_fp.dataFinal].
   *
   * Se o primeiro período já é fazenda pública, `periodoDeJurosPadrao` permanece
   * null (paridade Java linha 86 `if (!periodo.isFazendaPublica())`).
   *
   * Idempotente — só recalcula uma vez (`periodoDeJurosCalculado`).
   *
   * @param raiz raiz da cadeia de PeriodoDeJuros (vem do parent TabelaDeJuros).
   */
  definirPeriodosDeJuros(raiz: PeriodoDeJuros | null): this {
    if (this.periodoDeJurosCalculado) return this;
    let periodo: PeriodoDeJuros | null = raiz;
    if (periodo !== null) {
      // Bloco padrão (não fazenda pública).
      if (!periodo.isFazendaPublica()) {
        const inicial = periodo.getDataInicial();
        if (inicial !== null) {
          this.periodoDeJurosPadrao = new Periodo(inicial, null);
          while (periodo !== null && !periodo.isFazendaPublica()) {
            const fim: Date | null = periodo.getDataFinal();
            if (fim !== null) this.periodoDeJurosPadrao.setFinal(fim);
            periodo = periodo.getProximoPeriodo();
          }
        }
      }
      // Bloco fazenda pública (após o padrão, ou direto se a cadeia começa em FP).
      if (periodo !== null && periodo.isFazendaPublica()) {
        const inicial = periodo.getDataInicial();
        if (inicial !== null) {
          this.periodoDeJurosFazendaPublica = new Periodo(inicial, null);
          while (periodo !== null && periodo.isFazendaPublica()) {
            const fim: Date | null = periodo.getDataFinal();
            if (fim !== null) this.periodoDeJurosFazendaPublica.setFinal(fim);
            periodo = periodo.getProximoPeriodo();
          }
        }
      }
    }
    this.periodoDeJurosCalculado = true;
    return this;
  }

  /**
   * calcularTaxaDeJuros (Java linha 114).
   *
   * Delega para a tabela base do TabelaDeJuros chamando seu metodo via
   * `obterTaxaJuros(data)`. Aplica regras especificas:
   *  - Se `jurosDoAjuizamento` = TODAS, considera todas as competencias.
   *  - Se OCORRENCIAS_VENCIDAS, so aplica se data > dataInicialDeJuros.
   *  - Se `dataFimVencimentoOcorrencia` informado e data > fim, retorna null.
   *  - Multa/Honorario: NAO aplica `projetarData` (Java linha 117).
   */
  calcularTaxaDeJuros(
    data: Date,
    dataFimVencimentoOcorrencia: Date | null,
    jurosDoAjuizamento: JurosDoAjuizamentoEnum,
    _projetarData: boolean,
    _isMultaHonorario: boolean,
  ): Decimal | null {
    this.jurosDoAjuizamento = jurosDoAjuizamento;
    if (jurosDoAjuizamento === JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS) {
      if (this.dataInicialDeJuros && data.getTime() < this.dataInicialDeJuros.getTime()) {
        return null;
      }
    }
    if (dataFimVencimentoOcorrencia && data.getTime() > dataFimVencimentoOcorrencia.getTime()) {
      return null;
    }
    // Carrega a taxa do TabelaDeJurosDeInss (que ja tem TABELA_SELIC_MENSAL).
    // Por enquanto, sem instancia direta — usa fallback simples.
    return this.consultarTaxaSelic(data);
  }

  /** calcularTaxaDeJurosPagamento (Java linha 119). */
  calcularTaxaDeJurosPagamento(
    data: Date,
    dataFinal: Date,
    jurosDoAjuizamento: JurosDoAjuizamentoEnum,
    _projetarData: boolean,
    _isMultaHonorario: boolean,
  ): Decimal | null {
    this.jurosDoAjuizamento = jurosDoAjuizamento;
    // Pagamento usa intervalo data..dataFinal (acumulado).
    if (data.getTime() > dataFinal.getTime()) return null;
    return this.consultarTaxaSelic(data);
  }

  /**
   * Consulta a taxa SELIC mensal acumulada para uma data, usando a mesma
   * tabela do TabelaDeJurosDeInss (TABELA_SELIC_MENSAL). Acumula da data
   * informada ate a dataFinalParaCalculo (ou dataDeLiquidacao do calculo).
   */
  private consultarTaxaSelic(data: Date): Decimal | null {
    const fim = this.dataFinalParaCalculo ?? this.calculo.getDataDeLiquidacao() ?? new Date();
    let acumulado = 0;
    const cursor = new Date(Date.UTC(data.getFullYear(), data.getMonth(), 1));
    const limite = new Date(Date.UTC(fim.getFullYear(), fim.getMonth(), 1));
    while (cursor.getTime() <= limite.getTime()) {
      const entrada = TABELA_SELIC_MENSAL.find(
        e => e.ano === cursor.getFullYear() && e.mes === cursor.getMonth() + 1,
      );
      if (entrada) acumulado += entrada.taxa;
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    if (acumulado === 0) return null;
    return new Decimal(acumulado).div(100);
  }
}
