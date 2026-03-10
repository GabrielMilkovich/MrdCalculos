import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC } from '../lib/pjecalc/pjc-analyzer';

describe('Debug PJC correction data', () => {
  it('should show per-occurrence correction from PJC', () => {
    const content = readFileSync(resolve(__dirname, '../../public/reports/vanderlei-carvalho.pjc'), 'utf-8');
    const analysis = analyzePJC(content);
    
    console.log('=== PARAMETROS ===');
    console.log('inicio_calculo:', analysis.parametros.inicio_calculo);
    console.log('termino_calculo:', analysis.parametros.termino_calculo);
    console.log('ajuizamento:', analysis.parametros.ajuizamento);
    console.log('admissao:', analysis.parametros.admissao);
    console.log('demissao:', analysis.parametros.demissao);
    
    // Show first verba's occurrences with correction data
    const firstVerba = analysis.verbas.find(v => v.ativo);
    if (firstVerba) {
      console.log(`\n=== VERBA: ${firstVerba.nome} ===`);
      console.log(`total_diferenca: ${firstVerba.total_diferenca}`);
      const ocs = firstVerba.ocorrencias_all.slice(0, 5);
      for (const oc of ocs) {
        console.log(`  ${oc.competencia}: devido=${oc.devido} pago=${oc.pago} dif=${oc.diferenca} indice_acumulado=${oc.indice_acumulado}`);
      }
    }
    
    // Check total_diferenca vs resultado
    const totalDif = analysis.verbas.filter(v => v.ativo).reduce((s, v) => s + v.total_diferenca, 0);
    console.log('\n=== TOTAIS ===');
    console.log('total_diferenca all verbas:', totalDif.toFixed(2));
    console.log('liquido_exequente:', analysis.resultado.liquido_exequente);
    console.log('inss_reclamante:', analysis.resultado.inss_reclamante);
    console.log('inss_reclamado:', analysis.resultado.inss_reclamado);
    console.log('imposto_renda:', analysis.resultado.imposto_renda);
    
    // Check the raw gprec XML for additional fields
    const gprec = content.match(/<gprec>[\s\S]*?<\/gprec>/);
    if (gprec) {
      console.log('\n=== GPREC XML ===');
      // Extract key fields
      const fields = ['liquidoExequente', 'totalDevido', 'totalRecebido', 'totalDiferenca',
        'totalCorrigido', 'totalJuros', 'totalCondenacao', 'principalBruto', 'principalCorrigido'];
      for (const f of fields) {
        const m = gprec[0].match(new RegExp(`<${f}>([^<]*)</${f}>`));
        if (m) console.log(`  ${f}: ${m[1]}`);
      }
    }
    
    // Also check dadosEstruturados for correction info
    const dados = content.match(/<dadosEstruturados>[\s\S]*?<\/dadosEstruturados>/);
    if (dados) {
      console.log('\n=== DADOS ESTRUTURADOS ===');
      const fields = ['totalDevido', 'totalPago', 'totalDiferenca', 'correcaoMonetaria',
        'juros', 'totalBruto', 'totalLiquido', 'principalBruto', 'principalCorrigido',
        'totalCondenacao', 'liquidoDevido'];
      for (const f of fields) {
        const m = dados[0].match(new RegExp(`<${f}>([^<]*)</${f}>`));
        if (m) console.log(`  ${f}: ${m[1]}`);
      }
    }
    
    expect(true).toBe(true);
  });
});
