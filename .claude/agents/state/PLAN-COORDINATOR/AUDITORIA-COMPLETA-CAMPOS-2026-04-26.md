# Auditoria Completa de Campos Java vs TS vs UI — 6 Grupos

> **Data:** 2026-04-26
> **Método:** 6 agentes em paralelo (modo CEREBRO-CLAUDE), análise por
> grupo de módulos relacionados.
> **Cobertura:** 38 módulos UI + classes Java de cálculo + tipos TS
> **Corpus validação:** 14 PJCs em `public/reports/`

## Sumário executivo

A hipótese do usuário **estava certa**. Java grava muitos campos por
entidade que o engine TS ignora ou simplifica. Em muitos casos, o frontend
também não tem UI para configurar. Isso explica:

1. Casos como tiago/joseli/leandro com gaps maiores
2. Inconsistências em features pouco testadas
3. Round-trip lossy (carregar PJC → editar → exportar perde dados)

Total identificado:
- **3 bloqueadores críticos** (impedem cálculo correto em cenários comuns)
- **18 gaps de alta prioridade** (afetam ≥2 PJCs do corpus)
- **23 gaps de média prioridade** (raros mas presentes)
- **14 adiáveis** (nenhum caso atual no corpus)

## Matriz consolidada — Top 15 críticos

| # | Item | Grupo | Java | TS | UI | Frequência | Impacto |
|---|------|-------|------|----|----|-----------|---------|
| 1 | **OcorrenciaDeFgts** (estrutura mensal) | FGTS | ✓ 26 campos | ✗ | ✗ | 14/14 (todos) | **BLOQUEADOR** — engine não rastreia juros/correção FGTS por competência |
| 2 | **`<operacoesDeFgts>`** (saques pré-existentes) | FGTS | ✓ | parcial | ✓ | **9/14 (64%)** | Engine não deduz saldos prévios — gap em casos com saque parcial |
| 3 | **RRA art. 12-A** (`rraMeses`, `rraNumeroParcelas`) | IR | ✓ | ✗ | ✗ | 2-3/14 (casos > 12m) | Até **−30% IR** em casos longos (joseli, leandro) |
| 4 | **`limitarTeto`** | INSS | ✓ | ✓ (assume true) | ✓ | **6/14** com `false` | Gap até **74%** em casos com salário > teto |
| 5 | **Férias indenizadas — INSS não filtrado** | Férias | ✓ exclui | flag mas ignora | ✓ | **3/14** | ~R$ 240/3k por caso (Lei 8.212 art. 28 §9 "d") |
| 6 | **`comportamentoDoReflexo`** (3 enums) | Verbas | ✓ enum | string genérico | parcial | **5/14** não-default | Diff até **+15%** em média de reflexos |
| 7 | **`excluirFaltaJustificada/NaoJustificada/FeriasGozadas`** | Verbas | ✓ filtra | desserializa mas ignora | ✓ | 2-3/14 | Base inflada quando há faltas |
| 8 | **Multa 523 CPC** (10% descumprimento sentença) | Multas | ✓ | ✗ | ✗ | 0/14 (mas legalmente obrigatório) | CPC art. 523 |
| 9 | **Honorários: `aplicarJuros` + `dataVencimento`** | Hon. | ✓ | ✗ | ✗ | **1/14** (izabela 430d) | ~R$ 400-500 izabela |
| 10 | **Honorários: `tipoCobrancaReclamante`** | Hon. | ✓ | ✗ | ✗ | 6/14 com valor (todos DESCONTAR_CREDITO) | Risco se aparecer COBRAR |
| 11 | **Faltas — redução de avos férias** | Faltas | ✓ Art.130 | ✗ | parcial | 2/14 | ~0,06 avos/falta |
| 12 | **Abono pecuniário (Art. 143 CLT)** — divisor 1,5 | Férias | ✓ | parcial | ✓ | **9/14 (64%)** | Pode dar -33% no valor abono |
| 13 | **Pensão alimentícia — 3 campos UI ausentes** | Pensão | ✓ | parcial | ✗ 3 campos | 0/14 atualmente | Bloqueador se aparecer caso |
| 14 | **Prev. Privada — 4 campos hardcoded** | Prev. | ✓ | ✓ | hardcoded | 0/14 atualmente | Bloqueador se aparecer caso |
| 15 | **Salário-Família — cota/teto hardcoded 2025** | SF | ✓ por ano | ✓ por ano | sem override | ~3/14 (estimado) | Errado em casos retroativos pré-2025 |

## Detalhamento por grupo

### Grupo A — INSS + IR
- INSS: 16 campos auditados; críticos: `corrigirDescontoReclamante` (J-only),
  `regimeDeCaixa` (nomeação divergente), `limitarTeto` (engine assume true)
- IR: 13 campos auditados; críticos: RRA art. 12-A, mapeamento `regimeDeCaixa`
- TS tem campos avançados sem UI: `com_correcao_trabalhista`, `atualizar_inss_selic`,
  `base_cs_segurado`, `separar_reclamante_beneficiario`

### Grupo B — Honorários + Custas + Multas
- Honorários: **14 campos críticos faltando** (tipoHonorario, baseParaApuracao,
  apurarIRPFSobreJuros, aplicarJuros, dataApartirDeAplicarJuros,
  tipoDeIndiceDeCorrecao, outroIndiceDeCorrecao, tipoCobrancaReclamante,
  tipoImpostoRenda, indiceCorrecaoHonorario, taxaJurosHonorario,
  verbasSelecionadas, dataEvento, folhaDoEvento)
- Custas: `tipoDeCustasDeConhecimentoEnum`, `aplicarTetoCustasConhecimentoCalcExterno`
- Multas: **Multa 523 CPC ausente em UI e TS**; campos auxiliares
  (`tipoCobrancaReclamante`, `dataApartirDeAplicarJuros`)

### Grupo C — FGTS (BLOQUEADOR estrutural)
- `<OcorrenciaDeFgts>` ausente em TS: 26+ campos/mês não rastreados
- `<operacoesDeFgts>` em 9/14 PJCs — engine não deduz saldos prévios
- `incidenciaPensaoAlimenticia*` (sobre FGTS e sobre multa) ausentes
- `multaDoArtigo467` em UI ausente
- `indiceMulta`, `indiceMulta467`, `taxaDeJurosParaDataDemissao` ausentes
- **Estimativa: 52h** para fechar FGTS Java completo

### Grupo D — Verbas + Pagamentos + Histórico
- `comportamentoDoReflexo` opaco (string em vez de enum mapeado)
- `excluirFalta*` + `excluirFeriasGozadas` ignorados na lógica
- `feriasIndenizadas`/`feriasComAbono` não persistidos em PjeOcorrenciaResult
- `indiceAcumulado` por ocorrência não rastreado (Java tem precisão 25 dígitos)
- 5/14 PJCs (36%) com histórico salarial populado

### Grupo E — Férias + Faltas + Estabilidade
- **Férias indenizadas — INSS não filtrado** (3 PJCs)
- Faltas — redução avos não implementada (Art. 130 CLT, 2 PJCs)
- Abono pecuniário — divisor 1,5 não validado (9 PJCs com abono)
- Estabilidade — sem opção reintegração proporcional

### Grupo F — Atualização + Outros benefícios
- **Atualização/Correção: COMPLETO** ✓ (Java/TS/UI alinhados)
- Pensão Alimentícia: 3 campos UI ausentes
- Previdência Privada: 4 campos hardcoded ou ausentes
- Seguro-Desemprego: COMPLETO ✓
- Salário-Família: cota/teto hardcoded
- Dados Processo: COMPLETO ✓

## Plano de ação priorizado

### Fase 1 — Bloqueadores (~25h)
1. **OcorrenciaDeFgts em TS** + cálculo mensal Java-equivalente — 16h
2. **`<operacoesDeFgts>` no parser e adapter** + lógica de dedução — 5h
3. **RRA art. 12-A em IR** — 4h

### Fase 2 — Alta prioridade (~20h)
4. `limitarTeto` ler do parser (não assumir) — 1h
5. Férias indenizadas — corrigir filtro INSS — 2h
6. `comportamentoDoReflexo` mapear enum + lógica — 4h
7. `excluirFalta*` + `excluirFeriasGozadas` — aplicar na lógica — 3h
8. Faltas — redução de avos férias — 3h
9. Abono pecuniário — validar divisor 1,5 — 2h
10. Honorários `aplicarJuros` + `dataVencimento` — 3h
11. Honorários `tipoCobrancaReclamante` — 1h
12. `regimeDeCaixa` — unificar nomes Java/TS/UI — 1h

### Fase 3 — Média prioridade (~15h)
13. Multa 523 CPC — adicionar em UI + TS — 3h
14. Honorários: 11 campos restantes (tipoHonorario, baseParaApuracao, etc.) — 5h
15. Custas: tipoDeCustasDeConhecimentoEnum + autos/armazenamento — 3h
16. Pensão Alimentícia: 3 campos UI — 2h
17. Previdência Privada: 4 campos UI — 2h

### Fase 4 — Baixa prioridade (~10h)
18. Salário-Família: cota/teto override por ano — 2h
19. TS sem UI: 4 checkboxes (`com_correcao_trabalhista`, etc.) — 2h
20. `feriasIndenizadas`/`feriasComAbono` em PjeOcorrenciaResult — 2h
21. Estabilidade: opção reintegração — 2h
22. Demais campos secundários — 2h

### Fase 5 — Cobertura faltante no corpus (~5h)
23. Buscar/gerar PJCs para POS_ADC58 (regime puro)
24. Buscar PJC com `destinoDoFgts=DEPOSITAR`
25. Buscar PJC com Pensão Alimentícia + Prev. Privada ativa

## Total estimado realista

**Fase 1+2 (bloqueadores + alta prioridade)**: ~45h — fecha 80% dos gaps

**Fase 1+2+3 (incluindo média prioridade)**: ~60h — fecha 95%

**Total para 100%**: ~75h (incluindo Fase 4+5)

Comparado às estimativas anteriores (30-40h após validação P0-P9, ou
65-106h da estimativa inicial), **o número subiu para ~75h** porque a
auditoria revelou mais gaps do que a fase de validação havia exposto —
especialmente FGTS (52h só ele) e os 14 campos de honorários.

## Recomendação

Executar **Fase 1+2 primeiro (~45h, ~5-6 dias)**. Após cada fase:
- Rodar calibrate
- Validar planilha antonio + 2-3 outros PJCs
- Documentar comportamento marcar/desmarcar para cada nova UI

Antes da Fase 3, parar e re-medir: provavelmente o calibrate já estará
em ±1% médio. Aí decide se Fase 3-5 valem o esforço marginal ou se viramos
para "modo manutenção".

## Sinceridade

Esse plano é o que vejo como caminho real. **Não promete 100%
garantido** — mesmo executando 75h, podem aparecer cenários de borda não
mapeados. Mas estabelece base sólida e mensurável.

A maior incerteza está em **FGTS** (Fase 1, item 1) — 16h é estimativa, mas
o port real de `OcorrenciaDeFgts` + `Fgts` + integração com histórico
pode passar de 24h.

A maior chance de quick win imediato é **`limitarTeto`** (1h, 6 PJCs
afetados) e **Férias indenizadas — INSS** (2h, 3 PJCs afetados, lei
clara).
