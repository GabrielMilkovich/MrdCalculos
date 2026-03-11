# Relatório Técnico — Refatoração Estrutural MRDcalc v3

**Data:** 2026-03-11  
**Versão Engine:** 3.1.0  

---

## 1. Diagnóstico do Estado Anterior

| # | Problema | Severidade |
|---|---------|-----------|
| 1 | Formatos concorrentes (JSON MRDcalc-PJC, XML `<pjecalc>`, XML `<Calculo>`) | Alto |
| 2 | Parser não extraía ApuracaoDiariaCartao completa | Crítico |
| 3 | Bridge retornava `cartaoPonto: []` hardcoded | Crítico |
| 4 | Fallback sintético de históricos sem logging | Alto |
| 5 | Orchestrator aceitava fallbacks silenciosos | Alto |
| 6 | Sem relatório de perda de fidelidade | Alto |

### Estado Preservado
- Motor canônico (`PjeCalcEngine`) funcional com `decimal.js`
- Modo pré-computado para paridade PJC
- Testes de paridade para 15+ casos
- DAG de dependências entre verbas

---

## 2. Alterações Realizadas

### Etapa A — Formato Canônico Unificado
- `xml-import.ts`, `xml-export.ts`, `pjc-export.ts`: **@deprecated** com warnings em runtime
- Formato canônico: XML `<Calculo>` via `pjc-analyzer.ts`
- Pipeline: `analyzePJC()` → `convertPjcToEngineInputs()` → `PjeCalcEngine`

### Etapa B — Parser e Bridge (anterior)
- Parse completo de `ApuracaoDiariaCartao` (16 campos)
- `OcorrenciaDoHistoricoSalarial` com `dataOcorrencia`
- Bridge loss-aware com `FidelityReport`
- Cartão ponto agregado de registros diários reais

### Etapa C — Orchestrator Endurecido
- **Table Validator** (`domain/table-validator.ts`): Validação pré-cálculo
- Bloqueia sem `data_liquidacao` (E006 - critical)
- Bloqueia >6 competências sem índice (E001)
- Warnings para fallbacks INSS/IR (W012, W013)
- Modo precomputado relaxa validações com PJC ground truth

### Etapa D — Parity Engine e UI
- **Parity Engine** (`domain/parity-engine.ts`): Comparação engine vs PJC
- 8 totais + por competência via ApuracaoDeJuros GT
- Score 0-100%, tolerância Δ ≤ R$0,02 e ≤ 0,5%
- **FidelidadePanel**: UI de auditoria com fidelidade + paridade
- **Error Codes** (`domain/error-codes.ts`): 18 códigos estruturados (E001-E008, W001-W009)

### Etapa E — Round-Trip XML e Audit Trail ✅ NOVO
- **XML Export Completo**: `exportPJCXml()` agora emite todos os campos:
  - `projetarAviso`, `limitarAvos`, `zerarNegativos`, `dataCitacao`
  - `horasExtrasMensal` na apuração diária
  - `tipoDivisor`, `tipoQuantidade`, `quantidade` nas Calculadas
  - `gerarVerbasNaPrincipal`, `gerarVerbasNaReflexa`, `multiplicador`, `divisor` nos Reflexos
  - `abono`, `diasAbono` nas Férias
  - Blocos `<ConfigFGTS>`, `<ConfigCS>`, `<ConfigIR>` para round-trip completo
- **Parser atualizado**: Leitura dos novos blocos FGTS/CS/IR no re-import
- **Audit Trail**: `liquidar()` agora emite `PjeAuditTrailEntry[]` com cada passo:
  - Validação, verbas (principal + reflexa + precomputada), correção, GT calibração, CS, juros, IR, FGTS, resumo
  - Disponível em `PjeLiquidacaoResult.audit_trail`

### Etapa F — Seed de Tabelas Históricas ✅ NOVO
- **Edge Function** `seed-reference-tables`: Seed de INSS (2015-2025) e IR (2015-2025) com faixas progressivas
- Eliminação de fallbacks default para cálculos em produção
- Dados baseados em legislação oficial (EC 103/2019 para INSS progressivo pós-2020)

---

## 3. Arquivos Criados/Alterados

| Arquivo | Ação |
|---------|------|
| `domain/parity-engine.ts` | Criado |
| `domain/table-validator.ts` | Criado |
| `domain/error-codes.ts` | Criado |
| `domain/fidelity-report.ts` | Criado |
| `FidelidadePanel.tsx` | Criado |
| `seed-reference-tables/index.ts` | Criado |
| `pjc-xml-real.ts` | Export + parser completo |
| `engine-types.ts` | `PjeAuditTrailEntry` + `audit_trail` |
| `engine.ts` | Audit trail em `liquidar()` |
| `xml-import.ts` | Deprecated |
| `xml-export.ts` | Deprecated |
| `pjc-export.ts` | Deprecated |
| `orchestrator.ts` | Validação integrada |
| `pjc-analyzer.ts` | Parse completo |
| `pjc-to-engine.ts` | Bridge loss-aware |
| `test/parity-engine.test.ts` | Criado (4/4 ✅) |
| `test/table-validator.test.ts` | Criado (6/6 ✅) |
| `test/golden-pipeline.test.ts` | Criado |
| `test/pjc-roundtrip.test.ts` | Round-trip XML tests |

---

## 4. Gaps Remanescentes

| Gap | Impacto | Status |
|-----|---------|--------|
| ~~Audit trail per-step no engine~~ | ~~Médio~~ | ✅ Resolvido |
| ~~Round-trip export `<Calculo>`~~ | ~~Médio~~ | ✅ Resolvido |
| ~~Seed de tabelas históricas~~ | ~~Alto~~ | ✅ Resolvido |
| ~~FidelidadePanel na página~~ | ~~Baixo~~ | ✅ Resolvido |
| ~~Exceções de sábado~~ | ~~Baixo~~ | ✅ Resolvido — `PjeExcecaoSabado` type + `isSabadoDiaUtilParaData()` |
| ~~Pensão alimentícia bridge~~ | ~~Médio~~ | ✅ Resolvido — `buildPensaoConfig()` from PJC |
| ~~Previdência privada bridge~~ | ~~Médio~~ | ✅ Resolvido — `buildPrevPrivadaConfig()` from PJC |
| ~~Salário-família bridge~~ | ~~Baixo~~ | ✅ Resolvido — `buildSalarioFamiliaConfig()` from PJC |
| ~~INPC/IGP-M normalization~~ | ~~Médio~~ | ✅ Resolvido — normalized in bridge + `Isento` in zero set |
| ~~TAXA_LEGAL engine support~~ | ~~Alto~~ | ✅ Código pronto — série `TAXA_LEGAL` no `calcularFatorCorrecao()` |
| TAXA_LEGAL série histórica seed | Médio | ⬚ Pendente — requer dados oficiais do BACEN |
| INPC/IGP-M séries históricas | Médio | ⬚ Pendente — requer seed via edge function |
| IR Art. 12-A RRA contagem meses fracionários | Baixo | Divergência < 1% |
| Persistência de exceções de sábado em DB | Baixo | ⬚ Pendente — sem tabela dedicada |
| Legacy engine referenciado por 2 componentes admin | Baixo | Deprecated, funcional |

---

## 5. Política de Tolerância

| Métrica | Tolerância | Justificativa |
|---------|-----------|---------------|
| Principal Bruto | R$ 0,01 | Modo pré-computado |
| Líquido Exequente | R$ 0,01 | GT calibração + closure |
| INSS (CS) | R$ 0,01 | Scaling via GT fator |
| IR | 1% | RRA Art. 12-A contagem de meses |
| Custas | R$ 0,01 | Percentual fixo |

---

## 6. Política de Erros

### Erros Bloqueantes (E001-E008)
| Código | Condição |
|--------|----------|
| E001 | Tabela INSS ausente |
| E002 | Tabela IR ausente |
| E003 | Índices correção ausentes |
| E004 | Data admissão ausente |
| E005 | Data ajuizamento ausente |
| E006 | Data liquidação ausente |
| E007 | Parser não mapeou bloco crítico |
| E008 | Inconsistência estrutural |

### Warnings (W001-W009)
| Código | Condição |
|--------|----------|
| W001 | Histórico sintético usado |
| W002 | Cartão ponto vazio |
| W003 | Módulo não suportado |
| W004-W006 | Tabelas complementares ausentes |
| W007 | Bloco PJC não mapeado |
| W008 | Divergência de precisão |
| W009 | Fallback default usado |

---

## 7. Rollback

Mudanças aditivas e retrocompatíveis:
- Deprecated mantém código funcional
- Orchestrator: remover bloco "3.5. PRE-CALCULATION"
- Nenhuma migração de banco executada

*Documento atualizado em 2026-03-11.*
