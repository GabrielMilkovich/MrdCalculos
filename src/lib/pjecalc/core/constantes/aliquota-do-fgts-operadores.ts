/**
 * PJe-Calc v2.15.1 — Operador `calcular` de AliquotaDoFgtsEnum
 *
 * Porte de: br.jus.trt8.pjecalc.negocio.constantes.AliquotaDoFgtsEnum
 *
 * Em Java cada constante do enum sobrescreve `calcular(BigDecimal)`. Em TS
 * extraímos o método para um resolver puro indexado por valor do enum
 * (mesmo padrão de `caracteristica-da-verba-operadores`).
 */
import Decimal from 'decimal.js';
import { AliquotaDoFgtsEnum } from './enums';

const FATOR_2_PORCENTO = new Decimal('0.02');
const FATOR_8_PORCENTO = new Decimal('0.08');

/**
 * `calcular` — multiplica `valor` pelo fator da alíquota.
 * Retorna `null` se `valor == null` (paridade Java).
 */
export function calcularAliquotaDoFgts(
  aliquota: AliquotaDoFgtsEnum,
  valor: Decimal | null | undefined,
): Decimal | null {
  if (valor == null) return null;
  switch (aliquota) {
    case AliquotaDoFgtsEnum.DOIS_PORCENTO: return valor.times(FATOR_2_PORCENTO);
    case AliquotaDoFgtsEnum.OITO_PORCENTO: return valor.times(FATOR_8_PORCENTO);
    default: {
      // exhaustiveness check: TS deve garantir cobertura
      const _exhaustive: never = aliquota;
      throw new Error(`AliquotaDoFgtsEnum não tratada: ${String(_exhaustive)}`);
    }
  }
}
