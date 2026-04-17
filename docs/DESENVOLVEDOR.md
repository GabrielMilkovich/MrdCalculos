# Manual do Desenvolvedor — MRD Calc

Guia de arquitetura e extensão. Complementa o [README](../README.md) e o [Manual do Usuário](./MANUAL-USUARIO.md).

---

## 🏛 Arquitetura em camadas

```
┌──────────────────────────────────────────────────────────┐
│  UI (React)                                              │
│  src/components/cases/pjecalc/Modulo*.tsx                │
│  src/pages/PjeCalcPage.tsx                               │
└───────────────┬──────────────────────────────────────────┘
                │ props + callbacks
                ▼
┌──────────────────────────────────────────────────────────┐
│  Adapters / Service                                      │
│  src/lib/pjecalc/service.ts                              │
│  src/lib/pjecalc/orchestrator.ts                         │
│  src/lib/pjecalc/pjc-to-engine.ts (import .PJC)          │
└───────────────┬──────────────────────────────────────────┘
                │ ParametrosDeAtualizacao / Verbas
                ▼
┌──────────────────────────────────────────────────────────┐
│  Core (porte 1:1 do PJe-Calc v2.15.1)                    │
│  src/lib/pjecalc/core/                                   │
│    dominio/calculo/      → Calculo.liquidar()            │
│    dominio/inss/         → MaquinaDeCalculoDeInss        │
│    dominio/irpf/         → MaquinaDeCalculoDeIrpf        │
│    dominio/custas/       → MaquinaDeCalculoDeCustas      │
│    dominio/indices/      → TabelaDeCorrecaoMonetaria     │
│    dominio/juros/        → TaxaDeJuros + ApuracaoDeJuros │
└───────────────┬──────────────────────────────────────────┘
                │ Decimal outputs
                ▼
┌──────────────────────────────────────────────────────────┐
│  Types                                                   │
│  src/lib/pjecalc/types.ts                                │
│  src/types/supabase.ts (gerado)                          │
└──────────────────────────────────────────────────────────┘
```

### Princípios

1. **Core puro**: sem `window`, sem `fetch`, sem React. Só `Decimal` + data structures.
2. **UI burra**: componentes só coletam entrada, disparam o serviço, renderizam o resultado.
3. **Orchestrator costura**: quem decide quais `MaquinaDeCalculo*` chamar é `orchestrator.ts` / `engine-v3.ts`.
4. **Testabilidade**: todo módulo core exporta funções puras testáveis em isolamento.

---

## 🔄 Fluxo de cálculo

```typescript
// src/lib/pjecalc/orchestrator.ts (simplificado)
import { Calculo } from './core'

export async function liquidar(params: ParametrosLiquidacao) {
  // 1. Normaliza entrada (UI → core)
  const calc = new Calculo({
    termo: params.termo,
    parametrosDeAtualizacao: params.parametros,
    verbas: params.verbas,
  })

  // 2. Pipeline canônico (idêntico ao PJe-Calc Java)
  calc.liquidar()        // correção + juros + INSS + IRPF + FGTS + multas + honorários

  // 3. Serializa para UI
  return calc.toResultado()
}
```

O método `Calculo.liquidar()` é o **orquestrador interno**. Ele roda, nesta ordem:

1. **Correção monetária** — `TabelaDeCorrecaoMonetaria.atualizar()` aplica IPCA-E, SELIC, TR etc. conforme combinações por período
2. **Juros** — `ApuracaoDeJuros` aplica TRD 1% simples e/ou SELIC (conforme ADC 58/59)
3. **Descontos previdenciários** — INSS progressivo (EC 103/2019) ou alíquota única
4. **Impostos** — IRPF Art. 12-A com NM total + tributação exclusiva 13º
5. **FGTS** — saldo (TR+3%a.a.) + multa 40% + LC 110/2001
6. **Multas** — 477 §8º, 467, 523 §1º CPC
7. **Honorários** — sucumbenciais + contratuais + periciais
8. **Custas** — 2% do valor da causa

Cada passo **não muta** estado anterior — devolve novos `Decimal` imutáveis.

---

## ➕ Como adicionar um novo relatório

Os 12 relatórios PDF vivem em `src/lib/pjecalc/pdf-report-*.ts`. Cada um é um módulo isolado.

### Passos

1. **Crie o gerador** em `src/lib/pjecalc/pdf-report-novo.ts`:

```typescript
import jsPDF from 'jspdf'
import type { ResultadoLiquidacao } from './types'

export function gerarRelatorioNovo(r: ResultadoLiquidacao): Blob {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text('Relatório Novo — MRD Calc', 20, 20)
  // ... preencha o layout
  return doc.output('blob')
}
```

2. **Adicione ao `SeletorTemplatesRelatorio`**:

```typescript
// src/components/cases/pjecalc/SeletorTemplatesRelatorio.tsx
const TEMPLATES = [
  // ... existentes
  { id: 'novo', label: 'Relatório Novo', gerador: gerarRelatorioNovo },
]
```

3. **Cobertura de teste** em `__tests__/pdf-report-novo.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { gerarRelatorioNovo } from '../pdf-report-novo'

describe('gerarRelatorioNovo', () => {
  it('emite um Blob PDF válido', () => {
    const blob = gerarRelatorioNovo(fixtureResultado)
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })
})
```

4. **Rode** `npm run test` e confirme que está verde.

---

## ➕ Como adicionar um novo módulo de cálculo

Exemplo: adicionar **Módulo de Adicional de Transferência** (já existe como `verba-modules/adicional-transferencia.ts` — siga o padrão).

### 1. Defina os tipos

```typescript
// src/lib/pjecalc/verba-modules/meu-modulo.ts
import Decimal from 'decimal.js'
import type { ModuloVerba, ContextoCalculo } from './types'

export interface ParametrosMeuModulo {
  dataInicio: string
  dataFim: string
  percentual: Decimal
  baseMensal: Decimal
}
```

### 2. Implemente a máquina de cálculo

```typescript
export function calcularMeuModulo(
  p: ParametrosMeuModulo,
  ctx: ContextoCalculo,
): VerbaDeCalculo[] {
  // ... sempre use Decimal; retorne VerbaDeCalculo[] que o engine consolida
  const valor = p.baseMensal.mul(p.percentual).div(100)
  return [{ rubrica: 'MEU_MODULO', valor, competencia: p.dataInicio }]
}
```

### 3. Registre no orquestrador

```typescript
// src/lib/pjecalc/engine-v3.ts
if (params.meuModulo) {
  const verbas = calcularMeuModulo(params.meuModulo, ctx)
  calc.adicionarVerbas(verbas)
}
```

### 4. Componente React correspondente

```typescript
// src/components/cases/pjecalc/ModuloMeuModulo.tsx
interface Props {
  value: ParametrosMeuModulo
  onChange: (v: ParametrosMeuModulo) => void
}

export function ModuloMeuModulo({ value, onChange }: Props) {
  // ... Inputs shadcn/ui + validação Zod
}
```

### 5. Teste

```typescript
// __tests__/meu-modulo.test.ts
import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { calcularMeuModulo } from '../meu-modulo'

describe('calcularMeuModulo', () => {
  it('aplica percentual sobre base', () => {
    const r = calcularMeuModulo({
      dataInicio: '2024-01-01',
      dataFim: '2024-12-31',
      percentual: new Decimal(25),
      baseMensal: new Decimal(3000),
    }, ctxFixture)
    expect(r[0].valor.toFixed(2)).toBe('750.00')
  })
})
```

---

## 🔁 Como portar mais classes Java do PJe-Calc

O core em `src/lib/pjecalc/core/` é um **porte 1:1** do PJe-Calc v2.15.1 Java. Pastas de origem ficam em `pjecalc-fonte/` (referência).

### Processo recomendado

1. **Escolha a classe Java** (ex.: `br.jus.cnj.pje.calc.dominio.xyz.MinhaClasse`)
2. **Crie o arquivo TS** mantendo o nome PT-BR idiomático:
   ```
   src/lib/pjecalc/core/dominio/xyz/minha-classe.ts
   ```
3. **Porte campo a campo**:
   - `BigDecimal` → `Decimal` (nunca `number`)
   - `Map<K,V>` → `Map<K,V>` ou `Record` conforme uso
   - Enums Java → `enum` TS ou union literal
   - `Optional<T>` → `T | undefined`
   - Exceções → classes em `core/comum/exceptions/`
4. **Adicione barrel export** em `core/dominio/xyz/index.ts`
5. **Escreva teste** em `core/__tests__/minha-classe.test.ts`
6. **Documente mapeamento** em `core/MAPPING.md`

### Convenções do porte

- **Precisão**: `Decimal.set({ precision: 20 })` globalmente (em `core/index.ts`)
- **Truncamento**: use `ROUND_DOWN` quando o Java original faz `setScale(n, RoundingMode.DOWN)`
- **Arredondamento**: `ROUND_HALF_UP` para INSS e IRPF (compatível com RFB)
- **Fórmula canônica** do PJe-Calc:
  ```
  Devido = TRUNC₂(TRUNC₂(TRUNC₂(Base / Div) × Mult) × Qtd) × Dobra
  ```

---

## 📏 Convenções

### Decimal.js sempre

```typescript
// ✅ correto
import Decimal from 'decimal.js'
const total = new Decimal(salario).mul(0.4).toFixed(2)

// ❌ errado
const total = salario * 0.4
```

### Sem `any`

```typescript
// ✅ tipagem explícita
function calcular(v: VerbaDeCalculo): Decimal { ... }

// ⚠️ se realmente precisar, justifique
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyData = raw as any  // API externa sem schema; valido com Zod abaixo
```

### Naming PT-BR para domínio

- **Classes/funções**: `MaquinaDeCalculoDeInss`, `calcularJurosDosSalarios`
- **Arquivos**: `maquina-de-calculo-de-inss.ts`, `tabela-de-correcao-monetaria.ts`
- **Tipos técnicos** (React, hooks): inglês — `Props`, `useFoo`

### Supabase

```typescript
// ✅ sempre trate o erro
const { data, error } = await supabase.from('casos').select('*')
if (error) throw error

// ❌ nunca desative RLS como solução
```

---

## 🧪 Testes

### Vitest (unit / integration)

- Localização: `src/**/__tests__/*.test.ts(x)`
- Rodar: `npm run test`
- Fixtures de .PJC reais em `Arquivos PJC/` e `pjc-corpus/`
- Testes de paridade: `src/lib/pjecalc/__tests__/parity-v3.test.ts`

### Playwright (E2E)

- Localização: `e2e/*.spec.ts`
- Rodar: `npm run test:e2e` (ou `npm run test:e2e:ui` para modo interativo)
- Cobre: login, criar caso, importar PJC, gerar PDF, exportar e-Social

### CI

O workflow GitHub Actions roda:
1. `npx tsc --noEmit` (tipos)
2. `npm run lint`
3. `npm run test`
4. `npm run test:e2e`
5. Parity gate (vs. 17 casos PJC reais) — falha se piorar o delta médio

---

## 📦 Supabase

- **Migrations** em `supabase/migrations/` — **nunca** edite uma já aplicada. Crie nova:
  ```bash
  npx supabase migration new minha_feature
  ```
- **Tipos** sempre regenerados após schema change:
  ```bash
  npx supabase gen types typescript --local > src/types/supabase.ts
  ```
- **Edge Functions** em `supabase/functions/` — Deno + TypeScript. Deploy via:
  ```bash
  npx supabase functions deploy <nome>
  ```
- **RLS** obrigatório em toda tabela com dados do usuário

---

## Ver também

- [README](../README.md) — instalação e comandos
- [Manual do Usuário](./MANUAL-USUARIO.md) — uso funcional
- [Changelog](./CHANGELOG.md) — histórico técnico
- `src/lib/pjecalc/core/MAPPING.md` — mapeamento Java → TS
