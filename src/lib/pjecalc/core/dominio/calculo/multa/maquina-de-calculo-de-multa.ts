/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDeMulta
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.MaquinaDeCalculoDeMulta
 *
 * Ref Java: pjecalc-fonte/.../calculo/multa/MaquinaDeCalculoDeMulta.java (~119 linhas)
 *
 * Fluxo liquidar():
 *   INFORMADO:
 *     - Determina indice monetario (trabalhista do Calculo ou Multa.outroIndice)
 *     - Se dataVencimento < dataLiquidacao: TabelaDeCorrecaoMonetaria carregada
 *       no período [vencimento, liquidacao] e aplica obterValorAcumuladoDoIndice.
 *     - Caso contrario, indice = 1.
 *   CALCULADO:
 *     - dataVencimentoMulta = dataLiquidacao; indiceCorrecaoMulta = 1
 *     - Base conforme tipoBaseMulta:
 *       VALOR_CAUSA: Processo.valorDaCausa * fator ajuizamento→liquidacao
 *       PRINCIPAL[+PCS][+PCP]: principal - descontoCS - descontoPP
 *     - valorMulta = baseMulta * aliquota%
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../../base/comum/helper-date';
import { Periodo } from '../../../base/comum/periodo';
import { arredondarValorMonetario, multiplicar, naoNulo, obterPercentualPara } from '../../../base/comum/utils';
import {
  BaseParaApuracaoDeMultaEnum,
  OpcaoDeIndiceDeCorrecaoEnum,
  TipoValorEnum,
} from '../../../constantes/enums';
import { TabelaDeCorrecaoMonetaria, type ITabelaCorrecaoContext } from '../../verbacalculo/tabela-de-correcao-monetaria';
import type { Calculo } from '../calculo';
import type { Multa } from './multa';

const UM = new Decimal(1);
const ZERO = new Decimal(0);

export class MaquinaDeCalculoDeMulta {
  private multa: Multa;

  constructor(multa: Multa) {
    this.multa = multa;
  }

  getMulta(): Multa { return this.multa; }
  setMulta(m: Multa): void { this.multa = m; }

  /** liquidar (Java linha 27). */
  liquidar(): void {
    const calculo = this.multa.getCalculo();
    if (!calculo) return;

    const tipoValor = this.multa.getTipoValorDaMulta();
    switch (tipoValor) {
      case TipoValorEnum.INFORMADO: {
        const usaIndiceTrabalhista =
          this.multa.getOpcaoIndiceDeCorrecaoDaMulta() === OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA;
        let indiceMonetario = calculo.getAtualizacaoMonetaria();
        if (!usaIndiceTrabalhista && naoNulo(this.multa.getOutroIndiceDeCorrecaoDaMulta())) {
          indiceMonetario = this.multa.getOutroIndiceDeCorrecaoDaMulta()!;
        }
        const dataVenc = this.multa.getDataVencimentoMulta();
        const dataLiq = calculo.getDataDeLiquidacao();
        if (naoNulo(dataVenc) && HelperDate.dateBefore(dataVenc as Date, dataLiq)) {
          const ctx = this.buildTabelaContext(calculo);
          const tabela = new TabelaDeCorrecaoMonetaria(
            ctx,
            indiceMonetario,
            calculo.getIndicesAcumulados(),
            calculo.getIgnorarTaxaCorrecaoNegativa(),
            null,
            usaIndiceTrabalhista,
          );
          const periodo = new Periodo(dataVenc as Date, dataLiq);
          tabela.setOrigemCalculo(true);
          tabela.carregarTabela(periodo);
          tabela.marcaInicioFixoMesVencimento();
          this.multa.setIndiceCorrecaoMulta(tabela.obterValorAcumuladoDoIndice(dataVenc as Date));
          break;
        }
        this.multa.setIndiceCorrecaoMulta(UM);
        break;
      }

      case TipoValorEnum.CALCULADO: {
        this.multa.setDataVencimentoMulta(calculo.getDataDeLiquidacao());
        const { baseMulta } = this.calcularBaseCalculado(calculo);
        this.multa.setBaseMulta(baseMulta);
        const aliquotaMulta = this.multa.getAliquotaMulta() ?? ZERO;
        const percentual = obterPercentualPara(aliquotaMulta) ?? ZERO;
        this.multa.setValorMulta(baseMulta.times(percentual));
        this.multa.setIndiceCorrecaoMulta(UM);
        break;
      }
    }
  }

  /**
   * calcularBaseCalculado — Java linhas 57-92 (switch tipoBaseMulta).
   *
   * Para componentes ainda sem acessor direto em Calculo (FGTS totais,
   * contribuicao social segurado etc.), usa duck-typing com fallback ZERO
   * e marca TODO para quando a cadeia estiver completa.
   */
  private calcularBaseCalculado(calculo: Calculo): { baseMulta: Decimal } {
    const tipoBase = this.multa.getTipoBaseMulta();
    let baseMulta = ZERO;

    if (tipoBase === BaseParaApuracaoDeMultaEnum.VALOR_CAUSA) {
      const processo = calculo.getProcesso() as { getValorDaCausa?(): Decimal | null } | null;
      const valorDaCausa = processo?.getValorDaCausa?.() ?? null;
      if (valorDaCausa) {
        const fator = this.obterIndiceDeCorrecaoParaValorDaCausa(calculo);
        baseMulta = arredondarValorMonetario(multiplicar(valorDaCausa, fator)) ?? ZERO;
      }
      return { baseMulta };
    }

    // Ramos PRINCIPAL*: calculam descontos primeiro (fall-through no Java)
    let descontoDePrevidenciaPrivada = ZERO;
    let descontoDeContribuicaoSocial = ZERO;

    if (tipoBase === BaseParaApuracaoDeMultaEnum.PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA) {
      const pp = calculo.getPrevidenciaPrivada() as { getTotalDoDevidoCorrigido?(): Decimal | null } | null;
      descontoDePrevidenciaPrivada = pp?.getTotalDoDevidoCorrigido?.() ?? ZERO;
    }

    if (
      tipoBase === BaseParaApuracaoDeMultaEnum.PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL ||
      tipoBase === BaseParaApuracaoDeMultaEnum.PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA
    ) {
      const inss = calculo.getInss() as {
        getInssSobreSalariosDevidos?(): {
          getApurarInssSegurado?(): boolean;
          getCobrarInssDoReclamante?(): boolean;
          getValorTotalInssSeguradoReclamante?(): Decimal | null;
        } | null;
      } | null;
      const devidos = inss?.getInssSobreSalariosDevidos?.() ?? null;
      if (devidos?.getApurarInssSegurado?.() && devidos?.getCobrarInssDoReclamante?.()) {
        const valor = devidos.getValorTotalInssSeguradoReclamante?.() ?? ZERO;
        descontoDeContribuicaoSocial = arredondarValorMonetario(valor) ?? ZERO;
      }
    }

    // Todos os ramos PRINCIPAL* calculam principal.
    // Java linhas 73-88: principal = totalCorrigidoApuracaoJuros +
    // totalJurosApuracaoJuros + FGTS (se comporPrincipal) + salarioFamilia
    // + seguroDesemprego. Aqui usamos duck-typing com fallback ZERO.
    const calcRef = calculo as unknown as {
      getTotalDeValorCorrigidoDaApuracaoDeJuros?(): Decimal | null;
      getTotalDeJurosDaApuracaoDeJuros?(): Decimal | null;
    };
    let principal = (calcRef.getTotalDeValorCorrigidoDaApuracaoDeJuros?.() ?? ZERO).plus(
      calcRef.getTotalDeJurosDaApuracaoDeJuros?.() ?? ZERO,
    );

    const fgts = calculo.getFgts() as {
      isComporOPrincipal?(): boolean;
      getTotalDoFgts?(tipo?: unknown): Decimal | null;
      getTotalDaMultaDoFgts?(): Decimal | null;
      getTotalDaMultaDoArtigo467?(): Decimal | null;
      getDeduzirDoFGTS?(): boolean;
      getTotalGeralDoDepositadoOuSacado?(tipo?: unknown): Decimal | null;
    } | null;
    if (fgts?.isComporOPrincipal?.()) {
      principal = principal
        .plus(fgts.getTotalDoFgts?.('PELA_DATA_DE_LIQUIDACAO') ?? ZERO)
        .plus(fgts.getTotalDaMultaDoFgts?.() ?? ZERO)
        .plus(fgts.getTotalDaMultaDoArtigo467?.() ?? ZERO);
      if (fgts.getDeduzirDoFGTS?.()) {
        principal = principal.minus(fgts.getTotalGeralDoDepositadoOuSacado?.('PELA_DATA_DE_LIQUIDACAO') ?? ZERO);
      }
    }

    const salFam = calculo.getSalarioFamilia() as {
      getApurarSalarioFamilia?(): boolean | null;
      isComporOPrincipal?(): boolean;
      getTotalGeral?(): Decimal | null;
    } | null;
    if (salFam?.getApurarSalarioFamilia?.() === true && salFam.isComporOPrincipal?.()) {
      principal = principal.plus(salFam.getTotalGeral?.() ?? ZERO);
    }

    const segDes = calculo.getSeguroDesemprego() as {
      getApurarSeguroDesemprego?(): boolean | null;
      isComporOPrincipal?(): boolean;
      getTotal?(): Decimal | null;
    } | null;
    if (segDes?.getApurarSeguroDesemprego?.() === true && segDes.isComporOPrincipal?.()) {
      principal = principal.plus(segDes.getTotal?.() ?? ZERO);
    }

    baseMulta = principal.minus(descontoDeContribuicaoSocial).minus(descontoDePrevidenciaPrivada);
    return { baseMulta };
  }

  /** obterIndiceDeCorrecaoParaValorDaCausa — Java linha 101. */
  private obterIndiceDeCorrecaoParaValorDaCausa(calculo: Calculo): Decimal {
    const ctx = this.buildTabelaContext(calculo);
    const tabela = new TabelaDeCorrecaoMonetaria(
      ctx,
      calculo.getAtualizacaoMonetaria(),
      calculo.getIndicesAcumulados(),
      calculo.getIgnorarTaxaCorrecaoNegativa(),
    );
    const periodo = new Periodo(calculo.getDataAjuizamento(), calculo.getDataDeLiquidacao());
    tabela.setOrigemCalculo(true);
    tabela.carregarTabela(periodo);
    return tabela.obterValorAcumuladoDoIndice(calculo.getDataAjuizamento());
  }

  private buildTabelaContext(calculo: Calculo): ITabelaCorrecaoContext {
    const calcRef = calculo as unknown as { getDataDemissao?(): Date };
    return {
      getDataDeLiquidacao: () => calculo.getDataDeLiquidacao(),
      getDataDemissao: () => calcRef.getDataDemissao?.() ?? calculo.getDataDeLiquidacao(),
    };
  }
}
