/**
 * Find valorCorrigido tags and their context
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('valorCorrigido Location', () => {
  it('should dump valorCorrigido tags with parent context', () => {
    const FILES = ['islan-rodrigues.pjc', 'carla-pego.pjc', 'vanderlei-carvalho.pjc'];

    for (const file of FILES) {
      const content = readFileSync(resolve(__dirname, `../../public/reports/${file}`), 'utf-8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'application/xml');
      const root = doc.documentElement;

      console.log(`\n═══ ${file} ═══`);

      // Find ALL valorCorrigido tags
      const vcEls = root.getElementsByTagName('valorCorrigido');
      console.log(`  Total <valorCorrigido>: ${vcEls.length}`);
      
      for (let i = 0; i < vcEls.length; i++) {
        const el = vcEls[i];
        const parent = el.parentElement;
        const gp = parent?.parentElement;
        const ggp = gp?.parentElement;
        
        // Get parent name/context
        const parentName = parent?.getElementsByTagName('nome')[0]?.textContent 
          || parent?.getElementsByTagName('nomeFaixaCSegurado')[0]?.textContent
          || '';
        const parentTag = parent?.tagName || '?';
        const gpTag = gp?.tagName || '?';
        const ggpTag = ggp?.tagName || '?';
        
        // Show all siblings of the parent (non-nested ones)
        const siblings = parent ? Array.from(parent.children)
          .filter(c => c.children.length === 0)
          .map(c => `${c.tagName}=${c.textContent?.slice(0, 20)}`)
          .join(', ') : '';
          
        console.log(`  [${i}] val=${el.textContent?.slice(0, 15)} parent=${parentTag}(${parentName?.slice(0,20)}) gp=${gpTag} ggp=${ggpTag}`);
        if (i < 5) {
          console.log(`    siblings: ${siblings.slice(0, 200)}`);
        }
      }

      // Also look for FaixaCSegurado or similar CS-related tags
      const faixas = root.getElementsByTagName('FaixaCSegurado');
      const faixasEmp = root.getElementsByTagName('FaixaCEmpresa');
      console.log(`  <FaixaCSegurado>: ${faixas.length}`);
      console.log(`  <FaixaCEmpresa>: ${faixasEmp.length}`);
      
      for (let i = 0; i < Math.min(3, faixas.length); i++) {
        const f = faixas[i];
        const tags = Array.from(f.children)
          .filter(c => c.children.length === 0)
          .map(c => `${c.tagName}=${c.textContent?.slice(0, 20)}`)
          .join(', ');
        console.log(`  FaixaCS[${i}]: ${tags.slice(0, 200)}`);
      }

      // Check for resultado per verba (e.g., totalCorrigido on Calculada/Reflexo)
      const calcEls = root.getElementsByTagName('Calculada');
      let count = 0;
      for (const calc of Array.from(calcEls)) {
        const nome = calc.getElementsByTagName('nome')[0]?.textContent;
        if (!nome) continue;
        const vc = calc.getElementsByTagName('valorCorrigido')[0]?.textContent;
        const totalDevido = calc.getElementsByTagName('totalDevido')[0]?.textContent;
        const totalPago = calc.getElementsByTagName('totalPago')[0]?.textContent;
        if (vc && count < 5) {
          count++;
          console.log(`  Calculada "${nome?.slice(0,30)}": valorCorrigido=${vc?.slice(0,15)} totalDevido=${totalDevido?.slice(0,15)} totalPago=${totalPago?.slice(0,15)}`);
        }
      }
    }
  });
});
