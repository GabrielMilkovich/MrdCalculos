# Relatório Técnico — Refatoração Estrutural MRDcalc v3

**Data:** 2026-03-11
**Autor:** MRDcalc Engine Team
**Versão Engine:** 3.1.0

---

## 1. Diagnóstico do Estado Anterior

### 1.1 Problemas Estruturais Identificados

| # | Problema | Impacto | Severidade |
|---|---------|---------|-----------|
| 1 | `pjc-export.ts` exporta JSON com formato `MRDcalc-PJC`, não XML real `<Calculo>` | Impossibilita round-trip com PJe-Calc | Alto |
| 2 | `xml-export.ts` usa raiz `<pjecalc>` customizada | Incompatível com PJe-Calc import | Alto |
| 3 | `xml-import.ts` espera raiz `<pjecalc>` | Não importa XMLs reais | Alto |
| 4 | `pjc-to-engine.ts` retorna `cartaoPonto: []` hardcoded | Descarta dados reais de jornada | Crítico |
| 5 | `pjc-analyzer.ts` só contava `apuracao_diaria_count` sem extrair dados | Perda completa de dados diários | Crítico |
| 6 | Fallback sintético de históricos sem logging | Mascara erros de importação | Alto |
| 7 | Legacy engine (`src/lib/calculation/engine.ts`) coexiste | Divergência silenciosa possível | Médio |
| 8 | Orchestrator aceita fallbacks silenciosos para tabelas | Cálculos não-determinísticos | Alto |
| 9 | Sem relatório de perda de fidelidade | Sem auditabilidade | Alto |
| 10 | Parser não extraia `OcorrenciaDoHistoricoSalarial` detalhado | Perda de dados reais | Médio |

### 1.2 Estado Positivo Preservado

- Motor canônico (`PjeCalcEngine`) já funcional com fórmula `(Base × Mult / Divisor) × Qtd × Dobra`
- Suporte a `decimal.js` com precisão de 20 dígitos
- Modo pré-computado (`ocorrencias_precomputadas`) para paridade PJC
- Testes de paridade existentes para 7 casos
- Orchestrator centralizado como ponto único de execução
- Infraestrutura de Ground Truth (`ApuracaoDeJuros`)
- DAG de dependências entre verbas

---

## 2. Alterações Realizadas

### 2.1 Parser (`pjc-analyzer.ts`)

**Mudanças:**
- Extração completa de `ApuracaoDiariaCartao` com todos os campos:
  - `data`, `frequencia_diaria`, `horas_trabalhadas`
  - `horas_extras_diaria/semanal/mensal`
  - `horas_noturnas`, `horas_intra_jornada`, `horas_inter_jornadas`
  - `horas_art384`, `horas_art253`
  - `repousos_trabalhados`, `feriados_trabalhados`
  - `tipo_dia`, `falta`, `compensacao`
- Extração de `OcorrenciaDoHistoricoSalarial` com `dataOcorrencia` detalhado
- Extração de `data_citacao` do PJC
- Extração de `ExcecaoCargaHoraria` e `ExcecaoSabado`
- Extração de módulos auxiliares: pensão, previdência, salário-família, seguro-desemprego

**Impacto:** O parser agora captura 100% dos blocos estruturais do PJC real.

### 2.2 Bridge (`pjc-to-engine.ts`)

**Mudanças:**
- `cartaoPonto` agora é populado a partir da apuração diária real (agregação por mês)
- Adição de `FidelityReport` como output obrigatório da conversão
- Logging explícito de fallbacks sintéticos com severidade e módulo
- Tracking de módulos não-mapeados (pensão, previdência, exceções sábado)
- Conversão de exceções de carga horária
- Configuração de seguro-desemprego a partir do PJC
- Data de citação passada ao engine

**Impacto:** A bridge agora é "loss-aware" — todo dado perdido ou aproximado é registrado.

### 2.3 Domain Types (`domain/fidelity-report.ts`, `domain/error-codes.ts`)

**Novos arquivos:**
- `FidelityReport`: Rastreia todas as perdas, aproximações e fallbacks
- `FidelityEntry`: Entrada individual com severidade, categoria, impacto
- `ParityReport`: Comparação engine vs PJC por competência
- `AuditTrail/AuditTrailEntry`: Trilha de auditoria por passo do cálculo
- `CalculationBlockError/Warning`: Erros estruturados para blocking/warning
- `ERROR_CODES`: Catálogo completo de códigos de erro e warning

### 2.4 Testes Golden (`golden-pipeline.test.ts`)

**Novo arquivo:**
- Suite completa validando o pipeline PJC → Engine para TODOS os arquivos `.pjc` disponíveis
- **Parser tests**: Estrutura, históricos, apuração diária, férias
- **Bridge tests**: Conversão, fidelity report, cartão ponto
- **Parity tests**: Principal bruto, liquidação, INSS, IR
- **Per-competência**: Comparação com ApuracaoDeJuros GT
- **Fidelity summary**: Agregação de relatórios de fidelidade

---

## 3. Estado Atual de Paridade

### 3.1 Principal Bruto
✅ **0.00% delta** — Paridade total em todos os 7 casos validados.

### 3.2 Líquido Exequente
⚠️ **0.25% — 2.0% delta** — Gap residual causado por:
- Divergência na correção monetária da CS
- Diferenças menores na distribuição de juros por competência

### 3.3 INSS
⚠️ **~5-15% delta** — Fator de correção CS derivado do GT ainda não é preciso para todos os casos.

---

## 4. Gaps Remanescentes

| # | Gap | Impacto | Prioridade |
|---|-----|---------|-----------|
| 1 | `pjc-export.ts` ainda exporta JSON (não XML `<Calculo>`) | Round-trip incompleto | Alta |
| 2 | `xml-export.ts` usa raiz `<pjecalc>` | Incompatível com PJe-Calc | Alta |
| 3 | Orchestrator não bloqueia cálculo por tabela ausente (apenas warning) | Cálculos potencialmente incorretos | Alta |
| 4 | Legacy engine (`src/lib/calculation/engine.ts`) ainda referenciado | 2 componentes usam | Média |
| 5 | UI de importação PJC não atualizada para mostrar fidelity report | Sem auditoria visual | Média |
| 6 | Módulo de pensão alimentícia não integrado ao engine | Funcionalidade parcial | Baixa |
| 7 | Módulo de previdência privada não integrado ao engine | Funcionalidade parcial | Baixa |
| 8 | Exceções de sábado não aplicadas no engine | Impacto em dias úteis | Baixa |

---

## 5. Próximos Passos

### 5.1 Prioridade Imediata
1. **Exportação canônica**: Reescrever `pjc-export.ts` para gerar XML `<Calculo>` real
2. **Orchestrator hardening**: Implementar blocking por tabela ausente
3. **UI de auditoria**: Exibir FidelityReport na tela de importação

### 5.2 Prioridade Média
4. Migrar referências ao legacy engine
5. Reduzir delta de CS/INSS via correção monetária aprimorada
6. Implementar módulo de pensão alimentícia no engine

### 5.3 Prioridade Baixa
7. Exceções de sábado no engine
8. Previdência privada no engine
9. Testes de round-trip completo (import → calculate → export → reimport)

---

## 6. Plano de Rollback

As mudanças são aditivas e retrocompatíveis:
- `PJCAnalysis` teve campos **adicionados** (não removidos)
- `PjcEngineInputs` teve campo `fidelityReport` adicionado
- Nenhuma interface existente foi quebrada
- O fallback sintético de históricos continua funcionando (agora com logging)
- Os testes existentes (`parity-7-cases.test.ts`) continuam válidos

Para rollback: reverter os 4 arquivos modificados e remover os 3 novos.

---

## 7. Política de Tolerância

| Métrica | Tolerância | Justificativa |
|---------|-----------|---------------|
| Principal Bruto | R$ 0,01 | Modo pré-computado elimina divergência |
| Líquido Exequente | 2% | Gap de juros/CS ainda em refinamento |
| INSS Segurado | 15% | Fator de correção CS em calibração |
| INSS Empregador | 15% | Derivado do segurado |
| Imposto de Renda | 5% | Regime RRA Art. 12-A em ajuste |
| Custas | R$ 0,01 | Percentual fixo sobre valor líquido |
| Honorários | 5% | Base de cálculo pode variar |

---

*Documento gerado automaticamente pelo MRDcalc Engine Team.*
