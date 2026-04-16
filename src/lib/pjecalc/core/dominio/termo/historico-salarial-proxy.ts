/**
 * Porte parcial de HistoricoSalarialProxy.java (177 linhas).
 *
 * Lookup do salário histórico mensal (tabela pjecalc_hist_salarial_mes).
 * Resolve a base de cálculo a partir do histórico salarial real do reclamante.
 *
 * STATUS: stub. Implementação completa requer:
 *   - Query async no Supabase em pjecalc_hist_salarial_mes
 *   - OU cache pré-carregado no objeto Calculo (recomendado)
 *
 * Ref: pjecalc-fonte/.../dominio/termo/HistoricoSalarialProxy.java
 */
import Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';

export class HistoricoSalarialProxy implements Termo {
  private historicoSalarialId: string | null = null;

  resolverValor(parametro: ParametroDoTermo): Decimal {
    // STUB: deveria buscar pjecalc_hist_salarial_mes WHERE historico_id = X AND competencia = parametro.periodo
    // Por enquanto, delega para Calculo.getValorMaiorRemuneracao como aproximação grosseira.
    // A implementação completa exige acesso ao histórico salarial pré-carregado.
    return parametro.getValorMaiorRemuneracaoDoCalculo();
  }

  getHistoricoSalarialId(): string | null { return this.historicoSalarialId; }
  setHistoricoSalarialId(id: string | null): void { this.historicoSalarialId = id; }
}
