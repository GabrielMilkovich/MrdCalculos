/**
 * CS & Correction Diagnostic
 * Investigates how PJe-Calc's indiceAcumulado relates to final values
 * and how CS base is computed internally by PJe-Calc.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC, type PJCAnalysis } from '../lib/pjecalc/pjc-analyzer';
import { convertPjcToEngineInputs, type PjcEngineInputs } from '../lib/pjecalc/pjc-to-engine';
import { PjeCalcEngine } from '../lib/pjecalc/engine';
import type { PjeLiquidacaoResult } from '../lib/pjecalc/engine-types';
import { ALL_TEST_INDICES } from './fixtures/indices-oficiais';

const FILES = [
  'islan-rodrigues.pjc',
  'leide-santana.pjc',
  'vanderlei-carvalho.pjc',
  'carla-pego.pjc',
  'francisco-pablo.pjc',
  'tiago-jose.pjc',
];

interface CaseData {
  analysis: PJCAnalysis;
  inputs: PjcEngineInputs;
  result: PjeLiquidacaoResult;
}

const cases = new Map<string, CaseData>();

beforeAll(() => {
  for (const file of FILES) {
    try {
      const content = readFileSync(resolve(__dirname, `../../public/reports/${file}`), 'utf-8');
      const analysis = analyzePJC(content);
      const inputs = convertPjcToEngineInputs(analysis, `diag-${file}`);
      const engine = new PjeCalcEngine(
        inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
        inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
        inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
        inputs.custasConfig, inputs.seguroConfig, ALL_TEST_INDICES,
      );
      const result = engine.liquidar();
      cases.set(file, { analysis, inputs, result });
    } catch (e: any) {
      console.error(`SKIP ${file}: ${e.message}`);
    }
  }
}, 120000);

describe('CS & Correction Diagnostic', () => {
  it('should analyze indiceAcumulado vs final values for all cases', () => {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║     DIAGNÓSTICO: indiceAcumulado × diferenca vs PJC Resultado    ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');

    for (const [file, data] of cases) {
      const { analysis, result } = data;
      
      // Sum of (diferenca × indiceAcumulado) for all active verbas
      let sumDifXIndice = 0;
      let sumDif = 0;
      let sumDevido = 0;
      let ocWithIndex = 0;
      let ocWithoutIndex = 0;
      
      for (const v of analysis.verbas.filter(v => v.ativo)) {
        for (const oc of v.ocorrencias_all) {
          const dif = oc.devido - oc.pago;
          sumDif += dif;
          sumDevido += oc.devido;
          if (oc.indice_acumulado && oc.indice_acumulado > 0) {
            sumDifXIndice += dif * oc.indice_acumulado;
            ocWithIndex++;
          } else {
            sumDifXIndice += dif; // factor = 1
            ocWithoutIndex++;
          }
        }
      }
      
      const pjcLiq = analysis.resultado.liquido_exequente;
      const pjcINSSRecl = analysis.resultado.inss_reclamante;
      const pjcINSSEmp = analysis.resultado.inss_reclamado;
      const pjcIR = analysis.resultado.imposto_renda;
      const pjcBrutoImplied = pjcLiq + pjcINSSRecl + pjcIR; // bruto = liq + deductions
      
      const v3Corrigido = result.resumo.principal_corrigido;
      const v3Juros = result.resumo.juros_mora;
      const v3Bruto = v3Corrigido + v3Juros;

      console.log(`\n─── ${file} ───`);
      console.log(`  data_liquidacao: ${data.inputs.correcaoConfig.data_liquidacao}`);
      console.log(`  ajuizamento: ${analysis.parametros.ajuizamento}`);
      console.log(`  Occurrences: ${ocWithIndex} with GT index, ${ocWithoutIndex} without`);
      console.log(`  sum(diferenca): R$ ${sumDif.toFixed(2)} (=principal_bruto)`);
      console.log(`  sum(dif × indiceAcumulado): R$ ${sumDifXIndice.toFixed(2)}`);
      console.log(`  PJC bruto implied (liq+inss+ir): R$ ${pjcBrutoImplied.toFixed(2)}`);
      console.log(`  V3 principal_corrigido: R$ ${v3Corrigido.toFixed(2)}`);
      console.log(`  V3 juros_mora: R$ ${v3Juros.toFixed(2)}`);
      console.log(`  V3 bruto (corr+juros): R$ ${v3Bruto.toFixed(2)}`);
      console.log(`  PJC liquido: R$ ${pjcLiq.toFixed(2)}`);
      console.log(`  V3 liquido: R$ ${result.resumo.liquido_reclamante.toFixed(2)}`);
      console.log(`  INSS recl: PJC=${pjcINSSRecl.toFixed(2)} V3=${result.resumo.cs_segurado.toFixed(2)}`);
      console.log(`  INSS emp:  PJC=${pjcINSSEmp.toFixed(2)} V3=${result.resumo.cs_empregador.toFixed(2)}`);
      console.log(`  IR:        PJC=${pjcIR.toFixed(2)} V3=${result.resumo.ir_retido.toFixed(2)}`);
      
      // Check if sum(dif × idx) ≈ PJC bruto implied
      const ratio = pjcBrutoImplied / sumDifXIndice;
      console.log(`  Ratio PJC_bruto / sum(dif×idx): ${ratio.toFixed(4)}`);
      
      // Detailed: first 5 occurrences of first verba with CS incidence
      const firstCsVerba = analysis.verbas.find(v => v.ativo && v.incidencias.inss);
      if (firstCsVerba) {
        console.log(`  First CS verba: "${firstCsVerba.nome}" (${firstCsVerba.tipo})`);
        for (const oc of firstCsVerba.ocorrencias_all.slice(0, 5)) {
          const dif = oc.devido - oc.pago;
          console.log(`    ${oc.competencia}: devido=${oc.devido.toFixed(2)} pago=${oc.pago.toFixed(2)} dif=${dif.toFixed(2)} idx=${oc.indice_acumulado?.toFixed(6)||'N/A'} dif×idx=${(dif * (oc.indice_acumulado || 1)).toFixed(2)}`);
        }
      }
    }

    console.log('\n╚══════════════════════════════════════════════════════════════════╝');
    expect(true).toBe(true);
  });

  it('should check CS base: nominal vs corrected for each case', () => {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║     CS BASE COMPARISON: Nominal vs Corrected                     ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');

    for (const [file, data] of cases) {
      const { analysis, result } = data;
      const pjcINSS = analysis.resultado.inss_reclamante;
      if (pjcINSS === 0) continue;

      // Compute what CS would be on nominal diferenca vs corrected
      let baseNominal = 0;
      let baseCorrected = 0;

      for (const vr of result.verbas) {
        const verba = data.inputs.verbas.find(v => v.id === vr.verba_id);
        if (!verba?.incidencias.contribuicao_social) continue;
        if (verba.caracteristica === 'ferias') continue;
        for (const oc of vr.ocorrencias) {
          if (oc.diferenca <= 0) continue;
          baseNominal += Math.abs(oc.diferenca);
          baseCorrected += Math.abs(oc.valor_corrigido);
        }
      }

      console.log(`\n─── ${file} ───`);
      console.log(`  CS Base Nominal (sum dif): R$ ${baseNominal.toFixed(2)}`);
      console.log(`  CS Base Corrected (sum corr): R$ ${baseCorrected.toFixed(2)}`);
      console.log(`  PJC INSS Recl: R$ ${pjcINSS.toFixed(2)}`);
      console.log(`  V3 INSS Recl (on nominal): R$ ${result.resumo.cs_segurado.toFixed(2)}`);
      
      // What would CS be if we used baseCorrected?
      // Quick approximation: scale proportionally
      const ratioBase = baseCorrected / baseNominal;
      console.log(`  Ratio corrected/nominal: ${ratioBase.toFixed(4)}`);
      console.log(`  If CS on corrected ≈ ${(result.resumo.cs_segurado * ratioBase).toFixed(2)}`);
      console.log(`  PJC INSS Emp: R$ ${analysis.resultado.inss_reclamado.toFixed(2)}`);
      console.log(`  V3 INSS Emp: R$ ${result.resumo.cs_empregador.toFixed(2)}`);
    }

    console.log('\n╚══════════════════════════════════════════════════════════════════╝');
    expect(true).toBe(true);
  });
});
