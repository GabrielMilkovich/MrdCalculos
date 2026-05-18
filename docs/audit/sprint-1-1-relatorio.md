# SPRINT 1.1 — Relatório de gate humano (PASSO 0 + PASSO A)

**Branch:** `fix/tabelas-historicas-criticas` (cherry-pick dos recursos oficiais do PR #88)
**Status:** ⏸ **AGUARDANDO APROVAÇÃO HUMANA** antes do PASSO B.
**Data:** 2026-05-18

---

## PASSO 0 — SELIC hardcoded vs oficial

### Resultado: ✅ **MATCH 17/17**

`src/lib/pjecalc/indices-fallback.ts::SELIC_MENSAL` foi comparado contra `pjecalc-fonte/_recursos-oficiais/tabelas-historicas/csv/juros-selic-inss.csv` em todo o overlap (jan/2015 → mai/2016 = 17 competências):

```
2015-01: ✓  H=0.94  O=0.940000
2015-02: ✓  H=0.82  O=0.820000
...
2016-05: ✓  H=1.11  O=1.110000
RESULTADO: 17/17 batem
```

**Conclusão:** o cálculo de juros atual usando hardcoded **não tem bug de fonte**. Seed das tabelas Supabase SELIC_INSS/IRPF (PASSO D) será **redundante mas seguro**.

**Cobertura observada:**
- Hardcoded `SELIC_MENSAL`: 254 competências, 2005-01 a 2026-02 (atualizado mensalmente — ver header do arquivo).
- CSV oficial SELIC_INSS: 593 competências, 1988-04 a 2016-05 (dump v2.15.1 de 2016).
- CSV oficial SELIC_IRPF: 588 competências, 1971-09 a 2015-12.

O hardcoded cobre 2017-2026 que o oficial não tem (atualização contínua). Não há lacuna de cálculo.

---

## PASSO A — Casos potencialmente afetados

### Resultado empírico (via MCP execute_sql no projeto `xhvlhrgfoeahgofhljbs`):

| Conjunto | Casos afetados |
|---|---:|
| `salario_familia` (cases com `pjecalc_sal_familia_config.apurar = true`) | **0** |
| `inss_2003_2014` (cases com período em 2003-2014 AND `pjecalc_cs_config.apurar_segurado = true`) | **0** |
| `multa_1996_2009` (cases com demissão 1996-2009 AND multa apurada) | **0** |

### Diagnóstico do banco

```
metric                              count
─────────────────────────────────────────
cases_total                              6
cases_com_employment_contracts           0
sf_config_total                          0
sf_config_apurar_true                    0
cs_config_total                          0
cs_config_apurar_segurado                0
pjecalc_calculos_total                   0
pjecalc_resultado_total                  0
pjecalc_resultado_com_multa              0
employment_contratos_2003_2014           0
employment_demissao_1996_2009            0
```

**Conclusão:** o banco MRDCALCC (projeto `xhvlhrgfoeahgofhljbs`) está **praticamente vazio em produção**:
- 6 cases (provavelmente dev/test) — nenhum com contrato de emprego, configuração de CS/salário-família, cálculo executado ou resultado salvo.
- **Nenhum laudo real seria invalidado pelas correções dos PASSOS C/D.**

### Implicação para os próximos passos

A urgência operacional das migrations destrutivas (PASSO C) cai DRASTICAMENTE — não há cálculo real a re-executar. Mas o protocolo do prompt ainda exige decisão humana antes de prosseguir.

**Arquivos gerados:**
- `docs/audit/casos-afetados/salario-familia.csv` (vazio, só header)
- `docs/audit/casos-afetados/inss-2003-2014.csv` (vazio, só header)
- `docs/audit/casos-afetados/multa-1996-2009.csv` (vazio, só header)
- `scripts/extrair-casos-afetados.ts` (executável em qualquer ambiente Supabase com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)

---

## ⏸ Gate humano — A.3

**Status:** PARADO. Não prossigo para PASSO B (banner de revisão) sem aprovação explícita.

### Decisão pendente

Dado que **0 casos seriam afetados** em produção atual, escolha uma das três rotas:

**Rota 1 — Aprovar tudo, prosseguir B → C → D imediatamente**
- Aplica banner de revisão (vazio na prática)
- Corrige as 3 tabelas divergentes
- Faz seed das 3 tabelas vazias
- Risco zero pois não há laudo a re-executar

**Rota 2 — Pular PASSO B (banner), ir direto para C → D**
- Banner é overhead inútil para 0 casos
- Aplica direto as migrations de correção
- Recomendado se não há expectativa de migrar dados antigos para este banco

**Rota 3 — Adiar tudo até próxima janela de manutenção**
- Branch fica como está
- Próximo cálculo real entrará com dados corretos (a partir do dia X em que aplicar)
- Sem urgência

### Estado da branch agora

```
git log --oneline:
  5c7a0665 audit(sprint-1): tabelas-históricas oficiais + relatório de divergências
  08bb6089 fix(audit): fecha Bug #16 + Bug #31 + banners atualizados (#87)
  ...
```

Arquivos novos sem commitar:
- `docs/audit/sprint-1-1-relatorio.md` (este)
- `docs/audit/casos-afetados/*.csv` (3 vazios)
- `scripts/extrair-casos-afetados.ts`

---

## Validação técnica

| Métrica | Resultado |
|---|---|
| `npx tsc --noEmit` | ⏳ pendente |
| `npx vitest run` | ⏳ pendente |
| `supabase db reset` local | ❌ não aplicável neste passo (nenhuma migration criada) |

---

**Reproduzir tudo deste relatório:**

```bash
# 1. SELIC overlap check
for y in 2015 2016; do
  for m in 01 02 03 04 05; do
    [ "$y" = "2016" ] && [ "$m" -gt "05" ] && continue
    ofic=$(grep "DATE '${y}-${m}-01'" pjecalc-fonte/_recursos-oficiais/tabelas-historicas/csv/juros-selic-inss.csv | awk -F", " '{print $3}')
    hard=$(awk '/export const SELIC_MENSAL/,/^};?$/' src/lib/pjecalc/indices-fallback.ts | grep -oE "'${y}-${m}'[^,]+" | head -1)
    echo "${y}-${m}: H=$hard  O=$ofic"
  done
done

# 2. Contagem de casos afetados
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npx tsx scripts/extrair-casos-afetados.ts
```
