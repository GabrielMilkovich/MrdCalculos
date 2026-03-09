/**
 * Deep Extraction — Antônio Harley Marques Gomes
 * Extracts all ocorrências with totals for golden snapshot creation.
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
  const xmlFileName = Object.keys(zip.files).find(f => f.endsWith('.PJC') || f.endsWith('.pjc') || f.endsWith('.xml'));
  if (!xmlFileName) throw new Error('No PJC/XML file found inside ZIP');
  const xmlContent = await zip.files[xmlFileName].async('string');
  analysis = analyzePJC(xmlContent);
}, 30000);

describe('Deep Extraction — Antônio Harley (Totais por Verba)', () => {
  it('should print all verbas with totals', () => {
    console.log('\n========== CASO: ANTÔNIO HARLEY MARQUES GOMES ==========');
    console.log(`Reclamado: ${analysis.parametros.reclamado}`);
    console.log(`Admissão: ${analysis.parametros.admissao} | Demissão: ${analysis.parametros.demissao}`);
    console.log(`Ajuizamento: ${analysis.parametros.ajuizamento}`);
    console.log(`Período: ${analysis.parametros.inicio_calculo} → ${analysis.parametros.termino_calculo}`);
    console.log(`Carga: ${analysis.parametros.carga_horaria}h | Sábado DU: ${analysis.parametros.sabado_dia_util}`);
    console.log(`PJe-Calc: ${analysis.parametros.versao_sistema}`);
    console.log('');

    console.log('--- VERBAS CALCULADAS (PRINCIPAIS) ---');
    const calculadas = analysis.verbas.filter(v => v.tipo === 'Calculada');
    for (const v of calculadas) {
      console.log(`  ${v.nome}`);
      console.log(`    Devido: R$ ${(v.total_devido ?? 0).toFixed(2)} | Pago: R$ ${(v.total_pago ?? 0).toFixed(2)} | Dif: R$ ${(v.total_diferenca ?? 0).toFixed(2)}`);
      console.log(`    Fórmula: div=${v.formula.divisor.valor} mult=${v.formula.multiplicador.valor} qtd=${v.formula.quantidade.valor} dobra=${v.formula.dobra}`);
      console.log(`    Ocorrências: ${v.ocorrencias_count}`);
      // Print first 3 ocorrências
      for (const oc of v.ocorrencias_sample.slice(0, 5)) {
        console.log(`      ${oc.competencia}: base=${oc.base.toFixed(2)} div=${oc.divisor} mult=${oc.multiplicador} qtd=${oc.quantidade} → devido=${oc.devido.toFixed(2)} pago=${oc.pago.toFixed(2)}`);
      }
      if (v.ocorrencias_count > 5) console.log(`      ... +${v.ocorrencias_count - 5} mais`);
    }

    console.log('\n--- VERBAS REFLEXO ---');
    const reflexos = analysis.verbas.filter(v => v.tipo === 'Reflexo');
    for (const v of reflexos) {
      console.log(`  ${v.nome} [${v.comportamento_reflexo}]`);
      console.log(`    Devido: R$ ${(v.total_devido ?? 0).toFixed(2)} | Pago: R$ ${(v.total_pago ?? 0).toFixed(2)} | Dif: R$ ${(v.total_diferenca ?? 0).toFixed(2)}`);
      console.log(`    Base: ${v.formula.base_verbas.map(b => b.nome).join(', ')}`);
      console.log(`    Ocorrências: ${v.ocorrencias_count}`);
      for (const oc of v.ocorrencias_sample.slice(0, 3)) {
        console.log(`      ${oc.competencia}: base=${oc.base.toFixed(2)} div=${oc.divisor} mult=${oc.multiplicador} qtd=${oc.quantidade} → devido=${oc.devido.toFixed(2)} pago=${oc.pago.toFixed(2)}`);
      }
    }

    console.log('\n--- RESUMO FINANCEIRO ---');
    console.log(`  Líquido Exequente: R$ ${analysis.resultado.liquido_exequente.toFixed(2)}`);
    console.log(`  INSS Reclamante:   R$ ${analysis.resultado.inss_reclamante.toFixed(2)}`);
    console.log(`  INSS Reclamado:    R$ ${analysis.resultado.inss_reclamado.toFixed(2)}`);
    console.log(`  Imposto de Renda:  R$ ${analysis.resultado.imposto_renda.toFixed(2)}`);
    console.log(`  FGTS Depósito:     R$ ${analysis.resultado.fgts_deposito.toFixed(2)}`);
    console.log(`  Honorários:        R$ ${analysis.resultado.honorarios.map(h => `${h.nome}: ${h.valor.toFixed(2)}`).join(', ')}`);
    console.log(`  Custas:            R$ ${analysis.resultado.custas.toFixed(2)}`);

    console.log('\n--- ATUALIZAÇÃO MONETÁRIA ---');
    console.log(JSON.stringify(analysis.atualizacao, null, 2));

    expect(analysis.verbas.length).toBeGreaterThan(0);
  });

  it('should generate snapshot code for golden test', () => {
    // Generate the TypeScript snapshot structure
    console.log('\n========== GOLDEN SNAPSHOT CODE ==========');
    console.log('rubricas: [');
    
    const allVerbas = analysis.verbas.filter(v => (v.total_devido ?? 0) > 0 || (v.total_diferenca ?? 0) !== 0);
    for (const v of allVerbas) {
      const codigo = v.nome.toUpperCase()
        .replace(/[ÁÀÂÃ]/g, 'A').replace(/[ÉÈÊ]/g, 'E').replace(/[ÍÌÎ]/g, 'I')
        .replace(/[ÓÒÔÕ]/g, 'O').replace(/[ÚÙÛ]/g, 'U').replace(/[Ç]/g, 'C')
        .replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').replace(/_+/g, '_');
      
      const tipo = v.tipo === 'Calculada' ? 'PRINCIPAL' :
        v.caracteristica === 'DECIMO_TERCEIRO_SALARIO' ? 'REFLEXO_13' :
        v.caracteristica === 'AVISO_PREVIO' ? 'REFLEXO_AP' :
        v.caracteristica === 'FERIAS' ? 'REFLEXO_FERIAS' :
        v.nome.includes('REPOUSO') || v.nome.includes('RSR') ? 'REFLEXO_RSR' :
        v.nome.includes('MULTA') ? 'REFLEXO_MULTA477' : 'REFLEXO';
      
      const principal = v.tipo === 'Reflexo' && v.formula.base_verbas.length > 0
        ? `, rubrica_principal: '${v.formula.base_verbas[0].nome}'` : '';
      
      console.log(`  { codigo: '${codigo}', descricao: '${v.nome}', total: ${(v.total_diferenca ?? v.total_devido ?? 0).toFixed(2)}, tipo: '${tipo}'${principal} },`);
    }
    console.log('];');
  });
});
