/**
 * Deep dive: InssSobreSalariosDevidos structure
 */
import { describe, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function tsToDate(ts: string): string {
  if (!ts || ts === 'null') return '';
  const n = parseInt(ts);
  if (isNaN(n)) return ts;
  return new Date(n).toISOString().slice(0, 10);
}

describe('INSS Devidos Structure', () => {
  it('should explore InssSobreSalariosDevidos', () => {
    const FILES = ['islan-rodrigues.pjc', 'carla-pego.pjc'];

    for (const file of FILES) {
      const content = readFileSync(resolve(__dirname, `../../public/reports/${file}`), 'utf-8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'application/xml');
      const root = doc.documentElement;

      console.log(`\n═══ ${file} ═══`);

      // Look for InssSobreSalariosDevidos
      const inssDevidos = root.getElementsByTagName('InssSobreSalariosDevidos')[0]
        || root.getElementsByTagName('inssSobreSalariosDevidos')[0];
      
      if (inssDevidos) {
        console.log('InssSobreSalariosDevidos found!');
        // Show all scalar children
        for (const c of Array.from(inssDevidos.children)) {
          if (c.children.length === 0) {
            console.log(`  ${c.tagName}: ${c.textContent?.slice(0, 80)}`);
          } else {
            console.log(`  ${c.tagName}: [${c.children.length} children]`);
          }
        }
      }

      // Look for OcorrenciaDeInssSobreSalariosDevidos entries
      const ocINSS = root.getElementsByTagName('OcorrenciaDeInssSobreSalariosDevidos');
      console.log(`\nOcorrenciaDeInssSobreSalariosDevidos: ${ocINSS.length} entries`);
      
      let sumBase = 0, sumAliq = 0, sumDevido = 0, sumCorr = 0, sumJuros = 0, sumFinal = 0;
      
      if (ocINSS.length > 0) {
        // Show first entry's ALL fields
        console.log('First entry fields:');
        for (const c of Array.from(ocINSS[0].children)) {
          console.log(`  ${c.tagName}: ${c.textContent?.slice(0, 80)}`);
        }
        
        console.log('\nCOMP       | base        | aliq    | devido      | correcao    | juros       | final');
        console.log('-----------|-------------|---------|-------------|-------------|-------------|------------');
        
        for (const oc of Array.from(ocINSS)) {
          const comp = tsToDate(
            oc.getElementsByTagName('dataOcorrenciaInss')[0]?.textContent 
            || oc.getElementsByTagName('competencia')[0]?.textContent || ''
          );
          const base = parseFloat(oc.getElementsByTagName('valorContribuicaoSocial')[0]?.textContent || '0');
          const aliq = parseFloat(oc.getElementsByTagName('aliquotaSegurado')[0]?.textContent || '0');
          const devido = parseFloat(oc.getElementsByTagName('valorDevidoSeguradoVerbas')[0]?.textContent || '0');
          const teto = parseFloat(oc.getElementsByTagName('valorTetoSegurado')[0]?.textContent || '0');
          const final_val = parseFloat(oc.getElementsByTagName('valorDevidoSeguradoFinal')[0]?.textContent || '0');
          
          // Look for correction/interest on CS
          const corr = parseFloat(oc.getElementsByTagName('correcaoPrevidenciariaDosSalariosDevidosDoINSS')[0]?.textContent 
            || oc.getElementsByTagName('correcaoPrevidenciaria')[0]?.textContent || '0');
          const juros = parseFloat(oc.getElementsByTagName('jurosPrevidenciariosDosSalariosDevidosDoINSS')[0]?.textContent
            || oc.getElementsByTagName('jurosPrevidenciarios')[0]?.textContent || '0');
          
          sumBase += base;
          sumDevido += devido;
          sumCorr += corr;
          sumJuros += juros;
          sumFinal += final_val;
          
          console.log(`${comp.padEnd(10)} | ${base.toFixed(2).padStart(11)} | ${(aliq*100).toFixed(1).padStart(6)}% | ${devido.toFixed(2).padStart(11)} | ${corr.toFixed(2).padStart(11)} | ${juros.toFixed(2).padStart(11)} | ${final_val.toFixed(2).padStart(11)}`);
        }
        
        console.log('-----------|-------------|---------|-------------|-------------|-------------|------------');
        console.log(`TOTAL      | ${sumBase.toFixed(2).padStart(11)} |         | ${sumDevido.toFixed(2).padStart(11)} | ${sumCorr.toFixed(2).padStart(11)} | ${sumJuros.toFixed(2).padStart(11)} | ${sumFinal.toFixed(2).padStart(11)}`);
      }

      // Show the Inss top-level values
      const inssEl = root.getElementsByTagName('Inss')[0] || root.getElementsByTagName('inss')[0];
      if (inssEl) {
        console.log('\nInss top-level:');
        for (const c of Array.from(inssEl.children)) {
          if (c.children.length === 0) {
            console.log(`  ${c.tagName}: ${c.textContent?.slice(0, 80)}`);
          }
        }
      }

      // Summary values
      const dados = root.getElementsByTagName('dadosEstruturados')[0];
      const gprec = root.getElementsByTagName('gprec')[0];
      console.log(`\ndadosEstruturados.inssReclamante: ${dados?.getElementsByTagName('inssReclamante')[0]?.textContent}`);
      console.log(`gprec.inssBeneficiario: ${gprec?.getElementsByTagName('inssBeneficiario')[0]?.textContent}`);
      
      // valorTotalInssSegurado
      const totalSeg = root.getElementsByTagName('valorTotalInssSegurado');
      for (const el of Array.from(totalSeg)) {
        console.log(`valorTotalInssSegurado: ${el.textContent}`);
      }
      const totalEmp = root.getElementsByTagName('valorTotalInssEmpresa');
      for (const el of Array.from(totalEmp)) {
        console.log(`valorTotalInssEmpresa: ${el.textContent}`);
      }
    }
  }, 30000);
});
