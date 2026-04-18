import { describe, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngineV3 } from '../engine-v3';
import type { PjeIndiceRow, PjeINSSFaixaRow } from '../engine-types';
import { SELIC_MENSAL, SELIC_ACUMULADO, IPCA_E_ACUMULADO, TR_ACUMULADO } from '../indices-fallback';

const CORPUS_DIR = path.join(process.cwd(), 'PJC-TESTES-IDENPENDET');

const INDICES: PjeIndiceRow[] = (() => {
  const rows: PjeIndiceRow[] = [];
  for (const [c, v] of Object.entries(SELIC_MENSAL).sort()) rows.push({ indice: 'SELIC', competencia: c + '-01', valor: v, acumulado: SELIC_ACUMULADO[c] ?? 100 });
  for (const [c, a] of Object.entries(IPCA_E_ACUMULADO).sort()) {
    rows.push({ indice: 'IPCA-E', competencia: c + '-01', valor: 0, acumulado: a });
    rows.push({ indice: 'IPCAE', competencia: c + '-01', valor: 0, acumulado: a });
    rows.push({ indice: 'IPCA', competencia: c + '-01', valor: 0, acumulado: a });
  }
  for (const [c, a] of Object.entries(TR_ACUMULADO).sort()) rows.push({ indice: 'TR', competencia: c + '-01', valor: 0, acumulado: a });
  return rows;
})();
const FAIXAS: PjeINSSFaixaRow[] = [
  { competencia_inicio: '2024-01-01', competencia_fim: '2025-01-01', faixa: 1, valor_ate: 1412, aliquota: 0.075 },
  { competencia_inicio: '2024-01-01', competencia_fim: '2025-01-01', faixa: 2, valor_ate: 2666.68, aliquota: 0.09 },
  { competencia_inicio: '2024-01-01', competencia_fim: '2025-01-01', faixa: 3, valor_ate: 4000.03, aliquota: 0.12 },
  { competencia_inicio: '2024-01-01', competencia_fim: '2025-01-01', faixa: 4, valor_ate: 7786.02, aliquota: 0.14 },
  { competencia_inicio: '2025-01-01', competencia_fim: null, faixa: 1, valor_ate: 1518, aliquota: 0.075 },
  { competencia_inicio: '2025-01-01', competencia_fim: null, faixa: 2, valor_ate: 2793.88, aliquota: 0.09 },
  { competencia_inicio: '2025-01-01', competencia_fim: null, faixa: 3, valor_ate: 4190.83, aliquota: 0.12 },
  { competencia_inicio: '2025-01-01', competencia_fim: null, faixa: 4, valor_ate: 8157.41, aliquota: 0.14 },
];

const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CASES = ['_140_', '_213_', '_175_', '_2885_', '_177_', '_208_', '_136_'];

describe('diag all reprov', () => {
  it('breakdown', { timeout: 60_000 }, () => {
    for (const cname of CASES) {
      const file = fs.readdirSync(CORPUS_DIR).find(f => f.includes(cname));
      if (!file) { console.log(`MISSING ${cname}`); continue; }
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
      const pjc = a.resultado.liquido_exequente;
      const mrd = r.resumo.liquido_reclamante;
      const pct = ((mrd - pjc) / pjc) * 100;
      console.log(`\n=== ${cname.replace(/_/g,'')} (${pct>0?'+':''}${pct.toFixed(2)}%) ===`);
      console.log(`PJC: R$ ${fmt(pjc)} | MRD: R$ ${fmt(mrd)} | gap: R$ ${fmt(mrd-pjc)}`);
      console.log(`ajuiz=${inputs.params.data_ajuizamento} adm=${inputs.params.data_admissao} dem=${inputs.params.data_demissao} liq=${inputs.correcaoConfig.data_liquidacao}`);
      console.log(`PJC breakdown: inss_rec=${fmt(a.resultado.inss_reclamante)} inss_exec=${fmt(a.resultado.inss_reclamado)} ir=${fmt(a.resultado.imposto_renda)} fgts_dep=${fmt(a.resultado.fgts_deposito)} valor_principal=${fmt(a.resultado.valor_principal ?? 0)} juros_persistido=${a.resultado.juros_mora_persistido === null ? 'NULL' : a.resultado.juros_mora_persistido}`);
      console.log(`MRD breakdown: bruto=${fmt(r.resumo.principal_bruto)} corr=${fmt(r.resumo.principal_corrigido)} juros=${fmt(r.resumo.juros_mora)} fgts=${fmt(r.resumo.fgts_total)} cs=${fmt(r.resumo.cs_segurado)} ir=${fmt(r.resumo.ir_retido)} multas=${fmt(r.resumo.multa_467 + r.resumo.multa_523)}`);
      console.log(`combs_indice: ${JSON.stringify(inputs.correcaoConfig.combinacoes_indice)}`);
      console.log(`combs_juros: ${JSON.stringify(inputs.correcaoConfig.combinacoes_juros)}`);
      console.log(`qtd_verbas: ${inputs.verbas.length}  fgts.compor_principal=${inputs.fgtsConfig.compor_principal}`);
      // top 5 verbas
      const topVerbas = inputs.verbas.map((v, i) => ({ n: v.nome, ...r.verbas[i] }))
        .filter(v => v.total_diferenca !== 0)
        .sort((a, b) => Math.abs(b.total_diferenca) - Math.abs(a.total_diferenca))
        .slice(0, 6);
      console.log(`Top 6 verbas por diferenca:`);
      for (const v of topVerbas) {
        console.log(`  ${v.n.slice(0,40).padEnd(40)} ocs=${v.ocorrencias.length} dev=${fmt(v.total_devido).padStart(12)} dif=${fmt(v.total_diferenca).padStart(12)} cor=${fmt(v.total_corrigido).padStart(12)} jur=${fmt(v.total_juros).padStart(10)}`);
      }
    }
  });
});
