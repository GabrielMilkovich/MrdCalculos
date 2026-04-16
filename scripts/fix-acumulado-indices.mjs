/**
 * Aplica calcularIndiceAcumulado em todos os índices multiplicativos gerados.
 * SELIC diária/Fazenda/IPCAETR excluídas (usam lógica própria ou soma).
 */
import * as fs from 'fs';
import * as path from 'path';

const alvo = [
  { classe: 'IndiceIPCA',    arquivo: 'src/lib/pjecalc/core/dominio/indices/ipca/indice-ipca.ts' },
  { classe: 'IndiceINPC',    arquivo: 'src/lib/pjecalc/core/dominio/indices/inpc/indice-inpc.ts' },
  { classe: 'IndiceIPC',     arquivo: 'src/lib/pjecalc/core/dominio/indices/ipc/indice-ipc.ts' },
  { classe: 'IndiceTR',      arquivo: 'src/lib/pjecalc/core/dominio/indices/tr/indice-tr.ts' },
  { classe: 'IndiceIGPM',    arquivo: 'src/lib/pjecalc/core/dominio/indices/igpm/indice-igpm.ts' },
  { classe: 'IndiceJAM',     arquivo: 'src/lib/pjecalc/core/dominio/indices/jam/indice-jam.ts' },
  { classe: 'IndiceIPCAETR', arquivo: 'src/lib/pjecalc/core/dominio/indices/ipcatr/indice-ipcae-tr.ts' },
  { classe: 'IndiceDevedorFazenda',      arquivo: 'src/lib/pjecalc/core/dominio/indices/dfp/indice-devedor-fazenda.ts' },
  { classe: 'IndiceIndebitoTributario',  arquivo: 'src/lib/pjecalc/core/dominio/indices/it/indice-indebito-tributario.ts' },
  { classe: 'IndiceTabelaUnicaJTMensal', arquivo: 'src/lib/pjecalc/core/dominio/indices/tabelaunica/indice-tabela-unica-jt-mensal.ts' },
  { classe: 'IndiceTabelaUnicaJTDiario', arquivo: 'src/lib/pjecalc/core/dominio/indices/tabelaunica/indice-tabela-unica-jt-diario.ts' },
  { classe: 'IndiceTabelaUnicaDebitoTrabalhista', arquivo: 'src/lib/pjecalc/core/dominio/indices/tabelaunica/indice-tabela-unica-debito-trabalhista.ts' },
  { classe: 'IndiceSelicDiaria',  arquivo: 'src/lib/pjecalc/core/dominio/indices/selic/indice-selic-diaria.ts' },
  { classe: 'IndiceSelicFazenda', arquivo: 'src/lib/pjecalc/core/dominio/indices/selic/indice-selic-fazenda.ts' },
];

for (const { classe, arquivo } of alvo) {
  let content = fs.readFileSync(arquivo, 'utf-8');
  if (content.includes("from '../../../comum/rotinasdecalculo/calculador-de-indices'")) {
    console.log(`  (already patched) ${arquivo}`);
    continue;
  }
  // Add import
  content = content.replace(
    /(import type \{ Periodo \} from '\.\.\/\.\.\/\.\.\/base\/comum\/periodo';)/,
    `$1\nimport { calcularIndiceAcumulado } from '../../../comum/rotinasdecalculo/calculador-de-indices';`
  );
  // Replace return lista with acumulado
  content = content.replace(
    /lista\.sort\(\(a, b\) => a\.getCompetencia\(\)\.getTime\(\) - b\.getCompetencia\(\)\.getTime\(\)\);\n    return lista;\n  \}/,
    `lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());\n    return calcularIndiceAcumulado(lista) as ${classe}[];\n  }`
  );
  fs.writeFileSync(arquivo, content);
  console.log(`  patched ${arquivo}`);
}
console.log('Done.');
