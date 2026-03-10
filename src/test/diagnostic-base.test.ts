/**
 * Quick diagnostic: why are all verbas returning R$ 0.00?
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC } from '../lib/pjecalc/pjc-analyzer';
import { convertPjcToEngineInputs } from '../lib/pjecalc/pjc-to-engine';
import { PjeCalcEngine } from '../lib/pjecalc/engine';
import { ALL_TEST_INDICES } from './fixtures/indices-oficiais';

describe('Diagnostic: Islan Rodrigues base resolution', () => {
  it('should trace base resolution for first verba', () => {
    const content = readFileSync(resolve(__dirname, '../../public/reports/islan-rodrigues.pjc'), 'utf-8');
    const analysis = analyzePJC(content);
    const inputs = convertPjcToEngineInputs(analysis, 'diag-test');

    console.log('\n═══ DIAGNOSTIC ═══');
    console.log('Historicos count:', inputs.historicos.length);
    for (const h of inputs.historicos) {
      console.log(`  Hist: "${h.nome}" | ${h.periodo_inicio} → ${h.periodo_fim} | ocorrencias: ${h.ocorrencias.length} | valor_fixo: ${h.valor_informado}`);
      if (h.ocorrencias.length > 0) {
        console.log(`    First 3 ocorrencias:`, h.ocorrencias.slice(0, 3).map(o => `${o.competencia}=${o.valor}`));
      }
    }

    console.log('\nVerbas count:', inputs.verbas.length);
    const firstVerba = inputs.verbas[0];
    console.log(`First verba: "${firstVerba.nome}"`);
    console.log(`  tipo: ${firstVerba.tipo}`);
    console.log(`  periodo: ${firstVerba.periodo_inicio} → ${firstVerba.periodo_fim}`);
    console.log(`  base_calculo.historicos:`, firstVerba.base_calculo.historicos);
    console.log(`  base_calculo.verbas:`, firstVerba.base_calculo.verbas);
    console.log(`  base_calculo.tabelas:`, firstVerba.base_calculo.tabelas);
    console.log(`  divisor: ${firstVerba.tipo_divisor} = ${firstVerba.divisor_informado}`);
    console.log(`  multiplicador: ${firstVerba.multiplicador}`);
    console.log(`  quantidade: ${firstVerba.tipo_quantidade} = ${firstVerba.quantidade_informada}`);

    // Try instantiating engine and testing getBaseParaCompetencia
    const engine = new PjeCalcEngine(
      inputs.params,
      inputs.historicos,
      inputs.faltas,
      inputs.ferias,
      inputs.verbas,
      inputs.cartaoPonto,
      inputs.fgtsConfig,
      inputs.csConfig,
      inputs.irConfig,
      inputs.correcaoConfig,
      inputs.honorariosConfig,
      inputs.custasConfig,
      inputs.seguroConfig,
      ALL_TEST_INDICES,
    );

    // Test base for a few competencies
    const comps = ['2021-06', '2021-07', '2021-08'];
    for (const comp of comps) {
      const base = (engine as any).getBaseParaCompetencia(firstVerba, comp);
      console.log(`  getBaseParaCompetencia("${comp}") = ${base}`);
    }

    // Also test getCompetencias
    const periodo = (engine as any).getPeriodoCalculo();
    console.log(`  getPeriodoCalculo: ${JSON.stringify(periodo)}`);
    const competencias = (engine as any).getCompetencias(firstVerba.periodo_inicio, firstVerba.periodo_fim);
    console.log(`  Verba competencias (${competencias.length}):`, competencias.slice(0, 5));

    // Run full calculation
    const result = engine.liquidar();
    const firstResult = result.verbas[0];
    console.log(`\n  Resultado verba[0]: "${firstResult.nome}"`);
    console.log(`    ocorrencias: ${firstResult.ocorrencias.length}`);
    console.log(`    total_diferenca: ${firstResult.total_diferenca}`);
    if (firstResult.ocorrencias.length > 0) {
      console.log(`    first 3 ocorrencias:`, firstResult.ocorrencias.slice(0, 3).map(o => 
        `comp=${o.competencia} base=${o.base} div=${o.divisor} mult=${o.multiplicador} qtd=${o.quantidade} dev=${o.devido}`
      ));
    }
    console.log('═══ END ═══\n');

    expect(inputs.historicos.length).toBeGreaterThan(0);
  });
});
