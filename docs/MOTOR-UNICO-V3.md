# Motor Único — PjeCalcEngineV3

**Data de consolidação:** 2026-04-22
**Branch:** `feat/consolidar-v3-motor-unico`
**Commits:** consolidação em 4 commits sequenciais (mover legados → warnings → docs → push).

---

## Decisão arquitetural

A partir desta PR, **PjeCalcEngineV3** é o único motor de cálculo trabalhista
em uso em produção. Os motores legados foram movidos para `_legacy/` em seus
respectivos diretórios e estão marcados como `@deprecated` com warnings de
runtime visíveis fora de testes.

## Motor ativo

- **Classe:** `PjeCalcEngineV3`
- **Arquivo:** `src/lib/pjecalc/engine-v3.ts`
- **Core (port 1:1 do PJe-Calc v2.15.1 Java):** `src/lib/pjecalc/core/` (348 arquivos)
- **Instanciado em:**
  - `src/lib/pjecalc/orchestrator.ts:1272` (todos os cálculos via UI)
  - `src/components/cases/pjecalc/ModuloResumo.tsx`
  - `src/components/cases/pjecalc/VerbaPreview.tsx`

## Estado de paridade ao consolidar

Conforme `docs/GATE2-FINAL.md` (17/abr/2026):

- **12/17 casos** dentro de ±10% (71%)
- **7/17 casos** dentro de ±5% (41%)
- **1/17 casos** dentro de ±1%
- Delta médio absoluto: ~9-10%
- Delta global: ~+5%

Meta do escritório: **todos os casos em [-1%, +5%]**. Essa meta será atacada
em PRs posteriores focadas em (não nesta consolidação):

1. Correção da duplicação de reflexos em `pjc-to-engine.ts`
2. Ativação de flags opt-in (`selic_pro_rata_die`, `atualizar_inss_selic`, `VERBA_INSS`)
3. Seed Supabase com séries RFB/IBGE oficiais
4. Port de `MaquinaDeCalculoDeIrpf`/`MaquinaDeCalculoDoInss` per-competência
5. Série JAM diária para FGTS

## Motores legados em quarentena

| Motor | Arquivo | Status |
|---|---|---|
| `PjeCalcEngine` (V1) | `src/lib/pjecalc/_legacy/engine.ts` | deprecated, remoção após **2026-05-20** |
| `PjeCalcEngineV4` | `src/lib/pjecalc/_legacy/engine-v4.ts` | deprecated, remoção após **2026-05-20** |
| `CalculationEngine` (V1) | `src/lib/calculation/_legacy/engine.ts` | deprecated, remoção após **2026-05-20** |
| `CalculationEngineV2` | `src/lib/calculation/_legacy/engine/CalculationEngineV2.ts` | deprecated, remoção após **2026-05-20** |

Cada construtor emite `console.warn` com stacktrace quando instanciado em
ambiente que não seja `NODE_ENV=test`. Isso permite detectar uso residual em
produção via monitoramento de logs sem poluir output dos parity tests
(`parity-v4-vs-pjc.test.ts` etc.) que continuam rodando.

## Política de uso

- ✅ Novo código: sempre importar de `@/lib/pjecalc/engine-v3` ou usar `orchestrator`.
- ❌ Não importar de `_legacy/` em código novo.
- ❌ Não corrigir bugs em `_legacy/` (exceto segurança crítica).
- ❌ Não adicionar features em `_legacy/`.

## Remoção planejada

PR separada em ~4 semanas (após **2026-05-20**) apagará os diretórios
`_legacy/` permanentemente. Pré-requisito: zero ocorrências de warnings de
deprecação no monitoramento de produção durante esse período.

---

## Notas importantes sobre o estado da consolidação

### Nota A — `npm run calibrate` ainda mede V1 (não V3)

Apesar da UI em produção usar `PjeCalcEngineV3` desde o GATE2 de 17/abr/2026,
**o script `npm run calibrate` atualmente mede `PjeCalcEngine` (V1 legado, agora
em `_legacy/`)**. Isso é evidente em `scripts/calibration-pipeline.ts:25`:

```ts
const { PjeCalcEngine } = await import('../src/lib/pjecalc/_legacy/engine.js');
```

(O caminho `_legacy/engine.js` foi atualizado nesta PR; o comportamento de
medir V1 não mudou.)

**Implicação prática:** os números reportados em `docs/BASELINE.md` e
`docs/GATE2-FINAL.md` (incluindo o delta médio de **-30,68%** atual) refletem
**V1 contra PJC**, não V3 contra PJC. Uma PR futura migrará `calibration-pipeline.ts`
para instanciar V3 (`PjeCalcEngineV3`), permitindo medir paridade real do
motor ativo. Até lá, esses números são baseline conhecido de uma medida
diferente do que está em produção.

Nesta PR, a manutenção do calibrate medindo V1 é **proposital**: garante que
a consolidação não introduziu drift acidental em V1 (calibrate byte-idêntico
antes/depois confirma).

### Nota B — Ajustes mecânicos de path interno em arquivos movidos

Durante o Commit 2, os arquivos movidos para `_legacy/` tiveram seus imports
relativos ajustados (ex.: `'./engine-types'` → `'../engine-types'`) porque
mudaram de profundidade no diretório.

Essa mudança é **estruturalmente obrigatória** após o `git mv`
(o path relativo precisa subir um nível para alcançar siblings que ficaram
no diretório-pai) e **semanticamente neutra**: o arquivo de destino é o mesmo,
apenas o caminho para chegar lá mudou de notação.

O calibrate produz JSON byte-idêntico antes/depois (modulo o timestamp de
execução `data`), o que confirma que **zero comportamento mudou**. Nenhuma
lógica de cálculo foi alterada.

Total: ~27 linhas de ajuste de path em ~10 arquivos movidos. A maioria são
substituições simples de prefixo (`./X` → `../X` ou `../X` → `../../X`).
Detalhes no commit `chore(arch): mover motores legados para _legacy/`.

### Nota C — Estado de paridade reportado é V1, não meta de V3

O estado de paridade descrito acima (12/17 casos ≤10%, 7/17 ≤5%, etc.) vem
de `docs/GATE2-FINAL.md` e reflete a medida **V1 contra PJC** (ver Nota A).

A paridade real de **V3 contra PJC** ainda não foi medida sistematicamente
no formato GATE — o GATE2-FINAL precede a refatoração do `calibration-pipeline`
que será feita em PR futura.

Quando essa migração ocorrer, o relatório terá nova baseline V3-vs-PJC. Os
números podem ser:
- Melhores (V3 corrigiu bugs que V1 tinha)
- Piores (V3 introduziu bugs que V1 não tinha)
- Equivalentes (V3 reproduz V1 bit-a-bit)

**Esta PR não muda o número.** Apenas isola V1 em `_legacy/` e prepara o
terreno para a migração de medição.

---

## Estado da consolidação (gates da PR)

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run` | 652 passed / 6 skipped / 0 failed (49 suites, 658 total) — idêntico ao baseline pré-PR |
| `npm run calibrate` | -30,68% médio, 14 total / 13 válidos / 1 erro — JSON byte-idêntico ao baseline (modulo timestamp) |
| `git diff main` | 27 arquivos: 19 renames (R), 6 imports atualizados (1-2 linhas cada), 1 barrel atualizado (preserva 7 símbolos exportados), 2 READMEs novos, ~27 ajustes mecânicos de path interno |
| Arquivos protegidos intocados | `engine-v3.ts`, `core/`, `orchestrator.ts`, `pjc-to-engine.ts`, `verba-modules/`, `pdf-report-*.ts` — todos com `git diff = 0` |

---

## Histórico

- **2026-04-22 (esta PR):** consolidação V3 + isolamento de V1/V2/V4 em `_legacy/`.
- **2026-04-17 (`docs/GATE2-FINAL.md`):** GATE2 — V3 atinge 12/17 ≤10% em paridade.
- **Antes:** múltiplos motores coexistiam (V1 monolítico, V2 com rubricas,
  V3 portado, V4 experimental). Cada um instanciado por componentes
  diferentes. Esta consolidação unifica em V3.
