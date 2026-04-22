# Changelog — MRD Calc

Histórico das entregas da branch `claude/analyze-pje-calc-migration-ORJxJ`, agrupadas por fase. O formato segue [Keep a Changelog](https://keepachangelog.com/) adaptado para trabalho em ondas.

---

## 🧹 [2026-04-22] — Consolidação V3 como motor único

**Objetivo:** isolar motores legados (V1, V2, V4) e consagrar `PjeCalcEngineV3` como motor canônico em produção. Sem mudança de comportamento de cálculo.

- **Motores legados em quarentena** — `PjeCalcEngine` (V1), `PjeCalcEngineV4`, `CalculationEngine` (V1), `CalculationEngineV2` movidos para `src/lib/pjecalc/_legacy/` e `src/lib/calculation/_legacy/` com README de política e remoção planejada para 2026-05-20.
- **Warnings de runtime** — cada um dos 4 construtores legados emite `console.warn` com stacktrace quando instanciado fora de `NODE_ENV=test`, facilitando detecção de uso residual em produção.
- **Barrel público preservado** — `@/lib/calculation` continua exportando os mesmos 7 símbolos (`CalculationEngine`, `registerCalculator`, etc.), apenas re-exportados de `_legacy/`.
- **Zero alteração de cálculo** — `npm run calibrate` produz JSON byte-idêntico antes/depois (modulo timestamp). Vitest: 658 = 658 testes.
- **Arquivos protegidos intocados** — `engine-v3.ts`, `core/`, `orchestrator.ts`, `pjc-to-engine.ts`, `verba-modules/`, `pdf-report-*.ts` com `git diff = 0`.
- **Documento dedicado** — ver `docs/MOTOR-UNICO-V3.md` com decisão arquitetural, política de uso, gates da PR e três notas importantes (calibrate ainda mede V1, ajustes mecânicos de path foram neutros, estado de paridade é V1-vs-PJC).
- Próxima PR: migrar `scripts/calibration-pipeline.ts` para medir V3 (não V1).

---

## 🚀 [2026-04-17] — Onda 3: Features Avançadas

**Objetivo:** recursos cross-cutting para produtividade e auditoria.

- **Versionamento de cálculos** — `versioning.ts` + `version-diff.ts` com histórico em `pjecalc_versoes`
- **Logger estruturado** — substitui `console.log`, expõe níveis + `request_id`
- **3 relatórios Jasper-style** — consolidado, justificativa, apuração de juros
- **Observability panel** — painel de produtividade agregando métricas de auditoria
- Commit de referência: `5f5093f`

---

## 📊 [2026-04-17] — Onda 2: Dados Oficiais

**Objetivo:** tabelas oficiais completas e atualizadas, sem dependência externa em runtime.

### Tabelas históricas e conversão de moedas

- **Tabelas históricas INSS/IR 1996-2025** (`tabelas-historicas.ts`) — faixas mensais com todas as MPs e ECs
- **Seeds oficiais IPCA/SELIC/TR/INPC** via Edge Function `seed-indices-oficiais` + script `seed-indices-oficiais.ts`
- **`indices-loader.ts` + `indices-fallback.ts`** — cache local, fallback embutido, auto-refresh via BCB/IBGE
- **Conversão de moedas** (`conversao-moedas.ts`) — URV, UFIR, Cruzado, Cruzado Novo (1986-1995)
- Commits: `0e73720`, `a54a80f`

---

## 🌐 [2026-04-17] — Onda 1: Produção

**Objetivo:** integração real com PJe/eSocial e assinatura ICP-Brasil.

- **E2E Playwright** — `e2e/app-loads.spec.ts`, `pjecalc-basic.spec.ts`, `relatorios.spec.ts`
- **HTTP clients** — `pje-http-client.ts` (API PJe CNJ) e `esocial-http-client.ts` (webservice e-Social)
- **ICP-Brasil signing** — assinatura digital A1/A3 via `node-forge`
- **Pacote ZIP + Base64** para peticionamento eletrônico (`pje-integration.ts`)
- Commit: `49f4af7`

---

## 🎨 [2026-04-17] — Fases A/B/C: UI, Relatórios e Workflows

### Fase A — Relatórios PDF + Validadores

- `pdf-report-custas.ts` — relatório detalhado de custas processuais
- `pdf-report-precatorio.ts` — formato EC 62/2009 + EC 113/2021
- `esocial-schema.ts` — tipos TypeScript para S-2500 e S-2501
- `esocial-validator.ts` — validação completa do XML e-Social
- `pdf-report-justificativa.ts` — fundamentação legal de cada escolha
- UI polish do `ModuloCustas`
- Commits: `861d107`, `79207d4`, `83e6bad`, `00d03f5`, `2873dd0`

### Fase B — Apuração e Consolidado

- `pdf-report-apuracao-juros.ts` — linha do tempo de juros
- `pdf-report-consolidado.ts` — resumo executivo
- `masked-input.tsx` — componente com máscara para CNJ/CPF/CNPJ
- Framework de validadores em `core/comum/validators/`
- Commits: `55d85f2`, `5636d33`

### Fase C — Templates e Integrações

- **EC 136 (precatório)** — correções específicas aplicadas
- **Integração PJe** (`pje-integration.ts`) — 7/7 testes verdes
- **`SeletorTemplatesRelatorio`** — escolha de 12 relatórios PDF — 8/8 testes verdes
- Refatoração do seletor para simplicidade
- Commits: `da1cc46`, `838b081`, `0538872`, `75df492`, `d64b310`

---

## 🧮 [2026-04-16 → 2026-04-17] — Motor: Fases 1-6 (Porte 1:1 do PJe-Calc)

**Objetivo:** substituir engine legado por core idêntico ao PJe-Calc v2.15.1 (Java), atingindo paridade ≤10% em 12 dos 17 casos reais.

### Fase 0 — Baseline

- `BASELINE.md` e `BASELINE-FASE0.md` — medição inicial de paridade antes do porte
- Commit: `dabc038`

### Fase 1 — MaquinaDeCalculo expandida

- Expansão da `MaquinaDeCalculo` com 18 novos testes unitários
- Commit: `5c670fb`

### Fase 2 — FGTS + INSS + IRPF

- `FGTS` — `OperacaoDeFgts` + `MaquinaDeCalculoDeFgts`
- INSS como `IModuloLiquidavel` (progressivo EC 103/2019)
- IRPF Art. 12-A (`TabelaIrpf` + `FaixaFiscal`)
- Wiring de juros de mora (SELIC / taxa legal / composto)
- Multa 40% FGTS conectada ao resultado
- Redução de Δ médio: **33% → 22.7%**
- Commits: `b3de5d2`, `ce7e34f`, `7226403`, `8fca2a2`, `49215d2`

### Fase 3 — Custas, Honorários, Multas

- `MaquinaDeCalculoDeCustas` + `ParametrosDeCustasFixas`
- `MaquinaDeCalculoDeHonorarios` (I4) — sucumbenciais/contratuais
- `MaquinaDeCalculoDeMulta` (I5) — 467/523 CPC
- Conexão entre `liquidar()` e as máquinas dedicadas
- IRPF com `TabelaIrpf` real (remoção de hardcoded)
- Commits: `59fedc9`, `9cef54a`, `28258ff`, `55de8d0`, `10fd534`, `34bdbab`

### Fase 4 — ADC 58/59 e correção segmentada

- `TabelaDeCorrecaoMonetaria` com combinações de índice (ADC 58/59)
- `Calculo.liquidar()` suporta múltiplas combinações por período
- Correção segmentada por período: Δ +5.21%, **7/17 ≤10%**, 1 caso GOLDEN
- Juros respeitando combinações do PJC (TRD_SIMPLES + SELIC)
- Commits: `4b2674f`, `3c39be4`, `a81aac4`

### Fase 5 — Remoção do engine legado

- Remoção do `PjeCalcEngine` legado (**-4515 LOC**)
- UI migrada para `engine-types` / `engine-constants` direto
- `orchestrator` usando `PjeCalcEngineV3`
- Construtor do V3 expandido para 25 parâmetros (paridade total)
- Commits: `a008087`, `b6bc40f`, `1fd3ecc`, `d362907`, `672ece6`

### Fase 6 — Gate 2 Final

- **GATE 2 FINAL:** 12/17 aprovados ≤10% (71%), 7/17 ≤5% (41%)
- Analyzer extraindo `valor_principal` e `juros_mora_persistido` do PJC
- Correções surgicais em `engine-v3`: juros sobre diferença nominal, preservação de índices pré-computados, FGTS conforme `compor_principal`
- Fix "frontend fake" — 3 bugs de exibição que não impactavam cálculo mas induziam a erro
- Documento `GATE2-FINAL.md` com lições aprendidas
- Commits: `a3c61ca`, `b9b8538`, `b07d82c`, `0b99e35`, `40d0b78`, `680402d`

---

## 🏗 [2026-04-16] — Fases de Fundação (10-15)

Blocos de infraestrutura do core (porte Java → TS):

| Fase    | Escopo                                                                              | Commit   |
| ------- | ----------------------------------------------------------------------------------- | -------- |
| Fase 1  | Estrutura de Termos (`Comportamento*` + deps)                                       | `50ddd38`, `7ff1ba3` |
| Fase 2  | `HistoricoSalarial` + `Ferias`                                                      | `2fb2c9e` |
| Fase 3  | `ParametrosDeAtualizacao`                                                           | `dfbf4c8` |
| Fase 4  | 14 índices monetários (IPCA-E, SELIC, INPC, IGP-M, TR, UFIR, Precatórios, DNFP...)  | `e22fd92`, `12cdb8b` |
| Fase 5  | Juros (6 subtipos) + `ApuracaoDeJuros`                                              | `7bbd84d` |
| Fase 6  | INSS (estrutura completa + `FaixaPrevidenciaria`)                                   | `338526c` |
| Fase 7  | IRPF (estrutura completa)                                                           | `5d31871` |
| Fase 8  | Honorários, Custas, Multas (estrutura)                                              | `1b399d1` |
| Fase 9  | Pagamento / Atualização                                                             | `6c85571` |
| Fase 10 | `Calculo` completo (3087 LOC)                                                       | `27d24e6` |
| Fase 11 | `VerbaCalculo` completo                                                             | `acef87a` |
| Fase 12 | Relatórios (JRAdapter → HTML/PDF)                                                   | `fb289fd` |
| Fase 13 | `dominio/cartaodeponto` (13 classes)                                                | `608bd00` |
| Fase 14 | `dominio/calculoexterno` (15 classes + 7 repositórios stubs)                        | `f054f36` |
| Fase 15 | `comum/validators` + `GerenciadorDeValidadores` (25 arquivos)                       | `e6449e8`, `00f6216` |

---

## 🔧 [2026-04-17] — GAPs / BUGs identificados

Correções e gaps específicos mapeados no audit:

- **GAP-1** — Módulo Vale-Transporte (componente + service + migration)
- **GAP-2** — Módulo Advogados (integração com honorários contratuais)
- **GAP-3** — Extração de `jurosDoAjuizamento` + `valorDaCausa` do PJC XML
- **GAP-4** — Tipos novos para ocorrências antes não suportadas
- **GAP-5** — Exceções de juros (Lei 11.941/2009 — Fazenda Pública)
- **GAP-6** — Campos adicionais em `DadosProcesso`
- **BUG-2** — Parser PJC para juros/valor-causa
- **BUG-3** — Exceções de sábado no cálculo de DSR
- **engine-v4** — INSS marginal proporcionalizado (experimental)
- Commits: `dad9ccb`, `061ba03`, `c40dc16`, `7a128ed`, `9f1d6b1`, `6572a6b`, `ae370fe`, `65292a5`

---

## 📜 Convenções deste changelog

- **Data** entre colchetes no formato ISO (`YYYY-MM-DD`)
- **Título** descreve a fase/onda entregue
- Bullets citam **commits reais** (hash curto) para rastreabilidade
- Agrupamento respeita a ordem: entrega mais recente no topo
- Mudanças quebrando API recebem marcação `⚠️ BREAKING`

---

## Referências

- [Manual do Usuário](./MANUAL-USUARIO.md)
- [Manual do Desenvolvedor](./DESENVOLVEDOR.md)
- [README](../README.md)
- `docs/GATE2-FINAL.md` — métricas de paridade da Fase 6
- `docs/FASES-ABC-UI.md` — resumo visual das fases UI
