# MRD CALC — Liquidação Trabalhista Inteligente

Sistema profissional de cálculos trabalhistas com motor de cálculo autônomo, precisão pericial via Decimal.js, e paridade funcional com o PJe-Calc.

## Funcionalidades

- **Motor de cálculo autônomo** — fórmula PJe-Calc com truncamento por etapa, Decimal.js (20 dígitos)
- **42 templates de verbas** — horas extras, reflexos, rescisórias, adicionais, multas, indenizações
- **Correção monetária** — 16 índices (IPCA-E, SELIC, INPC, TR, IGP-M, etc.), ADC 58/59 STF
- **INSS progressivo** — faixas históricas, patronal, SAT/RAT, terceiros por FPAS, doméstico LC 150
- **IRRF com RRA** — Art. 12-A, tributação exclusiva 13º, dependentes
- **FGTS** — depósitos 8%/2%, multa 40%/20%, LC 110, JAM/TR
- **Reflexos em DAG** — ordenação topológica com cascade DSR→13º→férias→FGTS
- **Relatórios PDF** — 12 seções modulares, memória de cálculo, warnings, auditoria
- **Import/Export** — XML PJC, XLSX, CSV, eSocial S-2500/2501, GPS/DARF
- **Modo independente** — cálculo 100% autônomo, sem dependência do PJe-Calc
- **202 testes automatizados** — Vitest, golden parity, edge cases

## Setup

```bash
# 1. Clone o repositório
git clone https://github.com/GabrielMilkovich/MrdCalculos.git
cd MrdCalculos

# 2. Copie as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais Supabase

# 3. Instale dependências
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

**NUNCA commite o arquivo `.env` com credenciais reais.**

## Stack

- React 18 + TypeScript + Vite
- Supabase (PostgreSQL + Edge Functions + Auth)
- Decimal.js (precisão de 20 dígitos)
- Tailwind CSS + shadcn/ui
- Vitest (testes)

## Licença

Proprietário. Todos os direitos reservados.
