import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Debug PJC XML', () => {
  it('should show correction-related XML tags', () => {
    const files = ['vanderlei-carvalho.pjc', 'islan-rodrigues.pjc', 'francisco-pablo.pjc'];
    for (const f of files) {
      const content = readFileSync(resolve(__dirname, `../../public/reports/${f}`), 'utf-8');
      
      // Find indicesAcumulados
      const idxMatch = content.match(/<indicesAcumulados>([^<]*)<\/indicesAcumulados>/);
      console.log(`\n=== ${f} ===`);
      console.log('indicesAcumulados:', idxMatch?.[1] || 'NOT FOUND');
      
      // Find CombinacaoDeIndice
      const combMatches = content.match(/<CombinacaoDeIndice[^>]*>[\s\S]*?<\/CombinacaoDeIndice>/g);
      console.log('CombinacaoDeIndice count:', combMatches?.length || 0);
      if (combMatches) combMatches.forEach(m => console.log('  ', m.replace(/\s+/g, ' ')));
      
      // Find CombinacaoDeJuros
      const jurMatches = content.match(/<CombinacaoDeJuros[^>]*>[\s\S]*?<\/CombinacaoDeJuros>/g);
      console.log('CombinacaoDeJuros count:', jurMatches?.length || 0);
      if (jurMatches) jurMatches.forEach(m => console.log('  ', m.replace(/\s+/g, ' ')));
      
      // Find jurosAposDeducaoCS or similar
      const jurosApos = content.match(/jurosApos[^<]*/gi);
      console.log('jurosApos matches:', jurosApos);
      
      // Find tipoIndice or tipoCorrecao
      const tipoIndice = content.match(/<tipoIndice>([^<]*)<\/tipoIndice>/g);
      console.log('tipoIndice:', tipoIndice);
      
      // Find criterioAtualizacao or similar
      const criterio = content.match(/criterio[^<]*<\/[^>]+>/gi);
      if (criterio) console.log('criterio matches:', criterio.slice(0, 5));
    }
    expect(true).toBe(true);
  });
});
