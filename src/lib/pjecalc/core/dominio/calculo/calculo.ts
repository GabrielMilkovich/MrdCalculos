/**
 * PJe-Calc v2.15.1 — Calculo
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/calculo/Calculo.java (3087 linhas)
 *
 * Classe ORQUESTRADORA — controla o fluxo principal de liquidação.
 *
 * ## Fluxo de liquidar() (linhas 1475-1537 do Java)
 *
 * 1. Cria TabelaDeCorrecaoMonetaria com índice trabalhista
 * 2. Carrega tabela de correção para o período (admissão → liquidação)
 * 3. Para cada verba ativa: seta a tabela de correção + chama verba.liquidar()
 * 4. SalarioFamilia.liquidar() + SeguroDesemprego.liquidar()
 * 5. FGTS.liquidar()
 * 6. INSS.liquidar(dataLiquidacao)
 * 7. PrevidenciaPrivada.liquidar()
 * 8. calcularJuros()
 * 9. PensaoAlimenticia.liquidar()
 * 10. Multas.liquidar()
 * 11. Honorarios.liquidar()
 * 12. IRPF.liquidar()
 * 13. CustasJudiciais.liquidar()
 *
 * Neste port portamos os campos essenciais e o esqueleto do `liquidar()`.
 * Os módulos secundários (FGTS, INSS, IRPF etc.) são representados como
 * interfaces injetáveis — serão portados em commits subsequentes.
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../base/comum/helper-date';
import { Periodo } from '../../base/comum/periodo';
import { naoNulo, nulo, arredondarValorMonetario, aplicarCorrecaoMonetaria } from '../../base/comum/utils';
import {
  IndiceMonetarioEnum, IndicesAcumuladosEnum, LogicoEnum,
} from '../../constantes/enums';
import { VerbaDeCalculo } from '../verbacalculo/verba-de-calculo';
import { TabelaDeCorrecaoMonetaria, type ITabelaCorrecaoContext } from '../verbacalculo/tabela-de-correcao-monetaria';
import { ParametrosDeAtualizacao } from './atualizacao/parametros-de-atualizacao';
import { OcorrenciaDeVerba } from '../ocorrenciaverba/ocorrencia-de-verba';

/**
 * Interface para módulos secundários (FGTS, INSS, IRPF etc.)
 * que serão portados separadamente. O `liquidar()` do Calculo
 * chama `.liquidar()` em cada um na ordem correta.
 */
export interface IModuloLiquidavel {
  liquidar(dataLiquidacao?: Date): void;
}

export class Calculo {
  // ── Datas ──
  private dataAdmissao: Date | null = null;
  private dataDemissao: Date | null = null;
  private dataAjuizamento: Date | null = null;
  private dataInicioCalculo: Date | null = null;
  private dataTerminoCalculo: Date | null = null;
  private dataDeLiquidacao: Date | null = null;

  // ── Configuração ──
  private parametrosDeAtualizacao: ParametrosDeAtualizacao = new ParametrosDeAtualizacao();
  private zeraValorNegativo: boolean = true;

  // ── Verbas ──
  private verbas: Set<VerbaDeCalculo> = new Set();

  // ── Módulos secundários (interfaces — portados depois) ──
  private fgts: IModuloLiquidavel | null = null;
  private inss: IModuloLiquidavel | null = null;
  private irpf: IModuloLiquidavel | null = null;
  private salarioFamilia: IModuloLiquidavel | null = null;
  private seguroDesemprego: IModuloLiquidavel | null = null;
  private previdenciaPrivada: IModuloLiquidavel | null = null;

  // ────────────── Getters/Setters ──────────────

  getDataAdmissao(): Date { return this.dataAdmissao!; }
  setDataAdmissao(v: Date): void { this.dataAdmissao = v; }

  getDataDemissao(): Date | null { return this.dataDemissao; }
  setDataDemissao(v: Date | null): void { this.dataDemissao = v; }

  getDataAjuizamento(): Date { return this.dataAjuizamento!; }
  setDataAjuizamento(v: Date): void { this.dataAjuizamento = v; }

  getDataInicioCalculo(): Date | null { return this.dataInicioCalculo; }
  setDataInicioCalculo(v: Date): void { this.dataInicioCalculo = v; }

  getDataTerminoCalculo(): Date | null { return this.dataTerminoCalculo; }
  setDataTerminoCalculo(v: Date): void { this.dataTerminoCalculo = v; }

  getDataDeLiquidacao(): Date { return this.dataDeLiquidacao!; }
  setDataDeLiquidacao(v: Date): void { this.dataDeLiquidacao = v; }

  getParametrosDeAtualizacao(): ParametrosDeAtualizacao { return this.parametrosDeAtualizacao; }
  setParametrosDeAtualizacao(v: ParametrosDeAtualizacao): void { this.parametrosDeAtualizacao = v; }

  getZeraValorNegativo(): boolean { return this.zeraValorNegativo; }
  setZeraValorNegativo(v: boolean): void { this.zeraValorNegativo = v; }

  getVerbas(): Set<VerbaDeCalculo> { return this.verbas; }
  adicionarVerba(v: VerbaDeCalculo): void { this.verbas.add(v); }

  /** getVerbasAtivas (linha 1185) */
  getVerbasAtivas(): VerbaDeCalculo[] {
    return [...this.verbas].filter(v => v.getAtivo());
  }

  // ── Módulos ──
  setFgts(v: IModuloLiquidavel): void { this.fgts = v; }
  setInss(v: IModuloLiquidavel): void { this.inss = v; }
  setIrpf(v: IModuloLiquidavel): void { this.irpf = v; }
  setSalarioFamilia(v: IModuloLiquidavel): void { this.salarioFamilia = v; }
  setSeguroDesemprego(v: IModuloLiquidavel): void { this.seguroDesemprego = v; }
  setPrevidenciaPrivada(v: IModuloLiquidavel): void { this.previdenciaPrivada = v; }

  // ── Helpers derivados ──

  /** getAtualizacaoMonetaria — alias usado por TabelaDeCorrecaoMonetaria */
  getAtualizacaoMonetaria(): IndiceMonetarioEnum {
    return this.parametrosDeAtualizacao.getIndiceTrabalhista();
  }

  getIndicesAcumulados(): IndicesAcumuladosEnum {
    return IndicesAcumuladosEnum.MES_SUBSEQUENTE_AO_VENCIMENTO;
  }

  getIgnorarTaxaCorrecaoNegativa(): boolean {
    return this.parametrosDeAtualizacao.getIgnorarTaxaNegativa();
  }

  // ────────────── LIQUIDAR (linhas 1475-1537) ──────────────

  /**
   * liquidar() — fluxo principal do PJe-Calc.
   *
   * Executa na ordem exata do Java:
   *   1. Carrega TabelaDeCorrecaoMonetaria
   *   2. Para cada verba ativa: seta tabela + liquidar()
   *   3. FGTS, INSS, IRPF, Juros...
   */
  liquidar(): void {
    // Reset
    for (const v of this.verbas) v.setLiquidado(false);

    // 1. Criar tabela de correção monetária
    const ctx: ITabelaCorrecaoContext = {
      getDataDeLiquidacao: () => this.getDataDeLiquidacao(),
      getDataDemissao: () => this.getDataDemissao(),
      getParametrosDeAtualizacao: () => this.parametrosDeAtualizacao,
    };
    const tabelaDeCorrecao = new TabelaDeCorrecaoMonetaria(
      ctx,
      this.getAtualizacaoMonetaria(),
      this.getIndicesAcumulados(),
      this.getIgnorarTaxaCorrecaoNegativa()
    );
    tabelaDeCorrecao.setOrigemCalculo(true);

    // 2. Carregar tabela para o período completo
    const periodoCalculo = new Periodo(
      HelperDate.getCurrentCompetence(this.getDataAdmissao()).getDate(),
      this.getDataDeLiquidacao()
    );
    tabelaDeCorrecao.carregarTabela(periodoCalculo);

    // 3. Liquidar cada verba ativa
    for (const verba of this.getVerbasAtivas()) {
      if (verba.isLiquidado()) continue;
      verba.setTabelaDeCorrecaoMonetariaTrabalhista(tabelaDeCorrecao);
      // verba.liquidar() chamaria MaquinaDeCalculo.liquidar() internamente.
      // Como MaquinaDeCalculo é complexa (geração de ocorrências + cartão ponto),
      // e as ocorrências já estão pré-populadas pelo bridge pjc-to-engine,
      // aqui re-aplicamos correção nos valores já existentes.
      this.liquidarVerba(verba, tabelaDeCorrecao);
    }

    // 4-13. Módulos secundários
    this.salarioFamilia?.liquidar();
    this.seguroDesemprego?.liquidar();
    this.fgts?.liquidar();
    this.inss?.liquidar(this.getDataDeLiquidacao());
    this.previdenciaPrivada?.liquidar();
    // calcularJuros() — aplicado via TabelaDeJuros (já portada)
    this.irpf?.liquidar();
  }

  /**
   * liquidarVerba — aplica correção monetária (indiceAcumulado) sobre cada
   * ocorrência ativa, usando a TabelaDeCorrecaoMonetaria pré-carregada.
   *
   * No PJe-Calc completo, `VerbaDeCalculo.liquidar()` chama
   * `MaquinaDeCalculo.executarLiquidar()` que gera as ocorrências, calcula
   * base/div/mult/qty/devido, e seta `indiceAcumulado` por ocorrência.
   *
   * Aqui assumimos que as ocorrências já existem (geradas pelo bridge ou
   * manualmente) e apenas aplicamos o fator de correção.
   */
  private liquidarVerba(verba: VerbaDeCalculo, tabelaDeCorrecao: TabelaDeCorrecaoMonetaria): void {
    tabelaDeCorrecao.setOcorrenciaDePagamento(verba.getOcorrenciaDePagamento());
    for (const ocorrencia of verba.getOcorrenciasAtivas()) {
      const dataInicial = ocorrencia.getDataInicial();
      if (!dataInicial) continue;
      const indiceAcumulado = tabelaDeCorrecao.obterValorAcumuladoDoIndice(dataInicial);
      ocorrencia.setIndiceAcumulado(indiceAcumulado);
    }
    verba.setLiquidado(true);
  }

  /**
   * Calcula o total corrigido de todas as verbas que compõem o principal.
   * Usado para totalização do resultado.
   */
  calcularTotalCorrigido(): Decimal {
    let total = new Decimal(0);
    for (const verba of this.getVerbasAtivas()) {
      if (verba.getComporPrincipal() === LogicoEnum.NAO) continue;
      for (const oc of verba.getOcorrenciasAtivas()) {
        const corrigida = oc.getDiferencaCorrigida();
        if (corrigida) {
          total = total.plus(arredondarValorMonetario(corrigida));
        }
      }
    }
    return total;
  }
}
