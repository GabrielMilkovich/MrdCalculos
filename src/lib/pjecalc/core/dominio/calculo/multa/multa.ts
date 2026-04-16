/**
 * PJe-Calc v2.15.1 — Multa
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa
 *
 * Ref Java: pjecalc-fonte/.../calculo/multa/Multa.java (~580 linhas)
 *
 * Entidade orquestradora das multas/indenizações do cálculo. Campos:
 *   - descricao, tipoCredorDevedor (4 combinações de credor/devedor),
 *     nomeTerceiro (quando envolve TERCEIRO_*)
 *   - tipoValorDaMulta (INFORMADO/CALCULADO)
 *   - valorMulta (INFORMADO), valorJurosCalcExterno
 *   - dataVencimentoMulta, dataApartirDeAplicarJuros
 *   - opcaoIndiceDeCorrecaoDaMulta + outroIndiceDeCorrecaoDaMulta
 *   - aplicarJurosSobreMulta
 *   - aliquotaMulta, tipoBaseMulta (P/PC/PCP/VC) — CALCULADO
 *   - baseMulta, indiceCorrecaoMulta, taxaJurosMulta
 *   - origemRegistro (CALCULO/ATUALIZACAO), dataEvento, folhaDoEvento
 *   - tipoCobrancaReclamante (DESCONTAR/COBRAR)
 *
 * Implementa EventoAtualizacao (Fase 9): prioridade 1.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';
import type { Calculo } from '../calculo';
import {
  BaseParaApuracaoDeMultaEnum,
  CredorDevedorMultaEnum,
  IndiceMonetarioEnum,
  OpcaoDeIndiceDeCorrecaoEnum,
  TipoCobrancaReclamanteEnum,
  TipoOrigemRegistroEnum,
  TipoValorEnum,
} from '../../../constantes/enums';

const ZERO = new Decimal(0);

/** Tipo legacy (V3) — mantido por compatibilidade com pjc-to-engine. */
export type TipoMultaLegacy = 'ART_467' | 'ART_523';

export class Multa implements IModuloLiquidavel {
  static readonly PRIORIDADE_ATUALIZACAO = 1;

  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;
  private descricao: string = '';
  private tipoCredorDevedor: CredorDevedorMultaEnum = CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO;
  private nomeTerceiro: string | null = null;
  private tipoValorDaMulta: TipoValorEnum = TipoValorEnum.CALCULADO;
  private valorMulta: Decimal | null = null;
  private valorJurosCalcExterno: Decimal | null = null;
  private dataVencimentoMulta: Date | null = null;
  private opcaoIndiceDeCorrecaoDaMulta: OpcaoDeIndiceDeCorrecaoEnum = OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA;
  private outroIndiceDeCorrecaoDaMulta: IndiceMonetarioEnum | null = null;
  private aplicarJurosSobreMulta: boolean = false;
  private dataApartirDeAplicarJuros: Date | null = null;
  private aliquotaMulta: Decimal | null = null;
  private tipoBaseMulta: BaseParaApuracaoDeMultaEnum | null = null;
  private baseMulta: Decimal | null = null;
  private indiceCorrecaoMulta: Decimal | null = null;
  private taxaJurosMulta: Decimal | null = null;
  private origemRegistro: TipoOrigemRegistroEnum = TipoOrigemRegistroEnum.CALCULO;
  private tipoCobrancaReclamante: TipoCobrancaReclamanteEnum = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;
  private dataEvento: Date | null = null;
  private folhaDoEvento: string | null = null;

  // ── Campos legacy V3 (pjc-to-engine) ──
  private percentualLegacy: Decimal = new Decimal(10);
  private valorBaseLegacy: Decimal = ZERO;
  private valorCalculadoLegacy: Decimal = ZERO;
  private tipoLegacy: TipoMultaLegacy = 'ART_523';

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

  getTipoCredorDevedor(): CredorDevedorMultaEnum { return this.tipoCredorDevedor; }
  setTipoCredorDevedor(v: CredorDevedorMultaEnum): void { this.tipoCredorDevedor = v; }

  getNomeTerceiro(): string | null { return this.nomeTerceiro; }
  setNomeTerceiro(v: string | null): void { this.nomeTerceiro = v; }

  getTipoValorDaMulta(): TipoValorEnum { return this.tipoValorDaMulta; }
  setTipoValorDaMulta(v: TipoValorEnum): void { this.tipoValorDaMulta = v; }

  getValorMulta(): Decimal | null { return this.valorMulta; }
  setValorMulta(v: Decimal | null): void { this.valorMulta = v; }

  getValorJurosCalcExterno(): Decimal | null { return this.valorJurosCalcExterno; }
  setValorJurosCalcExterno(v: Decimal | null): void { this.valorJurosCalcExterno = v; }

  getDataVencimentoMulta(): Date | null { return this.dataVencimentoMulta; }
  setDataVencimentoMulta(d: Date | null): void { this.dataVencimentoMulta = d; }

  getOpcaoIndiceDeCorrecaoDaMulta(): OpcaoDeIndiceDeCorrecaoEnum { return this.opcaoIndiceDeCorrecaoDaMulta; }
  setOpcaoIndiceDeCorrecaoDaMulta(v: OpcaoDeIndiceDeCorrecaoEnum): void { this.opcaoIndiceDeCorrecaoDaMulta = v; }

  getOutroIndiceDeCorrecaoDaMulta(): IndiceMonetarioEnum | null { return this.outroIndiceDeCorrecaoDaMulta; }
  setOutroIndiceDeCorrecaoDaMulta(v: IndiceMonetarioEnum | null): void { this.outroIndiceDeCorrecaoDaMulta = v; }

  getAplicarJurosSobreMulta(): boolean { return this.aplicarJurosSobreMulta; }
  setAplicarJurosSobreMulta(v: boolean): void { this.aplicarJurosSobreMulta = v; }

  getDataApartirDeAplicarJuros(): Date | null { return this.dataApartirDeAplicarJuros; }
  setDataApartirDeAplicarJuros(d: Date | null): void { this.dataApartirDeAplicarJuros = d; }

  getAliquotaMulta(): Decimal | null { return this.aliquotaMulta; }
  setAliquotaMulta(v: Decimal | null): void { this.aliquotaMulta = v; }

  getTipoBaseMulta(): BaseParaApuracaoDeMultaEnum | null { return this.tipoBaseMulta; }
  setTipoBaseMulta(v: BaseParaApuracaoDeMultaEnum | null): void { this.tipoBaseMulta = v; }

  getBaseMulta(): Decimal | null { return this.baseMulta; }
  setBaseMulta(v: Decimal | null): void { this.baseMulta = v; }

  getIndiceCorrecaoMulta(): Decimal | null { return this.indiceCorrecaoMulta; }
  setIndiceCorrecaoMulta(v: Decimal | null): void { this.indiceCorrecaoMulta = v; }

  getTaxaJurosMulta(): Decimal | null { return this.taxaJurosMulta; }
  setTaxaJurosMulta(v: Decimal | null): void { this.taxaJurosMulta = v; }

  getOrigemRegistro(): TipoOrigemRegistroEnum { return this.origemRegistro; }
  setOrigemRegistro(v: TipoOrigemRegistroEnum): void { this.origemRegistro = v; }

  getTipoCobrancaReclamante(): TipoCobrancaReclamanteEnum { return this.tipoCobrancaReclamante; }
  setTipoCobrancaReclamante(v: TipoCobrancaReclamanteEnum): void { this.tipoCobrancaReclamante = v; }

  getDataEvento(): Date | null { return this.dataEvento; }
  setDataEvento(d: Date | null): void { this.dataEvento = d; }

  getFolhaDoEvento(): string | null { return this.folhaDoEvento; }
  setFolhaDoEvento(v: string | null): void { this.folhaDoEvento = v; }

  /** getValorCorrigido (Java linha 433) — valorMulta × indice (fallback valor/zero). */
  getValorCorrigido(): Decimal {
    const v = this.valorMulta;
    if (v === null) return ZERO;
    if (this.indiceCorrecaoMulta === null) return v;
    return v.times(this.indiceCorrecaoMulta);
  }

  /** getJuros (Java linha 444) — valorCorrigido × taxa/100 (0 se taxa nula). */
  getJuros(): Decimal {
    if (this.taxaJurosMulta === null) return ZERO;
    return this.getValorCorrigido().times(this.taxaJurosMulta).div(100);
  }

  /** getValorTotal (Java linha 451) — valorCorrigido + juros. */
  getValorTotal(): Decimal | null {
    const vc = this.getValorCorrigido();
    if (vc === null) return null;
    return vc.plus(this.getJuros());
  }

  /** getPrioridade (EventoAtualizacao, Java linha 460) — 1. */
  getPrioridade(): number { return Multa.PRIORIDADE_ATUALIZACAO; }

  /**
   * consistirDados (Java linha 254):
   *   - CALCULADO ⇒ dataApartirDeAplicarJuros = null
   *   - Se credor NÃO é TERCEIRO_RECLAMANTE ⇒ tipoCobranca = DESCONTAR_CREDITO
   *   - Se credor é RECLAMANTE_RECLAMADO ou RECLAMADO_RECLAMANTE ⇒ nomeTerceiro = null
   */
  consistirDados(): void {
    if (this.tipoValorDaMulta === TipoValorEnum.CALCULADO) {
      this.dataApartirDeAplicarJuros = null;
    }
    if (this.tipoCredorDevedor !== CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE) {
      this.tipoCobrancaReclamante = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;
    }
    if (
      this.tipoCredorDevedor === CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO ||
      this.tipoCredorDevedor === CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE
    ) {
      this.nomeTerceiro = null;
    }
  }

  /** liquidar (Java linha 271) — delega para MaquinaDeCalculoDeMulta (TODO). */
  liquidar(): void {
    // Caminho legacy V3 (pjc-to-engine): valorBase × percentual/100
    if (!this.valorBaseLegacy.isZero()) {
      this.valorCalculadoLegacy = arredondarValorMonetario(
        this.valorBaseLegacy.times(this.percentualLegacy).div(100),
      );
    }
    // TODO(fase-8): MaquinaDeCalculoDeMulta.liquidar()
  }

  // ─────────────────────────────────────────────────────────────────────
  //                     API LEGACY (V3)
  // ─────────────────────────────────────────────────────────────────────

  getPercentual(): Decimal { return this.percentualLegacy; }
  setPercentual(v: Decimal): void { this.percentualLegacy = v; }
  getValorBase(): Decimal { return this.valorBaseLegacy; }
  setValorBase(v: Decimal): void { this.valorBaseLegacy = v; }
  getValorCalculado(): Decimal { return this.valorCalculadoLegacy; }
  getTipo(): TipoMultaLegacy { return this.tipoLegacy; }
  setTipo(v: TipoMultaLegacy): void { this.tipoLegacy = v; }
}
