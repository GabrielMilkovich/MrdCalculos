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
import type { CartaoDePontoDaVerba } from './cartao-de-ponto-da-verba';
import type { HistoricoSalarialDaVerba } from './historico-salarial-da-verba';
import type { ValeTransporteDaVerba } from './vale-transporte-da-verba';

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

  // ── Coleções de vinculação (Java: 6 coleções separadas por aspecto) ──
  // Essas 6 coleções resolvem o bug do conversor pjc-to-engine que descartava
  // verbas ao tentar casar por nome em vez de por ID — a vinculação explícita
  // `.setVerbaDeCalculo(this)` garante que cada cartão/histórico/vale saiba
  // em qual verba está ancorado, independente de busca por nome.
  // Ver docs/PORT-PJECALC-CHANGELOG.md (Fase 3) para referência cruzada.
  private cartoesDePontoDaVerbaQuantidade: CartaoDePontoDaVerba[] = [];
  private cartoesDePontoDaVerbaDivisor: CartaoDePontoDaVerba[] = [];
  private historicosDaVerbaDoValorDevido: HistoricoSalarialDaVerba[] = [];
  private historicosDaVerbaDoValorPago: HistoricoSalarialDaVerba[] = [];
  private valesTransportesDoValorDevido: ValeTransporteDaVerba[] = [];
  private valesTransportesDoValorPago: ValeTransporteDaVerba[] = [];

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

  // ──────────────────────────────────────────────────────────────────────────
  //  Vinculação dados ↔ verba (Fase 3 — port 1-a-1 Java)
  //
  //  Porte direto dos 10 métodos de vinculação de VerbaDeCalculo.java:
  //  linhas 847, 854, 870, 878, 901, 909, 916, 923, 947, 955, 962, 969.
  //
  //  Contrato (idêntico Java):
  //   - `adicionar*`: LIMPA a coleção destino, então adiciona cada item
  //     com `setVerbaDeCalculo(this)` — garante o vínculo bidirecional
  //     mesmo quando o item já existia em outra verba.
  //   - `removerDos*`: remove apenas itens com `id != null` (itens persistidos
  //     — transientes são mantidos; esta regra é do Java, preservada para
  //     paridade).
  // ──────────────────────────────────────────────────────────────────────────

  getCartoesDePontoDaVerbaQuantidade(): CartaoDePontoDaVerba[] {
    return this.cartoesDePontoDaVerbaQuantidade;
  }
  setCartoesDePontoDaVerbaQuantidade(v: CartaoDePontoDaVerba[]): void {
    this.cartoesDePontoDaVerbaQuantidade = v;
  }

  getCartoesDePontoDaVerbaDivisor(): CartaoDePontoDaVerba[] {
    return this.cartoesDePontoDaVerbaDivisor;
  }
  setCartoesDePontoDaVerbaDivisor(v: CartaoDePontoDaVerba[]): void {
    this.cartoesDePontoDaVerbaDivisor = v;
  }

  getHistoricosDaVerbaDoValorDevido(): HistoricoSalarialDaVerba[] {
    return this.historicosDaVerbaDoValorDevido;
  }
  setHistoricosDaVerbaDoValorDevido(v: HistoricoSalarialDaVerba[]): void {
    this.historicosDaVerbaDoValorDevido = v;
  }

  getHistoricosDaVerbaDoValorPago(): HistoricoSalarialDaVerba[] {
    return this.historicosDaVerbaDoValorPago;
  }
  setHistoricosDaVerbaDoValorPago(v: HistoricoSalarialDaVerba[]): void {
    this.historicosDaVerbaDoValorPago = v;
  }

  getValesTransportesDoValorDevido(): ValeTransporteDaVerba[] {
    return this.valesTransportesDoValorDevido;
  }
  setValesTransportesDoValorDevido(v: ValeTransporteDaVerba[]): void {
    this.valesTransportesDoValorDevido = v;
  }

  getValesTransportesDoValorPago(): ValeTransporteDaVerba[] {
    return this.valesTransportesDoValorPago;
  }
  setValesTransportesDoValorPago(v: ValeTransporteDaVerba[]): void {
    this.valesTransportesDoValorPago = v;
  }

  // ── Cartão de ponto ──

  adicionarCartoesVinculadosAtravesDaQuantidade(cartoes: Iterable<CartaoDePontoDaVerba>): void {
    this.cartoesDePontoDaVerbaQuantidade = [];
    for (const c of cartoes) {
      c.setVerbaDeCalculo(this);
      this.cartoesDePontoDaVerbaQuantidade.push(c);
    }
  }

  removerDosCartoesDaVerbaDaQuantidade(cartoes: Iterable<CartaoDePontoDaVerba>): void {
    for (const c of cartoes) {
      if (c.getId() == null) continue;
      const idx = this.cartoesDePontoDaVerbaQuantidade.indexOf(c);
      if (idx >= 0) this.cartoesDePontoDaVerbaQuantidade.splice(idx, 1);
    }
  }

  adicionarCartoesVinculadosAtravesDoDivisor(cartoes: Iterable<CartaoDePontoDaVerba>): void {
    this.cartoesDePontoDaVerbaDivisor = [];
    for (const c of cartoes) {
      c.setVerbaDeCalculo(this);
      this.cartoesDePontoDaVerbaDivisor.push(c);
    }
  }

  removerDosCartoesDaVerbaDoDivisor(cartoes: Iterable<CartaoDePontoDaVerba>): void {
    for (const c of cartoes) {
      if (c.getId() == null) continue;
      const idx = this.cartoesDePontoDaVerbaDivisor.indexOf(c);
      if (idx >= 0) this.cartoesDePontoDaVerbaDivisor.splice(idx, 1);
    }
  }

  // ── Histórico salarial ──

  adicionarHistoricosVinculadosAtravesDoValorDevido(
    historicos: Iterable<HistoricoSalarialDaVerba>,
  ): void {
    this.historicosDaVerbaDoValorDevido = [];
    for (const h of historicos) {
      h.setVerbaDeCalculo(this);
      this.historicosDaVerbaDoValorDevido.push(h);
    }
  }

  removerDosHistoricosDaVerbaDoValorDevido(
    historicos: Iterable<HistoricoSalarialDaVerba>,
  ): void {
    for (const h of historicos) {
      if (h.getId() == null) continue;
      const idx = this.historicosDaVerbaDoValorDevido.indexOf(h);
      if (idx >= 0) this.historicosDaVerbaDoValorDevido.splice(idx, 1);
    }
  }

  adicionarHistoricosVinculadosAtravesDoValorPago(
    historicos: Iterable<HistoricoSalarialDaVerba>,
  ): void {
    this.historicosDaVerbaDoValorPago = [];
    for (const h of historicos) {
      h.setVerbaDeCalculo(this);
      this.historicosDaVerbaDoValorPago.push(h);
    }
  }

  removerDosHistoricosDaVerbaDoValorPago(
    historicos: Iterable<HistoricoSalarialDaVerba>,
  ): void {
    for (const h of historicos) {
      if (h.getId() == null) continue;
      const idx = this.historicosDaVerbaDoValorPago.indexOf(h);
      if (idx >= 0) this.historicosDaVerbaDoValorPago.splice(idx, 1);
    }
  }

  // ── Vale-transporte ──

  adicionarValesVinculadosAtravesDoValorDevido(vales: Iterable<ValeTransporteDaVerba>): void {
    this.valesTransportesDoValorDevido = [];
    for (const v of vales) {
      v.setVerbaDeCalculo(this);
      this.valesTransportesDoValorDevido.push(v);
    }
  }

  removerDosValesDaVerbaDoValorDevido(vales: Iterable<ValeTransporteDaVerba>): void {
    for (const v of vales) {
      if (v.getId() == null) continue;
      const idx = this.valesTransportesDoValorDevido.indexOf(v);
      if (idx >= 0) this.valesTransportesDoValorDevido.splice(idx, 1);
    }
  }

  adicionarValesVinculadosAtravesDoValorPago(vales: Iterable<ValeTransporteDaVerba>): void {
    this.valesTransportesDoValorPago = [];
    for (const v of vales) {
      v.setVerbaDeCalculo(this);
      this.valesTransportesDoValorPago.push(v);
    }
  }

  removerDosValesDaVerbaDoValorPago(vales: Iterable<ValeTransporteDaVerba>): void {
    for (const v of vales) {
      if (v.getId() == null) continue;
      const idx = this.valesTransportesDoValorPago.indexOf(v);
      if (idx >= 0) this.valesTransportesDoValorPago.splice(idx, 1);
    }
  }
}
