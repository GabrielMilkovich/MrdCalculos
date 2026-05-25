# Auditoria Fake Front-end — 2026-05-25

## Resumo executivo

- Total módulos auditados: **8**
- ✅ Funcionais: **2** (ModuloMultasCLT, ModuloVerbasCadastro)
- ⚠️ Parciais: **1** (ModuloParametrosGerais — campos HE%, tipo_demissao, instancia não consumidos)
- ❌ Fakes: **2** (ModuloAjusteSentenca, ModuloExcecoesJuros)
- 📋 CRUD legítimo: **2** (ModuloTabelasGlobais, ModuloTabelasRegionais)
- 👁️ Visualizadores: **1** (ModuloGuiasRecolhimento)

---

## Detalhamento por módulo

### 1. ModuloAjusteSentenca

**Tabela do banco:** `sentenca_rulesets`, `worktime_adjustments`

**Caminho de gravação:**
- UI: `ModuloAjusteSentenca.tsx` → `supabase.from('sentenca_rulesets').insert/update`
- Tabela alvo: `sentenca_rulesets`, `worktime_adjustments`

**Caminho de leitura:**
- Orchestrator: NOT LOADED
- Engine: NOT CONSUMED

**Classificação:** ❌ **Fake** — dados gravados não são lidos pelo motor

**Decisão:** Desabilitar UI com banner "Módulo em desenvolvimento"

**Justificativa:** Implementação custaria 3-5 dias (precisa de pipeline para converter ajustes diários → PjeCartaoPonto). `worktime-adjuster.ts` existe, mas a ponte para o formato do engine está ausente.

---

### 2. ModuloExcecoesJuros

**Tabela do banco:** `pjecalc_excecao_juros`

**Caminho de gravação:**
- UI: `ModuloExcecoesJuros.tsx` → `svc.insertExcecaoJuros()`
- Tabela alvo: `pjecalc_excecao_juros`

**Caminho de leitura:**
- Orchestrator: NOT LOADED (`loadCaseData()` não inclui excecoesJuros)
- Engine: `PjeCorrecaoConfig.excecoes_juros` existe no tipo mas NUNCA é lido em engine-v3.ts

**Classificação:** ❌ **Fake** — type plumbing existe end-to-end mas a fiação no orchestrator e engine está ausente

**Decisão:** Desabilitar UI com banner "Módulo em desenvolvimento"

**Justificativa:** Implementação custaria 1-2 dias (tipos existem, service existe, falta wiring). Alternativa funcional: usar Combinação por Data no módulo Correção.

---

### 3. ModuloGuiasRecolhimento

**Tabela do banco:** NENHUMA — módulo não grava dados. Recebe `PjeLiquidacaoResult` como prop e gera GPS/DARF client-side.

**Classificação:** 👁️ **Visualizador** — consome saída do engine para renderizar guias de recolhimento

**Decisão:** Manter como está

---

### 4. ModuloMultasCLT

**Tabela do banco:** `pjecalc_multas_config`

**Caminho de gravação:**
- UI: `ModuloMultasCLT.tsx` → `svc.upsertMultasConfig()`
- Tabela alvo: `pjecalc_multas_config`

**Caminho de leitura:**
- Orchestrator: `service.ts:850` via `getMultasConfig(caseId)` → `loadCaseData()`
- Engine: `orchestrator.ts:687-730` (`toEngineMultasConfig`), `orchestrator.ts:1003-1107` (`multasConfigToVerbas`), `engine-v3.ts:719-730` (calcula multa_467, multa_477, multa_523)

**Classificação:** ✅ **Funcional** — pipeline completo UI → DB → orchestrator → engine

**Decisão:** Manter como está

---

### 5. ModuloParametrosGerais

**Tabela do banco:** `pjecalc_calculos` (exposta pela VIEW `pjecalc_parametros`)

**Caminho de gravação:**
- UI: `ModuloParametrosGerais.tsx` → `supabase.from('pjecalc_calculos').upsert()`
- Campos: data_admissao, data_demissao, data_ajuizamento, uf, municipio_ibge, jornada_contratual_horas, sabado_dia_util, prescricao_quinquenal, prescricao_fgts, projetar_aviso_indenizado, + ~10 campos extras

**Caminho de leitura:**
- Orchestrator: `getParametros(caseId)` via VIEW `pjecalc_parametros`
- Engine: `toEngineParams()` (`orchestrator.ts:102-128`)

**Campos NÃO consumidos pelo engine:** `percentual_he_50`, `percentual_he_100`, `percentual_adicional_noturno`, `tipo_demissao`, `fase`, `instancia`, `divisor_horas`, `dia_fechamento_mes`, `titulo`, `observacoes`, `tags`

**Classificação:** ⚠️ **Parcial** — core funcional, ~10 campos salvos mas não consumidos

**Decisão:** Manter como está. Campos CNJ (numero_processo, valor_causa) são metadata legítimo para GPS/relatórios. Campos de HE% e tipo_demissao são debt técnico (P2).

---

### 6. ModuloTabelasGlobais

**Tabela do banco:** NENHUMA — módulo read-only. Lê de `pjecalc_salario_minimo`, `pjecalc_inss_faixas`, `pjecalc_ir_faixas`, `pjecalc_correcao_monetaria`, etc.

**Classificação:** 📋 **CRUD legítimo** — browser de tabelas de referência usadas pelo engine

**Decisão:** Manter como está

---

### 7. ModuloTabelasRegionais

**Tabela do banco:** NENHUMA — módulo display-only com constantes hardcoded (`PISOS_REGIONAIS`, `VT_REGIONAIS`, `SALARIO_FAMILIA_FAIXAS`)

**Classificação:** 📋 **CRUD legítimo** — referência estática para pisos regionais e VT

**Decisão:** Manter como está

---

### 8. ModuloVerbasCadastro

**Tabela do banco:** `pjecalc_verba_base`

**Caminho de gravação:**
- UI: `ModuloVerbasCadastro.tsx` → `svc.insertVerba/updateVerba/deleteVerba`
- Tabela alvo: `pjecalc_verba_base`

**Caminho de leitura:**
- Orchestrator: `getVerbas(caseId)` → `toEngineVerbas()` (`orchestrator.ts:202-349`)
- Engine: `engine-v3.ts:526-598` — pipeline primário do cálculo inteiro

**Classificação:** ✅ **Funcional** — core data pipeline

**Decisão:** Manter como está

---

## Decisões e ações

| Módulo | Classificação | Decisão | Esforço fix | Status |
|---|---|---|---|---|
| ModuloAjusteSentenca | ❌ Fake | Banner "em desenvolvimento" | 3-5d | ✅ Aplicado |
| ModuloExcecoesJuros | ❌ Fake | Banner "em desenvolvimento" | 1-2d | ✅ Aplicado |
| ModuloGuiasRecolhimento | 👁️ Visualizador | Manter | — | N/A |
| ModuloMultasCLT | ✅ Funcional | Manter | — | N/A |
| ModuloParametrosGerais | ⚠️ Parcial | Documentar campos órfãos | <1d | Documentado |
| ModuloTabelasGlobais | 📋 CRUD | Manter | — | N/A |
| ModuloTabelasRegionais | 📋 CRUD | Manter | — | N/A |
| ModuloVerbasCadastro | ✅ Funcional | Manter | — | N/A |

## Dívidas técnicas descobertas

1. **ModuloExcecoesJuros → engine wiring** (P1, 1-2d): tipo `PjeExcecaoJuros` existe em engine-types.ts, campo `excecoes_juros` existe em `PjeCorrecaoConfig`, service function `getExcecoesJuros` existe. Falta: (a) adicionar ao `loadCaseData()`, (b) passar para `toEngineCorrecaoConfig()`, (c) consumir em `engine-v3.ts` no cálculo de juros
2. **ModuloAjusteSentenca → cartão de ponto bridge** (P2, 3-5d): `worktime-adjuster.ts` existe. Falta: pipeline para agregar ajustes diários em `PjeCartaoPonto` por competência
3. **ModuloParametrosGerais campos órfãos** (P2, <1d): `percentual_he_50/100`, `percentual_adicional_noturno`, `tipo_demissao`, `fase`, `instancia`, `divisor_horas` salvos mas não consumidos pelo engine
