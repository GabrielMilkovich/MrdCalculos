/**
 * Extract ocorrenciasAtualizacao from InssSobreSalariosDevidos
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

describe('INSS Atualizacao', () => {
  it('should extract ocorrenciasAtualizacao', () => {
    const content = readFileSync(resolve(__dirname, '../../public/reports/islan-rodrigues.pjc'), 'utf-8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'application/xml');
    const root = doc.documentElement;

    const inssDevidos = root.getElementsByTagName('InssSobreSalariosDevidos')[0];
    if (!inssDevidos) { console.log('No InssSobreSalariosDevidos'); return; }

    // Get ocorrenciasAtualizacao
    const ocAtualEls = inssDevidos.getElementsByTagName('ocorrenciasAtualizacao');
    console.log(`ocorrenciasAtualizacao elements: ${ocAtualEls.length}`);

    // Look for the container and its children
    for (const container of Array.from(ocAtualEls)) {
      console.log(`  Container tag: ${container.tagName}, children: ${container.children.length}`);
      for (const child of Array.from(container.children).slice(0, 3)) {
        console.log(`  Child tag: ${child.tagName}`);
        for (const field of Array.from(child.children)) {
          if (field.children.length === 0) {
            console.log(`    ${field.tagName}: ${field.textContent?.slice(0, 60)}`);
          }
        }
      }
    }

    // Check Inss sub-element for config
    const inssConfig = inssDevidos.getElementsByTagName('inss')[0];
    if (inssConfig) {
      console.log('\nInss config inside InssSobreSalariosDevidos:');
      for (const c of Array.from(inssConfig.children)) {
        if (c.children.length === 0) {
          console.log(`  ${c.tagName}: ${c.textContent?.slice(0, 80)}`);
        }
      }
    }

    // Check for correction settings
    for (const tag of ['correcaoPrevidenciariaDosSalariosDevidosDoINSS', 'correcaoTrabalhistaDosSalariosDevidosDoINSS', 
      'jurosPrevidenciariosDosSalariosDevidosDoINSS', 'jurosTrabalhistasDosSalariosDevidosDoINSS']) {
      const els = root.getElementsByTagName(tag);
      for (const el of Array.from(els)) {
        console.log(`\n${tag}: ${el.textContent?.slice(0, 80)}`);
      }
    }

    // Look for InssSobreSalariosPagos too
    const inssPagos = root.getElementsByTagName('InssSobreSalariosPagos')[0];
    if (inssPagos) {
      console.log('\nInssSobreSalariosPagos found');
    }

    // Find any tag containing "AtualizacaoINSS" or similar  
    const allTags = new Set<string>();
    const walk = (el: Element) => { allTags.add(el.tagName); for (const c of Array.from(el.children)) walk(c); };
    walk(root);
    const atualizTags = [...allTags].filter(t => /atualiz.*inss|inss.*atualiz|parcela.*atualiz|credito.*reclamante|debito.*reclamante/i.test(t));
    console.log('\nUpdate-related tags:', atualizTags);

    // Find parcelasAtualizaveisCreditosReclamante
    const parcelasCred = root.getElementsByTagName('parcelasAtualizaveisCreditosReclamante');
    console.log(`\nparcelasAtualizaveisCreditosReclamante: ${parcelasCred.length} elements`);
    for (const el of Array.from(parcelasCred).slice(0, 2)) {
      console.log(`  Tag: ${el.tagName}, children: ${el.children.length}`);
      for (const c of Array.from(el.children).slice(0, 5)) {
        if (c.children.length === 0) {
          console.log(`    ${c.tagName}: ${c.textContent?.slice(0, 60)}`);
        } else {
          console.log(`    ${c.tagName}: [${c.children.length} children]`);
          for (const cc of Array.from(c.children).slice(0, 3)) {
            if (cc.children.length === 0) {
              console.log(`      ${cc.tagName}: ${cc.textContent?.slice(0, 60)}`);
            }
          }
        }
      }
    }

    // parcelasAtualizaveisDebitosReclamante
    const parcelasDeb = root.getElementsByTagName('parcelasAtualizaveisDebitosReclamante');
    console.log(`parcelasAtualizaveisDebitosReclamante: ${parcelasDeb.length} elements`);
    for (const el of Array.from(parcelasDeb).slice(0, 2)) {
      for (const c of Array.from(el.children).slice(0, 5)) {
        if (c.children.length === 0) {
          console.log(`    ${c.tagName}: ${c.textContent?.slice(0, 60)}`);
        } else {
          console.log(`    ${c.tagName}: [${c.children.length} children]`);
          for (const cc of Array.from(c.children).slice(0, 3)) {
            if (cc.children.length === 0) console.log(`      ${cc.tagName}: ${cc.textContent?.slice(0, 60)}`);
          }
        }
      }
    }
  }, 30000);
});
