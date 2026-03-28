/**
 * Extract complete ApuracaoDeJuros structure — this is PJe-Calc's ground truth
 * for correction, interest, and CS base per competência
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function tsToDate(ts: string): string {
  if (!ts || ts === 'null') return '';
  const n = parseInt(ts);
  if (isNaN(n)) return ts;
  return new Date(n).toISOString().slice(0, 10);
}

describe('ApuracaoDeJuros Full Extract', () => {
  it('should extract all fields from ApuracaoDeJuros for each case', { timeout: 30000 }, () => {
    const FILES = ['islan-rodrigues.pjc', 'carla-pego.pjc', 'vanderlei-carvalho.pjc', 'francisco-pablo.pjc'];

    for (const file of FILES) {
      const content = readFileSync(resolve(__dirname, `../../public/reports/${file}`), 'utf-8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'application/xml');
      const root = doc.documentElement;

      console.log(`\n═══ ${file} ═══`);

      const apuracoes = root.getElementsByTagName('ApuracaoDeJuros');
      console.log(`  Total ApuracaoDeJuros entries: ${apuracoes.length}`);

      let sumVC = 0, sumJuros = 0, sumCSBase = 0, sumCS13 = 0;

      // Show first entry's ALL fields (to discover tag names)
      if (apuracoes.length > 0) {
        const first = apuracoes[0];
        const allChildren = Array.from(first.children).filter(c => c.children.length === 0);
        console.log(`  [Fields in ApuracaoDeJuros]:`);
        for (const c of allChildren) {
          console.log(`    ${c.tagName}: ${c.textContent?.slice(0, 40)}`);
        }
      }

      // Extract key values from each entry
      console.log(`\n  COMP       | valorCorr   | juros       | CS_base     | CS_13       | total`);
      console.log(`  -----------|-------------|-------------|-------------|-------------|------------`);

      for (const ap of Array.from(apuracoes)) {
        const comp = tsToDate(ap.getElementsByTagName('competencia')[0]?.textContent || '');
        const vc = parseFloat(ap.getElementsByTagName('valorCorrigido')[0]?.textContent || '0');
        const csBase = parseFloat(ap.getElementsByTagName('valorVerbaParaContribuicaoSocial')[0]?.textContent || '0');
        const cs13 = parseFloat(ap.getElementsByTagName('valorVerbaParaContribuicaoSocialDecimoTerceiro')[0]?.textContent || '0');
        
        // Look for juros-related tags
        const juros = parseFloat(ap.getElementsByTagName('juros')[0]?.textContent || '0');
        const jurosDevidos = parseFloat(ap.getElementsByTagName('jurosDevidos')[0]?.textContent || '0');
        const totalAtualizado = parseFloat(ap.getElementsByTagName('totalAtualizado')[0]?.textContent || '0');
        const valorFinal = parseFloat(ap.getElementsByTagName('valorFinal')[0]?.textContent || '0');

        sumVC += vc;
        sumJuros += (juros || jurosDevidos);
        sumCSBase += csBase;
        sumCS13 += cs13;

        const total = vc + (juros || jurosDevidos);
        console.log(`  ${comp.padEnd(10)} | ${vc.toFixed(2).padStart(11)} | ${(juros || jurosDevidos).toFixed(2).padStart(11)} | ${csBase.toFixed(2).padStart(11)} | ${cs13.toFixed(2).padStart(11)} | ${total.toFixed(2).padStart(11)}`);
      }

      console.log(`  -----------|-------------|-------------|-------------|-------------|------------`);
      console.log(`  TOTAL      | ${sumVC.toFixed(2).padStart(11)} | ${sumJuros.toFixed(2).padStart(11)} | ${sumCSBase.toFixed(2).padStart(11)} | ${sumCS13.toFixed(2).padStart(11)} | ${(sumVC + sumJuros).toFixed(2).padStart(11)}`);

      // Compare with PJC resultado
      const gprec = root.getElementsByTagName('gprec')[0];
      const dados = root.getElementsByTagName('dadosEstruturados')[0];
      const pjcLiq = parseFloat(gprec?.getElementsByTagName('liquidoExequente')[0]?.textContent || '0');
      const pjcINSSRecl = parseFloat(dados?.getElementsByTagName('inssReclamante')[0]?.textContent || '0');
      const pjcINSSEmp = parseFloat(dados?.getElementsByTagName('inssReclamado')[0]?.textContent || '0');
      const pjcIR = parseFloat(dados?.getElementsByTagName('impostoRenda')[0]?.textContent || '0');
      
      console.log(`\n  PJC resultado:`);
      console.log(`    liquido_exequente: ${pjcLiq.toFixed(2)}`);
      console.log(`    INSS recl: ${pjcINSSRecl.toFixed(2)}`);
      console.log(`    INSS emp: ${pjcINSSEmp.toFixed(2)}`);
      console.log(`    IR: ${pjcIR.toFixed(2)}`);
      console.log(`    bruto implied (liq+inss+ir): ${(pjcLiq + pjcINSSRecl + pjcIR).toFixed(2)}`);
      console.log(`  sum(valorCorrigido): ${sumVC.toFixed(2)}`);
      console.log(`  sum(juros): ${sumJuros.toFixed(2)}`);
      console.log(`  sum(corrigido+juros): ${(sumVC + sumJuros).toFixed(2)}`);
    }
  });
});
