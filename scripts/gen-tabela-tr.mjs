/**
 * Gera tabela-tr.ts a partir de TR_ACUMULADO (indices-fallback.ts).
 */
import { TR_ACUMULADO } from '../src/lib/pjecalc/indices-fallback.ts';
import * as fs from 'fs';

const keys = Object.keys(TR_ACUMULADO).sort();
const entries = [];
let prev = null;
for (const k of keys) {
  const acum = TR_ACUMULADO[k];
  if (prev !== null && prev > 0) {
    const taxa = ((acum / prev) - 1) * 100;
    const [ano, mes] = k.split('-').map(Number);
    entries.push({ ano, mes, taxa: Math.max(0, Number(taxa.toFixed(6))) });
  }
  prev = acum;
}

const content = `/**
 * PJe-Calc — Tabela TR mensal
 *
 * Fonte: BCB série 188 (TR).
 * Derivada de TR_ACUMULADO em indices-fallback.ts.
 * A TR está praticamente zerada desde Set/2017 (Lei 12.703/2012).
 */
export interface EntradaTabelaTR {
  ano: number;
  mes: number;
  /** Taxa mensal em % (zero para meses pós-2017) */
  taxa: number;
}

export const TABELA_TR: readonly EntradaTabelaTR[] = [
${entries.map(e => `  { ano: ${e.ano}, mes: ${e.mes}, taxa: ${e.taxa} },`).join('\n')}
];
`;

fs.writeFileSync('src/lib/pjecalc/core/dominio/indices/tr/tabela-tr.ts', content);
console.log(`Generated tabela-tr.ts with ${entries.length} entries`);
