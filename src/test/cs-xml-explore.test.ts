/**
 * Deep XML exploration: find where PJe-Calc stores final CS values
 */
import { describe, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('PJC XML CS Structure', () => {
  it('should find all CS-related XML tags', () => {
    const content = readFileSync(resolve(__dirname, '../../public/reports/islan-rodrigues.pjc'), 'utf-8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'application/xml');
    const root = doc.documentElement;

    // Find ALL unique tag names that contain 'contribuicao', 'inss', 'cs', 'social'
    const allTags = new Set<string>();
    const walk = (el: Element) => {
      allTags.add(el.tagName);
      for (const child of Array.from(el.children)) walk(child);
    };
    walk(root);

    const csRelated = [...allTags].filter(t => 
      /contribui|inss|social|segurado|emprega|patronal|sat|terceiro/i.test(t)
    ).sort();
    console.log('CS-related tags:', csRelated);

    // Look for apuracaoCS, calculoCS, or similar consolidation tags
    const consolidation = [...allTags].filter(t =>
      /apura|consolid|resultado|resumo|totais|total|deducao|fechamento/i.test(t)
    ).sort();
    console.log('Consolidation tags:', consolidation);

    // Check dadosEstruturados for all children
    const dados = root.getElementsByTagName('dadosEstruturados')[0];
    if (dados) {
      console.log('\ndadosEstruturados children:');
      for (const c of Array.from(dados.children)) {
        if (c.children.length === 0) {
          console.log(`  ${c.tagName}: ${c.textContent?.slice(0, 60)}`);
        }
      }
    }

    // Check gprec for all children
    const gprec = root.getElementsByTagName('gprec')[0];
    if (gprec) {
      console.log('\ngprec children:');
      for (const c of Array.from(gprec.children)) {
        if (c.children.length === 0) {
          console.log(`  ${c.tagName}: ${c.textContent?.slice(0, 60)}`);
        }
      }
    }

    // Look for ContribuicaoSocial config
    const csConf = root.getElementsByTagName('ContribuicaoSocial')[0] 
      || root.getElementsByTagName('contribuicaoSocial')[0];
    if (csConf) {
      console.log('\nContribuicaoSocial config:');
      for (const c of Array.from(csConf.children)) {
        if (c.children.length === 0) {
          console.log(`  ${c.tagName}: ${c.textContent?.slice(0, 80)}`);
        } else {
          console.log(`  ${c.tagName}: [complex, ${c.children.length} children]`);
        }
      }
    }

    // Look for ApuracaoCS or ApuracaoContribuicaoSocial
    for (const tag of ['ApuracaoCS', 'ApuracaoContribuicaoSocial', 'ApuracaoDaContribuicaoSocial', 'ResultadoCS', 'ResultadoContribuicaoSocial', 'csDevido', 'csReclamante', 'contribuicaoSocialDevida']) {
      const els = root.getElementsByTagName(tag);
      if (els.length > 0) {
        console.log(`\nFound ${tag}: ${els.length} elements`);
        const first = els[0];
        for (const c of Array.from(first.children).slice(0, 10)) {
          console.log(`  ${c.tagName}: ${c.textContent?.slice(0, 60)}`);
        }
      }
    }

    // Check if ApuracaoDeJuros has additional CS-related child tags we missed
    const apuracoes = root.getElementsByTagName('ApuracaoDeJuros');
    if (apuracoes.length > 0) {
      console.log('\nApuracaoDeJuros ALL child tags (first entry):');
      const first = apuracoes[0];
      for (const c of Array.from(first.children)) {
        console.log(`  ${c.tagName}: ${c.textContent?.slice(0, 80)}`);
      }
    }

    // Look for "ApuracaoDeJurosSegurado" or second-pass CS
    for (const tag of ['ApuracaoDeJurosSegurado', 'ApuracaoDeCSSegurado', 'csSegApuracao', 'ContribuicaoSocialApuracao', 'ApuracaoContribuicaoSocialSegurado']) {
      const els = root.getElementsByTagName(tag);
      if (els.length > 0) {
        console.log(`\nFound ${tag}: ${els.length} elements`);
      }
    }
  }, 30000);
});
