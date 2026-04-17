/**
 * PJe-Calc v2.15.1 — TabelaDeJurosDeInss (abstract)
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.TabelaDeJurosDeInss
 *
 * Ref Java: pjecalc-fonte/.../calculo/inss/TabelaDeJurosDeInss.java (~221 linhas)
 *
 * Constrói `tabelaSelic: Map<competência, taxaAcumulada>` a partir das taxas
 * SELIC mensais (fonte: TABELA_SELIC_MENSAL enquanto o DAO JurosSelicInss
 * Supabase não está pronto). O algoritmo do Java acumula DECRESCENTEMENTE
 * (da dataFinal até dataInicial), somando a taxa de cada competência ao
 * acumulador e gravando no mapa. Quando `Lei 11941` está ativa, o acumulador
 * é resetado para `1` no ponto de corte (simulando a "correção já aplicada").
 *
 * Lookup (`calcularTaxaDeJurosSelic`) simplesmente retorna o acumulado da
 * competência solicitada. `calcularTaxaDeJurosSelicParaCalculoExterno` aplica
 * offset de -2 meses + remoção da parcela já aplicada.
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../../base/comum/helper-date';
import { naoNulo, nulo, somar, subtrair } from '../../../base/comum/utils';
import { TABELA_SELIC_MENSAL } from '../../indices/selic/tabela-selic-mensal';
import type { Calculo } from '../calculo';

/** Chave canônica no mapa: ISO yyyy-MM-01 (primeiro dia da competência). */
function chaveCompetencia(data: Date): string {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** Taxa SELIC mensal (em fração decimal; 1,16% → 0,0116). Null se fora da tabela. */
function taxaSelicMensal(data: Date): Decimal | null {
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1;
  const entrada = TABELA_SELIC_MENSAL.find(e => e.ano === ano && e.mes === mes);
  if (!entrada) return null;
  return new Decimal(entrada.taxa).div(100);
}

export abstract class TabelaDeJurosDeInss {
  /** Taxa já aplicada removida (Java linha 21, valor `BigDecimal.ONE`). */
  protected static readonly TAXA_JA_APLICADA_REMOVIDA = new Decimal(1);
  /** Carência da MP 1.596-14 (Java linha 20). */
  protected static readonly QTD_MESES_SEM_TAXA_APLICADA_AINDA = 2;

  protected calculo: Calculo;
  protected dataInicialParaCalculo: Date;
  protected dataFinalParaCalculo: Date | null;
  protected ocorrenciaAntesDaLei: boolean | null;
  /** Map<ISO-yyyy-MM-01, taxaAcumulada> */
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
    this.carregarTabelaDeJurosSelic(
      dataInicialParaCalculo,
      dataFinalParaCalculo ?? calculo.getDataDeLiquidacao(),
      ocorrenciaAntesDaLei ?? false,
    );
  }

  getCalculo(): Calculo { return this.calculo; }

  protected abstract isUsarJurosSelic(): boolean;
  protected abstract isUsarJurosBasico(): boolean;
  protected abstract getDataLimiteParaJurosBasico(): Date | null;

  /** isUsarJurosSelicEBasico (Java linha 43). */
  protected isUsarJurosSelicEBasico(): boolean {
    return (
      (this.isUsarJurosBasico() && this.isUsarJurosSelic()) ||
      (this.isUsarJurosSelic() && naoNulo(this.getDataLimiteParaJurosBasico()))
    );
  }

  /**
   * carregarTabelaDeJurosSelic (Java linha 51).
   *
   * Percorre as competências DECRESCENTEMENTE de `dataFinal` até `dataInicial`,
   * registrando taxa acumulada no map. Considera Lei 11.941 (reset para 1 no
   * mês de corte) e SELIC após data limite de juros básicos.
   */
  private carregarTabelaDeJurosSelic(
    dataInicialParaCalculo: Date,
    dataFinalParaCalculo: Date,
    ocorrenciaAntesDaLei: boolean,
  ): void {
    const params = this.calculo.getParametrosDeAtualizacao() as unknown as {
      getLei11941?: () => boolean;
      getLei11941Pago?: () => boolean;
    } | null;
    const lei11941 = params?.getLei11941?.() ?? false;
    const lei11941Pago = params?.getLei11941Pago?.() ?? false;

    if (!this.isUsarJurosSelic() && !lei11941 && !lei11941Pago) return;

    this.tabelaSelic = new Map();
    let taxaAcumulada = new Decimal(0);
    const dataCorrente = HelperDate.getInstance(dataFinalParaCalculo).setDay(1);
    dataCorrente.removeTime();

    // Java registra duas vezes no início (linha 60-61) — mês final e mês-1 com taxa=0.
    this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
    this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);

    const hdDataInicialParaCalculo = HelperDate.getInstance(dataInicialParaCalculo).setDay(1);
    hdDataInicialParaCalculo.removeTime();

    let hdDataLimiteJurosBasico = hdDataInicialParaCalculo;
    if (this.isUsarJurosSelicEBasico()) {
      const dataLimite = this.getDataLimiteParaJurosBasico();
      if (dataLimite) hdDataLimiteJurosBasico = HelperDate.getInstance(dataLimite).setDay(1);
    }

    // Checa se ocorrência cai após data-limite-correção-11941 (Devidos)
    const inssCore = this.calculo.getInss() as unknown as {
      getInssSobreSalariosDevidos?: () => {
        getDataLimiteCorrecao11941?: () => Date | null;
      } | null;
      getInssSobreSalariosPagos?: () => {
        getDataLimiteCorrecao11941?: () => Date | null;
      } | null;
    } | null;
    const dataLimiteDevidos = inssCore?.getInssSobreSalariosDevidos?.()?.getDataLimiteCorrecao11941?.() ?? null;
    const dataLimitePagos = inssCore?.getInssSobreSalariosPagos?.()?.getDataLimiteCorrecao11941?.() ?? null;

    let ocorrenciaDevidoDepoisDaLei = dataLimiteDevidos
      ? HelperDate.dateAfterOrEquals(
          dataInicialParaCalculo,
          HelperDate.getCurrentCompetence(dataLimiteDevidos).addMonth(-1).getDate(),
        )
      : false;
    if (this.calculo.getCalculoExterno()) ocorrenciaDevidoDepoisDaLei = !ocorrenciaAntesDaLei;

    let ocorrenciaPagoDepoisDaLei = dataLimitePagos
      ? HelperDate.dateAfterOrEquals(
          dataInicialParaCalculo,
          HelperDate.getCurrentCompetence(dataLimitePagos).addMonth(-1).getDate(),
        )
      : false;
    if (this.calculo.getCalculoExterno()) ocorrenciaPagoDepoisDaLei = !ocorrenciaAntesDaLei;

    if (lei11941 && ocorrenciaDevidoDepoisDaLei && dataLimiteDevidos) {
      taxaAcumulada = new Decimal(1);
      this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
      taxaAcumulada = this.acumularSelic(
        HelperDate.getCurrentCompetence(dataLimiteDevidos).getDate(),
        dataCorrente,
        taxaAcumulada,
      );
    } else if (lei11941Pago && ocorrenciaPagoDepoisDaLei && dataLimitePagos) {
      taxaAcumulada = new Decimal(1);
      this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
      taxaAcumulada = this.acumularSelic(
        HelperDate.getCurrentCompetence(dataLimitePagos).getDate(),
        dataCorrente,
        taxaAcumulada,
      );
    } else if (HelperDate.dateBeforeOrEquals(hdDataLimiteJurosBasico.getDate(), dataCorrente.getDate())) {
      taxaAcumulada = new Decimal(1);
      this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
      taxaAcumulada = this.acumularSelic(
        hdDataLimiteJurosBasico.getDate(),
        dataCorrente,
        taxaAcumulada,
      );
    } else {
      this.registrarValorDeJurosDoMesNaTabela(taxaAcumulada, dataCorrente);
    }

    // Preenche o período fixo restante (início até o ponto que o loop parou)
    // com a última taxaAcumulada. Java: `HelperDate.breakInMonths(inicial, final)`.
    const meses = this.mesesEntre(hdDataInicialParaCalculo.getDate(), dataCorrente.getDate());
    for (const mesData of meses) {
      this.tabelaSelic.set(chaveCompetencia(mesData), taxaAcumulada);
    }
  }

  /**
   * Acumula SELIC mês a mês de `dataInicio` (exclusive — primeira iteração
   * consome o mes `dataCorrente`) até `dataCorrente`, atualizando `dataCorrente`
   * in-place para refletir o mês processado. Retorna o último `taxaAcumulada`.
   */
  private acumularSelic(dataInicio: Date, dataCorrente: HelperDate, taxaInicial: Decimal): Decimal {
    let taxa = taxaInicial;
    // Itera mês a mês DECRESCENTEMENTE de dataCorrente até dataInicio
    const inicioCanon = chaveCompetencia(HelperDate.getInstance(dataInicio).setDay(1).getDate());
    while (chaveCompetencia(dataCorrente.getDate()) !== inicioCanon) {
      const taxaDoMes = taxaSelicMensal(dataCorrente.getDate());
      if (taxaDoMes) taxa = taxa.plus(taxaDoMes);
      dataCorrente.setDate(HelperDate.getInstance(dataCorrente.getDate()).addMonth(-1).getDate());
      dataCorrente.removeTime();
      this.registrarValorDeJurosDoMesNaTabela(taxa, dataCorrente);
    }
    return taxa;
  }

  /**
   * registrarValorDeJurosDoMesNaTabela (Java linha 127).
   * Registra a taxa acumulada na competência atual e recua 1 mês.
   */
  private registrarValorDeJurosDoMesNaTabela(taxaAcumulada: Decimal, dataCorrente: HelperDate): void {
    this.tabelaSelic.set(chaveCompetencia(dataCorrente.getDate()), taxaAcumulada);
    dataCorrente.setDate(HelperDate.getInstance(dataCorrente.getDate()).addMonth(-1).getDate());
    dataCorrente.removeTime();
  }

  /** Lista de primeiros dias dos meses entre `inicio` e `fim` inclusive. */
  private mesesEntre(inicio: Date, fim: Date): Date[] {
    const out: Date[] = [];
    const cur = HelperDate.getInstance(inicio).setDay(1);
    cur.removeTime();
    const fimCanon = chaveCompetencia(fim);
    let guard = 0;
    while (chaveCompetencia(cur.getDate()) !== fimCanon && guard < 1200) {
      out.push(new Date(cur.getDate()));
      cur.setDate(HelperDate.getInstance(cur.getDate()).addMonth(1).getDate());
      cur.removeTime();
      guard++;
    }
    return out;
  }

  /** calcularTaxaDeJurosSelic (Java linha 132) — lookup direto no mapa. */
  protected calcularTaxaDeJurosSelic(data: Date): Decimal | null {
    if (this.calculo.getCalculoExterno()) return this.calcularTaxaDeJurosSelicParaCalculoExterno(data);
    const hd = HelperDate.getInstance(data).setDay(1);
    hd.removeTime();
    return this.tabelaSelic.get(chaveCompetencia(hd.getDate())) ?? null;
  }

  /** calcularTaxaDeJurosSelicParaCalculoExterno (Java linha 141). */
  private calcularTaxaDeJurosSelicParaCalculoExterno(data: Date): Decimal | null {
    let removerTaxaAplicada = true;
    let hd = HelperDate.getInstance(data).addMonth(-2);
    const dataLimite = this.getDataLimiteParaJurosBasico();
    if (dataLimite) {
      const mesPosterior = HelperDate.getInstance(dataLimite).addMonth(1).setDay(1);
      if (HelperDate.dateBefore(hd.getDate(), mesPosterior.getDate()) && this.ocorrenciaAntesDaLei === true) {
        hd = mesPosterior;
        removerTaxaAplicada = false;
      }
    }
    hd.removeTime();
    let taxa = this.tabelaSelic.get(chaveCompetencia(hd.getDate())) ?? null;
    if (removerTaxaAplicada && taxa !== null) {
      taxa = subtrair(taxa, TabelaDeJurosDeInss.TAXA_JA_APLICADA_REMOVIDA);
    }
    return taxa;
  }

  /** calcularTaxaDeJurosSelicEBasico (Java linha 159). */
  protected calcularTaxaDeJurosSelicEBasico(data: Date, _isAtualizacao: boolean): Decimal | null {
    const dataLimiteBasico = this.getDataLimiteParaJurosBasico();
    if (dataLimiteBasico && HelperDate.dateAfter(data, dataLimiteBasico)) {
      return this.calcularTaxaDeJurosSelic(data);
    }
    const selic = this.calcularTaxaDeJurosSelic(data) ?? new Decimal(0);
    // TODO(integracao-futura): somar juros básicos da parent TabelaDeJuros
    // quando a integração com o contexto de juros estiver disponível.
    const padrao = new Decimal(0);
    return somar(selic, padrao);
  }

  /** calcularTaxaDeJuros (Java linha 175). */
  calcularTaxaDeJuros(data: Date): Decimal | null {
    const inssCore = this.calculo.getInss() as unknown as {
      getInssSobreSalariosDevidos?: () => { getDataLimiteCorrecao11941?: () => Date | null } | null;
      getInssSobreSalariosPagos?: () => { getDataLimiteCorrecao11941?: () => Date | null } | null;
    } | null;
    const params = this.calculo.getParametrosDeAtualizacao() as unknown as {
      getLei11941?: () => boolean;
      getLei11941Pago?: () => boolean;
    } | null;

    const dataLimiteDev = inssCore?.getInssSobreSalariosDevidos?.()?.getDataLimiteCorrecao11941?.() ?? null;
    if (
      naoNulo(dataLimiteDev) &&
      (params?.getLei11941?.() ?? false) &&
      HelperDate.dateAfterOrEquals(
        data,
        HelperDate.getCurrentCompetence(dataLimiteDev as Date).getDate(),
      )
    ) {
      return this.calcularTaxaDeJurosSelic(data);
    }

    const dataLimitePag = inssCore?.getInssSobreSalariosPagos?.()?.getDataLimiteCorrecao11941?.() ?? null;
    if (
      naoNulo(dataLimitePag) &&
      (params?.getLei11941Pago?.() ?? false) &&
      HelperDate.dateAfterOrEquals(
        data,
        HelperDate.getCurrentCompetence(dataLimitePag as Date).getDate(),
      )
    ) {
      return this.calcularTaxaDeJurosSelic(data);
    }

    if (this.isUsarJurosSelicEBasico()) return this.calcularTaxaDeJurosSelicEBasico(data, false);
    if (this.isUsarJurosBasico()) {
      // TODO(integracao-futura): delegar para TabelaDeJuros (parent no Java).
      return null;
    }
    if (this.isUsarJurosSelic()) return this.calcularTaxaDeJurosSelic(data);
    return null;
  }

  /** calcularTaxaDeJurosDaAtualizacao (Java linha 194). */
  calcularTaxaDeJurosDaAtualizacao(data: Date, ocorrenciaAntesDaLei: boolean): Decimal | null {
    const inssCore = this.calculo.getInss() as unknown as {
      getInssSobreSalariosDevidos?: () => { getDataLimiteCorrecao11941?: () => Date | null } | null;
      getInssSobreSalariosPagos?: () => { getDataLimiteCorrecao11941?: () => Date | null } | null;
    } | null;
    const params = this.calculo.getParametrosDeAtualizacao() as unknown as {
      getLei11941?: () => boolean;
      getLei11941Pago?: () => boolean;
    } | null;

    const dataLimiteDev = inssCore?.getInssSobreSalariosDevidos?.()?.getDataLimiteCorrecao11941?.() ?? null;
    let ocorrenciaDepoisDaLei = dataLimiteDev
      ? HelperDate.dateAfterOrEquals(
          data,
          HelperDate.getCurrentCompetence(dataLimiteDev).getDate(),
        )
      : false;
    if (this.calculo.getCalculoExterno()) ocorrenciaDepoisDaLei = !ocorrenciaAntesDaLei;
    if (
      naoNulo(dataLimiteDev) &&
      (params?.getLei11941?.() ?? false) &&
      ocorrenciaDepoisDaLei
    ) {
      return this.calcularTaxaDeJurosSelic(data);
    }

    const dataLimitePag = inssCore?.getInssSobreSalariosPagos?.()?.getDataLimiteCorrecao11941?.() ?? null;
    ocorrenciaDepoisDaLei = dataLimitePag
      ? HelperDate.dateAfterOrEquals(
          data,
          HelperDate.getCurrentCompetence(dataLimitePag).getDate(),
        )
      : false;
    if (this.calculo.getCalculoExterno()) ocorrenciaDepoisDaLei = !ocorrenciaAntesDaLei;
    if (
      naoNulo(dataLimitePag) &&
      (params?.getLei11941Pago?.() ?? false) &&
      ocorrenciaDepoisDaLei
    ) {
      return this.calcularTaxaDeJurosSelic(data);
    }

    if (this.isUsarJurosSelicEBasico()) return this.calcularTaxaDeJurosSelicEBasico(data, true);
    if (this.isUsarJurosBasico()) {
      // TODO(integracao-futura): delegar para TabelaDeJuros (parent no Java).
      return null;
    }
    if (this.isUsarJurosSelic()) return this.calcularTaxaDeJurosSelic(data);
    // Suprime "unused" warning mantendo o parâmetro para fidelidade 1:1.
    void nulo(ocorrenciaAntesDaLei);
    return null;
  }
}
