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

---

## 2026-04-22 — Fase 1 — Sessão #1 (fundação — `base/comum/` + `constantes/`)

**Classes portadas:**
- `base/comum/Constantes.java` (17 linhas Java → 44 linhas TS) — marcos legais
  (Reforma Trabalhista 11/11/2017, Reforma Previdência 01/03/2020, Lei
  12.506/2011 aviso prévio proporcional), separadores e constantes numéricas.
- `base/comum/HelperIterate.java` (25 linhas Java → 36 linhas TS) — wrapper
  fluente `iterate(coll).where(pred)`. Preserva simetria com código cliente
  que será portado em fases seguintes.
- `base/comum/Utils.java` — string helpers ausentes (isVazio, isNaoVazios,
  substituirPontoPorVirgula, filtrarSomenteNumeros, objetoParaString).
- 6 enums espelhados em arquivos individuais `constantes/<nome>.ts`:
  - `TipoDeVerbaEnum` (P/R)
  - `TipoFeriadoEnum` (F/P/B)
  - `AbrangenciaDoFeriadoEnum` (F/E/M — Federal/Estadual/Municipal)
  - `TipoSalarioPagoEnum` (N/U/M/H)
  - `TipoValorCalculadoEnum` (VALOR_DEVIDO/VALOR_PAGO)
  - `DestinoDoFgtsEnum` (P/D + nome + mensagem)

  Padrão adotado: `enum X { A = 'A' }` + `XNomes: Record<X, string>`
  companion map quando Java tem campo `nome` (ou `mensagem`) associado.

**Testes adicionados:** 34 novos
- 6 Constantes (marcos legais)
- 5 HelperIterate (iteração, null-safety, Iterable customizado)
- 12 string helpers de Utils
- 11 enums espelhados (cobre todos os 6 enums + companion maps)

**Gate Fase 1:**
- Vitest: 707 passed | 6 skipped | 0 failed (55 suites, +34 testes novos).
- `tsc --noEmit`: limpo.
- `npm run calibrate`: 13/13 casos válidos, delta médio **-30,68%**
  (idêntico ao baseline Fase 0 — ausência de regressão confirmada).
- `npm run audit:port:check`: OK (cobertura subiu 17,6% → 17,7%).

**Classes fora desta sessão (decisão explícita):**
- `Competencia.java`, `HelperDate.java`, `Periodo.java` já estão 95%+
  cobertas — sem gap material acionável pelos 14 casos.
- Métodos de Utils omitidos: reflexão, Groovy shell, I/O (GZIP/ZIP),
  ResourceBundle, formatação UI — fora do caminho de cálculo.
- `TipoDeCorrecaoDoFgtsEnum` (polimórfico com `abstract indice(OcorrenciaDeFgts)`)
  — port adiado para Fase 6, quando `OcorrenciaDeFgts` for completado.

**Impacto no calibrate:** nulo (fundação; impacto real começa a Fase 3).

**Divergências descobertas:** nenhuma.

---

## 2026-04-22 — Fase 2 — Sessão #1 (tabelas de índices)

**Escopo:** golden tests para as 7 tabelas de índices já populadas (Jan/2005 → Fev/2026, 254 competências cada).

**Atividades:**
- Novo arquivo `src/lib/pjecalc/core/dominio/indices/__tests__/tabelas-indices.golden.test.ts` com 4 camadas de validação por tabela:
  1. Snapshot SHA-256 da tabela inteira (detecta mudanças acidentais).
  2. Amostra longitudinal (≥50 competências) com `toBeCloseTo(taxa, 10)`.
  3. Validação de cálculo acumulado (multiplicativo para IPCA-E, somatório simples para SELIC).
  4. Integridade estrutural (sem buracos entre meses) + range plausível.

**Tabelas validadas:**
- `TABELA_IPCAE` — 50+ competências, acumulado Jan-Dez/2020 ≈ 4,52% (IBGE oficial).
- `TABELA_IPCA` — 15+ competências, snapshot.
- `TABELA_TR` — período zero-TR 2017-2021 validado.
- `TABELA_SELIC_MENSAL` — mínimo pandemia 2020-08, pico SELIC 2023, acumulado ≈ 12% em 2023.
- `TABELA_INPC` / `TABELA_IGPM` / `TABELA_IPC` — sanity (integridade + range + hash).

**Divergências descobertas:**
- **DV-001** — `TABELA_IPCA` é cópia byte-a-byte de `TABELA_IPCAE` (mesmo hash SHA-256). IBGE publica IPCA e IPCA-E como séries distintas com diferenças de 0,01 a 0,5% em picos. Afeta casos com combinações `"indice":"IPCA"` (ex: leide-santana pós-2024-08-30). Preservada por fidelidade; correção pós-Fase 9. Ver `PORT-PJECALC-KNOWN-DIVERGENCES.md` DV-001.

**Classes fora desta sessão (decisão explícita):**
- `JurosTaxaLegal.java` (TAXA_LEGAL): Warning W047 do calibrate indica que o engine atual já tolera ausência dos dados via fallback. Port adiado para Fase 6 (FGTS) onde os dados seriam populados com Lei 14.905/2024.
- SELIC diária, SELIC Fazenda, JAM, DFP, DNFP, IT, Tabela Única, precatórios — tabelas com esqueleto mas sem dados populados; port adiado até haver caso que as acione.

**Gate Fase 2:**
- Vitest: 734 passed | 6 skipped | 0 failed (+27 testes novos vs Fase 1).
- `tsc --noEmit`: limpo.
- `npm run calibrate`: 13/13 válidos, delta médio **-30,68%** (idêntico Fase 0/1 — sem regressão).
- `npm run audit:port:check`: OK.

**Impacto no calibrate:** nulo (adicionar testes não muda comportamento do engine).
