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

describe('buildFichaFinanceiraZip (taxonomia planilha-dsr v2)', () => {
  it('ZIP contém arquivos básicos + CSV do grupo da rubrica', async () => {
    // Código 0620 (Comissões) → grupo comissao_produtos (prefixo 02)
    const result = await buildFichaFinanceiraZip(makeInput([makeRubrica()]));
    const files = await extractFiles(result.blob);

    expect(files.has('02_comissao_produtos.csv')).toBe(true);
    expect(files.has('auditoria_completa.csv')).toBe(true);
    expect(files.has('resumo_validacao.txt')).toBe(true);
    expect(files.has('metadata.json')).toBe(true);
  });

  it('1 grupo com 2 meses: CSV tem 2 linhas de dados + header', async () => {
    const result = await buildFichaFinanceiraZip(makeInput([makeRubrica()]));
    const files = await extractFiles(result.blob);
    const csv = files.get('02_comissao_produtos.csv')!;
    const linhas = csv.trim().split('\r\n');
    expect(linhas[0]).toContain('MES_ANO');
    expect(linhas.length).toBe(3);
  });

  it('Header oficial PJe-Calc Cidadão byte-a-byte', async () => {
    const result = await buildFichaFinanceiraZip(makeInput([makeRubrica()]));
    const files = await extractFiles(result.blob);
    const csv = files.get('02_comissao_produtos.csv')!;
    expect(csv.startsWith(
      '"MES_ANO";"VALOR";"FGTS";"FGTS_REC.";"CONTRIBUICAO_SOCIAL";"CONTRIBUICAO_SOCIAL_REC."'
    )).toBe(true);
  });

  it('2 grupos distintos geram 2 CSVs separados', async () => {
    const rubricas = [
      makeRubrica({ codigo: '0620' }), // → comissao_produtos
      makeRubrica({
        codigo: '0501',
        denominacao: 'DSR (Comissão)',
        valores_mensais: [{ competencia: '2016-01', valor: 500 }],
        total_ano: new Decimal(500),
      }), // → dsr_comissao
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);

    expect(files.has('02_comissao_produtos.csv')).toBe(true);
    expect(files.has('03_dsr_comissao.csv')).toBe(true);
    expect(result.resumo.grupos).toHaveLength(2);
  });

  it('código 5560 (INSS) → desconsiderado, NÃO gera CSV principal', async () => {
    const rubricas = [
      makeRubrica({ codigo: '5560', denominacao: 'INSS', incluida: true }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);

    const csvsPjc = [...files.keys()].filter((k) => /^\d{2}_/.test(k));
    expect(csvsPjc).toHaveLength(0);
    // Mas DEVE gerar auditoria_desconsideradas.csv
    expect(files.has('auditoria_desconsideradas.csv')).toBe(true);
  });

  it('rubrica incluida=false → desconsiderado, vai pra auditoria não pro CSV', async () => {
    const rubricas = [
      makeRubrica({ codigo: '0620', incluida: false }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);

    const csvsPjc = [...files.keys()].filter((k) => /^\d{2}_/.test(k));
    expect(csvsPjc).toHaveLength(0);
    expect(result.resumo.rubricas_excluidas_pelo_operador).toBe(1);
  });

  it('2 rubricas no MESMO grupo + mesmo mês: valor consolidado', async () => {
    // 0620 (comissão) + 3317 (adic. sábado com) ambos → comissao_produtos
    const rubricas = [
      makeRubrica({
        codigo: '0620',
        valores_mensais: [{ competencia: '2016-01', valor: 1000 }],
        total_ano: new Decimal(1000),
      }),
      makeRubrica({
        codigo: '3317',
        denominacao: 'Adic. Sábado Com. 25%',
        valores_mensais: [{ competencia: '2016-01', valor: 500 }],
        total_ano: new Decimal(500),
      }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);
    const csv = files.get('02_comissao_produtos.csv')!;
    const linhas = csv.trim().split('\r\n');
    expect(linhas).toHaveLength(2); // header + 1 mês consolidado
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
    const csv = files.get('02_comissao_produtos.csv')!;

    expect(csv).toContain('03/2016');
    expect(csv).not.toContain('2016-03');
  });

  it('Decimal precisão: 5234.67 não perde centavos, formato sem milhar', async () => {
    const rubricas = [
      makeRubrica({
        valores_mensais: [{ competencia: '2016-01', valor: 5234.67 }],
        total_ano: new Decimal(5234.67),
      }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);
    const csv = files.get('02_comissao_produtos.csv')!;
    // Valida formato oficial PJe-Calc: sem separador de milhar
    expect(csv).toContain('"5234,67"');
    expect(csv).not.toContain('"5.234,67"');
  });

  it('auditoria_completa.csv contém TODAS as rubricas (incluídas + excluídas)', async () => {
    const rubricas = [
      makeRubrica({ codigo: '0620', incluida: true }),
      makeRubrica({ codigo: '5560', denominacao: 'INSS', categoria_atual: 'ignorar', incluida: false, total_ano: new Decimal(100) }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);
    const auditoria = files.get('auditoria_completa.csv')!;

    expect(auditoria).toContain('0620');
    expect(auditoria).toContain('5560');
    expect(auditoria).toContain('Grupo_Export');
    expect(auditoria).toContain('Confianca');
    const linhas = auditoria.trim().split('\r\n');
    expect(linhas).toHaveLength(3); // header + 2 rubricas
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

  it('metadata.json reflete nova taxonomia v2', async () => {
    const result = await buildFichaFinanceiraZip(makeInput([makeRubrica()]));
    const files = await extractFiles(result.blob);
    const meta = JSON.parse(files.get('metadata.json')!);

    expect(meta.versao_exporter).toBe('2.0.0-planilha-dsr');
    expect(meta.classificacao_taxonomia).toBe('planilha-comissao-dsr-mrd-v1');
    expect(meta.ano).toBe(2016);
    expect(meta.empregador).toBe('VIA_VAREJO');
    expect(meta.empregado).toBe('ROQUE GUERREIRO');
    expect(meta.validacao.ok).toBe(true);
    expect(Array.isArray(meta.totais_por_grupo)).toBe(true);
    expect(meta.totais_por_grupo[0].slug).toBe('comissao_produtos');
    expect(meta.totais_por_grupo[0].nome_pjecalc).toBe('Comissões sobre Produtos');
  });

  it('filename segue padrão ficha_<emp>_<ano>.zip', async () => {
    const result = await buildFichaFinanceiraZip(makeInput([makeRubrica()]));
    expect(result.filename).toBe('ficha_via_varejo_2016.zip');
  });

  // ===== Testes específicos da taxonomia planilha-dsr =====

  it('caso ROQUE 2016: 6 rubricas → 4 grupos (3 CSV pra import + auditoria_desconsideradas)', async () => {
    const rubricas: RubricaEditavel[] = [
      makeRubrica({
        codigo: '0712',
        denominacao: 'Mínimo Garantido',
        valores_mensais: [{ competencia: '2016-01', valor: 1000 }],
        total_ano: new Decimal(1000),
      }), // → 01_minimo_garantido
      makeRubrica({
        codigo: '0620',
        denominacao: 'Comissões',
        valores_mensais: [{ competencia: '2016-01', valor: 1308.70 }],
        total_ano: new Decimal(1308.70),
      }), // → 02_comissao_produtos
      makeRubrica({
        codigo: '0501',
        denominacao: 'DSR(Comissão)',
        valores_mensais: [{ competencia: '2016-01', valor: 361.79 }],
        total_ano: new Decimal(361.79),
      }), // → 03_dsr_comissao
      makeRubrica({
        codigo: '3290',
        denominacao: 'PREMIO ANTECIPADO',
        valores_mensais: [{ competencia: '2016-01', valor: 178.97 }],
        total_ano: new Decimal(178.97),
      }), // → 05_premios
      // Desconsiderados
      makeRubrica({
        codigo: '0040',
        denominacao: 'Participação Lucros',
        valores_mensais: [{ competencia: '2016-01', valor: 1600 }],
        total_ano: new Decimal(1600),
      }),
      makeRubrica({
        codigo: '2750',
        denominacao: 'Media de Férias',
        valores_mensais: [{ competencia: '2016-01', valor: 2333.73 }],
        total_ano: new Decimal(2333.73),
      }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);

    expect(files.has('01_minimo_garantido.csv')).toBe(true);
    expect(files.has('02_comissao_produtos.csv')).toBe(true);
    expect(files.has('03_dsr_comissao.csv')).toBe(true);
    expect(files.has('05_premios.csv')).toBe(true);
    expect(files.has('auditoria_desconsideradas.csv')).toBe(true);

    // Não deve gerar CSV pra grupos vazios
    expect(files.has('04_comissao_servicos.csv')).toBe(false);
    expect(files.has('06_salario_substituicao.csv')).toBe(false);

    // Auditoria desconsideradas tem PLR e Média Férias
    const aud = files.get('auditoria_desconsideradas.csv')!;
    expect(aud).toContain('0040');
    expect(aud).toContain('2750');
  });

  it('classificação por nome (código novo) — fuzzy/substring funciona', async () => {
    const rubricas = [
      makeRubrica({
        codigo: '9999', // não catalogado
        denominacao: 'Premio Mensal',
        valores_mensais: [{ competencia: '2016-01', valor: 100 }],
        total_ano: new Decimal(100),
      }),
    ];
    const result = await buildFichaFinanceiraZip(makeInput(rubricas));
    const files = await extractFiles(result.blob);
    // Premio Mensal está em PRÊMIOS na planilha → grupo 05
    expect(files.has('05_premios.csv')).toBe(true);
  });
});
