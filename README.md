# MRD CALC — Liquidação Trabalhista Inteligente

Sistema profissional de cálculos trabalhistas com motor de cálculo autônomo, precisão pericial via Decimal.js, e calibração GT-light com PJe-Calc.

## Funcionalidades

- **Motor de cálculo puro TypeScript** — zero dependência de React/Supabase no core (`src/lib/pjecalc/core.ts`)
- **42 templates de verbas** — horas extras, reflexos, rescisórias, adicionais, multas, indenizações
- **Correção monetária** — 16 índices (IPCA-E, SELIC, INPC, TR, IGP-M, etc.), ADC 58/59 STF
- **INSS progressivo** — faixas históricas versionadas por vigência, atualização via SELIC (regime fiscal)
- **IRRF com RRA** — Art. 12-A, tributação exclusiva 13º, dependentes
- **FGTS** — depósitos 8%/2%, multa 40%/20%, LC 110, JAM/TR
- **Reflexos em DAG** — ordenação topológica com detecção de ciclos + cascade DSR→13º→férias→FGTS
- **Relatórios PDF** — 12 seções modulares, memória de cálculo, warnings, auditoria
- **Import/Export** — XML PJC, XLSX, CSV, eSocial S-2500/2501, GPS/DARF
- **Modo independente com GT-light** — calibração por competência usando dados PJC como referência
- **376+ testes automatizados** — Vitest, golden parity com 14 casos PJC reais, edge cases
- **Índices BCB reais** — 3270 registros (IPCA-E, SELIC, INPC, TR, IGP-M) desde 2000

## Paridade com PJe-Calc

Testado com 14 casos reais (.PJC) no modo independente com calibração GT-light:

| Componente | Delta vs PJe-Calc |
|-----------|-------------------|
| INSS Segurado | **0.00%** |
| IR (Imposto de Renda) | **+0.68%** |
| Custas | **0.00%** |
| Líquido | **-7.30%** |

O delta residual de -7.30% no líquido vem da distribuição de juros entre verbas, que o PJe-Calc calcula com lógica interna não replicável externamente.

## Setup

```bash
# 1. Clone o repositório
git clone https://github.com/GabrielMilkovich/MrdCalculos.git
cd MrdCalculos

# 2. Copie as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais Supabase

# 3. Instale dependências (npm only — não usar bun/yarn)
npm install

# 4. Inicie o servidor de desenvolvimento
npm run dev

# 5. Rode os testes
npm test
```

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anon/public do Supabase |
| `OPENAI_API_KEY` | Chave OpenAI (configurar em Supabase Edge Functions Secrets) |

**NUNCA commite o arquivo `.env` com credenciais reais.**

## Stack

- React 18 + TypeScript strict + Vite
- Supabase (PostgreSQL + Edge Functions + Auth)
- OpenAI API (GPT-4o para OCR, extração, petições)
- Decimal.js (precisão de 20 dígitos)
- Tailwind CSS + shadcn/ui
- Vitest (376+ testes)

## Arquitetura do Motor de Cálculo

```
src/lib/pjecalc/core.ts          ← barrel export (lib pura, zero deps externas)
src/lib/pjecalc/engine.ts         ← motor principal (Decimal.js only)
src/lib/pjecalc/engine-types.ts   ← tipos
src/lib/pjecalc/pjc-analyzer.ts   ← parser de arquivos .PJC
src/lib/pjecalc/pjc-to-engine.ts  ← conversão PJC → engine inputs
src/lib/pjecalc/reflexo-engine.ts  ← DAG de reflexos com detecção de ciclos
```

O motor de cálculo não depende de React, Supabase, ou qualquer serviço externo. Todos os dados (índices, faixas INSS/IR, feriados) são passados como parâmetros ao constructor.

## Licença

Proprietário. Todos os direitos reservados.
