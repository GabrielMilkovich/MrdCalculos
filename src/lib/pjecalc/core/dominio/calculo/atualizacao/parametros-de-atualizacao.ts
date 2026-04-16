/**
 * PJe-Calc v2.15.1 — ParametrosDeAtualizacao
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/atualizacao/ParametrosDeAtualizacao.java
 *
 * Classe de configuração central da correção/juros do cálculo. Contém ~60 campos
 * no Java original; aqui portamos os essenciais para cálculo (correção + juros +
 * combinações). Campos ligados a INSS/previdência privada/custas ficam na
 * primeira iteração omitidos e serão adicionados quando os módulos correspondentes
 * forem portados.
 */
import { CombinacaoDeIndice } from './combinacao-de-indice';
import { CombinacaoDeJuros } from './combinacao-de-juros';
import {
  IndiceMonetarioEnum,
  JurosEnum,
  BaseDeJurosDasVerbasEnum,
} from '../../../constantes/enums';

export class ParametrosDeAtualizacao {
  // ── Correção monetária ──
  private indiceTrabalhista: IndiceMonetarioEnum = IndiceMonetarioEnum.IPCAE;
  private outroIndiceTrabalhista: IndiceMonetarioEnum | null = null;
  private combinarOutroIndice: boolean = false;
  private apartirDeOutroIndice: Date | null = null;
  private ignorarTaxaNegativa: boolean = false;
  private listaDeCombinacaoDeIndices: Set<CombinacaoDeIndice> = new Set();

  // ── Juros ──
  private juros: JurosEnum = JurosEnum.TRD_SIMPLES;
  private jurosPadrao: boolean = false;
  private entePublico: boolean = false;
  private apertirDe: Date | null = null;
  private aplicarJurosFasePreJudicial: boolean = false;
  private combinarOutroJuros: boolean = false;
  private listaDeCombinacaoDeJuros: Set<CombinacaoDeJuros> = new Set();
  private baseDeJurosDasVerbas: BaseDeJurosDasVerbasEnum = BaseDeJurosDasVerbasEnum.VERBA_INSS;

  // ── Datas ──
  private dataDeLiquidacao: Date | null = null;

  // ── Getters/Setters (portados fieldo a fieldo do Java) ──
  getIndiceTrabalhista(): IndiceMonetarioEnum { return this.indiceTrabalhista; }
  setIndiceTrabalhista(v: IndiceMonetarioEnum): void { this.indiceTrabalhista = v; }

  getOutroIndiceTrabalhista(): IndiceMonetarioEnum | null { return this.outroIndiceTrabalhista; }
  setOutroIndiceTrabalhista(v: IndiceMonetarioEnum | null): void { this.outroIndiceTrabalhista = v; }

  getCombinarOutroIndice(): boolean { return this.combinarOutroIndice; }
  setCombinarOutroIndice(v: boolean): void { this.combinarOutroIndice = v; }

  getApartirDeOutroIndice(): Date | null { return this.apartirDeOutroIndice; }
  setApartirDeOutroIndice(v: Date | null): void { this.apartirDeOutroIndice = v; }

  getIgnorarTaxaNegativa(): boolean { return this.ignorarTaxaNegativa; }
  setIgnorarTaxaNegativa(v: boolean): void { this.ignorarTaxaNegativa = v; }

  getListaDeCombinacaoDeIndices(): Set<CombinacaoDeIndice> { return this.listaDeCombinacaoDeIndices; }
  setListaDeCombinacaoDeIndices(v: Set<CombinacaoDeIndice>): void { this.listaDeCombinacaoDeIndices = v; }
  adicionarCombinacaoDeIndice(c: CombinacaoDeIndice): void { this.listaDeCombinacaoDeIndices.add(c); }

  getJuros(): JurosEnum { return this.juros; }
  setJuros(v: JurosEnum): void { this.juros = v; }

  getJurosPadrao(): boolean { return this.jurosPadrao; }
  setJurosPadrao(v: boolean): void { this.jurosPadrao = v; }

  getEntePublico(): boolean { return this.entePublico; }
  setEntePublico(v: boolean): void { this.entePublico = v; }

  getApertirDe(): Date | null { return this.apertirDe; }
  setApertirDe(v: Date | null): void { this.apertirDe = v; }

  getAplicarJurosFasePreJudicial(): boolean { return this.aplicarJurosFasePreJudicial; }
  setAplicarJurosFasePreJudicial(v: boolean): void { this.aplicarJurosFasePreJudicial = v; }

  getCombinarOutroJuros(): boolean { return this.combinarOutroJuros; }
  setCombinarOutroJuros(v: boolean): void { this.combinarOutroJuros = v; }

  getListaDeCombinacaoDeJuros(): Set<CombinacaoDeJuros> { return this.listaDeCombinacaoDeJuros; }
  setListaDeCombinacaoDeJuros(v: Set<CombinacaoDeJuros>): void { this.listaDeCombinacaoDeJuros = v; }
  adicionarCombinacaoDeJuros(c: CombinacaoDeJuros): void { this.listaDeCombinacaoDeJuros.add(c); }

  getBaseDeJurosDasVerbas(): BaseDeJurosDasVerbasEnum { return this.baseDeJurosDasVerbas; }
  setBaseDeJurosDasVerbas(v: BaseDeJurosDasVerbasEnum): void { this.baseDeJurosDasVerbas = v; }

  /** getDataDeLiquidacao — alias para data de liquidação (usado por TabelaDeCorrecao). */
  getDataDeLiquidacao(): Date | null { return this.dataDeLiquidacao; }
  setDataDeLiquidacao(v: Date | null): void { this.dataDeLiquidacao = v; }
}
