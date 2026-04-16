import * as fs from 'fs';
import { analyzePJC } from '../src/lib/pjecalc/pjc-analyzer.ts';

const file = process.argv[2];
const xml = fs.readFileSync(file, 'latin1');
const a = analyzePJC(xml);

console.log(`verbas: ${a.verbas.length}`);
// Encontra uma verba com ocorrencias_all não vazio e com devido > 0
for (const v of a.verbas) {
  if (!v.ocorrencias_all?.length) continue;
  const nonZero = v.ocorrencias_all.find(o => (o.devido ?? 0) > 0);
  if (nonZero) {
    console.log(`\nVerba: id=${v.id} nome="${v.nome}" ocorrências=${v.ocorrencias_all.length}`);
    console.log(`  Primeira não-zero: competencia=${nonZero.competencia}`);
    console.log(`    base=${nonZero.base} divisor=${nonZero.divisor} mult=${nonZero.multiplicador} qty=${nonZero.quantidade}`);
    console.log(`    devido=${nonZero.devido} pago=${nonZero.pago} indice=${nonZero.indice_acumulado}`);
    console.log(`  total_devido=${v.total_devido} total_pago=${v.total_pago} total_diferenca=${v.total_diferenca}`);
    break;
  }
}
