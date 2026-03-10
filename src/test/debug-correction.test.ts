import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC } from '../lib/pjecalc/pjc-analyzer';
import { convertPjcToEngineInputs } from '../lib/pjecalc/pjc-to-engine';
import { PjeCalcEngine } from '../lib/pjecalc/engine';
import { ALL_TEST_INDICES } from './fixtures/indices-oficiais';

describe('Debug Correction', () => {
  it('should show correction config for Vanderlei', () => {
    const content = readFileSync(resolve(__dirname, '../../public/reports/vanderlei-carvalho.pjc'), 'utf-8');
    const analysis = analyzePJC(content);
    const inputs = convertPjcToEngineInputs(analysis, 'debug');
    
    console.log('=== CORRECTION CONFIG ===');
    console.log(JSON.stringify(inputs.correcaoConfig, null, 2));
    console.log('=== ATUALIZACAO (PJC) ===');
    console.log(JSON.stringify(analysis.atualizacao, null, 2));
    console.log('=== INDICES COUNT ===');
    console.log('Total indices:', ALL_TEST_INDICES.length);
    console.log('IPCA-E:', ALL_TEST_INDICES.filter(i => i.indice === 'IPCA-E').length);
    console.log('SELIC:', ALL_TEST_INDICES.filter(i => i.indice === 'SELIC').length);
    
    const engine = new PjeCalcEngine(
      inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
      inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig,
      inputs.csConfig, inputs.irConfig, inputs.correcaoConfig,
      inputs.honorariosConfig, inputs.custasConfig, inputs.seguroConfig,
      ALL_TEST_INDICES,
    );
    
    const result = engine.liquidar();
    
    // Check a single verba's correction
    const firstVerba = result.verbas[0];
    console.log('=== FIRST VERBA ===');
    console.log(`${firstVerba.nome}: diferenca=${firstVerba.total_diferenca} corrigido=${firstVerba.total_corrigido} juros=${firstVerba.total_juros} final=${firstVerba.total_final}`);
    
    // Check if correction was actually applied
    const totalDif = result.verbas.reduce((s, v) => s + v.total_diferenca, 0);
    const totalCorr = result.verbas.reduce((s, v) => s + v.total_corrigido, 0);
    console.log(`Total diferenca: ${totalDif.toFixed(2)}`);
    console.log(`Total corrigido: ${totalCorr.toFixed(2)}`);
    console.log(`Correction applied: ${totalCorr !== totalDif}`);
    
    console.log('=== RESUMO ===');
    console.log(JSON.stringify(result.resumo, null, 2));
    
    expect(true).toBe(true);
  });
});
