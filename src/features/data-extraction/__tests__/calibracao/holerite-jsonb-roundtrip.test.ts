/**
 * Sprint 3c Fase 4.1 — testes de integração do round-trip JSONB.
 *
 * GAP METODOLÓGICO DA FASE 4: a calibração contra os 3 PDFs reais
 * chamou `mapper.mapear(doc)` e injetou o resultado direto no
 * `classifyHolerite` — mesmo runtime, sem serialização. Em PRODUÇÃO o
 * caminho V6 passa por `documents.parsed` JSONB no PostgreSQL: o
 * mapper Deno persiste, o frontend lê. Serialização JSON quebra
 * referências de objeto, pode ajustar tipos (null vs undefined,
 * arrays vs objetos) e expõe o type guard de `extrairRubricasClassificadasDoV6`.
 *
 * Estes 4 testes fecham esse gap. Validam que o pipeline real de
 * produção (parsed → JSON.stringify → JSON.parse → narrow → classify)
 * preserva semântica:
 *
 *   1. Round-trip preserva shape (extrair → array de length correto)
 *   2. Match por referência QUEBRA após JSONB, fallback (codigo,nome) salva
 *   3. E2E: classifyHolerite recebe JSONB-roundtripped → ontologia chega
 *   4. Type guard resiste a JSONB malformado (não crasha, retorna undefined)
 *
 * Drift warning logger.warn não exercitado aqui — vive dentro de
 * `generateExportForDocument` que exige mock Supabase pesado. Lógica
 * é testada indiretamente pelos 15 testes da Fase 2 (caminhos do
 * helper) e logicamente alcançável em produção via `logger.warn`.
 */

import { describe, expect, it } from 'vitest';
import { extrairRubricasClassificadasDoV6 } from '../../export/per-doc/extrair-rubricas-classificadas';
import { classifyHolerite } from '../../export/per-doc/holerite-classify';
import type {
  RubricaParseada,
  RubricaClassificada,
  CategoriaOntologiaRubrica,
} from '../../parsers/holerite/types';

const baseRubrica = (over: Partial<RubricaParseada>): RubricaParseada => ({
  codigo: null,
  nome: '',
  valor_vencimento: null,
  valor_desconto: null,
  quantidade: null,
  ordem: 0,
  ...over,
});

const baseClassificada = (
  rub: RubricaParseada,
  categoria: CategoriaOntologiaRubrica,
  over: Partial<RubricaClassificada> = {},
): RubricaClassificada => ({
  rubrica: rub,
  categoria,
  metodo_match: 'exato',
  score_match: 1.0,
  texto_canonico: rub.nome,
  divergencia_juridica: false,
  ...over,
});

/**
 * Simula o round-trip que acontece em produção: o mapper Deno popula
 * `documents.parsed` JSONB, o PostgreSQL serializa, o frontend lê de
 * volta via cliente Supabase. JSON.parse(JSON.stringify(...)) é uma
 * aproximação adequada — quebra referências, preserva valores
 * primitivos, não muta os shapes.
 */
function jsonRoundtrip<T>(v: T): unknown {
  return JSON.parse(JSON.stringify(v));
}

describe('Sprint 3c Fase 4.1 — JSONB round-trip (gap calibração)', () => {
  it('serialização preserva shape: parsed → JSON → extrair → array de length correto', () => {
    const rub1 = baseRubrica({
      codigo: '0712',
      nome: 'Mínimo Garantido - Comissão',
      valor_vencimento: 1500,
    });
    const rub2 = baseRubrica({
      codigo: '0620',
      nome: 'Comissões Produtos',
      valor_vencimento: 800,
      ordem: 1,
    });
    const rub3 = baseRubrica({
      codigo: '0501',
      nome: 'DSR(Comissão)',
      valor_vencimento: 120,
      ordem: 2,
    });
    const parsedOriginal = {
      competencia: '07/2021',
      layout_usado: 'holerite_via_varejo_v1',
      warnings: [],
      rubricas: [rub1, rub2, rub3],
      rubricas_classificadas: [
        baseClassificada(rub1, 'MINIMO_GARANTIDO'),
        baseClassificada(rub2, 'COMISSOES_PRODUTOS'),
        baseClassificada(rub3, 'DSR_S_COMISSOES'),
      ],
    };

    const roundtripped = jsonRoundtrip(parsedOriginal);
    const extraido = extrairRubricasClassificadasDoV6(roundtripped);

    expect(extraido).not.toBeUndefined();
    expect(Array.isArray(extraido)).toBe(true);
    expect(extraido!.length).toBe(3);
    expect(extraido![0].categoria).toBe('MINIMO_GARANTIDO');
    expect(extraido![1].categoria).toBe('COMISSOES_PRODUTOS');
    expect(extraido![2].categoria).toBe('DSR_S_COMISSOES');
    // E o score_match (número) sobreviveu sem perda
    expect(extraido![0].score_match).toBe(1.0);
  });

  it('match por referência QUEBRA após JSONB, fallback (codigo,nome) salva', () => {
    const rubOriginal = baseRubrica({
      codigo: '0712',
      nome: 'Mínimo Garantido - Comissão',
      valor_vencimento: 1500,
    });
    const rcOriginal = baseClassificada(rubOriginal, 'MINIMO_GARANTIDO');

    // Round-trip só do array de classificadas — simula o caso prod onde
    // o mapper Deno persiste `rubricas_classificadas` no JSONB e o
    // frontend chama parseHolerite SEPARADAMENTE sobre o ocr_text,
    // gerando rubrica nova com a mesma (codigo, nome) mas referência diferente.
    const rcSerializado = jsonRoundtrip([rcOriginal]) as RubricaClassificada[];

    // PRÉ-ASSERTION: confirma que a referência REALMENTE quebrou.
    // Sem isso o teste seria silenciosamente equivalente ao Object.is —
    // se a serialização preservasse referência (hipotético), o fallback
    // nunca seria exercitado e o teste passaria por acidente.
    expect(Object.is(rcSerializado[0].rubrica, rubOriginal)).toBe(false);

    // classifyHolerite chama buscarClassificacaoOntologia internamente.
    // Object.is falha → cai pro 2º loop (codigo, nome) → bate.
    const r = classifyHolerite({
      competencia: '07/2021',
      layout_usado: 'holerite_via_varejo_v1',
      warnings: [],
      rubricas: [rubOriginal],
      rubricas_classificadas: rcSerializado,
    });

    expect(r.linhas[0].origem).toBe('ontologia');
    expect(r.linhas[0].categoria).toBe('minimo_garantido');
    expect(r.linhas[0].classificacao_ontologia?.categoria_ontologia).toBe(
      'MINIMO_GARANTIDO',
    );
  });

  it('E2E: classifyHolerite recebe JSONB-roundtripped → ontologia chega correta + metadados preservados', () => {
    const rub1 = baseRubrica({
      codigo: '0712',
      nome: 'Mínimo Garantido - Comissão',
      valor_vencimento: 1500,
    });
    const rub2 = baseRubrica({
      codigo: '7680',
      nome: 'COMISSÕES PRODUTOS ONLINE',
      valor_vencimento: 13.18,
      ordem: 1,
    });
    const rub3 = baseRubrica({
      codigo: '5560',
      nome: 'INSS',
      valor_desconto: 122.43,
      ordem: 2,
    });

    const parsedOriginal = {
      competencia: '02/2021',
      layout_usado: 'holerite_via_varejo_v1',
      warnings: [],
      rubricas: [rub1, rub2, rub3],
      rubricas_classificadas: [
        baseClassificada(rub1, 'MINIMO_GARANTIDO', {
          metodo_match: 'sinonimo',
          score_match: 0.95,
          texto_canonico: 'Mínimo Garantido',
        }),
        baseClassificada(rub2, 'COMISSOES_PRODUTOS', {
          metodo_match: 'fuzzy',
          score_match: 0.87,
          divergencia_juridica: true,
        }),
        baseClassificada(rub3, 'DESCONSIDERADAS'),
      ],
    };

    // Pipeline real de produção emulado:
    //   mapper Deno serializa → JSONB → frontend lê → extrair → classify
    const v6ParsedFromJsonb = jsonRoundtrip(parsedOriginal);
    const extraido = extrairRubricasClassificadasDoV6(v6ParsedFromJsonb);
    expect(extraido).toBeDefined();
    expect(extraido!.length).toBe(3);

    const preview = classifyHolerite({
      competencia: '02/2021',
      layout_usado: 'holerite_via_varejo_v1',
      warnings: [],
      rubricas: [rub1, rub2, rub3], // referências originais (parser frontend)
      rubricas_classificadas: extraido, // referências serializadas (mapper Deno via JSONB)
    });

    // rub1 — minimo_garantido via ontologia
    expect(preview.linhas[0].origem).toBe('ontologia');
    expect(preview.linhas[0].categoria).toBe('minimo_garantido');
    expect(preview.linhas[0].classificacao_ontologia).toEqual({
      categoria_ontologia: 'MINIMO_GARANTIDO',
      metodo_match: 'sinonimo',
      score_match: 0.95,
      texto_canonico: 'Mínimo Garantido',
      divergencia_juridica: false,
    });

    // rub2 — comissao via ontologia, metadados de fuzzy preservados
    expect(preview.linhas[1].origem).toBe('ontologia');
    expect(preview.linhas[1].categoria).toBe('comissao');
    expect(preview.linhas[1].classificacao_ontologia?.metodo_match).toBe('fuzzy');
    expect(preview.linhas[1].classificacao_ontologia?.score_match).toBe(0.87);
    expect(preview.linhas[1].classificacao_ontologia?.divergencia_juridica).toBe(
      true,
    );

    // rub3 — INSS é desconto (camada 1.5 do classifier vence ontologia)
    // mesmo ontologia dizendo DESCONSIDERADAS, defesa-em-profundidade
    // mantém origem='desconto', não 'ontologia_desconsiderar'.
    expect(preview.linhas[2].origem).toBe('desconto');
    expect(preview.linhas[2].incluir).toBe(false);

    // E pelo menos 1 linha vem de ontologia (caminho real exercitado)
    const linhasOntologia = preview.linhas.filter(
      (l) => l.origem === 'ontologia' || l.origem === 'ontologia_desconsiderar',
    );
    expect(linhasOntologia.length).toBeGreaterThanOrEqual(1);
  });

  it('type guard resiste a JSONB malformado → undefined (não crasha)', () => {
    // Cenário 1: v6Parsed null
    expect(extrairRubricasClassificadasDoV6(null)).toBeUndefined();

    // Cenário 2: v6Parsed primitivo
    expect(extrairRubricasClassificadasDoV6('texto')).toBeUndefined();
    expect(extrairRubricasClassificadasDoV6(42)).toBeUndefined();

    // Cenário 3: v6Parsed sem o campo
    expect(extrairRubricasClassificadasDoV6({})).toBeUndefined();
    expect(
      extrairRubricasClassificadasDoV6({ rubricas: [] }),
    ).toBeUndefined();

    // Cenário 4: campo presente mas não-array
    expect(
      extrairRubricasClassificadasDoV6({ rubricas_classificadas: 'lista' }),
    ).toBeUndefined();
    expect(
      extrairRubricasClassificadasDoV6({ rubricas_classificadas: {} }),
    ).toBeUndefined();

    // Cenário 5: array vazio (caminho rápido)
    expect(
      extrairRubricasClassificadasDoV6({ rubricas_classificadas: [] }),
    ).toBeUndefined();

    // Cenário 6: chaves obrigatórias faltando → undefined
    expect(
      extrairRubricasClassificadasDoV6({
        rubricas_classificadas: [{ categoria: 'MINIMO_GARANTIDO' }],
      }),
    ).toBeUndefined();
    expect(
      extrairRubricasClassificadasDoV6({
        rubricas_classificadas: [{ rubrica: {} }],
      }),
    ).toBeUndefined();

    // Cenário 7: categoria não-string → undefined
    expect(
      extrairRubricasClassificadasDoV6({
        rubricas_classificadas: [{ rubrica: {}, categoria: 42 }],
      }),
    ).toBeUndefined();
    expect(
      extrairRubricasClassificadasDoV6({
        rubricas_classificadas: [{ rubrica: {}, categoria: null }],
      }),
    ).toBeUndefined();

    // Cenário 8: array misto — uma entrada inválida invalida todas
    // (fail-safe: se 1 item está corrompido, não confio em nenhum).
    const valido = baseClassificada(
      baseRubrica({ codigo: '0001', nome: 'OK', valor_vencimento: 100 }),
      'MINIMO_GARANTIDO',
    );
    expect(
      extrairRubricasClassificadasDoV6({
        rubricas_classificadas: [
          valido,
          { rubrica: {}, categoria: null },
        ],
      }),
    ).toBeUndefined();

    // Sanity: o caso válido sozinho passa (não é o test guard que rejeita)
    const ok = extrairRubricasClassificadasDoV6({
      rubricas_classificadas: [valido],
    });
    expect(ok).toBeDefined();
    expect(ok!.length).toBe(1);

    // Cenário 9 (FRAGILIDADE CONHECIDA — Sprint 3c.1):
    //
    // O type guard atual só checa que a chave `rubrica` EXISTE, não que
    // seja objeto não-nulo. JSONB com `{ rubrica: null, categoria:
    // 'STRING_QUALQUER' }` passa porque:
    //   - `'rubrica' in rc` → true (chave presente, mesmo com valor null)
    //   - `'categoria' in rc` + `typeof categoria === 'string'` → true
    //
    // Comportamento atual = fail-silent: o helper retorna o array, e
    // `buscarClassificacaoOntologia` faria match por (codigo, nome) que
    // falha em runtime (rubrica.codigo crash em null pointer) OU, no
    // melhor caso, ninguém bate e a camada 2 vira no-op.
    //
    // Sprint 3c.1 endurece o guard adicionando:
    //   !!(rc as {rubrica:unknown}).rubrica &&
    //   typeof (rc as {rubrica:unknown}).rubrica === 'object' &&
    //   CATEGORIAS_VALIDAS.has(categoria as string)
    //
    // Por ora documentamos a fragilidade — assertion intencional pra
    // pegar mudança de comportamento (se Sprint 3c.1 apertar o guard,
    // este teste FALHA propositadamente e é atualizado pra `undefined`).
    const fragilidade = extrairRubricasClassificadasDoV6({
      rubricas_classificadas: [{ rubrica: null, categoria: 'INVALID' }],
    });
    expect(fragilidade).toBeDefined(); // fail-silent atual
    expect(fragilidade!.length).toBe(1);
  });
});
