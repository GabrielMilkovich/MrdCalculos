/**
 * Extraction test for Izabela Cristina PJC file
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import JSZip from 'jszip';
import { analyzePJC } from '../lib/pjecalc/pjc-analyzer';

// Provide DOMParser for Node environment
import { JSDOM } from 'jsdom';
if (typeof globalThis.DOMParser === 'undefined') {
  (globalThis as any).DOMParser = new JSDOM('').window.DOMParser;
}

describe('Extract Izabela Cristina PJC', () => {
  it('should extract and analyze the PJC file', async () => {
    const pjcPath = join(__dirname, '../../public/reports/izabela-cristina.pjc');
    const buf = readFileSync(pjcPath);
    const zip = await JSZip.loadAsync(buf);
    
    // Find the main file inside (may be .PJC or .xml)
    const allFiles = Object.keys(zip.files);
    console.log('Files in ZIP:', allFiles);
    
    const mainFile = allFiles.find(f => f.endsWith('.PJC') || f.endsWith('.xml')) || allFiles[0];
    expect(mainFile).toBeTruthy();
    
    const xmlContent = await zip.files[mainFile].async('string');
    console.log('XML length:', xmlContent.length);
    
    // Write first 2000 chars for debugging
    console.log('XML preview:', xmlContent.substring(0, 2000));
    
    const analysis = analyzePJC(xmlContent);
    
    console.log('\n=== PARÂMETROS ===');
    console.log(JSON.stringify(analysis.parametros, null, 2));
    
    console.log('\n=== RESULTADO ===');
    console.log(JSON.stringify(analysis.resultado, null, 2));
    
    console.log('\n=== VERBAS (' + analysis.verbas.length + ') ===');
    for (const v of analysis.verbas) {
      console.log(`[${v.tipo}] ${v.nome} | Div=${v.formula.divisor.valor} Mult=${v.formula.multiplicador.valor} Qtd=${v.formula.quantidade.tipo}:${v.formula.quantidade.valor} | Devido=${v.total_devido?.toFixed(2)} Pago=${v.total_pago?.toFixed(2)} Diff=${v.total_diferenca?.toFixed(2)} | Ocorrencias=${v.ocorrencias_count}`);
      if (v.formula.base_verbas.length > 0) {
        console.log(`  Base: ${v.formula.base_verbas.map(b => b.nome).join(', ')}`);
      }
      if (v.comportamento_reflexo) {
        console.log(`  Reflexo: ${v.comportamento_reflexo} | Período Média: ${v.periodo_media} | Fração: ${v.tratamento_fracao}`);
      }
      if (v.formula.base_tabelada) {
        console.log(`  Base Tabelada: ${v.formula.base_tabelada}`);
      }
      console.log(`  Incidências: INSS=${v.incidencias.inss} IRPF=${v.incidencias.irpf} FGTS=${v.incidencias.fgts}`);
      // Print first 3 ocorrências
      for (const oc of v.ocorrencias_sample.slice(0, 3)) {
        console.log(`    ${oc.competencia}: base=${oc.base} div=${oc.divisor} mult=${oc.multiplicador} qtd=${oc.quantidade} devido=${oc.devido} pago=${oc.pago}`);
      }
    }
    
    console.log('\n=== HISTÓRICOS SALARIAIS (' + analysis.historicos_salariais.length + ') ===');
    for (const h of analysis.historicos_salariais) {
      console.log(`${h.nome} (${h.tipo_variacao}) - ${h.ocorrencias_count} meses | INSS=${h.incide_inss} FGTS=${h.incide_fgts}`);
      for (const c of h.competencias.slice(0, 3)) {
        console.log(`  ${c.comp}: R$ ${c.valor.toFixed(2)}`);
      }
      if (h.competencias.length > 3) console.log(`  ... +${h.competencias.length - 3} mais`);
    }
    
    console.log('\n=== FALTAS (' + analysis.faltas.length + ') ===');
    for (const f of analysis.faltas) {
      console.log(`${f.data_inicio} a ${f.data_fim} | ${f.justificada ? 'Justificada' : 'Não justificada'} | ${f.tipo}`);
    }
    
    console.log('\n=== FÉRIAS (' + analysis.ferias.length + ') ===');
    for (const f of analysis.ferias) {
      console.log(`Aquisitivo: ${f.aquisitivo_inicio} a ${f.aquisitivo_fim} | ${f.dias} dias | ${f.situacao} | Dobra=${f.dobra}`);
    }
    
    console.log('\n=== ATUALIZAÇÃO ===');
    console.log('Índices:', JSON.stringify(analysis.atualizacao.combinacoes_indice));
    console.log('Juros:', JSON.stringify(analysis.atualizacao.combinacoes_juros));
    
    console.log('\n=== DAG ===');
    for (const node of analysis.dag) {
      console.log(`${node.nome} -> depende de: [${node.depende_de.join(', ')}] | dependentes: [${node.dependentes.join(', ')}]`);
    }
    
    console.log('\n=== APURAÇÃO DIÁRIA ===');
    console.log(`Total registros: ${analysis.apuracao_diaria_count}`);
    
    expect(analysis.parametros.beneficiario).toBeTruthy();
    expect(analysis.verbas.length).toBeGreaterThan(0);
  });
});
