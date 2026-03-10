import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Debug PJC Params', () => {
  it('should show ParametrosDeAtualizacao', () => {
    const files = ['vanderlei-carvalho.pjc', 'islan-rodrigues.pjc', 'francisco-pablo.pjc'];
    for (const f of files) {
      const content = readFileSync(resolve(__dirname, `../../public/reports/${f}`), 'utf-8');
      console.log(`\n=== ${f} ===`);
      
      // Find ParametrosDeAtualizacao (the main one, not internalRef)
      const paramAtt = content.match(/<ParametrosDeAtualizacao>(?:(?!<internalRef>)[\s\S])*?<\/ParametrosDeAtualizacao>/g);
      if (paramAtt) {
        for (const p of paramAtt) {
          if (p.includes('internalRef')) continue;
          console.log('ParametrosDeAtualizacao:', p.replace(/\s+/g, ' ').slice(0, 500));
        }
      }
      
      // Find indiceTrabalhista (the base index)
      const indTrab = content.match(/<indiceTrabalhista>([^<]*)<\/indiceTrabalhista>/g);
      console.log('indiceTrabalhista:', indTrab);
      
      // Find tipoJuros (the base interest)
      const tipoJuros = content.match(/<tipoJuros>([^<]*)<\/tipoJuros>/g);
      console.log('tipoJuros:', tipoJuros);
      
      // Find taxaDeJuros
      const taxaJuros = content.match(/<taxaDeJuros>([^<]*)<\/taxaDeJuros>/g);
      console.log('taxaDeJuros:', taxaJuros);
      
      // Find jurosAposDeducao or similar
      const jurosAposDed = content.match(/juros[Aa]pos[^<]*|jurosSobreBase[^<]*/gi);
      console.log('jurosApos:', jurosAposDed);
      
      // timestamps: convert apartirDeOutroIndice
      const tsMatch = content.match(/<apartirDeOutroIndice>(\d+)<\/apartirDeOutroIndice>/);
      if (tsMatch) {
        const d = new Date(parseInt(tsMatch[1]));
        console.log('apartirDeOutroIndice date:', d.toISOString().slice(0, 10));
      }
      const tsMatch2 = content.match(/<apartirDeOutroJuros>(\d+)<\/apartirDeOutroJuros>/);
      if (tsMatch2) {
        const d = new Date(parseInt(tsMatch2[1]));
        console.log('apartirDeOutroJuros date:', d.toISOString().slice(0, 10));
      }
    }
    expect(true).toBe(true);
  });
});
