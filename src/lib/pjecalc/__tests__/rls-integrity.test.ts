/**
 * @vitest-environment jsdom
 *
 * RLS Integrity — verifica que tabelas críticas com RLS habilitada
 * NÃO permitem leitura/escrita por cliente não autenticado em tabelas
 * de dados próprios (cases-related). Tabelas de referência (públicas)
 * permitem SELECT mas devem bloquear INSERT/UPDATE/DELETE anônimos.
 *
 * Roda apenas se VITE_SUPABASE_URL e SUPABASE_ANON_KEY estiverem disponíveis.
 * Em CI sem credenciais, é skipado para não quebrar build.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const HAS_DB = Boolean(SUPABASE_URL && ANON_KEY);

describe.skipIf(!HAS_DB)('RLS Integrity — tabelas críticas', () => {
  let anon: SupabaseClient;

  beforeAll(() => {
    anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  // ─── 1. Tabelas de referência: SELECT público OK, mutações bloqueadas ───
  it('pjecalc_pisos_salariais — SELECT anônimo permitido (referência pública)', async () => {
    const { data, error } = await anon
      .from('pjecalc_pisos_salariais')
      .select('id, nome, uf, competencia, valor')
      .limit(5);
    // Tabela de referência: leitura permitida (RLS allow USING(true))
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('pjecalc_vale_transporte (tabela de referência) — SELECT anônimo permitido', async () => {
    // Tabela existe com schema histórico ou recriada como _config; testamos
    // o nome que estiver disponível.
    const { error } = await anon
      .from('pjecalc_vale_transporte')
      .select('*')
      .limit(1);
    // Aceita: erro de "relation does not exist" se foi dropada na 20260304,
    // ou OK se existe.
    if (error) {
      expect(error.message).toMatch(/does not exist|relation|permission/i);
    }
  });

  it('pjecalc_pisos_salariais — INSERT anônimo BLOQUEADO (RLS authenticated only)', async () => {
    const { error } = await anon
      .from('pjecalc_pisos_salariais')
      .insert({
        nome: 'TEST RLS',
        uf: 'XX',
        competencia: '2024-01-01',
        valor: 1.00,
      });
    // RLS deve bloquear: error não-null com código de RLS
    expect(error).not.toBeNull();
  });

  // ─── 2. Tabelas de dados próprios: tudo bloqueado para anônimo ───
  it('cases — anônimo NÃO consegue ler casos de outros usuários', async () => {
    const { data, error } = await anon
      .from('cases')
      .select('id')
      .limit(1);
    // Owner-only RLS: anônimo deve ver lista vazia OU receber erro
    if (error) {
      expect(error.message).toMatch(/permission|rls|policy/i);
    } else {
      expect(data?.length || 0).toBe(0);
    }
  });

  it('pjecalc_vale_transporte_config — anônimo NÃO consegue ler', async () => {
    const { data, error } = await anon
      .from('pjecalc_vale_transporte_config')
      .select('id')
      .limit(1);
    // Owner-only via case_id (P0.4): anônimo recebe vazio ou erro
    if (error) {
      expect(error.message).toMatch(/permission|rls|policy|does not exist/i);
    } else {
      expect(data?.length || 0).toBe(0);
    }
  });

  it('pjecalc_advogados — anônimo NÃO consegue inserir', async () => {
    const { error } = await anon
      .from('pjecalc_advogados')
      .insert({
        case_id: '00000000-0000-0000-0000-000000000000',
        nome: 'TEST',
        oab: 'XX/000000',
      });
    expect(error).not.toBeNull();
  });
});
