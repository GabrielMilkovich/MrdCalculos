import { IPCA_E_ACUMULADO } from '../src/lib/pjecalc/indices-fallback.ts';
import * as fs from 'fs';

const keys = Object.keys(IPCA_E_ACUMULADO).sort();
const entries = [];
let prev = 100;
for (const k of keys) {
  const acum = IPCA_E_ACUMULADO[k];
  const taxa = ((acum / prev) - 1) * 100;
  const [ano, mes] = k.split('-').map(Number);
  entries.push({ ano, mes, taxa: Number(taxa.toFixed(6)) });
  prev = acum;
}

const content = `/**
 * PJe-Calc — Tabela IPCA-E mensal (Jan/2015 – Fev/2026)
 *
 * Fonte: IBGE série 10764. Valores derivados de IPCA_E_ACUMULADO (base=100 em Dez/2014).
 *
 * Gerado automaticamente por scripts/gen-tabela-ipcae.mjs.
 * Em produção, substituir por dados reais do banco (TBIPCAE) quando disponível.
 */
export interface EntradaTabelaIPCAE {
  ano: number;
  /** 1-indexed (1 = Janeiro) */
  mes: number;
  /** Taxa mensal em % (ex: 0.55 = 0,55%) */
  taxa: number;
}

export const TABELA_IPCAE: readonly EntradaTabelaIPCAE[] = [
${entries.map(e => `  { ano: ${e.ano}, mes: ${e.mes}, taxa: ${e.taxa} },`).join('\n')}
];
`;

fs.writeFileSync('src/lib/pjecalc/core/dominio/indices/ipcae/tabela-ipcae.ts', content);
console.log(`Generated tabela-ipcae.ts with ${entries.length} entries`);
