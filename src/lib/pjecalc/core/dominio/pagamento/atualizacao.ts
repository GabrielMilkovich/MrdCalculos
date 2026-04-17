/**
 * PJe-Calc v2.15.1 — Atualizacao (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao
 *
 * Ref Java: pjecalc-fonte/.../pagamento/Atualizacao.java (~1579 linhas)
 *
 * Entidade que agrega todos os registros da atualização pós-liquidação:
 *   - dataCriacao, dataDeLiquidacao
 *   - cobrarEncargosIrpf, atualizarRegraPrecatorio
 *   - grupoEsferaPrecatorio, tipoPrecatorio
 *   - dataInicioPeriodoDaGraca, dataFimPeriodoDaGraca
 *   - dataInicioAplicarEC1362025
 *   - hashCodeLiquidacao, identificacaoCalculoFolha
 *   - descritivoDeEventosResumo, comentarios, versaoDoSistema
 *   - listaCreditosDoReclamante / listaDebitosDoReclamado /
 *     listaOutrosDebitosDoReclamado / listaDebitosCobrarDoReclamante
 *   - transient: totalBrutoDevidoReclamanteParaCalculoDePercentual,
 *     totalVerbasRemuneratorias, totalVerbasTributaveis, baseMultaJaPaga
 */
import Decimal from 'decimal.js';
import { GrupoEsferaPrecatorioEnum, TipoPrecatorioEnumAtualizacao } from '../../constantes/enums';
import type { Calculo } from '../calculo/calculo';
import type { CreditosDoReclamante } from './creditos-do-reclamante';
import type { DebitosDoReclamante } from './debitos-do-reclamante';
import type { OutrosDebitosReclamado } from './outros-debitos-reclamado';
import type { DebitosCobrarDoReclamante } from './debitos-cobrar-do-reclamante';

const ZERO = new Decimal(0);

export class Atualizacao {
  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;
  private dataCriacao: Date | null = null;
  private dataDeLiquidacao: Date | null = null;
  private cobrarEncargosIrpf: boolean = true;
  private atualizarRegraPrecatorio: boolean = false;
  private grupoEsferaPrecatorio: GrupoEsferaPrecatorioEnum = GrupoEsferaPrecatorioEnum.FEDERAL;
  private tipoPrecatorio: TipoPrecatorioEnumAtualizacao = TipoPrecatorioEnumAtualizacao.RPV;
  private dataInicioPeriodoDaGraca: Date | null = null;
  private dataFimPeriodoDaGraca: Date | null = null;
  private dataInicioAplicarEC1362025: Date | null = null;
  private hashCodeLiquidacao: string | null = null;
  private identificacaoCalculoFolha: string | null = null;
  private descritivoDeEventosResumo: string | null = null;
  private comentarios: string | null = null;
  private versaoDoSistema: string | null = null;

  private listaCreditosDoReclamante: CreditosDoReclamante[] = [];
  private listaDebitosDoReclamado: DebitosDoReclamante[] = [];
  private listaOutrosDebitosDoReclamado: OutrosDebitosReclamado[] = [];
  private listaDebitosCobrarDoReclamante: DebitosCobrarDoReclamante[] = [];

  // transient
  private totalBrutoDevidoReclamanteParaCalculoDePercentual: Decimal = ZERO;
  private totalVerbasRemuneratorias: Decimal = ZERO;
  private totalVerbasTributaveis: Decimal = ZERO;
  private baseMultaJaPaga: boolean = false;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getDataCriacao(): Date | null { return this.dataCriacao; }
  setDataCriacao(d: Date | null): void { this.dataCriacao = d; }

  getDataDeLiquidacao(): Date | null { return this.dataDeLiquidacao; }
  setDataDeLiquidacao(d: Date | null): void { this.dataDeLiquidacao = d; }

  getCobrarEncargosIrpf(): boolean { return this.cobrarEncargosIrpf; }
  setCobrarEncargosIrpf(v: boolean): void { this.cobrarEncargosIrpf = v; }

  getAtualizarRegraPrecatorio(): boolean { return this.atualizarRegraPrecatorio; }
  setAtualizarRegraPrecatorio(v: boolean): void { this.atualizarRegraPrecatorio = v; }

  getGrupoEsferaPrecatorio(): GrupoEsferaPrecatorioEnum { return this.grupoEsferaPrecatorio; }
  setGrupoEsferaPrecatorio(v: GrupoEsferaPrecatorioEnum): void { this.grupoEsferaPrecatorio = v; }

  getTipoPrecatorio(): TipoPrecatorioEnumAtualizacao { return this.tipoPrecatorio; }
  setTipoPrecatorio(v: TipoPrecatorioEnumAtualizacao): void { this.tipoPrecatorio = v; }

  getDataInicioPeriodoDaGraca(): Date | null { return this.dataInicioPeriodoDaGraca; }
  setDataInicioPeriodoDaGraca(d: Date | null): void { this.dataInicioPeriodoDaGraca = d; }

  getDataFimPeriodoDaGraca(): Date | null { return this.dataFimPeriodoDaGraca; }
  setDataFimPeriodoDaGraca(d: Date | null): void { this.dataFimPeriodoDaGraca = d; }

  getDataInicioAplicarEC1362025(): Date | null { return this.dataInicioAplicarEC1362025; }
  setDataInicioAplicarEC1362025(d: Date | null): void { this.dataInicioAplicarEC1362025 = d; }

  getHashCodeLiquidacao(): string | null { return this.hashCodeLiquidacao; }
  setHashCodeLiquidacao(v: string | null): void { this.hashCodeLiquidacao = v; }

  getIdentificacaoCalculoFolha(): string | null { return this.identificacaoCalculoFolha; }
  setIdentificacaoCalculoFolha(v: string | null): void { this.identificacaoCalculoFolha = v; }

  getDescritivoDeEventosResumo(): string | null { return this.descritivoDeEventosResumo; }
  setDescritivoDeEventosResumo(v: string | null): void { this.descritivoDeEventosResumo = v; }

  getComentarios(): string | null { return this.comentarios; }
  setComentarios(v: string | null): void { this.comentarios = v; }

  getVersaoDoSistema(): string | null { return this.versaoDoSistema; }
  setVersaoDoSistema(v: string | null): void { this.versaoDoSistema = v; }

  getListaCreditosDoReclamante(): CreditosDoReclamante[] { return this.listaCreditosDoReclamante; }
  setListaCreditosDoReclamante(l: CreditosDoReclamante[]): void { this.listaCreditosDoReclamante = l; }

  getListaDebitosDoReclamado(): DebitosDoReclamante[] { return this.listaDebitosDoReclamado; }
  setListaDebitosDoReclamado(l: DebitosDoReclamante[]): void { this.listaDebitosDoReclamado = l; }

  getListaOutrosDebitosDoReclamado(): OutrosDebitosReclamado[] { return this.listaOutrosDebitosDoReclamado; }
  setListaOutrosDebitosDoReclamado(l: OutrosDebitosReclamado[]): void { this.listaOutrosDebitosDoReclamado = l; }

  getListaDebitosCobrarDoReclamante(): DebitosCobrarDoReclamante[] { return this.listaDebitosCobrarDoReclamante; }
  setListaDebitosCobrarDoReclamante(l: DebitosCobrarDoReclamante[]): void { this.listaDebitosCobrarDoReclamante = l; }

  // transient
  getTotalBrutoDevidoReclamanteParaCalculoDePercentual(): Decimal { return this.totalBrutoDevidoReclamanteParaCalculoDePercentual; }
  setTotalBrutoDevidoReclamanteParaCalculoDePercentual(v: Decimal): void { this.totalBrutoDevidoReclamanteParaCalculoDePercentual = v; }

  getTotalVerbasRemuneratorias(): Decimal { return this.totalVerbasRemuneratorias; }
  setTotalVerbasRemuneratorias(v: Decimal): void { this.totalVerbasRemuneratorias = v; }

  getTotalVerbasTributaveis(): Decimal { return this.totalVerbasTributaveis; }
  setTotalVerbasTributaveis(v: Decimal): void { this.totalVerbasTributaveis = v; }

  getBaseMultaJaPaga(): boolean { return this.baseMultaJaPaga; }
  setBaseMultaJaPaga(v: boolean): void { this.baseMultaJaPaga = v; }
}
