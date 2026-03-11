/**
 * Raw PJC XML Structure Diagnostic
 * Dumps the exact XML tags for resultado and a few occurrences
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('PJC XML Raw Structure', () => {
  it('should dump resultado tags for each PJC file', () => {
    const FILES = [
      'islan-rodrigues.pjc',
      'carla-pego.pjc',
      'vanderlei-carvalho.pjc',
      'francisco-pablo.pjc',
    ];

    for (const file of FILES) {
      const content = readFileSync(resolve(__dirname, `../../public/reports/${file}`), 'utf-8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'application/xml');
      const root = doc.documentElement;

      console.log(`\n═══ ${file} ═══`);

      // gprec section
      const gprec = root.getElementsByTagName('gprec')[0];
      if (gprec) {
        const tags = ['liquidoExequente', 'inssReclamante', 'inssBeneficiario', 'inssReclamado', 'impostoRenda',
          'fgtsDepositoContaVinculada', 'totalReclamante', 'totalReclamado', 'brutoPrincipal', 'brutoDevido',
          'principalCorrigido', 'jurosMora', 'totalCorrigido', 'totalBruto', 'valorLiquidoDevido',
          'valorAtualizado', 'totalLiquido'];
        console.log('  [gprec]:');
        for (const tag of tags) {
          const els = gprec.getElementsByTagName(tag);
          if (els.length > 0) {
            console.log(`    ${tag}: ${els[0].textContent}`);
          }
        }
      } else {
        console.log('  [gprec]: NOT FOUND');
      }

      // dadosEstruturados section
      const dados = root.getElementsByTagName('dadosEstruturados')[0];
      if (dados) {
        const tags = ['inssReclamante', 'inssBeneficiario', 'inssReclamado', 'impostoRenda',
          'fgtsDepositoContaVinculada', 'custasReclamante', 'custasReclamado',
          'liquidoExequente', 'totalReclamante', 'totalDevido'];
        console.log('  [dadosEstruturados]:');
        for (const tag of tags) {
          const els = dados.getElementsByTagName(tag);
          if (els.length > 0) {
            console.log(`    ${tag}: ${els[0].textContent}`);
          }
        }
      } else {
        console.log('  [dadosEstruturados]: NOT FOUND');
      }

      // Check additional possible sections
      const resumo = root.getElementsByTagName('resumo')[0] || root.getElementsByTagName('Resumo')[0];
      if (resumo) {
        console.log('  [resumo]:');
        for (const child of Array.from(resumo.children)) {
          console.log(`    ${child.tagName}: ${child.textContent?.slice(0, 50)}`);
        }
      }

      // Check ContribuicaoSocial section in detail
      const csEls = root.getElementsByTagName('ContribuicaoSocial');
      if (csEls.length > 0) {
        const cs = csEls[0];
        console.log('  [ContribuicaoSocial]:');
        for (const child of Array.from(cs.children).slice(0, 15)) {
          const val = child.textContent?.slice(0, 80);
          console.log(`    ${child.tagName}: ${val}`);
        }
      }

      // Check for Atualizacao section
      const atEls = root.getElementsByTagName('atualizacao')[0] || root.getElementsByTagName('Atualizacao')[0];
      if (atEls) {
        console.log('  [atualizacao]:');
        // Key tags
        const tags = ['indiceTrabalhista', 'outroIndiceTrabalhista', 'jurosDeAjuizamento', 
          'jurosAposDeducaoCS', 'jurosAposDeducaoCsReclamante', 'taxaMensal'];
        for (const tag of tags) {
          const els = atEls.getElementsByTagName(tag);
          if (els.length > 0) console.log(`    ${tag}: ${els[0].textContent}`);
        }
      }

      // Sample 1 occurrence from first verba to check what OTHER tags exist
      const firstVerba = root.getElementsByTagName('Calculada')[0];
      if (firstVerba) {
        const nome = firstVerba.getElementsByTagName('nome')[0]?.textContent;
        console.log(`  [First Verba: ${nome}]`);
        const ocList = firstVerba.getElementsByTagName('ocorrencias')[0];
        if (ocList) {
          const ocs = ocList.getElementsByTagName('OcorrenciaDeVerba');
          // Find first with versao > 0
          for (const oc of Array.from(ocs).slice(0, 5)) {
            const versao = oc.getElementsByTagName('versao')[0]?.textContent;
            if (versao === '0') continue;
            console.log(`    [Occurrence v${versao}]:`);
            for (const child of Array.from(oc.children).slice(0, 20)) {
              if (child.children.length > 0) continue; // skip nested
              console.log(`      ${child.tagName}: ${child.textContent?.slice(0, 50)}`);
            }
            break; // just one
          }
        }
      }
    }
  });
});
