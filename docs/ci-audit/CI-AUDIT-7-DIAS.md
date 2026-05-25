# CI Audit — Últimos 7 dias

> Gerado em: 2026-05-25
> Método: análise de check_runs via GitHub API (PRs #95-#99) + reprodução local
> Branch base: main (HEAD: 16eefee)

## Estado atual de main (local + CI)

| Check | Local | CI (PR #99 final) | Veredicto |
|---|---|---|---|
| TypeScript (`tsc --noEmit`) | ✅ 0 erros | ✅ success | **Verde** |
| ESLint (`npm run lint`) | ✅ 0 erros, 97 warnings | ✅ success | **Verde** |
| Vitest (suite completa) | ✅ 2700 passed, 45 skipped | ✅ success | **Verde** |
| Build (`npm run build`) | ✅ success | ✅ success | **Verde** |
| Property-based testing (fast-check) | ✅ | ✅ success | **Verde** |
| Vitest suite ≥1388 | ✅ 2700 | ✅ success | **Verde** |
| Paridade PJe-Calc (golden) | ✅ 16 tests pass | ✅ success | **Verde** |
| Independent parity analysis | ✅ 16 tests pass | ✅ (no .pjc in CI) | **Verde** |
| **Calibrate ≥ 94%** | **❌ 92%** | **❌ failure** | **Vermelho** |
| Deploy Supabase | N/A | N/A (not triggered) | Sem dados |

## Resumo por categoria

| Categoria | Qtd falhas (7d) | Severidade | Workflows afetados | Status |
|---|---|---|---|---|
| `calibrate_grep_bug` | ~6+ (todo PR) | ✅ Auto-fix OK | Calibrate Regression Gate | CI config bug |
| `calibrate_real_92pct` | ~6+ (todo PR) | ❌ NÃO TOCAR | Calibrate Regression Gate | Regressão real |
| `lint_no_control_regex` | ~4 (PRs antigos) | ✅ Já corrigido | CI | Fixado por ca148a3 |
| `ci_parity_flaky` | 1+ (intermitente) | ⚠️ REVISAR | Parity Gate | Passa local, falha intermitente em CI |
| `stale_pr_failures` | 2 PRs | ⚠️ REVISAR | CI, Parity, Calibrate | PRs #95, #98 desatualizados |

---

## Detalhes por categoria

### 1. `calibrate_grep_bug` — ✅ Auto-fix OK

**Arquivo**: `.github/workflows/calibrate-regression-gate.yml`, job `calibrate-no-regression`

**Causa raiz**: O grep que extrai o percentual do output da calibração não funciona.

```yaml
# Linha do workflow (atual):
MEDIA=$(grep -oE 'media[: ]+([0-9]+\.?[0-9]*)' calibrate.log | ...)
```

**Problemas (2)**:

1. O script `calibration-pipeline-v3.ts` imprime `Média:` (com acento `é` e maiúscula `M`), mas o grep procura `media` (sem acento, minúscula). Resultado: grep não encontra nada → MEDIA=0.

2. Mesmo que encontrasse, o valor na linha `Média:` é o **delta médio** (`+2.50%`), não a **taxa de aprovação**. O valor correto está na linha `±5%:  12/13 (92%)`.

**Output real do script**:
```
  ±5%:  12/13 (92%)
  ±10%: 13/13 (100%)
  Média: +2.50%
```

**Fix proposto**: Reescrever o grep para extrair da linha `±5%`:
```bash
MEDIA=$(grep -oE '±5%:.*\([0-9]+%\)' calibrate.log | grep -oE '[0-9]+%' | tail -1 | tr -d '%' || echo "0")
```

---

### 2. `calibrate_real_92pct` — ❌ NÃO TOCAR

Mesmo com o grep corrigido, a taxa de aprovação ±5% é **92%** (12/13), abaixo do threshold de 94%.

**Caso que falha no ±5%**: `tiago-jose.pjc` com `bruto=+5.08%` (0.08pp acima do limite).

Todos os 13 casos válidos aprovam em ±10%. O caso `pyter-gabriel.pjc` não tem oracle (sem `<gprec>`).

Este é um problema de engine/calibração que toca `core/` — **não deve ser corrigido nesta sprint**.

---

### 3. `lint_no_control_regex` — ✅ Já corrigido

**Status**: Fixado no commit `ca148a3` (2026-05-25).

9 arquivos usavam regex `[\x00-\x1f]` para sanitizar nomes de arquivo (padrão legítimo). ESLint regra `no-control-regex` reportava erro. Fix: `eslint-disable-next-line` em cada ocorrência.

PRs antigos (#95, #98) ainda mostram esta falha porque estão baseados em commits anteriores ao fix.

---

### 4. `ci_parity_flaky` — ⚠️ REVISAR

Parity Gate falha intermitentemente em CI, mas passa 100% localmente (128 golden + 16 independent tests).

- PR #99 (mesmo código): ✅ passou
- PR #101 (mesmo código + docs): ❌ falhou
- Local com `PARITY_STRICT=true`: ✅ passa

Causas prováveis: timeout (10min limit, ~58s local), recurso do runner, ou `npm ci` transitório.

**Ação sugerida**: Se persistir, aumentar `timeout-minutes` no workflow ou investigar logs do runner.

---

### 5. `stale_pr_failures` — ⚠️ REVISAR

| PR | Branch | Criado em | Falhas | Recomendação |
|---|---|---|---|---|
| #95 | `fix/ocr-totalizadores-debito-bh` | 2026-05-20 | Lint ❌, Calibrate ❌, Parity ❌ | Rebase ou fechar |
| #98 | `claude/festive-goldberg-7HVpv` | 2026-05-25 | Lint ❌ | Rebase ou fechar |

Ambos os PRs estão baseados em código anterior aos fixes de lint. Depois de rebase em main, lint deve passar. Calibrate continuará falhando pelo item 2 acima.

---

## Workflows que NÃO falharam

| Workflow | Motivo | Status |
|---|---|---|
| Deploy Supabase | Não triggado (último push a main não tocou `supabase/`) | N/A |
| Pipeline de Calibração | Workflow manual (`workflow_dispatch`) | N/A |
| Update BCB Indices | Cron mensal (dia 5) + manual | N/A |

---

## Plano de ação proposto

### Fase 3 — Fixáveis (estimativa: 30min)

1. **Fix `calibrate_grep_bug`**: Corrigir grep pattern em `calibrate-regression-gate.yml` para extrair corretamente da linha `±5%`.
   - Risco: zero (apenas muda como CI lê o output, não muda cálculo)
   - Efeito: CI passará a reportar o valor correto (92%) em vez de 0%
   - ⚠️ CI continuará falhando porque 92% < 94% (item 2)

2. **Fechar/rebase PRs stale**: PRs #95 e #98 estão desatualizados.

### Não tocar

3. **`calibrate_real_92pct`**: Regressão real no engine. `tiago-jose.pjc` tem delta +5.08%. Precisa investigação de engine (outra sprint).

---

## ⏸️ GATE 1 — Triagem humana necessária

Gabriel, revise cada categoria acima e responda **NESTE PR** com triagem no formato:

```
TRIAGEM:
- calibrate_grep_bug: ✅
- calibrate_real_92pct: ❌
- lint_no_control_regex: ✅ (já fixado)
- ci_parity_flaky: ⚠️
- stale_pr_failures: ⚠️
```

**Sem essa triagem, Sprint 8 PAUSA aqui.**

Defaults sugeridos acima são apenas sugestão — você decide. Pode também:
- **Reclassificar** (ex: passar uma `⚠️` pra `❌`)
- **Pular categoria** (ex: deixar pra outra sprint)
- **Adicionar comentário** explicando contexto
