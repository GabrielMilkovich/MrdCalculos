/** Trace nominal por competência do nosso TS para antonio. */
import * as fs from 'fs';
import { execSync } from 'child_process';

async function main() {
  const { analyzePJC } = await import('../src/lib/pjecalc/pjc-analyzer');
  const { convertPjcToEngineInputs } = await import('../src/lib/pjecalc/pjc-to-engine');
  const { PjeCalcEngineV3 } = await import('../src/lib/pjecalc/engine-v3');
  const { IPCA_E_ACUMULADO, SELIC_ACUMULADO } = await import('../src/lib/pjecalc/indices-fallback');

  const pjc = '/home/user/MrdCalculos/public/reports/antonio-harley.pjc';
  const buf = fs.readFileSync(pjc);
  const xml = buf[0] === 0x50 && buf[1] === 0x4b
    ? execSync(`unzip -p "${pjc}"`, { maxBuffer: 50e6, encoding: 'utf-8' })
    : buf.toString('utf-8');
  const a = await analyzePJC(xml);
  const indicesDB: any[] = [];
  for (const [ym, ac] of Object.entries(IPCA_E_ACUMULADO)) {
    indicesDB.push({ indice: 'IPCA-E', competencia: ym + '-01', valor: 0, acumulado: ac });
  }
  for (const [ym, ac] of Object.entries(SELIC_ACUMULADO)) {
    indicesDB.push({ indice: 'SELIC', competencia: ym + '-01', valor: 0, acumulado: ac });
  }
  const inputs = convertPjcToEngineInputs(a, 'antonio');
  const engine = new PjeCalcEngineV3(
    inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
    inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
    inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
    inputs.custasConfig, inputs.seguroConfig, indicesDB,
    [], [], inputs.excecoesCargas || [], [], inputs.prevPrivadaConfig,
    inputs.pensaoConfig, inputs.salarioFamiliaConfig,
  );
  // expor inssAdapter via reflection
  const r = engine.liquidar();
  // Não temos access direto. Vou imprimir do resumo:
  console.log('Resumo eng:');
  console.log('  cs_segurado total:', r.resumo.cs_segurado);
  console.log('  cs_empregador total:', r.resumo.cs_empregador);
  console.log('  cs.segurado_devidos:');
  for (const item of r.contribuicao_social?.segurado_devidos ?? [].slice(0, 30)) {
    console.log(`    ${item.competencia}: base=${item.base.toFixed(2)}, valor=${item.valor.toFixed(2)} (aliq=${(item.aliquota*100).toFixed(2)}%)`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
