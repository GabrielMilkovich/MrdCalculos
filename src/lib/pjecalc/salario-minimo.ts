import Decimal from 'decimal.js';
import { HISTORICO_SALARIO_MINIMO } from './engine-constants';

const sorted = [...HISTORICO_SALARIO_MINIMO].sort((a, b) => b.vigencia.localeCompare(a.vigencia));

export function getSalarioMinimoVigente(competencia: string): Decimal {
  const data = competencia.length === 7
    ? competencia
    : competencia.slice(0, 7);

  for (const sm of sorted) {
    if (sm.vigencia <= data) return new Decimal(sm.valor);
  }
  return new Decimal(sorted[sorted.length - 1].valor);
}

export function getSalarioMinimoPorPeriodo(
  inicio: string,
  fim: string,
): Array<{ competencia: string; valor: Decimal }> {
  const resultado: Array<{ competencia: string; valor: Decimal }> = [];
  const startYear = parseInt(inicio.slice(0, 4), 10);
  const startMonth = parseInt(inicio.slice(5, 7), 10);
  const endYear = parseInt(fim.slice(0, 4), 10);
  const endMonth = parseInt(fim.slice(5, 7), 10);

  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const competencia = `${year}-${String(month).padStart(2, '0')}`;
    resultado.push({ competencia, valor: getSalarioMinimoVigente(competencia) });
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return resultado;
}
