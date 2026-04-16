/**
 * Porte parcial de IndicePrecatorio.java (263 linhas).
 *
 * Lógica de índices de correção aplicados a precatórios, incluindo:
 *   - Transição TR → IPCA-E (09/12/2009)
 *   - Índices históricos ORTN/OTN/IPC/BTN/INPC/UFIR/TR/IPCA-E/SELIC
 *   - EC 136/2025 (tabela única federal a partir de data específica)
 *   - Período de graça (prazo até 30/06 do ano seguinte ao trânsito)
 *
 * STATUS: estrutura portada + método montarCombinacaoDeIndicesDeCorrecaoPrecatorioSIP
 * (que não depende de lookup de índices). Métodos que recalculam os índices
 * (encontrarIndiceCorrecaoPrecatorioSIP, etc.) ficam como STUB pois dependem
 * de IndiceTR/IndiceIPCAE (Fase 4).
 *
 * Ref: pjecalc-fonte/.../dominio/calculo/atualizacao/IndicePrecatorio.java
 */
import Decimal from 'decimal.js';
import { Periodo } from '../../../base/comum/periodo';
import { HelperDate } from '../../../base/comum/helper-date';
import { ServicoAtualizacaoUtils } from './servico-atualizacao-utils';

/** Grupo da esfera do precatório (federal vs estadual/municipal). */
export enum GrupoEsferaPrecatorioEnum {
  FEDERAL = 'FED',
  ESTADUAL_MUNICIPAL = 'EM',
}

export class IndicePrecatorio {
  /**
   * Porte de montarCombinacaoDeIndicesDeCorrecaoPrecatorioSIP (linha 69-142).
   *
   * Gera lista de {nome_indice → periodo} que, combinados, cobrem o período
   * de atualização total, respeitando transições históricas e período de graça.
   */
  static montarCombinacaoDeIndicesDeCorrecaoPrecatorioSIP(
    periodoAtualizacao: Periodo,
    periodoDaGraca: Periodo,
    dataInicioEC1362025: Date,
    esfera: GrupoEsferaPrecatorioEnum,
  ): Array<Record<string, Periodo>> {
    const ipcaeLabel = 'IPCA-E';
    const todosOsIndices: Array<Record<string, Periodo>> = [];

    const parse = (s: string): Date => {
      const [d, m, y] = s.split('/').map(Number);
      return new Date(y, m - 1, d);
    };

    todosOsIndices.push({ 'ORTN': new Periodo(parse('01/10/1900'), parse('28/02/1986')) });
    todosOsIndices.push({ 'OTN': new Periodo(parse('01/03/1986'), parse('31/12/1988')) });
    todosOsIndices.push({ 'IPC': new Periodo(parse('01/01/1989'), parse('28/02/1989')) });
    todosOsIndices.push({ 'BTN': new Periodo(parse('01/03/1989'), parse('28/02/1990')) });
    todosOsIndices.push({ 'IPC': new Periodo(parse('01/03/1990'), parse('28/02/1991')) });

    if (esfera === GrupoEsferaPrecatorioEnum.FEDERAL) {
      todosOsIndices.push({ 'INPC': new Periodo(parse('01/03/1991'), parse('30/11/1991')) });
      todosOsIndices.push({ [ipcaeLabel]: new Periodo(parse('01/12/1991'), parse('31/12/1991')) });
      todosOsIndices.push({ 'UFIR': new Periodo(parse('01/01/1992'), parse('31/12/2000')) });
      todosOsIndices.push({ [ipcaeLabel]: new Periodo(parse('01/01/2001'), parse('09/12/2009')) });
      todosOsIndices.push({ 'TR': new Periodo(parse('10/12/2009'), parse('31/12/2013')) });
      todosOsIndices.push({ [ipcaeLabel]: new Periodo(parse('01/01/2014'), parse('30/11/2021')) });
    } else {
      todosOsIndices.push({ 'TR': new Periodo(parse('01/03/1991'), parse('30/06/2009')) });
      todosOsIndices.push({ [ipcaeLabel]: new Periodo(parse('01/07/2009'), parse('09/12/2009')) });
      todosOsIndices.push({ 'TR': new Periodo(parse('10/12/2009'), parse('25/03/2015')) });
      todosOsIndices.push({ [ipcaeLabel]: new Periodo(parse('26/03/2015'), parse('30/11/2021')) });
    }
    todosOsIndices.push({ 'SELIC Simples': new Periodo(parse('01/12/2021'), parse('31/12/2999')) });

    const inicio = periodoAtualizacao.getInicial();
    const fim = periodoAtualizacao.getFinal();
    const periodoDaGracaRelativo = ServicoAtualizacaoUtils.montarPeriodoDaGracaRelativo(
      periodoAtualizacao, periodoDaGraca,
    );

    // Aplica EC 136/2025 (corta o índice no ponto de início)
    const todosOsIndicesComEC: Array<Record<string, Periodo>> = [];
    const periodoEC = { 'Tabela EC 136/2025': new Periodo(dataInicioEC1362025, parse('31/12/2999')) };
    for (const map of todosOsIndices) {
      const periodoIndice = Object.values(map)[0];
      if (periodoIndice.isPeriodoContemEsta(dataInicioEC1362025)) {
        if (HelperDate.dateEquals(dataInicioEC1362025, periodoIndice.getInicial())) {
          todosOsIndicesComEC.push(periodoEC);
          break;
        }
        periodoIndice.setFinal(HelperDate.getInstance(dataInicioEC1362025)!.addDay(-1).getDate());
        todosOsIndicesComEC.push(map);
        todosOsIndicesComEC.push(periodoEC);
        break;
      }
      todosOsIndicesComEC.push(map);
    }

    // Recorta cada índice pelo período de atualização
    const indicesCombinados: Array<Record<string, Periodo>> = [];
    for (const mapInd of todosOsIndicesComEC) {
      const [indiceNome, indicePeriodo] = Object.entries(mapInd)[0];
      const inicioEntre = HelperDate.getInstance(inicio)!.between(indicePeriodo.getInicial(), indicePeriodo.getFinal());
      const fimEntre = HelperDate.getInstance(fim)!.between(indicePeriodo.getInicial(), indicePeriodo.getFinal());

      if (inicioEntre && fimEntre) {
        IndicePrecatorio.adicionarPeriodoIndiceConsiderandoPeriodoDaGraca(
          indicesCombinados, { [indiceNome]: new Periodo(inicio, fim) }, periodoDaGracaRelativo,
        );
      } else if (inicioEntre) {
        IndicePrecatorio.adicionarPeriodoIndiceConsiderandoPeriodoDaGraca(
          indicesCombinados, { [indiceNome]: new Periodo(inicio, indicePeriodo.getFinal()) }, periodoDaGracaRelativo,
        );
      } else if (fimEntre) {
        IndicePrecatorio.adicionarPeriodoIndiceConsiderandoPeriodoDaGraca(
          indicesCombinados, { [indiceNome]: new Periodo(indicePeriodo.getInicial(), fim) }, periodoDaGracaRelativo,
        );
      } else if (HelperDate.dateBefore(inicio, indicePeriodo.getInicial())
                 && HelperDate.dateAfter(fim, indicePeriodo.getFinal())) {
        IndicePrecatorio.adicionarPeriodoIndiceConsiderandoPeriodoDaGraca(
          indicesCombinados, { [indiceNome]: indicePeriodo }, periodoDaGracaRelativo,
        );
      }
    }

    // Adiciona período de graça (IPCA-E ou Tabela EC 136/2025)
    if (HelperDate.dateBeforeOrEquals(periodoDaGracaRelativo.getInicial(), fim)) {
      if (HelperDate.dateAfter(dataInicioEC1362025, periodoDaGracaRelativo.getInicial())
          && HelperDate.dateBeforeOrEquals(dataInicioEC1362025, periodoDaGracaRelativo.getFinal())) {
        const p1 = new Periodo(
          periodoDaGracaRelativo.getInicial(),
          HelperDate.getInstance(dataInicioEC1362025)!.addDay(-1).getDate(),
        );
        const p2 = new Periodo(dataInicioEC1362025, periodoDaGracaRelativo.getFinal());
        indicesCombinados.push({ 'IPCA-E (Período da Graça)': p1 });
        indicesCombinados.push({ 'Tabela EC 136/2025 (Período da Graça)': p2 });
      } else if (HelperDate.dateAfter(dataInicioEC1362025, periodoDaGracaRelativo.getFinal())) {
        indicesCombinados.push({ 'IPCA-E (Período da Graça)': periodoDaGracaRelativo });
      } else {
        indicesCombinados.push({ 'Tabela EC 136/2025 (Período da Graça)': periodoDaGracaRelativo });
      }
    }

    IndicePrecatorio.ordenarIndicesCombinados(indicesCombinados);
    return indicesCombinados;
  }

  private static ordenarIndicesCombinados(indicesCombinados: Array<Record<string, Periodo>>): void {
    indicesCombinados.sort((a, b) => {
      const aDt = Object.values(a)[0].getInicial();
      const bDt = Object.values(b)[0].getInicial();
      return aDt.getTime() - bDt.getTime();
    });
  }

  /**
   * adicionarPeriodoIndiceConsiderandoPeriodoDaGraca (linha 152-175).
   * Subdivide um índice em sub-períodos quando o período de graça intersecciona.
   */
  private static adicionarPeriodoIndiceConsiderandoPeriodoDaGraca(
    indices: Array<Record<string, Periodo>>,
    paraIncluir: Record<string, Periodo>,
    periodoDaGraca: Periodo,
  ): void {
    const nome = Object.keys(paraIncluir)[0];
    const periodo = Object.values(paraIncluir)[0];
    let inicioPGForaDoPeriodo = false;
    let finalPGForaDoPeriodo = false;

    if (HelperDate.getInstance(periodoDaGraca.getInicial())!.between(periodo.getInicial(), periodo.getFinal())) {
      if (HelperDate.dateAfter(periodoDaGraca.getInicial(), periodo.getInicial())) {
        indices.push({
          [nome]: new Periodo(
            periodo.getInicial(),
            HelperDate.getInstance(periodoDaGraca.getInicial())!.addDay(-1).getDate(),
          ),
        });
      }
    } else {
      inicioPGForaDoPeriodo = true;
    }

    if (HelperDate.getInstance(periodoDaGraca.getFinal())!.between(periodo.getInicial(), periodo.getFinal())) {
      if (HelperDate.dateBefore(periodoDaGraca.getFinal(), periodo.getFinal())) {
        indices.push({
          [nome]: new Periodo(
            HelperDate.getInstance(periodoDaGraca.getFinal())!.addDay(1).getDate(),
            periodo.getFinal(),
          ),
        });
      }
    } else {
      finalPGForaDoPeriodo = true;
    }

    const periodoDaGracaAbrangeTodoOPeriodoDoIndice =
      HelperDate.dateBeforeOrEquals(periodoDaGraca.getInicial(), periodo.getInicial())
      && HelperDate.dateAfterOrEquals(periodoDaGraca.getFinal(), periodo.getFinal());

    if (inicioPGForaDoPeriodo && finalPGForaDoPeriodo && !periodoDaGracaAbrangeTodoOPeriodoDoIndice) {
      indices.push(paraIncluir);
    }
  }

  /**
   * STUB: encontrarIndiceCorrecaoPrecatorioSIP (linha 178-198).
   * Requer IndiceTR, IndiceIPCAE (Fase 4). Retorna 1 por padrão.
   */
  static encontrarIndiceCorrecaoPrecatorioSIP(
    _periodoAtualizacao: Periodo,
    _periodoDaGraca: Periodo,
    _dataInicioAplicarEC1362025: Date,
    _esfera: GrupoEsferaPrecatorioEnum,
    _paraCorrecaoDeJuros: boolean,
  ): Decimal {
    // TODO: implementar quando IndiceTR/IndiceIPCAE forem portados
    return new Decimal(1);
  }
}
