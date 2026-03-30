/**
 * =====================================================
 * SCRIPT: Atualização Mensal de Índices BCB
 * =====================================================
 * Busca séries históricas do BCB SGS e atualiza
 * src/lib/pjecalc/indices-fallback.ts automaticamente.
 *
 * Uso:
 *   npm run update-indices
 *   npx tsx scripts/update-indices.ts
 *
 * Fontes:
 *   IPCA-E : BCB SGS série 10764
 *   SELIC  : BCB SGS série 4390 (acumulado mensal)
 *   TR     : BCB SGS série 188
 * =====================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BCB_API = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';
const OUTPUT_FILE = path.join(__dirname, '../src/lib/pjecalc/indices-fallback.ts');

interface BCBEntry {
  data: string;  // DD/MM/YYYY
  valor: string; // taxa mensal em %
}

interface IndiceAcumulado {
  [ym: string]: number; // YYYY-MM → acumulado base 100
}

async function fetchSerie(codigo: number, dataInicial = '01/01/2015'): Promise<BCBEntry[]> {
  const url = `${BCB_API}.${codigo}/dados?formato=json&dataInicial=${dataInicial}`;
  console.log(`[BCB] Buscando série ${codigo}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BCB série ${codigo}: HTTP ${res.status}`);
  const data = await res.json() as BCBEntry[];
  console.log(`[BCB] Série ${codigo}: ${data.length} registros`);
  return data;
}

function toYM(dataBCB: string): string {
  const [, mm, yyyy] = dataBCB.split('/');
  return `${yyyy}-${mm}`;
}

function buildAcumulado(entries: BCBEntry[], base = 100): IndiceAcumulado {
  const result: IndiceAcumulado = {};
  let acum = base;
  for (const entry of entries) {
    const taxa = parseFloat(entry.valor.replace(',', '.'));
    if (isNaN(taxa)) continue;
    acum = acum * (1 + taxa / 100);
    result[toYM(entry.data)] = parseFloat(acum.toFixed(8));
  }
  return result;
}

function formatRecord(name: string, data: IndiceAcumulado, comment: string): string {
  const hoje = new Date().toISOString().slice(0, 7);
  const entries = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, val]) => `  '${ym}': ${val.toFixed(8)},`)
    .join('\n');
  return `/**\n * ${comment}\n * Atualizado: ${hoje}\n */\nexport const ${name}: Record<string, number> = {\n${entries}\n};`;
}

function generateFileContent(ipcae: IndiceAcumulado, selic: IndiceAcumulado, tr: IndiceAcumulado): string {
  const hoje = new Date().toISOString().slice(0, 10);
  return `// =====================================================
// FALLBACK INDICES — Séries históricas offline
// Gerado automaticamente por scripts/update-indices.ts
// Última atualização: ${hoje}
//
// Fonte IPCA-E : BCB SGS série 10764
// Fonte SELIC  : BCB SGS série 4390
// Fonte TR     : BCB SGS série 188
//
// NÃO EDITAR MANUALMENTE — use: npm run update-indices
// =====================================================

${formatRecord('IPCA_E_ACUMULADO', ipcae, 'IPCA-E acumulado (base 100 = Dez/2014) | BCB SGS série 10764')}

${formatRecord('SELIC_ACUMULADO', selic, 'SELIC acumulada (base 100 = Dez/2014) | BCB SGS série 4390')}

${formatRecord('TR_ACUMULADO', tr, 'TR acumulada (base 100 = Dez/2014) | BCB SGS série 188')}
`;
}

function validateNoRegression(novo: IndiceAcumulado, antigo: IndiceAcumulado, nome: string): void {
  let divergencias = 0;
  for (const [ym, valAntigo] of Object.entries(antigo)) {
    const valNovo = novo[ym];
    if (valNovo === undefined) continue;
    const diff = Math.abs(valNovo - valAntigo) / valAntigo;
    if (diff > 0.0001) {
      console.warn(`[WARN] ${nome} ${ym}: antigo=${valAntigo.toFixed(6)} novo=${valNovo.toFixed(6)} diff=${(diff * 100).toFixed(4)}%`);
      divergencias++;
    }
  }
  if (divergencias > 5) {
    throw new Error(`[ERRO] ${nome}: ${divergencias} divergências. Revisar manualmente.`);
  }
  console.log(`[OK] ${nome}: validação sem regressão (${divergencias} avisos)`);
}

function readCurrentIndices(): { ipcae: IndiceAcumulado; selic: IndiceAcumulado; tr: IndiceAcumulado } | null {
  try {
    const content = fs.readFileSync(OUTPUT_FILE, 'utf-8');
    const extract = (name: string): IndiceAcumulado => {
      const regex = new RegExp(`export const ${name}[^{]+\\{([^}]+)\\}`, 's');
      const match = content.match(regex);
      if (!match) return {};
      const result: IndiceAcumulado = {};
      const lineRegex = /'(\d{4}-\d{2})':\s*([\d.]+)/g;
      let m;
      while ((m = lineRegex.exec(match[1])) !== null) result[m[1]] = parseFloat(m[2]);
      return result;
    };
    return { ipcae: extract('IPCA_E_ACUMULADO'), selic: extract('SELIC_ACUMULADO'), tr: extract('TR_ACUMULADO') };
  } catch {
    console.log('[INFO] Arquivo atual não encontrado — criando do zero');
    return null;
  }
}

async function main() {
  console.log('=== Atualização de Índices BCB ===');
  console.log(`Arquivo destino: ${OUTPUT_FILE}\n`);

  const [ipcae, selic, tr] = await Promise.all([
    fetchSerie(10764, '01/01/2015').then(e => buildAcumulado(e, 100)),
    fetchSerie(4390, '01/01/2015').then(e => buildAcumulado(e, 100)),
    fetchSerie(188, '01/01/2012').then(e => buildAcumulado(e, 100)),
  ]);

  const atual = readCurrentIndices();
  if (atual) {
    validateNoRegression(ipcae, atual.ipcae, 'IPCA-E');
    validateNoRegression(selic, atual.selic, 'SELIC');
    validateNoRegression(tr, atual.tr, 'TR');
  }

  const content = generateFileContent(ipcae, selic, tr);
  fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');

  const last = (d: IndiceAcumulado) => Object.keys(d).sort().pop();
  console.log('\n=== Sumário ===');
  console.log(`IPCA-E : ${Object.keys(ipcae).length} registros → último: ${last(ipcae)}`);
  console.log(`SELIC  : ${Object.keys(selic).length} registros → último: ${last(selic)}`);
  console.log(`TR     : ${Object.keys(tr).length} registros → último: ${last(tr)}`);
  console.log('\n✅ indices-fallback.ts atualizado com sucesso.');
}

main().catch(err => { console.error('\n❌ Erro:', err.message); process.exit(1); });
