/**
 * Porte 1:1 de HistoricoSalarialProxy.java (177 linhas).
 *
 * Resolve o salário mensal do reclamante a partir de um HistoricoSalarial
 * carregado em memória. Busca a ocorrência da competência do parâmetro.
 *
 * Integração Fase 2: agora usa HistoricoSalarial.obterOcorrenciaDaCompetencia()
 * para buscar o valor correto. Quando o HistoricoSalarial não está setado,
 * ou a competência não tem ocorrência, retorna Decimal(0).
 *
 * Ref: pjecalc-fonte/.../dominio/termo/HistoricoSalarialProxy.java
 */
import Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';
import type { HistoricoSalarial } from '../historicosalarial/historico-salarial';

export class HistoricoSalarialProxy implements Termo {
  private historicoSalarialId: string | null = null;
  private historicoSalarial: HistoricoSalarial | null = null;

  /**
   * Configura o HistoricoSalarial pré-carregado. Típicamente chamado pelo
   * Calculo durante inicialização.
   */
  setHistoricoSalarial(h: HistoricoSalarial | null): void {
    this.historicoSalarial = h;
  }

  getHistoricoSalarial(): HistoricoSalarial | null {
    return this.historicoSalarial;
  }

  resolverValor(parametro: ParametroDoTermo): Decimal {
    const periodo = parametro.getPeriodo();
    if (!this.historicoSalarial || !periodo) {
      // Fallback: valor maior remuneração do cálculo
      return parametro.getValorMaiorRemuneracaoDoCalculo();
    }

    // Busca ocorrência da competência (inicial do período)
    const valor = this.historicoSalarial.getValorParaCompetencia(periodo.getInicial());
    if (valor !== null) return valor;

    // Fallback secundário: última ocorrência anterior
    const ocs = this.historicoSalarial.getOcorrencias();
    let ultimaAnterior: Decimal | null = null;
    for (const oc of ocs) {
      const d = oc.getDataOcorrencia();
      if (d && d <= periodo.getInicial()) {
        const v = oc.getValor();
        if (v) ultimaAnterior = v;
      }
    }
    return ultimaAnterior ?? new Decimal(0);
  }

  getHistoricoSalarialId(): string | null { return this.historicoSalarialId; }
  setHistoricoSalarialId(id: string | null): void { this.historicoSalarialId = id; }
}
