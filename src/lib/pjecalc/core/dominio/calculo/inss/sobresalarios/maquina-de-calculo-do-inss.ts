/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDoInss
 * Porte parcial de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.MaquinaDeCalculoDoInss
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/MaquinaDeCalculoDoInss.java (~1640 linhas)
 *
 * Status por método (integracao incremental):
 *   - calcularJurosDosSalariosDevidos / Pagos           → implementado (C3)
 *   - calcularTaxaDeJurosDosSalariosDevidos / Pagos     → implementado (C3)
 *   - liquidar / liquidarAtualizacao                     → pendente (sessao seguinte)
 *   - liquidarInssSobreSalariosDevidos/Pagos             → pendente
 *   - aplicarPagamento                                    → pendente
 *
 * Dependencias em uso:
 *   - TabelaDeJurosInssSalariosDevidos / Pagos (C1, SELIC real)
 *   - OcorrenciaDeInssSobreSalariosDevidos / Pagos (getDataOcorrenciaInss,
 *     getOcorrenciaDecimoTerceiro, isJurosEMultaPrevidenciario, setTaxaDeJuros)
 *   - Inss / Calculo / ParametrosDeAtualizacao (flags Lei 11941)
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../../../base/comum/helper-date';
import { naoNulo, nulo, obterPercentualPara } from '../../../../base/comum/utils';
import { TipoValorEnum } from '../../../constantes/enums';
import type { Inss } from '../inss';
import type { OcorrenciaDeInssSobreSalariosDevidos } from './ocorrencia-de-inss-sobre-salarios-devidos';
import type { OcorrenciaDeInssSobreSalariosPagos } from './ocorrencia-de-inss-sobre-salarios-pagos';
import { TabelaDeJurosInssSalariosDevidos } from './tabela-de-juros-inss-salarios-devidos';
import { TabelaDeJurosInssSalariosPagos } from './tabela-de-juros-inss-salarios-pagos';

const ZERO = new Decimal(0);
const UM = new Decimal(1);

// ─────────────────────────────────────────────────────────────────────
// Inputs simplificados — Fase 9 (espelha pattern usado em pensao-alimenticia)
// ─────────────────────────────────────────────────────────────────────

/**
 * BaseVerbaInput — mapeamento para `verba.getOcorrenciasOptimizerListSearch().search(competencia)`.
 *
 * O Java consulta as ocorrências de cada VerbaDeCalculo ativa com IncidenciaINSS,
 * agrupa por competência (ano-mês) e separa entre 13o/normal. Para liquidar
 * `valorBaseVerbas`, basta termos pré-agrupado os totais por (competencia, is13o).
 */
export interface BaseVerbaInput {
  /** YYYY-MM da ocorrência. */
  competencia: string;
  /** True se a verba é caracteristica DECIMO_TERCEIRO_SALARIO. */
  is13o: boolean;
  /** Soma de `getDiferencaParaCalculoDasIncidencias()` no mês — base nominal. */
  baseNominal: Decimal;
}

/** Aliquota progressiva (faixa) para calcular `aliquotaDoTotalSegurado`. */
export interface FaixaInssInput {
  ate: Decimal;
  aliquota: Decimal; // 0-100
}

/**
 * TabelaAliquotasInssInput — equivale ao
 * TabelaPrevidenciariaSeguradoEmpregadoOptimizerListSearch.
 * Cada linha tem competencia inicial/final (string YYYY-MM) e faixas.
 * Quando `tipo='fixa'`, retorna sempre `aliquotaFixa`.
 */
export interface TabelaAliquotasInssInput {
  tipo: 'fixa' | 'progressiva';
  aliquotaFixa?: Decimal;
  faixas?: { competenciaInicio: string; competenciaFim: string | null; faixas: FaixaInssInput[] }[];
}

/** Multa previdenciária por competência (TaxaMultaPrevidenciaria.obterListaOtimizada). */
export interface TaxaMultaInput {
  competenciaInicio: string;
  competenciaFim: string | null;
  taxa: Decimal; // 0-100
  tipoMulta: string | null;
}

/** Pagamento simplificado (Pagamento.java reduzido ao mínimo). */
export interface Pagamento {
  data: Date;
  valor: Decimal;
  /** Indica se o valor amortiza segurado, empresa, SAT ou terceiros. */
  destino: 'segurado' | 'empresa' | 'sat' | 'terceiros';
}

/** Débitos do reclamante (saldo amortizável). */
export interface DebitosDoReclamante {
  saldoSegurado: Decimal;
}

/** Outros débitos do reclamado (empresa/SAT/terceiros). */
export interface OutrosDebitosReclamado {
  saldoEmpresa: Decimal;
  saldoSAT: Decimal;
  saldoTerceiros: Decimal;
}

/**
 * MESES_NAO_CONSIDERADOS_PARA_JUROS — Java linha 68.
 * Carência da MP 1.596-14 (não faz mais diferença nas ocorrências atuais, mas
 * mantido para fidelidade).
 */
const MESES_NAO_CONSIDERADOS_PARA_JUROS = 4;

export class MaquinaDeCalculoDoInss {
  private inss: Inss;

  // Caches (Java campos de mesmo nome nas linhas 71-86).
  private tabelaDeJurosSalariosDevidos: TabelaDeJurosInssSalariosDevidos | null = null;
  private tabelaDeJurosSalariosDevidosAnterior: TabelaDeJurosInssSalariosDevidos | null = null;
  private tabelaDeJurosSalariosPagos: TabelaDeJurosInssSalariosPagos | null = null;
  private tabelaDeJurosSalariosPagosAnterior: TabelaDeJurosInssSalariosPagos | null = null;

  private dataLiquidacao: Date | null = null;
  private dataUltimaLiquidacao: Date | null = null;

  constructor(inss: Inss) {
    this.inss = inss;
  }

  getInss(): Inss { return this.inss; }

  // ─────────────────────────────────────────────────────────────────────
  // Inputs auxiliares (settados antes de liquidar() para evitar dependencias
  // pesadas — VerbaDeCalculo, HistoricoSalarial, TaxaMultaPrevidenciaria).
  // ─────────────────────────────────────────────────────────────────────
  private basesPorCompetencia: BaseVerbaInput[] = [];
  private tabelaAliquotas: TabelaAliquotasInssInput | null = null;
  private taxasDeMulta: TaxaMultaInput[] = [];

  /** Permite ao adapter injetar bases pré-agregadas (Java itera VerbaDeCalculo). */
  setBasesPorCompetencia(bases: BaseVerbaInput[]): void { this.basesPorCompetencia = bases; }
  setTabelaAliquotas(tabela: TabelaAliquotasInssInput | null): void { this.tabelaAliquotas = tabela; }
  setTaxasDeMulta(taxas: TaxaMultaInput[]): void { this.taxasDeMulta = taxas; }

  /** liquidar (Java linha 146) — entry point do calculo de INSS.
   *  Pipeline (espelho do Java):
   *    1. dataLiquidacao = parametro
   *    2. se nao ha ocorrencias, gera (skipped — caller responsabilizado)
   *    3. determina apuracaoMulta range (skipped — uso simplificado)
   *    4. liquidarInssSobreSalariosDevidos / Pagos
   */
  liquidar(dataLiquidacao: Date): void {
    this.dataLiquidacao = dataLiquidacao;
    const devidos = this.inss.getInssSobreSalariosDevidos();
    if (devidos && devidos.existemOcorrencias()) {
      this.liquidarInssSobreSalariosDevidos();
    }
    const apurarPagos = this.inss.getApurarInssSobreSalariosPagos();
    const pagos = this.inss.getInssSobreSalariosPagos();
    if (apurarPagos && pagos && pagos.existemOcorrencias()) {
      this.liquidarInssSobreSalariosPagos();
    }
  }

  /** liquidarAtualizacao (Java linha 92). Re-aplica fluxo de liquidacao na atualizacao. */
  liquidarAtualizacao(dataEvento: Date): void {
    this.dataLiquidacao = dataEvento;
    const devidos = this.inss.getInssSobreSalariosDevidos();
    if (devidos && devidos.existemOcorrencias()) {
      this.liquidarInssSobreSalariosDevidos();
    }
    const apurarPagos = this.inss.getApurarInssSobreSalariosPagos();
    const pagos = this.inss.getInssSobreSalariosPagos();
    if (apurarPagos && pagos && pagos.existemOcorrencias()) {
      this.liquidarInssSobreSalariosPagos();
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // calcularTaxaDeJuros* (Java linhas 210-262)
  // ─────────────────────────────────────────────────────────────────────

  /** calcularTaxaDeJurosDosSalariosDevidos (Java linha 210). */
  private calcularTaxaDeJurosDosSalariosDevidos(data: Date): Decimal | null {
    if (nulo(this.tabelaDeJurosSalariosDevidos)) {
      const dataAPartirDoMesAnteriorDaOcorrenciaOriginal = HelperDate
        .getInstance(data)
        .addMonth(-1)
        .getDate();
      this.tabelaDeJurosSalariosDevidos = new TabelaDeJurosInssSalariosDevidos(
        this.inss.getCalculo(),
        dataAPartirDoMesAnteriorDaOcorrenciaOriginal,
      );
    }
    return this.tabelaDeJurosSalariosDevidos!.calcularTaxaDeJuros(data);
  }

  /** calcularTaxaDeJurosDosSalariosDevidosAtualizacao (Java linha 218). */
  private calcularTaxaDeJurosDosSalariosDevidosAtualizacao(
    dataOcorrencia: Date,
    dataEvento: Date,
    ocorrenciaAntesDaLei: boolean,
  ): Decimal | null {
    const calculoExterno = this.inss.getCalculo().getCalculoExterno();
    if (nulo(this.tabelaDeJurosSalariosDevidos) && calculoExterno) {
      const dataDaOcorrenciaTresMesesAntes = HelperDate
        .getInstance(dataOcorrencia)
        .addMonth(-MESES_NAO_CONSIDERADOS_PARA_JUROS)
        .getDate();
      this.tabelaDeJurosSalariosDevidos = new TabelaDeJurosInssSalariosDevidos(
        this.inss.getCalculo(),
        dataDaOcorrenciaTresMesesAntes,
        dataEvento,
        ocorrenciaAntesDaLei,
      );
      if (naoNulo(this.dataUltimaLiquidacao)) {
        this.tabelaDeJurosSalariosDevidosAnterior = new TabelaDeJurosInssSalariosDevidos(
          this.inss.getCalculo(),
          dataDaOcorrenciaTresMesesAntes,
          this.dataUltimaLiquidacao,
          ocorrenciaAntesDaLei,
        );
      }
    } else if (nulo(this.tabelaDeJurosSalariosDevidos)) {
      const dataDaOcorrenciaAPartirDoMesAnterior = HelperDate
        .getInstance(dataOcorrencia)
        .addMonth(-1)
        .getDate();
      this.tabelaDeJurosSalariosDevidos = new TabelaDeJurosInssSalariosDevidos(
        this.inss.getCalculo(),
        dataDaOcorrenciaAPartirDoMesAnterior,
        dataEvento,
        ocorrenciaAntesDaLei,
      );
    }

    if (calculoExterno) {
      const taxaAtual = this.tabelaDeJurosSalariosDevidos!.calcularTaxaDeJurosDaAtualizacao(
        dataOcorrencia,
        ocorrenciaAntesDaLei,
      );
      const taxaAnterior = this.tabelaDeJurosSalariosDevidosAnterior
        ? this.tabelaDeJurosSalariosDevidosAnterior.calcularTaxaDeJurosDaAtualizacao(
            dataOcorrencia,
            ocorrenciaAntesDaLei,
          )
        : null;
      if (!taxaAtual) return null;
      if (!taxaAnterior) return taxaAtual;
      return taxaAtual.minus(taxaAnterior);
    }
    return this.tabelaDeJurosSalariosDevidos!.calcularTaxaDeJurosDaAtualizacao(
      dataOcorrencia,
      ocorrenciaAntesDaLei,
    );
  }

  /** calcularTaxaDeJurosDosSalariosPagos (Java linha 237). */
  private calcularTaxaDeJurosDosSalariosPagos(data: Date): Decimal | null {
    if (nulo(this.tabelaDeJurosSalariosPagos)) {
      const dataAPartirDoMesAnteriorDaOcorrenciaOriginal = HelperDate
        .getInstance(data)
        .addMonth(-1)
        .getDate();
      this.tabelaDeJurosSalariosPagos = new TabelaDeJurosInssSalariosPagos(
        this.inss.getCalculo(),
        dataAPartirDoMesAnteriorDaOcorrenciaOriginal,
      );
    }
    return this.tabelaDeJurosSalariosPagos!.calcularTaxaDeJuros(data);
  }

  /** calcularTaxaDeJurosDosSalariosPagosAtualizacao (Java linha 245). */
  private calcularTaxaDeJurosDosSalariosPagosAtualizacao(
    dataOcorrencia: Date,
    dataEvento: Date,
    ocorrenciaAntesDaLei: boolean,
  ): Decimal | null {
    const calculoExterno = this.inss.getCalculo().getCalculoExterno();
    if (nulo(this.tabelaDeJurosSalariosPagos) && calculoExterno) {
      const dataDaOcorrenciaTresMesesAntes = HelperDate
        .getInstance(dataOcorrencia)
        .addMonth(-MESES_NAO_CONSIDERADOS_PARA_JUROS)
        .getDate();
      this.tabelaDeJurosSalariosPagos = new TabelaDeJurosInssSalariosPagos(
        this.inss.getCalculo(),
        dataDaOcorrenciaTresMesesAntes,
        dataEvento,
        ocorrenciaAntesDaLei,
      );
      if (naoNulo(this.dataUltimaLiquidacao)) {
        this.tabelaDeJurosSalariosPagosAnterior = new TabelaDeJurosInssSalariosPagos(
          this.inss.getCalculo(),
          dataDaOcorrenciaTresMesesAntes,
          this.dataUltimaLiquidacao,
          ocorrenciaAntesDaLei,
        );
      }
    } else if (nulo(this.tabelaDeJurosSalariosPagos)) {
      const dataDaOcorrenciaAPartirDoMesAnterior = HelperDate
        .getInstance(dataOcorrencia)
        .addMonth(-1)
        .getDate();
      this.tabelaDeJurosSalariosPagos = new TabelaDeJurosInssSalariosPagos(
        this.inss.getCalculo(),
        dataDaOcorrenciaAPartirDoMesAnterior,
        dataEvento,
        ocorrenciaAntesDaLei,
      );
    }

    if (calculoExterno) {
      const taxaAtual = this.tabelaDeJurosSalariosPagos!.calcularTaxaDeJurosDaAtualizacao(
        dataOcorrencia,
        ocorrenciaAntesDaLei,
      );
      const taxaAnterior = this.tabelaDeJurosSalariosPagosAnterior
        ? this.tabelaDeJurosSalariosPagosAnterior.calcularTaxaDeJurosDaAtualizacao(
            dataOcorrencia,
            ocorrenciaAntesDaLei,
          )
        : null;
      if (!taxaAtual) return null;
      if (!taxaAnterior) return taxaAtual;
      return taxaAtual.minus(taxaAnterior);
    }
    return this.tabelaDeJurosSalariosPagos!.calcularTaxaDeJurosDaAtualizacao(
      dataOcorrencia,
      ocorrenciaAntesDaLei,
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // calcularJurosDosSalariosDevidos (Java linhas 264-293)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * calcularJurosDosSalariosDevidos (sobrecarga sem args, Java linha 264).
   * Delega para versao completa usando ocorrencias do proprio Inss.
   */
  calcularJurosDosSalariosDevidos(): void;
  calcularJurosDosSalariosDevidos(
    ocorrencias: Iterable<OcorrenciaDeInssSobreSalariosDevidos>,
    isAtualizacao: boolean,
  ): void;
  calcularJurosDosSalariosDevidos(
    ocorrencias?: Iterable<OcorrenciaDeInssSobreSalariosDevidos>,
    isAtualizacao: boolean = false,
  ): void {
    const lista = ocorrencias ?? this.inss.getInssSobreSalariosDevidos().getOcorrencias();

    // Reset da cache (Java linha 269).
    this.tabelaDeJurosSalariosDevidos = null;
    let leiJaAplicada = false;

    const params = this.inss.getCalculo().getParametrosDeAtualizacao();
    const calculoExterno = this.inss.getCalculo().getCalculoExterno();

    for (const ocorrencia of lista) {
      const dataOcorr = ocorrencia.getDataOcorrenciaInss();
      if (!dataOcorr) continue;

      const dataLimiteCorrecao = this.inss
        .getInssSobreSalariosDevidos()
        .getDataLimiteCorrecao11941();

      let ocorrenciaAntesDaLei = dataLimiteCorrecao
        ? HelperDate.dateBefore(
            dataOcorr,
            HelperDate.getCurrentCompetence(dataLimiteCorrecao).getDate(),
          )
        : true;
      if (calculoExterno) ocorrenciaAntesDaLei = ocorrencia.getOcorrenciaDecimoTerceiro() === false;

      // Pula juros se nao usa trabalhista/previdenciario E esta em correcao11941 ANTES da lei (Java linha 276).
      if (
        !params.getJurosTrabalhistasDosSalariosDevidosDoINSS() &&
        !params.getJurosPrevidenciariosDosSalariosDevidosDoINSS() &&
        this.inss.getInssSobreSalariosDevidos().getCorrecao11941() &&
        ocorrenciaAntesDaLei
      ) {
        continue;
      }

      let ocorrenciaDepoisDaLei = dataLimiteCorrecao
        ? HelperDate.dateAfterOrEquals(
            dataOcorr,
            HelperDate.getCurrentCompetence(dataLimiteCorrecao).getDate(),
          )
        : false;
      if (calculoExterno) ocorrenciaDepoisDaLei = ocorrencia.getOcorrenciaDecimoTerceiro();

      // Reset da cache no 1o evento pos-lei (Java linha 281).
      if (
        !leiJaAplicada &&
        this.inss.getInssSobreSalariosDevidos().getCorrecao11941() &&
        ocorrenciaDepoisDaLei
      ) {
        this.tabelaDeJurosSalariosDevidos = null;
        leiJaAplicada = true;
      }

      // Edge case 13o (Java linha 286): se eh juros/multa previdenciaria E 13o E
      // competencia dezembro, recua 1 mes.
      let dataCalculoJuros = dataOcorr;
      if (
        !calculoExterno &&
        ocorrencia.isJurosEMultaPrevidenciario() &&
        ocorrencia.getOcorrenciaDecimoTerceiro() &&
        HelperDate.getInstance(dataOcorr).getMonth() === 11
      ) {
        dataCalculoJuros = HelperDate.getInstance(dataOcorr).addMonth(-1).getDate();
      }

      const taxaDeJuros = isAtualizacao
        ? this.calcularTaxaDeJurosDosSalariosDevidosAtualizacao(
            dataCalculoJuros,
            this.dataLiquidacao ?? this.inss.getCalculo().getDataDeLiquidacao(),
            ocorrencia.getOcorrenciaDecimoTerceiro() === false,
          )
        : this.calcularTaxaDeJurosDosSalariosDevidos(dataCalculoJuros);

      ocorrencia.setTaxaDeJuros(taxaDeJuros);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // calcularJurosDosSalariosPagos (Java linhas 295-326)
  // ─────────────────────────────────────────────────────────────────────

  calcularJurosDosSalariosPagos(): void;
  calcularJurosDosSalariosPagos(
    ocorrencias: Iterable<OcorrenciaDeInssSobreSalariosPagos>,
    isAtualizacao: boolean,
  ): void;
  calcularJurosDosSalariosPagos(
    ocorrencias?: Iterable<OcorrenciaDeInssSobreSalariosPagos>,
    isAtualizacao: boolean = false,
  ): void {
    if (!this.inss.getApurarInssSobreSalariosPagos()) return;

    const lista = ocorrencias ?? this.inss.getInssSobreSalariosPagos().getOcorrencias();
    this.tabelaDeJurosSalariosPagos = null;
    let leiJaAplicada = false;

    const params = this.inss.getCalculo().getParametrosDeAtualizacao();
    const calculoExterno = this.inss.getCalculo().getCalculoExterno();

    for (const ocorrencia of lista) {
      const dataOcorr = ocorrencia.getDataOcorrenciaInss();
      if (!dataOcorr) continue;

      const dataLimiteCorrecao = this.inss
        .getInssSobreSalariosPagos()
        .getDataLimiteCorrecao11941();

      let ocorrenciaAntesDaLei = dataLimiteCorrecao
        ? HelperDate.dateBefore(
            dataOcorr,
            HelperDate.getCurrentCompetence(dataLimiteCorrecao).getDate(),
          )
        : true;
      if (calculoExterno) ocorrenciaAntesDaLei = ocorrencia.getOcorrenciaDecimoTerceiro() === false;

      // Java linha 308 checa getJurosTrabalhistasDosSalariosDevidosDoINSS/
      // getJurosPrevidenciariosDosSalariosDevidosDoINSS (nao Pagos — BUG no Java
      // preservado por fidelidade 1:1).
      if (
        !params.getJurosTrabalhistasDosSalariosDevidosDoINSS() &&
        !params.getJurosPrevidenciariosDosSalariosDevidosDoINSS() &&
        this.inss.getInssSobreSalariosPagos().getCorrecao11941() &&
        ocorrenciaAntesDaLei
      ) {
        continue;
      }

      let ocorrenciaDepoisDaLei = dataLimiteCorrecao
        ? HelperDate.dateAfterOrEquals(
            dataOcorr,
            HelperDate.getCurrentCompetence(dataLimiteCorrecao).getDate(),
          )
        : false;
      if (calculoExterno) ocorrenciaDepoisDaLei = ocorrencia.getOcorrenciaDecimoTerceiro();

      if (
        !leiJaAplicada &&
        this.inss.getInssSobreSalariosPagos().getCorrecao11941() &&
        ocorrenciaDepoisDaLei
      ) {
        this.tabelaDeJurosSalariosPagos = null;
        leiJaAplicada = true;
      }

      let dataCalculoJuros = dataOcorr;
      if (
        !calculoExterno &&
        ocorrencia.isJurosEMultaPrevidenciario() &&
        ocorrencia.getOcorrenciaDecimoTerceiro() &&
        HelperDate.getInstance(dataOcorr).getMonth() === 11
      ) {
        dataCalculoJuros = HelperDate.getInstance(dataOcorr).addMonth(-1).getDate();
      }

      const taxaDeJuros = isAtualizacao
        ? this.calcularTaxaDeJurosDosSalariosPagosAtualizacao(
            dataCalculoJuros,
            this.dataLiquidacao ?? this.inss.getCalculo().getDataDeLiquidacao(),
            ocorrencia.getOcorrenciaDecimoTerceiro() === false,
          )
        : this.calcularTaxaDeJurosDosSalariosPagos(dataCalculoJuros);

      ocorrencia.setTaxaDeJuros(taxaDeJuros);
    }
  }

  /** aplicarPagamento (Java linha 1562). TODO(integracao-futura). */
  aplicarPagamento(
    _inss: Inss,
    _pagamento: Pagamento,
    _debitosDoReclamante: DebitosDoReclamante,
    _outrosDebitosDoReclamado: OutrosDebitosReclamado,
  ): void {
    // TODO(integracao-futura): amortizar pagamento contra ocorrencias.
  }

  /** Utility: verifica se a máquina possui cálculo previamente rodado. */
  hasResultado(): boolean {
    const devidos = this.inss.getInssSobreSalariosDevidos();
    return devidos !== null && devidos.existemOcorrencias();
  }
}
