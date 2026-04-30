# Auditoria de Produção FINAL — Tech Lead Review

**Data:** 2026-04-29
**Branch:** main em `afb6f7d`
**Auditoria:** 5 agentes paralelos pensando como tech lead/dev sênior

---

## Score consolidado

| Categoria | Score | Veredicto |
|---|---|---|
| 🔒 **Segurança** | 62/100 | **NÃO** — 3 XSS sinks + 1 IDOR |
| ⚡ **Performance** | 42/100 | **NÃO** — bundle 2.7MB, N+1, 12MB fixtures em prod |
| 👁️ **Observabilidade** | 22/100 | **NÃO** — sem error tracking, ErrorBoundary não loga |
| 🛠️ **SRE/Reliability** | 52/100 | **NÃO** — DR ausente, migration rollback inexistente |
| 📜 **Compliance/LGPD** | 18/100 | **MULTA GARANTIDA** se ANPD audita amanhã |
| | **MÉDIA: 39.2/100** | |

**Comparação com auditoria de 2026-04-29 inicial (engenharia):**
- Score engenharia (8 agentes): 93/100
- Score produção (5 agentes tech lead): **39/100**

A diferença é brutal — o produto está **maduro em código** mas **imaturo em operação**.

---

## Top 10 P0 — BLOQUEADORES de produção

### Compliance (legal — multa)

1. **Sem Política de Privacidade nem Termos** (`/privacidade`, `/termos` não existem)
   - Art. 9 LGPD violado. Multa quase certa em auditoria ANPD.
   - **Fix:** 2 páginas estáticas + checkbox no `Auth.tsx`. **3 dias.**

2. **Sem direito ao esquecimento** — `grep` confirma: zero rotas de delete-account
   - Art. 18, VI LGPD. Resposta exigida em 15 dias por ANPD.
   - **Fix:** botão em `Configuracoes.tsx` + edge function que deleta cascata. **2 dias.**

3. **Mistral OCR + OpenAI sem DPA divulgado** (transferência internacional Brasil→França/EUA)
   - Art. 33 LGPD. Dados sensíveis (CPF, salário) saem do Brasil sem aviso.
   - **Fix:** disclaimer no upload + DPA na política. **1 dia + assessoria jurídica.**

### Segurança (técnica — exploração)

4. **3 XSS sinks via LLM/PDF input**:
   - `CaseBriefing.tsx:454-468` — markdownToHtml sem escape
   - `SemanticSearchView.tsx:216-228` — `dangerouslySetInnerHTML` cru
   - `PetitionGenerator.tsx:506-510` — `memoria_calculo_html` cru
   - **Fix:** `npm install dompurify` + sanitize 3 sites. **1 dia.**

5. **IDOR em `extract-and-fill/index.ts:2185-2208`** — usa `service_role` sem validar dono do `case_id`
   - Usuário autenticado pode disparar pipeline custoso em casos alheios.
   - **Fix:** copiar bloco de auth de `ocr-document/index.ts:689-708`. **2h.**

### SRE (operação — incidente cego)

6. **ZERO error tracking** — sem Sentry/Datadog. ErrorBoundary só renderiza fallback, não reporta.
   - Quando bug explode em prod, equipe **não sabe**.
   - **Fix:** `npm install @sentry/react` + DSN + integração ErrorBoundary. **1 dia.**

7. **Migration rollback inexistente** (119 migrations, 3 com DROP, zero `-- DOWN`)
   - Deploy quebrado = recovery manual em DB com dados de produção. Risco enorme.
   - **Fix:** instituir convenção `-- UP / -- DOWN` + script de rollback. **2 dias setup.**

### Performance (UX — usuários reclamam)

8. **Bundle 2.7MB monolítico, zero code splitting**
   - 13 routes eager-imported. TTI 8-12s em 4G. Inaceitável.
   - **Fix:** `React.lazy()` em todas as routes + `manualChunks` no Vite. **1 dia.**

9. **`public/reports/` 12MB de fixtures `.pjc` shipped pra produção**
   - Acidental. Zero motivo para usuário baixar isso.
   - **Fix:** mover para `tests/fixtures/` + adicionar ao `.gitignore`. **30min.**

10. **N+1 confirmado em `PjeCalcInline.tsx:840`** — for-loop com `await delete` linha-a-linha
    - **Fix:** trocar por `.in("id", ids)` em 1 linha. **15min.**

---

## Top 10 P1 — degradam mas não bloqueiam imediato

11. **Sem `staleTime` em 87/94 useQuery** — cada navegação refetch tudo. 100 users = 500-1000 RPS Supabase.
12. **CasoDetalhe.tsx 1199 LOC monolito** — afunda performance da rota.
13. **`auto_fill_proposals` policy permite INSERT em case alheio** (falta `WITH CHECK case_id IN ...`)
14. **`pjecalc_verbas_padrao` policy `USING(true)`** — qualquer user muta verbas globais
15. **Edge functions com 57 console.log misturados** (sem JSON, nível, source)
16. **Sem rate limiting próprio nas edge functions** — usuário malicioso esgota Mistral em minutos
17. **Sem audit trail de SELECT em PII** (Art. 37 LGPD)
18. **Sem retenção de dados** (TTL para casos arquivados, documentos no Storage)
19. **`jsdom` no bundle browser** (~500KB desnecessários)
20. **CI sem property-tests no gate** (estão lá mas não bloqueiam merge)

---

## Plano de correção priorizado (2 sprints)

### Sprint Pré-Lançamento (2 semanas — BLOQUEIA piloto)

**Semana 1 — Legal + Segurança**
- Dia 1: P0-9 fixtures em prod (30min) + P0-10 N+1 (15min) + P0-5 IDOR (2h)
- Dia 2-3: P0-4 XSS via DOMPurify (3 sites)
- Dia 4-5: P0-6 Sentry integrado + ErrorBoundary loga
- Dia 6-7: P0-1 Política Privacidade + Termos + checkbox onboarding
- Dia 8-9: P0-2 Direito ao esquecimento (página + edge function)
- Dia 10: P0-3 DPA Mistral/OpenAI + disclaimer upload

**Semana 2 — Performance + SRE**
- Dia 11-12: P0-8 React.lazy em todas as routes + chunks vendor
- Dia 13: P0-7 convenção migration UP/DOWN + script rollback
- Dia 14: validação geral + smoke tests + deploy staging

### Sprint Pós-Piloto (2 semanas — após 30 reports)

- P1-11 staleTime em todos useQuery
- P1-12 split CasoDetalhe.tsx
- P1-13/14 RLS policies WITH CHECK estritas
- P1-15 logger estruturado nas edge functions
- P1-16 rate limiting middleware compartilhado
- P1-17 audit trail SELECT (trigger/decorator)
- P1-18 política de retenção (cron de purge)
- P1-19 jsdom→server only
- P1-20 CI property-tests obrigatório

---

## Veredicto sincero do tech lead

**O produto NÃO está pronto para abrir cadastro público.**

| Status real | Pode |
|---|---|
| Piloto fechado (até 5 usuários trusted, sob NDA, sem PII real) | ✅ SIM |
| Piloto aberto controlado (20-50 usuários, com legal escrito e Sentry) | ❌ Após Sprint Pré-Lançamento |
| Produção aberta SaaS público | ❌ Após Sprint Pré-Lançamento + Pós-Piloto |

**Razões para travar lançamento aberto agora:**
1. **Multa LGPD garantida** — 3 violações Art. 6/9/18/33 simultâneas
2. **3 XSS exploráveis** com input LLM/PDF (vetor mais comum em 2026)
3. **IDOR ativo** queimando crédito OpenAI alheio
4. **Cego em produção** — bug explode e equipe descobre por reclamação

**Razões otimistas:**
- Engine numérico em 98% paridade ✅
- Calibrate gate no CI ✅
- 1405 testes verde ✅
- Auto-fill review com proposal-engine conectado ✅
- 8 módulos "Em estudo" → produção ✅
- Documentação extensa (`STATE-OF-PRODUCTION.md`, `PRODUCAO-98-LAUNCH.md`)

**Estimativa total para go-live público responsável:**
- **Sprint Pré-Lançamento: 2 semanas** (10 P0 fixados + assessoria jurídica)
- **Sprint Pós-Piloto: +2 semanas** (10 P1 polidos + 30 reports analisados)
- **Total: 4 semanas** humanas focadas

Não é catastrófico — é trabalho conhecido e mapeado. Mas **NÃO PODE SER IGNORADO**.

---

## O que eu, como tech lead, faria amanhã

1. **Travar onboarding novo** — só piloto fechado por enquanto.
2. **Convocar reunião:** apresentar este doc para CEO/jurídico/produto.
3. **Decisão alinhada:**
   - **(a)** investir 2 semanas Sprint Pré-Lançamento + lançar
   - **(b)** lançar piloto fechado AGORA (5 advogados sob NDA), Sprint em paralelo
4. **Recomendo (b)** — começar feedback real e Sprint paralelo. Lançamento aberto em 14 dias com infra sólida.

---

**Auditoria honesta. O código é bom. A operação ainda não.**
