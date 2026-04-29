/**
 * Tabelas auxiliares — Loader com cache em memória
 * Busca dados de referência do Supabase e cacheia na sessão.
 */
import { supabase } from '@/integrations/supabase/client';
import { saveToLocalStorage, loadFromLocalStorage } from './offline-cache';

// In-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data as T;
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
  saveToLocalStorage(key, data);
}

export interface SalarioMinimoEntry { competencia: string; valor: number; }
export interface INSSFaixa { competencia_inicio: string; competencia_fim: string; faixa: number; valor_ate: number; aliquota: number; }
export interface IndiceCorrecao { indice: string; competencia: string; valor: number; acumulado?: number; }
export interface IRFaixa { competencia_inicio: string; competencia_fim: string; faixa: number; valor_ate: number; aliquota: number; deducao: number; deducao_dependente: number; }

export async function getSalariosMinimos(): Promise<SalarioMinimoEntry[]> {
  const cached = getCached<SalarioMinimoEntry[]>('salarios_minimos');
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from('pjecalc_salario_minimo' as never)
      .select('*')
      .order('competencia', { ascending: false });

    if (error) throw new Error(`Falha ao carregar salários mínimos: ${error.message}`);
    const result = (data || []) as unknown as SalarioMinimoEntry[];
    setCache('salarios_minimos', result);
    return result;
  } catch (err) {
    const offline = loadFromLocalStorage<SalarioMinimoEntry[]>('salarios_minimos');
    if (offline) return offline.data;
    throw err;
  }
}

export async function getINSSFaixas(): Promise<INSSFaixa[]> {
  const cached = getCached<INSSFaixa[]>('inss_faixas');
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from('pjecalc_inss_faixas' as never)
      .select('*')
      .order('competencia_inicio', { ascending: false });

    if (error) throw new Error(`Falha ao carregar faixas INSS: ${error.message}`);
    const result = (data || []) as unknown as INSSFaixa[];
    setCache('inss_faixas', result);
    return result;
  } catch (err) {
    const offline = loadFromLocalStorage<INSSFaixa[]>('inss_faixas');
    if (offline) return offline.data;
    throw err;
  }
}

export async function getIRFaixas(): Promise<IRFaixa[]> {
  const cached = getCached<IRFaixa[]>('ir_faixas');
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from('pjecalc_ir_faixas' as never)
      .select('*')
      .order('competencia_inicio', { ascending: false });

    if (error) throw new Error(`Falha ao carregar faixas IR: ${error.message}`);
    const result = (data || []) as unknown as IRFaixa[];
    setCache('ir_faixas', result);
    return result;
  } catch (err) {
    const offline = loadFromLocalStorage<IRFaixa[]>('ir_faixas');
    if (offline) return offline.data;
    throw err;
  }
}

export async function getIndicesCorrecao(indice?: string): Promise<IndiceCorrecao[]> {
  const cacheKey = `indices_${indice || 'all'}`;
  const cached = getCached<IndiceCorrecao[]>(cacheKey);
  if (cached) return cached;

  try {
    let query = supabase.from('pjecalc_correcao_monetaria' as never).select('*');
    if (indice) query = query.eq('indice', indice);
    query = query.order('competencia', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(`Falha ao carregar índices de correção: ${error.message}`);
    const result = (data || []) as unknown as IndiceCorrecao[];
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    const offline = loadFromLocalStorage<IndiceCorrecao[]>(cacheKey);
    if (offline) return offline.data;
    throw err;
  }
}

/** Clear all cached data (useful after sync) */
export function clearCache(): void {
  cache.clear();
}
