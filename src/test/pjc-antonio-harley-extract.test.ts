/**
 * Extraction Test — Antônio Harley Marques Gomes
 * Reverse-engineers the .PJC file to extract all rubrics, formulas, and totals.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import JSZip from 'jszip';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';

let analysis: PJCAnalysis;

beforeAll(async () => {
  const pjcBuffer = readFileSync(resolve(__dirname, '../../public/reports/antonio-harley.pjc'));
  const zip = await JSZip.loadAsync(pjcBuffer);
  
  // Find the XML file inside the ZIP
  const xmlFileName = Object.keys(zip.files).find(f => f.endsWith('.PJC') || f.endsWith('.pjc') || f.endsWith('.xml'));
  if (!xmlFileName) throw new Error('No PJC/XML file found inside ZIP');
  
  const xmlContent = await zip.files[xmlFileName].async('string');
  analysis = analyzePJC(xmlContent);
}, 30000);

describe('PJC Extraction — Antônio Harley Marques Gomes', () => {
  it('should parse without errors', () => {
    expect(analysis).toBeDefined();
    expect(analysis.parametros).toBeDefined();
  });

  it('should extract case metadata', () => {
    console.log('=== METADADOS DO CASO ===');
    console.log(JSON.stringify(analysis.parametros, null, 2));
    expect(analysis.parametros.beneficiario).toBeTruthy();
  });

  it('should extract resultado/resumo', () => {
    console.log('=== RESUMO ===');
    console.log(JSON.stringify(analysis.resultado, null, 2));
    expect(analysis.resultado).toBeDefined();
  });

  it('should extract all verbas with formulas', () => {
    console.log(`=== VERBAS (${analysis.verbas.length} total) ===`);
    for (const v of analysis.verbas) {
      console.log(`[${v.tipo}] ${v.nome} | variacao=${v.variacao} | caract=${v.caracteristica} | periodo=${v.periodo_inicio}→${v.periodo_fim}`);
      console.log(`  Formula: base_verbas=${JSON.stringify(v.formula.base_verbas.map(b => b.nome))} | divisor=${v.formula.divisor.valor} | mult=${v.formula.multiplicador.valor} | qtd=${v.formula.quantidade.valor} | dobra=${v.formula.dobra}`);
      if (v.formula.valor_pago) {
        console.log(`  Pago: tipo=${v.formula.valor_pago.tipo} valor=${v.formula.valor_pago.valor}`);
      }
      if (v.comportamento_reflexo) {
        console.log(`  Reflexo: comportamento=${v.comportamento_reflexo} | media=${v.periodo_media} | fracao=${v.tratamento_fracao}`);
      }
      console.log(`  Incidências: INSS=${v.incidencias.inss} IRPF=${v.incidencias.irpf} FGTS=${v.incidencias.fgts}`);
    }
    expect(analysis.verbas.length).toBeGreaterThan(0);
  });

  it('should extract ocorrências detail for each verba', () => {
    console.log('=== OCORRÊNCIAS POR VERBA ===');
    for (const v of analysis.verbas) {
      // Access ocorrencias via the analyzer's extended data
      const verbaData = (v as any).ocorrencias_data;
      if (verbaData) {
        console.log(`${v.nome}: devido=${verbaData.total_devido.toFixed(2)} | pago=${verbaData.total_pago.toFixed(2)} | diff=${verbaData.total_diferenca.toFixed(2)} | ${verbaData.ocorrencias.length} ocorrências`);
      }
    }
  });

  it('should extract historicos salariais', () => {
    console.log(`=== HISTÓRICOS SALARIAIS (${analysis.historicos_salariais.length}) ===`);
    for (const h of analysis.historicos_salariais) {
      console.log(`${h.nome}: ${h.ocorrencias_count} ocorrências, ${h.competencias.length} competências`);
      for (const c of h.competencias.slice(0, 3)) {
        console.log(`  ${c.comp}: R$ ${c.valor.toFixed(2)}`);
      }
      if (h.competencias.length > 3) console.log(`  ... +${h.competencias.length - 3} mais`);
    }
    expect(analysis.historicos_salariais.length).toBeGreaterThan(0);
  });

  it('should extract DAG (dependency graph)', () => {
    console.log(`=== DAG (${analysis.dag.length} nós) ===`);
    for (const node of analysis.dag) {
      const deps = node.depende_de.length > 0 ? `← [${node.depende_de.join(', ')}]` : '(raiz)';
      console.log(`${node.id}: ${node.nome} ${deps}`);
    }
  });

  it('should extract férias and faltas', () => {
    console.log(`=== FÉRIAS (${analysis.ferias.length}) ===`);
    for (const f of analysis.ferias) {
      console.log(`  ${f.dias}d - ${f.situacao}`);
    }
    console.log(`=== FALTAS (${analysis.faltas.length}) ===`);
    for (const f of analysis.faltas) {
      console.log(`  ${f.data_inicio}→${f.data_fim}: tipo=${f.tipo} justificada=${f.justificada}`);
    }
  });

  it('should extract atualização monetária config', () => {
    console.log('=== ATUALIZAÇÃO MONETÁRIA ===');
    console.log(JSON.stringify(analysis.atualizacao, null, 2));
  });
});
