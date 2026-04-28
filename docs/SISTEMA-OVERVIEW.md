# SISTEMA OVERVIEW — Arquitetura Técnica

**Versão:** v3.2.0 · **Audiência:** desenvolvedores onboarding e arquitetos.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TypeScript strict |
| UI Kit | shadcn/ui (Radix) + Tailwind CSS + Lucide |
| Estado | TanStack Query + React Hook Form + Zod |
| Backend | Supabase (PostgreSQL + Edge Functions Deno/TS) |
| Banco | PostgreSQL via Supabase SDK — sem ORM |
| Cálculo | Decimal.js (20 dígitos) — proibido `number` em valores monetários |
| Testes | Vitest (unit/integration) + Playwright (E2E) |
| Build | Vite + SWC |

---

## Estrutura geral

```
src/
  lib/pjecalc/                 ← MOTOR (sem React)
    core/                      ← Porte 1:1 do PJe-Calc v2.15.1 Java
      dominio/                 ← inss, irpf, fgts, juros, indices, custas...
      comum/                   ← validators, optimizers, rotinas
      servicos/                ← serviços aplicacionais
    engine-v3.ts               ← ORQUESTRADOR canônico (1.484 linhas)
    engine.ts                  ← LEGADO (deprecated em Sprint 2)
    engine-v4.ts               ← EXPERIMENTAL (extends V3, isolado)
    orchestrator.ts            ← Ponto de entrada público (executarLiquidacao)
    modulos/                   ← Adapters UI ↔ core (inss, irpf...)
    verba-modules/             ← 42 templates de verbas
    pjc-analyzer.ts            ← Parser de .PJC nativo
    pdf-report-*.ts            ← 12 geradores de PDF
    esocial-*.ts               ← Exportação S-2500/S-2501
    __tests__/                 ← 600+ testes (paridade + golden + audit)
  components/
    cases/pjecalc/             ← 50+ módulos UI (ModuloFGTS, ModuloIR...)
    ui/                        ← shadcn/ui
  pages/                       ← rotas React Router
  hooks/                       ← usePjeCalculator (delega ao orchestrator)
  types/                       ← supabase.ts (gerado), domain types
supabase/
  migrations/                  ← 100+ migrations PLpgSQL — NUNCA editar aplicadas
  functions/                   ← 34 Edge Functions Deno/TS
e2e/                           ← testes Playwright
scripts/                       ← calibration, update-indices, audit
docs/
  calculos/                    ← 8 docs por módulo de cálculo
  HANDOFF-CEO.md
  SISTEMA-OVERVIEW.md
  RUNBOOK-PRODUCAO.md
```

---

## Pipeline de cálculo

```
.PJC (XML CNJ)
   │
   ▼
pjc-analyzer.ts        ← parseia XML, extrai verbas, dados, índices PJC
   │
   ▼
ParamsLiquidacao       ← struct normalizada (verbas, configs, períodos)
   │
   ▼
orchestrator.ts        ← executarLiquidacao(params)
   │
   ▼
engine-v3.ts           ← PjeCalcEngineV3.liquidar()
   ├─ Converte verbas UI → VerbaDeCalculo (core)
   ├─ Roda módulos: INSS → IRPF (via Calculo.liquidar)
   ├─ Aplica gates (combinar_indice, combinar_juros, RRA, ADC 58)
   ├─ Calcula FGTS, multas (467/477/523), honorários, pensão, custas
   └─ Retorna PjeLiquidacaoResult (resumo + ocorrências + auditoria)
   │
   ▼
ModuloResumo.tsx       ← exibe + permite drill-down
   │
   ├─ pdf-report-*.ts  ← gera 12 relatórios PDF
   ├─ esocial-export.ts← gera XML S-2500/S-2501
   └─ pjc-export.ts    ← gera .PJC para reimportar no PJe-Calc
```

**Hook canônico:** `useCalculo` / `usePjeCalculator` delega via
`executarLiquidacao` (orchestrator). Componentes nunca instanciam engine
diretamente, exceto `ModuloResumo.tsx:351` (caso legítimo de cálculo síncrono
para preview).

---

## Como adicionar uma NOVA FLAG (passo a passo)

### Cenário: nova flag `apurar_xpto` no módulo IR

1. **Tipos UI** — adicionar em `src/lib/pjecalc/engine-types.ts`:
   ```typescript
   export interface PjeIRConfig {
     // ...existing
     apurar_xpto?: boolean;     // Lei NN/AAAA, art. X — descrição curta
   }
   ```

2. **UI** — `src/components/cases/pjecalc/ModuloIR.tsx`:
   ```tsx
   <Checkbox
     checked={config.apurar_xpto ?? false}
     onCheckedChange={(v) => onChange({ ...config, apurar_xpto: !!v })}
   />
   <Label>Apurar XPTO (Lei NN/AAAA)</Label>
   ```

3. **Adapter** — `src/lib/pjecalc/modulos/irpf-modulo-adapter.ts`:
   ```typescript
   if (this.config.apurar_xpto) {
     // implementar a regra
   }
   ```

4. **Teste de paridade** — `src/lib/pjecalc/__tests__/`:
   - Criar `ir-xpto.test.ts` cobrindo caso ON e OFF.
   - Verificar não-regressão em `parity-gate.test.ts`.

5. **Documentar** — atualizar `docs/calculos/02-IRPF-tabela-RRA.md` (seção
   "Flags UI que controlam") e `docs/CHANGELOG.md`.

6. **E2E** (opcional, se afeta workflow) — adicionar em
   `e2e/fluxo-criar-calculo.spec.ts`.

7. **Validar** — `npx vitest run` (deve continuar 1.215+ green).

---

## Como adicionar um novo PJC ao calibrate

1. **Copiar arquivo** para `docs/PROCESSO_*.PJC` (mesmo padrão dos existentes).
2. **Rodar pipeline:**
   ```bash
   npm run calibrate              # roda contra corpus inteiro
   # ou
   npm run calibrate:dir docs/   # calibra um diretório
   ```
3. **Resultado** é gravado em `calibration-v3-YYYY-MM-DD.json` com:
   - `delta_pct` por PJC
   - `mean`, `p50`, `p95`
   - sumário "X% dentro de ±5% / Y% dentro de ±10%"
4. **Threshold de aceitação:** ≥ 95% dentro de ±5%. Se cair, investigar via
   `scripts/diagnostic-per-component.ts`.

---

## Como rodar testes

### Vitest (unit + integration)
```bash
npx vitest run                              # suite completa (~30s)
npx vitest run --reporter=verbose           # detalhado
npx vitest run src/lib/pjecalc/__tests__/   # apenas pasta
npx vitest run path/to/file.test.ts         # arquivo específico
npx vitest                                  # watch mode
```

### Playwright (E2E)
```bash
npm run test:e2e                            # 9 fluxos
npm run test:e2e:ui                         # modo interativo
npx playwright test --headed                # com browser visível
npx playwright show-report                  # HTML report
```

Pré-requisito E2E: `.env.e2e` configurado (ver `e2e/README.md`).

### Calibration (paridade Java)
```bash
npm run calibrate                           # PJC corpus
npm run calibrate:dir <path>                # diretório custom
```
Saída: `calibration-v3-YYYY-MM-DD.json`. Compromisso atual: **96% ±5%**.

### Build & lint
```bash
npx tsc --noEmit                            # checa tipos
npm run build                               # build prod (Vite + SWC)
npm run lint                                # ESLint
```

---

## Convenções inegociáveis

- **Decimal.js sempre** para valores monetários (precisão 20 dígitos).
- **`as any` proibido** sem comentário justificando.
- **RLS Supabase respeitado** — nunca `using(true)`.
- **Migrations imutáveis** — sempre criar nova, nunca editar aplicada.
- **Console.log proibido em produção** — usar `logger.ts`.
- Ver `CLAUDE.md` na raiz para o conjunto completo.

---

## Versionamento

| Constante | Local | Valor |
|---|---|---|
| `ENGINE_VERSION` | `orchestrator.ts` | 3.2.0 |
| `RULESET_VERSION` | `orchestrator.ts` | 2026.04.27 |
| `package.json` version | `package.json` | 0.0.0 (dev) |

Mudanças no ruleset (tabelas, alíquotas) → bump de RULESET_VERSION.
Mudanças quebra-paridade do motor → bump de major em ENGINE_VERSION.
