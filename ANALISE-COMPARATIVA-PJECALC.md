# Análise Comparativa: MRD Calc vs PJE Calc

## Resumo Executivo

O MRD Calc está em **~75-80% de paridade funcional** com o PJE Calc oficial.
O motor principal (`PjeCalcEngine` v3.1.0, 3.913 linhas com `Decimal.js`) é sofisticado
e cobre a maioria dos cenários trabalhistas. Os gaps principais são: ausência de testes
automatizados, tabelas históricas incompletas, e funcionalidades auxiliares (exportação
Excel, geração GPS/DARF, atualização automática de índices).

---

## 1. O que JÁ ESTÁ implementado

### Motor de Cálculo (PjeCalcEngine v3.1.0)
- Fórmula: `Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra`
- Diferença: `Devido - Pago`
- Ordenação topológica de verbas (DAG com reflexos encadeados)
- Dois modos: `assisted_from_pjc` (com ground truth) e `independent`
- Multi-vínculo com consolidação
- Precisão: Decimal.js com 20 casas, ROUND_DOWN

### Verbas Trabalhistas (11 módulos + templates)
| Módulo | Status |
|--------|--------|
| Horas Extras (50%, 100%) | ✅ Completo |
| DSR (Descanso Semanal Remunerado) | ✅ Completo |
| Verbas Rescisórias | ✅ Completo |
| 13º Salário (proporcional/integral) | ✅ Completo |
| Férias (gozadas, indenizadas, proporcionais, dobra, abono) | ✅ Completo |
| Comissões | ✅ Completo |
| Intervalos (intrajornada/interjornada) | ✅ Completo |
| Feriados | ✅ Completo |
| Multas CLT (Art. 467, 477) | ✅ Completo |
| FGTS Rescisório (40%/20%) | ✅ Completo |
| PLR | ✅ Completo |
| Salário Substituição | ✅ Completo |

### Templates Expresso (pré-configurados)
- Rescisão sem justa causa
- Rescisão com justa causa
- HE + Intervalos
- Insalubridade (3 graus: 10%, 20%, 40% SM)
- Adicional Noturno (20% art. 73 CLT)
- Periculosidade (30% via fórmula genérica)

### Financeiro/Tributário
| Feature | Status |
|---------|--------|
| Correção Monetária (IPCA-E, INPC, TR, SELIC, IGP-M, IGP-DI, IPC-FIPE) | ✅ |
| Combinação de índices por período (ADC 58/59 STF) | ✅ |
| Juros de Mora (1% a.m., SELIC, combinação) | ✅ |
| INSS progressivo + alíquota única (segurado + empregador) | ✅ |
| IRRF com tabela progressiva | ✅ |
| IR regime acumulado (RRA Art. 12-A) | ✅ |
| FGTS depósitos + multa | ✅ |
| Honorários (sucumbenciais/contratuais) | ✅ |
| Custas processuais | ✅ |
| Seguro-Desemprego | ✅ |
| Salário-Família | ✅ |
| Pensão Alimentícia | ✅ |
| Previdência Privada | ✅ |
| SAT/RAT por CNAE | ✅ Parcial |

### Relatórios e Exportação
| Feature | Status |
|---------|--------|
| PDF Relatório Completo | ✅ |
| PDF Memória de Cálculo | ✅ |
| PDF Consolidado | ✅ |
| PDF Diferenças | ✅ |
| XML PJC (import/export round-trip) | ✅ |
| eSocial (S-2500, S-2501) | ✅ |
| Relatório de Critérios | ✅ |

### Infraestrutura
| Feature | Status |
|---------|--------|
| Supabase PostgreSQL (95 migrations) | ✅ |
| Autenticação (Supabase Auth) | ✅ |
| Perfis de Acesso (perito, advogado, cliente, admin) | ✅ |
| 15 Edge Functions (OCR, extração IA, busca semântica) | ✅ |
| Catálogo de Erros (60+ códigos) | ✅ |
| Audit Trail passo a passo | ✅ |
| Fidelity Reports (engine vs PJC) | ✅ |
| Parity Engine (tolerância 0.5%) | ✅ |
| Prescrição Quinquenal automática | ✅ |
| Cartão de Ponto (diário/mensal) | ✅ |
| Calendário Trabalhista (feriados federal/estadual/municipal) | ✅ |

---

## 2. O que FALTA para paridade com PJE Calc

### P0 — Crítico (bloqueia confiabilidade)

#### 2.1 Testes Automatizados
- Zero arquivos `.test.ts` ou `.spec.ts`
- Nenhum framework (Vitest/Jest) configurado
- Impacto: qualquer bug no motor passa despercebido
- **Ação:** Configurar Vitest, criar testes unitários para cada método do engine,
  testes de integração com cenários reais comparando com outputs do PJE Calc oficial

#### 2.2 Tabelas Históricas Completas
- Seeds existem para 2025-2026, mas faltam:
  - Índices pré-2000 (ORTN, OTN, BTN, UFIR)
  - FACDT (Fator de Atualização dos Débitos Trabalhistas)
  - Tabela Única dos TRTs
  - INSS/IR faixas históricas desde 1988
  - TAXA_LEGAL série histórica (BACEN)
- **Ação:** Seed completo de todas as tabelas desde 1988 (mínimo) ou 1960 (ideal)

### P1 — Importante (funcionalidades esperadas)

#### 2.3 Verbas Faltantes
| Verba | PJE Calc tem? | MRD Calc |
|-------|--------------|----------|
| Equiparação Salarial | Sim | ❌ Não implementado |
| Diferenças Salariais | Sim | ❌ Não implementado |
| Acúmulo/Desvio de Função | Sim | ❌ Não implementado |
| Danos Morais (atualização) | Sim | ❌ Não implementado |
| Danos Materiais (valor presente) | Sim | ❌ Não implementado |
| Estabilidade Provisória | Parcial | ❌ Não implementado |

#### 2.4 Exportação Excel/Planilha
- Advogados e peritos vivem no Excel
- PJE Calc exporta para planilha
- **Ação:** Implementar export XLSX (biblioteca `xlsx` ou `exceljs`)

#### 2.5 Geração GPS/DARF
- PJE Calc gera dados para recolhimento previdenciário (GPS) e fiscal (DARF)
- MRD Calc calcula os valores mas não gera os documentos
- **Ação:** Módulo de geração de guias

### P2 — Desejável (diferencial competitivo)

#### 2.6 Atualização Automática de Índices
- PJE Calc atualiza tabelas automaticamente (BCB/IBGE/CNJ)
- MRD Calc depende de seeds manuais
- **Ação:** Edge function com cron para sync automático

#### 2.7 Templates Regionais por TRT
- Cada TRT tem peculiaridades (ex: sabadão TRT2)
- `ModuloTabelasRegionais` existe mas precisa de dados
- **Ação:** Popular com regras dos 24 TRTs

#### 2.8 Contribuições de Terceiros
- Sistema S, INCRA, SEBRAE, SESC, SENAC, etc.
- Não implementado
- **Ação:** Adicionar ao módulo CS

#### 2.9 Relatório Evolução do Débito
- Gráfico/tabela mostrando crescimento mês a mês do débito
- PJE Calc tem como relatório padrão
- **Ação:** Componente com Recharts + export PDF

### P3 — Nice to Have

#### 2.10 CI/CD Pipeline
- Sem GitHub Actions ou similar
- **Ação:** Configurar build + lint + test no push

#### 2.11 Modo Offline (PWA)
- PJE Calc desktop funciona offline
- MRD Calc é web-only
- **Ação:** Service Worker + cache de tabelas

#### 2.12 Remoção do Motor Legado V1
- `src/lib/calculation/engine.ts` está DEPRECATED mas ainda é importado
- **Ação:** Migrar últimas referências e deletar

#### 2.13 TypeScript Strict Mode
- `strictNullChecks: false`, `noImplicitAny: false`
- Reduz segurança de tipos
- **Ação:** Habilitar gradualmente

---

## 3. Pontos onde MRD Calc SUPERA o PJE Calc

| Feature | MRD Calc | PJE Calc |
|---------|----------|----------|
| Interface moderna (React/Web) | ✅ | ❌ Java desktop |
| Busca semântica com IA | ✅ | ❌ |
| OCR de documentos | ✅ | ❌ |
| Extração inteligente de fatos | ✅ | ❌ |
| Geração automática de petições | ✅ | ❌ |
| Parity Engine (comparação engine vs PJC) | ✅ | ❌ |
| Fidelity Reports (perdas na importação) | ✅ | ❌ |
| Multi-vínculo com consolidação | ✅ | Parcial |
| eSocial export nativo | ✅ | ❌ |
| Cenários comparativos | ✅ | ❌ |
| Dashboard de produtividade | ✅ | ❌ |
| Perfis de acesso (perito/advogado/cliente) | ✅ | ❌ |

---

## 4. Priorização Recomendada

| Fase | Ação | Estimativa |
|------|------|-----------|
| **Fase 1** | Vitest + testes unitários do engine | — |
| **Fase 2** | Seed tabelas históricas completas (1988+) | — |
| **Fase 3** | Módulos: equiparação, diferenças salariais, danos | — |
| **Fase 4** | Exportação Excel | — |
| **Fase 5** | Geração GPS/DARF | — |
| **Fase 6** | Sync automático de índices | — |
| **Fase 7** | CI/CD + strict TypeScript | — |
| **Fase 8** | Templates regionais TRT | — |

---

*Documento gerado em 2026-03-28*
*Base: análise de 86.657 linhas de código em 277 arquivos TypeScript/React*
