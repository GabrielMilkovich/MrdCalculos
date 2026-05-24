/**
 * Testes dos narrowing helpers de `documents.parsed` JSONB.
 *
 * Foco: garantir que `extrairResumoClassificacaoDoV6` recuperar o
 * `resumo_classificacao` quando ele existe no JSONB, e retornar
 * `undefined` em todos os formatos malformados — porque é a fonte
 * única que alimenta o banner V2 no Dialog (vide
 * HoleritePreviewDialog:533 + per-doc/index.ts hotfix Sprint 3c).
 */
import { describe, it, expect } from 'vitest';
import {
  extrairRubricasClassificadasDoV6,
  extrairResumoClassificacaoDoV6,
} from '../extrair-rubricas-classificadas';

describe('extrairRubricasClassificadasDoV6', () => {
  it('extrai array válido de rubricas classificadas do JSONB', () => {
    const v6 = {
      rubricas_classificadas: [
        {
          rubrica: { nome: 'Salário Base', valor_vencimento: 1000 },
          categoria: 'MINIMO_GARANTIDO',
          metodo_match: 'exato',
          score_match: 1,
          texto_canonico: 'Salário Base',
          divergencia_juridica: false,
        },
      ],
    };
    const out = extrairRubricasClassificadasDoV6(v6);
    expect(out).toBeDefined();
    expect(out).toHaveLength(1);
    expect(out![0].categoria).toBe('MINIMO_GARANTIDO');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['string', 'oi'],
    ['array vazio', { rubricas_classificadas: [] }],
    ['campo ausente', {}],
    ['campo wrong type', { rubricas_classificadas: 'oi' }],
    ['entry sem categoria', { rubricas_classificadas: [{ rubrica: {} }] }],
  ])('retorna undefined quando v6Parsed é %s', (_label, input) => {
    expect(extrairRubricasClassificadasDoV6(input)).toBeUndefined();
  });
});

describe('extrairResumoClassificacaoDoV6 (hotfix Sprint 3c)', () => {
  it('extrai resumo válido do JSONB (caso ROSICLEIA real em prod)', () => {
    const v6 = {
      resumo_classificacao: {
        total_rubricas: 572,
        classificadas: 382,
        nao_classificadas: 190,
        por_metodo: {
          exato: 34,
          normalizado: 162,
          sinonimo: 152,
          fuzzy: 34,
          nao_encontrado: 190,
        },
        base_dsr_comissoes_produtos_centavos: 0,
        base_dsr_comissoes_servicos_centavos: 0,
        base_dsr_premios_centavos: 0,
        dsr_ja_pago_centavos: 0,
        minimo_garantido_centavos: 0,
        desconsiderado_centavos: 0,
        nao_classificadas_centavos: 0,
        rubricas_nao_classificadas: ['INSS', 'Vale Transporte'],
      },
    };
    const out = extrairResumoClassificacaoDoV6(v6);
    expect(out).toBeDefined();
    expect(out!.total_rubricas).toBe(572);
    expect(out!.nao_classificadas).toBe(190);
    expect(out!.rubricas_nao_classificadas).toContain('INSS');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['string', 'oi'],
    ['campo ausente', {}],
    ['campo null', { resumo_classificacao: null }],
    ['campo wrong type', { resumo_classificacao: 'oi' }],
    [
      'sem nao_classificadas',
      { resumo_classificacao: { total_rubricas: 10 } },
    ],
    [
      'nao_classificadas não-número',
      { resumo_classificacao: { nao_classificadas: 'muitas' } },
    ],
  ])('retorna undefined quando v6Parsed é %s', (_label, input) => {
    expect(extrairResumoClassificacaoDoV6(input)).toBeUndefined();
  });

  it('aceita resumo com nao_classificadas = 0 (zero é número válido)', () => {
    // Banner ainda não renderiza por causa do `> 0` do condicional, mas o
    // helper retorna o resumo — comportamento corretamente delegado pro caller.
    const v6 = {
      resumo_classificacao: {
        total_rubricas: 10,
        classificadas: 10,
        nao_classificadas: 0,
        por_metodo: { exato: 10, normalizado: 0, sinonimo: 0, fuzzy: 0, nao_encontrado: 0 },
        base_dsr_comissoes_produtos_centavos: 0,
        base_dsr_comissoes_servicos_centavos: 0,
        base_dsr_premios_centavos: 0,
        dsr_ja_pago_centavos: 0,
        minimo_garantido_centavos: 0,
        desconsiderado_centavos: 0,
        nao_classificadas_centavos: 0,
        rubricas_nao_classificadas: [],
      },
    };
    const out = extrairResumoClassificacaoDoV6(v6);
    expect(out).toBeDefined();
    expect(out!.nao_classificadas).toBe(0);
  });
});
