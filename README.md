# MRD Calc — Liquidação Trabalhista

**Versão atual:** v3.2.0 (Sprint 6 — auditoria + handoff completos · 2026-04-27)

[![Testes](https://img.shields.io/badge/vitest-1215%20passando-brightgreen)]()
[![Paridade](https://img.shields.io/badge/PJC%20parity-96%25%20%C2%B15%25%20(47%20PJCs)-success)]()
[![E2E](https://img.shields.io/badge/playwright-9%20fluxos-success)]()
[![LOC](https://img.shields.io/badge/TypeScript-%7E146k%20LOC-blue)]()
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Supabase-informational)]()

Sistema de **cálculos trabalhistas com paridade ao PJe-Calc v2.15.1** do CNJ. Motor autônomo em TypeScript, precisão pericial via `Decimal.js` (20 dígitos), UI moderna em React, backend Supabase.

---

## ✨ Features

- 🧮 **Motor canônico** — 17 módulos (FGTS, INSS, IRPF, Custas, Multas, Honorários, Juros, Correção, Pensão, Previdência, Salário-Família, Seguro-Desemprego, etc.)
- 📋 **42+ templates de verbas** — horas extras, DSR, insalubridade, periculosidade, adicionais, comissões, PLR...
- ⚖️ **ADC 58/59 STF** — IPCA-E + TR pré-citação → SELIC pós-citação, com transição automática
- 🔢 **EC 103/2019** — INSS progressivo com faixas marginais + tabelas históricas 1996-2025
- 🧾 **Art. 12-A Lei 7.713/1988** — RRA com NM (número de meses), 13° isolado por ano
- 📑 **12 relatórios PDF** — memória, consolidado, diferença, apuração de juros, custas, precatório, pensão, salário-família, seguro-desemprego, justificativa, completo, e-Social
- 📥 **Importa .PJC nativo** — analisa e replica cálculos existentes do PJe-Calc
- 📤 **Exporta** PJC, Excel, XML e-Social (S-2500/S-2501), MRD State JSON
- 🔐 **ICP-Brasil** — assinatura digital A1/A3 via `node-forge`
- 🧭 **Integração PJe Judicial** — gera pacote ZIP+Base64 pronto para petição
- 🕑 **Versionamento** — histórico completo com diff entre versões
- 📊 **Observability** — logging estruturado, audit log, painel de produtividade
- ✅ **1.215 testes Vitest + 9 fluxos Playwright E2E** — paridade com 47 casos PJC reais (96% ±5%)

---

## 🛠 Stack

- **Frontend** — React 18 + Vite + TypeScript strict
- **UI** — shadcn/ui (Radix) + Tailwind CSS + Lucide icons
- **Estado / Dados** — TanStack Query + React Hook Form + Zod
- **Backend** — Supabase (PostgreSQL + Edge Functions em Deno/TypeScript)
- **Motor de cálculo canônico** — `PjeCalcEngineV3` em `src/lib/pjecalc/engine-v3.ts`, sobre o core portado 1:1 do PJe-Calc v2.15.1 em `src/lib/pjecalc/core/`. Motores legados V1/V2/V4 estão em quarentena em `_legacy/` — ver [`docs/MOTOR-UNICO-V3.md`](docs/MOTOR-UNICO-V3.md).
- **Cálculo** — `decimal.js` com 20 dígitos — **nunca `number` nativo para valores monetários**
- **Testes** — Vitest (unit + integration) + Playwright (E2E)
- **Build** — Vite + SWC

---

## 🚀 Instalação

```bash
# 1. Clone o repositório
git clone <repo-url>
cd MrdCalculos

# 2. Instale as dependências
npm install

# 3. Configure variáveis Supabase (.env)
cp .env.example .env
# Preencha VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# 4. Suba o Supabase local (opcional — dev contra instância própria)
npx supabase start
npx supabase db reset        # aplica todas as migrations do zero

# 5. Rode o servidor de desenvolvimento
npm run dev
```

O app sobe em [http://localhost:5173](http://localhost:5173).

---

## 💻 Desenvolvimento

```bash
# Testes
npm run test                   # suite completa (vitest)
npm run test:watch             # watch mode
npm run test:coverage          # com cobertura
npm run test:e2e               # Playwright E2E
npm run test:e2e:ui            # Playwright em modo UI

# Build & lint
npm run build                  # build de produção (Vite)
npx tsc --noEmit               # checa tipos sem emitir
npm run lint                   # ESLint

# Utilitários
npm run update-indices         # atualiza IPCA/SELIC/TR do BCB/IBGE
npm run calibrate              # pipeline de paridade vs PJC
npm run calibrate:dir          # calibra diretório inteiro de .PJC
```

### Regras inegociáveis

- ❌ **Nunca** usar `number` para valores monetários — sempre `Decimal`
- ❌ **Nunca** usar `as any` sem comentário justificando
- ❌ **Nunca** quebrar os 1.215 testes existentes (rode `npm run test` antes de abrir PR)
- ❌ **Nunca** editar migrations já aplicadas — crie uma nova
- ✅ **Sempre** tratar `error` de queries Supabase
- ✅ **Sempre** respeitar Row Level Security (RLS)

Ver [CLAUDE.md](./CLAUDE.md) para convenções completas do projeto.

---

## 📁 Estrutura

```
MrdCalculos/
├── src/
│   ├── lib/pjecalc/           # Motor de cálculo (core, sem React)
│   │   ├── core/              # Porte 1:1 do PJe-Calc v2.15.1
│   │   │   ├── dominio/       # calculo, inss, irpf, fgts, juros, indices...
│   │   │   ├── comum/         # validators, optimizers, rotinas
│   │   │   └── servicos/      # serviços aplicacionais
│   │   ├── engine-v3.ts       # Orquestrador canônico
│   │   ├── orchestrator.ts    # Ponto de entrada público
│   │   ├── verba-modules/     # 42 templates de verbas
│   │   ├── pjc-analyzer.ts    # Parser de .PJC
│   │   ├── pdf-report-*.ts    # 12 geradores de PDF
│   │   ├── esocial-*.ts       # Exportação S-2500/S-2501
│   │   └── __tests__/         # 600+ testes unit/integration
│   ├── components/
│   │   ├── cases/pjecalc/     # 50+ componentes de módulos
│   │   └── ui/                # shadcn/ui
│   ├── pages/                 # rotas (/casos, /pjecalc, /configuracoes...)
│   ├── hooks/                 # custom hooks
│   └── types/                 # tipos (inclui supabase.ts gerado)
├── supabase/
│   ├── migrations/            # 100+ migrations PLpgSQL
│   └── functions/             # 34 Edge Functions (Deno)
├── e2e/                       # testes Playwright
├── scripts/                   # utilitários (update-indices, calibration...)
├── docs/                      # documentação
│   ├── MANUAL-USUARIO.md
│   ├── DESENVOLVEDOR.md
│   └── CHANGELOG.md
└── Arquivos PJC/              # corpus de cálculos reais (parity testing)
```

---

## 📚 Documentação

### Documentos principais (v3.2.0)
- 🎯 [HANDOFF EXECUTIVO (CEO)](./docs/HANDOFF-CEO.md) — relatório de 1 página com estado atual, riscos e próximos passos
- 🏗️ [SISTEMA OVERVIEW](./docs/SISTEMA-OVERVIEW.md) — guia técnico (arquitetura, pipeline, como adicionar flag/PJC)
- 🛠️ [RUNBOOK DE PRODUÇÃO](./docs/RUNBOOK-PRODUCAO.md) — env vars, edge functions, monitoring, rollback
- 📜 [Changelog](./CHANGELOG.md) — histórico organizado por release

### Documentos por módulo de cálculo (jurídico + técnico)
- 🧾 [01 — INSS Segurado e Empregador](./docs/calculos/01-INSS-segurado-empregador.md) (Lei 8.212/91 + EC 103/2019 + Lei 11.941/09)
- 💰 [02 — IRPF Tabela e RRA](./docs/calculos/02-IRPF-tabela-RRA.md) (Lei 7.713/88 + Art. 12-A)
- 🏦 [03 — FGTS Depósito e Multa](./docs/calculos/03-FGTS-deposito-multa.md) (Lei 8.036/90 + LC 110/2001)
- 📈 [04 — Correção Monetária IPCA/SELIC](./docs/calculos/04-Correcao-Monetaria-IPCA-SELIC.md) (ADC 58 + EC 113 + Lei 14.905/2024)
- ⏱️ [05 — Juros de Mora Trabalhista](./docs/calculos/05-Juros-Mora-Trabalhista.md) (TRD + SELIC + TAXA_LEGAL)
- ⚖️ [06 — Multas CLT e CPC](./docs/calculos/06-Multas-CLT-CPC.md) (Arts. 467, 477 CLT + 523 CPC)
- 👨‍⚖️ [07 — Honorários Advocatícios](./docs/calculos/07-Honorarios-Advocaticios.md) (CLT 791-A + Lei 9.250/95)
- 👨‍👩‍👧 [08 — Pensão Alimentícia](./docs/calculos/08-Pensao-Alimenticia.md) (CC art. 1.694)

### Documentos legados
- 📖 [Manual do Usuário](./docs/MANUAL-USUARIO.md) — como usar os módulos
- 🧑‍💻 [Manual do Desenvolvedor](./docs/DESENVOLVEDOR.md) — arquitetura detalhada

---

## ⚖️ Licença

Proprietário — © MRD Calc. Todos os direitos reservados.
