# Limitações Conhecidas — MRD Calc

> **Última atualização:** 2026-04-25
> **Estado de produção:** main em `4a4f28e` + sprint code-quality não-mergeada

Este documento registra **honestamente** o que está em dívida no projeto,
o esforço estimado para fechar cada item, e o impacto real em produção.
Atualize quando algo for resolvido.

---

## 🔴 Críticos para qualidade de cálculo

### 1. INSS subestimado em PRE_ADC58 longos (-20% a -33%)

**Casos afetados (calibrate público, 6 dos 14):**
- `joseli-silva` — INSS −32,77% (106 meses)
- `leandro-casademunt` — INSS −28,67% (201 meses)
- `roque-guerreiro` — INSS −24,27% (209 meses)
- `vanderlei-carvalho` — INSS −26,46% (49 meses)
- `caso-real-v2` — INSS −22,15% (73 meses)
- `francisco-pablo` — INSS −25,72% (28 meses)

**Causa-raiz** (parcialmente identificada após investigação aprofundada
em 2026-04-25):

1. `InssModuloAdapter.calcularINSSProgressivo(comp, bNormal)` calcula
   alíquota com base na **diferença das verbas alone**. Java original
   (`MaquinaDeCalculoDoInss.liquidarInssSobreSalariosDevidos` linha
   704-835) calcula alíquota com base no **TOTAL = histórico salarial
   pago + diferença** e aplica essa alíquota apenas sobre a diferença,
   capada pelo teto.

2. **MAS:** investigação dos PJC reais de joseli-silva mostra que TODOS
   os 5 `<HistoricoSalarial>` têm `incidenciaINSS=false`
   (COMISSÕES PAGAS, DSR S/COMISSÃO, MÍNIMO GARANTIDO, PRÊMIOS PAGOS,
   SAL. SUBSTITUIÇÃO PAGO). Não há histórico com incidência INSS, então
   somar histórico-INSS daria 0 e a fórmula marginal seria igual à atual.
   Isso descarta a hipótese de "fix simples por filtro de histórico".

3. **Hipótese refinada:** PJC computa uma base INSS "fantasma" implícita
   a partir do salário base contratual (não do histórico salarial
   declarado), provavelmente via `OcorrenciaDoHistoricoSalarial` ou
   `BaseHistorico` no Java. Diferenciais detectados:
   - PJC `inssReclamante` (total verbas) vs `inssBeneficiario` (após
     desconto de INSS já recolhido) tem diferença de 25-35% nos casos
     PRE_ADC58 longos.
   - Para joseli: `inssReclamante = R$42.357`, `inssBeneficiario = R$27.265`,
     diff = R$15.092 (= INSS sobre base histórica fantasma).

**Trabalho necessário (revisado):**
1. Localizar onde no Java a base INSS implícita é calculada quando
   `incidenciaINSS=false` em todos os históricos
2. Reproduzir essa lógica no TS (provavelmente envolve
   `RepositorioDeInss.calculaAvosInssDecimoTerceiro` ou similar)
3. Plumbar dados de `params.ultima_remuneracao` ou `dados_processo`
   para o adapter

**Risco:** alto. Tentativa anterior (β híbrido) falhou. Investigação
desta sessão (2026-04-25) confirmou que NÃO é possível atacar com
filtros simples no histórico salarial.

**Estimativa revisada:** 12-20h, com instrumentação dedicada lendo o
Java decompilado linha-a-linha do método `calcularValorBaseVerbas`
em `MaquinaDeCalculoDoInss.java`.

### 2. IR overshoot em francisco-pablo (-79,79%)

PJC IR = R$1.452, Eng IR = R$293. Valor absoluto pequeno mas % grande.
Provavelmente o cap=12m do RRA empurrou para faixa isenta indevidamente
para esse caso específico. Investigação caso-a-caso.

**Estimativa:** 2-4h.

---

## 🟡 Funcionalidade pendente

### 3. Multi-tenancy ausente
Tudo escopado por `criado_por` (usuário individual). Para vender a
múltiplos escritórios cada um com N advogados, falta:
- Tabela `organizations` (id, nome, cnpj, plano)
- Tabela `organization_members` (org_id, user_id, role)
- Coluna `org_id` em `cases`, `documents`, `pjecalc_calculos` etc.
- Backfill: 1 org por usuário existente
- RLS reescrita: `EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND org_id = X.org_id)`
- Hook `useCurrentOrg()` + UI de seleção

**Decisão de produto necessária:**
- 1 escritório = N usuários, cada usuário pertence a 1 ou múltiplos?
- Roles dentro do escritório (admin/advogado/assistente/leitor)?
- Migração de dados existentes — agrupar como?

**Estimativa:** 40-80h após RFC aprovado.

### 4. Sentry / observabilidade externa
`@sentry/react` não instalado. Erros em produção invisíveis ao operador.
Bloqueador: falta DSN do projeto Sentry + decisão sobre filtro de PII.

**Estimativa:** 2-4h.

### 5. AdminRoute precisa de admin cadastrado
Componente existe (este sprint) e está aplicado em `/admin/pjc-analyzer`,
mas `public.user_roles` está **vazia**. Nenhum usuário passa hoje.
Ação necessária do dono do projeto: rodar no SQL Editor do Supabase
Dashboard (projeto `xhvlhrgfoeahgofhljbs`):

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<seu_uid>', 'admin'::app_role);
```

### 6. `pjecalc_verbas_padrao` ainda com policy aberta
Quando o admin acima for cadastrado, abrir PR específico restringindo
INSERT/UPDATE a `has_role(auth.uid(), 'admin'::app_role)`. Hoje qualquer
authenticated escreve no catálogo global (problema baixo: importação só
funciona via UI de admin).

### 7. Smoke test pós-deploy
Não existe. Deploy quebrado só descobre via cliente. Depende da decisão
de staging strategy (Q3 do plano original — placeholder).

**Estimativa:** 4-8h após staging definido.

### 8. LGPD compliance técnica
Falta:
- Export de dados por titular
- Log de acesso a processos (audit trail por user × case)
- Política de retenção implementada
- Base legal de tratamento documentada

**Bloqueador:** revisão jurídica externa necessária.

**Estimativa:** 16-40h (após decisões legais).

---

## 🟢 Dívida técnica

### 9. 373 `as any` em produção
ESLint config tem `"@typescript-eslint/no-explicit-any": "off"`. Substituir
por tipos próprios reduz bugs sutis. Plano:
1. Rodar `npx supabase gen types typescript` para regenerar tipos
2. Mudar lint para `"warn"`, depois `"error"` quando < 50 ocorrências

**Estimativa:** 4-8h.

### 10. TS strict mode desligado
`tsconfig.json` tem `strict: false`, `noImplicitAny: false`,
`strictNullChecks: false`. Ligar exige resolver os `as any` primeiro.

**Estimativa:** 8-20h após item #9.

### 11. Bundle 2.6MB único
`App.tsx` importa 12 páginas estaticamente. Code splitting via
`React.lazy()` + `<Suspense>` + dynamic imports de `jszip` e `service.ts`
levaria chunk inicial para <300KB gzip.

**Risco:** médio — pode quebrar lazy imports que assumem ordem de carga.

**Estimativa:** 8-20h.

### 12. 41 ESLint warnings restantes
Após `--fix` automático no sprint atual (71 → 41). A maioria são
`@typescript-eslint/no-require-imports` em `tailwind.config.ts` e
`no-useless-escape` em legacy. Trabalho manual.

**Estimativa:** 2-4h.

### 13. 15 arquivos > 800 LOC
- `FactValidationView.tsx` 1743L (pior — fluxo OCR misturado)
- `pjc-analyzer.ts` 1443L (legítimo grande — parser de XML complexo)
- `orchestrator.ts` 1377L (entry point, hard to split)
- `service.ts` 1179L (facade Supabase)
- `pjc-to-engine.ts` 1157L (bridge)
- `PjeCalcInline.tsx` 1090L
- `ModuloResumo.tsx` 1054L
- `engine-v3.ts` 1043L (legítimo — motor canônico)
- `DocumentsManager.tsx` 1006L
- ... 6 outros entre 800-977L

Refactor em hooks + sub-componentes recomendado para os que têm UI.

**Estimativa:** 16-30h por componente, 60-180h total.

### 14. 119 TODO/FIXME triagem
- 6× TODO(fase-7) — provavelmente honorários
- 3× TODO(fase-15) — `ParcelasAtualizaveisHonorarioUtils.consistirDados`
- 2× TODO(integracao-futura) — `TabelaDeJuros` parent Java
- 168 stub/placeholder/`integracao-futura`

**Estimativa:** 4-12h triagem + N horas para closing dos relevantes.

### 15. Coverage gate informacional, não-bloqueante
Adicionado neste sprint: `vitest.config.ts` agora tem thresholds
informacionais para `core/**`, `engine-v3.ts`, `modulos/**`. Subir os
pisos gradualmente conforme paridade golden cresce.

### 16. SLA paridade gate progressivo no CI
Existe check "Paridade ≤±1% por caso" que sempre falha (hoje 6/19 GOLDEN
no parity-pjcs-novos-independent). Tratar como informacional com SLA
progressivo:

- Semana 0 (hoje): 30% golden, ≤8% delta médio
- Semana 4: 50% golden, ≤4% delta médio
- Semana 12: 80% golden, ≤2% delta médio
- Semana 24: 95% golden, ≤1% delta médio (produção pública)

**Estimativa:** 2-4h para o gate progressivo.

### 17. E2E expandido (4 specs faltando)
Hoje 3 specs em `e2e/`. Adicionar:
- `import-pjc-flow.spec.ts`
- `gerar-pdfs.spec.ts` (cada um dos 12 PDFs)
- `esocial-export.spec.ts` (S-2500 + XML válido)
- `pje-integration.spec.ts` (pacote ZIP+Base64)

**Estimativa:** 8-16h.

### 18. ADRs e RUNBOOK ausentes
`docs/adr/` não existe. Decisões arquiteturais (motor V3, port 1:1,
multi-tenancy quando vier, ICP-Brasil) não documentadas como ADR.

`docs/RUNBOOK-INCIDENTES.md` não existe. Casos: cálculo errado em prod,
vazamento de dados, Edge Function caindo, OpenAI fora.

`docs/BACKUP-RESTORE.md` não existe. RPO/RTO indefinidos.

**Estimativa:** 8-16h.

---

## ✅ O que JÁ ESTÁ resolvido (referência)

- Edge Functions com `verify_jwt = false` → 0 (PR #23)
- 11 tabelas com `USING(true)` cross-tenant → 1 restante (PR #25)
- 10 funções com `search_path` mutável → 0 (PR #25)
- Vale-transporte cross-tenant leak → corrigido (PR #25)
- Deploy fail-loud → corrigido (PR #24)
- Motor UI manual ↔ orchestrator → alinhado (PR #26)
- IR rosicleia +119% → +0,7% (PR #22)
- ±5%: 10/13 → 11/13
- Média absoluta: −3,46% → −2,49%

---

## Como atualizar este documento

Quando resolver um item:
1. Mover de seção (vermelho/amarelo/verde) ou para "✅ JÁ ESTÁ resolvido"
2. Adicionar referência ao PR que fechou
3. Atualizar "Última atualização" no topo
