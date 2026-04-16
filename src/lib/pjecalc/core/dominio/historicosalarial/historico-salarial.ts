/**
 * Porte 1:1 de HistoricoSalarial.java (465 linhas).
 *
 * Entidade que agrupa as ocorrências salariais de um reclamante ao longo do
 * contrato. Tem flags de incidência (FGTS/INSS) e proporcionalização.
 * Pode ser gerada a partir de:
 *   - valor informado (tipoValor = INFORMADO)
 *   - cálculo sobre base de referência (tipoValor = CALCULADO: salário mínimo
 *     nacional ou salário da categoria, com quantidade multiplicadora)
 *
 * Ref: pjecalc-fonte/.../dominio/historicosalarial/HistoricoSalarial.java
 */
import Decimal from 'decimal.js';
import { OcorrenciaDoHistoricoSalarial } from './ocorrencia-do-historico-salarial';
import { OcorrenciaDoHistoricoSalarialOptimizerListSearch } from './ocorrencia-do-historico-salarial-optimizer-list-search';
import {
  TipoVariacaoDaParcelaEnum,
  TipoValorEnum,
  BaseDeCalculoDoPrincipalEnum,
} from '../../constantes/enums';
import { Periodo } from '../../base/comum/periodo';
import { HelperDate } from '../../base/comum/helper-date';
import type { Calculo } from '../calculo/calculo';

export class HistoricoSalarial {
  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;
  private nome: string = '';
  private tipoVariacaoParcela: TipoVariacaoDaParcelaEnum = TipoVariacaoDaParcelaEnum.FIXA;
  private incidenciaFGTS: boolean = false;
  private aplicarProporcionalidadeFGTS: boolean = false;
  private incidenciaINSS: boolean = false;
  private aplicarProporcionalidadeINSS: boolean = false;
  private ocorrencias: OcorrenciaDoHistoricoSalarial[] = [];

  // Transient (form-binding fields)
  private competenciaInicial: Date | null = null;
  private competenciaFinal: Date | null = null;
  private valorParaBaseDeCalculo: Decimal | null = null;
  private sinalizacaoINSSRecolhido: boolean = false;
  private sinalizacaoFGTSRecolhido: boolean = false;
  private tipoValor: TipoValorEnum = TipoValorEnum.INFORMADO;
  private baseDeReferencia: BaseDeCalculoDoPrincipalEnum | null = null;
  /** SalarioCategoria — não portado; stub */
  private categoria: unknown = null;
  private quantidade: Decimal = new Decimal(1);

  getId(): number | null { return this.id; }
  setId(id: number | null): void { this.id = id; }
  obterChavePrimaria(): unknown { return this.getId(); }

  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getNome(): string { return this.nome; }
  setNome(n: string): void { this.nome = n; }

  getTipoVariacaoParcela(): TipoVariacaoDaParcelaEnum { return this.tipoVariacaoParcela; }
  setTipoVariacaoParcela(v: TipoVariacaoDaParcelaEnum): void { this.tipoVariacaoParcela = v; }

  getIncidenciaFGTS(): boolean { return this.incidenciaFGTS; }
  setIncidenciaFGTS(v: boolean): void { this.incidenciaFGTS = v; }

  getAplicarProporcionalidadeFGTS(): boolean { return this.aplicarProporcionalidadeFGTS; }
  setAplicarProporcionalidadeFGTS(v: boolean): void { this.aplicarProporcionalidadeFGTS = v; }

  getIncidenciaINSS(): boolean { return this.incidenciaINSS; }
  setIncidenciaINSS(v: boolean): void { this.incidenciaINSS = v; }

  getAplicarProporcionalidadeINSS(): boolean { return this.aplicarProporcionalidadeINSS; }
  setAplicarProporcionalidadeINSS(v: boolean): void { this.aplicarProporcionalidadeINSS = v; }

  getOcorrencias(): OcorrenciaDoHistoricoSalarial[] { return this.ocorrencias; }
  setOcorrencias(oc: OcorrenciaDoHistoricoSalarial[]): void { this.ocorrencias = oc; }
  adicionarOcorrencia(o: OcorrenciaDoHistoricoSalarial): void { this.ocorrencias.push(o); }

  /** getListaDeOcorrenciasOtimizada (HistoricoSalarial.java:240-242) */
  getListaDeOcorrenciasOtimizada(): OcorrenciaDoHistoricoSalarialOptimizerListSearch {
    return new OcorrenciaDoHistoricoSalarialOptimizerListSearch().init(this.ocorrencias);
  }

  getCompetenciaInicial(): Date | null { return this.competenciaInicial; }
  setCompetenciaInicial(d: Date | null): void { this.competenciaInicial = d; }

  getCompetenciaFinal(): Date | null { return this.competenciaFinal; }
  setCompetenciaFinal(d: Date | null): void { this.competenciaFinal = d; }

  getValorParaBaseDeCalculo(): Decimal | null { return this.valorParaBaseDeCalculo; }
  setValorParaBaseDeCalculo(v: Decimal | null): void { this.valorParaBaseDeCalculo = v; }

  getSinalizacaoINSSRecolhido(): boolean { return this.sinalizacaoINSSRecolhido; }
  setSinalizacaoINSSRecolhido(v: boolean): void { this.sinalizacaoINSSRecolhido = v; }

  getSinalizacaoFGTSRecolhido(): boolean { return this.sinalizacaoFGTSRecolhido; }
  setSinalizacaoFGTSRecolhido(v: boolean): void { this.sinalizacaoFGTSRecolhido = v; }

  getTipoValor(): TipoValorEnum { return this.tipoValor; }
  setTipoValor(v: TipoValorEnum): void { this.tipoValor = v; }

  getBaseDeReferencia(): BaseDeCalculoDoPrincipalEnum | null { return this.baseDeReferencia; }
  setBaseDeReferencia(v: BaseDeCalculoDoPrincipalEnum | null): void { this.baseDeReferencia = v; }

  getCategoria(): unknown { return this.categoria; }
  setCategoria(c: unknown): void { this.categoria = c; }

  getQuantidade(): Decimal { return this.quantidade; }
  setQuantidade(q: Decimal): void { this.quantidade = q; }

  /**
   * marcarIncidenciasFGTS (HistoricoSalarial.java:320-325) — propaga para ocorrências.
   */
  marcarIncidenciasFGTS(): void {
    this.setAplicarProporcionalidadeFGTS(this.incidenciaFGTS);
    for (const o of this.ocorrencias) {
      o.setIncidenciaFGTS(this.incidenciaFGTS);
    }
  }

  marcarIncidenciasContribuicaoSocial(): void {
    this.setAplicarProporcionalidadeINSS(this.incidenciaINSS);
    for (const o of this.ocorrencias) {
      o.setIncidenciaINSS(this.incidenciaINSS);
    }
  }

  /**
   * gerarOcorrencias (HistoricoSalarial.java:334-376).
   *
   * Gera (ou atualiza) as ocorrências mês a mês entre competenciaInicial e
   * competenciaFinal, aplicando valorParaBaseDeCalculo ou cálculo baseado em
   * salário mínimo/categoria.
   */
  gerarOcorrencias(): void {
    if (!this.competenciaInicial || !this.competenciaFinal) return;

    const ocorrenciasAnteriores = [...this.ocorrencias];
    this.ocorrencias = [];

    const periodo = new Periodo(this.competenciaInicial, this.competenciaFinal);
    void periodo;

    // getCompetenceListForPeriod — gera uma lista de HelperDate, um por mês.
    const competencias: HelperDate[] = [];
    let cursor = HelperDate.getInstance(this.competenciaInicial)!.setDay(1);
    const fim = HelperDate.getInstance(this.competenciaFinal)!.setDay(1);
    while (cursor.lessThanOrEqualsTo(fim.getDate())) {
      competencias.push(cursor.clone());
      cursor = cursor.addMonth(1);
    }

    for (const competencia of competencias) {
      let valor: Decimal | null;
      if (this.isTipoValorCalculado()) {
        // TODO: obter valor da base (SalarioMinimoNacional ou SalarioCategoria) × quantidade.
        // Stub: devolve valor informado × quantidade se disponível.
        valor = this.valorParaBaseDeCalculo
          ? this.valorParaBaseDeCalculo.times(this.quantidade)
          : null;
      } else {
        valor = this.valorParaBaseDeCalculo;
      }

      const ocorrenciaCandidata = new OcorrenciaDoHistoricoSalarial(
        this,
        competencia.getDate(),
        valor,
        this.sinalizacaoFGTSRecolhido,
        this.sinalizacaoINSSRecolhido,
        this.incidenciaFGTS,
        this.incidenciaINSS,
      );

      if (ocorrenciasAnteriores.length > 0) {
        const idx = ocorrenciasAnteriores.findIndex(o => o.equals(ocorrenciaCandidata));
        if (idx >= 0) {
          const antiga = ocorrenciasAnteriores[idx];
          antiga.setValor(valor);
          antiga.setRecolhidoFGTS(this.sinalizacaoFGTSRecolhido);
          antiga.setRecolhidoINSS(this.sinalizacaoINSSRecolhido);
          antiga.setIncidenciaFGTS(this.incidenciaFGTS);
          antiga.setIncidenciaINSS(this.incidenciaINSS);
          this.ocorrencias.push(antiga);
          continue;
        }
      }
      this.ocorrencias.push(ocorrenciaCandidata);
    }

    // Preserva ocorrências antigas fora do intervalo
    for (const antiga of ocorrenciasAnteriores) {
      if (!this.ocorrencias.some(o => o.equals(antiga))) {
        this.ocorrencias.push(antiga);
      }
    }
    this.ocorrencias.sort((a, b) => a.compareTo(b));
    this.sugerirDatasDasCompetenciasParaDemaisGeracoes();
  }

  isTipoValorCalculado(): boolean {
    return this.tipoValor === TipoValorEnum.CALCULADO;
  }

  /**
   * sugerirDatasParaCompetencias (HistoricoSalarial.java:401-407).
   * Usa o Calculo.obterPeriodoSugestivoDoCalculo para auto-preencher.
   */
  sugerirDatasParaCompetencias(): void {
    const calc = this.calculo as unknown as { obterPeriodoSugestivoDoCalculo?: () => Periodo };
    const p = calc?.obterPeriodoSugestivoDoCalculo?.();
    if (p) {
      this.setCompetenciaInicial(p.getInicial());
      this.setCompetenciaFinal(p.getFinal());
    }
  }

  private sugerirDatasDasCompetenciasParaDemaisGeracoes(): HistoricoSalarial {
    if (this.competenciaFinal) {
      const novaData = HelperDate.getInstance(this.competenciaFinal)!.addMonth(1);
      this.setCompetenciaInicial(novaData.getDate());
      this.setCompetenciaFinal(novaData.getDate());
    }
    return this;
  }

  /**
   * obterOcorrenciasPorCompetencia (HistoricoSalarial.java:461-463).
   * Implementação TS: filtra ocorrências cujo mês/ano bate com a competência.
   */
  obterOcorrenciasPorCompetencia(competencia: Date): OcorrenciaDoHistoricoSalarial[] {
    const alvoAno = competencia.getFullYear();
    const alvoMes = competencia.getMonth();
    return this.ocorrencias.filter(oc => {
      const d = oc.getDataOcorrencia();
      return d !== null && d.getFullYear() === alvoAno && d.getMonth() === alvoMes;
    });
  }

  /** Obtém a ocorrência de uma competência específica (primeiro match). */
  obterOcorrenciaDaCompetencia(competencia: Date): OcorrenciaDoHistoricoSalarial | null {
    const list = this.obterOcorrenciasPorCompetencia(competencia);
    return list.length > 0 ? list[0] : null;
  }

  /** Obtém valor salarial para uma competência. Usado por Termos/Proxies. */
  getValorParaCompetencia(competencia: Date): Decimal | null {
    const oc = this.obterOcorrenciaDaCompetencia(competencia);
    return oc?.getValor() ?? null;
  }
}
