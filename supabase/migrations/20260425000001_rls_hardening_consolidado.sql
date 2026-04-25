-- ============================================================================
-- RLS HARDENING CONSOLIDADO — auditoria de produção
--
-- Cobre:
--   • P0.4 (parcial): RLS owner-only em pjecalc_vale_transporte_config + _linhas
--   • PR-SEC-1: 10 das 11 tabelas com USING(true) detectadas pelo Supabase Advisor
--   • search_path mutable: ALTER FUNCTION em 10 funções sinalizadas
--
-- NÃO inclui (deferido):
--   • pjecalc_verbas_padrao INSERT/UPDATE → exige has_role(admin) e
--     public.user_roles está vazia. Quando o primeiro admin for cadastrado,
--     criar PR específico restringindo INSERT/UPDATE a has_role(... 'admin').
--     Por ora a tabela continua com policy permissiva existente.
--   • search_path em funções não listadas no advisor — escopo deste PR.
--
-- ROLLBACK REFERENCE — policies ANTERIORES (literal, para revert manual)
-- ----------------------------------------------------------------------------
--   ai_agent_logs:               "Users can manage agent logs" ALL TO authenticated USING(true) WITH CHECK(true)
--   ai_audit_findings:           "Users can manage audit findings" ALL TO authenticated USING(true) WITH CHECK(true)
--   ai_audit_runs:               "Users can manage audit runs" ALL TO authenticated USING(true) WITH CHECK(true)
--   ai_canonical_inputs:         "Users can manage canonical inputs" ALL TO authenticated USING(true) WITH CHECK(true)
--   ai_confidence_scores:        "Users can manage confidence scores" ALL TO authenticated USING(true) WITH CHECK(true)
--   ai_reconciliation_reports:   "Users can manage reconciliation reports" ALL TO authenticated USING(true) WITH CHECK(true)
--   liquidation_ai_runs:         "Users can manage their liquidation runs" ALL TO authenticated USING(true) WITH CHECK(true)
--   sentenca_rulesets:           "Users can manage their case rulesets" ALL TO public USING(true) WITH CHECK(true)
--   sync_status:                 "Authenticated can manage sync_status" ALL TO authenticated USING(true) WITH CHECK(true)
--                                "Anyone can read sync_status" SELECT TO public USING(true)
--   worktime_adjustments:        "Users can manage worktime adjustments" ALL TO public USING(true) WITH CHECK(true)
--   pjecalc_vale_transporte_config:  "Authenticated can manage vt config" ALL TO public USING(auth.role()='authenticated')
--   pjecalc_vale_transporte_linhas:  "Authenticated can manage vt linhas" ALL TO public USING(auth.role()='authenticated')
-- ============================================================================

-- ============================================================
-- BLOCO 1: ai_agent_logs
-- Ownership: indireta via run_id → ai_audit_runs.case_id → cases.criado_por
-- Frontend reads: nenhum no src/. Frontend writes: nenhum.
-- Edge writes: ai-audit-agent (service_role bypassa RLS).
-- Policies: SELECT defensivo para uso futuro; sem write para authenticated.
-- ============================================================
DROP POLICY IF EXISTS "Users can manage agent logs" ON public.ai_agent_logs;

CREATE POLICY "select_own_agent_logs" ON public.ai_agent_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_audit_runs r
    WHERE r.id = ai_agent_logs.run_id AND public.user_owns_case(r.case_id)
  ));
-- Nenhuma policy de INSERT/UPDATE/DELETE para authenticated por design.
-- Writes via service_role (Edge Function ai-audit-agent).

-- ============================================================
-- BLOCO 2: ai_audit_findings
-- Ownership: run_id → ai_audit_runs.case_id → cases.criado_por
-- Frontend reads: audit/service.ts (getLatestRun, getFindings, getRunHistory).
-- Frontend writes: audit/service.ts:95 UPDATE resolved/resolution_note.
-- Edge writes: ai-audit-agent INSERT.
-- Policies: SELECT + UPDATE para authenticated; INSERT/DELETE só service_role.
-- ============================================================
DROP POLICY IF EXISTS "Users can manage audit findings" ON public.ai_audit_findings;

CREATE POLICY "select_own_audit_findings" ON public.ai_audit_findings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_audit_runs r
    WHERE r.id = ai_audit_findings.run_id AND public.user_owns_case(r.case_id)
  ));

-- WITH CHECK idêntico a USING para impedir mover finding para outro run via UPDATE.
CREATE POLICY "update_own_audit_findings" ON public.ai_audit_findings
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_audit_runs r
    WHERE r.id = ai_audit_findings.run_id AND public.user_owns_case(r.case_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_audit_runs r
    WHERE r.id = ai_audit_findings.run_id AND public.user_owns_case(r.case_id)
  ));

-- ============================================================
-- BLOCO 3: ai_audit_runs
-- Ownership: case_id direto → cases.criado_por.
-- Frontend reads: audit/service.ts por case_id.
-- Frontend writes: nenhum direto. Edge writes: ai-audit-agent INSERT+UPDATE.
-- Policies: SELECT para authenticated; sem write authenticated.
-- ============================================================
DROP POLICY IF EXISTS "Users can manage audit runs" ON public.ai_audit_runs;

CREATE POLICY "select_own_audit_runs" ON public.ai_audit_runs
  FOR SELECT TO authenticated
  USING (public.user_owns_case(case_id));
-- Nenhuma policy de INSERT/UPDATE/DELETE para authenticated por design.

-- ============================================================
-- BLOCO 4: ai_canonical_inputs
-- Ownership: case_id direto.
-- Frontend reads: nenhum hoje. Edge writes: ai-audit-agent INSERT.
-- Policy: SELECT defensivo para uso futuro.
-- ============================================================
DROP POLICY IF EXISTS "Users can manage canonical inputs" ON public.ai_canonical_inputs;

CREATE POLICY "select_own_canonical_inputs" ON public.ai_canonical_inputs
  FOR SELECT TO authenticated
  USING (public.user_owns_case(case_id));
-- Nenhuma policy de INSERT/UPDATE/DELETE para authenticated por design.

-- ============================================================
-- BLOCO 5: ai_confidence_scores
-- Ownership: indireta via run_id → ai_audit_runs.case_id.
-- Frontend reads: audit/service.ts por run_id.
-- Edge writes: ai-audit-agent INSERT.
-- ============================================================
DROP POLICY IF EXISTS "Users can manage confidence scores" ON public.ai_confidence_scores;

CREATE POLICY "select_own_confidence_scores" ON public.ai_confidence_scores
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_audit_runs r
    WHERE r.id = ai_confidence_scores.run_id AND public.user_owns_case(r.case_id)
  ));

-- ============================================================
-- BLOCO 6: ai_reconciliation_reports
-- Ownership: case_id direto.
-- Frontend reads: intelligent-liquidation.ts:618.
-- Frontend writes: nenhum. Edge writes: nenhum hoje (futuro: ai-audit-agent).
-- Policy: SELECT autenticado; writes só service_role (fail-closed por design).
-- ============================================================
DROP POLICY IF EXISTS "Users can manage reconciliation reports" ON public.ai_reconciliation_reports;

CREATE POLICY "select_own_reconciliation_reports" ON public.ai_reconciliation_reports
  FOR SELECT TO authenticated
  USING (public.user_owns_case(case_id));
-- Nenhuma policy de INSERT/UPDATE/DELETE para authenticated por design.
-- Se algum fluxo futuro do frontend precisar inserir, falhará silenciosamente
-- até criar policy explícita — decisão consciente de fail-closed.

-- ============================================================
-- BLOCO 7: liquidation_ai_runs
-- Ownership: case_id direto.
-- Frontend reads + writes (intelligent-liquidation.ts:342 INSERT, :692/:719 UPDATE).
-- Policy: ALL authenticated com user_owns_case.
-- ============================================================
DROP POLICY IF EXISTS "Users can manage their liquidation runs" ON public.liquidation_ai_runs;

CREATE POLICY "all_own_liquidation_runs" ON public.liquidation_ai_runs
  FOR ALL TO authenticated
  USING (public.user_owns_case(case_id))
  WITH CHECK (public.user_owns_case(case_id));

-- ============================================================
-- BLOCO 8: sentenca_rulesets
-- Ownership: case_id direto.
-- Frontend reads + writes (ModuloAjusteSentenca.tsx:60/151/208).
-- Bug anterior: roles=public (incluía anon!). Corrige para authenticated.
-- ============================================================
DROP POLICY IF EXISTS "Users can manage their case rulesets" ON public.sentenca_rulesets;

CREATE POLICY "all_own_sentenca_rulesets" ON public.sentenca_rulesets
  FOR ALL TO authenticated
  USING (public.user_owns_case(case_id))
  WITH CHECK (public.user_owns_case(case_id));

-- ============================================================
-- BLOCO 9: sync_status (tabela ops global)
-- Ownership: nenhuma (dado operacional sobre sync de índices BCB).
-- Frontend reads: useIndicesSync, Tabelas.tsx (painel admin).
-- Frontend writes: nenhum.
-- Edge writes: sync-indices, sync-indices-automatico (service_role).
-- Policy: SELECT global authenticated; sem write.
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage sync_status" ON public.sync_status;
DROP POLICY IF EXISTS "Anyone can read sync_status" ON public.sync_status;

CREATE POLICY "select_all_sync_status" ON public.sync_status
  FOR SELECT TO authenticated
  USING (true);
-- Nenhuma policy de INSERT/UPDATE/DELETE para authenticated por design.
-- Writes ficam restritos a service_role (Edge Functions de sync).

-- ============================================================
-- BLOCO 10: worktime_adjustments
-- Ownership: case_id direto.
-- Frontend writes: ModuloAjusteSentenca.tsx:182 UPSERT.
-- Bug anterior: roles=public (incluía anon!). Corrige para authenticated.
-- ============================================================
DROP POLICY IF EXISTS "Users can manage worktime adjustments" ON public.worktime_adjustments;

CREATE POLICY "all_own_worktime_adjustments" ON public.worktime_adjustments
  FOR ALL TO authenticated
  USING (public.user_owns_case(case_id))
  WITH CHECK (public.user_owns_case(case_id));

-- ============================================================
-- BLOCO 11: pjecalc_vale_transporte_config (P0.4)
-- Ownership: case_id direto (também tem calculo_id, mas case_id é mais direto).
-- Bug anterior: ALL TO public USING(auth.role()='authenticated') — sem filtro
-- por owner; qualquer authenticated lia/escrevia config de VT de qualquer caso.
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage vt config" ON public.pjecalc_vale_transporte_config;

CREATE POLICY "all_own_vt_config" ON public.pjecalc_vale_transporte_config
  FOR ALL TO authenticated
  USING (public.user_owns_case(case_id))
  WITH CHECK (public.user_owns_case(case_id));

-- ============================================================
-- BLOCO 12: pjecalc_vale_transporte_linhas (P0.4)
-- Ownership: indireta via config_id → pjecalc_vale_transporte_config.case_id.
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage vt linhas" ON public.pjecalc_vale_transporte_linhas;

CREATE POLICY "all_own_vt_linhas" ON public.pjecalc_vale_transporte_linhas
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pjecalc_vale_transporte_config c
    WHERE c.id = pjecalc_vale_transporte_linhas.config_id
      AND public.user_owns_case(c.case_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pjecalc_vale_transporte_config c
    WHERE c.id = pjecalc_vale_transporte_linhas.config_id
      AND public.user_owns_case(c.case_id)
  ));

-- ============================================================
-- search_path mutable — fix das 10 funções listadas pelo advisor
-- Search path explícito previne ataques de schema-shadowing onde um usuário
-- malicioso poderia criar tabelas em schema próprio que sobrepõem nomes
-- usados dentro da função.
-- ============================================================
ALTER FUNCTION public.pjecalc_calc_horas_entre(h_inicio text, h_fim text)
  SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.tg_pjecalc_ocorrencias_update()
  SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.parse_month_abbrev(p text)
  SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.tg_pjecalc_ocorrencias_delete()
  SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.tg_pjecalc_ocorrencias_insert()
  SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.classify_rubrica(p_desc text)
  SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.safe_hhmm_to_min(t text)
  SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.parse_brl_number(p text)
  SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = 'public', 'pg_temp';
ALTER FUNCTION public.populate_case_id_from_calculo()
  SET search_path = 'public', 'pg_temp';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
