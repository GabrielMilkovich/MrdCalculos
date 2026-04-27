import type { Page, Route } from '@playwright/test';

/**
 * Helpers especificos dos fluxos E2E criticos (Sprint 3).
 *
 * Stub adicional sobre helpers.ts (auth + rede) para popular respostas
 * de tabelas/views especificas. Cada `seed*` registra uma rota mais
 * especifica que sobrepoe o fallback `[]` definido em helpers.stubSupabaseNetwork.
 *
 * Padrao Postgrest: a URL e algo como
 *   `/rest/v1/cases?id=eq.<uuid>&select=...`
 * Por isso usamos uma regex que casa com `/rest/v1/<table>(?|$)` e nao
 * filtramos por query string (basta retornar a fixture certa).
 *
 * IMPORTANTE: registrar SEMPRE depois de `setupAuthedPage(page)`. Playwright
 * resolve as rotas em ordem inversa de registro — a ultima registrada vence.
 */

/**
 * JSON helper.
 */
async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** Fixture minima para a tabela `cases`. */
export interface CaseFixture {
  id: string;
  cliente: string;
  numero_processo?: string | null;
  status?: string;
  tags?: string[] | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

/** Fixture minima para verbas (visao `pjecalc_verbas`). */
export interface VerbaFixture {
  id: string;
  case_id: string;
  nome: string;
  tipo: 'principal' | 'reflexa';
  caracteristica?: string;
  ocorrencia_pagamento?: string;
  multiplicador?: number;
  divisor_informado?: number;
  periodo_inicio?: string;
  periodo_fim?: string;
  ordem?: number;
}

/** Fixture minima para historicos salariais. */
export interface HistoricoFixture {
  id: string;
  case_id: string;
  competencia: string;
  valor: number;
  observacao?: string | null;
}

/**
 * Stub para `/rest/v1/cases?...` retornando o fixture passado.
 *
 * - Cobre `select(...).eq('id', X).maybeSingle()` → array com 1 item.
 * - Cobre listagem `select('*')` → array com [fixture].
 */
export async function seedCaseFixture(page: Page, caseData: CaseFixture): Promise<void> {
  const payload: CaseFixture = {
    user_id: '00000000-0000-0000-0000-000000000001',
    status: 'em_analise',
    numero_processo: null,
    tags: null,
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z',
    ...caseData,
  };
  await page.route(/\/rest\/v1\/cases(\?|$)/, async (route) => {
    const method = route.request().method();
    const accept = route.request().headers()['accept'] || '';
    const wantsSingle = accept.includes('vnd.pgrst.object');
    if (method === 'GET' || method === 'HEAD') {
      if (wantsSingle) {
        await fulfillJson(route, payload);
      } else {
        await fulfillJson(route, [payload]);
      }
      return;
    }
    if (method === 'POST') {
      // INSERT — devolve a row recem-criada com id gerado.
      const body = route.request().postDataJSON?.() as Partial<CaseFixture> | undefined;
      const inserted = { ...payload, ...(body ?? {}) };
      if (wantsSingle) {
        await fulfillJson(route, inserted, 201);
      } else {
        await fulfillJson(route, [inserted], 201);
      }
      return;
    }
    if (method === 'PATCH' || method === 'DELETE') {
      if (wantsSingle) {
        await fulfillJson(route, payload);
      } else {
        await fulfillJson(route, []);
      }
      return;
    }
    await fulfillJson(route, []);
  });
}

/**
 * Stub para `/rest/v1/pjecalc_verbas?...` retornando lista de verbas.
 * Tambem cobre a tabela base `pjecalc_verba_base` para writes.
 */
export async function seedVerbasFixture(page: Page, verbas: VerbaFixture[]): Promise<void> {
  const enriched = verbas.map((v) => ({
    caracteristica: 'COMUM',
    ocorrencia_pagamento: 'MENSAL',
    multiplicador: 1,
    divisor_informado: 30,
    ordem: 0,
    ...v,
  }));
  await page.route(/\/rest\/v1\/pjecalc_verbas(\?|$)/, async (route) => {
    const method = route.request().method();
    if (method === 'GET' || method === 'HEAD') {
      await fulfillJson(route, enriched);
      return;
    }
    await fulfillJson(route, [], 204);
  });
  // pjecalc_verba_base recebe os updates/inserts (mutations); responder 204.
  await page.route(/\/rest\/v1\/pjecalc_verba_base(\?|$)/, async (route) => {
    const method = route.request().method();
    if (method === 'GET' || method === 'HEAD') {
      await fulfillJson(route, enriched);
      return;
    }
    if (method === 'PATCH' || method === 'POST') {
      // Devolve a row "atualizada" (echoing) — supabase-js usa para refrescar cache.
      const body = route.request().postDataJSON?.() ?? {};
      await fulfillJson(route, [{ ...enriched[0], ...body }], 200);
      return;
    }
    await fulfillJson(route, []);
  });
}

/**
 * Stub para `/rest/v1/pjecalc_historico_salarial?...` retornando historico.
 */
export async function seedHistoricoFixture(
  page: Page,
  historicos: HistoricoFixture[],
): Promise<void> {
  await page.route(/\/rest\/v1\/pjecalc_historico_salarial(\?|$)/, async (route) => {
    const method = route.request().method();
    if (method === 'GET' || method === 'HEAD') {
      await fulfillJson(route, historicos);
      return;
    }
    await fulfillJson(route, []);
  });
}

/**
 * Stub para `/rest/v1/pjecalc_correcao_config?...` retornando config de correcao.
 * Aceita parcial — campos nao informados ficam com defaults razoaveis.
 */
export async function seedCorrecaoConfig(
  page: Page,
  config: Partial<{
    case_id: string;
    indice: string;
    tabela_juros: string;
    combinacoes_indice: string | null;
    combinacoes_juros: string | null;
    transicao_adc58: boolean;
    juros_inicio: string;
    data_liquidacao: string;
    multa_523: boolean;
    multa_523_percentual: number;
    aplicar_juros_fase_pre_judicial: boolean;
    ignorar_taxa_negativa: boolean;
    acumular_indices_correcao: string;
  }>,
): Promise<void> {
  const payload = {
    case_id: '00000000-0000-0000-0000-000000000aaa',
    indice: 'IPCA-E',
    tabela_juros: 'TRD_SIMPLES',
    combinacoes_indice: null,
    combinacoes_juros: null,
    transicao_adc58: false,
    juros_inicio: 'ajuizamento',
    data_liquidacao: new Date().toISOString().slice(0, 10),
    multa_523: false,
    multa_523_percentual: 10,
    aplicar_juros_fase_pre_judicial: true,
    ignorar_taxa_negativa: true,
    acumular_indices_correcao: 'mensal',
    ...config,
  };

  // mutavel — assim o teste "salvar e re-render" pode ler o estado atualizado
  // se o teste registrar o seed novamente. Em geral, aceitamos a sobreposicao
  // do POST/PATCH respondendo eco da mutacao (handler abaixo).
  let current = { ...payload };

  await page.route(/\/rest\/v1\/pjecalc_correcao_config(\?|$)/, async (route) => {
    const method = route.request().method();
    if (method === 'GET' || method === 'HEAD') {
      await fulfillJson(route, [current]);
      return;
    }
    if (method === 'POST' || method === 'PATCH') {
      const body = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      current = { ...current, ...(body ?? {}) };
      await fulfillJson(route, [current], 200);
      return;
    }
    await fulfillJson(route, []);
  });
}

/**
 * Stub para `/rest/v1/pjecalc_ocorrencias?...` (visao consultada por
 * GradeOcorrencias via `svc.getOcorrenciasByCalculo`) e tambem
 * `pjecalc_verba_ocorrencias` (fallback usado por ModuloOcorrencias antigo).
 * Aceita uma lista de ocorrencias (1 por mes, geralmente).
 */
export async function seedOcorrenciasFixture(
  page: Page,
  ocorrencias: Array<Record<string, unknown>>,
): Promise<void> {
  let current = [...ocorrencias];

  const handler = async (route: Route) => {
    const method = route.request().method();
    if (method === 'GET' || method === 'HEAD') {
      await fulfillJson(route, current);
      return;
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON?.() as Record<string, unknown>[] | undefined;
      if (Array.isArray(body)) current = current.concat(body);
      await fulfillJson(route, body ?? [], 201);
      return;
    }
    if (method === 'PATCH') {
      const body = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      if (body && current.length > 0) {
        current = current.map((o) => ({ ...o, ...body }));
      }
      await fulfillJson(route, current, 200);
      return;
    }
    if (method === 'DELETE') {
      current = [];
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await fulfillJson(route, []);
  };

  await page.route(/\/rest\/v1\/pjecalc_ocorrencias(\?|$)/, handler);
  await page.route(/\/rest\/v1\/pjecalc_verba_ocorrencias(\?|$)/, async (route) => {
    const method = route.request().method();
    if (method === 'GET' || method === 'HEAD') {
      await fulfillJson(route, current);
      return;
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON?.() as Record<string, unknown>[] | undefined;
      if (Array.isArray(body)) current = current.concat(body);
      await fulfillJson(route, body ?? [], 201);
      return;
    }
    if (method === 'PATCH') {
      const body = route.request().postDataJSON?.() as Record<string, unknown> | undefined;
      // Atualiza in-place baseado em qualquer chave que case (smoke test).
      if (body && current.length > 0) {
        current = current.map((o) => ({ ...o, ...body }));
      }
      await fulfillJson(route, current, 200);
      return;
    }
    if (method === 'DELETE') {
      current = [];
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await fulfillJson(route, []);
  });
}
