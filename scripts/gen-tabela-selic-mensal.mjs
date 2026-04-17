import { SELIC_MENSAL } from '../src/lib/pjecalc/indices-fallback.ts';
import * as fs from 'fs';

const keys = Object.keys(SELIC_MENSAL).sort();
const entries = [];
for (const k of keys) {
  const taxa = SELIC_MENSAL[k];
  const [ano, mes] = k.split('-').map(Number);
  entries.push({ ano, mes, taxa });
}

const content = `/**
 * PJe-Calc — Tabela SELIC mensal (Jan/2015 – Fev/2026)
 *
 * Fonte: RFB/SICALC. Taxas mensais em % para somatório simples (Súmula 121 STF).
 *
 * Gerado automaticamente por scripts/gen-tabela-selic-mensal.mjs.
 * Em produção, substituir por dados reais do banco quando disponível.
 */
export interface EntradaTabelaSelicMensal {
  ano: number;
  /** 1-indexed (1 = Janeiro) */
  mes: number;
  /** Taxa mensal em % (ex: 0.94 = 0,94%) */
  taxa: number;
}

export const TABELA_SELIC_MENSAL: readonly EntradaTabelaSelicMensal[] = [
${entries.map(e => `  { ano: ${e.ano}, mes: ${e.mes}, taxa: ${e.taxa} },`).join('\n')}
];
`;

const dir = 'src/lib/pjecalc/core/dominio/indices/selic';
fs.writeFileSync(`${dir}/tabela-selic-mensal.ts`, content);
console.log(`Generated tabela-selic-mensal.ts with ${entries.length} entries`);
