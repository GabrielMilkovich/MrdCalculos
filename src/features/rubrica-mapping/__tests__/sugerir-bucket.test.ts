import { describe, expect, it, vi } from 'vitest';
import {
  sugerirBucketRubrica,
  validarSugestao,
  SugerirBucketError,
} from '../sugerir-bucket';

type MockClient = Parameters<typeof sugerirBucketRubrica>[0];

function makeSupabaseMock(
  invokeReturn: { data?: unknown; error?: { message: string } | null },
): MockClient {
  return {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: invokeReturn.data ?? null,
        error: invokeReturn.error ?? null,
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('validarSugestao', () => {
  it('aceita payload válido', () => {
    const out = validarSugestao({
      bucket: 'premios',
      confianca: 'alta',
      justificativa: 'Premio de produtividade.',
    });
    expect(out.bucket).toBe('premios');
    expect(out.confianca).toBe('alta');
  });

  it('rejeita bucket fora da lista', () => {
    expect(() =>
      validarSugestao({
        bucket: 'salario_base',
        confianca: 'alta',
        justificativa: 'x',
      }),
    ).toThrow(SugerirBucketError);
  });

  it('rejeita confianca inválida', () => {
    expect(() =>
      validarSugestao({
        bucket: 'desconsiderar',
        confianca: 'absoluta',
        justificativa: 'x',
      }),
    ).toThrow(SugerirBucketError);
  });

  it('rejeita payload nulo', () => {
    expect(() => validarSugestao(null)).toThrow(SugerirBucketError);
  });

  it('aceita justificativa ausente como string vazia', () => {
    const out = validarSugestao({
      bucket: 'desconsiderar',
      confianca: 'baixa',
    });
    expect(out.justificativa).toBe('');
  });
});

describe('sugerirBucketRubrica', () => {
  it('rejeita rubrica vazia sem chamar edge function', async () => {
    const supabase = makeSupabaseMock({});
    await expect(
      sugerirBucketRubrica(supabase, { rubrica: '   ' }),
    ).rejects.toThrow(SugerirBucketError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((supabase as any).functions.invoke).not.toHaveBeenCalled();
  });

  it('rejeita rubrica > 200 chars', async () => {
    const supabase = makeSupabaseMock({});
    await expect(
      sugerirBucketRubrica(supabase, { rubrica: 'x'.repeat(201) }),
    ).rejects.toThrow(SugerirBucketError);
  });

  it('repassa erro do edge function como SugerirBucketError', async () => {
    const supabase = makeSupabaseMock({
      error: { message: 'rede caiu' },
    });
    await expect(
      sugerirBucketRubrica(supabase, { rubrica: 'COMISSAO LIVRE' }),
    ).rejects.toThrow(/rede caiu/);
  });

  it('lança quando edge function devolve {error}', async () => {
    const supabase = makeSupabaseMock({
      data: { error: 'OPENAI_API_KEY não configurada' },
    });
    await expect(
      sugerirBucketRubrica(supabase, { rubrica: 'COMISSAO LIVRE' }),
    ).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it('valida e devolve sugestão quando ok', async () => {
    const supabase = makeSupabaseMock({
      data: {
        sugestao: {
          bucket: 'comissoes_produtos',
          confianca: 'alta',
          justificativa: 'comissão sobre venda de mercadorias.',
        },
        usage: { total_tokens: 123 },
      },
    });
    const out = await sugerirBucketRubrica(supabase, {
      rubrica: 'COMISSAO PRODUTOS',
      layout: 'via_varejo',
    });
    expect(out.sugestao.bucket).toBe('comissoes_produtos');
    expect(out.usage?.total_tokens).toBe(123);
  });

  it('rejeita quando edge function devolve sugestão fora da lista', async () => {
    const supabase = makeSupabaseMock({
      data: {
        sugestao: {
          bucket: 'salario_base',
          confianca: 'alta',
          justificativa: 'x',
        },
      },
    });
    await expect(
      sugerirBucketRubrica(supabase, { rubrica: 'X' }),
    ).rejects.toThrow(SugerirBucketError);
  });

  it('passa layout default "generico" quando ausente', async () => {
    const invokeMock = vi.fn().mockResolvedValue({
      data: {
        sugestao: {
          bucket: 'desconsiderar',
          confianca: 'media',
          justificativa: 'x',
        },
      },
      error: null,
    });
    const supabase = {
      functions: { invoke: invokeMock },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    await sugerirBucketRubrica(supabase, { rubrica: 'X' });
    expect(invokeMock).toHaveBeenCalledWith('sugerir-bucket-rubrica', {
      body: { rubrica: 'X', layout: 'generico' },
    });
  });
});
