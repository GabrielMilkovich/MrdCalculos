# RUNBOOK DE PRODUÇÃO — MRD Calc v3.2.0

**Para:** time de operações, DevOps, on-call.

---

## 1. Variáveis de ambiente (.env / Supabase secrets)

### Frontend (`.env` — copie de `.env.example`)
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
```

### Edge Functions (Supabase Dashboard > Settings > Edge Functions > Secrets)
```
OPENAI_API_KEY=sk-...           # extração RAG, embeddings, ai-audit
MISTRAL_API_KEY=...             # OCR (ocr-document, process-document-mistral)
SUPABASE_SERVICE_ROLE_KEY=...   # automatic
SUPABASE_URL=...                # automatic
```

### Feature flags Port (opcional — fallback)
```
# VITE_USE_PORTED_IRPF=false   # roteia IR para módulo portado vs legado
# VITE_USE_PORTED_INSS=false   # idem INSS
```

**CHECKLIST de deploy inicial:**
- [ ] `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` configurados
- [ ] `OPENAI_API_KEY` e `MISTRAL_API_KEY` no Dashboard Edge Functions
- [ ] Migrations aplicadas (`npx supabase db push`)
- [ ] Tipos sincronizados (`npx supabase gen types typescript`)
- [ ] Smoke teste de OCR + extração + cálculo

---

## 2. Edge Functions críticas (P0 — quebram fluxo principal)

| Function | O que faz | Falha provoca |
|---|---|---|
| `ocr-document` | OCR via Mistral + chunking | Documentos não digitalizados |
| `extract-facts-rag` | Extração estruturada anti-alucinação | Verbas não preenchidas |
| `parse-ficha-financeira` | Parser de rubricas folha | Fichas não importadas |
| `sync-indices` | Sincroniza IPCA/SELIC/TR do BCB/IBGE | Cálculos com índices stale |
| `ai-audit-agent` | Auditor técnico-jurídico | Sem revisão automática |
| `plan-calculation` | Planejador (orquestrador IA) | Bloqueia fluxo "calcular com IA" |

### Como verificar saúde
```bash
# Logs em tempo real (Dashboard Supabase > Logs > Edge Functions)
# Ou via CLI:
npx supabase functions logs ocr-document --tail
```

**Sintoma comum:** retorno 500 silencioso → quase sempre é secret faltando.
Verificar `OPENAI_API_KEY` / `MISTRAL_API_KEY` no Dashboard.

---

## 3. Cron jobs

| Job | Frequência | Função | Risco se falha |
|---|---|---|---|
| `sync-indices-automatico` | diário | Atualiza IPCA/SELIC/TR no DB | Cálculos stale |
| `sync-pjecalc-indices` | semanal | Sincroniza tabela PJC oficial | Divergência paridade |

Configuração em Supabase Dashboard > Edge Functions > Triggers (cron).

**ALERTA:** se `sync-indices` falhar 2 dias consecutivos, abrir incidente P1.

---

## 4. Monitoring sugerido

### KPIs operacionais
- **Uptime** Edge Functions críticas: ≥ 99,5% (UptimeRobot/Pingdom)
- **Latência cálculo** (orchestrator → resultado): p95 < 2s
- **Taxa de erro 5xx** Edge: < 0,5%
- **Sincronização índices:** última atualização ≤ 48h

### Ferramentas recomendadas
- **Sentry** — frontend errors + tracing (config em `src/lib/logger.ts`)
- **Supabase Dashboard > Logs** — Edge Functions + Postgres
- **UptimeRobot** — pings HTTP nos endpoints públicos
- **Plausible / PostHog** — analytics + funnel

### Alertas mínimos
| Condição | Severidade | Notificar |
|---|---|---|
| `sync-indices` falha 2× consecutivos | P1 | Eng + Ops |
| Edge Function 5xx > 5% / 5min | P2 | Eng |
| Postgres CPU > 80% por 10min | P2 | Ops |
| RLS denial > 100/h em produção | P3 | Eng |

---

## 5. Procedure de rollback

### Rollback de aplicação (frontend)
```bash
# Vercel: revert via dashboard ou
vercel rollback <deployment-url>

# Outros hosts: redeploy do commit anterior
git revert <bad-commit>
git push origin main
```

### Rollback de migration Supabase
**ATENÇÃO:** migrations são imutáveis. Para reverter, criar nova migration
que desfaz as alterações:
```bash
npx supabase migration new revert_FEATURE_X
# editar SQL para drop/restore
npx supabase db push
```

**Nunca** editar migration já aplicada.

### Rollback de Edge Function
```bash
# Re-deploy versão anterior do código
git checkout <commit-bom> -- supabase/functions/<func-name>
npx supabase functions deploy <func-name>
```

### Feature flags como kill-switch
- `VITE_USE_PORTED_IRPF=false` → reverte IR para legado
- `VITE_USE_PORTED_INSS=false` → reverte INSS para legado

Útil quando uma flag introduzida em Sprint 4 cause regressão; permite
desligar sem deploy.

---

## 6. Procedimento de incidente

### P1 — cálculo divergente em produção
1. Capturar payload exato (`.PJC` ou `MRDState JSON`).
2. Rodar localmente: `npm run calibrate -- <arquivo.PJC>`.
3. Comparar com `Calculo.java` do PJe-Calc oficial.
4. Se divergência > 5%, abrir issue P1 + bloquear emissão de PDF para o caso.
5. Hotfix em branch `hotfix/X` → PR → review → deploy.

### P1 — OCR/extração silenciosamente falhando
1. Verificar secrets no Dashboard.
2. Verificar logs da function (`npx supabase functions logs <name> --tail`).
3. Testar manualmente: upload de PDF de teste.
4. Se Mistral/OpenAI estiverem fora, ativar fallback (mensagem ao usuário).

### P2 — sincronização de índices falhando
1. Rodar manualmente: `npm run update-indices`.
2. Verificar disponibilidade BCB/IBGE.
3. Se BCB fora, usar fallback `indices-fallback.ts` temporariamente.

---

## 7. Backup e Disaster Recovery

- **Backup automático Supabase:** Pro plan = 7 dias PITR; Team = 30 dias.
- **Export semanal manual:** `pg_dump` → S3 (recomendado para dados críticos).
- **Migrations versionadas em Git:** reproduzem schema do zero.

### RTO/RPO
- **RTO** (tempo de recuperação): < 4h para incidente P1.
- **RPO** (perda máxima de dados): ≤ 1h (PITR Supabase).

---

## 8. Onboarding rápido (novo dev/ops)

1. Clonar repo → `npm install`
2. Copiar `.env.example` → `.env` e preencher
3. `npx supabase start` (Docker) → `npx supabase db reset`
4. `npm run dev` → `http://localhost:5173`
5. Login com user de teste
6. Importar `docs/PROCESSO_*.PJC` para testar fluxo
7. Rodar `npx vitest run` → deve passar 1.215+

---

## 9. Contatos e escalonamento

(Preencher conforme estrutura organizacional)

| Papel | Nome | Contato | Horário |
|---|---|---|---|
| Eng. responsável | TBD | TBD | — |
| Tech Lead | TBD | TBD | — |
| Produto | TBD | TBD | — |
| Jurídico | TBD | TBD | — |
