/**
 * PJe-Calc v2.15.1 — Inss
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss
 *
 * Ref Java: pjecalc-fonte/.../calculo/inss/Inss.java (729 linhas)
 *
 * Entidade orquestradora do INSS do cálculo:
 *   - tipoAliquotaSegurado (SEGURADO_EMPREGADO | EMPREGADO_DOMESTICO | FIXA)
 *   - aliquotaSeguradoFixa (usada quando FIXA)
 *   - limitarTeto (só para FIXA)
 *   - tipoAliquotaEmpregador (FIXA | POR_PERIODO | POR_ATIVIDADE_ECONOMICA)
 *   - aliquotaEmpresaFixa / aliquotaRATFixa / aliquotaTerceirosFixa
 *   - apurar* (flags por atividade econômica)
 *   - aliquotasPorPeriodos (lista, quando POR_PERIODO)
 *   - periodosComOpcaoSimples (lista, descontos Simples Nacional)
 *   - atividadeEconomica (quando POR_ATIVIDADE_ECONOMICA)
 *   - inssSobreSalariosDevidos / Pagos (OneToOne)
 *   - apurarInssSobreSalariosPagos (flag)
 *   - maquinaDeCalculoDoInss (transient, orquestrador de cálculo)
 *   - legendaDaFormula (transient, display)
 *   - existeApuracao{INSSTerceiros,INSSEmpresa,INSSSAT} (transient memo)
 */
import Decimal from 'decimal.js';
import {
  TipoDeAliquotaDoEmpregadorEnum,
  TipoDeAliquotaDoSeguradoEnum,
} from '../../../constantes/enums';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';
import type { Calculo } from '../calculo';
import { calcularInssProgressivo, type FaixaPrevidenciaria } from '../../inss/faixas/faixa-previdenciaria';
import { AliquotasDoEmpregadorPorPeriodo } from './aliquotas-do-empregador-por-periodo';
import { PeriodoDoINSSComOpcaoSimples } from './periodo-do-inss-com-opcao-simples';
import { InssSobreSalariosDevidos } from './sobresalarios/inss-sobre-salarios-devidos';
import { InssSobreSalariosPagos } from './sobresalarios/inss-sobre-salarios-pagos';
import { MaquinaDeCalculoDoInss } from './sobresalarios/maquina-de-calculo-do-inss';
import { LegendaDaFormulaDoInss } from './sobresalarios/legenda-da-formula-do-inss';
import type { OcorrenciaDeInssSobreSalariosDevidos } from './sobresalarios/ocorrencia-de-inss-sobre-salarios-devidos';
import type { OcorrenciaDeInssSobreSalariosPagos } from './sobresalarios/ocorrencia-de-inss-sobre-salarios-pagos';

/**
 * Estrutura legada (usada por código V3 antigo) — representa uma linha-mensal
 * simplificada de ocorrência de INSS. Mantida para compatibilidade.
 */
export interface OcorrenciaDeInssLegacy {
  competencia: Date;
  baseSalarial: Decimal;
  aliquotaSegurado: Decimal;
  valorSegurado: Decimal;
  aliquotaEmpresa: Decimal;
  valorEmpresa: Decimal;
  aliquotaSAT: Decimal;
  valorSAT: Decimal;
  aliquotaTerceiros: Decimal;
  valorTerceiros: Decimal;
}

export class Inss implements IModuloLiquidavel {
  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;

  private tipoAliquotaSegurado: TipoDeAliquotaDoSeguradoEnum = TipoDeAliquotaDoSeguradoEnum.SEGURADO_EMPREGADO;
  private aliquotaSeguradoFixa: Decimal | null = null;
  private limitarTeto: boolean = true;

  private tipoAliquotaEmpregador: TipoDeAliquotaDoEmpregadorEnum = TipoDeAliquotaDoEmpregadorEnum.FIXA;
  private aliquotaEmpresaFixa: Decimal | null = null;
  private aliquotaRATFixa: Decimal | null = null;
  private aliquotaTerceirosFixa: Decimal | null = null;

  private apurarEmpresaPorAtividade: boolean = false;
  private apurarRATPorAtividade: boolean = false;
  private apurarTerceirosPorAtividade: boolean = false;

  private aliquotasPorPeriodos: AliquotasDoEmpregadorPorPeriodo[] = [];
  private periodosComOpcaoSimples: PeriodoDoINSSComOpcaoSimples[] = [];

  // AtividadeEconomica ainda não portada — placeholder null.
  private atividadeEconomica: unknown | null = null;

  private inssSobreSalariosDevidos: InssSobreSalariosDevidos;
  private inssSobreSalariosPagos: InssSobreSalariosPagos;

  private apurarInssSobreSalariosPagos: boolean = false;

  // transient
  private maquinaDeCalculoDoInss: MaquinaDeCalculoDoInss;
  private legendaDaFormula: LegendaDaFormulaDoInss | null = null;
  private existeApuracaoINSSTerceiros: boolean | null = null;
  private existeApuracaoINSSEmpresa: boolean | null = null;
  private existeApuracaoINSSSAT: boolean | null = null;

  // ── campos legacy (V3) ──
  private ocorrenciasSalariosDevidos: OcorrenciaDeInssLegacy[] = [];
  private ocorrenciasSalariosPagos: OcorrenciaDeInssLegacy[] = [];
  private faixas: FaixaPrevidenciaria[] = [];
  private aliquotaEmpresaLegacy: Decimal = new Decimal(20);
  private aliquotaSATLegacy: Decimal = new Decimal(2);
  private aliquotaTerceirosLegacy: Decimal = new Decimal('5.8');
  private apurarSegurado: boolean = true;
  private apurarEmpresa: boolean = true;
  private cobrarReclamante: boolean = true;

  constructor(calculo?: Calculo) {
    this.inssSobreSalariosDevidos = new InssSobreSalariosDevidos();
    this.inssSobreSalariosDevidos.setInss(this);
    this.inssSobreSalariosPagos = new InssSobreSalariosPagos();
    this.inssSobreSalariosPagos.setInss(this);
    this.maquinaDeCalculoDoInss = new MaquinaDeCalculoDoInss(this);
    if (calculo) {
      this.calculo = calculo;
      this.sugerirValoresPadroes();
    }
  }

  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }

  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getTipoAliquotaSegurado(): TipoDeAliquotaDoSeguradoEnum { return this.tipoAliquotaSegurado; }
  setTipoAliquotaSegurado(v: TipoDeAliquotaDoSeguradoEnum): void { this.tipoAliquotaSegurado = v; }

  getAliquotaSeguradoFixa(): Decimal | null { return this.aliquotaSeguradoFixa; }
  setAliquotaSeguradoFixa(v: Decimal | null): void { this.aliquotaSeguradoFixa = v; }

  getLimitarTeto(): boolean { return this.limitarTeto; }
  setLimitarTeto(v: boolean): void { this.limitarTeto = v; }

  getTipoAliquotaEmpregador(): TipoDeAliquotaDoEmpregadorEnum { return this.tipoAliquotaEmpregador; }
  setTipoAliquotaEmpregador(v: TipoDeAliquotaDoEmpregadorEnum): void { this.tipoAliquotaEmpregador = v; }

  getAliquotaEmpresaFixa(): Decimal | null { return this.aliquotaEmpresaFixa; }
  setAliquotaEmpresaFixa(v: Decimal | null): void { this.aliquotaEmpresaFixa = v; }

  getAliquotaRATFixa(): Decimal | null { return this.aliquotaRATFixa; }
  setAliquotaRATFixa(v: Decimal | null): void { this.aliquotaRATFixa = v; }

  getAliquotaTerceirosFixa(): Decimal | null { return this.aliquotaTerceirosFixa; }
  setAliquotaTerceirosFixa(v: Decimal | null): void { this.aliquotaTerceirosFixa = v; }

  getApurarEmpresaPorAtividade(): boolean { return this.apurarEmpresaPorAtividade; }
  setApurarEmpresaPorAtividade(v: boolean): void { this.apurarEmpresaPorAtividade = v; }

  getApurarRATPorAtividade(): boolean { return this.apurarRATPorAtividade; }
  setApurarRATPorAtividade(v: boolean): void { this.apurarRATPorAtividade = v; }

  getApurarTerceirosPorAtividade(): boolean { return this.apurarTerceirosPorAtividade; }
  setApurarTerceirosPorAtividade(v: boolean): void { this.apurarTerceirosPorAtividade = v; }

  getAtividadeEconomica(): unknown | null { return this.atividadeEconomica; }
  setAtividadeEconomica(v: unknown | null): void { this.atividadeEconomica = v; }

  getInssSobreSalariosDevidos(): InssSobreSalariosDevidos { return this.inssSobreSalariosDevidos; }
  setInssSobreSalariosDevidos(v: InssSobreSalariosDevidos): void { this.inssSobreSalariosDevidos = v; }

  getInssSobreSalariosPagos(): InssSobreSalariosPagos { return this.inssSobreSalariosPagos; }
  setInssSobreSalariosPagos(v: InssSobreSalariosPagos): void { this.inssSobreSalariosPagos = v; }

  getAliquotasPorPeriodos(): AliquotasDoEmpregadorPorPeriodo[] { return this.aliquotasPorPeriodos; }
  setAliquotasPorPeriodos(v: AliquotasDoEmpregadorPorPeriodo[]): void { this.aliquotasPorPeriodos = v; }

  getPeriodosComOpcaoSimples(): PeriodoDoINSSComOpcaoSimples[] { return this.periodosComOpcaoSimples; }
  setPeriodosComOpcaoSimples(v: PeriodoDoINSSComOpcaoSimples[]): void { this.periodosComOpcaoSimples = v; }

  getApurarInssSobreSalariosPagos(): boolean { return this.apurarInssSobreSalariosPagos; }
  setApurarInssSobreSalariosPagos(v: boolean): void { this.apurarInssSobreSalariosPagos = v; }

  /** adicionar (Java linha 348) — ligar a alíquota ao INSS e incluir na lista. */
  adicionarAliquotasPorPeriodo(aliquotas: AliquotasDoEmpregadorPorPeriodo): void {
    aliquotas.setInss(this);
    this.aliquotasPorPeriodos.push(aliquotas);
  }

  /** adicionar (Java linha 354) */
  adicionarPeriodoComOpcaoSimples(periodo: PeriodoDoINSSComOpcaoSimples): void {
    periodo.setInss(this);
    this.periodosComOpcaoSimples.push(periodo);
  }

  /** sugerirValoresPadroes (Java linha 332) */
  private sugerirValoresPadroes(): void {
    this.inssSobreSalariosDevidos.sugerirDatas();
    this.inssSobreSalariosPagos.sugerirDatas();
    this.aliquotaEmpresaFixa = new Decimal('20.0000');
    this.aliquotaRATFixa = new Decimal('3.0000');
  }

  /** isTipoAliquotaSeguradoFixa (Java linha 406) */
  isTipoAliquotaSeguradoFixa(): boolean {
    return this.tipoAliquotaSegurado === TipoDeAliquotaDoSeguradoEnum.FIXA;
  }
  isTipoAliquotaEmpregadorFixa(): boolean {
    return this.tipoAliquotaEmpregador === TipoDeAliquotaDoEmpregadorEnum.FIXA;
  }
  isTipoAliquotaEmpregadorPorAtividade(): boolean {
    return this.tipoAliquotaEmpregador === TipoDeAliquotaDoEmpregadorEnum.POR_ATIVIDADE_ECONOMICA;
  }
  isTipoAliquotaEmpregadorPorPeriodo(): boolean {
    return this.tipoAliquotaEmpregador === TipoDeAliquotaDoEmpregadorEnum.POR_PERIODO;
  }

  /** liquidar/liquidarAtualizacao delegam à MaquinaDeCalculo (Java 520, 524). */
  liquidarAtualizacao(dataEvento: Date): void {
    this.maquinaDeCalculoDoInss.liquidarAtualizacao(dataEvento);
  }

  liquidar(dataLiquidacao?: Date): void {
    if (dataLiquidacao) {
      this.maquinaDeCalculoDoInss.liquidar(dataLiquidacao);
    }
    // fluxo legacy mantido em liquidarComVerbas()
  }

  /**
   * consistirDados (Java linha 360) — limpa campos que ficaram inconsistentes
   * após mudança de tipo de alíquota segurado/empregador.
   */
  consistirDados(): void {
    if (!this.isTipoAliquotaSeguradoFixa()) {
      this.aliquotaSeguradoFixa = null;
      this.limitarTeto = false;
    }
    if (!this.isTipoAliquotaEmpregadorFixa()) {
      this.aliquotaEmpresaFixa = null;
      this.aliquotaRATFixa = null;
      this.aliquotaTerceirosFixa = null;
    }
    if (!this.isTipoAliquotaEmpregadorPorPeriodo()) {
      this.aliquotasPorPeriodos = [];
    }
    if (!this.isTipoAliquotaEmpregadorPorAtividade()) {
      this.atividadeEconomica = null;
      this.apurarEmpresaPorAtividade = false;
      this.apurarRATPorAtividade = false;
      this.apurarTerceirosPorAtividade = false;
    }
  }

  /** validar (Java linha 476) — gera erros se configuração obrigatória estiver faltando. */
  validar(): void {
    this.consistirDados();
    const erros: string[] = [];
    if (this.isTipoAliquotaSeguradoFixa() && this.aliquotaSeguradoFixa === null) {
      erros.push('Alíquota Fixa do Segurado obrigatória.');
    }
    if (
      this.isTipoAliquotaEmpregadorFixa() &&
      this.aliquotaEmpresaFixa === null &&
      this.aliquotaRATFixa === null &&
      this.aliquotaTerceirosFixa === null
    ) {
      erros.push('Pelo menos uma alíquota do empregador é obrigatória.');
    }
    if (this.isTipoAliquotaEmpregadorPorAtividade()) {
      if (this.atividadeEconomica === null) {
        erros.push('Atividade Econômica obrigatória.');
      }
      if (!this.apurarEmpresaPorAtividade && !this.apurarRATPorAtividade && !this.apurarTerceirosPorAtividade) {
        erros.push('Pelo menos uma flag de apuração por atividade é obrigatória.');
      }
    }
    if (this.isTipoAliquotaEmpregadorPorPeriodo() && this.aliquotasPorPeriodos.length === 0) {
      erros.push('Alíquotas por Períodos obrigatória.');
    }
    if (erros.length > 0) {
      throw new Error(`Inss inválido: ${erros.join(' | ')}`);
    }
  }

  /** restaurarValoresPadroes (Java linha 343) */
  restaurarValoresPadroes(): void {
    this.limparOcorrencias();
  }

  /** limparOcorrencias (Java linha 451) — chama limpar em devidos E pagos. */
  limparOcorrencias(): void {
    this.limparOcorrenciasDeSalariosDevidos();
    this.limparOcorrenciasDeSalariosPagos();
  }

  /** limparOcorrenciasDeSalariosDevidos (Java linha 455) */
  limparOcorrenciasDeSalariosDevidos(): void {
    this.inssSobreSalariosDevidos.setOcorrencias(new Set());
  }

  /** limparOcorrenciasDeSalariosPagos (Java linha 463) */
  limparOcorrenciasDeSalariosPagos(): void {
    this.inssSobreSalariosPagos.setOcorrencias(new Set());
  }

  /** gerarOcorrencias (Java linha 435) — delegado ao repositório no Java original.
   *  Na versão port, mantemos como método público para preservar API; o fluxo de
   *  geração real é exercido via `MaquinaDeCalculoDoInss.liquidar`. */
  gerarOcorrencias(_manterAlteracoes: boolean = true, _flush: boolean = false): void {
    // TODO(integracao-futura): repositório de geração de ocorrências não portado.
    // Quando histórico salarial estiver integrado, popular ocorrências mensais.
  }

  /** existemDadosParaRelatorio (Java linha 656) — checa se há algo exibível. */
  existemDadosParaRelatorio(): boolean {
    if (this.inssSobreSalariosDevidos.existemOcorrencias()) return true;
    if (this.apurarInssSobreSalariosPagos && this.inssSobreSalariosPagos.existemOcorrencias()) return true;
    return false;
  }

  /** copiarParametrosRegeracaoOcorrencias (Java linha 666) — clonagem para re-geração. */
  copiarParametrosRegeracaoOcorrencias(filtro: Inss): void {
    this.tipoAliquotaSegurado = filtro.tipoAliquotaSegurado;
    if (filtro.tipoAliquotaSegurado === TipoDeAliquotaDoSeguradoEnum.FIXA) {
      this.aliquotaSeguradoFixa = filtro.aliquotaSeguradoFixa;
      this.limitarTeto = filtro.limitarTeto;
    }
    this.tipoAliquotaEmpregador = filtro.tipoAliquotaEmpregador;
    switch (filtro.tipoAliquotaEmpregador) {
      case TipoDeAliquotaDoEmpregadorEnum.POR_ATIVIDADE_ECONOMICA:
        this.atividadeEconomica = filtro.atividadeEconomica;
        this.apurarEmpresaPorAtividade = filtro.apurarEmpresaPorAtividade;
        this.apurarRATPorAtividade = filtro.apurarRATPorAtividade;
        this.apurarTerceirosPorAtividade = filtro.apurarTerceirosPorAtividade;
        break;
      case TipoDeAliquotaDoEmpregadorEnum.POR_PERIODO:
        this.aliquotasPorPeriodos = [...filtro.aliquotasPorPeriodos];
        break;
      case TipoDeAliquotaDoEmpregadorEnum.FIXA:
        this.aliquotaEmpresaFixa = filtro.aliquotaEmpresaFixa;
        this.aliquotaRATFixa = filtro.aliquotaRATFixa;
        this.aliquotaTerceirosFixa = filtro.aliquotaTerceirosFixa;
        break;
    }
    this.inssSobreSalariosDevidos.setDataInicioPeriodo(filtro.inssSobreSalariosDevidos.getDataInicioPeriodo());
    this.inssSobreSalariosDevidos.setDataTerminoPeriodo(filtro.inssSobreSalariosDevidos.getDataTerminoPeriodo());
    this.inssSobreSalariosPagos.setDataInicioPeriodo(filtro.inssSobreSalariosPagos.getDataInicioPeriodo());
    this.inssSobreSalariosPagos.setDataTerminoPeriodo(filtro.inssSobreSalariosPagos.getDataTerminoPeriodo());
    this.periodosComOpcaoSimples = [...filtro.periodosComOpcaoSimples];
  }

  /** aplicarPagamento (Java linha 721) — delega à máquina. */
  aplicarPagamento(
    pagamento: unknown,
    debitosDoReclamante: unknown,
    outrosDebitosDoReclamado: unknown,
  ): void {
    // Stubs até integração com Pagamento/DebitosDoReclamante/OutrosDebitosReclamado.
    this.maquinaDeCalculoDoInss.aplicarPagamento(
      this,
      pagamento as never,
      debitosDoReclamante as never,
      outrosDebitosDoReclamado as never,
    );
  }

  /**
   * apurarInss — cálculo 1:1 do INSS progressivo por competência.
   *
   * Replica a lógica de `MaquinaDeCalculoDoInss.liquidarInssSobreSalariosDevidos`:
   *   - faixas progressivas (EC 103/2019 ≥ 03/2020): contribuição somada faixa a faixa
   *     com teto na última faixa quando `limitarTeto === true`.
   *   - alíquota única (< 03/2020): toda a base multiplicada pela alíquota da faixa
   *     onde o salário se encaixa.
   *   - base negativa/zero retorna 0.
   *   - arredondamento final em 2 casas com `HALF_EVEN` (Banker's, conforme Java).
   *
   * Parâmetros:
   *   - base           Decimal > 0 (nominal ou já corrigida — caller decide)
   *   - faixas         lista ordenada asc por `ate`; formato PjeINSSFaixaRow
   *   - aliquotaUnica  true para regime pré-EC 103/2019
   *   - limitarTeto    aplica teto da última faixa quando true
   */
  static apurarInss(
    base: Decimal,
    faixas: readonly { ate: Decimal | number; aliquota: Decimal | number }[],
    aliquotaUnica: boolean = false,
    limitarTeto: boolean = true,
  ): Decimal {
    if (base.lte(0) || faixas.length === 0) return new Decimal(0);

    const normFaixas = faixas.map((f) => ({
      ate: f.ate instanceof Decimal ? f.ate : new Decimal(f.ate),
      aliquota: f.aliquota instanceof Decimal ? f.aliquota : new Decimal(f.aliquota),
    }));

    // Pré-EC 103/2019: alíquota única
    if (aliquotaUnica) {
      for (const f of normFaixas) {
        if (base.lte(f.ate)) {
          return base.times(f.aliquota).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
        }
      }
      const ultima = normFaixas[normFaixas.length - 1];
      return ultima.ate.times(ultima.aliquota).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    }

    // Progressivo (EC 103/2019)
    const teto = normFaixas[normFaixas.length - 1].ate;
    let baseRestante = limitarTeto && base.gt(teto) ? teto : base;
    let imposto = new Decimal(0);
    let faixaAnterior = new Decimal(0);
    for (const f of normFaixas) {
      const limiteNaFaixa = f.ate.minus(faixaAnterior);
      const baseNaFaixa = Decimal.min(baseRestante, limiteNaFaixa);
      if (baseNaFaixa.gt(0)) {
        imposto = imposto.plus(baseNaFaixa.times(f.aliquota).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN));
        baseRestante = baseRestante.minus(baseNaFaixa);
      }
      if (baseRestante.lte(0)) break;
      faixaAnterior = f.ate;
    }
    return imposto.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  }

  limparJuros(): void {
    for (const oc of this.inssSobreSalariosDevidos.getOcorrencias()) {
      oc.setTaxaDeJuros(null);
    }
    for (const oc of this.inssSobreSalariosPagos.getOcorrencias()) {
      oc.setTaxaDeJuros(null);
    }
  }

  calcularJurosDosSalariosDevidos(): void {
    this.maquinaDeCalculoDoInss.calcularJurosDosSalariosDevidos();
  }

  calcularJurosDosSalariosPagos(): void {
    this.maquinaDeCalculoDoInss.calcularJurosDosSalariosPagos();
  }

  existemOcorrencias(): boolean {
    return this.inssSobreSalariosDevidos.existemOcorrencias() || this.inssSobreSalariosPagos.existemOcorrencias();
  }

  /** getLegendaDaFormula (Java linha 553) — lazy init. */
  getLegendaDaFormula(): LegendaDaFormulaDoInss {
    if (this.legendaDaFormula === null) {
      this.legendaDaFormula = new LegendaDaFormulaDoInss(this);
    }
    return this.legendaDaFormula;
  }

  /** existeApuracaoParaEmpresa (Java linha 560) — memoizado em transient. */
  existeApuracaoParaEmpresa(): boolean {
    if (this.existeApuracaoINSSEmpresa !== null) return this.existeApuracaoINSSEmpresa;
    let result = false;
    switch (this.tipoAliquotaEmpregador) {
      case TipoDeAliquotaDoEmpregadorEnum.FIXA:
        result = this.aliquotaEmpresaFixa !== null;
        break;
      case TipoDeAliquotaDoEmpregadorEnum.POR_ATIVIDADE_ECONOMICA:
        result = this.atividadeEconomica !== null && this.apurarEmpresaPorAtividade;
        break;
      case TipoDeAliquotaDoEmpregadorEnum.POR_PERIODO:
        for (const p of this.aliquotasPorPeriodos) {
          if (p.getAliquotaEmpresa() !== null) { result = true; break; }
        }
        break;
    }
    this.existeApuracaoINSSEmpresa = result;
    return result;
  }

  /** existeApuracaoParaSAT (Java linha 592) */
  existeApuracaoParaSAT(): boolean {
    if (this.existeApuracaoINSSSAT !== null) return this.existeApuracaoINSSSAT;
    let result = false;
    switch (this.tipoAliquotaEmpregador) {
      case TipoDeAliquotaDoEmpregadorEnum.FIXA:
        result = this.aliquotaRATFixa !== null;
        break;
      case TipoDeAliquotaDoEmpregadorEnum.POR_ATIVIDADE_ECONOMICA:
        result = this.apurarRATPorAtividade;
        break;
      case TipoDeAliquotaDoEmpregadorEnum.POR_PERIODO:
        for (const p of this.aliquotasPorPeriodos) {
          if (p.getAliquotaEmpresa() !== null || p.getAliquotaRAT() !== null) { result = true; break; }
        }
        break;
    }
    this.existeApuracaoINSSSAT = result;
    return result;
  }

  /** existeApuracaoParaTerceiros (Java linha 624) */
  existeApuracaoParaTerceiros(): boolean {
    if (this.existeApuracaoINSSTerceiros !== null) return this.existeApuracaoINSSTerceiros;
    let result = false;
    switch (this.tipoAliquotaEmpregador) {
      case TipoDeAliquotaDoEmpregadorEnum.FIXA:
        result = this.aliquotaTerceirosFixa !== null;
        break;
      case TipoDeAliquotaDoEmpregadorEnum.POR_ATIVIDADE_ECONOMICA:
        result = this.atividadeEconomica !== null && this.apurarTerceirosPorAtividade;
        break;
      case TipoDeAliquotaDoEmpregadorEnum.POR_PERIODO:
        for (const p of this.aliquotasPorPeriodos) {
          if (p.getAliquotaTerceiros() !== null) { result = true; break; }
        }
        break;
    }
    this.existeApuracaoINSSTerceiros = result;
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────
  //                   API LEGACY (V3 pjc-to-engine)
  // ─────────────────────────────────────────────────────────────────────

  getOcorrenciasSalariosDevidos(): OcorrenciaDeInssLegacy[] { return this.ocorrenciasSalariosDevidos; }
  getOcorrenciasSalariosPagos(): OcorrenciaDeInssLegacy[] { return this.ocorrenciasSalariosPagos; }
  setFaixas(v: FaixaPrevidenciaria[]): void { this.faixas = v; }
  setAliquotaEmpresa(v: Decimal): void { this.aliquotaEmpresaLegacy = v; }
  setAliquotaSAT(v: Decimal): void { this.aliquotaSATLegacy = v; }
  setAliquotaTerceiros(v: Decimal): void { this.aliquotaTerceirosLegacy = v; }
  setApurarSegurado(v: boolean): void { this.apurarSegurado = v; }
  setApurarEmpresa(v: boolean): void { this.apurarEmpresa = v; }
  setCobrarReclamante(v: boolean): void { this.cobrarReclamante = v; }

  getTotalSegurado(): Decimal {
    let total = new Decimal(0);
    for (const oc of this.ocorrenciasSalariosDevidos) total = total.plus(oc.valorSegurado);
    return arredondarValorMonetario(total);
  }

  getTotalEmpregador(): Decimal {
    let total = new Decimal(0);
    for (const oc of this.ocorrenciasSalariosDevidos) {
      total = total.plus(oc.valorEmpresa).plus(oc.valorSAT).plus(oc.valorTerceiros);
    }
    return arredondarValorMonetario(total);
  }

  /**
   * liquidarComVerbas — fluxo legacy (engine V3). Agrupa bases por competência
   * e aplica faixas progressivas + alíquotas fixas de empresa/SAT/terceiros.
   * Usado atualmente pelo `pjc-to-engine.ts`.
   */
  liquidarComVerbas(
    verbas: {
      getIncidenciaINSS(): boolean;
      getOcorrenciasAtivas(): Array<{ getDataInicial(): Date | null; getDiferenca(): Decimal }>;
    }[],
  ): void {
    this.ocorrenciasSalariosDevidos = [];
    const basesPorComp = new Map<string, Decimal>();
    for (const verba of verbas) {
      if (!verba.getIncidenciaINSS()) continue;
      for (const oc of verba.getOcorrenciasAtivas()) {
        const dataIni = oc.getDataInicial();
        if (!dataIni) continue;
        const dif = oc.getDiferenca();
        if (dif.isZero() || dif.isNegative()) continue;
        const comp = `${dataIni.getFullYear()}-${String(dataIni.getMonth() + 1).padStart(2, '0')}`;
        const current = basesPorComp.get(comp) ?? new Decimal(0);
        basesPorComp.set(comp, current.plus(dif));
      }
    }
    for (const [comp, base] of basesPorComp) {
      const [ano, mes] = comp.split('-').map(Number);
      const competencia = new Date(ano, mes - 1, 1);
      let valorSegurado = new Decimal(0);
      if (this.apurarSegurado && this.faixas.length > 0) {
        valorSegurado = arredondarValorMonetario(calcularInssProgressivo(base, this.faixas));
      }
      let valorEmpresa = new Decimal(0);
      let valorSAT = new Decimal(0);
      let valorTerceiros = new Decimal(0);
      if (this.apurarEmpresa) {
        valorEmpresa = arredondarValorMonetario(base.times(this.aliquotaEmpresaLegacy).div(100));
        valorSAT = arredondarValorMonetario(base.times(this.aliquotaSATLegacy).div(100));
        valorTerceiros = arredondarValorMonetario(base.times(this.aliquotaTerceirosLegacy).div(100));
      }
      this.ocorrenciasSalariosDevidos.push({
        competencia,
        baseSalarial: base,
        aliquotaSegurado: base.isZero() ? new Decimal(0) : valorSegurado.div(base).times(100),
        valorSegurado,
        aliquotaEmpresa: this.aliquotaEmpresaLegacy,
        valorEmpresa,
        aliquotaSAT: this.aliquotaSATLegacy,
        valorSAT,
        aliquotaTerceiros: this.aliquotaTerceirosLegacy,
        valorTerceiros,
      });
    }
  }
}

// ── alias para compatibilidade com código legacy ──
export type { OcorrenciaDeInssLegacy as OcorrenciaDeInss };
export type { OcorrenciaDeInssSobreSalariosDevidos, OcorrenciaDeInssSobreSalariosPagos };
