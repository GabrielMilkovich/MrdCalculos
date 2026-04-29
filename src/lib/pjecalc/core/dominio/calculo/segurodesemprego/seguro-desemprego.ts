/**
 * PJe-Calc v2.15.1 — SeguroDesemprego + MaquinaDeCalculoDeSeguroDesemprego
 * Porte 1:1 de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.SeguroDesemprego (596 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.MaquinaDeCalculoDeSeguroDesemprego (305 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.ItemHistoricoSalarialDeSeguroDesemprego (127 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.ItemSalarioDevidoDeSeguroDesemprego (142 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.segurodesemprego.TabelaSeguroDesemprego (referencia faixas)
 *
 * Lei 7.998/90 — calculo do valor mensal do seguro-desemprego para empregado
 * dispensado sem justa causa. Implementa:
 *   - Modo CALCULADO (faixas de remuneracao mensal × percentuais).
 *   - Modo INFORMADO (valor explicito).
 *   - Apuracao da media das 3 ultimas competencias anteriores a demissao
 *     (verbas devidas + historicos salariais).
 *   - Empregado domestico (Lei Complementar 150/2015): valor unico = 1×SM.
 *   - Aplicacao de piso (1×SM) e teto (limite por faixa).
 *   - Correcao monetaria do valor demissao→liquidacao.
 *   - Juros simples na data de demissao.
 *
 * Mantem export `SeguroDesemprego` legado para retrocompat engine v3.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

/** Java enum TipoValorSeguroDesempregoEnum. */
export type TipoValorSeguroDesemprego = 'CALCULADO' | 'INFORMADO';

/** Java enum TipoSalarioPagoEnum. */
export type TipoSalarioPago = 'HISTORICO_SALARIAL' | 'ULTIMA_REMUNERACAO' | 'MAIOR_REMUNERACAO' | 'NENHUM';

/**
 * Faixas progressivas (Lei 7.998/90 art. 5o). Tabela vigente conforme
 * Resolucao CODEFAT por ano. Source: pjecalc_seguro_desemprego DB.
 */
export interface TabelaSeguroDesemprego {
  /** Limite superior da Faixa 1 (R$). */
  valorFinalFaixa1: Decimal;
  /** Aliquota Faixa 1 (% — ex: 80). */
  valorPercentualFaixa1: Decimal;
  /** Aliquota Faixa 2 (% sobre excedente da F1 — ex: 50). */
  valorPercentualFaixa2: Decimal;
  /** Valor adicionado apos calculo F2 (constante da tabela). */
  somaFaixa2: Decimal;
  /** Piso (1× salario minimo nacional). */
  valorPiso: Decimal;
  /** Teto da parcela. */
  valorTeto: Decimal;
}

/** Java OcorrenciaDeVerba (subset). */
export interface VerbaSegDesempregoInput {
  competencia: string;
  dataInicial: Date;
  dataFinal: Date;
  ativo: boolean;
  diferenca: Decimal;
  diferencaIntegral: Decimal | null;
  /** Verba flag — se true, integralizacao customizada. */
  integralizar: boolean;
  excluirFeriasGozadas: boolean;
  excluirFaltaJustificada: boolean;
  excluirFaltaNaoJustificada: boolean;
}

/** Java OcorrenciaDoHistoricoSalarial (subset). */
export interface HistoricoSalarialInput {
  competencia: string;
  valor: Decimal;
}

/** Input para MaquinaDeCalculoDeSeguroDesemprego.liquidar(). */
export interface CalculoSegDesempregoInput {
  /** Data demissao (CLT requer demissao sem justa causa). */
  dataDemissao: Date;
  dataDeLiquidacao: Date;
  empregadoDomestico: boolean;
  /** TabelaSeguroDesemprego vigente na data de demissao. */
  tabelaSeguroDesemprego: TabelaSeguroDesemprego;
  /** Salario minimo na data de demissao (para domestico OU piso default). */
  salarioMinimoNaDataDemissao: Decimal;
  /** Verbas devidas com flag integralizar (Lei 11.962/2009). */
  verbas?: VerbaSegDesempregoInput[];
  /** Historicos salariais reportados. */
  historicosSalariais?: HistoricoSalarialInput[];
  /** Funcoes auxiliares opcionais (preencher se diasParaExcluir for usado). */
  obterDiasFerias?: (dataIni: Date, dataFim: Date) => number;
  obterFaltasJustificadas?: (dataIni: Date, dataFim: Date) => number;
  obterFaltasNaoJustificadas?: (dataIni: Date, dataFim: Date) => number;
  /** TipoSalarioPagoEnum — fonte de "salarios pagos" para calculo da media. */
  tipoSalarioPago: TipoSalarioPago;
  valorUltimaRemuneracao?: Decimal | null;
  valorMaiorRemuneracao?: Decimal | null;
  /** Indice acumulado entre demissao e liquidacao (para correcao). */
  indiceAcumuladoDemissaoLiquidacao: Decimal;
  /** Taxa de juros aplicavel a partir da data de demissao. */
  taxaJurosNaDataDemissao: Decimal;
}

/** Helper: diferenca em meses (yyyy-mm-01 truncado). */
function competenciaMinusN(data: Date, n: number): string {
  const d = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Helper: zera valor negativo (Java Utils.zerarSeNegativo). */
function zerarSeNegativo(v: Decimal): Decimal {
  return v.lt(ZERO) ? ZERO : v;
}

/** Java MaquinaDeCalculoDeSeguroDesemprego.encontraOValorDoSeguroDesemprego(). */
function aplicarFaixasProgressivas(
  remuneracao: Decimal,
  tabela: TabelaSeguroDesemprego,
): Decimal {
  let valor: Decimal;
  // Java: if (remuneracao <= limiteFaixa1) → faixa 1 simples
  const limF1 = tabela.valorFinalFaixa1.lte(ZERO)
    ? new Decimal('9999999999999')
    : tabela.valorFinalFaixa1;
  if (remuneracao.lte(limF1)) {
    valor = remuneracao.times(tabela.valorPercentualFaixa1.div(HUNDRED));
  } else {
    valor = remuneracao.minus(limF1)
      .times(tabela.valorPercentualFaixa2.div(HUNDRED))
      .plus(tabela.somaFaixa2);
  }
  // Java: aplica piso/teto
  if (valor.lt(tabela.valorPiso)) valor = tabela.valorPiso;
  if (valor.gt(tabela.valorTeto) && !tabela.valorTeto.isZero()) valor = tabela.valorTeto;
  return valor;
}

/** Entidade SeguroDesemprego — porte 1:1 do Java. */
export class SeguroDesemprego implements IModuloLiquidavel {
  // ── Campos persistentes Java ───────────────────────────────────────
  private apurarSeguroDesemprego: boolean = false;
  private tipoValorDoSeguroDesemprego: TipoValorSeguroDesemprego = 'CALCULADO';
  private valorSeguroDesemprego: Decimal = ZERO;
  private numeroDeParcelas: number = 1;
  private remuneracaoMensal: Decimal = ZERO;
  private limiteFaixa1: Decimal = ZERO;
  private valorPercentualFaixa1: Decimal = ZERO;
  private valorPercentualFaixa2: Decimal = ZERO;
  private somaFaixa2: Decimal = ZERO;
  private valorPiso: Decimal = ZERO;
  private valorTeto: Decimal = ZERO;
  private taxaDeJuros: Decimal = ZERO;
  private indiceDeCorrecao: Decimal = new Decimal(1);
  private empregadoDomestico: boolean = false;
  private tipoSalarioPago: TipoSalarioPago = 'HISTORICO_SALARIAL';

  // ── Maquina embutida ────────────────────────────────────────────────
  private _maquina: MaquinaDeCalculoDeSeguroDesemprego | null = null;
  private getMaquina(): MaquinaDeCalculoDeSeguroDesemprego {
    if (this._maquina === null) this._maquina = new MaquinaDeCalculoDeSeguroDesemprego(this);
    return this._maquina;
  }

  // ── Getters/Setters ─────────────────────────────────────────────────
  getApurarSeguroDesemprego(): boolean { return this.apurarSeguroDesemprego; }
  setApurarSeguroDesemprego(v: boolean): void { this.apurarSeguroDesemprego = v; }
  getTipoValorDoSeguroDesemprego(): TipoValorSeguroDesemprego { return this.tipoValorDoSeguroDesemprego; }
  setTipoValorDoSeguroDesemprego(v: TipoValorSeguroDesemprego): void { this.tipoValorDoSeguroDesemprego = v; }
  getValorSeguroDesemprego(): Decimal { return this.valorSeguroDesemprego; }
  setValorSeguroDesemprego(v: Decimal): void { this.valorSeguroDesemprego = v; }
  getNumeroDeParcelas(): number { return this.numeroDeParcelas; }
  setNumeroDeParcelas(v: number): void { this.numeroDeParcelas = v; }
  getRemuneracaoMensal(): Decimal { return this.remuneracaoMensal; }
  setRemuneracaoMensal(v: Decimal): void { this.remuneracaoMensal = v; }
  getLimiteFaixa1(): Decimal { return this.limiteFaixa1; }
  setLimiteFaixa1(v: Decimal): void { this.limiteFaixa1 = v; }
  getValorPercentualFaixa1(): Decimal { return this.valorPercentualFaixa1; }
  setValorPercentualFaixa1(v: Decimal): void { this.valorPercentualFaixa1 = v; }
  getValorPercentualFaixa2(): Decimal { return this.valorPercentualFaixa2; }
  setValorPercentualFaixa2(v: Decimal): void { this.valorPercentualFaixa2 = v; }
  getSomaFaixa2(): Decimal { return this.somaFaixa2; }
  setSomaFaixa2(v: Decimal): void { this.somaFaixa2 = v; }
  getValorPiso(): Decimal { return this.valorPiso; }
  setValorPiso(v: Decimal): void { this.valorPiso = v; }
  getValorTeto(): Decimal { return this.valorTeto; }
  setValorTeto(v: Decimal): void { this.valorTeto = v; }
  getTaxaDeJuros(): Decimal { return this.taxaDeJuros; }
  setTaxaDeJuros(v: Decimal): void { this.taxaDeJuros = v; }
  getIndiceDeCorrecao(): Decimal { return this.indiceDeCorrecao; }
  setIndiceDeCorrecao(v: Decimal): void { this.indiceDeCorrecao = v; }
  getEmpregadoDomestico(): boolean { return this.empregadoDomestico; }
  setEmpregadoDomestico(v: boolean): void { this.empregadoDomestico = v; }
  getTipoSalarioPago(): TipoSalarioPago { return this.tipoSalarioPago; }
  setTipoSalarioPago(v: TipoSalarioPago): void { this.tipoSalarioPago = v; }

  /** Java SeguroDesemprego.getValorDeJuros(). */
  getValorDeJuros(): Decimal {
    return this.valorSeguroDesemprego
      .times(this.indiceDeCorrecao)
      .times(new Decimal(this.numeroDeParcelas))
      .times(this.taxaDeJuros.div(HUNDRED));
  }

  /** Java SeguroDesemprego.getValorTotalCorrigidoComJuros(). */
  getValorTotalCorrigidoComJuros(): Decimal {
    const corrigido = this.valorSeguroDesemprego
      .times(this.indiceDeCorrecao)
      .times(new Decimal(this.numeroDeParcelas));
    return corrigido.plus(this.getValorDeJuros());
  }

  liquidarComDados(input: CalculoSegDesempregoInput): void {
    this.getMaquina().liquidar(input);
  }

  /** Stub IModuloLiquidavel — engine V3 chama liquidarComDados/getters. */
  liquidar(): void { /* no-op */ }
}

/**
 * MaquinaDeCalculoDeSeguroDesemprego — port 1:1 do Java.
 */
export class MaquinaDeCalculoDeSeguroDesemprego {
  constructor(private readonly seg: SeguroDesemprego) {}

  /** Java MaquinaDeCalculoDeSeguroDesemprego.liquidar(). */
  liquidar(input: CalculoSegDesempregoInput): void {
    if (!this.seg.getApurarSeguroDesemprego()) return;

    // 1. Indice de correcao demissao→liquidacao.
    this.seg.setIndiceDeCorrecao(input.indiceAcumuladoDemissaoLiquidacao);

    // 2. Branch domestico/CLT/INFORMADO
    if (this.seg.getTipoValorDoSeguroDesemprego() === 'CALCULADO') {
      if (input.empregadoDomestico) {
        // Java linha 61-75: LC 150/2015 — 1×SM, sem faixas.
        this.seg.setEmpregadoDomestico(true);
        this.seg.setRemuneracaoMensal(ZERO);
        this.seg.setLimiteFaixa1(ZERO);
        this.seg.setValorPercentualFaixa1(ZERO);
        this.seg.setValorPercentualFaixa2(ZERO);
        this.seg.setSomaFaixa2(ZERO);
        this.seg.setValorPiso(ZERO);
        this.seg.setValorTeto(ZERO);
        this.seg.setTipoSalarioPago('NENHUM');
        this.seg.setValorSeguroDesemprego(input.salarioMinimoNaDataDemissao);
      } else {
        // Java linha 77-95: caminho CLT.
        const valorSalariosPagos = this.calculaValorSalariosPagos(input);
        const somaDasDiferencas = this.calculaMediaDiferencasTresUltimas(input);
        let valorRem = ZERO;
        if (somaDasDiferencas !== null) valorRem = valorRem.plus(somaDasDiferencas);
        if (valorSalariosPagos !== null) valorRem = valorRem.plus(valorSalariosPagos);
        this.seg.setRemuneracaoMensal(valorRem);
        const t = input.tabelaSeguroDesemprego;
        this.seg.setLimiteFaixa1(t.valorFinalFaixa1);
        this.seg.setValorPercentualFaixa1(t.valorPercentualFaixa1);
        this.seg.setValorPercentualFaixa2(t.valorPercentualFaixa2);
        this.seg.setSomaFaixa2(t.somaFaixa2);
        this.seg.setValorPiso(t.valorPiso);
        this.seg.setValorTeto(t.valorTeto);
        this.seg.setValorSeguroDesemprego(arredondarValorMonetario(aplicarFaixasProgressivas(valorRem, t)));
      }
    } else {
      // Java linha 96-108: INFORMADO — usuario digitou valor explicito.
      this.seg.setRemuneracaoMensal(ZERO);
      this.seg.setLimiteFaixa1(ZERO);
      this.seg.setValorPercentualFaixa1(ZERO);
      this.seg.setValorPercentualFaixa2(ZERO);
      this.seg.setSomaFaixa2(ZERO);
      this.seg.setValorPiso(ZERO);
      this.seg.setValorTeto(ZERO);
      this.seg.setNumeroDeParcelas(1);
      this.seg.setTipoSalarioPago('HISTORICO_SALARIAL');
    }

    // 3. Juros (Java linha 291-294: TabelaDeJurosDoCalculo na data demissao).
    this.seg.setTaxaDeJuros(input.taxaJurosNaDataDemissao);
  }

  /** Java MaquinaDeCalculoDeSeguroDesemprego.calculaValorSalariosPagosParaLiquidacao(). */
  private calculaValorSalariosPagos(input: CalculoSegDesempregoInput): Decimal | null {
    switch (this.seg.getTipoSalarioPago()) {
      case 'ULTIMA_REMUNERACAO':
        return input.valorUltimaRemuneracao ?? null;
      case 'MAIOR_REMUNERACAO':
        return input.valorMaiorRemuneracao ?? null;
      case 'HISTORICO_SALARIAL':
        return this.calculaMediaHistoricosTresUltimas(input);
      case 'NENHUM':
      default:
        return ZERO;
    }
  }

  /** Java calculaValorDaMediaDosHistoricosSalariaisDasTresOcorrenciasAnterioresADemissao. */
  private calculaMediaHistoricosTresUltimas(input: CalculoSegDesempregoInput): Decimal | null {
    const historicos = input.historicosSalariais ?? [];
    if (historicos.length === 0) return null;
    const compsAlvo = [
      competenciaMinusN(input.dataDemissao, 1),
      competenciaMinusN(input.dataDemissao, 2),
      competenciaMinusN(input.dataDemissao, 3),
    ];
    let soma: Decimal | null = null;
    let qtd = 0;
    for (const comp of compsAlvo) {
      for (const h of historicos) {
        if (h.competencia.startsWith(comp)) {
          soma = (soma ?? ZERO).plus(h.valor);
          qtd += 1;
        }
      }
    }
    if (soma === null || qtd === 0) return null;
    return soma.div(qtd);
  }

  /**
   * Java calculaValorDaMediaDasDiferencasDasTresOcorrenciasAnterioresADemissao
   * — itera 3 ultimas competencias antes da demissao, soma diferenca de cada
   * verba ativa (com integralizacao se flag), e divide pela quantidade.
   */
  private calculaMediaDiferencasTresUltimas(input: CalculoSegDesempregoInput): Decimal | null {
    const verbas = input.verbas ?? [];
    if (verbas.length === 0) return null;
    const compsAlvo = [
      competenciaMinusN(input.dataDemissao, 1),
      competenciaMinusN(input.dataDemissao, 2),
      competenciaMinusN(input.dataDemissao, 3),
    ];
    let somaDasMedias: Decimal | null = null;
    // Agrupa por verba (mesma logica Java — uma media por verba).
    const verbasPorComp = new Map<string, VerbaSegDesempregoInput[]>();
    for (const v of verbas) {
      if (!v.ativo) continue;
      const list = verbasPorComp.get(v.competencia.slice(0, 7)) ?? [];
      list.push(v);
      verbasPorComp.set(v.competencia.slice(0, 7), list);
    }
    let media: Decimal | null = null;
    let quantidadeParaMedia = 0;
    for (const comp of compsAlvo) {
      const lista = verbasPorComp.get(comp);
      if (!lista) continue;
      for (const ocorrencia of lista) {
        let novaDiferenca = ocorrencia.diferenca;
        if (ocorrencia.integralizar) {
          novaDiferenca = ocorrencia.diferencaIntegral
            ?? this.integralizar(ocorrencia, input);
        }
        if (media === null) media = ZERO;
        quantidadeParaMedia += 1;
        media = media.plus(zerarSeNegativo(novaDiferenca));
      }
    }
    if (media !== null && quantidadeParaMedia > 0) {
      somaDasMedias = (somaDasMedias ?? ZERO).plus(media.div(quantidadeParaMedia));
    }
    return somaDasMedias ?? ZERO;
  }

  /** Java CalculoDoIntegralizar — diferenca × (qtdDias / qtdDiasOriginal). */
  private integralizar(o: VerbaSegDesempregoInput, input: CalculoSegDesempregoInput): Decimal {
    const totalDias = Math.max(1, Math.ceil((o.dataFinal.getTime() - o.dataInicial.getTime()) / 86400000) + 1);
    let diasParaExcluir = 0;
    if (o.excluirFeriasGozadas && input.obterDiasFerias) {
      diasParaExcluir += input.obterDiasFerias(o.dataInicial, o.dataFinal);
    }
    if (totalDias - diasParaExcluir === 31) diasParaExcluir = 1;
    if (o.excluirFaltaJustificada && input.obterFaltasJustificadas) {
      diasParaExcluir += input.obterFaltasJustificadas(o.dataInicial, o.dataFinal);
    }
    if (o.excluirFaltaNaoJustificada && input.obterFaltasNaoJustificadas) {
      diasParaExcluir += input.obterFaltasNaoJustificadas(o.dataInicial, o.dataFinal);
    }
    const qtdDias = Math.max(0, totalDias - diasParaExcluir);
    if (qtdDias === 0) return ZERO; // simplificacao — Java chama SimuladorDeBaseParaVerba
    return o.diferenca.times(totalDias).div(qtdDias);
  }
}
