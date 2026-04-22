# PORT PJe-Calc — Changelog

Log de classes portadas por sessão. Cada entrada: data, fase, classe Java, linhas Java, linhas TS resultantes, testes adicionados, impacto no calibrate.

---

## Formato

```
### YYYY-MM-DD — Fase N — Sessão #M

**Classes portadas:**
- `CaminhoJava.java` (N linhas Java → M linhas TS) — M métodos; T testes golden
  - Observações: ...

**Impacto no calibrate:**
- Delta médio antes: X%
- Delta médio depois: Y%
- Casos melhorados: ...
- Casos inalterados: ...
- Casos piorados (investigar!): ...

**Divergências descobertas:**
- (vide PORT-PJECALC-KNOWN-DIVERGENCES.md)
```

---

## 2026-04-22 — Fase 0 — Sessão #1 (setup)

**Atividades:**
- Docs scaffolded (`PORT-PJECALC-PLAN.md`, `CHANGELOG`, `DECISIONS`, `KNOWN-DIVERGENCES`).
- `AUDITORIA-COMPLETA-PJECALC-vs-MRDCALC.md` consolidado.
- Harness de golden tests criado em `src/lib/pjecalc/core/__golden__/`.
- Feature flags `USE_PORTED_*` + helper `isPortedEnabled()`.
- Script `scripts/audit-java-vs-ts.ts` para CI.
- Baseline de calibrate capturado em `docs/baselines/calibrate-fase0.json`.

**Classes portadas:** nenhuma (setup).

**Impacto no calibrate:** baseline (N/A — ponto zero).
