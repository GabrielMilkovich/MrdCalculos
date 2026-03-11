/**
 * Diagnostic: Compare GT CS data with PJC INSS expectations
 */
import { describe, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { analyzePJC } from '../lib/pjecalc/pjc-analyzer';

describe('CS GT Diagnostic', () => {
  it('should compare GT CS sums with PJC INSS', () => {
    const FILES = [
      'islan-rodrigues.pjc', 'carla-pego.pjc', 'vanderlei-carvalho.pjc',
      'francisco-pablo.pjc', 'leide-santana.pjc', 'tiago-jose.pjc',
    ];

    for (const file of FILES) {
      const content = readFileSync(resolve(__dirname, `../../public/reports/${file}`), 'utf-8');
      const a = analyzePJC(content);
      const gt = a.apuracao_juros || [];

      // Sum pre-computed CS from GT
      let sumCSNormal = 0, sumCS13 = 0;
      let sumCSBaseNormal = 0, sumCSBase13 = 0;
      let sumValorCorrigido = 0;
      for (const e of gt) {
        sumCSNormal += e.cs_normal;
        sumCS13 += e.cs_13;
        sumCSBaseNormal += e.cs_base_normal;
        sumCSBase13 += e.cs_base_13;
        sumValorCorrigido += e.valor_corrigido;
      }

      const pjcINSSRecl = a.resultado.inss_reclamante;
      const pjcINSSEmp = a.resultado.inss_reclamado;
      const hasPrecomputed = gt.some(e => e.cs_normal > 0 || e.cs_13 > 0);

      console.log(`\n═══ ${file} ═══`);
      console.log(`  GT entries: ${gt.length}`);
      console.log(`  hasPrecomputed CS: ${hasPrecomputed}`);
      console.log(`  sum(cs_normal): ${sumCSNormal.toFixed(2)}`);
      console.log(`  sum(cs_13): ${sumCS13.toFixed(2)}`);
      console.log(`  sum(cs_normal + cs_13): ${(sumCSNormal + sumCS13).toFixed(2)}`);
      console.log(`  PJC inss_reclamante: ${pjcINSSRecl.toFixed(2)}`);
      console.log(`  DELTA (sum vs PJC): ${Math.abs(sumCSNormal + sumCS13 - pjcINSSRecl).toFixed(2)}`);
      console.log(`  ---`);
      console.log(`  sum(cs_base_normal): ${sumCSBaseNormal.toFixed(2)}`);
      console.log(`  sum(cs_base_13): ${sumCSBase13.toFixed(2)}`);
      console.log(`  sum(valorCorrigido): ${sumValorCorrigido.toFixed(2)}`);
      console.log(`  PJC inss_reclamado: ${pjcINSSEmp.toFixed(2)}`);
      
      // Check empregador: if GT bases are correct, emp = base * (20% + sat% + terc%)
      const csConf = a.cs_config;
      const aliqEmp = (csConf?.aliquota_empresa ?? 20) / 100;
      const aliqSat = (csConf?.aliquota_sat ?? 0) / 100;
      const aliqTerc = (csConf?.aliquota_terceiros ?? 0) / 100;
      const totalBase = sumCSBaseNormal + sumCSBase13;
      const empCalc = totalBase * (aliqEmp + aliqSat + aliqTerc);
      console.log(`  emp_calc (base * ${((aliqEmp + aliqSat + aliqTerc)*100).toFixed(1)}%): ${empCalc.toFixed(2)}`);
      console.log(`  emp_delta: ${Math.abs(empCalc - pjcINSSEmp).toFixed(2)}`);
    }
  });
});
