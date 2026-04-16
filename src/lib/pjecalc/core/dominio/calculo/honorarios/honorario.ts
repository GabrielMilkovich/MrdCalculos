/**
 * PJe-Calc v2.15.1 — Honorario
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario
 *
 * Ref Java: pjecalc-fonte/.../calculo/honorarios/Honorario.java (~758 linhas)
 *
 * Entidade orquestradora dos honorários do cálculo. Campos principais:
 *   - descricao, tipoHonorario (ADVOCATICIOS, SUCUMBENCIAIS, PERICIAIS_* etc.)
 *   - tipoDeDevedor (RECLAMANTE/RECLAMADO), nomeCredor, tipoDocFiscal + numDocFiscal
 *   - apurarIRRF (bool), tipoImpostoRenda (PF/PJ)
 *   - tipoValor (INFORMADO/CALCULADO)
 *   - valor (informado), valorJurosCalcExterno (informado)
 *   - dataVencimento (informado), dataApartirDeAplicarJuros (informado)
 *   - tipoDeIndiceDeCorrecao (TRABALHISTA/OUTRO), outroIndiceDeCorrecao
 *   - aplicarJuros
 *   - aliquota (%), baseParaApuracao (BRUTO/BC/BCP/VNP) — para CALCULADO
 *   - baseHonorario, indiceCorrecaoHonorario, taxaJurosHonorario
 *   - IRPF: valorInicialFaixaIrpf, valorFinalFaixaIrpf, valorAliquotaIrpf,
 *     valorDeducaoIrpf, valorImpostoRenda
 *   - apurarIRPFSobreJuros, tipoCobrancaReclamante (DESCONTAR/COBRAR)
 *   - origemRegistro (CALCULO/ATUALIZACAO), dataEvento, folhaDoEvento
 *   - verbasSelecionadas (lista de HonorarioVerbaDeCalculo)
 *
 * Implementa EventoAtualizacao (Fase 9): prioridade 2.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';
import type { Calculo } from '../calculo';
import {
  BaseParaApuracaoDeHonorarioEnum,
  IndiceMonetarioEnum,
  OpcaoDeIndiceDeCorrecaoEnum,
  TipoCobrancaReclamanteEnum,
  TipoDeDevedorDoHonorarioEnum,
  TipoDeImpostoDeRendaEnum,
  TipoDocumentoFiscalEnum,
  TipoHonorarioEnum,
  TipoOrigemRegistroEnum,
  TipoValorEnum,
} from '../../../constantes/enums';
import type { HonorarioVerbaDeCalculo } from './honorario-verba-de-calculo';

const ZERO = new Decimal(0);

export class Honorario implements IModuloLiquidavel {
  static readonly PRIORIDADE_ATUALIZACAO = 2;

  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;
  private descricao: string = '';
  private tipoHonorario: TipoHonorarioEnum = TipoHonorarioEnum.ADVOCATICIOS;
  private tipoDeDevedor: TipoDeDevedorDoHonorarioEnum | null = null;
  private nomeCredor: string = '';
  private tipoDocumentoFiscalCredor: TipoDocumentoFiscalEnum = TipoDocumentoFiscalEnum.CPF;
  private numeroDocumentoFiscalCredor: string | null = null;
  private apurarIRRF: boolean = false;
  private tipoImpostoRenda: TipoDeImpostoDeRendaEnum | null = null;
  private tipoValor: TipoValorEnum = TipoValorEnum.CALCULADO;
  private valor: Decimal | null = null;
  private valorJurosCalcExterno: Decimal | null = null;
  private dataVencimento: Date | null = null;
  private tipoDeIndiceDeCorrecao: OpcaoDeIndiceDeCorrecaoEnum = OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA;
  private outroIndiceDeCorrecao: IndiceMonetarioEnum | null = null;
  private aplicarJuros: boolean = false;
  private dataApartirDeAplicarJuros: Date | null = null;
  private aliquota: Decimal | null = null;
  private baseParaApuracao: BaseParaApuracaoDeHonorarioEnum | null = null;
  private baseHonorario: Decimal | null = null;
  private indiceCorrecaoHonorario: Decimal | null = null;
  private taxaJurosHonorario: Decimal | null = null;
  private valorInicialFaixaIrpf: Decimal | null = null;
  private valorFinalFaixaIrpf: Decimal | null = null;
  private valorAliquotaIrpf: Decimal | null = null;
  private valorDeducaoIrpf: Decimal | null = null;
  private valorImpostoRenda: Decimal | null = null;
  private apurarIRPFSobreJuros: boolean = false;
  private tipoCobrancaReclamante: TipoCobrancaReclamanteEnum = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;
  private origemRegistro: TipoOrigemRegistroEnum = TipoOrigemRegistroEnum.CALCULO;
  private dataEvento: Date | null = null;
  private folhaDoEvento: string | null = null;
  private verbasSelecionadas: HonorarioVerbaDeCalculo[] = [];
  /** transient — seleção UI, convertida em HonorarioVerbaDeCalculo em consistirDados(). */
  private verbasQueNaoCompoemPrincipalSelecionadas: unknown[] = [];

  // ── campos legacy V3 (pjc-to-engine) ──
  private valorCalculadoLegacy: Decimal = ZERO;
  private valorFixoLegacy: Decimal | null = null;

  constructor(calculo?: Calculo) {
    if (calculo) this.calculo = calculo;
  }

  // ── EntidadeBase ──
  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getDescricao(): string { return this.descricao; }
  setDescricao(v: string): void { this.descricao = v; }

  getTipoHonorario(): TipoHonorarioEnum { return this.tipoHonorario; }
  setTipoHonorario(v: TipoHonorarioEnum): void { this.tipoHonorario = v; }

  getTipoDeDevedor(): TipoDeDevedorDoHonorarioEnum | null { return this.tipoDeDevedor; }
  setTipoDeDevedor(v: TipoDeDevedorDoHonorarioEnum | null): void { this.tipoDeDevedor = v; }

  getNomeCredor(): string { return this.nomeCredor; }
  setNomeCredor(v: string): void { this.nomeCredor = v; }

  getTipoDocumentoFiscalCredor(): TipoDocumentoFiscalEnum { return this.tipoDocumentoFiscalCredor; }
  setTipoDocumentoFiscalCredor(v: TipoDocumentoFiscalEnum): void { this.tipoDocumentoFiscalCredor = v; }

  getNumeroDocumentoFiscalCredor(): string | null { return this.numeroDocumentoFiscalCredor; }
  /** Java filtra "somente números" (linha 330); mantemos a mesma semântica. */
  setNumeroDocumentoFiscalCredor(v: string | null): void {
    this.numeroDocumentoFiscalCredor = v === null ? null : v.replace(/\D/g, '');
  }

  getApurarIRRF(): boolean { return this.apurarIRRF; }
  setApurarIRRF(v: boolean): void { this.apurarIRRF = v; }

  getTipoImpostoRenda(): TipoDeImpostoDeRendaEnum | null { return this.tipoImpostoRenda; }
  setTipoImpostoRenda(v: TipoDeImpostoDeRendaEnum | null): void { this.tipoImpostoRenda = v; }

  getTipoValor(): TipoValorEnum { return this.tipoValor; }
  setTipoValor(v: TipoValorEnum): void { this.tipoValor = v; }

  getValor(): Decimal | null { return this.valor; }
  setValor(v: Decimal | null): void { this.valor = v; }

  getValorJurosCalcExterno(): Decimal | null { return this.valorJurosCalcExterno; }
  setValorJurosCalcExterno(v: Decimal | null): void { this.valorJurosCalcExterno = v; }

  getDataVencimento(): Date | null { return this.dataVencimento; }
  setDataVencimento(d: Date | null): void { this.dataVencimento = d; }

  getTipoDeIndiceDeCorrecao(): OpcaoDeIndiceDeCorrecaoEnum { return this.tipoDeIndiceDeCorrecao; }
  setTipoDeIndiceDeCorrecao(v: OpcaoDeIndiceDeCorrecaoEnum): void { this.tipoDeIndiceDeCorrecao = v; }

  getOutroIndiceDeCorrecao(): IndiceMonetarioEnum | null { return this.outroIndiceDeCorrecao; }
  setOutroIndiceDeCorrecao(v: IndiceMonetarioEnum | null): void { this.outroIndiceDeCorrecao = v; }

  getAplicarJuros(): boolean { return this.aplicarJuros; }
  setAplicarJuros(v: boolean): void { this.aplicarJuros = v; }

  getDataApartirDeAplicarJuros(): Date | null { return this.dataApartirDeAplicarJuros; }
  setDataApartirDeAplicarJuros(d: Date | null): void { this.dataApartirDeAplicarJuros = d; }

  getAliquota(): Decimal | null { return this.aliquota; }
  setAliquota(v: Decimal | null): void { this.aliquota = v; }

  getBaseParaApuracao(): BaseParaApuracaoDeHonorarioEnum | null { return this.baseParaApuracao; }
  setBaseParaApuracao(v: BaseParaApuracaoDeHonorarioEnum | null): void { this.baseParaApuracao = v; }

  getBaseHonorario(): Decimal | null { return this.baseHonorario; }
  setBaseHonorario(v: Decimal | null): void { this.baseHonorario = v; }

  getIndiceCorrecaoHonorario(): Decimal | null { return this.indiceCorrecaoHonorario; }
  setIndiceCorrecaoHonorario(v: Decimal | null): void { this.indiceCorrecaoHonorario = v; }

  getTaxaJurosHonorario(): Decimal | null { return this.taxaJurosHonorario; }
  setTaxaJurosHonorario(v: Decimal | null): void { this.taxaJurosHonorario = v; }

  getValorInicialFaixaIrpf(): Decimal | null { return this.valorInicialFaixaIrpf; }
  setValorInicialFaixaIrpf(v: Decimal | null): void { this.valorInicialFaixaIrpf = v; }

  getValorFinalFaixaIrpf(): Decimal | null { return this.valorFinalFaixaIrpf; }
  setValorFinalFaixaIrpf(v: Decimal | null): void { this.valorFinalFaixaIrpf = v; }

  getValorAliquotaIrpf(): Decimal | null { return this.valorAliquotaIrpf; }
  setValorAliquotaIrpf(v: Decimal | null): void { this.valorAliquotaIrpf = v; }

  getValorDeducaoIrpf(): Decimal | null { return this.valorDeducaoIrpf; }
  setValorDeducaoIrpf(v: Decimal | null): void { this.valorDeducaoIrpf = v; }

  getValorImpostoRenda(): Decimal | null { return this.valorImpostoRenda; }
  setValorImpostoRenda(v: Decimal | null): void { this.valorImpostoRenda = v; }

  getApurarIRPFSobreJuros(): boolean { return this.apurarIRPFSobreJuros; }
  setApurarIRPFSobreJuros(v: boolean): void { this.apurarIRPFSobreJuros = v; }

  getTipoCobrancaReclamante(): TipoCobrancaReclamanteEnum { return this.tipoCobrancaReclamante; }
  setTipoCobrancaReclamante(v: TipoCobrancaReclamanteEnum): void { this.tipoCobrancaReclamante = v; }

  getOrigemRegistro(): TipoOrigemRegistroEnum { return this.origemRegistro; }
  setOrigemRegistro(v: TipoOrigemRegistroEnum): void { this.origemRegistro = v; }

  getDataEvento(): Date | null { return this.dataEvento; }
  setDataEvento(d: Date | null): void { this.dataEvento = d; }

  getFolhaDoEvento(): string | null { return this.folhaDoEvento; }
  setFolhaDoEvento(v: string | null): void { this.folhaDoEvento = v; }

  getVerbasSelecionadas(): HonorarioVerbaDeCalculo[] { return this.verbasSelecionadas; }
  setVerbasSelecionadas(v: HonorarioVerbaDeCalculo[]): void { this.verbasSelecionadas = v; }

  getVerbasQueNaoCompoemPrincipalSelecionadas(): unknown[] {
    return this.verbasQueNaoCompoemPrincipalSelecionadas;
  }
  setVerbasQueNaoCompoemPrincipalSelecionadas(v: unknown[]): void {
    this.verbasQueNaoCompoemPrincipalSelecionadas = v;
  }

  /** getValorCorrigido (Java linha 477) — valor × indiceCorrecao (null-safe). */
  getValorCorrigido(): Decimal | null {
    if (this.valor === null) return null;
    if (this.indiceCorrecaoHonorario === null) return this.valor;
    return this.valor.times(this.indiceCorrecaoHonorario);
  }

  /** getJuros (Java linha 497) — taxa × valor corrigido. */
  getJuros(): Decimal | null {
    if (this.taxaJurosHonorario === null) return null;
    const vc = this.getValorCorrigido();
    if (vc === null) return null;
    return vc.times(this.taxaJurosHonorario).div(100);
  }

  /** getValorTotal (Java linha 512) — valorCorrigido + juros. */
  getValorTotal(): Decimal | null {
    const vc = this.getValorCorrigido();
    if (vc === null) return null;
    const j = this.getJuros();
    return j === null ? vc : vc.plus(j);
  }

  /** getPrioridade (EventoAtualizacao, Java linha 614) — 2. */
  getPrioridade(): number { return Honorario.PRIORIDADE_ATUALIZACAO; }

  /**
   * consistirDados (Java linha 573) — garante coerência entre flags.
   *   INFORMADO:  zera aliquota / baseParaApuracao / verbasSelecionadas
   *   CALCULADO:  zera valor / dataVencimento / outroIndiceDeCorrecao /
   *               dataApartirDeAplicarJuros
   *   RECLAMADO devedor ⇒ tipoCobrancaReclamante = DESCONTAR_CREDITO
   *   Se base não for VNP ⇒ verbasSelecionadas vazia
   */
  consistirDados(): void {
    if (this.tipoValor === TipoValorEnum.INFORMADO) {
      this.aliquota = null;
      this.baseParaApuracao = null;
      this.verbasSelecionadas = [];
    } else {
      this.valor = null;
      this.dataVencimento = null;
      this.outroIndiceDeCorrecao = null;
      this.dataApartirDeAplicarJuros = null;
    }
    if (this.tipoDeDevedor === TipoDeDevedorDoHonorarioEnum.RECLAMADO) {
      this.tipoCobrancaReclamante = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;
    }
    if (this.baseParaApuracao !== BaseParaApuracaoDeHonorarioEnum.VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL) {
      this.verbasSelecionadas = [];
    }
  }

  /** liquidar (Java linha 601) — delega para MaquinaDeCalculoDeHonorarios. */
  liquidar(_dataLiquidacao?: Date): void {
    if (this.valorFixoLegacy !== null && !this.valorFixoLegacy.isZero()) {
      this.valorCalculadoLegacy = this.valorFixoLegacy;
    }
    const { MaquinaDeCalculoDeHonorarios } = require('./maquina-de-calculo-de-honorarios') as typeof import('./maquina-de-calculo-de-honorarios');
    new MaquinaDeCalculoDeHonorarios(this).liquidar();
  }

  // ─────────────────────────────────────────────────────────────────────
  //                   API LEGACY (V3 pjc-to-engine)
  // ─────────────────────────────────────────────────────────────────────

  /** Alias legacy `percentual` ↔ `aliquota`. */
  getPercentual(): Decimal { return this.aliquota ?? ZERO; }
  setPercentual(v: Decimal): void { this.aliquota = v; }

  getDevedor(): TipoDeDevedorDoHonorarioEnum { return this.tipoDeDevedor ?? TipoDeDevedorDoHonorarioEnum.RECLAMADO; }
  setDevedor(v: TipoDeDevedorDoHonorarioEnum): void { this.tipoDeDevedor = v; }

  getValorCalculado(): Decimal { return this.valorCalculadoLegacy; }
  setValorCalculado(v: Decimal): void { this.valorCalculadoLegacy = v; }

  getValorFixo(): Decimal | null { return this.valorFixoLegacy; }
  setValorFixo(v: Decimal | null): void { this.valorFixoLegacy = v; }

  /** calcular (legacy) — valorCalculado = base × aliquota% (arredondado). */
  calcular(base: Decimal): void {
    const aliq = this.aliquota ?? new Decimal(15);
    this.valorCalculadoLegacy = arredondarValorMonetario(base.times(aliq).div(100));
  }
}
