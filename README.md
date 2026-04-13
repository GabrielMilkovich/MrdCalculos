# MRD Calc — Liquidação Trabalhista

Sistema de cálculos trabalhistas com motor de cálculo autônomo, precisão pericial via Decimal.js e paridade com o PJe-Calc oficial do CNJ.

## Stack

- **Frontend:** React + Vite + TypeScript strict
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Cálculo:** Decimal.js com 20 dígitos de precisão — sem `number` nativo para valores monetários

## Motor de cálculo (`src/lib/pjecalc/`)

O core do sistema é o `PjeCalcEngine`, um motor canônico que implementa:

- **Fórmula oficial** — `Devido = TRUNC₂(TRUNC₂(TRUNC₂(Base / Div) × Mult) × Qtd) × Dobra`
- **Correção monetária** — IPCA-E, SELIC, INPC, TR, IGP-M e 10+ índices com combinação por data (ADC 58/59 STF)
- **INSS progressivo** — EC 103/2019 com faixas históricas 2010-2025
- **IR Art. 12-A** — RRA com NM total, tributação exclusiva 13° por ano, férias em separado
- **FGTS** — multa 40%/20% sobre saldo corrigido (TR+3%a.a.), LC 110/2001 com guard temporal
- **Reflexos automáticos** — 13°, férias+1/3, aviso prévio (indenizado/trabalhado), DSR, multa 477
- **42 templates de verbas** — horas extras, insalubridade, periculosidade, comissões, adicionais

## Comandos

```bash
# Testes
npm run test              # suite completa (vitest)
npm run test -- --watch   # watch mode

# Build
npm run build             # build de produção
npx tsc --noEmit          # verificação de tipos

# Desenvolvimento
npm run dev               # servidor de desenvolvimento
```

## Estrutura

```
src/
  lib/pjecalc/          # Motor de cálculo (core, sem dependência de React/Supabase)
    engine.ts           # PjeCalcEngine — motor principal
    engine-types.ts     # Tipos e interfaces
    engine-constants.ts # Tabelas INSS/IR/SM históricas
    orchestrator.ts     # Ponto de entrada para liquidação completa
    reflexo-engine.ts   # Templates de reflexos automáticos
  components/           # Componentes React (shadcn/ui)
  hooks/                # Custom hooks
  pages/                # Páginas/rotas
supabase/
  migrations/           # Migrations SQL (PLpgSQL)
  functions/            # Edge Functions (Deno/TypeScript)
```

## Licença

Proprietário — © MRD Calc
