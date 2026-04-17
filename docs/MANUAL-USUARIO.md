# Manual do Usuário — MRD Calc

> Sistema de cálculos trabalhistas com paridade ao PJe-Calc do CNJ.

## Sumário

- [Visão Geral](#-visão-geral)
- [Getting Started](#-getting-started)
- [Módulos de Cálculo](#-módulos-de-cálculo)
- [Importação de arquivos .PJC](#-importação-de-arquivos-pjc)
- [Geração de Relatórios](#-geração-de-relatórios)
- [Exportação](#-exportação)
- [Versionamento](#-versionamento)
- [Integração PJe Judicial](#-integração-pje-judicial)
- [FAQ](#-faq)
- [Glossário](#-glossário)

---

## 📋 Visão Geral

O **MRD Calc** é um sistema de **liquidação trabalhista** que reproduz os cálculos oficiais do PJe-Calc (v2.15.1 do CNJ), com precisão pericial via `Decimal.js` (20 dígitos) e sem dependência de planilhas. Foi desenhado para:

- **Peritos judiciais** que apresentam laudos em reclamatórias trabalhistas
- **Advogados** que precisam conferir ou impugnar cálculos da parte contrária
- **Contadores judiciais** de varas do trabalho
- **Setores jurídicos** de empresas e sindicatos

### Fundamentos legais implementados

- **CLT** — decreto-lei 5.452/1943 (verbas rescisórias, 13º, férias, FGTS, aviso prévio, multas 477 e 467)
- **ADC 58/59 STF** — IPCA-E + TR pré-citação, SELIC pós-citação, com transição automática
- **EC 103/2019** — INSS progressivo em faixas marginais (11/2019 em diante)
- **Art. 12-A da Lei 7.713/1988** — IRPF em Rendimentos Recebidos Acumuladamente (RRA)
- **LC 110/2001** — FGTS adicional de 10% com janela temporal
- **Súmula 200 TST** — juros sobre valor da condenação, não sobre base corrigida
- **Lei 8.036/1990** — FGTS, multa de 40% e depósito mensal
- **Lei 13.467/2017 (Reforma)** — contrato intermitente, sucumbência recíproca

### Motor autônomo

- Resultado: **12 de 17 casos PJC reais aprovados ≤10%** e 7 de 17 ≤5% (Gate 2)
- **600+ testes Vitest** cobrindo ADC 58/59, EC 103/2019, Art. 12-A, Súmula 200 e edge cases
- Tabelas históricas embutidas: IPCA-E, SELIC, TR, INPC, IGP-M, UFIR, URV, Cruzado (1986-2025)
- Faixas INSS/IR mensais desde 1996

---

## 🚀 Getting Started

### 1. Login

Acesse a URL do sistema e entre via Supabase Auth (e-mail + senha).  O primeiro acesso passa pelo **onboarding**, que captura perfil profissional (perito, advogado, contador).

### 2. Criar um caso

Na página **Casos** (`/casos`) clique em **Novo Caso** e informe:

- **Número do processo** (formato CNJ `0000000-00.0000.0.00.0000`)
- **Vara / Tribunal** (seletor TRT 1-24)
- **Reclamante e Reclamada**
- **Data de ajuizamento** e **citação** (para ADC 58/59)

O caso aparece em `/casos` como card. Clique para abrir a **workspace**, que traz abas para documentos, cálculos, relatórios e auditoria.

### 3. Entrar em um cálculo

Dentro do caso, a aba **PJe-Calc** abre a página multi-módulo (`/pjecalc?caseId=...`).  Cada módulo é um card independente — você preenche os que precisar, e o **Orquestrador** combina tudo na liquidação final.

---

## ⚙️ Módulos de Cálculo

Todos os módulos abaixo são componentes React em `src/components/cases/pjecalc/`.

### Dados do Processo (`ModuloDadosProcesso`)

Inicia o cálculo. Informe datas de admissão, demissão, citação, ajuizamento, causa/valor, motivo da rescisão e regime de horas. Esses campos alimentam **todos** os demais módulos.

### Ocorrências / Verbas (`ModuloOcorrencias`)

Catálogo de 42+ verbas (horas extras, DSR, insalubridade, periculosidade, comissões, adicionais). Cada ocorrência indica:

- Período (data-início / data-fim)
- Base de cálculo (hora, mês, %)
- Divisor / multiplicador
- Se reflete em 13º, férias+1/3, aviso prévio, FGTS

### Correção Monetária (`ModuloCorrecao`)

Seleciona o regime de atualização. Por padrão aplica **ADC 58/59**:

- IPCA-E + TR até a citação
- SELIC como índice único pós-citação (sem TR, sem juros separados)

Suporta também seleção manual de combinações (IPCA-E, INPC, IGP-M, TR puro, SEM correção).

### Juros (`ModuloOcorrencias` + exceções via `ModuloExcecoesJuros`)

- **TRD 1% simples ao mês** pré-citação
- **SELIC** pós-citação (ADC 58/59)
- Exceções por Lei 11.941/2009 (Fazenda Pública)

### INSS

Motor progressivo EC 103/2019 com faixas marginais a partir de 11/2019, e **alíquota única histórica** para períodos anteriores. Apuração por competência (13º e férias isolados).

### IRPF (`ModuloIR`)

Implementa **Art. 12-A da Lei 7.713/1988** (RRA): soma NM (número de meses), aplica tabela progressiva do mês de competência, e calcula imposto exclusivo. 13º tributado em separado por ano-calendário.

### FGTS (`ModuloFGTS`)

Apura saldo depositado (TR + 3% a.a.), multa de 40% sobre rescisão sem justa causa, adicional de 10% da LC 110/2001 (com guard temporal até 20/12/2019) e expurgos (Planos Verão/Collor).

### Multas CLT (`ModuloMultasCLT`)

- **Art. 477, §8º** — 1 salário se verbas rescisórias pagas fora do prazo
- **Art. 467** — 50% sobre a parcela incontroversa
- **Art. 523, §1º CPC** — 10% da condenação (execução definitiva)

### Honorários (`ModuloHonorarios`)

Sucumbenciais (5-20%), contratuais (até 30% conforme OAB/AGU) e periciais. Respeita Lei 13.467/2017 (sucumbência recíproca).

### Custas (`ModuloCustas`)

2% do valor da causa, com mínimo e teto anual. Suporta gratuidade de justiça.

### Pensão Alimentícia (`ModuloPensaoAlimenticia`)

Retém percentual fixo sobre verbas tributáveis, com relatório específico (PDF).

### Previdência Privada (`ModuloPrevidenciaPrivada`)

Contribuição complementar (VGBL/PGBL) incidente sobre verbas salariais.

### Salário Família (`ModuloSalarioFamilia`)

Cálculo retroativo, com tabela histórica de limites por dependente.

### Seguro Desemprego (`ModuloSeguroDesemprego`)

Indenização substitutiva quando o empregador obsta recebimento — 3 a 5 parcelas conforme tempo de contrato.

---

## 📥 Importação de arquivos .PJC

Caso queira conferir ou continuar um cálculo iniciado no PJe-Calc do CNJ:

1. No caso, vá em **Documentos** e faça upload do arquivo `.PJC` (XML compactado)
2. O **Analyzer** (`src/lib/pjecalc/pjc-analyzer.ts`) extrai:
   - Dados do processo e verbas
   - Combinações de índice/juros por período
   - Valor principal e juros persistidos
3. O sistema converte para o formato interno via `pjc-to-engine.ts` e carrega em `/pjecalc`
4. O **Comparador de Paridade** mostra, lado a lado, o resultado do MRD Calc vs o do PJC original

O upload aceita também **XLSX** (ficha financeira) via `ImportadorFichaFinanceira`.

---

## 📊 Geração de Relatórios

Use o **Seletor de Templates** (`SeletorTemplatesRelatorio`) para escolher entre 12 relatórios PDF:

| Template                    | Uso                                                 |
| --------------------------- | --------------------------------------------------- |
| **Memória de Cálculo**      | Detalhamento linha-a-linha das verbas               |
| **Consolidado**             | Visão resumida da liquidação (principal + reflexos) |
| **Apuração de Juros**       | Linha do tempo de juros por período                 |
| **Diferença**               | MRD Calc vs PJC (impugnação de cálculos)            |
| **Completo**                | Todos os módulos em um único PDF                    |
| **Custas**                  | Memória das custas processuais                      |
| **Precatório / RPV**        | Formato EC 62/2009 e EC 113/2021                    |
| **Pensão Alimentícia**      | Retenções mês a mês                                 |
| **Salário Família**         | Valores retroativos                                 |
| **Seguro Desemprego**       | Indenização substitutiva                            |
| **Justificativa**           | Fundamentação legal de cada escolha                 |
| **e-Social (S-2500/S-2501)** | XML para envio ao governo                           |

Todos são gerados client-side com [`jsPDF`](https://github.com/parallax/jsPDF) e baixáveis em um clique.

---

## 📤 Exportação

Além dos PDFs:

- **Excel (.xlsx)** via `excel-export.ts` — para planilhar auditoria interna
- **e-Social XML** (S-2500 / S-2501) via `esocial-export.ts`, validado contra o schema oficial
- **PJC nativo** via `pjc-export.ts` — compatível com o PJe-Calc oficial para continuidade
- **MRD State** — snapshot JSON serializável, usado no versionamento

Todos os exports respeitam **RLS** do Supabase: só o dono do caso baixa seus arquivos.

---

## 🔄 Versionamento

Cada liquidação pode salvar **versões** (`versioning.ts` + `version-diff.ts`):

1. Após rodar o cálculo, clique em **Salvar versão** no `VersaoHistorico`
2. Informe um rótulo (ex.: *"Antes da conciliação"*)
3. Compare duas versões lado a lado — o diff destaca valores que mudaram

As versões ficam em `pjecalc_versoes` no Supabase, com histórico completo.

---

## 🔗 Integração PJe Judicial

Quando o cálculo está pronto para peticionar:

1. Abra **Integração PJe** (`pje-integration.ts`)
2. O sistema empacota:
   - PDF consolidado (assinado via **ICP-Brasil** se o certificado digital for carregado)
   - XML e-Social (se aplicável)
   - Arquivo `.PJC` nativo
3. O pacote é gerado como **ZIP + Base64** pronto para colar no PJe Judicial
4. O `PjeHttpClient` também suporta envio direto via API REST do PJe (quando habilitado)

> 🔐 O ICP-Brasil signing usa `node-forge` com certificados A1/A3 carregados pelo usuário.

---

## ❓ FAQ

**1. O MRD Calc substitui o PJe-Calc do CNJ?**
Não. Ele **reproduz** os cálculos com paridade ≤10% em 12 de 17 casos reais testados e oferece relatórios e automações adicionais. O PJC oficial continua sendo a referência normativa.

**2. Posso usar sem internet?**
A UI é um SPA e tem service worker, mas o Supabase exige conexão para login e persistência. Cálculos pontuais funcionam offline após login prévio.

**3. Por que preciso usar `Decimal.js`?**
Valores monetários em JavaScript sofrem erro de ponto flutuante (`0.1 + 0.2 !== 0.3`). O sistema **sempre** converte para `Decimal` — nunca use `number` nativo para reais.

**4. Como corrijo uma verba que o sistema classificou errado?**
Edite manualmente no `CatalogoVerbas` (caso) ou nos `Templates-expresso` (globais). Reflexos são recalculados automaticamente.

**5. O que fazer se a paridade com o PJC estiver >10%?**
Rode o **Comparador de Paridade** — ele aponta a rubrica divergente. Verifique: tabelas de índices desatualizadas, combinação ADC 58/59 configurada incorretamente, ou verba classificada em tipo diferente.

**6. Como atualizo índices IPCA/SELIC/TR?**
```bash
npm run update-indices
```
O script `scripts/update-indices.ts` busca no BCB/IBGE e grava em `indices_oficiais`.

**7. Posso importar fichas financeiras em XLSX?**
Sim — veja `ImportadorFichaFinanceira`. Aceita formatos padrão de folha de pagamento.

**8. Como o sistema decide ADC 58/59?**
Detecta automaticamente pela data de citação: períodos anteriores aplicam IPCA-E+TR+TRD 1%, posteriores aplicam SELIC única.

**9. Há suporte a múltiplos vínculos?**
Sim — `multiplos-vinculos.ts` (Padrão B): FGTS e avos por vínculo, com consolidação final.

**10. Onde ficam os logs de auditoria?**
`AuditLog` e `logger.ts` — cada operação crítica é registrada com `request_id` e contexto estruturado.

---

## 📚 Glossário

- **ADC 58/59 STF (2020)** — Ações Declaratórias de Constitucionalidade 58 e 59. Definiram IPCA-E + TR pré-citação e SELIC pós-citação como índice único, substituindo a TR puro + juros TRD separados.
- **RRA Art. 12-A** — Regime tributário para Rendimentos Recebidos Acumuladamente. O IRPF é calculado com alíquota efetiva equivalente ao rendimento mensal médio (NM = número de meses).
- **Súmula 200 TST** — Juros de mora incidem sobre o valor nominal da condenação, **não** sobre base já corrigida monetariamente.
- **EC 103/2019** — Reforma da Previdência. Instituiu alíquotas progressivas do INSS com incidência em **faixas marginais** a partir de novembro/2019.
- **LC 110/2001** — Lei Complementar que criou a **contribuição adicional de 10% do FGTS** sobre rescisão sem justa causa. Extinta em 20/12/2019 (guard temporal).
- **PJC** — Formato de arquivo nativo do **PJe-Calc** do CNJ (XML compactado). Serve para persistir e trocar cálculos entre operadores.
- **UFIR / URV / Cruzado** — Unidades de referência históricas. URV (1993-1994) converteu Cruzeiro Real em Real; UFIR (1992-2000) era atualização fiscal; Cruzado (1986-1989) precedeu o Cruzado Novo e o Cruzeiro. O sistema faz conversão transparente em `conversao-moedas.ts`.

---

## Ver também

- [README](../README.md) — visão técnica e instalação
- [Manual do Desenvolvedor](./DESENVOLVEDOR.md) — arquitetura e extensão
- [Changelog](./CHANGELOG.md) — histórico de versões
