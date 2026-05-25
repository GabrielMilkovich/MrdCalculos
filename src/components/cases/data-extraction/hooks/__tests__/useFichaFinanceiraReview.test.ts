// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import Decimal from 'decimal.js';
import { useFichaFinanceiraReview } from '../useFichaFinanceiraReview';
import type { FichaFinanceiraParsed } from '../../ficha-financeira-types';
import type { RubricaEnriquecida } from '@/features/data-extraction/enrichment/enrich-ficha-financeira';

function makeRubrica(overrides: Partial<RubricaEnriquecida> = {}): RubricaEnriquecida {
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
    ...overrides,
  };
}

function makeParsed(rubricas: RubricaEnriquecida[]): FichaFinanceiraParsed {
  return {
    ano: 2016,
    empregado: 'Test',
    empresa: 'Via Varejo',
    rubricas,
    enriquecimento: {
      total_rubricas: rubricas.length,
      enriquecidas_catalogo: rubricas.filter((r) => r.origem_enriquecimento === 'catalogo').length,
      enriquecidas_parser: rubricas.filter((r) => r.origem_enriquecimento === 'parser').length,
      nao_encontradas: rubricas.filter((r) => r.origem_enriquecimento === 'nao_encontrado').length,
      codigos_nao_encontrados: rubricas
        .filter((r) => r.origem_enriquecimento === 'nao_encontrado')
        .map((r) => r.codigo),
    },
    validacao: {
      ok: true,
      competencias: [],
      resumo: {
        total_competencias: 0,
        competencias_ok: 0,
        competencias_fora: 0,
        competencias_sem_total: 0,
        pior_delta_pct: 0,
      },
    },
    _meta: { parser: 'test' },
  };
}

describe('useFichaFinanceiraReview', () => {
  it('auto-classifica rubricas catalogadas', () => {
    const parsed = makeParsed([
      makeRubrica({ codigo: '0620', categoria_catalogo: 'comissao' }),
      makeRubrica({ codigo: '0501', categoria_catalogo: 'dsr_comissao' }),
    ]);

    const { result } = renderHook(() => useFichaFinanceiraReview(parsed));

    expect(result.current.rubricasNaoClassificadas).toBe(0);
    expect(result.current.conflitos).toBe(0);
    expect(result.current.podeConfirmar).toBe(true);
    expect(result.current.rubricas[0].categoria_atual).toBe('comissao');
    expect(result.current.rubricas[1].categoria_atual).toBe('dsr');
  });

  it('marca nao_encontrado como nao_classificada', () => {
    const parsed = makeParsed([
      makeRubrica({ codigo: '0620', categoria_catalogo: 'comissao' }),
      makeRubrica({
        codigo: '9999',
        categoria_catalogo: null,
        categoria: 'outros',
        origem_enriquecimento: 'nao_encontrado',
      }),
      makeRubrica({
        codigo: '8888',
        categoria_catalogo: null,
        categoria: 'outros',
        origem_enriquecimento: 'nao_encontrado',
      }),
    ]);

    const { result } = renderHook(() => useFichaFinanceiraReview(parsed));

    expect(result.current.rubricasNaoClassificadas).toBe(2);
    expect(result.current.podeConfirmar).toBe(false);
  });

  it('setCategoria resolve nao_classificada', () => {
    const parsed = makeParsed([
      makeRubrica({
        codigo: '9999',
        categoria_catalogo: null,
        categoria: 'outros',
        origem_enriquecimento: 'nao_encontrado',
      }),
    ]);

    const { result } = renderHook(() => useFichaFinanceiraReview(parsed));
    expect(result.current.rubricasNaoClassificadas).toBe(1);

    act(() => {
      result.current.setCategoria('9999', 'premiacao');
    });

    expect(result.current.rubricasNaoClassificadas).toBe(0);
    expect(result.current.podeConfirmar).toBe(true);
    expect(result.current.rubricas[0].categoria_atual).toBe('premiacao');
    expect(result.current.rubricas[0].modificada_pelo_operador).toBe(true);
  });

  it('reclassificar rubrica catalogada conta como conflito', () => {
    const parsed = makeParsed([
      makeRubrica({ codigo: '0620', categoria_catalogo: 'comissao' }),
    ]);

    const { result } = renderHook(() => useFichaFinanceiraReview(parsed));
    expect(result.current.conflitos).toBe(0);

    act(() => {
      result.current.setCategoria('0620', 'salario_fixo');
    });

    expect(result.current.conflitos).toBe(1);
  });

  it('toggleIncluida funciona e atualiza totais', () => {
    const parsed = makeParsed([
      makeRubrica({
        codigo: '0620',
        categoria_catalogo: 'comissao',
        valores_mensais: [{ competencia: '2016-01', valor: 1000 }],
      }),
    ]);

    const { result } = renderHook(() => useFichaFinanceiraReview(parsed));

    const comissaoBefore = result.current.totaisPorCategoria.get('comissao');
    expect(comissaoBefore?.toNumber()).toBe(1000);

    act(() => {
      result.current.toggleIncluida('0620');
    });

    const comissaoAfter = result.current.totaisPorCategoria.get('comissao');
    expect(comissaoAfter).toBeUndefined();
    expect(result.current.rubricas[0].incluida).toBe(false);
  });

  it('totaisPorCategoria usa Decimal com precisão 20', () => {
    const parsed = makeParsed([
      makeRubrica({
        codigo: '0620',
        categoria_catalogo: 'comissao',
        valores_mensais: [
          { competencia: '2016-01', valor: 1234.56 },
          { competencia: '2016-02', valor: 7890.12 },
        ],
      }),
    ]);

    const { result } = renderHook(() => useFichaFinanceiraReview(parsed));
    const total = result.current.totaisPorCategoria.get('comissao');
    expect(total).toBeInstanceOf(Decimal);
    expect(total?.toFixed(2)).toBe('9124.68');
  });

  it('DESC rubricas são auto-classificadas como ignorar', () => {
    const parsed = makeParsed([
      makeRubrica({
        codigo: '5560',
        classificacao: 'DESC',
        categoria_catalogo: 'desconto_inss',
        origem_enriquecimento: 'catalogo',
      }),
    ]);

    const { result } = renderHook(() => useFichaFinanceiraReview(parsed));

    expect(result.current.rubricas[0].categoria_atual).toBe('ignorar');
    expect(result.current.rubricas[0].incluida).toBe(false);
  });

  it('mesesOrdenados retorna competências em ordem', () => {
    const parsed = makeParsed([
      makeRubrica({
        codigo: '0620',
        valores_mensais: [
          { competencia: '2016-03', valor: 100 },
          { competencia: '2016-01', valor: 200 },
          { competencia: '2016-02', valor: 300 },
        ],
      }),
    ]);

    const { result } = renderHook(() => useFichaFinanceiraReview(parsed));

    expect(result.current.mesesOrdenados).toEqual(['2016-01', '2016-02', '2016-03']);
  });

  it('setCategoria com justificativa é preservada', () => {
    const parsed = makeParsed([
      makeRubrica({ codigo: '0620', categoria_catalogo: 'comissao' }),
    ]);

    const { result } = renderHook(() => useFichaFinanceiraReview(parsed));

    act(() => {
      result.current.setCategoria('0620', 'premiacao', 'Reclassificado por advogado');
    });

    expect(result.current.rubricas[0].justificativa).toBe('Reclassificado por advogado');
  });

  it('nao_encontrado com classificação não-PGTO NÃO conta como nao_classificada', () => {
    const parsed = makeParsed([
      makeRubrica({
        codigo: '5500',
        classificacao: 'DESC',
        categoria_catalogo: null,
        categoria: 'outros',
        origem_enriquecimento: 'nao_encontrado',
      }),
    ]);

    const { result } = renderHook(() => useFichaFinanceiraReview(parsed));
    expect(result.current.rubricasNaoClassificadas).toBe(0);
  });
});
