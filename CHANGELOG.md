# Changelog — MRD Calc

Todas as mudanças notáveis neste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [v3.2.0] — 2026-04-27 — Sprint 4-6 (Toggle Coverage Matrix + Edge Cases + Docs)

### Added (Sprint 4 — 30 flags conectadas)
- **TIER 1 — RRA + ADC 58 (commits `6e1e215`, `4500952`, `a7c55a0`):**
  - IRPF: flags `apurar_rra`, `aplicar_regime_caixa`,
    `incidir_sobre_principal_tributavel`, `incidir_sobre_principal_nao_tributavel`
    (Lei 7.713/88 art. 12-A — RRA).
  - Correção: flags `combinar_indice`, `combinar_juros`, `juros_pre_judicial`
    (ADC 58/59 STF + Súm.TST 381 + CC art. 406).
- **TIER 2 — Súm.TST 200 + CC + CLT (commits `9257653`, `2d28f51`):**
  - 10 flags de devida/paga em CS (`cs_dev_*`, `cs_pago_*`) — Súm.TST 200,
    Lei 11.941/09 art.43, RFB 1.117/10.
  - INSS: `simples_nacional` (LC 123/2006 — desativa cota patronal).
  - Multas: `apurar_477` (CLT art. 477 §8 — 1 salário), unificação `multa_523`.
  - Pensão: módulo `apurar` + `tipo` + `base` + `incide_13_ferias` (CC 1.694).
- **TIER 3 — Pensão / Atualização / Honorários (commit `042407a`):**
  - 9 flags de pensão alimentícia, atualização monetária por período e
    honorários sucumbenciais (CLT 791-A).

### Changed (Sprint 4 — UX)
- **6 badges "Em estudo" (commit `2749886`)** — UI sinaliza visualmente flags
  Phase 2 ainda não implementadas: `incidir_sobre_juros`, `cobrar_reclamado`,
  `cs_dev_correcao_trab`, `cs_dev_juros_trab`, `cs_dev_multa_prev_aplicar`,
  `meses_pagamento` (pensão).

### Removed (Sprint 4 — cleanup)
- **9 flags órfãs removidas (commit `a7e49b0`)** — flags sem caso de uso
  documentado, presentes só na UI sem efeito no engine. Decisão tomada após
  triagem caso a caso (Sprint 4.1).

### Tested (Sprint 5 — edge cases)
- **30 cenários críticos documentados (commit `6327039`)** — P0 bloqueadores,
  P1 regulatórios, P2 inputs especiais.
  - 4 cobertos por teste automatizado.
  - 26 documentados como backlog técnico-jurídico (Sprint 7+).

### Documentation (Sprint 6 — este release)
- **8 docs por módulo** em `docs/calculos/` — INSS, IRPF/RRA, FGTS, Correção
  ADC 58, Juros Mora, Multas CLT/CPC, Honorários, Pensão Alimentícia.
- **`docs/HANDOFF-CEO.md`** — relatório executivo (1 página).
- **`docs/SISTEMA-OVERVIEW.md`** — guia técnico para devs.
- **`docs/RUNBOOK-PRODUCAO.md`** — operações, env vars, rollback.
- **`README.md`** — atualizado com versão e links.

### Métricas finais v3.2.0
- **Paridade Java:** 96% ±5% / 100% ±10% em 47 PJCs reais.
- **Viés médio:** +0,08%.
- **Vitest:** 1.215 passing · 32 skipped · 0 failed.
- **Playwright:** 9 fluxos críticos passing.

---

## [v3.1.0] — 2026-04-26 — Sprint 1-3 (Auditoria + Engine + E2E)

### Added
- Sprint 2.5 (commit `818a966`): `.env.e2e`, auth mock robusto, fixtures.
- Sprint 3 (commit `ca95edf`): 5 fluxos E2E críticos com trace
  (criar, importar, editar, índice, juros).
- Engine: `TAXA_LEGAL` pós Lei 14.905/2024 = SELIC composta com IPCA-E
  (commit `a6224ad`).
- Engine: `TRD_SIMPLES = TR + 0,15%/m` — Tabela Única JT empírica
  (commit `1b4ddae`).

### Changed
- Engine v1 (`engine.ts`) marcado `@deprecated` (commit `ed56181`).
- `liquidarMultiVinculo()` removido (dead code).
- V4 (`engine-v4.ts`) documentado como experimental (não em produção).

### Fixed
- Engine respeita `comporPrincipal=NAO` no totals (commit `00f8df0`) —
  paridade Java exata.
- Parser .PJC: tags `<Irpf>` e `<irpf>` ambas aceitas (commit `d3dad35`).
- E2E: seletor checkbox `apurar_rra` corrigido (Checkbox e Label são irmãos
  no DOM — commit `4500952`).

### Documentation (Sprint 1)
- `docs/STATE-OF-SYSTEM.md` — auditoria completa pré-Sprint 4 (5 agentes).
- 18 reports em `.claude/agents/state/SPRINT-AUDIT/`.

---

## [v3.0.0] — 2026-04-25 — Engine V3 consolidado (canônico)

### Added
- `engine-v3.ts` (1.484 linhas) — orquestrador canônico em produção.
- `orchestrator.ts` — ponto de entrada público (`executarLiquidacao`).
- `core/` — porte 1:1 do PJe-Calc v2.15.1 Java (módulos INSS, IRPF, FGTS,
  juros, índices, custas, formula).
- 42 templates de verbas (`verba-modules/`).
- 12 geradores de PDF (memória, consolidado, custas, precatório, e-Social...).
- Exportação e-Social (S-2500/S-2501).

### Métricas v3.0.0
- Vitest: 600+ testes
- Paridade: 12/17 PJCs ≤ 10%

---

## Convenções

- **Versão MAJOR** (Xx.0.0): mudança quebra-paridade ou remoção de feature.
- **Versão MINOR** (3.x.0): nova feature, flag, módulo.
- **Versão PATCH** (3.2.x): bugfix, refactor, docs.
- **RULESET_VERSION** (data ISO): bump quando tabelas/alíquotas mudam.

---

## Links

- [HANDOFF-CEO](./docs/HANDOFF-CEO.md)
- [SISTEMA-OVERVIEW](./docs/SISTEMA-OVERVIEW.md)
- [RUNBOOK-PRODUCAO](./docs/RUNBOOK-PRODUCAO.md)
- [Docs por módulo de cálculo](./docs/calculos/)
