import { describe, expect, it } from 'vitest';
import { composeHistoricoSalarial } from '../composer/historico-salarial';
import type { RubricaExtraida } from '../types';

const r = (over: Partial<RubricaExtraida>): RubricaExtraida => ({
  id: 'r' + Math.random(),
  document_id: 'd1',
  case_id: 'c1',
  competencia: '06/2016',
  codigo: '0620',
  nome: 'Comissões',
  nome_normalizado: 'comissoes',
  valor: 100,
  quantidade: null,
  desconto: null,
  categoria_id: 'cat-comissao',
  classificacao_origem: 'memo',
  origem: 'ocr_ai',
  ordem_no_documento: 0,
  ...over,
});

const docs = (m: Record<string, string>) => new Map(Object.entries(m));

describe('composeHistoricoSalarial', () => {
  it('1 doc, mesma competência, 3 rubricas → soma única', () => {
    const result = composeHistoricoSalarial(
      [
        r({ valor: 100 }),
        r({ valor: 200 }),
        r({ valor: 300 }),
      ],
      'cat-comissao',
      docs({ d1: 'doc1.pdf' }),
    );
    expect(result.linhas).toHaveLength(1);
    expect(result.linhas[0]).toMatchObject({ competencia: '06/2016', valor: 600 });
    expect(result.conflitos).toHaveLength(0);
  });

  it('2 docs sem sobreposição → linhas concatenadas, 0 conflitos', () => {
    const result = composeHistoricoSalarial(
      [
        r({ document_id: 'd1', competencia: '06/2016', valor: 100 }),
        r({ document_id: 'd2', competencia: '07/2016', valor: 200 }),
      ],
      'cat-comissao',
      docs({ d1: 'doc1', d2: 'doc2' }),
    );
    expect(result.linhas).toHaveLength(2);
    expect(result.conflitos).toHaveLength(0);
  });

  it('2 docs mesma competência, valores idênticos → dedup, 1 linha', () => {
    const result = composeHistoricoSalarial(
      [
        r({ document_id: 'd1', valor: 100 }),
        r({ document_id: 'd2', valor: 100 }),
      ],
      'cat-comissao',
      docs({ d1: 'doc1', d2: 'doc2' }),
    );
    expect(result.linhas).toHaveLength(1);
    expect(result.linhas[0].documentos_origem).toHaveLength(2);
    expect(result.conflitos).toHaveLength(0);
  });

  it('valores dentro da tolerância (R$ 0,01) → dedup', () => {
    const result = composeHistoricoSalarial(
      [
        r({ document_id: 'd1', valor: 100.0 }),
        r({ document_id: 'd2', valor: 100.005 }),
      ],
      'cat-comissao',
      docs({ d1: 'doc1', d2: 'doc2' }),
    );
    expect(result.linhas).toHaveLength(1);
    expect(result.conflitos).toHaveLength(0);
  });

  it('2 docs valores divergentes → 0 linhas, 1 conflito', () => {
    const result = composeHistoricoSalarial(
      [
        r({ document_id: 'd1', valor: 1500 }),
        r({ document_id: 'd2', valor: 1498 }),
      ],
      'cat-comissao',
      docs({ d1: 'doc1', d2: 'doc2' }),
    );
    expect(result.linhas).toHaveLength(0);
    expect(result.conflitos).toHaveLength(1);
    expect(result.conflitos[0].candidatos).toHaveLength(2);
  });

  it('conflito resolvido → 1 linha do doc escolhido', () => {
    const result = composeHistoricoSalarial(
      [
        r({ document_id: 'd1', valor: 1500 }),
        r({ document_id: 'd2', valor: 1498 }),
      ],
      'cat-comissao',
      docs({ d1: 'doc1', d2: 'doc2' }),
      [{ competencia: '06/2016', document_id_escolhido: 'd2' }],
    );
    expect(result.linhas).toHaveLength(1);
    expect(result.linhas[0].valor).toBe(1498);
    expect(result.conflitos).toHaveLength(0);
  });

  it('rubrica sem categoria_id (null) não entra', () => {
    const result = composeHistoricoSalarial(
      [r({ categoria_id: null, valor: 100 })],
      'cat-comissao',
      docs({ d1: 'doc1' }),
    );
    expect(result.linhas).toHaveLength(0);
    expect(result.conflitos).toHaveLength(0);
  });

  it('rubrica de outra categoria não entra', () => {
    const result = composeHistoricoSalarial(
      [r({ categoria_id: 'outra', valor: 100 })],
      'cat-comissao',
      docs({ d1: 'doc1' }),
    );
    expect(result.linhas).toHaveLength(0);
  });

  it('linhas ordenadas por competência crescente', () => {
    const result = composeHistoricoSalarial(
      [
        r({ document_id: 'd1', competencia: '12/2016', valor: 100 }),
        r({ document_id: 'd2', competencia: '01/2017', valor: 200 }),
        r({ document_id: 'd3', competencia: '06/2016', valor: 300 }),
      ],
      'cat-comissao',
      docs({ d1: 'a', d2: 'b', d3: 'c' }),
    );
    expect(result.linhas.map((l) => l.competencia)).toEqual([
      '06/2016',
      '12/2016',
      '01/2017',
    ]);
  });
});
