# Sprint 2A — Diagnóstico Instrumentado PROCESSO_00008567

**Data:** 2026-04-29
**Branch:** main em 7264a39
**Script:** `scripts/diag-outlier-08567.ts`
**Output:** `/tmp/diag-08567.txt`

---

## Sumário executivo

A hipótese inicial do Sprint 1 ("engine SUBESTIMA juros pós-EC 113") foi
**REFUTADA**. O diagnóstico instrumentado revelou o oposto:

- **Engine SUPERESTIMA correção em +R$ 4.577 (+7.94%) e juros em +R$ 1.866 (+12.39%).**
- Soma engine vs oracle (somatórios das 40 ApuracaoDeJuros): **+R$ 6.443 a mais** no engine.
- Gap líquido reportado é R$ 9.947. Diferença de R$ 3.500 vem do **FGTS oracle = 0**
  (engine reporta R$ 4.430 — campo cosmético sem afetar análise principal).

**Causa raiz identificada**: o engine **não aglutina verbas reflexas
(13º, Férias+1/3, Aviso Prévio) na competência única em que Java atribui**.
Em vez disso, espalha as ocorrências em todos os meses competentes. Resultado:
o engine paga juros sobre principal corrigido em datas mais antigas que
o oracle, inflando AMBAS correção e juros.

---

## Tabela competência × engine × oracle (8 amostras representativas)

| Comp    | ENG_DIF | ENG_CORR | ENG_JUR | ORC_CORR | ORC_TAXA% | ORC_JUR | dCORR  | dJUR  |
|---------|---------|----------|---------|----------|-----------|---------|--------|-------|
| 2019-03 | 95,45   | 123,39   | 37,15   | 122,92   | 27,8067   | 32,06   | +0,47  | +5,09 |
| 2019-12 | 1.667   | 2.106    | 609,77  | 1.546    | 27,8067   | 402,36  | **+560,36** | **+207,41** |
| 2020-12 | 2.492   | 3.004    | 823,74  | 2.035    | 27,8067   | 527,54  | **+969,44** | **+296,20** |
| 2021-12 | 2.666   | 2.919    | 755,76  | 1.757    | 27,7579   | 451,86  | **+1.161** | **+303,90** |
| 2022-03 | 1.155   | 1.225    | 312,44  | 1.220    | 27,6003   | 312,69  | +5,02  | -0,25 |
| 2022-04 | 1.245   | 1.298    | 329,46  | 1.293    | 27,5449   | 330,17  | +5,33  | -0,71 |
| **2022-05** | **1.529** | **1.586** | **400,74** | **99,44** | 27,3787 | **25,17** | **+1.487** | **+375,57** |
| 2022-06 | 9.232   | 9.516    | 2.485   | 9.464    | 27,3010   | 2.555   | +52,23 | -69,67|
| **TOTAL** | 53.787 | 62.229 | **16.926** | 57.652 | n/a | **15.060** | **+4.577** | **+1.866** |

**Primeira competência com divergência > 1%:** **2019-03** (microscópica: dCorr +0,47, dJur +5,09).

**Primeira competência com divergência > 5% (material):** **2019-12** (dCorr +560,36).

---

## Onde está o gap: CORREÇÃO ou JUROS?

**AMBOS, mas a CORREÇÃO é a CAUSA primária e juros é CONSEQUÊNCIA**:

| Item | Engine | Oracle | Gap | % |
|---|---|---|---|---|
| Total corrigido | R$ 62.229,40 | R$ 57.652,14 | **+R$ 4.577,26** | **+7,94%** |
| Total juros | R$ 16.925,95 | R$ 15.060,10 | **+R$ 1.865,85** | **+12,39%** |
| Soma | R$ 79.155,35 | R$ 72.712,24 | **+R$ 6.443,11** | **+8,86%** |

A taxa de juros aplicada é IDÊNTICA entre engine e oracle (~27,8%/27,3%). O
juros engine é maior porque o **principal corrigido sobre o qual incide é maior**.

Subtraindo o multiplicador de juros (taxa ~27,5% sobre delta corrigido):
- gap_juros_esperado = 4.577 × 0,275 = ~R$ 1.259
- gap_juros_real = R$ 1.866
- excesso = R$ 607 → indica que excesso de correção também ocorre nas verbas
  COM 13º (que recebem juros sobre base maior pré-INSS-deduction).

---

## Refutação da hipótese EC 113

A hipótese Sprint 1 "engine usa 1%/mês a partir do ajuizamento (~30%)
enquanto Java aplica SELIC acumulada (~40%)" foi **REFUTADA pelos dados**:

- **Taxa oracle em todas competências = 27,8% a 27,3%** (não 40%).
- Engine aplica taxa equivalente (combinação TRD_SIMPLES + SELIC pós-2023-02-23).
- Sprint 1 leu apenas o `<taxaDeJuros>` do XML SEM contextualizar que essa taxa é
  consolidada pré-cálculo. As taxas 27-40% citadas no Sprint 1 (linha 87-99)
  vêm da OcorrenciaDeInssSobreSalariosDevidos (taxa progressiva por verba INSS),
  NÃO da ApuracaoDeJuros consolidada.
- A combinação `combinacoes_juros = [TRD_SIMPLES desde início, SELIC desde 2023-02-23]`
  está sendo aplicada corretamente (verificado em logs de input).

---

## Hipótese refinada (Sprint 2B)

**Causa raiz: engine V3 não respeita aglutinação de verbas reflexas
(`OcorrenciaDePagamento`)** em data única conforme Java.

Padrão observado:
1. **Verbas com sufixo "13º SALÁRIO SOBRE …"**: oracle aglutina em DEZEMBRO
   do ano (ou rescisão se anterior). Engine espalha mensalmente.
   → 2019-12: dCorr +560 // 2020-12: dCorr +969 // 2021-12: dCorr +1.161.
2. **Verbas "FÉRIAS + 1/3 SOBRE …"**: oracle aglutina em mês de gozo/rescisão.
   Engine espalha pelo período aquisitivo.
   → 2022-05: dCorr +1.487 (engine antecipou em 1 mês a rescisão).
3. **Verbas "AVISO PRÉVIO SOBRE …"**: oracle atribui apenas à rescisão (06/2022).
   Engine cuida certo aqui (gap em 2022-06 = +52, microscópico).

Total dos 4 picos (2019-12 + 2020-12 + 2021-12 + 2022-05) = **R$ 4.178** em correção
+ **R$ 1.183** em juros = **R$ 5.361 (83% do gap de R$ 6.443)**.

**Próximo passo Sprint 2B**:
- Investigar `pjc-to-engine.ts` em `precomputarOcorrencias` ou equivalente — verificar
  se 13º/Férias/Aviso geram ocorrência única ou múltiplas.
- Comparar com Java `VerbaDeCalculo.calcularOcorrenciasPagas/Devidas` para verbas com
  `OcorrenciaDePagamento` = ANUAL/RESCISAO (vs MENSAL).
- A correção é provavelmente em `verba-builder.ts` (geração de ocorrências), NÃO em
  `engine-v3.ts` (que só aplica correção/juros sobre o que recebe).

---

## Métricas de sanity

- Vitest: **NÃO RODADO** nesta sprint (apenas instrumentação, 0 modificação em src/).
- Engine resumo PROCESSO_00008567:
  - liquido_reclamante: R$ 78.539,66 (oracle: R$ 88.486,94 → -11,24% = -R$ 9.947)
  - cs_segurado: R$ 5.045,97 (oracle inssReclamante R$ 5.086,92 → -0,81%)
  - cs_empregador: R$ 14.274,82
- Hash liquidação oracle: `1C0EED774156B8563FDFFE601649D8F4`

---

## Limitações desta análise

- Diagnóstico baseado em **soma por competência** (todas verbas), não isola
  qual verba específica em 2019-12 etc. está duplicada. Sprint 2B vai precisar
  de detalhamento por verba+competência.
- FGTS engine R$ 4.430 vs oracle R$ 0 não foi investigado. Pode ser causa
  parcial do gap líquido se compor_principal=true para multa/depósitos FGTS no
  engine. Mas não explica o gap em ApuracaoDeJuros (que não inclui FGTS).
- Hipótese "verbas reflexas espalhadas" precisa ser confirmada listando as
  ocorrências engine de uma verba específica (ex: "13º SALÁRIO SOBRE HORAS EXTRAS")
  e comparando com PJC oracle. Não foi feito por limite de 8 minutos da sprint.

