/**
 * Porte parcial de SalarioDaCategoriaProxy.java (90 linhas).
 *
 * Lookup do salário normativo da categoria sindical na competência.
 * Tabela: pjecalc_salario_categoria_ocorrencia.
 *
 * STATUS: stub. Requer acesso à tabela do Supabase.
 *
 * Ref: pjecalc-fonte/.../dominio/termo/SalarioDaCategoriaProxy.java
 */
import Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';

export class SalarioDaCategoriaProxy implements Termo {
  private salarioCategoriaId: string | null = null;

  resolverValor(_parametro: ParametroDoTermo): Decimal {
    // STUB: precisa buscar salario_categoria_ocorrencia WHERE categoria_id = X AND vigente_de <= competencia
    return new Decimal(0);
  }

  getSalarioCategoriaId(): string | null { return this.salarioCategoriaId; }
  setSalarioCategoriaId(id: string | null): void { this.salarioCategoriaId = id; }
}
