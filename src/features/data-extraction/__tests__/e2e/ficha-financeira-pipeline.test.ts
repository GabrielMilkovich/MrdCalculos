import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import Decimal from 'decimal.js';
import { enriquecerRubricas, type RubricaCatalogo } from '../../enrichment/enrich-ficha-financeira';
import { validarFichaFinanceira } from '../../validators/ficha-financeira-validator';
import { buildFichaFinanceiraZip } from '../../export/per-doc/ficha-financeira-zip';
import type { RubricaEditavel } from '../../../../components/cases/data-extraction/hooks/useFichaFinanceiraReview';
import {
  CATEGORIA_PJE_TO_SLUG,
  type FichaCategoriaSlug,
} from '../../../../components/cases/data-extraction/ficha-financeira-types';

Decimal.set({ precision: 20 });

const CATALOGO_VIA_VAREJO: RubricaCatalogo[] = [
  { codigo: '0620', empregador: 'VIA_VAREJO', denominacao_canonica: 'Comissões', categoria_pje: 'comissao', classe_documento: 'PGTO', incide_fgts: true, incide_inss: true, incide_ir: true, natureza_indenizatoria: false, confianca: 'alta', origem: 'manual' },
  { codigo: '0501', empregador: 'VIA_VAREJO', denominacao_canonica: 'DSR (Comissão)', categoria_pje: 'dsr_comissao', classe_documento: 'PGTO', incide_fgts: true, incide_inss: true, incide_ir: true, natureza_indenizatoria: false, confianca: 'alta', origem: 'manual' },
  { codigo: '3290', empregador: 'VIA_VAREJO', denominacao_canonica: 'Prêmio Antecipado', categoria_pje: 'premio', classe_documento: 'PGTO', incide_fgts: true, incide_inss: true, incide_ir: true, natureza_indenizatoria: false, confianca: 'alta', origem: 'manual' },
  { codigo: '0712', empregador: 'VIA_VAREJO', denominacao_canonica: 'Mínimo Garantido', categoria_pje: 'minimo_garantido', classe_documento: 'PGTO', incide_fgts: true, incide_inss: true, incide_ir: true, natureza_indenizatoria: false, confianca: 'alta', origem: 'manual' },
  { codigo: '0040', empregador: 'VIA_VAREJO', denominacao_canonica: 'Participação Lucros', categoria_pje: 'plr', classe_documento: 'PGTO', incide_fgts: false, incide_inss: false, incide_ir: true, natureza_indenizatoria: true, confianca: 'alta', origem: 'manual' },
  { codigo: '5560', empregador: 'VIA_VAREJO', denominacao_canonica: 'INSS', categoria_pje: 'desconto_inss', classe_documento: 'DESC', incide_fgts: false, incide_inss: false, incide_ir: false, natureza_indenizatoria: false, confianca: 'alta', origem: 'manual' },
  { codigo: '5500', empregador: 'VIA_VAREJO', denominacao_canonica: 'IR Retido', categoria_pje: 'desconto_ir', classe_documento: 'DESC', incide_fgts: false, incide_inss: false, incide_ir: false, natureza_indenizatoria: false, confianca: 'alta', origem: 'manual' },
];

const RUBRICAS_ROQUE_2016 = [
  { codigo: '0620', denominacao: 'Comissões', classificacao: 'PGTO', categoria: 'comissao', valores_mensais: [
    { competencia: '2016-01', valor: 1309.42 }, { competencia: '2016-02', valor: 515.32 },
    { competencia: '2016-03', valor: 2100.00 }, { competencia: '2016-04', valor: 1800.00 },
    { competencia: '2016-05', valor: 950.00 }, { competencia: '2016-06', valor: 1732.25 },
  ]},
  { codigo: '0501', denominacao: 'DSR (Comissão)', classificacao: 'PGTO', categoria: 'dsr', valores_mensais: [
    { competencia: '2016-01', valor: 362.40 }, { competencia: '2016-02', valor: 27.10 },
    { competencia: '2016-03', valor: 580.00 }, { competencia: '2016-04', valor: 500.00 },
    { competencia: '2016-05', valor: 263.89 }, { competencia: '2016-06', valor: 481.18 },
  ]},
  { codigo: '3290', denominacao: 'Prêmio Antecipado', classificacao: 'PGTO', categoria: 'premio', valores_mensais: [
    { competencia: '2016-03', valor: 250.00 }, { competencia: '2016-06', valor: 300.00 },
  ]},
  { codigo: '0712', denominacao: 'Mínimo Garantido', classificacao: 'PGTO', categoria: 'salario_base', valores_mensais: [
    { competencia: '2016-02', valor: 880.00 },
  ]},
  { codigo: '0040', denominacao: 'Participação Lucros', classificacao: 'PGTO', categoria: 'outros', valores_mensais: [
    { competencia: '2016-06', valor: 1600.00 },
  ]},
  { codigo: '5560', denominacao: 'INSS', classificacao: 'DESC', categoria: 'desconto_inss', valores_mensais: [
    { competencia: '2016-01', valor: 125.15 }, { competencia: '2016-02', valor: 98.50 },
    { competencia: '2016-03', valor: 200.00 }, { competencia: '2016-04', valor: 180.00 },
  ]},
  { codigo: '5500', denominacao: 'IR Retido', classificacao: 'DESC', categoria: 'desconto_ir', valores_mensais: [
    { competencia: '2016-01', valor: 17.44 }, { competencia: '2016-03', valor: 44.20 },
  ]},
];

const TOTAIS_PDF_ROQUE: Map<string, number> = new Map([
  ['2016-01', 1671.82],
  ['2016-02', 1422.42],
  ['2016-03', 2930.00],
  ['2016-04', 2300.00],
  ['2016-05', 1213.89],
  ['2016-06', 4113.43],
]);

async function extractZipFiles(blob: Blob): Promise<Map<string, string>> {
  const buffer = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const files = new Map<string, string>();
  for (const [name, file] of Object.entries(zip.files)) {
    if (!file.dir) {
      files.set(name, await file.async('string'));
    }
  }
  return files;
}

describe('Pipeline e2e — caso ROQUE 2016 (mock)', () => {
  it('enrichment: catalogo cobre 7/7 rubricas do caso', () => {
    const result = enriquecerRubricas(RUBRICAS_ROQUE_2016, CATALOGO_VIA_VAREJO);

    expect(result.resumo.total_rubricas).toBe(7);
    expect(result.resumo.enriquecidas_catalogo).toBe(7);
    expect(result.resumo.nao_encontradas).toBe(0);
  });

  it('enrichment: PLR classificada como plr (natureza indenizatória)', () => {
    const result = enriquecerRubricas(RUBRICAS_ROQUE_2016, CATALOGO_VIA_VAREJO);
    const plr = result.rubricas.find((r) => r.codigo === '0040')!;

    expect(plr.categoria_catalogo).toBe('plr');
    expect(plr.natureza_indenizatoria).toBe(true);
    expect(plr.incide_fgts).toBe(false);
  });

  it('enrichment: DESC rubricas mantêm classificação desconto', () => {
    const result = enriquecerRubricas(RUBRICAS_ROQUE_2016, CATALOGO_VIA_VAREJO);
    const inss = result.rubricas.find((r) => r.codigo === '5560')!;
    const ir = result.rubricas.find((r) => r.codigo === '5500')!;

    expect(inss.categoria_catalogo).toBe('desconto_inss');
    expect(ir.categoria_catalogo).toBe('desconto_ir');
  });

  it('validation: soma de PGTO bate com totais PDF dentro de 1%', () => {
    const result = enriquecerRubricas(RUBRICAS_ROQUE_2016, CATALOGO_VIA_VAREJO);
    const validacao = validarFichaFinanceira(result.rubricas, TOTAIS_PDF_ROQUE, 1.0);

    expect(validacao.ok).toBe(true);
    expect(validacao.resumo.competencias_fora).toBe(0);
    for (const comp of validacao.competencias) {
      if (comp.status !== 'total_pdf_ausente') {
        expect(comp.delta_pct.toNumber()).toBeLessThan(1.0);
      }
    }
  });

  it('validation: pior delta < 0.01% (dados mock exatos)', () => {
    const result = enriquecerRubricas(RUBRICAS_ROQUE_2016, CATALOGO_VIA_VAREJO);
    const validacao = validarFichaFinanceira(result.rubricas, TOTAIS_PDF_ROQUE, 1.0);

    expect(validacao.resumo.pior_delta_pct.toNumber()).toBeLessThan(0.01);
  });

  it('pipeline completo: enrich → validate → export ZIP', async () => {
    const enriched = enriquecerRubricas(RUBRICAS_ROQUE_2016, CATALOGO_VIA_VAREJO);
    const validacao = validarFichaFinanceira(enriched.rubricas, TOTAIS_PDF_ROQUE, 1.0);

    const rubricasEditaveis: RubricaEditavel[] = enriched.rubricas.map((r) => {
      const slug = r.categoria_catalogo
        ? (CATEGORIA_PJE_TO_SLUG[r.categoria_catalogo] ?? 'salario_fixo')
        : 'salario_fixo';
      const isIgnorar = slug === 'ignorar' || r.classificacao?.toUpperCase() !== 'PGTO';
      const total = r.valores_mensais.reduce((a, v) => a.plus(new Decimal(v.valor)), new Decimal(0));
      return {
        ...r,
        categoria_atual: isIgnorar ? 'ignorar' as FichaCategoriaSlug : slug,
        incluida: !isIgnorar,
        modificada_pelo_operador: false,
        total_ano: total,
      };
    });

    const result = await buildFichaFinanceiraZip({
      ano: 2016,
      empregador: 'VIA_VAREJO',
      empregado: 'ROQUE GUERREIRO TEIXEIRA',
      rubricas: rubricasEditaveis,
      validacao: {
        ok: validacao.ok,
        competencias: validacao.competencias.map((c) => ({
          ...c,
          total_extraido: c.total_extraido.toNumber(),
          total_pdf: c.total_pdf?.toNumber() ?? null,
          delta_abs: c.delta_abs.toNumber(),
          delta_pct: c.delta_pct.toNumber(),
        })),
        resumo: {
          ...validacao.resumo,
          pior_delta_pct: validacao.resumo.pior_delta_pct.toNumber(),
        },
      },
      parserMeta: { fonte: 'deterministic' },
    });

    expect(result.filename).toBe('ficha_via_varejo_2016.zip');

    const files = await extractZipFiles(result.blob);
    expect(files.size).toBeGreaterThanOrEqual(4);

    expect(files.has('historico_salarial_comissao.csv')).toBe(true);
    expect(files.has('historico_salarial_dsr.csv')).toBe(true);
    expect(files.has('historico_salarial_premiacao.csv')).toBe(true);
    expect(files.has('historico_salarial_minimo_garantido.csv')).toBe(true);

    expect(files.has('auditoria_completa.csv')).toBe(true);
    expect(files.has('resumo_validacao.txt')).toBe(true);
    expect(files.has('metadata.json')).toBe(true);

    expect(result.resumo.rubricas_incluidas).toBeGreaterThan(0);
    expect(result.resumo.rubricas_ignoradas).toBeGreaterThan(0);
  });

  it('CSV comissões: 6 meses, formato PJe-Calc correto', async () => {
    const enriched = enriquecerRubricas(RUBRICAS_ROQUE_2016, CATALOGO_VIA_VAREJO);
    const validacao = validarFichaFinanceira(enriched.rubricas, TOTAIS_PDF_ROQUE, 1.0);

    const rubricasEditaveis: RubricaEditavel[] = enriched.rubricas.map((r) => {
      const slug = r.categoria_catalogo
        ? (CATEGORIA_PJE_TO_SLUG[r.categoria_catalogo] ?? 'salario_fixo')
        : 'salario_fixo';
      const isIgnorar = slug === 'ignorar' || r.classificacao?.toUpperCase() !== 'PGTO';
      const total = r.valores_mensais.reduce((a, v) => a.plus(new Decimal(v.valor)), new Decimal(0));
      return {
        ...r,
        categoria_atual: isIgnorar ? 'ignorar' as FichaCategoriaSlug : slug,
        incluida: !isIgnorar,
        modificada_pelo_operador: false,
        total_ano: total,
      };
    });

    const result = await buildFichaFinanceiraZip({
      ano: 2016,
      empregador: 'VIA_VAREJO',
      empregado: 'ROQUE GUERREIRO TEIXEIRA',
      rubricas: rubricasEditaveis,
      validacao: {
        ok: validacao.ok,
        competencias: validacao.competencias.map((c) => ({
          ...c,
          total_extraido: c.total_extraido.toNumber(),
          total_pdf: c.total_pdf?.toNumber() ?? null,
          delta_abs: c.delta_abs.toNumber(),
          delta_pct: c.delta_pct.toNumber(),
        })),
        resumo: {
          ...validacao.resumo,
          pior_delta_pct: validacao.resumo.pior_delta_pct.toNumber(),
        },
      },
    });

    const files = await extractZipFiles(result.blob);
    const csv = files.get('historico_salarial_comissao.csv')!;
    const linhas = csv.trim().split('\r\n');

    expect(linhas[0]).toContain('"MES_ANO"');
    expect(linhas[0]).toContain('"VALOR"');
    expect(linhas[0]).toContain('"FGTS"');
    expect(linhas.length).toBe(7);

    expect(csv).toContain('"01/2016"');
    expect(csv).toContain('"06/2016"');
    expect(csv).toContain('"S"');

    expect(csv).toContain('1309,42');
  });

  it('PLR e DESC são ignorados no ZIP (não geram historico CSV)', async () => {
    const enriched = enriquecerRubricas(RUBRICAS_ROQUE_2016, CATALOGO_VIA_VAREJO);

    const rubricasEditaveis: RubricaEditavel[] = enriched.rubricas.map((r) => {
      const slug = r.categoria_catalogo
        ? (CATEGORIA_PJE_TO_SLUG[r.categoria_catalogo] ?? 'salario_fixo')
        : 'salario_fixo';
      const isIgnorar = slug === 'ignorar' || r.classificacao?.toUpperCase() !== 'PGTO';
      const total = r.valores_mensais.reduce((a, v) => a.plus(new Decimal(v.valor)), new Decimal(0));
      return {
        ...r,
        categoria_atual: isIgnorar ? 'ignorar' as FichaCategoriaSlug : slug,
        incluida: !isIgnorar,
        modificada_pelo_operador: false,
        total_ano: total,
      };
    });

    const result = await buildFichaFinanceiraZip({
      ano: 2016,
      empregador: 'VIA_VAREJO',
      empregado: 'ROQUE',
      rubricas: rubricasEditaveis,
      validacao: { ok: true, competencias: [], resumo: { total_competencias: 0, competencias_ok: 0, competencias_fora: 0, competencias_sem_total: 0, pior_delta_pct: 0 } },
    });

    const files = await extractZipFiles(result.blob);
    expect(files.has('historico_salarial_ignorar.csv')).toBe(false);

    const auditoria = files.get('auditoria_completa.csv')!;
    expect(auditoria).toContain('5560');
    expect(auditoria).toContain('5500');
    expect(auditoria).toContain('0040');
  });

  it('auditoria CSV: 7 linhas de dados (todas as rubricas do caso)', async () => {
    const enriched = enriquecerRubricas(RUBRICAS_ROQUE_2016, CATALOGO_VIA_VAREJO);

    const rubricasEditaveis: RubricaEditavel[] = enriched.rubricas.map((r) => {
      const slug = r.categoria_catalogo
        ? (CATEGORIA_PJE_TO_SLUG[r.categoria_catalogo] ?? 'salario_fixo')
        : 'salario_fixo';
      const isIgnorar = slug === 'ignorar' || r.classificacao?.toUpperCase() !== 'PGTO';
      const total = r.valores_mensais.reduce((a, v) => a.plus(new Decimal(v.valor)), new Decimal(0));
      return {
        ...r,
        categoria_atual: isIgnorar ? 'ignorar' as FichaCategoriaSlug : slug,
        incluida: !isIgnorar,
        modificada_pelo_operador: false,
        total_ano: total,
      };
    });

    const result = await buildFichaFinanceiraZip({
      ano: 2016,
      empregador: 'VIA_VAREJO',
      empregado: 'ROQUE',
      rubricas: rubricasEditaveis,
      validacao: { ok: true, competencias: [], resumo: { total_competencias: 0, competencias_ok: 0, competencias_fora: 0, competencias_sem_total: 0, pior_delta_pct: 0 } },
    });

    const files = await extractZipFiles(result.blob);
    const auditoria = files.get('auditoria_completa.csv')!;
    const linhas = auditoria.trim().split('\r\n');
    expect(linhas).toHaveLength(8);
  });

  it('metadata JSON tem totais corretos por categoria', async () => {
    const enriched = enriquecerRubricas(RUBRICAS_ROQUE_2016, CATALOGO_VIA_VAREJO);

    const rubricasEditaveis: RubricaEditavel[] = enriched.rubricas.map((r) => {
      const slug = r.categoria_catalogo
        ? (CATEGORIA_PJE_TO_SLUG[r.categoria_catalogo] ?? 'salario_fixo')
        : 'salario_fixo';
      const isIgnorar = slug === 'ignorar' || r.classificacao?.toUpperCase() !== 'PGTO';
      const total = r.valores_mensais.reduce((a, v) => a.plus(new Decimal(v.valor)), new Decimal(0));
      return {
        ...r,
        categoria_atual: isIgnorar ? 'ignorar' as FichaCategoriaSlug : slug,
        incluida: !isIgnorar,
        modificada_pelo_operador: false,
        total_ano: total,
      };
    });

    const result = await buildFichaFinanceiraZip({
      ano: 2016,
      empregador: 'VIA_VAREJO',
      empregado: 'ROQUE',
      rubricas: rubricasEditaveis,
      validacao: { ok: true, competencias: [], resumo: { total_competencias: 0, competencias_ok: 0, competencias_fora: 0, competencias_sem_total: 0, pior_delta_pct: 0 } },
    });

    const files = await extractZipFiles(result.blob);
    const meta = JSON.parse(files.get('metadata.json')!);

    expect(meta.ano).toBe(2016);
    expect(meta.empregador).toBe('VIA_VAREJO');

    const comissao = meta.totais_por_categoria.find((c: { slug: string }) => c.slug === 'comissao');
    expect(comissao).toBeTruthy();
    expect(parseFloat(comissao.total)).toBeCloseTo(8406.99, 2);

    const dsr = meta.totais_por_categoria.find((c: { slug: string }) => c.slug === 'dsr');
    expect(dsr).toBeTruthy();
    expect(parseFloat(dsr.total)).toBeCloseTo(2214.57, 2);
  });
});
