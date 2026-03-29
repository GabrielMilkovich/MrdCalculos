# AUDITORIA FORENSE COMPLETA — MRD CALC vs PJe-Calc

**Data**: 2026-03-29
**Base**: 99.430 linhas de código, 33.123 linhas pjecalc lib, 4.148 linhas engine

---

## A. DIAGNÓSTICO EXECUTIVO

O MRD Calc possui um motor de cálculo funcional com fórmula PJe-Calc correta (truncamento por etapa via Decimal.js), correção monetária ADC 58/59, INSS progressivo, IRRF com RRA, FGTS com multa, e reflexos via DAG. O fluxo ponta a ponta (UI → orchestrator → engine → relatório) funciona.

**Porém, existem problemas estruturais que impedem paridade de centavos com o PJe-Calc:**

1. **200 conversões `Number()` no engine** — cada uma perde precisão Decimal→float64
2. **Zero transações atômicas** no service.ts — persistência pode ser parcial
3. **118 chamadas `new Date()`** no engine — potencial não-determinismo por timezone
4. **Modo assisted_from_pjc mascara bugs** — calibração GT substitui cálculos do engine
5. **32 defaults `??`** no engine — fallbacks silenciosos que produzem resultados aparentemente corretos mas materialmente errados
6. **VerbaModules (31 arquivos) são dead code** — não participam do fluxo de produção
7. **Séries históricas de índices dependem de DB** — se vazio, correção = 0 silenciosamente

---

## B. MATRIZ DE DIFERENÇAS MRD CALC vs PJe-Calc

### FÓRMULA BASE

| Aspecto | PJe-Calc | MRD Calc | Diferença | Severidade |
|---------|----------|----------|-----------|-----------|
| Fórmula | (Base/Div)↓2 × Mult↓2 × Qtd↓2 × Dobra↓2 | Idêntica (engine.ts:522-528) | Nenhuma | — |
| Rounding verba | TRUNCAMENTO (corte) | `Decimal.ROUND_DOWN` (engine.ts:10) | Nenhuma | — |
| Rounding INSS/IR | Arredondamento bancário | `ROUND_HALF_EVEN` (engine.ts:2024) | Nenhuma | — |
| Precisão | 20 dígitos | `Decimal.set({precision:20})` | Nenhuma | — |

### ORDEM DE CÁLCULO

| Etapa PJe-Calc | MRD Calc | Correto? |
|----------------|----------|----------|
| 1. Gerar competências | `getCompetencias()` | ✅ |
| 2. Calcular verbas (ordenação topológica) | `processVerba()` com DAG | ✅ |
| 3. Abatimento OJ 415 | `aplicarAbatimentoGlobalOJ415()` | ✅ |
| 4. Correção monetária | `aplicarCorrecao*()` | ✅ |
| 5. CS antes de juros (quando `juros_apos_deducao_cs`) | Step A→B→C no liquidar() | ✅ |
| 6. Juros de mora | Step 4/5 no liquidar() | ✅ |
| 7. FGTS | Step 5 | ✅ |
| 8. CS final | Step 6 | ✅ |
| 9. IR | Step 7 | ✅ |
| 10. OJ 394 (juros pós-IR) | Step 7c | ✅ (recente) |
| 11. Seguro-desemprego | Step 8 | ✅ |
| 12. Honorários/Custas | Step 9 | ✅ |
| 13. Multas | Step 10 | ✅ |
| 14. Resumo | Step final | ✅ |

### DIVERGÊNCIAS MATEMÁTICAS CONFIRMADAS

| # | Área | Comportamento PJe-Calc | Comportamento MRD Calc | Impacto | Severidade |
|---|------|----------------------|----------------------|---------|-----------|
| 1 | **Number() conversão** | Toda aritmética em precisão interna Java BigDecimal | 200x `Number()` converte Decimal→float64 no engine, perdendo precisão após cálculos | Centavos acumulados | **ALTO** |
| 2 | **new Date() timezone** | Java Date com timezone explícito | 118x `new Date()` em engine.ts — depende do timezone do servidor/browser | Pode gerar competência errada perto da meia-noite | **MÉDIO** |
| 3 | **Correção fator via razão** | Acumula mês a mês multiplicando fatores com truncamento | `getIndiceCorrecaoDB()` divide acumulados (razão única) — pode divergir por rounding path diferente | Centavos | **MÉDIO** |
| 4 | **FGTS depósitos base** | Sobre valor nominal (diferença bruta) | Sobre `oc.diferenca` (correto) mas em competências fora do período pode usar base incorreta | Centavos | **BAIXO** |
| 5 | **IR RRA divisor mínimo** | Mínimo 1 mês sempre | `Math.max(1, meses)` — ok | Nenhuma | — |
| 6 | **Prescrição parcial** | Trunca verbas no dia exato | Trunca no mês (competência) | Centavos na borda | **BAIXO** |

### FUNCIONALIDADES DO PJe-Calc AUSENTES NO MRD CALC

| # | Funcionalidade PJe-Calc | Status MRD Calc | Impacto |
|---|------------------------|----------------|---------|
| 1 | **Horas in itinere** (pré-Reforma) | Sem template/módulo dedicado | BAIXO (raro pós-2017) |
| 2 | **Banco de horas / compensação** | Ausente | MÉDIO |
| 3 | **Salário utilidade** (moradia, alimentação in natura) | Ausente | BAIXO |
| 4 | **Adicional de sobreaviso** (apuração diária) | Template existe, engine calcula genérico | BAIXO |
| 5 | **Pejotização** (reconhecimento de vínculo) | Ausente como workflow | BAIXO |
| 6 | **Sucessão trabalhista** | Ausente | BAIXO |
| 7 | **Acordo parcial** (homologação) | Ausente como fluxo | BAIXO |
| 8 | **Cálculo de honorários periciais separados** | Dentro de custas, não separado | BAIXO |
| 9 | **Importação de tabelas CNJ (pacote de índices)** | Via Edge Function, não pacote local | MÉDIO |
| 10 | **Exportação HTML do relatório** | Só PDF (via print window) | BAIXO |

---

## C. BUGS E FRAGILIDADES CONFIRMADOS

### CRÍTICOS (afetam resultado final — divergência de centavos com PJe-Calc)

| # | Bug | Arquivo:Linha | Evidência | Correção |
|---|-----|---------------|-----------|----------|
| 1 | **Correção monetária usa ROUND_DOWN** | engine.ts:1226 | `.times(indiceCorrecao).toDP(2)` usa ROUND_DOWN global. PJe-Calc usa ROUND_HALF_EVEN para correção monetária | Passar `Decimal.ROUND_HALF_EVEN` explícito no .toDP() de correção |
| 2 | **mesesEntreInclusivo retorna 0 para mesmo mês** | engine.ts:1600-1603 | `exclusive > 0 ? exclusive + 1 : 0`. Quando start e end são no mesmo mês, retorna 0. PJe-Calc conta 1 mês | Mudar para `exclusive + 1` (sem condicional em >0) ou `Math.max(1, exclusive + 1)` |
| 3 | **GT path IR RRA usa Set.size** | engine.ts:2345 | No path GT, `mesesAnosAnteriores = compsAnteriores.size` (meses com renda). No path normal, usa span total. Inconsistência | Usar span total em ambos os paths |
| 4 | **Honorários inclui FGTS na base** | engine.ts:2561 | `baseHon = principalCorrigido + juros + fgts`. PJe-Calc NÃO inclui FGTS na base de honorários | Remover fgts da base: `baseHon = principalCorrigido + juros` |
| 5 | **INSS sobre 13º não é separado** | engine.ts:1871 | `totalBase = baseNormal + base13` junta bases. PJe-Calc calcula INSS do 13º em base separada com teto próprio | Separar cálculo INSS para base normal e base 13º, cada um com seu teto |
| 6 | **200x Number() perde precisão** | engine.ts (200 ocorrências) | `Number(new Decimal(...).toDP(2))` é seguro para 2 casas, mas `Number(base)` em variáveis intermediárias não é | Manter Decimal até o final, converter Number só na saída |
| 7 | **Persistência não-atômica** | service.ts (0 transações) | Se `upsertResultado` funciona mas `upsertOcorrencias` falha, resultado fica sem detalhes | Envolver em transação Supabase RPC |
| 8 | **Stale result sem flag** | orchestrator.ts | Se parâmetros mudam após cálculo, resultado antigo é exibido sem aviso | Adicionar hash de inputs no resultado, comparar na exibição |
| 9 | **Timezone em Date** | engine.ts (118 ocorrências) | `new Date('2024-01-15')` pode ser interpretado como UTC ou local dependendo do ambiente | Usar parse ISO explícito ou date-fns/parseISO |
| 10 | **Múltiplos historicos somados** | engine.ts:695-709 | Quando vários históricos cobrem a mesma competência, valores são SOMADOS. PJe-Calc usa o mais recente | Usar último histórico aplicável, não soma |
| 11 | **Fallback silencioso para ultima_remuneracao** | engine.ts:717-724 | Qualquer verba com base zero recebe ultima_remuneracao, mesmo sem solicitar | Só aplicar fallback quando explicitamente configurado |
| 12 | **FGTS aprendiz 2% para TODAS as verbas** | engine.ts:1659 | Se UMA verba tem tipo_fgts='aprendiz', TODAS usam 2% | Deve ser por configuração global, não por verba |
| 13 | **Média de reflexo usa float** | engine.ts:3908 | `valores.reduce((s,v) => s+v, 0) / valores.length` — JS float, não Decimal.js | Usar Decimal para média |

### ALTOS (afetam precisão)

| # | Fragilidade | Arquivo | Impacto |
|---|------------|---------|---------|
| 5 | **INSS/IR fallback 2025 para qualquer ano** | engine.ts:788-843 | Para competências 2020-2024 sem faixas no DB, aplica faixas erradas. Warning emitido mas cálculo prossegue |
| 6 | **Índice ausente → fator=1** | engine.ts:1134-1166 | Sem correção monetária — erro de 20-50% em processos longos |
| 7 | **Terceiros pode ainda usar 5.8% se fpas_code nulo** | engine.ts:1913,2023 | Se FPAS não configurado no CS config, cai no default |
| 8 | **GT calibração mascara bugs** | engine.ts:1432-1543 | Modo assisted_from_pjc substitui cálculos do engine por valores PJC — bugs no modo independent ficam latentes |

### MÉDIOS (afetam robustez)

| # | Fragilidade | Arquivo | Impacto |
|---|------------|---------|---------|
| 9 | **106 `as any` no pjecalc** | Vários | Bypass de tipagem — bugs de tipo passam sem aviso |
| 10 | **Concorrência sem lock** | service.ts | Dois usuários calculando o mesmo caso podem sobrescrever resultados |
| 11 | **Sem versionamento de resultado** | service.ts | Cada recálculo sobrescreve o anterior sem histórico |
| 12 | **edge-cases.test.ts testa warn mas não bloqueia** | __tests__/ | Sistema continua com dados inválidos onde deveria parar |

---

## D. PLANO DE CORREÇÃO PRIORIZADO

### IMEDIATO (afeta resultado de centavos)

| # | Ação | Arquivo | Mudança |
|---|------|---------|---------|
| 1 | **Eliminar Number() intermediários** | engine.ts | Manter Decimal em toda a chain, converter Number() só nos campos de saída (PjeOcorrenciaResult) |
| 2 | **Forçar timezone UTC em todas as datas** | engine.ts | Substituir `new Date(str)` por `new Date(str + 'T00:00:00Z')` ou usar date-fns parseISO |
| 3 | **Falhar explicitamente quando DB não tem faixas para competência** | engine.ts | Em getFaixasINSSParaCompetencia e getFaixasIRParaCompetencia, quando competência < 2025 e DB vazio, adicionar validation error (não apenas warning) |

### CURTO PRAZO (afeta confiabilidade)

| # | Ação | Arquivo | Mudança |
|---|------|---------|---------|
| 4 | **Transações atômicas para persistência** | service.ts | Criar função RPC no Supabase que salva resultado + ocorrências em uma transação |
| 5 | **Hash de inputs para detectar stale result** | orchestrator.ts | Calcular hash dos parâmetros de entrada e armazenar junto com resultado. Na exibição, comparar |
| 6 | **Versionamento de resultados** | service.ts, schema | Criar tabela `pjecalc_resultado_historico` que mantém versões anteriores |

### MÉDIO PRAZO (afeta blindagem)

| # | Ação | Mudança |
|---|------|---------|
| 7 | **Remover `as any`** | Substituir por tipos corretos — 106 ocorrências |
| 8 | **Golden tests com .pjc real** | Executar engine no arquivo de src/data/, comparar com valores do XML |
| 9 | **Teste de determinismo** | Rodar mesmo cálculo 100x, verificar resultado idêntico bit a bit |

---

## D2. ACHADOS DO FLUXO DE DADOS

### Campos mortos (definidos nos tipos, nunca usados em produção)
- `PjeMultiVinculo`, `PjeVinculoData`, `vinculo_id`, `vinculo_label` — multi-vínculo é feature fantasma
- `data_prescricao_quinquenal` — campo existe, nunca populado
- `salario_minimo` em PjeParametros — engine usa tabela DB, não esse campo
- `incidencias.previdencia_privada` e `incidencias.pensao_alimenticia` — sempre hardcoded false no orchestrator

### Dados perdidos no round-trip PJC → DB → Engine
- `dados_extras` do CartaoPonto (horas_art384, inter_jornadas, repousos_trabalhados) — populado pelo import PJC mas **descartado pelo orchestrator** ao ler do DB
- Férias: tipo suporta 3 períodos de gozo (Art. 134 CLT fracionamento), orchestrator só mapeia 1
- `diaFechamentoMes` do PJC — parseado mas nunca usado
- `regimeDoContrato` do PJC — não mapeado para `regime_trabalho`

### Defaults perigosos no import PJC
- Honorários: hardcoded 15% (PJC tem valor mas não percentual)
- IR dependentes: default 0 (PJC não expõe)
- IR incidir_sobre_juros: default false
- CS períodos Simples Nacional: default []
- FGTS saldos/saques: default []

### Relatórios PDF — Itens ausentes vs PJe-Calc
- Sem tabela separada "Apuração de Juros" (juros é só coluna na memória)
- Sem audit trail no PDF
- Sem calculation warnings no PDF
- Sem detalhe seguro-desemprego, pensão, prev. privada, salário-família

### Persistência
- Sem transações atômicas (resultado e ocorrências salvos separadamente)
- Sem versionamento explícito (acumula mas só último recuperável)
- Sem mecanismo de diff entre versões

## E. CRITÉRIOS DE ACEITE PARA EQUIVALÊNCIA REAL

O sistema pode ser considerado equivalente ao PJe-Calc quando:

1. **Paridade de centavos**: Para um caso de referência (o .pjc em src/data/), a diferença absoluta em cada componente (principal, correção, juros, INSS segurado, INSS empregador, IR, FGTS, líquido, total reclamada) é ≤ R$ 0,01
2. **Determinismo**: 100 execuções consecutivas do mesmo caso produzem resultado idêntico bit a bit
3. **Sem fallback silencioso**: Quando um dado obrigatório falta (faixas INSS, índices, feriados), o sistema BLOQUEIA o cálculo com erro, não produz resultado parcial
4. **Audit trail completo**: Cada valor no resultado final pode ser rastreado até sua origem (parâmetro, índice, faixa, fórmula) via audit_trail
5. **Testes de regressão**: ≥5 casos reais do PJe-Calc como golden tests, comparando cada componente com tolerância de R$ 0,01
6. **Persistência atômica**: Resultado salvo atomicamente — nunca estado parcial
7. **Versionamento**: Cada recálculo preserva versão anterior para comparação

---

## D3. ACHADOS DE CONFIABILIDADE E SEGURANÇA

### SEGURANÇA — CRÍTICO
**RLS `USING (true)` em TODAS as tabelas pjecalc_***. Qualquer usuário autenticado pode ler, modificar ou deletar cálculos de QUALQUER outro usuário. Tabelas de ocorrências permitem acesso ANÔNIMO. Dados sensíveis expostos: CPF, CNPJ, salários, cálculos judiciais.
- Correção: substituir por `USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = TABLE.case_id AND c.criado_por = auth.uid()))`

### ERROS ENGOLIDOS — CRÍTICO
**11+ funções no service.ts** e **9+ funções no orchestrator.ts** engolem erros com `catch { return null/[] }`. Se tabela de INSS/IR estiver inacessível (timeout, migration quebrada, DNS), o engine usa defaults 2025 sem nenhum aviso ao usuário. Persistência de resultado tem `console.error` mas não propaga o erro — chamador recebe sucesso.

### NÃO-DETERMINISMO — CRÍTICO
**10+ locais no engine.ts** usam `new Date()` como fallback para datas ausentes. Executar o mesmo cálculo em dias diferentes produz resultados diferentes. Fatal para processos judiciais onde reprodutibilidade é obrigatória.

### CONCORRÊNCIA — ALTO
Zero transações, zero locks, zero versionamento. Dois usuários calculando o mesmo caso simultaneamente produzem estado corrompido (ocorrências de ambos interleaved).

### PERSISTÊNCIA — ALTO
Ocorrências inseridas uma-a-uma em loop (potencialmente 6.000+ calls para caso longo). Janela máxima para falha parcial. Se browser fecha no meio, resultado salvo com metade das ocorrências.

## F. CONCLUSÃO HONESTA

### Distância do PJe-Calc
O motor de cálculo está **arquiteturalmente correto** — fórmula, ordem, truncamento, DAG de reflexos, ADC 58/59, INSS progressivo, IR RRA, FGTS estão implementados com lógica real. A paridade de centavos não é garantida hoje por causa de:
1. Conversões `Number()` intermediárias (200 pontos de perda de precisão)
2. Correção por razão de acumulados vs multiplicação mês-a-mês
3. Fallback silencioso quando DB falta dados

### Gargalos principais
1. **Precisão Decimal→float** — o maior risco de divergência de centavos
2. **Dados históricos no DB** — se tabelas vazias, resultado é silenciosamente errado
3. **Modo assisted mascarando independent** — bugs latentes no modo puro

### O que impede paridade de centavos
- As 200 conversões `Number()` no engine
- A acumulação de correção por razão (vs mês-a-mês com truncamento)
- Fallbacks de INSS/IR para 2025 em competências históricas

### O que precisa ser feito
1. Eliminar `Number()` intermediários (manter Decimal até saída)
2. Forçar UTC em todas as datas
3. Bloquear cálculo quando dados obrigatórios faltam
4. Transações atômicas na persistência
5. Golden tests com .pjc real medindo delta por componente
6. Versionamento de resultados

O sistema é **funcional como protótipo avançado**, mas **NÃO está pronto para produção** em contexto jurídico por causa de:
1. **Segurança**: RLS aberto permite acesso cross-user a dados sensíveis
2. **Confiabilidade**: erros engolidos silenciosamente podem produzir resultados errados sem aviso
3. **Determinismo**: `new Date()` como fallback torna resultados não-reprodutíveis
4. **Precisão**: correção monetária usa rounding mode errado, causando divergência de centavos
5. **Persistência**: sem transações atômicas, resultados podem ser parcialmente salvos

Para produção, é necessário: (a) corrigir RLS, (b) eliminar error swallowing, (c) eliminar new Date() fallbacks, (d) corrigir rounding de correção monetária, (e) envolver persistência em transação.
