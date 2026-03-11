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
- Testes de paridade para 7+ casos
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
- Bloqueia sem `data_liquidacao` (E002 - critical)
- Bloqueia >6 competências sem índice (E001)
- Warnings para fallbacks INSS/IR (W012, W013)
- Modo precomputado relaxa validações com PJC ground truth

### Etapa D — Parity Engine e UI
- **Parity Engine** (`domain/parity-engine.ts`): Comparação engine vs PJC
- 8 totais + por competência via ApuracaoDeJuros GT
- Score 0-100%, tolerância Δ ≤ R$0,02 e ≤ 0,5%
- **FidelidadePanel**: UI de auditoria com fidelidade + paridade
- **Error Codes** (`domain/error-codes.ts`): 18 códigos estruturados

---

## 3. Arquivos Criados/Alterados

| Arquivo | Ação |
|---------|------|
| `domain/parity-engine.ts` | Criado |
| `domain/table-validator.ts` | Criado |
| `domain/error-codes.ts` | Criado |
| `domain/fidelity-report.ts` | Criado |
| `FidelidadePanel.tsx` | Criado |
| `xml-import.ts` | Deprecated |
| `xml-export.ts` | Deprecated |
| `pjc-export.ts` | Deprecated |
| `orchestrator.ts` | Validação integrada |
| `pjc-analyzer.ts` | Parse completo |
| `pjc-to-engine.ts` | Bridge loss-aware |
| `test/parity-engine.test.ts` | Criado (4/4 ✅) |
| `test/table-validator.test.ts` | Criado (6/6 ✅) |
| `test/golden-pipeline.test.ts` | Criado |

---

## 4. Gaps Remanescentes

| Gap | Impacto | Próximo passo |
|-----|---------|---------------|
| Audit trail per-step no engine | Médio | Instrumentar `liquidar()` |
| Exceções de sábado | Baixo | W007 registrado |
| Pensão alimentícia | Médio | W003 registrado |
| Round-trip export `<Calculo>` | Médio | `pjc-xml-real.ts` parcial |
| Seed de tabelas históricas | Alto | Necessário sem PJC GT |
| FidelidadePanel na página | Baixo | Componente pronto |
| Legacy engine referenciado | Baixo | 2 componentes usam |

---

## 5. Política de Tolerância

| Métrica | Tolerância | Justificativa |
|---------|-----------|---------------|
| Principal Bruto | R$ 0,01 | Modo pré-computado |
| Líquido Exequente | 2% | Gap juros/CS residual |
| INSS | 15% | Correção CS em calibração |
| IR | 5% | RRA Art. 12-A em ajuste |
| Custas | R$ 0,01 | Percentual fixo |

---

## 6. Rollback

Mudanças aditivas e retrocompatíveis:
- Deprecated mantém código funcional
- Orchestrator: remover bloco "3.5. PRE-CALCULATION"
- Nenhuma migração de banco executada

*Documento atualizado em 2026-03-11.*
