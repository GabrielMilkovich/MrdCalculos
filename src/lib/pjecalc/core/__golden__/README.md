# Golden Tests Harness — Port PJe-Calc

Infraestrutura de validação de paridade entre o engine portado (TypeScript) e o PJe-Calc v2.15.1 (Java).

Ver: [docs/PORT-PJECALC-PLAN.md §5](../../../../docs/PORT-PJECALC-PLAN.md).

## Conceitos

**Fixture** — caso congelado (JSON) com inputs + outputs esperados, capturado de um `.pjc` real ou de execução direta do PJe-Calc.

**Runner** — função `runGolden(fixture, engine)` que executa o engine com os inputs da fixture e compara com os outputs esperados, aplicando tolerâncias por campo.

**Módulo** — nome do módulo portado ao qual a fixture pertence (ex: `IRPF`, `INSS`, `FGTS`). Casa com feature flag `VITE_USE_PORTED_<MODULO>`. Se flag off, fixture é pulada.

## Estrutura

```
src/lib/pjecalc/core/__golden__/
├── README.md              ← este arquivo
├── types.ts               ← GoldenFixture, GoldenResult, GoldenTolerance, etc.
├── runner.ts              ← runGolden, formatGoldenResult
├── fixtures/              ← fixtures versionadas (JSON ou .ts)
│   ├── e2e/              ← golden end-to-end (caminho completo do engine)
│   │   └── <caso>.json   ← um por .pjc de public/reports/
│   └── method/           ← golden de método (unit-level)
│       └── <modulo>/<classe>/<metodo>.json
└── __tests__/
    └── smoke.test.ts      ← valida wiring do harness
```

## Como escrever uma fixture

### Fixture de método (unit-level)

Use quando portar um método específico de uma classe Java.

```json
{
  "id": "fgts-calcular-saldo-001",
  "description": "Saldo FGTS de contrato 36 meses, 1 salário mínimo constante",
  "origin": {
    "javaMethod": "Fgts.calcularSaldoFgts",
    "pjecalcVersion": "2.15.1",
    "capturedAt": "2026-04-22T12:00:00Z",
    "notes": "Sem saques, sem expurgos, sem férias em dobro"
  },
  "module": "FGTS",
  "inputs": {
    "salarioMensal": "1412.00",
    "admissaoEm": "2023-01-01",
    "demissaoEm": "2025-12-31"
  },
  "expected": {
    "saldoTotal": { "value": "4067.28" },
    "multa40": { "value": "1626.91" }
  },
  "defaultMonetaryTolerance": { "absolute": 0.01 }
}
```

### Fixture end-to-end

Use para validar calibrate completo contra um `.pjc`:

```json
{
  "id": "e2e-antonio-harley",
  "description": "Caso real do escritório — contrato de 2 anos com aviso prévio indenizado",
  "origin": {
    "pjc": "public/reports/antonio-harley.pjc",
    "pjecalcVersion": "2.15.1"
  },
  "inputs": {
    "xmlPath": "public/reports/antonio-harley.pjc"
  },
  "expected": {
    "bruto": { "value": "18234.56" },
    "inss": { "value": "2007.45" },
    "irpf": { "value": "1345.78" },
    "liquido": { "value": "14881.33" }
  },
  "defaultMonetaryTolerance": { "absolute": 0.01 }
}
```

## Como usar em um teste Vitest

```typescript
import { describe, it, expect } from 'vitest';
import { runGolden, formatGoldenResult } from '../runner';
import fixture from '../fixtures/method/fgts/calcular-saldo-001.json';
import { Fgts } from '@/lib/pjecalc/core';

describe('Fgts — golden', () => {
  it(fixture.id, async () => {
    const result = await runGolden(fixture, async (inputs: any) => {
      const fgts = new Fgts(/* construir a partir de inputs */);
      return {
        saldoTotal: fgts.getSaldoTotal().toFixed(2),
        multa40: fgts.getMulta40().toFixed(2),
      };
    });
    expect(result.passed, formatGoldenResult(result)).toBe(true);
  });
});
```

## Tolerâncias

Padrões aplicados quando a fixture não declara `tolerance` por campo:

| Tipo de valor | Default |
|---|---|
| Monetário | `{ absolute: 0.01 }` (R$ 0,01) |
| Índice / fator | `{ absolute: 1e-10 }` |
| String / enum | igualdade exata |

Por campo, a fixture pode declarar tolerância customizada. Relativa e absoluta podem coexistir — basta uma das duas passar.

## Rodando

```bash
npx vitest run src/lib/pjecalc/core/__golden__/
```

Ou um arquivo específico:

```bash
npx vitest run src/lib/pjecalc/core/__golden__/__tests__/smoke.test.ts
```

## Evolução (Commit 3 da Fase 0)

O runner atualmente tem um hook de feature flag via `__setPortedEnabledHook`. No Commit 3 da Fase 0, será plugado ao módulo real `src/lib/pjecalc/core/base/comum/feature-flags.ts`, que lê `import.meta.env.VITE_USE_PORTED_<MODULO>` no browser e `process.env` em scripts Node.
