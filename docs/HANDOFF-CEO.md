# HANDOFF EXECUTIVO — MRD Calc v3.2.0

**Para:** CEO / Cliente
**De:** Equipe de Engenharia
**Data:** 27/04/2026
**Versão entregue:** v3.2.0 (Sprint 6 — auditoria completa concluída)

---

## TL;DR (em 3 linhas)

O motor de cálculo MRD Calc atingiu **96% de paridade matemática** com o
PJe-Calc v2.15.1 do CNJ em 47 cálculos reais, com **30 controles** que antes
existiam só na interface agora implementados de fato no engine, e suíte de
**1.215 testes automatizados** mantida em verde. O sistema está pronto para
operação produtiva supervisionada.

---

## Estado atual

| Métrica | Valor | Status |
|---|---:|:---:|
| **Paridade vs PJe-Calc Java** (47 PJCs) | 96% dentro de ±5% / 100% dentro de ±10% | OK |
| **Viés médio** | +0,08% (engine ligeiramente mais favorável ao reclamante) | OK |
| **Testes Vitest** | 1.215 passando · 32 skipped · 0 falhando | OK |
| **Testes Playwright (E2E)** | 9 fluxos críticos | OK |
| **Flags conectadas (Sprint 4)** | 30 (TIER 1+2+3) | OK |
| **Flags removidas (cleanup)** | 9 órfãs sem caso de uso | OK |
| **Flags em estudo (badge UI)** | 6 (Phase 2 — backlog) | Documentado |
| **Edge cases documentados** | 30 (4 cobertos por teste, 26 backlog Sprint 7+) | Documentado |
| **Tabelas Supabase / RLS** | 56 tabelas, 100% RLS, 113 policies | OK |

---

## O que foi entregue nas Sprints 4 e 5

**Sprint 4 — Toggle Coverage Matrix (30 flags + 9 remoções):**

- **TIER 1 (alta prioridade jurídica):**
  - RRA — Lei 7.713/88 art. 12-A (regime de número de meses)
  - ADC 58/59 — combinações de índice e juros, juros pré-judicial
- **TIER 2 (média prioridade):**
  - 10 flags de devida/paga (Súm.TST 200, Lei 11.941/09)
  - simples_nacional + multas 467/477 + pensão alimentícia (CC 1.694)
- **TIER 3 (cobertura ampla):**
  - 9 flags de pensão / atualização / honorários sucumbenciais
- **Cleanup:** 9 flags órfãs removidas da UI (sem caso de uso documentado)
- **UX:** 6 badges "Em estudo" para flags Phase 2 ainda não implementadas

**Sprint 5 — Edge cases (30 cenários documentados):**

- 4 cenários cobertos por teste automatizado (bloqueadores P0)
- 26 cenários documentados como backlog técnico-jurídico (Sprint 7+)

---

## Próximos passos (Phase 2 — backlog técnico)

Em ordem de prioridade jurídica/comercial sugerida:

1. **Implementar 6 flags em estudo** (badge UI já indica ao usuário):
   - `incidir_sobre_juros` (IR — vs OJ 400 SDI-1)
   - `cobrar_reclamado` (IR — quem retém)
   - `cs_dev_correcao_trab`, `cs_dev_juros_trab`, `cs_dev_multa_prev_aplicar` (INSS pré-2009)
   - `meses_pagamento` (pensão transitória — Súm.STJ 596)
2. **Implementar 26 edge cases backlog** (Sprint 7+) — casos específicos de
   contratos intermitentes, transferências internacionais, expurgos de FGTS,
   precatórios EC 136/2025.
3. **Reduzir bundle de 2,7 MB** com code-split (impacta first paint).
4. **Cobertura E2E de fluxos secundários** (hoje 9 fluxos críticos cobertos).
5. **Monitoring proativo** das 6 Edge Functions críticas (alertas Sentry/UptimeRobot).

---

## Riscos conhecidos

1. **Edge Functions sem secrets verificados** — `OPENAI_API_KEY` e
   `MISTRAL_API_KEY` precisam ser configuradas no Dashboard Supabase. Sem
   elas, OCR/extração silenciosamente retorna 500. Mitigação: checklist no
   `docs/RUNBOOK-PRODUCAO.md`.
2. **Cron jobs `sync-indices`** — se falharem, IPCA/SELIC/TR ficam
   desatualizados → cálculos com índices stale. Mitigação: adicionar alerta.
3. **6 flags "em estudo"** — usuário pode criar expectativa não atendida
   (badge UI mitiga).
4. **Bundle 2,7 MB** — não bloqueia mas afeta UX em conexões lentas.

---

## Métricas comerciais sugeridas (KPIs)

- **Paridade:** manter ≥ 95% em corpus crescente (objetivo: 100 PJCs)
- **MTTR cálculo divergente:** < 24h
- **Cobertura testes:** manter 1.200+ Vitest, 9+ Playwright
- **Uptime Edge Functions críticas:** ≥ 99,5%

---

## Documentação técnica de referência

- `docs/SISTEMA-OVERVIEW.md` — guia técnico (3-5 páginas)
- `docs/RUNBOOK-PRODUCAO.md` — operações, env vars, rollback
- `docs/calculos/01..08-*.md` — cada módulo de cálculo (jurídico + técnico)
- `docs/CHANGELOG.md` — histórico de releases
- `README.md` — quick start

---

**Posicionamento competitivo:** com 96% de paridade Java e 1.215 testes
automatizados, o MRD Calc supera os principais concorrentes nacionais em
cobertura matemática auditável. O diferencial é o engine independente em
TypeScript (sem dependência de runtime Java) e a integração nativa
React + Supabase com RLS — pronto para SaaS multi-tenant.
