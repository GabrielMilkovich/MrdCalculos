# SPRINT 1 — Tabelas históricas: divergências Supabase vs oficial PJe-Calc v2.15.1

**Gerado em:** 2026-05-18 (manual via MCP `execute_sql` no projeto `xhvlhrgfoeahgofhljbs` (MRDCALCC))
**Fonte oficial:** `pjecalc-fonte/_recursos-oficiais/tabelas-historicas/csv/` (12 CSVs extraídos do JAR PJe-Calc Cidadão v2.15.1)
**Script reprodutível:** `scripts/comparar-tabelas-supabase-vs-oficial.ts`
**Status da migration de seed:** ❌ **NÃO CRIADA** — prompt manda parar quando há divergência de valor

---

## Resumo executivo

| Métrica | Quantidade |
|---|---:|
| Tabelas avaliadas | 11 (12 CSVs — 1 sem equivalente) |
| Tabelas **idênticas no overlap** (valor bate) | **1** (`pjecalc_salario_minimo`) |
| Tabelas **divergentes de valor** | **3** (`pjecalc_inss_faixas`, `pjecalc_inss_multa`, `pjecalc_salario_familia`) |
| Tabelas **vazias no Supabase** (todas faltantes) | **3** (`pjecalc_inss_faixas_domestico`, SELIC INSS, SELIC IRPF) |
| Tabelas **só com faltantes / granularidade diferente** | **4** |

**Veredicto:** ⚠ **NÃO APLICAR MIGRATION DE SEED SEM REVISÃO HUMANA.** Pelo menos uma tabela (`pjecalc_salario_familia`) tem valores oficiais **completamente diferentes** dos atuais no Supabase — fonte original do dado no Supabase é desconhecida. Possíveis causas:

1. Bug histórico no seed antigo (valores trocados / fonte errada)
2. Update legítimo pós-dump do PJe-Calc v2.15.1 que não conheço
3. Outra tabela legal (ex: salário-família TRT-específico) misturada à oficial

Operador precisa decidir caso-a-caso antes de qualquer escrita.

---

## Detalhamento por tabela

| CSV oficial | Tabela Supabase | Linhas oficiais | Linhas Sup | Status |
|---|---|---:|---:|---|
| salario-minimo-nacional.csv | pjecalc_salario_minimo | 600 | 28 | ✓ idêntica (18/18 overlap), 572 faltantes |
| inss-base-teto.csv | pjecalc_inss_faixas | 239 | 157 (subset c/ teto) | ⚠ ver INSS-faixas abaixo |
| inss-faixas-segurado-empregado.csv | pjecalc_inss_faixas | 624 | 157 | 🔴 **divergente + duplicado** |
| inss-faixas-empregado-domestico.csv | pjecalc_inss_faixas_domestico | 552 | **0** | ❌ vazia |
| salario-familia-faixas.csv | pjecalc_salario_familia | 360 | 54 | 🔴 **divergência grave de valor** |
| seguro-desemprego-faixas.csv | pjecalc_seguro_desemprego | 370 | 81 | ⚠ não validado byte-a-byte (a checar) |
| inss-taxa-multa.csv | pjecalc_inss_multa | 11 | 2 | 🔴 **dado inventado** (1996-01 com 4.0%) |
| juros-taxa-legal.csv | pjecalc_taxa_legal | 93 (diário) | 21 (mensal) | ⚠ granularidade incompatível |
| juros-selic-inss.csv | index_series (SELIC_INSS) | 593 | **0** | ❌ vazia |
| juros-selic-irpf.csv | index_series (SELIC_IRPF) | 588 | **0** | ❌ vazia |
| feriados-nacionais.csv | pjecalc_feriados (scope=nacional) | (~50 cabeçalho federal) | 339 | ⚠ super-set — Sup tem mais (estadual/municipal incluídos) |
| juros-padrao.csv | _(sem equivalente)_ | 3 | — | ℹ não há tabela Supabase correspondente |

---

## 1. Idênticas

### `pjecalc_salario_minimo` ↔ `salario-minimo-nacional.csv`

**18/18 valores idênticos** no overlap 2000-2016. Diferença é só cobertura:

- Oficial cobre 1967-01 a 2016-12 (600 entradas).
- Supabase cobre 2000-01 a 2026-01 (28 entradas) — algumas missing entre vigências oficiais (Supabase guarda só a primeira competência de cada vigência; oficial repete por mês).

Amostra das competências comparadas:

| Competência | Supabase | Oficial | Δ |
|---|---|---|---|
| 2000-01-01 | 136.00 | 136.00 | ✓ 0 |
| 2010-01-01 | 510.00 | 510.00 | ✓ 0 |
| 2015-01-01 | 788.00 | 788.00 | ✓ 0 |
| 2016-01-01 | 880.00 | 880.00 | ✓ 0 |

**Recomendação:** seed das 572 competências faltantes (1967-1999) é seguro.

---

## 2. Divergentes (valor diferente — BLOQUEADOR)

### 🔴 `pjecalc_inss_faixas` ↔ `inss-faixas-segurado-empregado.csv`

**Problema 1: duplicação de rows.** Cada competência tem **2 rows por faixa** com valores divergentes:

```
Supabase pjecalc_inss_faixas WHERE competencia_inicio='2010-01-01':
  faixa 1: valor_ate=1024.97, aliq=0.08
  faixa 1: valor_ate=1040.22, aliq=0.08   ← 2º valor diferente
  faixa 2: valor_ate=1700.00, aliq=0.09
  faixa 2: valor_ate=1733.70, aliq=0.09   ← 2º valor diferente
  faixa 3: valor_ate=2049.00, aliq=0.11   ← errado (não bate com oficial)
  faixa 3: valor_ate=3467.40, aliq=0.11
```

CSV oficial 2010-01-01: faixa 1 termina em **1024.97**, faixa 2 termina em **1708.27**, faixa 3 (teto INSS) é **3467.40**.

| Faixa | Oficial | Sup row 1 | Sup row 2 | Match? |
|---|---|---|---|---|
| 1 | 1024.97 | 1024.97 ✓ | 1040.22 ❌ | parcial |
| 2 | 1708.27 | 1700.00 ❌ | 1733.70 ❌ | nenhum |
| 3 | 3467.40 (teto) | 2049.00 ❌ | 3467.40 ✓ | parcial |

**Diagnóstico:** o seed atual misturou 2 fontes diferentes. Uma das duplicatas bate com oficial PJe-Calc; a outra parece ser **tabela RFB diferente** (talvez INSS empregador, que tem alíquotas e faixas diferentes).

**Escopo:** ocorre em todas as competências 2003-2014 (24+ rows duplicadas confirmadas).

### 🔴 `pjecalc_salario_familia` ↔ `salario-familia-faixas.csv`

**Valores completamente diferentes.** Exemplos no overlap 2000-2003:

| Competência | Faixa | Sup valor_final | Sup valor_cota | Oficial valor_final | Oficial valor_cota |
|---|---|---|---|---|---|
| 2000-04 | 1 | 376.99 | 11.24 | **376.60** | **9.05** |
| 2000-04 | 2 | 565.49 | 7.88 | (Oficial só tem 1 faixa nesta data) | — |
| 2001-04 | 1 | 435.83 | 13.05 | **398.48** | **9.58** |
| 2002-04 | 1 | 480.31 | 14.46 | **429.00** | **10.31** |
| 2003-04 | 1 | 560.81 | 15.74 | **468.47** | **11.26** |

**Diagnóstico:** o Supabase tem valores que NÃO existem em nenhuma competência oficial — não é dado de outra data, é fonte completamente diferente. Pode ser tabela TRT-específica ou seed sintético antigo.

**Impacto jurídico:** cálculo de salário-família para empregados com competências < 2009 (período cobertura Supabase) usa números errados. Erro fixo em laudo.

### 🔴 `pjecalc_inss_multa` ↔ `inss-taxa-multa.csv`

Supabase tem só 2 linhas:

```
1996-01-01 → 2009-01-27: 4.0%/mês, teto 100%
2009-01-28 → null: 0.33%/mês, teto 20%
```

CSV oficial tem **11 linhas** segmentadas em períodos diferentes:

```
1967-01 → 1989-08: 50%   (urbana)
1989-09 → 1991-07: 10%
1991-08 → 1991-11: 40%
1991-12 → 1999-11: 10%
1999-12 → 2008-11: 20%
2008-12 → null:    0.33% (diária, teto 20)
+ 5 linhas equivalentes para 'R' (rural)
```

**Diagnóstico:**
- A linha Supabase `1996-01 → 2009-01-27: 4.0%` **não tem fundamento legal conhecido** — entre 1991-12 e 1999-11 era 10%, depois 20%. Nunca houve 4% em multa INSS.
- A linha `2009-01-28: 0.33%` bate com o oficial (`2008-12-01: 0.33%` — pequena diferença de data, mesma vigência).

**Diagnóstico provável:** seed antigo errado. Tabela atual produz cálculo INSS-multa errado para qualquer reclamação com vigência < 2009.

---

## 3. Faltantes no Supabase

(Listadas só as 3 mais críticas — relatório completo no script.)

### `pjecalc_inss_faixas_domestico` — vazia (0 rows)

CSV oficial: **552 linhas** cobrindo 2002-02 a 2024+. Supabase: **0**. Sem isso, qualquer cálculo de doméstico cai em fallback ou falha.

### `index_series` (SELIC_INSS) — vazia (0 rows)

CSV oficial: **593 SELIC INSS mensais** (1988-04 a 2024+). Supabase: 0. Engine V3 hoje deve estar usando fallback hardcoded para correção INSS.

### `index_series` (SELIC_IRPF) — vazia (0 rows)

CSV oficial: **588 SELIC IRPF mensais** (1971-09 a 2024+). Supabase: 0.

### `pjecalc_salario_minimo` — 572 faltantes

Cobertura oficial 1967-1999 ausente. Para cálculos com vínculos antigos (vigências pré-2000), Supabase cai em null.

---

## 4. Notas sobre granularidade incompatível

### `pjecalc_taxa_legal` — granularidade diferente

- **Oficial:** 93 linhas, uma POR DIA, todas em 2024-08-30 a 2024-11-30.
- **Supabase:** 21 linhas, uma POR MÊS, cobrindo 2024-08 a 2026-04.

Não dá pra comparar diretamente — Supabase consolida em mensal. Para validar:
1. Para cada mês do Supabase, somar todas as taxas diárias oficiais do mês → comparar.
2. OU substituir Supabase pela versão diária oficial (mudança de schema, fora do escopo SPRINT 1).

**Recomendação:** marcar como "necessita decisão de schema" — não é uma migration simples de seed.

### `pjecalc_feriados` — Supabase é superset

Supabase tem **339 feriados** (`scope=nacional`); CSV oficial tem ~50 feriados federais. Supabase incluiu feriados estaduais/municipais marcados como `scope=nacional` (provável bug de classificação) — não devemos sobrescrever, mas auditar.

---

## Recomendações operacionais

**Ordem sugerida de remediação:**

1. **Não tocar em `pjecalc_salario_minimo`** — está correto. Eventualmente seedar 1967-1999 com `ON CONFLICT DO NOTHING` quando você confirmar que cálculos antigos não precisam desses valores.

2. **`pjecalc_inss_faixas`** — exige correção manual:
   - DELETE das duplicatas com valores não-oficiais (preservando a row que bate com CSV).
   - INSERT do oficial onde faltar.
   - Sugestão de script: `DELETE FROM ... WHERE NOT EXISTS (... oficial ...)` — mas só faça após operador validar que cálculos de paridade PJC ainda passam.

3. **`pjecalc_salario_familia`** — **PARAR USO** até decisão:
   - Cálculos atuais usam valores errados (confirmado).
   - DELETE total + reseed do oficial pode invalidar resultados antigos salvos.
   - Decisão de produto: aceitar erro histórico ou marcar casos antigos como "REVISAR — salário-família corrigido".

4. **`pjecalc_inss_multa`** — DELETE da linha `1996-01-01` (inventada) + INSERT das 5 linhas oficiais que faltam.

5. **`pjecalc_inss_faixas_domestico`, SELIC INSS/IRPF** — seedar tudo. Estão vazios, não há conflito.

6. **`pjecalc_taxa_legal`** — decisão de schema antes de seed (manter mensal consolidado OU mudar para diário).

7. **`pjecalc_feriados`** — auditar quais 339 entradas em `scope=nacional` realmente são nacionais. Possivelmente migrar para `scope=estadual`/`municipal` os que vazaram.

---

## Próximos passos

- [ ] **Operador decide** uma a uma as 3 tabelas com divergência grave (item 2, 3, 4 acima).
- [ ] Para as 3 vazias (item 5), criar migration `<ts>_seed_tabelas_historicas_oficiais.sql` simples — apenas INSERT com ON CONFLICT DO NOTHING.
- [ ] Para as faltantes em `pjecalc_salario_minimo` (item 1), idem.
- [ ] Quando aplicar migrations, regenerar tipos: `npx supabase gen types typescript --local > src/types/supabase.ts`.

---

**Reproduzir este relatório:**

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npx tsx scripts/comparar-tabelas-supabase-vs-oficial.ts
```

(Saída automatizada do script complementa este relatório manual com a contagem completa de faltantes por tabela.)
