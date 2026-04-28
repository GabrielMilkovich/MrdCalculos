/**
 * Property-based tests — invariantes matemáticas do engine.
 *
 * Para cada PJC do corpus, validamos que os resultados respeitam
 * propriedades fundamentais que devem valer SEMPRE, independentemente
 * dos valores de entrada.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { analyzePJC } from '@/lib/pjecalc/pjc-analyzer';
import { convertPjcToEngineInputs } from '@/lib/pjecalc/pjc-to-engine';
import { PjeCalcEngineV3 } from '@/lib/pjecalc/engine-v3';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO } from '@/lib/pjecalc/indices-fallback';

function buildIndices() {
  const rows: any[] = [];
  for (const [ym, ac] of Object.entries(IPCA_E_ACUMULADO)) {
    rows.push({ indice: 'IPCA-E', competencia: ym + '-01', valor: 0, acumulado: ac });
    rows.push({ indice: 'IPCAE', competencia: ym + '-01', valor: 0, acumulado: ac });
  }
  for (const [ym, ac] of Object.entries(SELIC_ACUMULADO))
    rows.push({ indice: 'SELIC', competencia: ym + '-01', valor: 0, acumulado: ac });
  return rows;
}

function buildFaixas() {
  const f: any[] = [];
  const add = (i: string, e: string | null, b: any[]) =>
    b.forEach(([v, al]: any, idx: number) =>
      f.push({ competencia_inicio: i, competencia_fim: e, faixa: idx + 1, valor_ate: v, aliquota: al }));
  for (const yr of ['2014','2015','2016','2017','2018','2019']) add(`${yr}-01-01`, `${yr}-12-01`, [[1399, 0.08], [2331, 0.09], [4663, 0.11]]);
  add('2020-01-01', '2020-02-01', [[1830, 0.08], [3050, 0.09], [6101, 0.11]]);
  add('2020-03-01', '2020-12-01', [[1045, 0.075], [2089, 0.09], [3134, 0.12], [6101, 0.14]]);
  for (const yr of ['2021','2022','2023','2024']) add(`${yr}-01-01`, `${yr}-12-01`, [[1100, 0.075], [2203, 0.09], [3305, 0.12], [6433, 0.14]]);
  add('2025-01-01', null, [[1518, 0.075], [2793, 0.09], [4190, 0.12], [8157, 0.14]]);
  return f;
}

function getCorpus(): string[] {
  const dirs = ['public/reports'];
  const files: string[] = [];
  for (const d of dirs) if (fs.existsSync(d)) {
    fs.readdirSync(d).filter(f => f.toLowerCase().endsWith('.pjc')).forEach(f => files.push(path.join(d, f)));
  }
  return files;
}

const corpus = getCorpus();

describe('Engine v3 — invariantes matemáticas', () => {
  const rows = buildIndices();
  const faixas = buildFaixas();

  for (const file of corpus) {
    const nome = path.basename(file, '.pjc');
    describe(nome, () => {
      let r: any;
      beforeAll(() => {
        const buf = fs.readFileSync(file);
        let xml: string;
        if (buf[0] === 0x50 && buf[1] === 0x4b)
          xml = execSync(`unzip -p "${file}"`, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
        else { const t = buf.toString('utf-8'); xml = (t.includes('<?xml') || t.includes('<Calculo')) ? t : buf.toString('latin1'); }
        const a = analyzePJC(xml);
        if (!a.resultado?.liquido_exequente) return;
        const inputs = convertPjcToEngineInputs(a);
        const eng = new PjeCalcEngineV3(
          inputs.params, inputs.historicos, inputs.faltas, inputs.ferias,
          inputs.verbas, inputs.cartaoPonto, inputs.fgtsConfig, inputs.csConfig,
          inputs.irConfig, inputs.correcaoConfig, inputs.honorariosConfig,
          inputs.custasConfig, inputs.seguroConfig, rows, faixas,
          [], inputs.excecoesCargas || [], [], inputs.prevPrivadaConfig,
          inputs.pensaoConfig, inputs.salarioFamiliaConfig,
        );
        r = eng.liquidar().resumo;
      });
      it('cs_segurado >= 0', () => { if (r) expect(r.cs_segurado).toBeGreaterThanOrEqual(0); });
      it('cs_empregador >= 0', () => { if (r) expect(r.cs_empregador).toBeGreaterThanOrEqual(0); });
      it('ir_retido >= 0', () => { if (r) expect(r.ir_retido).toBeGreaterThanOrEqual(0); });
      it('fgts_total >= 0', () => { if (r) expect(r.fgts_total).toBeGreaterThanOrEqual(0); });
      it('principal_corrigido >= principal_bruto (correção monetária)', () => {
        if (r) expect(r.principal_corrigido).toBeGreaterThanOrEqual(r.principal_bruto);
      });
      it('juros_mora >= 0', () => { if (r) expect(r.juros_mora).toBeGreaterThanOrEqual(0); });
      it('liquido_reclamante <= total_reclamada (deduções)', () => {
        if (r) expect(r.liquido_reclamante).toBeLessThanOrEqual(r.total_reclamada + 0.01);
      });
      it('total_reclamada = PC + juros + FGTS', () => {
        if (r) {
          const soma = r.principal_corrigido + r.juros_mora + r.fgts_total;
          expect(Math.abs(r.total_reclamada - soma)).toBeLessThan(0.05);
        }
      });
      it('honorarios_sucumbenciais >= 0', () => { if (r) expect(r.honorarios_sucumbenciais).toBeGreaterThanOrEqual(0); });
    });
  }
});
