/**
 * Porte 1:1 de Ferias.java (472 linhas).
 *
 * Entidade de férias. Cada instância representa UM período aquisitivo + concessivo
 * + até 3 períodos de gozo + abono + dobras.
 *
 * Campos principais:
 *   - periodoAquisitivo (12 meses do contrato gerando direito)
 *   - periodoConcessivo (12 meses após aquisitivo para usufruir)
 *   - prazo (dias a gozar — padrão 30)
 *   - situacao (GOZADAS, INDENIZADAS, GOZADAS_PARCIALMENTE, PERDIDAS)
 *   - até 3 períodos de gozo (inicial, final, dobra) — permite gozo fracionado
 *   - abono pecuniário (1/3 dos dias vendidos)
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/ferias/Ferias.java
 */
import { Periodo } from '../../../base/comum/periodo';
import { HelperDate } from '../../../base/comum/helper-date';
import { SituacaoDaFeriasEnum } from '../../../constantes/enums';
import type { Calculo } from '../calculo';
import type { ParametroDoTermo } from '../../termo/parametro-do-termo';

export { SituacaoDaFeriasEnum };

export class Ferias {
  private static readonly DIAS_ABONO_PADRAO = 10;

  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;
  private relativa: string = '';
  private dataInicialDoPeriodoAquisitivo: Date | null = null;
  private dataFinalDoPeriodoAquisitivo: Date | null = null;
  private dataInicialDoPeriodoConcessivo: Date | null = null;
  private dataFinalDoPeriodoConcessivo: Date | null = null;
  private prazo: number = 30;
  private situacao: SituacaoDaFeriasEnum = SituacaoDaFeriasEnum.GOZADAS;
  private dobraGeral: boolean = false;
  private abono: boolean = false;
  private quantidadeDiasAbono: number = Ferias.DIAS_ABONO_PADRAO;
  private dataInicialDoPeriodoDeGozo1: Date | null = null;
  private dataFinalDoPeriodoDeGozo1: Date | null = null;
  private dobraDoPeriodoDeGozo1: boolean = false;
  private dataInicialDoPeriodoDeGozo2: Date | null = null;
  private dataFinalDoPeriodoDeGozo2: Date | null = null;
  private dobraDoPeriodoDeGozo2: boolean = false;
  private dataInicialDoPeriodoDeGozo3: Date | null = null;
  private dataFinalDoPeriodoDeGozo3: Date | null = null;
  private dobraDoPeriodoDeGozo3: boolean = false;

  // Transient caches
  private periodoAquisitivo: Periodo | null = null;
  private periodoConcessivo: Periodo | null = null;

  getId(): number | null { return this.id; }
  setId(id: number | null): void { this.id = id; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  setPeriodoAquisitivo(p: Periodo): void {
    this.periodoAquisitivo = p;
    this.setDataInicialDoPeriodoAquisitivo(p.getInicial());
    this.setDataFinalDoPeriodoAquisitivo(p.getFinal());
  }

  getPeriodoAquisitivo(): Periodo {
    if (!this.periodoAquisitivo) {
      this.periodoAquisitivo = new Periodo(
        this.dataInicialDoPeriodoAquisitivo, this.dataFinalDoPeriodoAquisitivo,
      );
    }
    return this.periodoAquisitivo;
  }

  getPeriodoDeGozo1(): Periodo | null {
    if (!this.dataInicialDoPeriodoDeGozo1 || !this.dataFinalDoPeriodoDeGozo1) return null;
    return new Periodo(this.dataInicialDoPeriodoDeGozo1, this.dataFinalDoPeriodoDeGozo1);
  }

  getPeriodoDeGozo2(): Periodo | null {
    if (!this.dataInicialDoPeriodoDeGozo2 || !this.dataFinalDoPeriodoDeGozo2) return null;
    return new Periodo(this.dataInicialDoPeriodoDeGozo2, this.dataFinalDoPeriodoDeGozo2);
  }

  getPeriodoDeGozo3(): Periodo | null {
    if (!this.dataInicialDoPeriodoDeGozo3 || !this.dataFinalDoPeriodoDeGozo3) return null;
    return new Periodo(this.dataInicialDoPeriodoDeGozo3, this.dataFinalDoPeriodoDeGozo3);
  }

  setPeriodoConcessivo(p: Periodo): void {
    this.periodoConcessivo = p;
    this.setDataInicialDoPeriodoConcessivo(p.getInicial());
    this.setDataFinalDoPeriodoConcessivo(p.getFinal());
  }

  getPeriodoConcessivo(): Periodo {
    if (!this.periodoConcessivo) {
      this.periodoConcessivo = new Periodo(
        this.dataInicialDoPeriodoConcessivo, this.dataFinalDoPeriodoConcessivo,
      );
    }
    return this.periodoConcessivo;
  }

  setPeriodoDeGozo1(p: Periodo): void {
    this.setDataInicialDoPeriodoDeGozo1(p.getInicial());
    this.setDataFinalDoPeriodoDeGozo1(p.getFinal());
  }
  setPeriodoDeGozo2(p: Periodo): void {
    this.setDataInicialDoPeriodoDeGozo2(p.getInicial());
    this.setDataFinalDoPeriodoDeGozo2(p.getFinal());
  }
  setPeriodoDeGozo3(p: Periodo): void {
    this.setDataInicialDoPeriodoDeGozo3(p.getInicial());
    this.setDataFinalDoPeriodoDeGozo3(p.getFinal());
  }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getRelativa(): string { return this.relativa; }
  setRelativa(v: string): void { this.relativa = v; }

  getDataInicialDoPeriodoAquisitivo(): Date | null { return this.dataInicialDoPeriodoAquisitivo; }
  setDataInicialDoPeriodoAquisitivo(d: Date | null): void { this.dataInicialDoPeriodoAquisitivo = d; }
  getDataFinalDoPeriodoAquisitivo(): Date | null { return this.dataFinalDoPeriodoAquisitivo; }
  setDataFinalDoPeriodoAquisitivo(d: Date | null): void { this.dataFinalDoPeriodoAquisitivo = d; }

  getDataInicialDoPeriodoConcessivo(): Date | null { return this.dataInicialDoPeriodoConcessivo; }
  setDataInicialDoPeriodoConcessivo(d: Date | null): void { this.dataInicialDoPeriodoConcessivo = d; }
  getDataFinalDoPeriodoConcessivo(): Date | null { return this.dataFinalDoPeriodoConcessivo; }
  setDataFinalDoPeriodoConcessivo(d: Date | null): void { this.dataFinalDoPeriodoConcessivo = d; }

  getAbono(): boolean { return this.abono; }
  setAbono(v: boolean): void { this.abono = v; }
  getQuantidadeDiasAbono(): number { return this.quantidadeDiasAbono; }
  setQuantidadeDiasAbono(v: number): void { this.quantidadeDiasAbono = v; }

  getSituacao(): SituacaoDaFeriasEnum { return this.situacao; }
  setSituacao(s: SituacaoDaFeriasEnum): void { this.situacao = s; }

  getDataInicialDoPeriodoDeGozo1(): Date | null { return this.dataInicialDoPeriodoDeGozo1; }
  setDataInicialDoPeriodoDeGozo1(d: Date | null): void { this.dataInicialDoPeriodoDeGozo1 = d; }
  getDataFinalDoPeriodoDeGozo1(): Date | null { return this.dataFinalDoPeriodoDeGozo1; }
  setDataFinalDoPeriodoDeGozo1(d: Date | null): void { this.dataFinalDoPeriodoDeGozo1 = d; }

  getDataInicialDoPeriodoDeGozo2(): Date | null { return this.dataInicialDoPeriodoDeGozo2; }
  setDataInicialDoPeriodoDeGozo2(d: Date | null): void { this.dataInicialDoPeriodoDeGozo2 = d; }
  getDataFinalDoPeriodoDeGozo2(): Date | null { return this.dataFinalDoPeriodoDeGozo2; }
  setDataFinalDoPeriodoDeGozo2(d: Date | null): void { this.dataFinalDoPeriodoDeGozo2 = d; }

  getDataInicialDoPeriodoDeGozo3(): Date | null { return this.dataInicialDoPeriodoDeGozo3; }
  setDataInicialDoPeriodoDeGozo3(d: Date | null): void { this.dataInicialDoPeriodoDeGozo3 = d; }
  getDataFinalDoPeriodoDeGozo3(): Date | null { return this.dataFinalDoPeriodoDeGozo3; }
  setDataFinalDoPeriodoDeGozo3(d: Date | null): void { this.dataFinalDoPeriodoDeGozo3 = d; }

  getPrazo(): number { return this.prazo; }
  setPrazo(v: number): void { this.prazo = v; }

  getDobraGeral(): boolean { return this.dobraGeral; }
  setDobraGeral(v: boolean): void { this.dobraGeral = v; }

  getDobraDoPeriodoDeGozo1(): boolean { return this.dobraDoPeriodoDeGozo1; }
  setDobraDoPeriodoDeGozo1(v: boolean): void { this.dobraDoPeriodoDeGozo1 = v; }
  getDobraDoPeriodoDeGozo2(): boolean { return this.dobraDoPeriodoDeGozo2; }
  setDobraDoPeriodoDeGozo2(v: boolean): void { this.dobraDoPeriodoDeGozo2 = v; }
  getDobraDoPeriodoDeGozo3(): boolean { return this.dobraDoPeriodoDeGozo3; }
  setDobraDoPeriodoDeGozo3(v: boolean): void { this.dobraDoPeriodoDeGozo3 = v; }

  /** limparPeriodosDeGozos (Ferias.java:410-417) */
  limparPeriodosDeGozos(): void {
    this.setDataInicialDoPeriodoDeGozo1(null);
    this.setDataFinalDoPeriodoDeGozo1(null);
    this.setDataInicialDoPeriodoDeGozo2(null);
    this.setDataFinalDoPeriodoDeGozo2(null);
    this.setDataInicialDoPeriodoDeGozo3(null);
    this.setDataFinalDoPeriodoDeGozo3(null);
  }

  /**
   * sugerirPrazo (Ferias.java:419-425) — sugere prazo baseado em faltas.
   * STUB: requer CalculoDoPrazoDeFerias (não portado ainda, Fase 10).
   */
  sugerirPrazo(): void {
    // Mantém prazo atual; será completado quando CalculoDoPrazoDeFerias estiver portado.
  }

  /**
   * sugerirPrimeiroPeriodosDeGozos (Ferias.java:427-437).
   */
  sugerirPrimeiroPeriodosDeGozos(): void {
    const calc = this.calculo as unknown as {
      getInicioFeriasColetivas?: () => Date | null;
    };
    const inicioColetivas = calc?.getInicioFeriasColetivas?.();

    if (inicioColetivas && this.dataFinalDoPeriodoAquisitivo
        && HelperDate.dateBefore(this.dataFinalDoPeriodoAquisitivo, inicioColetivas)) {
      const dataInicial = inicioColetivas;
      const periodoDeGozo = new Periodo(
        dataInicial,
        HelperDate.getInstance(dataInicial)!.addDay(this.prazo - 1).getDate(),
      );
      this.setPeriodoDeGozo1(periodoDeGozo);
    } else if (this.situacao === SituacaoDaFeriasEnum.GOZADAS
        && this.dataFinalDoPeriodoConcessivo && this.prazo > 0) {
      const dataInicial = HelperDate.getInstance(this.dataFinalDoPeriodoConcessivo)!
        .addDay(-(this.prazo - 1)).getDate();
      const periodoDeGozo = new Periodo(dataInicial, this.dataFinalDoPeriodoConcessivo);
      this.setPeriodoDeGozo1(periodoDeGozo);
    }
  }

  /**
   * Calcula dias a indenizar (dias do prazo - dias já gozados - dias de abono).
   * Usado em ComportamentoDaBaseDoReflexo.verificarValorParaFerias.
   */
  obterDiasAIndenizar(): number {
    let totalDeDias = this.prazo;
    const g1 = this.getPeriodoDeGozo1();
    const g2 = this.getPeriodoDeGozo2();
    const g3 = this.getPeriodoDeGozo3();
    if (g1) totalDeDias -= g1.totalDeDias();
    if (g2) totalDeDias -= g2.totalDeDias();
    if (g3) totalDeDias -= g3.totalDeDias();
    if (this.abono) totalDeDias -= this.quantidadeDiasAbono;
    return Math.max(0, totalDeDias);
  }

  /**
   * encontrarPrazoFeriasProporcionais (Ferias.java:462-470, static).
   * STUB: requer CalculoDoPrazoDeFerias. Fallback: 30 dias.
   */
  static encontrarPrazoFeriasProporcionais(parametro: ParametroDoTermo): number {
    const calc = parametro.getCalculo() as unknown as {
      getPrazoFeriasProporcional?: () => number | null;
    };
    const prazo = calc?.getPrazoFeriasProporcional?.();
    if (prazo !== null && prazo !== undefined) return prazo;
    return 30;
  }
}
