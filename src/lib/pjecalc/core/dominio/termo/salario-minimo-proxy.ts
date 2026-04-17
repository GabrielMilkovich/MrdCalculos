/**
 * Porte parcial de SalarioMinimoProxy.java (89 linhas).
 *
 * Lookup do salário mínimo vigente na competência do parâmetro.
 * Tabela: pjecalc_salario_minimo (28 rows no Supabase).
 *
 * STATUS: stub. Implementação requer integração assíncrona com Supabase
 * ou cache pré-carregado (recomendado).
 *
 * Ref: pjecalc-fonte/.../dominio/termo/SalarioMinimoProxy.java
 */
import Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';

/**
 * Tabela histórica do salário mínimo (Lei nº). Cache estático.
 * Atualizar conforme novas vigências.
 */
export const SALARIO_MINIMO_HISTORICO: { vigente_de: string; valor: number }[] = [
  { vigente_de: '2025-01-01', valor: 1518.00 },
  { vigente_de: '2024-01-01', valor: 1412.00 },
  { vigente_de: '2023-05-01', valor: 1320.00 },
  { vigente_de: '2023-01-01', valor: 1302.00 },
  { vigente_de: '2022-01-01', valor: 1212.00 },
  { vigente_de: '2021-01-01', valor: 1100.00 },
  { vigente_de: '2020-02-01', valor: 1045.00 },
  { vigente_de: '2020-01-01', valor: 1039.00 },
  { vigente_de: '2019-01-01', valor: 998.00 },
  { vigente_de: '2018-01-01', valor: 954.00 },
  { vigente_de: '2017-01-01', valor: 937.00 },
  { vigente_de: '2016-01-01', valor: 880.00 },
  { vigente_de: '2015-01-01', valor: 788.00 },
  { vigente_de: '2014-01-01', valor: 724.00 },
  { vigente_de: '2013-01-01', valor: 678.00 },
  { vigente_de: '2012-01-01', valor: 622.00 },
];

export class SalarioMinimoProxy implements Termo {
  resolverValor(parametro: ParametroDoTermo): Decimal {
    const periodo = parametro.getPeriodo();
    const data = (periodo as unknown as { getInicial?: () => Date | null })?.getInicial?.();
    if (!data) return new Decimal(SALARIO_MINIMO_HISTORICO[0].valor);
    const dataStr = data.toISOString().slice(0, 10);
    for (const sm of SALARIO_MINIMO_HISTORICO) {
      if (sm.vigente_de <= dataStr) return new Decimal(sm.valor);
    }
    return new Decimal(SALARIO_MINIMO_HISTORICO[SALARIO_MINIMO_HISTORICO.length - 1].valor);
  }
}
