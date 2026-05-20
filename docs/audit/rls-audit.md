# Auditoria — RLS Policies do Supabase

**Data:** 2026-05-20
**Escopo:** Prompt 9 da auditoria de segurança
**Status:** Verificação read-only — sem alterações de schema

---

## Resumo

| Item | Valor |
|---|---|
| Total de migrations | 143 |
| Migrations que aplicam `ENABLE ROW LEVEL SECURITY` | 53 |
| Tabelas com RLS ativada (deduplicadas) | ~140 |
| Tabelas com `CREATE TABLE` declarado | ~155 |
| Tabelas declaradas SEM RLS confirmada (após dedup com fix migrations) | **1** (`rubrica_mapping`) |
| Policies com filtro `auth.uid()` | 61 |
| Policies com `USING (true)` (sem filtro de owner) | **10+** (mapeadas abaixo) |
| Buckets de Storage criados | 2: `case-documents` + `juriscalculo-documents` |
| Buckets com `public=true` | **0** (ambos privados) |

**Veredito:** cobertura RLS é razoável. Existem **2 áreas vermelhas** que merecem ação do dono.

---

## 🔴 Área vermelha 1: `rubrica_mapping` sem RLS

**Arquivo:** `supabase/migrations/20260506110000_rubrica_mapping.sql`

Tabela criada sem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` no mesmo arquivo, e o arquivo de seed (`20260506110100_rubrica_mapping_seed.sql`) também não habilita.

**O que a tabela contém:** mapeamento canônico de rubricas de holerite → buckets do PJe-Calc (`bucket_pje_calc` enum). Não contém dados de usuário direto. Mas:
- Se a tabela for global/leitura-pública (todos os usuários autenticados podem ler), uma policy `USING (true)` explícita seria necessária e ainda com `ENABLE RLS`.
- Sem `ENABLE RLS`, qualquer cliente Supabase autenticado pode INSERIR/UPDATE/DELETE — porque RLS desabilitada é "all access" em PostgreSQL.

**Risco real:** baixo no curto prazo (tabela de configuração), alto no longo (operador mal-intencionado poderia corromper o mapeamento de classificação de rubricas, afetando todos os cálculos do sistema).

**Recomendação:** criar migration nova com:
```sql
ALTER TABLE public.rubrica_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rubrica_mapping_read_all" ON public.rubrica_mapping
  FOR SELECT TO authenticated USING (true);
-- Sem policy de INSERT/UPDATE/DELETE: só admin (via service_role) pode mexer.
```

---

## 🔴 Área vermelha 2: 10+ policies com `USING (true)` em tabelas de auditoria

**Arquivos identificados:**

```
supabase/migrations/20260312103534_d0af6805-...sql  (linhas 127-132)
  - ai_audit_runs: "Users can manage audit runs" FOR ALL USING (true)
  - ai_audit_findings: idem
  - ai_confidence_scores: idem
  - ai_reconciliation_reports: idem
  - ai_canonical_inputs: idem
  - ai_agent_logs: idem

supabase/migrations/20260227232433_7f53071e-...sql  (linhas 17, 32, 46)
  - pjecalc_audit_log: SELECT USING (true)
  - pjecalc_observacoes: ALL USING (true) WITH CHECK (true)
  - pjecalc_metricas: ALL USING (true) WITH CHECK (true)
```

**Significado:** qualquer usuário autenticado vê TODOS os registros dessas tabelas, sem discriminação de owner.

**Avaliação caso a caso:**
- `pjecalc_audit_log`, `ai_audit_runs`, `ai_audit_findings` — provavelmente **intencional**: log de auditoria global, leitura por todos os usuários autorizados pode fazer sentido pra um SaaS pequeno. Mas `FOR ALL USING (true)` permite INSERT/UPDATE/DELETE também — operador pode adulterar audit log. **Recomendação:** restringir UPDATE/DELETE.
- `pjecalc_observacoes`, `pjecalc_metricas` — se contêm dados por-caso (observações sobre cálculo), `USING (true)` é vazamento entre clientes do escritório. **Investigar conteúdo da tabela.**
- `ai_confidence_scores`, `ai_reconciliation_reports`, `ai_canonical_inputs`, `ai_agent_logs` — telemetria de IA. Idem investigação por conteúdo.

[opinião técnica] Padrão `FOR ALL USING (true) WITH CHECK (true)` em produção é red flag — significa "habilitei RLS pra atender lint do Supabase e abri imediatamente". Pode estar intencional pra ambientes single-tenant atuais, mas vira armadilha quando multi-tenancy importar.

---

## 🟢 Áreas verdes

### Storage buckets corretamente configurados

**Ambos buckets têm `public=false`** (privados):
- `case-documents` — migração `20260121101854_*.sql:113`
- `juriscalculo-documents` — migração `20260121181924_*.sql:2-13`

**Policies de Storage requerem UUID do usuário no primeiro segmento do path:**
```sql
auth.uid()::text = (storage.foldername(name))[1]
```

Aplicado em INSERT, SELECT, DELETE, UPDATE — defesa coerente em todas as operações.

### 61 policies com filtro `auth.uid()`

Cobertura semântica boa — maior parte das tabelas com dados de usuário tem filtro de owner.

### Migrations recentes (Maio 2026) continuam aplicando RLS

Exemplo: `20260508120000_csv_export_bloqueio_burlado.sql`, `20260508140000_csv_export_ai_columns.sql`, `20260510000000_f13_unificar_ferias_faltas_em_ctps.sql` — todas mantêm o padrão. Cultura de RLS está estabelecida.

---

## 🟡 Inconsistência encontrada na auditoria (não bloqueio, mas registrar)

### Storage paths não-uniformes entre componentes de upload

Política Storage requer UUID do usuário como primeiro segmento. Mas:
- `DocumentsManager.tsx:271` usa `${user.id}/${caseId}/...` ✅ correto
- `CTPSUploader.tsx:57` usa `${caseId}/ctps_*.pdf` ❌ caseId NÃO é UUID do user
- `ImportadorFichaFinanceira.tsx:92` usa `temp/ficha_${caseId}_*.pdf` ❌ idem

**Consequência:** uploads via `CTPSUploader` e `ImportadorFichaFinanceira` deveriam ser **REJEITADOS pela RLS**. Se hoje funcionam, é porque:
- (a) Está acontecendo via Edge Function com service_role (bypass RLS) — funcional, mas perde a defesa
- (b) Existe policy alternativa que sobrescreve — não encontrei nas migrations
- (c) Está silenciosamente quebrado em produção e ninguém notou ainda — investigar nos logs

**Recomendação:** padronizar todos os uploads de browser para usar `${user.id}/${caseId}/...` (padrão do `DocumentsManager`).

---

## Limites desta auditoria

Tudo acima foi extraído das migrations versionadas no repo. **Não confere:**
- Policies criadas manualmente via Supabase Dashboard (não estão em migration files)
- Privilégios concedidos via `GRANT` direto no banco
- Configurações de auth no Dashboard (ex: TTL de access_token, multi-factor, providers)
- Service_role keys em uso nas Edge Functions (rodam com bypass de RLS por design)

**Como completar:** acesso ao Supabase Dashboard → SQL Editor → rodar:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;

SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Esses dois selects no banco real dão o estado autoritativo (versus as migrations que podem estar dessincronizadas).

---

## Itens acionáveis (priorizados)

1. **[P1] `rubrica_mapping` sem RLS** — criar migration habilitando.
2. **[P2] `pjecalc_observacoes`/`pjecalc_metricas` com USING (true)** — confirmar se devem ser global ou per-user, e endurecer policy se for o segundo.
3. **[P2] Audit logs com `FOR ALL USING (true)`** — restringir UPDATE/DELETE para `service_role` apenas (audit imutável).
4. **[P3] Storage paths inconsistentes** — padronizar `${user.id}/${caseId}/...` em todos uploads de browser, ou documentar deliberadamente o caminho service_role.
5. **[P3] Conferir Dashboard** — rodar os 2 SQLs acima para detectar dessincronização migrations ↔ realidade.

Nada disso é P0/blocker, mas todos contam pra production-readiness.
