/**
 * E2E suite — pipeline OCR -> extract-and-fill -> auto-fill proposals.
 *
 * Como API keys do Mistral/OpenAI nao estao em CI, MOCKAMOS:
 *   - `fetch` global (Mistral OCR + OpenAI structured extract)
 *   - supabase storage (upload do PDF)
 *   - supabase from('auto_fill_proposals').insert(...)
 *
 * Para cada um dos 5 cenarios sinteticos (CTPS, TRCT, Holerite, Sentenca,
 * Peticao Inicial) validamos que:
 *   1) o pipeline mockado gera o conjunto esperado de propostas
 *   2) `authority_score` corresponde ao da AUTHORITY_MATRIX
 *   3) status='pendente'
 *   4) conflitantes detectados quando 2 docs divergem
 *
 * O cenario composto roda 5 documentos juntos com data_admissao em
 * conflito (CTPS=2018-03-15 vs HOLERITE=2018-04-01) e confirma que CTPS
 * vence, e que o resolver registra HOLERITE como perdedor.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// IMPORTANTE: o mock de supabase deve vir ANTES do import do proposal-engine.
// Capturamos cada chamada `.from(...).insert(...)` em `inserts`.
const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];

vi.mock('@/integrations/supabase/client', () => {
  const fakeChain = (table: string) => ({
    insert: (row: Record<string, unknown>) => ({
      select: () => ({
        single: async () => {
          const id = `prop-${inserts.length + 1}`;
          inserts.push({ table, row: { ...row, id } });
          return { data: { id }, error: null };
        },
      }),
    }),
    select: () => ({
      eq: () => ({
        order: () => ({}),
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
      }),
    }),
    update: () => ({ eq: async () => ({ data: null, error: null }) }),
  });
  return {
    supabase: {
      from: (table: string) => fakeChain(table),
      storage: {
        from: () => ({
          upload: async () => ({ data: { path: 'fake/path.pdf' }, error: null }),
          createSignedUrl: async () => ({ data: { signedUrl: 'https://fake/file.pdf' }, error: null }),
        }),
      },
      auth: { getUser: async () => ({ data: { user: { id: 'user-test' } } }) },
    },
  };
});

import { criarPropostas } from '../proposal-engine';
import {
  AUTHORITY_MATRIX,
  type CampoAutoFill,
  type CandidatoCampo,
  type DocumentoTipo,
  resolveCampo,
  temConflito,
} from '../document-authority';
import {
  ALL_FIXTURES,
  FIXTURE_CTPS,
  FIXTURE_HOLERITE,
  FIXTURE_HOLERITE_CONFLITO,
  FIXTURE_PETICAO,
  FIXTURE_SENTENCA,
  FIXTURE_TRCT,
  pairsFromExtracted,
  type OcrFixture,
} from './ocr-fixtures';

// ----------------------------------------------------------------------------
// MOCK do pipeline upload + Mistral + OpenAI
// ----------------------------------------------------------------------------
//
// Simula o `processDocumentInBackground` do edge function, mas executavel em
// vitest. Cada etapa foi extraida do `supabase/functions/extract-and-fill/
// index.ts` para preservar a paridade com o codigo de producao.

interface MockMistralResponse {
  pages: Array<{ markdown: string; index: number }>;
  text: string;
}

/** Mock do fetch global para Mistral OCR + OpenAI chat. */
function instalarMockFetch(fixture: OcrFixture): ReturnType<typeof vi.fn> {
  const mistralResp: MockMistralResponse = {
    pages: [{ markdown: fixture.mistral_text, index: 0 }],
    text: fixture.mistral_text,
  };

  const openaiResp = {
    choices: [
      {
        message: {
          content: JSON.stringify(fixture.openai_extracted),
        },
      },
    ],
  };

  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes('mistral.ai') || u.includes('mistral')) {
      return new Response(JSON.stringify(mistralResp), { status: 200 });
    }
    if (u.includes('openai.com') || u.includes('openai')) {
      return new Response(JSON.stringify(openaiResp), { status: 200 });
    }
    return new Response('not-found', { status: 404 });
  });

  // Vitest globalThis.fetch reassign — sem `as any`.
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/**
 * Replica do `extrairPropostas()` do edge function. Mantida em paralelo aqui
 * para poder rodar em vitest (Node), mas o algoritmo eh identico ao
 * supabase/functions/extract-and-fill/index.ts:1249.
 */
function extrairPropostasLocal(
  docTipo: DocumentoTipo,
  fixture: OcrFixture,
): Map<CampoAutoFill, CandidatoCampo[]> {
  const out = new Map<CampoAutoFill, CandidatoCampo[]>();
  const pares = pairsFromExtracted(fixture.openai_extracted);
  for (const { campo, valor } of pares) {
    const authority = AUTHORITY_MATRIX[campo][docTipo];
    if (!authority || authority <= 0) continue;
    const cand: CandidatoCampo = {
      doc_tipo: docTipo,
      document_id: `doc-${docTipo}-${campo}`,
      valor,
      confianca: fixture.openai_extracted.confianca_geral,
      extraido_em: new Date('2026-04-29T12:00:00Z'),
      evidencia: `pagina-1`,
    };
    out.set(campo, [cand]);
  }
  return out;
}

// ----------------------------------------------------------------------------
// SETUP por teste — limpa inserts e fetch mock
// ----------------------------------------------------------------------------
beforeEach(() => {
  inserts.length = 0;
  vi.unstubAllGlobals();
});

// ----------------------------------------------------------------------------
// 1. Cenarios individuais (5 documentos)
// ----------------------------------------------------------------------------

describe('OCR pipeline E2E — cenarios individuais', () => {
  it('A. CTPS: cria proposta para data_admissao com authority CTPS=100', async () => {
    instalarMockFetch(FIXTURE_CTPS);
    const cands = extrairPropostasLocal('CTPS', FIXTURE_CTPS);
    const ids = await criarPropostas('case-A', cands);

    expect(ids.length).toBeGreaterThan(0);
    const dataAdmissao = inserts.find(i => i.row.campo === 'data_admissao');
    expect(dataAdmissao).toBeDefined();
    expect(dataAdmissao?.row.doc_tipo).toBe('CTPS');
    expect(dataAdmissao?.row.valor_proposto).toBe('2018-03-15');
    expect(dataAdmissao?.row.authority_score).toBeCloseTo(100, 0);
    expect(dataAdmissao?.row.status).toBe('pendente');
    expect(Array.isArray(dataAdmissao?.row.conflitantes)).toBe(true);
    expect((dataAdmissao?.row.conflitantes as unknown[]).length).toBe(0);

    // Todos os campos esperados foram propostos
    for (const campoEsperado of FIXTURE_CTPS.expected_campos) {
      const found = inserts.find(i => i.row.campo === campoEsperado);
      expect(found, `campo ${campoEsperado} deveria virar proposta`).toBeDefined();
    }
  });

  it('B. TRCT: cria proposta para data_demissao com authority TRCT=100', async () => {
    instalarMockFetch(FIXTURE_TRCT);
    const cands = extrairPropostasLocal('TRCT', FIXTURE_TRCT);
    const ids = await criarPropostas('case-B', cands);

    expect(ids.length).toBeGreaterThan(0);
    const dataDemissao = inserts.find(i => i.row.campo === 'data_demissao');
    expect(dataDemissao?.row.doc_tipo).toBe('TRCT');
    expect(dataDemissao?.row.valor_proposto).toBe('2024-06-30');
    expect(dataDemissao?.row.authority_score).toBeCloseTo(100, 0);
    expect(dataDemissao?.row.status).toBe('pendente');

    const tipoDemissao = inserts.find(i => i.row.campo === 'tipo_demissao');
    expect(tipoDemissao?.row.valor_proposto).toBe('sem_justa_causa');
    expect(tipoDemissao?.row.authority_score).toBeCloseTo(100, 0);

    const salario = inserts.find(i => i.row.campo === 'salario_base');
    expect(salario?.row.authority_score).toBeCloseTo(100, 0); // TRCT=100 para salario_base
  });

  it('C. Holerite: rubrica mensal nao vira proposta de data_admissao (authority insuficiente)', async () => {
    instalarMockFetch(FIXTURE_HOLERITE);
    const cands = extrairPropostasLocal('HOLERITE', FIXTURE_HOLERITE);
    await criarPropostas('case-C', cands);

    // Holerite tem authority 90 para salario_base
    const salario = inserts.find(i => i.row.campo === 'salario_base');
    expect(salario?.row.doc_tipo).toBe('HOLERITE');
    expect(salario?.row.authority_score).toBeCloseTo(90, 0);

    // Holerite nao tem campo data_admissao no fixture (omitido) — nao deve haver insert
    const admissao = inserts.find(i => i.row.campo === 'data_admissao');
    expect(admissao).toBeUndefined();

    // CNPJ holerite = 100
    const cnpj = inserts.find(i => i.row.campo === 'reclamada_cnpj');
    expect(cnpj?.row.authority_score).toBeCloseTo(100, 0);
  });

  it('D. Sentenca: numero_processo + tribunal com authority SENTENCA=100', async () => {
    instalarMockFetch(FIXTURE_SENTENCA);
    const cands = extrairPropostasLocal('SENTENCA', FIXTURE_SENTENCA);
    await criarPropostas('case-D', cands);

    const num = inserts.find(i => i.row.campo === 'numero_processo');
    expect(num?.row.valor_proposto).toBe('1234567-89.2023.5.02.0001');
    expect(num?.row.authority_score).toBeCloseTo(100, 0);

    const trib = inserts.find(i => i.row.campo === 'tribunal');
    expect(trib?.row.valor_proposto).toBe('TRT-2');
    expect(trib?.row.authority_score).toBeCloseTo(100, 0);

    const vara = inserts.find(i => i.row.campo === 'vara');
    expect(vara?.row.authority_score).toBeCloseTo(100, 0);
  });

  it('E. Peticao Inicial: data_ajuizamento com authority PETICAO=100', async () => {
    instalarMockFetch(FIXTURE_PETICAO);
    const cands = extrairPropostasLocal('PETICAO_INICIAL', FIXTURE_PETICAO);
    await criarPropostas('case-E', cands);

    const ajuiz = inserts.find(i => i.row.campo === 'data_ajuizamento');
    expect(ajuiz?.row.valor_proposto).toBe('2025-01-10');
    expect(ajuiz?.row.authority_score).toBeCloseTo(100, 0);
    expect(ajuiz?.row.doc_tipo).toBe('PETICAO_INICIAL');

    // Peticao tem authority BAIXA para data_admissao (30) — proposta deve existir
    // mas com score baixo. Numa composicao com CTPS, perderia.
    const adm = inserts.find(i => i.row.campo === 'data_admissao');
    expect(adm?.row.authority_score).toBeCloseTo(30, 0);
  });
});

// ----------------------------------------------------------------------------
// 2. Cenario composto — 5 documentos com conflito em data_admissao
// ----------------------------------------------------------------------------

describe('OCR pipeline E2E — cenario composto (5 docs + conflito)', () => {
  it('CTPS=2018-03-15 vs HOLERITE=2018-04-01 → CTPS vence pelo authority', () => {
    // Ambos extraem data_admissao, mas valores diferentes
    const cands: CandidatoCampo[] = [
      {
        doc_tipo: 'CTPS',
        document_id: 'doc-ctps',
        valor: '2018-03-15',
        confianca: FIXTURE_CTPS.openai_extracted.confianca_geral,
        extraido_em: new Date('2026-04-29T12:00:00Z'),
      },
      {
        doc_tipo: 'HOLERITE',
        document_id: 'doc-holerite',
        valor: '2018-04-01',
        confianca: FIXTURE_HOLERITE_CONFLITO.openai_extracted.confianca_geral,
        extraido_em: new Date('2026-04-29T12:01:00Z'),
      },
    ];

    expect(temConflito('data_admissao', cands, { tipo: 'data' })).toBe(true);

    const r = resolveCampo('data_admissao', cands);
    expect(r).not.toBeNull();
    expect(r?.vencedor.doc_tipo).toBe('CTPS');
    expect(r?.vencedor.valor).toBe('2018-03-15');
    expect(r?.motivo).toBe('authority');
    expect(r?.perdedores.length).toBe(1);
    expect(r?.perdedores[0].doc_tipo).toBe('HOLERITE');
  });

  it('persiste 1 proposta unica para data_admissao com CTPS vencedor + HOLERITE em conflitantes', async () => {
    instalarMockFetch(FIXTURE_CTPS);

    const cands = new Map<CampoAutoFill, CandidatoCampo[]>([
      [
        'data_admissao',
        [
          {
            doc_tipo: 'CTPS',
            document_id: 'doc-ctps',
            valor: '2018-03-15',
            confianca: 0.95,
            extraido_em: new Date('2026-04-29T12:00:00Z'),
          },
          {
            doc_tipo: 'HOLERITE',
            document_id: 'doc-holerite',
            valor: '2018-04-01',
            confianca: 0.90,
            extraido_em: new Date('2026-04-29T12:01:00Z'),
          },
        ],
      ],
    ]);

    const ids = await criarPropostas('case-conflito', cands);
    expect(ids.length).toBe(1);

    const proposta = inserts[0].row;
    expect(proposta.campo).toBe('data_admissao');
    expect(proposta.doc_tipo).toBe('CTPS');
    expect(proposta.valor_proposto).toBe('2018-03-15');
    expect(proposta.motivo_resolucao).toBe('authority');
    expect(proposta.status).toBe('pendente');

    const conflitantes = proposta.conflitantes as Array<{ doc_tipo: string; valor: string }>;
    expect(conflitantes.length).toBe(1);
    expect(conflitantes[0].doc_tipo).toBe('HOLERITE');
    expect(conflitantes[0].valor).toBe('2018-04-01');
  });

  it('5 documentos juntos: cada doc contribui com seus campos de maior authority', async () => {
    instalarMockFetch(FIXTURE_PETICAO);

    // Compoe candidatos por campo a partir dos 5 fixtures.
    const all = new Map<CampoAutoFill, CandidatoCampo[]>();
    const docTipos: DocumentoTipo[] = [
      'CTPS',
      'TRCT',
      'HOLERITE',
      'SENTENCA',
      'PETICAO_INICIAL',
    ];
    const fixtures: OcrFixture[] = [
      FIXTURE_CTPS,
      FIXTURE_TRCT,
      FIXTURE_HOLERITE,
      FIXTURE_SENTENCA,
      FIXTURE_PETICAO,
    ];

    for (let i = 0; i < fixtures.length; i++) {
      const fx = fixtures[i];
      const tipo = docTipos[i];
      const pares = pairsFromExtracted(fx.openai_extracted);
      for (const { campo, valor } of pares) {
        const authority = AUTHORITY_MATRIX[campo][tipo];
        if (!authority || authority <= 0) continue;
        const cand: CandidatoCampo = {
          doc_tipo: tipo,
          document_id: `doc-${tipo}`,
          valor,
          confianca: fx.openai_extracted.confianca_geral,
          extraido_em: new Date(`2026-04-29T12:0${i}:00Z`),
        };
        const existing = all.get(campo) ?? [];
        existing.push(cand);
        all.set(campo, existing);
      }
    }

    await criarPropostas('case-composto', all);

    // data_admissao: CTPS (100) vs TRCT (90) vs PETICAO (30) → CTPS vence
    const adm = inserts.find(i => i.row.campo === 'data_admissao');
    expect(adm?.row.doc_tipo).toBe('CTPS');
    expect(adm?.row.valor_proposto).toBe('2018-03-15');
    expect(adm?.row.motivo_resolucao).toBe('authority');
    expect((adm?.row.conflitantes as unknown[]).length).toBeGreaterThanOrEqual(1);

    // data_demissao: TRCT (100) vs PETICAO (40) → TRCT vence
    const dem = inserts.find(i => i.row.campo === 'data_demissao');
    expect(dem?.row.doc_tipo).toBe('TRCT');
    expect(dem?.row.valor_proposto).toBe('2024-06-30');

    // numero_processo: SENTENCA (100) vs PETICAO (100) → empate; confidence ou recency decide.
    // Como confianca SENTENCA=0.91 > PETICAO=0.86, SENTENCA vence.
    const num = inserts.find(i => i.row.campo === 'numero_processo');
    expect(num?.row.doc_tipo).toBe('SENTENCA');

    // data_ajuizamento: so PETICAO (100) tem (sentenca fixture nao inclui)
    const ajuiz = inserts.find(i => i.row.campo === 'data_ajuizamento');
    expect(ajuiz?.row.doc_tipo).toBe('PETICAO_INICIAL');

    // reclamada_cnpj: TRCT (100) e HOLERITE (100) e CTPS (95) — TRCT/HOLERITE empatam
    // confianca TRCT=0.93 > HOLERITE=0.88 → TRCT vence
    const cnpj = inserts.find(i => i.row.campo === 'reclamada_cnpj');
    expect(cnpj?.row.doc_tipo).toBe('TRCT');
  });
});

// ----------------------------------------------------------------------------
// 3. Validacoes da matriz authority (sanity)
// ----------------------------------------------------------------------------

describe('OCR pipeline E2E — sanity da matriz authority', () => {
  it('todas as 5 fixtures contem tipo_documento mapeavel para um DocumentoTipo', () => {
    for (const fx of ALL_FIXTURES) {
      expect(fx.doc_tipo).toBeDefined();
      // garante que o tipo bate com algum entry na matriz authority
      const algumCampoComAuthority = (Object.keys(AUTHORITY_MATRIX) as CampoAutoFill[]).some(
        campo => (AUTHORITY_MATRIX[campo][fx.doc_tipo] ?? 0) > 0,
      );
      expect(algumCampoComAuthority, `${fx.doc_tipo} deve ter algum campo com authority > 0`).toBe(true);
    }
  });

  it('mistral mock retorna texto OCR contendo termos-chave por fixture', async () => {
    for (const fx of ALL_FIXTURES) {
      const fetchMock = instalarMockFetch(fx);
      const resp = await fetch('https://api.mistral.ai/v1/ocr');
      const body = (await resp.json()) as { text: string };
      expect(body.text.length).toBeGreaterThan(0);
      expect(fetchMock).toHaveBeenCalled();
    }
  });

  it('openai mock retorna JSON estruturado com tipo_documento e confianca_geral', async () => {
    for (const fx of ALL_FIXTURES) {
      instalarMockFetch(fx);
      const resp = await fetch('https://api.openai.com/v1/chat/completions');
      const body = (await resp.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const parsed = JSON.parse(body.choices[0].message.content) as {
        tipo_documento: string;
        confianca_geral: number;
      };
      expect(parsed.tipo_documento).toBe(fx.openai_extracted.tipo_documento);
      expect(parsed.confianca_geral).toBeGreaterThan(0);
      expect(parsed.confianca_geral).toBeLessThanOrEqual(1);
    }
  });

  it('pairsFromExtracted descarta valores vazios/nulos', () => {
    const pares = pairsFromExtracted(FIXTURE_HOLERITE.openai_extracted);
    // Holerite nao tem data_admissao nem data_demissao no fixture
    expect(pares.find(p => p.campo === 'data_admissao')).toBeUndefined();
    expect(pares.find(p => p.campo === 'data_demissao')).toBeUndefined();
    // mas tem reclamada_cnpj
    expect(pares.find(p => p.campo === 'reclamada_cnpj')?.valor).toBe('12.345.678/0001-90');
  });
});
