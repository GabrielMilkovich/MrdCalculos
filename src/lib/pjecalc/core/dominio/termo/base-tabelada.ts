/**
 * Porte parcial de BaseTabelada.java (137 linhas).
 *
 * Resolve a base tabelada (salário mínimo, maior remuneração, última remuneração,
 * salário da categoria, teto INSS, histórico salarial).
 *
 * STATUS: stub funcional. Implementação completa requer:
 *   - SalarioMinimoProxy (89 LOC) — lookup tabela pjecalc_salario_minimo
 *   - MaiorRemuneracaoProxy (24 LOC) — Calculo.getValorMaiorRemuneracao
 *   - UltimaRemuneracaoProxy (24 LOC) — Calculo.getValorUltimaRemuneracao
 *   - SalarioDaCategoriaProxy (90 LOC) — lookup pjecalc_salario_categoria_ocorrencia
 *   - HistoricoSalarialProxy (177 LOC) — lookup pjecalc_hist_salarial_mes
 *
 * Ref: pjecalc-fonte/.../dominio/termo/BaseTabelada.java
 */
import Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';
import { TipoDeBaseTabeladaEnum } from '../../constantes/enums';

export class BaseTabelada implements Termo {
  private tipo: TipoDeBaseTabeladaEnum = TipoDeBaseTabeladaEnum.HISTORICO_SALARIAL;
  private aplicarProporcionalidade: boolean = false;

  resolverValor(parametro: ParametroDoTermo): Decimal {
    if (this.tipo === TipoDeBaseTabeladaEnum.MAIOR_REMUNERACAO) {
      return parametro.getValorMaiorRemuneracaoDoCalculo();
    }
    if (this.tipo === TipoDeBaseTabeladaEnum.ULTIMA_REMUNERACAO) {
      return parametro.getValorUltimaRemuneracaoDoCalculo();
    }
    // SALARIO_MINIMO, SALARIO_DA_CATEGORIA, TETO_INSS, HISTORICO_SALARIAL: stubs
    // TODO: implementar via lookup nas tabelas Supabase respectivas.
    return new Decimal(0);
  }

  getTipo(): TipoDeBaseTabeladaEnum { return this.tipo; }
  setTipo(t: TipoDeBaseTabeladaEnum): void { this.tipo = t; }

  getAplicarProporcionalidade(): boolean { return this.aplicarProporcionalidade; }
  setAplicarProporcionalidade(v: boolean): void { this.aplicarProporcionalidade = v; }

  toString(): string { return String(this.tipo); }
}
