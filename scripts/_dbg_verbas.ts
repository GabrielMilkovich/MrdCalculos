/** Para antonio, dump TODAS as verbas e suas ocorrências em 2020-11. */
import * as fs from 'fs';
import { execSync } from 'child_process';
async function main() {
  const { analyzePJC } = await import('../src/lib/pjecalc/pjc-analyzer');
  const { convertPjcToEngineInputs } = await import('../src/lib/pjecalc/pjc-to-engine');

  const pjc = '/home/user/MrdCalculos/public/reports/antonio-harley.pjc';
  const buf = fs.readFileSync(pjc);
  const xml = buf[0] === 0x50 && buf[1] === 0x4b
    ? execSync(`unzip -p "${pjc}"`, { maxBuffer: 50e6, encoding: 'utf-8' })
    : buf.toString('utf-8');
  const a = await analyzePJC(xml);
  const inputs = convertPjcToEngineInputs(a, 'antonio');

  console.log('Total verbas:', inputs.verbas.length);
  console.log('\nVerbas com incidência INSS e ocorrências em 2020-11:');
  for (const v of inputs.verbas) {
    if (!v.incidencias?.contribuicao_social) continue;
    const ocs2011 = (v.ocorrencias_precomputadas ?? []).filter(o => (o.competencia ?? '').startsWith('2020-11'));
    if (ocs2011.length === 0) continue;
    const car = (v as any).caracteristica ?? '?';
    console.log(`  ${v.nome} (carac=${car}, ferIndeniz=${(v as any).ferias_indenizadas ?? '?'}):`);
    for (const oc of ocs2011) {
      const dif = (oc.devido ?? 0) - (oc.pago ?? 0);
      console.log(`    comp=${oc.competencia}, base=${oc.base ?? '?'}, devido=${oc.devido ?? '?'}, pago=${oc.pago ?? '?'}, dif=${dif.toFixed(2)}`);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
