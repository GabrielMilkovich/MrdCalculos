import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngineV3 } from '../engine-v3';
import { INDICES, FAIXAS } from './parity-v3-vs-pjc.test';

const CORPUS_DIR = path.join(process.cwd(), 'Arquivos PJC');

/**
 * Diagnostico de casos com overshoot/undershoot grande para identificar
 * causas-raiz estruturais na paridade com o PJe-Calc.
 */
describe('diag paridade - casos reprovados', () => {
  const cases = [
    { num: '4463', expected: 9974.39, note: '+42% overshoot - pequeno valor' },
    { num: '4465', expected: 190652.72, note: '+19% overshoot' },
    { num: '4495', expected: 61849.71, note: '+20% overshoot' },
    { num: '4462', expected: 317482.10, note: '+20% overshoot' },
    { num: '4483', expected: 88486.94, note: '-15% undershoot' },
    { num: '4494', expected: 166619.02, note: '-23% undershoot' },
  ];

  for (const c of cases) {
    it(`${c.num} (${c.note})`, () => {
      const file = fs.readdirSync(CORPUS_DIR).find(f => f.includes(c.num));
      if (!file) { console.log(`ARQUIVO ${c.num} NAO ENCONTRADO`); return; }
      const xml = fs.readFileSync(path.join(CORPUS_DIR, file), 'latin1');
      const a = analyzePJC(xml);
      const inputs = convertPjcToEngineInputs(a, file);
      inputs.params.modo_calculo = 'independent';
      if (!inputs.params.data_citacao) inputs.params.data_citacao = inputs.params.data_ajuizamento;
      inputs.correcaoConfig.gt_closure = undefined;
      inputs.correcaoConfig.apuracao_juros_gt = undefined;
      if (inputs.csConfig.apuracao_juros_gt) inputs.csConfig.apuracao_juros_gt = undefined;
      if (inputs.irConfig.apuracao_juros_gt) inputs.irConfig.apuracao_juros_gt = undefined;

      const engine = new PjeCalcEngineV3(
        inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
        inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
        inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
        inputs.custasConfig, inputs.seguroConfig, INDICES, FAIXAS,
      );
      const r = engine.liquidar();

      const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const liq = a.resultado.liquido_exequente;
      const gap = r.resumo.liquido_reclamante - liq;
      const gapPct = (gap / liq) * 100;

      console.log(`\n=== ${c.num} ===`);
      console.log(`PJC liquido:         R$ ${fmt(liq).padStart(12)}`);
      console.log(`MRD liquido:         R$ ${fmt(r.resumo.liquido_reclamante).padStart(12)} (${gapPct > 0 ? '+' : ''}${gapPct.toFixed(2)}%, gap R$ ${fmt(gap)})`);
      console.log(`--- breakdown MRD ---`);
      console.log(`  principal_bruto:   R$ ${fmt(r.resumo.principal_bruto).padStart(12)}`);
      console.log(`  principal_corr:    R$ ${fmt(r.resumo.principal_corrigido).padStart(12)}`);
      console.log(`  juros_mora:        R$ ${fmt(r.resumo.juros_mora).padStart(12)}`);
      console.log(`  fgts_total:        R$ ${fmt(r.resumo.fgts_total).padStart(12)}`);
      console.log(`  cs_segurado:       -R$ ${fmt(r.resumo.cs_segurado).padStart(11)}`);
      console.log(`  ir_retido:         -R$ ${fmt(r.resumo.ir_retido).padStart(11)}`);
      console.log(`--- breakdown PJC (quando disponivel) ---`);
      console.log(`  inss_reclamante:   R$ ${fmt(a.resultado.inss_reclamante).padStart(12)}`);
      console.log(`  ir:                R$ ${fmt(a.resultado.imposto_renda).padStart(12)}`);
      console.log(`  fgts_deposito:     R$ ${fmt(a.resultado.fgts_deposito).padStart(12)}`);
      console.log(`  juros_persistido:  ${a.resultado.juros_mora_persistido === null ? 'NULL' : a.resultado.juros_mora_persistido}`);
      console.log(`--- verbas (top 8 por valor) ---`);
      const verbaStats = r.verbas
        .map((v, i) => ({ nome: inputs.verbas[i].nome, dif: v.total_diferenca, cor: v.total_corrigido, jur: v.total_juros }))
        .filter(v => v.dif > 0)
        .sort((a, b) => b.dif - a.dif)
        .slice(0, 8);
      for (const v of verbaStats) {
        console.log(`  ${v.nome.slice(0, 42).padEnd(42)} dif=${fmt(v.dif).padStart(10)} cor=${fmt(v.cor).padStart(10)} jur=${fmt(v.jur).padStart(9)}`);
      }
      // Detect duplicates: verbas with same total_diferenca
      const dups = new Map<number, string[]>();
      for (const v of verbaStats) {
        const k = Math.round(v.dif);
        if (!dups.has(k)) dups.set(k, []);
        dups.get(k)!.push(v.nome);
      }
      const dupGroups = Array.from(dups.values()).filter(g => g.length > 1);
      if (dupGroups.length > 0) {
        console.log(`--- VERBAS POSSIVELMENTE DUPLICADAS ---`);
        for (const g of dupGroups) console.log(`  mesmo valor: ${g.join(' | ')}`);
      }

      expect(true).toBe(true); // diag-only
    });
  }
});
