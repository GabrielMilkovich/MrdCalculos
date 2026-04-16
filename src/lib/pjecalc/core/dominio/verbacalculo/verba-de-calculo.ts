/**
 * PJe-Calc v2.15.1 — VerbaDeCalculo
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/verbacalculo/VerbaDeCalculo.java (1598 linhas)
 *
 * Classe abstrata raiz das verbas. No Java, as subclasses concretas são:
 *   - Calculada (FormulaCalculada — base/div×mult×qty)
 *   - Informada (FormulaInformada — valor direto)
 *   - Principal / Reflexo (FormulaReflexo — média da principal)
 *
 * Este port foca nos campos e métodos usados pelo pipeline de cálculo:
 *   - Metadados (nome, período, incidências, característica)
 *   - Ocorrências (getOcorrencias, getOcorrenciasAtivas)
 *   - Fórmula (getFormula)
 *   - Correção (getTabelaDeCorrecaoMonetariaTrabalhista)
 *   - Getters usados por OcorrenciaDeVerba (getZeraValorNegativo, getTipoValor)
 */
import { OcorrenciaDeVerba, type IVerbaDeCalculoRef } from '../ocorrenciaverba/ocorrencia-de-verba';
import { Formula } from '../formula/formula';
import { TabelaDeCorrecaoMonetaria } from './tabela-de-correcao-monetaria';
import {
  CaracteristicaDaVerbaEnum,
  LogicoEnum,
  OcorrenciaDePagamentoEnum,
  JurosDoAjuizamentoEnum,
  ValorDaVerbaEnum,
} from '../../constantes/enums';

export class VerbaDeCalculo implements IVerbaDeCalculoRef {
  // ── Metadados ──
  private nome: string = '';
  private descricao: string = '';
  private periodoInicial: Date | null = null;
  private periodoFinal: Date | null = null;
  private caracteristica: CaracteristicaDaVerbaEnum = CaracteristicaDaVerbaEnum.COMUM;
  private ocorrenciaDePagamento: OcorrenciaDePagamentoEnum = OcorrenciaDePagamentoEnum.MENSAL;
  private jurosDoAjuizamento: JurosDoAjuizamentoEnum = JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS;
  private comporPrincipal: LogicoEnum = LogicoEnum.SIM;
  private ativo: boolean = true;
  private zeraValorNegativo: boolean = true;
  private aplicarProporcionalidade: boolean = false;
  private verbaAlterada: boolean = false;
  private liquidado: boolean = false;

  // ── Incidências ──
  private incidenciaINSS: boolean = false;
  private incidenciaIRPF: boolean = false;
  private incidenciaFGTS: boolean = false;
  private incidenciaPrevidenciaPrivada: boolean = false;
  private incidenciaPensaoAlimenticia: boolean = false;

  // ── Exclusões ──
  private excluirFaltaJustificada: boolean = false;
  private excluirFaltaNaoJustificada: boolean = false;
  private excluirFeriasGozadas: boolean = false;

  // ── Composição ──
  private formula: Formula | null = null;
  private ocorrencias: OcorrenciaDeVerba[] = [];
  private tabelaDeCorrecaoMonetariaTrabalhista: TabelaDeCorrecaoMonetaria | null = null;
  private tipoValor: ValorDaVerbaEnum = ValorDaVerbaEnum.CALCULADO;

  // ────────────── Getters/Setters ──────────────

  getNome(): string { return this.nome; }
  setNome(v: string): void { this.nome = v; }
  getDescricao(): string { return this.descricao; }
  setDescricao(v: string): void { this.descricao = v; }

  getPeriodoInicial(): Date | null { return this.periodoInicial; }
  setPeriodoInicial(v: Date): void { this.periodoInicial = v; }
  getPeriodoFinal(): Date | null { return this.periodoFinal; }
  setPeriodoFinal(v: Date): void { this.periodoFinal = v; }

  getCaracteristica(): CaracteristicaDaVerbaEnum { return this.caracteristica; }
  setCaracteristica(v: CaracteristicaDaVerbaEnum): void { this.caracteristica = v; }

  getOcorrenciaDePagamento(): OcorrenciaDePagamentoEnum { return this.ocorrenciaDePagamento; }
  setOcorrenciaDePagamento(v: OcorrenciaDePagamentoEnum): void { this.ocorrenciaDePagamento = v; }

  getJurosDoAjuizamento(): JurosDoAjuizamentoEnum { return this.jurosDoAjuizamento; }
  setJurosDoAjuizamento(v: JurosDoAjuizamentoEnum): void { this.jurosDoAjuizamento = v; }

  getComporPrincipal(): LogicoEnum { return this.comporPrincipal; }
  setComporPrincipal(v: LogicoEnum): void { this.comporPrincipal = v; }

  getAtivo(): boolean { return this.ativo; }
  setAtivo(v: boolean): void { this.ativo = v; }

  /** getZeraValorNegativo (linha 498) — implementa IVerbaDeCalculoRef */
  getZeraValorNegativo(): boolean { return this.zeraValorNegativo; }
  setZeraValorNegativo(v: boolean): void { this.zeraValorNegativo = v; }

  getAplicarProporcionalidade(): boolean { return this.aplicarProporcionalidade; }
  setAplicarProporcionalidade(v: boolean): void { this.aplicarProporcionalidade = v; }

  isLiquidado(): boolean { return this.liquidado; }
  setLiquidado(v: boolean): void { this.liquidado = v; }

  // ── Incidências ──
  getIncidenciaINSS(): boolean { return this.incidenciaINSS; }
  setIncidenciaINSS(v: boolean): void { this.incidenciaINSS = v; }
  getIncidenciaIRPF(): boolean { return this.incidenciaIRPF; }
  setIncidenciaIRPF(v: boolean): void { this.incidenciaIRPF = v; }
  getIncidenciaFGTS(): boolean { return this.incidenciaFGTS; }
  setIncidenciaFGTS(v: boolean): void { this.incidenciaFGTS = v; }
  getIncidenciaPrevidenciaPrivada(): boolean { return this.incidenciaPrevidenciaPrivada; }
  setIncidenciaPrevidenciaPrivada(v: boolean): void { this.incidenciaPrevidenciaPrivada = v; }
  getIncidenciaPensaoAlimenticia(): boolean { return this.incidenciaPensaoAlimenticia; }
  setIncidenciaPensaoAlimenticia(v: boolean): void { this.incidenciaPensaoAlimenticia = v; }

  // ── Exclusões ──
  getExcluirFaltaJustificada(): boolean { return this.excluirFaltaJustificada; }
  setExcluirFaltaJustificada(v: boolean): void { this.excluirFaltaJustificada = v; }
  getExcluirFaltaNaoJustificada(): boolean { return this.excluirFaltaNaoJustificada; }
  setExcluirFaltaNaoJustificada(v: boolean): void { this.excluirFaltaNaoJustificada = v; }
  getExcluirFeriasGozadas(): boolean { return this.excluirFeriasGozadas; }
  setExcluirFeriasGozadas(v: boolean): void { this.excluirFeriasGozadas = v; }

  // ── Fórmula ──
  getFormula(): Formula | null { return this.formula; }
  setFormula(v: Formula): void { this.formula = v; }

  /** getTipoValor (linha 820) — implementa IVerbaDeCalculoRef */
  getTipoValor(): ValorDaVerbaEnum { return this.tipoValor; }
  setTipoValor(v: ValorDaVerbaEnum): void { this.tipoValor = v; }

  // ── Ocorrências ──

  /** getOcorrencias (linha 822) */
  getOcorrencias(): OcorrenciaDeVerba[] { return this.ocorrencias; }
  setOcorrencias(v: OcorrenciaDeVerba[]): void { this.ocorrencias = v; }

  /** getOcorrenciasAtivas (linha 826) — filtra ativo=true */
  getOcorrenciasAtivas(): OcorrenciaDeVerba[] {
    return this.ocorrencias.filter(oc => oc.getAtivo());
  }

  // ── Correção monetária ──

  getTabelaDeCorrecaoMonetariaTrabalhista(): TabelaDeCorrecaoMonetaria | null {
    return this.tabelaDeCorrecaoMonetariaTrabalhista;
  }
  setTabelaDeCorrecaoMonetariaTrabalhista(v: TabelaDeCorrecaoMonetaria): void {
    this.tabelaDeCorrecaoMonetariaTrabalhista = v;
  }
}
