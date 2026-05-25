import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import Decimal from 'decimal.js';
import {
  buildFichaFinanceiraZip,
  type FichaFinanceiraZipInput,
} from '../ficha-financeira-zip';
import type { RubricaEditavel } from '../../../../../components/cases/data-extraction/hooks/useFichaFinanceiraReview';

function makeRubrica(overrides: Partial<RubricaEditavel> = {}): RubricaEditavel {
  return {
    codigo: '0620',
    denominacao: 'Comissões',
    classificacao: 'PGTO',
    categoria: 'comissao',
    categoria_catalogo: 'comissao',
    classe_catalogo: 'PGTO',
    incide_fgts: true,
    incide_inss: true,
    incide_ir: true,
    natureza_indenizatoria: false,
    origem_enriquecimento: 'catalogo',
    valores_mensais: [
      { competencia: '2016-01', valor: 1000 },
      { competencia: '2016-02', valor: 2000 },
    ],
    categoria_atual: 'comissao',
    incluida: true,
    modificada_pelo_operador: false,
    total_ano: new Decimal(3000),
    ...overrides,
  };
}

function makeInput(rubricas: RubricaEditavel[]): FichaFinanceiraZipInput {
  return {
    ano: 2016,
    empregador: 'VIA_VAREJO',
    empregado: 'ROQUE GUERREIRO',
    rubricas,
    validacao: {
      ok: true,
      competencias: [
        { competencia: '2016-01', total_extraido: 1000, total_pdf: 1000, delta_abs: 0, delta_pct: 0, status: 'ok' },
        { competencia: '2016-02', total_extraido: 2000, total_pdf: 2000, delta_abs: 0, delta_pct: 0, status: 'ok' },
      ],
      resumo: {
        total_competencias: 2,
        competencias_ok: 2,
        competencias_fora: 0,
        competencias_sem_total: 0,
        pior_delta_pct: 0,
      },
    },
  };
}

async function extractFiles(blob: Blob): Promise<Map<string, string>> {
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

describe('buildFichaFinanceiraZip', () => {
  it('ZIP contém os 4 tipos de arquivo esperados', async () => {
    const result = await buildFichaFinanceiraZip(makeInput([makeRubrica()]));
    const files = await extractFiles(result.blob);

    expect(files.has('historico_salarial_comissao.csv')).toBe(true);
    expect(files.has('auditoria_completa.csv')).toBe(true);
    expect(files.has('resumo_validacao.txt')).toBe(true);
    expect(files.has('metadata.json')).toBe(true);
  });

  it('1 categoria 2 meses: CSV tem 2 linhas de dados + header', async () => {
    const result = await buildFichaFinanceiraZip(makeInput([makeRubrica()]));
    const files = await extractFiles(result.blob);
    const csv = files.get('historico_salarial_comissao.csv')!;
    const linhas = csv.trim().split('\r\n');
    expect(linhas[0]).toContain('MES_ANO');
    expect(linhas.length).toBe(3);
  });

  it('2 categorias geram 2 CSVs distintos', async () => {
    const rubricas = [
      makeRubrica({ codigo: '0620', categoria_atual: 'comissao' }),
      makeRubrica({ codigo: '0501', categoria_atual: 'dsr', valores_mensais: [{ competencia: '2016-01', valor: 500 }], total_ano: new Decimal(500) }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);

    expect(files.has('historico_salarial_comissao.csv')).toBe(true);
    expect(files.has('historico_salarial_dsr.csv')).toBe(true);
    expect(result.resumo.categorias).toHaveLength(2);
  });

  it('categoria ignorar não gera CSV', async () => {
    const rubricas = [
      makeRubrica({ codigo: '5560', categoria_atual: 'ignorar', incluida: false }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);

    const historicos = [...files.keys()].filter((k) => k.startsWith('historico_salarial_'));
    expect(historicos).toHaveLength(0);
    expect(result.resumo.rubricas_incluidas).toBe(0);
    expect(result.resumo.rubricas_ignoradas).toBe(1);
  });

  it('rubrica incluida=false não entra no CSV', async () => {
    const rubricas = [
      makeRubrica({ codigo: '0620', incluida: false }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);

    const historicos = [...files.keys()].filter((k) => k.startsWith('historico_salarial_'));
    expect(historicos).toHaveLength(0);
  });

  it('2 rubricas mesma categoria + mesmo mês: valor consolidado', async () => {
    const rubricas = [
      makeRubrica({
        codigo: '0620',
        categoria_atual: 'comissao',
        valores_mensais: [{ competencia: '2016-01', valor: 1000 }],
        total_ano: new Decimal(1000),
      }),
      makeRubrica({
        codigo: '3393',
        categoria_atual: 'comissao',
        valores_mensais: [{ competencia: '2016-01', valor: 500 }],
        total_ano: new Decimal(500),
      }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);
    const csv = files.get('historico_salarial_comissao.csv')!;
    const linhas = csv.trim().split('\r\n');
    expect(linhas).toHaveLength(2);
    expect(csv).toContain('1500,00');
  });

  it('conversão de formato: 2016-03 → 03/2016 no CSV', async () => {
    const rubricas = [
      makeRubrica({
        valores_mensais: [{ competencia: '2016-03', valor: 1234.56 }],
        total_ano: new Decimal(1234.56),
      }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);
    const csv = files.get('historico_salarial_comissao.csv')!;

    expect(csv).toContain('03/2016');
    expect(csv).not.toContain('2016-03');
  });

  it('Decimal precisão: 5234.67 não perde centavos', async () => {
    const rubricas = [
      makeRubrica({
        valores_mensais: [{ competencia: '2016-01', valor: 5234.67 }],
        total_ano: new Decimal(5234.67),
      }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);
    const csv = files.get('historico_salarial_comissao.csv')!;
    expect(csv).toContain('5234,67');
  });

  it('auditoria_completa.csv contém TODAS as rubricas', async () => {
    const rubricas = [
      makeRubrica({ codigo: '0620', incluida: true }),
      makeRubrica({ codigo: '5560', categoria_atual: 'ignorar', incluida: false, total_ano: new Decimal(100) }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);
    const auditoria = files.get('auditoria_completa.csv')!;

    expect(auditoria).toContain('0620');
    expect(auditoria).toContain('5560');
    expect(auditoria).toContain('Incluido');
    const linhas = auditoria.trim().split('\r\n');
    expect(linhas).toHaveLength(3);
  });

  it('resumo_validacao.txt com ok=true começa com "Resultado: OK"', async () => {
    const result = await buildFichaFinanceiraZip(makeInput([makeRubrica()]));
    const files = await extractFiles(result.blob);
    const txt = files.get('resumo_validacao.txt')!;
    expect(txt.startsWith('Resultado: OK')).toBe(true);
  });

  it('resumo_validacao.txt com ok=false lista competências fora', async () => {
    const input = makeInput([makeRubrica()]);
    input.validacao = {
      ok: false,
      competencias: [
        { competencia: '2016-01', total_extraido: 1000, total_pdf: 1200, delta_abs: 200, delta_pct: 16.67, status: 'fora_tolerancia' },
      ],
      resumo: {
        total_competencias: 1,
        competencias_ok: 0,
        competencias_fora: 1,
        competencias_sem_total: 0,
        pior_delta_pct: 16.67,
      },
    };

    const result = await buildFichaFinanceiraZip(input);
    const files = await extractFiles(result.blob);
    const txt = files.get('resumo_validacao.txt')!;

    expect(txt).toContain('FORA DE TOLERÂNCIA');
    expect(txt).toContain('2016-01');
    expect(txt).toContain('16.67%');
  });

  it('metadata.json é parsável e tem campos esperados', async () => {
    const result = await buildFichaFinanceiraZip(makeInput([makeRubrica()]));
    const files = await extractFiles(result.blob);
    const meta = JSON.parse(files.get('metadata.json')!);

    expect(meta.versao_exporter).toBe('1.0.0');
    expect(meta.ano).toBe(2016);
    expect(meta.empregador).toBe('VIA_VAREJO');
    expect(meta.empregado).toBe('ROQUE GUERREIRO');
    expect(meta.validacao.ok).toBe(true);
    expect(Array.isArray(meta.totais_por_categoria)).toBe(true);
  });

  it('filename segue padrão ficha_<emp>_<ano>.zip', async () => {
    const result = await buildFichaFinanceiraZip(makeInput([makeRubrica()]));
    expect(result.filename).toBe('ficha_via_varejo_2016.zip');
  });
});
