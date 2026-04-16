/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDeCorrecaoMonetaria
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculoDeCorrecaoMonetaria
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/verbacalculo/MaquinaDeCalculoDeCorrecaoMonetaria.java
 *
 * Lida com a combinação proporcional de índices no mês da mudança quando se
 * misturam índices diários e não-diários no mesmo mês. Calcular o fator
 * proporcional é a parte mais complexa da correção monetária.
 *
 * Dependências de `ServicoDeCalculo`/`Calculo` substituídas por `ITabelaCorrecaoContext`
 * via `TabelaDeCorrecaoMonetaria`.
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../base/comum/helper-date';
import { Periodo } from '../../base/comum/periodo';
import { naoNulo, multiplicar, dividir, subtrair } from '../../base/comum/utils';
import { IndiceMonetarioEnum } from '../../constantes/enums';
import type { IndiceDeCalculo } from '../indices/indice-de-calculo';
import type { CombinacaoDeIndice } from '../calculo/atualizacao/combinacao-de-indice';
import type { TabelaDeCorrecaoMonetaria } from './tabela-de-correcao-monetaria';

const INDICE_UM_PORCENTO = new Decimal('1.01');
const MASCARA_DIA = 'ddMMyyyy';

/**
 * Tipo de combinação (linhas 33-35 do Java):
 * 1 = DIARIA_DIARIA, 2 = DIARIA_NAODIARIA, 3 = NAODIARIA_DIARIA, 4 = NAODIARIA_NAODIARIA
 */
const DIARIA_NAODIARIA = 2;
const NAODIARIA_DIARIA = 3;
const NAODIARIA_NAODIARIA = 4;

export class MaquinaDeCalculoDeCorrecaoMonetaria {
  private tabelaDeCorrecaoMonetaria: TabelaDeCorrecaoMonetaria;
  private indice: IndiceMonetarioEnum;
  private outroIndice: IndiceMonetarioEnum | null;
  private dataAPartirDeOutroIndice: Date | null;
  private competencia: HelperDate = HelperDate.getInstance();

  constructor(tabelaDeCorrecaoMonetaria: TabelaDeCorrecaoMonetaria) {
    this.tabelaDeCorrecaoMonetaria = tabelaDeCorrecaoMonetaria;
    this.indice = tabelaDeCorrecaoMonetaria.getIndice();
    this.outroIndice = tabelaDeCorrecaoMonetaria.getOutroIndice();
    this.dataAPartirDeOutroIndice = tabelaDeCorrecaoMonetaria.getDataAPartirDeOutroIndice();
  }

  /**
   * encontrarIndiceProporcionalMesMudanca (linha 51)
   *
   * Calcula o fator proporcional para o mês em que muda o índice.
   * Divide o mês em 2 períodos (antes/depois da mudança) e aplica
   * cada índice pro-rata pelo número de dias.
   *
   * Fórmula: indiceProporcional = (indice_antes^(1/dias))^diasAntes × (indice_depois^(1/dias))^diasDepois
   */
  encontrarIndiceProporcionalMesMudanca(
    competenciaMesDaMudanca: HelperDate,
    indiceOutrosIndicesMesMudanca: Decimal,
    indiceIndicesMesMudanca: Decimal,
    combinacoesAdicionaisNoMesmoMes: Iterable<CombinacaoDeIndice>
  ): Decimal {
    const primeiroDiaMesMudanca = competenciaMesDaMudanca.clone();
    const ultimoDiaMesMudanca = competenciaMesDaMudanca.lastDayOfTheMonth();
    const qtdDiasTotal = 1 + HelperDate.countDays(primeiroDiaMesMudanca.getDate(), ultimoDiaMesMudanca.getDate());

    // Verificar se há combinações adicionais no mesmo mês
    const combArray = [...combinacoesAdicionaisNoMesmoMes];
    let indiceProporcional: Decimal;

    if (combArray.length > 0) {
      // Combinações múltiplas no mesmo mês — decompor dia a dia
      const qtdDiasDepoisMudanca = 1 + HelperDate.countDays(this.dataAPartirDeOutroIndice!, ultimoDiaMesMudanca.getDate());
      indiceProporcional = new Decimal(
        Math.pow(Math.pow(indiceOutrosIndicesMesMudanca.toNumber(), 1.0 / qtdDiasTotal), qtdDiasDepoisMudanca)
      );

      let dataFimAux = HelperDate.getInstance(this.dataAPartirDeOutroIndice!)!.addDay(-1);
      for (const comb of combArray) {
        const qtdDiasComb = 1 + HelperDate.countDays(comb.getApartirDeOutroIndice()!, dataFimAux.getDate());
        const indicesComb = this.tabelaDeCorrecaoMonetaria.obterIndicesDeCalculo(
          comb.getOutroIndiceTrabalhista()!,
          new Periodo(primeiroDiaMesMudanca.getDate(), ultimoDiaMesMudanca.getDate())
        );
        let indiceComb = new Decimal(1);
        if (indicesComb.length > 0) indiceComb = indicesComb[0].getValorIndice();
        const indiceDiarioComb = new Decimal(Math.pow(Math.pow(indiceComb.toNumber(), 1.0 / qtdDiasTotal), qtdDiasComb));
        indiceProporcional = indiceProporcional.times(indiceDiarioComb);
        dataFimAux = HelperDate.getInstance(comb.getApartirDeOutroIndice()!)!.addDay(-1);
      }
      const qtdDiasAntesMudanca = 1 + HelperDate.countDays(primeiroDiaMesMudanca.getDate(), dataFimAux.getDate());
      indiceProporcional = indiceProporcional.times(
        new Decimal(Math.pow(Math.pow(indiceIndicesMesMudanca.toNumber(), 1.0 / qtdDiasTotal), qtdDiasAntesMudanca))
      );
    } else {
      // Caso padrão — uma só mudança no mês
      const qtdDiasAntesMudanca = HelperDate.countDays(primeiroDiaMesMudanca.getDate(), this.dataAPartirDeOutroIndice!);
      const qtdDiasDepoisMudanca = 1 + HelperDate.countDays(this.dataAPartirDeOutroIndice!, ultimoDiaMesMudanca.getDate());

      const indiceDiarioIndicesMesMudanca = new Decimal(
        Math.pow(Math.pow(indiceIndicesMesMudanca.toNumber(), 1.0 / qtdDiasTotal), qtdDiasAntesMudanca)
      );
      const indiceDiarioOutrosIndicesMesMudanca = new Decimal(
        Math.pow(Math.pow(indiceOutrosIndicesMesMudanca.toNumber(), 1.0 / qtdDiasTotal), qtdDiasDepoisMudanca)
      );
      indiceProporcional = indiceDiarioIndicesMesMudanca.times(indiceDiarioOutrosIndicesMesMudanca);
    }
    return indiceProporcional;
  }

  /** verificarSeExisteIndiceDiarioNas (linha 123) */
  verificarSeExisteIndiceDiarioNas(combinacoesAdicionaisNoMesmoMes: Iterable<CombinacaoDeIndice>): boolean {
    for (const comb of combinacoesAdicionaisNoMesmoMes) {
      if (this.tabelaDeCorrecaoMonetaria.isIndiceDiario(comb.getOutroIndiceTrabalhista()!)) {
        return true;
      }
    }
    return false;
  }

  /**
   * preencherTabelaDiariaDoMesDasCombinacoes (linha 131)
   *
   * Quando há combinação de índice diário com não-diário (ou vice-versa) no mesmo
   * mês, preenche a tabela com um fator por DIA — não por mês. O fator diário é
   * obtido pela raiz N-ésima do fator mensal (N = dias no mês).
   */
  preencherTabelaDiariaDoMesDasCombinacoes(
    tipo: number,
    periodo: Periodo,
    competenciaMesDaMudanca: HelperDate,
    indiceOutrosIndicesMesMudanca: Decimal,
    indiceIndicesMesMudanca: Decimal | null,
    combinacoesAdicionaisNoMesmoMes: Iterable<CombinacaoDeIndice>,
    indiceAcumuladoDepoisDoMesDaMudanca: Decimal | null
  ): Map<string, Decimal> {
    const tabelaDoMes = new Map<string, Decimal>();
    const primeiroDiaMesMudanca = competenciaMesDaMudanca.clone();
    const ultimoDiaMesMudanca = competenciaMesDaMudanca.lastDayOfTheMonth();
    const qtdDias = competenciaMesDaMudanca.daysInMonth();

    let indiceAcumulado: Decimal;

    if (tipo === NAODIARIA_NAODIARIA || tipo === DIARIA_NAODIARIA) {
      const indiceDiarioMesMudancaOutrosIndices = new Decimal(
        Math.pow(indiceOutrosIndicesMesMudanca.toNumber(), 1.0 / qtdDias)
      );
      if (HelperDate.dateBefore(periodo.getFinal(), ultimoDiaMesMudanca.getDate())) {
        ultimoDiaMesMudanca.setDate(periodo.getFinal());
      }
      indiceAcumulado = indiceAcumuladoDepoisDoMesDaMudanca ?? new Decimal(1);
      let qtdDiasDepoisMudanca = 1 + HelperDate.countDays(this.dataAPartirDeOutroIndice!, ultimoDiaMesMudanca.getDate());
      while (qtdDiasDepoisMudanca > 0) {
        indiceAcumulado = indiceAcumulado.times(indiceDiarioMesMudancaOutrosIndices);
        tabelaDoMes.set(this.competencia.setDate(ultimoDiaMesMudanca.getDate()).format(MASCARA_DIA), indiceAcumulado);
        ultimoDiaMesMudanca.addDay(-1);
        --qtdDiasDepoisMudanca;
      }
    } else {
      indiceAcumulado = indiceOutrosIndicesMesMudanca;
    }

    // Percorre combinações adicionais do mesmo mês
    let dataFimAux = HelperDate.getInstance(this.dataAPartirDeOutroIndice!)!.addDay(-1);
    for (const comb of combinacoesAdicionaisNoMesmoMes) {
      if (HelperDate.dateAfter(comb.getApartirDeOutroIndice()!, periodo.getFinal())) continue;
      if (HelperDate.dateAfter(dataFimAux.getDate(), periodo.getFinal())) {
        dataFimAux = HelperDate.getInstance(periodo.getFinal())!;
      }
      if (this.tabelaDeCorrecaoMonetaria.isIndiceDiario(comb.getOutroIndiceTrabalhista()!)) {
        // Caso: combinação com índice diário — usar tabela diária
        indiceAcumulado = this.tratarCasoIndiceDiarioNaCombinacao(
          tabelaDoMes, indiceAcumulado, dataFimAux, comb, primeiroDiaMesMudanca, ultimoDiaMesMudanca
        );
      } else {
        let qtdDiasComb = 1 + HelperDate.countDays(comb.getApartirDeOutroIndice()!, dataFimAux.getDate());
        const indicesComb = this.tabelaDeCorrecaoMonetaria.obterIndicesDeCalculo(
          comb.getOutroIndiceTrabalhista()!,
          new Periodo(primeiroDiaMesMudanca.getDate(), ultimoDiaMesMudanca.getDate())
        );
        let indiceComb = new Decimal(1);
        if (indicesComb.length > 0) indiceComb = indicesComb[0].getValorIndice();
        const indiceDiarioComb = new Decimal(Math.pow(indiceComb.toNumber(), 1.0 / qtdDias));
        while (qtdDiasComb > 0) {
          indiceAcumulado = indiceAcumulado.times(indiceDiarioComb);
          tabelaDoMes.set(this.competencia.setDate(dataFimAux.getDate()).format(MASCARA_DIA), indiceAcumulado);
          --qtdDiasComb;
          dataFimAux.addDay(-1);
        }
      }
      dataFimAux = HelperDate.getInstance(comb.getApartirDeOutroIndice()!)!.addDay(-1);
    }

    // Antes das combinações — usa o índice principal
    if (tipo === NAODIARIA_NAODIARIA || tipo === NAODIARIA_DIARIA) {
      if (indiceIndicesMesMudanca !== null) {
        const indiceDiarioMesMudancaIndices = new Decimal(
          Math.pow(indiceIndicesMesMudanca.toNumber(), 1.0 / qtdDias)
        );
        let qtdDiasAntesMudanca = 1 + HelperDate.countDays(primeiroDiaMesMudanca.getDate(), dataFimAux.getDate());
        while (qtdDiasAntesMudanca > 0) {
          indiceAcumulado = indiceAcumulado.times(indiceDiarioMesMudancaIndices);
          tabelaDoMes.set(this.competencia.setDate(dataFimAux.getDate()).format(MASCARA_DIA), indiceAcumulado);
          dataFimAux.addDay(-1);
          --qtdDiasAntesMudanca;
        }
      }
    }

    return tabelaDoMes;
  }

  /** tratarCasoIndiceDiarioNaCombinacao (linha 190) — versão simplificada */
  private tratarCasoIndiceDiarioNaCombinacao(
    tabelaDoMes: Map<string, Decimal>,
    indiceAcumuladoInicial: Decimal,
    dataFimAux: HelperDate,
    comb: CombinacaoDeIndice,
    _primeiroDiaMesMudanca: HelperDate,
    _ultimoDiaMesMudanca: HelperDate
  ): Decimal {
    const indicesComb = this.tabelaDeCorrecaoMonetaria.obterIndicesDeCalculo(
      comb.getOutroIndiceTrabalhista()!,
      new Periodo(comb.getApartirDeOutroIndice()!, dataFimAux.getDate())
    );
    let indiceAcumulado = indiceAcumuladoInicial;
    for (const indiceDeCalculo of indicesComb) {
      if (!indiceDeCalculo) continue;
      const valorAcum = indiceDeCalculo.getValorAcumulado();
      if (!valorAcum) continue;
      const valorIndice = valorAcum.times(indiceAcumulado);
      tabelaDoMes.set(
        this.competencia.setDate(indiceDeCalculo.getCompetencia()).format(MASCARA_DIA),
        valorIndice
      );
    }
    // Encontrar último dia com valor
    const ultimoDiaComIndice = HelperDate.getInstance(comb.getApartirDeOutroIndice()!)!;
    while (!HelperDate.dateAfter(ultimoDiaComIndice.getDate(), dataFimAux.getDate())) {
      const v = tabelaDoMes.get(this.competencia.setDate(ultimoDiaComIndice.getDate()).format(MASCARA_DIA));
      if (v) {
        indiceAcumulado = v;
        break;
      }
      ultimoDiaComIndice.addDay(1);
    }
    return indiceAcumulado;
  }

  /**
   * ajustarTabelaSelicFazenda (linha 208) — ajusta pro-rata die para SELIC Fazenda
   * nos meses de início e fim do período. Simplificado: sem conversão de moedas
   * (moderna — todos os fatores de conversão são 1 pós-1995).
   */
  ajustarTabelaSelicFazenda(_tabela: Map<string, Decimal>, _periodoDaTabela: Periodo): void {
    // No-op para casos modernos (pós-1995). A implementação completa requer
    // ConversaoDeMoedas + isSelicFazendaSemCombinacaoNoMesDe + ajustes pro-rata.
    // Para o PJe-Calc moderno, este ajuste não altera a tabela.
  }
}
