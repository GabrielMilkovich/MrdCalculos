/**
 * Targeted: find where indiceAcumulado lives in the XML + check for Atualizacao result tags
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('PJC indiceAcumulado Location', () => {
  it('should find indiceAcumulado in PJC XML', () => {
    const FILES = ['islan-rodrigues.pjc', 'carla-pego.pjc', 'vanderlei-carvalho.pjc', 'francisco-pablo.pjc'];

    for (const file of FILES) {
      const content = readFileSync(resolve(__dirname, `../../public/reports/${file}`), 'utf-8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'application/xml');
      const root = doc.documentElement;

      console.log(`\n═══ ${file} ═══`);

      // Find ALL indiceAcumulado tags
      const idxEls = root.getElementsByTagName('indiceAcumulado');
      console.log(`  Total <indiceAcumulado> tags: ${idxEls.length}`);
      
      // Show parent context of first 3
      for (let i = 0; i < Math.min(3, idxEls.length); i++) {
        const el = idxEls[i];
        const parent = el.parentElement;
        const grandparent = parent?.parentElement;
        console.log(`  [${i}] value=${el.textContent} parent=${parent?.tagName} grandparent=${grandparent?.tagName}`);
        
        // Show sibling tags in parent (first 10)
        if (parent) {
          const siblingTags = Array.from(parent.children)
            .filter(c => c.children.length === 0)
            .map(c => `${c.tagName}=${c.textContent?.slice(0, 20)}`)
            .slice(0, 15);
          console.log(`    siblings: ${siblingTags.join(', ')}`);
        }
      }

      // Find non-zero occurrence with indiceAcumulado
      const ocs = root.getElementsByTagName('OcorrenciaDeVerba');
      let found = 0;
      for (const oc of Array.from(ocs)) {
        const versao = oc.getElementsByTagName('versao')[0]?.textContent;
        if (versao === '0') continue;
        const devido = parseFloat(oc.getElementsByTagName('devido')[0]?.textContent || '0');
        const idx = oc.getElementsByTagName('indiceAcumulado')[0]?.textContent;
        if (devido > 0 && idx && parseFloat(idx) > 0 && found < 3) {
          found++;
          const comp = oc.getElementsByTagName('dataInicial')[0]?.textContent;
          const d = comp ? new Date(parseInt(comp)).toISOString().slice(0, 10) : '?';
          const pago = parseFloat(oc.getElementsByTagName('pago')[0]?.textContent || '0');
          const base = oc.getElementsByTagName('base')[0]?.textContent;
          console.log(`  Occurrence: comp=${d} devido=${devido.toFixed(2)} pago=${pago.toFixed(2)} dif=${(devido - pago).toFixed(2)} idx=${idx} base=${base?.slice(0, 15)}`);
          
          // All child tags of this occurrence
          const allTags = Array.from(oc.children)
            .filter(c => c.children.length === 0)
            .map(c => `${c.tagName}=${c.textContent?.slice(0, 25)}`);
          console.log(`    ALL tags: ${allTags.join(', ')}`);
        }
      }
      if (found === 0) console.log('  NO occurrences with indiceAcumulado > 0 and devido > 0');

      // Also check for valorCorrigido, valorAtualizado tags on occurrences
      const vcEls = root.getElementsByTagName('valorCorrigido');
      const vaEls = root.getElementsByTagName('valorAtualizado');
      const vfEls = root.getElementsByTagName('valorFinal');
      console.log(`  <valorCorrigido> tags: ${vcEls.length}`);
      console.log(`  <valorAtualizado> tags: ${vaEls.length}`);
      console.log(`  <valorFinal> tags: ${vfEls.length}`);
      
      // Check for Atualizacao section with results
      const atEls = root.getElementsByTagName('atualizacao');
      console.log(`  <atualizacao> sections: ${atEls.length}`);
      if (atEls.length > 0) {
        for (let i = 0; i < Math.min(2, atEls.length); i++) {
          const at = atEls[i];
          const children = Array.from(at.children)
            .filter(c => c.children.length === 0)
            .map(c => `${c.tagName}=${c.textContent?.slice(0, 30)}`);
          console.log(`  [atualizacao ${i}] parent=${at.parentElement?.tagName}: ${children.join(', ')}`);
        }
      }
    }
  });
});
