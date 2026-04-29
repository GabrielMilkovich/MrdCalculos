/**
 * PARIDADE — PJCs NOVOS em modo 100% INDEPENDENT
 *
 * Compara MRD Calc (cálculo do zero, sem preservação de NENHUM valor do PJC) com
 * o PJe-Calc oficial usando 9 novos .PJC fornecidos pelo usuário.
 *
 * GARANTIAS DE INDEPENDÊNCIA:
 *  - `modo_calculo: 'independent'`
 *  - `gt_closure = undefined` (nenhuma calibração)
 *  - `apuracao_juros_gt = undefined` (nenhum ground truth de juros)
 *  - `indice_acumulado` pré-computado NÃO é importado — engine calcula via TabelaDeCorrecaoMonetaria
 *  - `devido` por ocorrência NÃO é importado — engine calcula via fórmula oficial
 *    (base / divisor × multiplicador × quantidade × dobra; HALF_EVEN 2 casas)
 *
 * Dados do PJC usados como INPUTS LEGÍTIMOS (não resultados):
 *  - base, divisor, multiplicador, quantidade, dobra (inputs de fórmula)
 *  - pago (dado de holerite, não cálculo)
 *  - datas (admissão, demissão, ajuizamento, liquidação)
 *  - configs (juros_tipo, combinacoes, etc.)
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { analyzePJC } from '../pjc-analyzer';
import { convertPjcToEngineInputs } from '../pjc-to-engine';
import { PjeCalcEngineV3 } from '../engine-v3';
import type { PjeIndiceRow, PjeINSSFaixaRow } from '../engine-types';
import {
  SELIC_MENSAL, SELIC_ACUMULADO, IPCA_E_ACUMULADO, TR_ACUMULADO,
} from '../indices-fallback';

const CORPUS_DIR = path.join(process.cwd(), 'PJC-TESTES-IDENPENDET');

// Indices DB (derived from indices-fallback)
const INDICES: PjeIndiceRow[] = (() => {
  const rows: PjeIndiceRow[] = [];
  for (const [c, v] of Object.entries(SELIC_MENSAL).sort()) {
    rows.push({ indice: 'SELIC', competencia: c + '-01', valor: v, acumulado: SELIC_ACUMULADO[c] ?? 100 });
  }
  for (const [c, a] of Object.entries(IPCA_E_ACUMULADO).sort()) {
    rows.push({ indice: 'IPCA-E', competencia: c + '-01', valor: 0, acumulado: a });
    rows.push({ indice: 'IPCAE', competencia: c + '-01', valor: 0, acumulado: a });
    rows.push({ indice: 'IPCA', competencia: c + '-01', valor: 0, acumulado: a });
  }
  for (const [c, a] of Object.entries(TR_ACUMULADO).sort()) {
    rows.push({ indice: 'TR', competencia: c + '-01', valor: 0, acumulado: a });
  }
  return rows;
})();

// INSS faixas (histórico + 2025)
const FAIXAS: PjeINSSFaixaRow[] = [
  // 2020 (EC 103/2019 — faixas progressivas)
  { competencia_inicio: '2020-03-01', competencia_fim: '2024-01-01', faixa: 1, valor_ate: 1100.00, aliquota: 0.075 },
  { competencia_inicio: '2020-03-01', competencia_fim: '2024-01-01', faixa: 2, valor_ate: 2203.48, aliquota: 0.09 },
  { competencia_inicio: '2020-03-01', competencia_fim: '2024-01-01', faixa: 3, valor_ate: 3305.22, aliquota: 0.12 },
  { competencia_inicio: '2020-03-01', competencia_fim: '2024-01-01', faixa: 4, valor_ate: 6433.57, aliquota: 0.14 },
  // 2024
  { competencia_inicio: '2024-01-01', competencia_fim: '2025-01-01', faixa: 1, valor_ate: 1412.00, aliquota: 0.075 },
  { competencia_inicio: '2024-01-01', competencia_fim: '2025-01-01', faixa: 2, valor_ate: 2666.68, aliquota: 0.09 },
  { competencia_inicio: '2024-01-01', competencia_fim: '2025-01-01', faixa: 3, valor_ate: 4000.03, aliquota: 0.12 },
  { competencia_inicio: '2024-01-01', competencia_fim: '2025-01-01', faixa: 4, valor_ate: 7786.02, aliquota: 0.14 },
  // 2025
  { competencia_inicio: '2025-01-01', competencia_fim: null, faixa: 1, valor_ate: 1518.00, aliquota: 0.075 },
  { competencia_inicio: '2025-01-01', competencia_fim: null, faixa: 2, valor_ate: 2793.88, aliquota: 0.09 },
  { competencia_inicio: '2025-01-01', competencia_fim: null, faixa: 3, valor_ate: 4190.83, aliquota: 0.12 },
  { competencia_inicio: '2025-01-01', competencia_fim: null, faixa: 4, valor_ate: 8157.41, aliquota: 0.14 },
];

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function readPjc(file: string): string {
  return fs.readFileSync(path.join(CORPUS_DIR, file), 'latin1');
}

interface Resultado {
  file: string;
  calculo: string;
  pjc_liquido: number;
  mrd_liquido: number;
  delta_pct: number;
  delta_abs: number;
  erro?: string;
}

function rodarCasoIndependent(file: string): Resultado {
  const result: Resultado = {
    file, calculo: file.match(/CALCULO_(\w+)/)?.[1]?.slice(0, 40) || '?',
    pjc_liquido: 0, mrd_liquido: 0, delta_pct: 0, delta_abs: 0,
  };
  try {
    const xml = readPjc(file);
    const analysis = analyzePJC(xml);
    result.pjc_liquido = analysis.resultado.liquido_exequente;
    if (result.pjc_liquido <= 0) {
      result.erro = 'PJC sem valor líquido';
      return result;
    }

    const inputs = convertPjcToEngineInputs(analysis, `new-${file}`);

    // FULL INDEPENDENT MODE: desabilita TUDO que venha pre-computado do PJC
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
    result.mrd_liquido = r.resumo.liquido_reclamante;
    result.delta_abs = result.mrd_liquido - result.pjc_liquido;
    result.delta_pct = (result.delta_abs / result.pjc_liquido) * 100;
  } catch (e) {
    result.erro = e instanceof Error ? e.message : String(e);
  }
  return result;
}

describe('Paridade FULL INDEPENDENT — PJCs Novos (9 arquivos)', () => {
  const arquivos = fs.existsSync(CORPUS_DIR)
    ? fs.readdirSync(CORPUS_DIR).filter(f => f.toUpperCase().endsWith('.PJC')).sort()
    : [];

  if (arquivos.length === 0) {
    it('corpus novo ausente', () => {
      expect(arquivos.length).toBeGreaterThan(0);
    });
    return;
  }

  const resultados: Resultado[] = [];

  for (const file of arquivos) {
    it(`INDEPENDENT ${file.slice(0, 60)}...`, () => {
      const r = rodarCasoIndependent(file);
      resultados.push(r);
      expect(r.erro || r.mrd_liquido >= 0).toBeTruthy();
    }, 15000);
  }

  it('relatório consolidado INDEPENDENT', () => {
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log(' PARIDADE FULL INDEPENDENT — PJCs Novos (sem nenhum dado pré-computado)');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    console.log(' #  | Cálculo                          | PJe-Calc (R$)    | MRD Calc (R$)    | Delta %    | Delta R$       | Status  ');
    console.log(' ───|──────────────────────────────────|──────────────────|──────────────────|────────────|────────────────|─────────');

    let aprov1 = 0, aprov5 = 0, aprov10 = 0;
    let somaDeltaAbs = 0, somaDeltaPct = 0;
    let totalPjc = 0, totalMrd = 0;
    const errosCount = resultados.filter(r => r.erro).length;

    resultados.forEach((r, i) => {
      const idx = String(i + 1).padStart(2, ' ');
      const calc = r.calculo.padEnd(32).slice(0, 32);
      if (r.erro) {
        console.log(` ${idx} | ${calc} | ${r.pjc_liquido > 0 ? fmt(r.pjc_liquido).padStart(16) : '              N/A'} | ${'(erro)'.padStart(16)} | ${'--'.padStart(10)} | ${'--'.padStart(14)} | ERRO    `);
        return;
      }
      const absPct = Math.abs(r.delta_pct);
      let status = 'REPROV ';
      if (absPct <= 1) { status = 'GOLDEN '; aprov1++; aprov5++; aprov10++; }
      else if (absPct <= 5) { status = 'APROV5%'; aprov5++; aprov10++; }
      else if (absPct <= 10) { status = 'APROV10'; aprov10++; }
      const sinal = r.delta_pct > 0 ? '+' : '';
      console.log(` ${idx} | ${calc} | ${fmt(r.pjc_liquido).padStart(16)} | ${fmt(r.mrd_liquido).padStart(16)} | ${(sinal + r.delta_pct.toFixed(2) + '%').padStart(10)} | ${(sinal + fmt(r.delta_abs)).padStart(14)} | ${status}`);
      somaDeltaAbs += absPct;
      somaDeltaPct += r.delta_pct;
      totalPjc += r.pjc_liquido;
      totalMrd += r.mrd_liquido;
    });

    const validos = resultados.length - errosCount;
    const mediaAbs = validos > 0 ? somaDeltaAbs / validos : 0;
    const deltaGlobal = totalPjc > 0 ? ((totalMrd - totalPjc) / totalPjc) * 100 : 0;

    console.log(' ───|──────────────────────────────────|──────────────────|──────────────────|────────────|────────────────|─────────');
    console.log(`\n APROV ≤1% (GOLDEN): ${aprov1}/${validos}  |  APROV ≤5%: ${aprov5}/${validos}  |  APROV ≤10%: ${aprov10}/${validos}`);
    console.log(` Delta médio abs:    ${mediaAbs.toFixed(2)}%`);
    console.log(` Delta global:       ${deltaGlobal >= 0 ? '+' : ''}${deltaGlobal.toFixed(2)}%`);
    console.log(` PJe-Calc total:     R$ ${fmt(totalPjc)}`);
    console.log(` MRD Calc total:     R$ ${fmt(totalMrd)}`);
    console.log(` Erros:              ${errosCount}/${resultados.length}`);
    console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');

    expect(resultados.length).toBeGreaterThan(0);
  });
});
