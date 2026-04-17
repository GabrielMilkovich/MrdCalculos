# MRD Calc — Liquidação Trabalhista

[![Testes](https://img.shields.io/badge/vitest-600%2B%20passando-brightgreen)]()
[![Paridade](https://img.shields.io/badge/PJC%20parity-12%2F17%20%E2%89%A410%25-success)]()
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
- ✅ **600+ testes Vitest + Playwright E2E** — paridade com 17 casos PJC reais

---

## 🛠 Stack

- **Frontend** — React 18 + Vite + TypeScript strict
- **UI** — shadcn/ui (Radix) + Tailwind CSS + Lucide icons
- **Estado / Dados** — TanStack Query + React Hook Form + Zod
- **Backend** — Supabase (PostgreSQL + Edge Functions em Deno/TypeScript)
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
- ❌ **Nunca** quebrar os 600+ testes existentes (rode `npm run test` antes de abrir PR)
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

- 📖 [Manual do Usuário](./docs/MANUAL-USUARIO.md) — como usar os módulos, importar PJC, gerar relatórios
- 🧑‍💻 [Manual do Desenvolvedor](./docs/DESENVOLVEDOR.md) — arquitetura, fluxo de cálculo, como estender
- 📜 [Changelog](./docs/CHANGELOG.md) — histórico de releases e fases

---

## ⚖️ Licença

Proprietário — © MRD Calc. Todos os direitos reservados.
