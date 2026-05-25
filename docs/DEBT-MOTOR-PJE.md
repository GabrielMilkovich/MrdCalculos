# DEBT-MOTOR-PJE.md — Auditoria do motor de cálculo

> Gerado em: 2026-05-25
> Fonte: análise estrutural do código real em `claude/focused-bohr-pClpb`
> Baseline auditoria Java vs TS: `docs/baselines/audit-port-baseline.json` (22/abr/2026)

---

## 1. Estado real (números)

### Cobertura Java → TypeScript (22/abr/2026)

| Métrica | Valor |
|---|---|
| **Total portado** | **17.66%** |
| Arquivos Java | 645 |
| Arquivos TS matched | 268 |
| LoC Java | 98.241 |
| LoC TS | 17.349 |

### Cobertura por categoria

| Categoria | Cobertura | Arquivos faltando |
|---|---|---|
| 1-CORE-CALCULO | 24.5% | 77 |
| 2-TABELAS-ÍNDICES | 27.5% | 5 |
| 3-DOMÍNIO-SUPORTE | 10.4% | 198 |
| 4-RELATÓRIOS | **3.0%** | 63 |
| 5-SERVIÇOS | **0.58%** | 20 |
| 6-META-DADOS | 0% | 14 |

### Calibração validada

| Item | Valor |
|---|---|
| Casos testados | **1** (ROSICLEIA) |
| Delta líquido medido | +1.53% |
| Aprovado em ±5% | Sim |
| Estatisticamente confiável? | **Não** (N=1) |

---

## 2. Estimativa de paridade (CSV idêntico, mesmas entradas)

| Cenário | Paridade esperada |
|---|---|
| Caso típico vínculo único, regime padrão | **96-99%** |
| Caso com periculosidade | **80-92%** (reflexos faltando) |
| Caso com equiparação salarial | **85-95%** (reflexos parciais) |
| Caso com múltiplos vínculos | **<70%** ou falha |
| Caso com pensão alimentícia complexa | **70-85%** |
| Caso com cartão de ponto granular | **75-90%** |
| Caso pré/pós-ADC 58/59 puro | **94-98%** |

---

## 3. Fake front-end identificado (UI diferente do cálculo)

### 3.1 — Insalubridade não existe como módulo [CRITICO]
- **Evidência:** sem `ModuloInsalubridade.tsx` em `src/components/cases/pjecalc/`
- **Impacto:** advogado não consegue calcular adicional de insalubridade (NR 15 MTE — 10/20/40% sobre salário mínimo conforme grau)
- **Refs jurídicas:** NR 15 MTE, Súmula Vinculante 4 STF, Súmulas 17, 132, 191 TST
- **Status Sprint 7:** RESOLVIDO — ModuloInsalubridade.tsx criado + orchestrator integrado

### 3.2 — Periculosidade gera só verba principal, sem reflexos [CRITICO]
- **Evidência:** `orchestrator.ts:1108-1123` — só cria `'periculosidade_auto'`, sem reflexos
- **Compara com:** `orchestrator.ts:1175-1216` (equiparação) que tem reflexos em 13o, férias, FGTS
- **Impacto:** subnotifica ~20-30% do valor real devido (faltam reflexos em 13o, férias+1/3, FGTS, FGTS+40%, DSR, aviso prévio)
- **Refs jurídicas:** Art. 193 CLT, Súmulas 132, 191 TST
- **Status Sprint 7:** RESOLVIDO — reflexos em 13o, férias+1/3, DSR adicionados

### 3.3 — Estabilidade silenciosamente pode não gerar verba [ALTO]
- **Evidência:** `orchestrator.ts:1244-1248` — `if (!fim && meses > 0)` — se `meses_estabilidade='' || 0`, `fim` não é calculado, condição `if (inicio && fim)` falha, verba NÃO é gerada
- **Cenário do bug:** operador cola state salvo sem `meses_estabilidade`, marca `ativo=true`, sistema ignora silenciosamente
- **Impacto:** estabilidade ativa na UI, R$ 0,00 no cálculo
- **Status Sprint 7:** RESOLVIDO — defaults por tipo (gestante=5, cipa=12, acidentaria=12) + warning visível

### 3.4 — Equiparação com reflexos incompletos [MEDIO]
- **Evidência:** `orchestrator.ts:1175-1216`
- **Tem:** 13o (1/12), férias+1/3 (1.3333/12), FGTS (8%)
- **Faltam:** DSR (sobre parcela variável se houver comissão), aviso prévio indenizado, FGTS+40% (se demissão sem justa causa), saldo de salário
- **Impacto:** subnotificação 10-25% do valor real
- **Status Sprint 7:** RESOLVIDO — DSR e aviso prévio indenizado adicionados

### 3.5 — `base_calculo.historicos[0]` apenas [ALTO]
- **Evidência:** `orchestrator.ts:1119` (periculosidade) e `1280` (estabilidade): `if (historicos.length > 0) v.base_calculo.historicos = [historicos[0].id]`
- **Cenário:** operador tem Histórico 1=Salário Fixo, Histórico 2=Comissões, Histórico 3=DSR. Periculosidade que deveria incidir sobre soma incide só sobre o primeiro
- **Impacto:** subnotificação proporcional ao peso de comissões/DSR no salário
- **Status Sprint 7:** RESOLVIDO — `historicos.map(h => h.id)` em periculosidade e estabilidade

### 3.6 — `prazo_aviso_dias` opcional sem validação [BAIXO]
- **Evidência:** `engine-types.ts:25`
- **Cenário:** UI deixa `prazo_aviso_previo='informado'` mas `prazo_aviso_dias=undefined`
- **Impacto:** NaN no cálculo (não vi validação no orchestrator)
- **Status Sprint 7:** RESOLVIDO — validação pré-engine com mensagem clara

---

## 4. Erros no fluxo de parâmetros

### 4.1 — Fallback SELIC silencioso [ALTO]
- **Evidência:** `indices-fallback.ts:11` comentário admite: "precisão 8 casas decimais derivada"; `orchestrator.ts:1660`: `index_series_version: indicesDB.length > 0 ? 'db' : 'embedded'`
- **Impacto:** menor-ou-igual 2% delta em 120+ competências, **silencioso pro operador**

### 4.2 — `maior_remuneracao`/`ultima_remuneracao` opcional sem doc [MEDIO]
- **Evidência:** `engine-types.ts:36-37`
- **Cenário:** UI deixa em branco, motor calcula. Cálculo pode ignorar verbas fora dos `historicos`
- **Impacto:** difere de "última remuneração" do desktop (que toma do último contracheque informado)

### 4.3 — `tipo_mes` sem default explícito [BAIXO]
- **Evidência:** `engine-types.ts:51`
- **Impacto:** delta em saldo de salário, férias proporcionais, 13o proporcional

### 4.4 — `dia_fechamento_mes` opcional [BAIXO]
- **Evidência:** `engine-types.ts:53`
- **Cenário:** empresa fecha dia 20 ou 25 (comum). Operador esquece configurar
- **Impacto:** saldo de salário incorreto

### 4.5 — Erros de validação sem detalhe pro operador [MEDIO]
- **Evidência:** `orchestrator.ts:1614-1618` — `throw new Error('Cálculo bloqueado: [E-XXX] ...')`
- **Impacto:** operador vê código sem entender

### 4.6 — `gerar_verba_reflexa` enum sem documentação [ATENCAO]
- **Evidência:** `engine-types.ts:252`: `'devido' | 'diferenca'`
- **Usado em:** `orchestrator.ts:1168` (equiparação) com valor `'diferenca'`
- **Comportamento `'devido'` vs `'diferenca'`:** não documentado
- **Impacto:** desenvolvedores podem usar valor errado sem perceber

### 4.7 — "audit-fix C3" — `multasConfig` foi ignorado por meses? [INVESTIGAR HISTORICO]
- **Evidência:** `orchestrator.ts:1623` comentário: "26 constructor params (audit-fix C3 adicionou multasConfig)"
- **Implicação:** antes desse fix, configurações de multa salvas pela UI eram silenciosamente ignoradas
- **Ação necessária:** auditar git log pra saber quando fix entrou; listar cálculos gerados antes; notificar clientes (se houver) ou reprocessar

---

## 5. Roadmap recomendado

### Curto prazo (40-60h)

1. Adicionar reflexos automáticos em periculosidade (10-15h) — Sprint 7 FEITO
2. Implementar Insalubridade como módulo (6-10h) — Sprint 7 FEITO
3. Auditar fake front-end + validações (~6h) — Sprint 7 FEITO
4. Calibrar com N>=10 casos (8-12h) — Sprint 8
5. Migrar SELIC/TR/IPCA-E pro banco com precisão oficial (6-10h) — Sprint 8
6. Auditar histórico "audit-fix C3" (2-4h) — Sprint 8

### Médio prazo (80-150h)

7. Portar `relatorio/` (60-80h) — 63 arquivos faltando
8. Portar `5-SERVICOS/` (15-25h)
9. Multi-vínculos completo (20-30h)

### Longo prazo (200+h)

10. 80% de cobertura Java vs TS (objetivo "MRD Calc = PJe-Calc 95%")

---

## 6. Por que paridade 100% é impossível dessa estrutura

PJe-Calc 2.15.1 oficial é software jurídico do CNJ com 645 arquivos Java otimizados para 1 propósito específico. MRD Calc tem 17.66% portado + adaptações específicas para o workflow do escritório (importação .PJC, integração Supabase, UI custom).

Buscar 100% paridade ignora 3 fatos:
1. **Arredondamento HALF_EVEN vs HALF_UP** em algumas cadeias gera deltas no centavo
2. **Índices oficiais** (SELIC/IPCA-E/TR) publicados pela RFB/IBGE/BCB têm precisão maior que recalculados a partir de taxas mensais
3. **Edge cases jurídicos** específicos (Tema 1075 STJ, FGTS Súmula 362 TST nuances) podem nunca ter sido portados explicitamente

Objetivo realista: **96-99% em casos típicos, >=85% em complexos**, com transparência total sobre quais cenários a paridade cai.

---

## 7. Recomendação final

Não buscar perfeição. Buscar:
1. **Transparência:** operador sabe quando MRD Calc difere do desktop (banner UI)
2. **Robustez:** todos os módulos UI realmente afetam o cálculo (zero fake front-end)
3. **Cobertura priorizada:** reflexos jurídicos completos > novos módulos
4. **Calibração contínua:** N>=10 casos rodando em CI a cada PR

Esse roadmap garante "MRD Calc é confiável para uso profissional em escritório de advocacia trabalhista". Não garante "MRD Calc substitui o PJe-Calc desktop em todo cenário".

---

## 8. Itens descobertos — Auditoria Fake Front-end (2026-05-25)

Detalhes completos em `docs/AUDITORIA-FAKE-FRONTEND-2026-05-25.md`.

| Item | Prioridade | Esforço | Descrição |
|---|---|---|---|
| ExcecoesJuros → engine wiring | P1 | 1-2d | `PjeExcecaoJuros` tipo existe, service existe, falta wiring no orchestrator + consumo no engine |
| AjusteSentenca → cartão bridge | P2 | 3-5d | `worktime-adjuster.ts` existe, falta pipeline para agregar em `PjeCartaoPonto` |
| ParametrosGerais campos órfãos | P2 | <1d | `percentual_he_50/100`, `tipo_demissao`, `instancia` salvos mas não consumidos |
| Warnings UI (B1) | P0 | — | Resolvido nesta sprint: `MotorWarningsBanner` renderiza warnings do orchestrator |
