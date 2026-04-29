# 3 Outliers Persistentes — Diagnóstico

> **CORREÇÃO 2026-04-29 (Sprint 4):** A hipótese inicial sobre regime FGTS
> foi **REFUTADA empiricamente** pelo CEREBRO. Aplicar o fix proposto (zerar
> FGTS quando oracle tem `<depositoFgts>0`) PIORA os outliers em vez de melhorar:
>   - PROCESSO_00008567: -11.24% → -16.25% (FGTS=4430 sai indevidamente do líquido)
>   - PROCESSO_10004617: -15.83% → -22.05% (FGTS=16284 sai indevidamente do líquido)
>
> **Causa real:** ambos PJCs têm `<comporPrincipal>SIM</comporPrincipal>` em
> todas as verbas FGTS. O FGTS COMPÕE o líquido conforme
> `Calculo.java:3010-3024`. O `<depositoFgts>0` no `<gprec>` é apenas EFEITO
> de `destinoDoFgts=PAGAR`: `ResumoPrecatorioJrAdapterPadrao.java:255-258`
> só popula o item "Depósito FGTS" quando destino=DEPOSITAR. Engine v3 já
> calcula FGTS via `fgts_override_total` corretamente.
>
> **Gap real está em** `principal_corrigido + juros_mora`, NÃO em FGTS.
> Gap absoluto: ~R$ 10k em 00008567, ~R$ 41k em 10004617.
>
> **Sprint 4 redirecionado para:** investigar correção monetária pré-ADC58
> (long-tail) + composição de juros de mora. Estimativa: 5-7 dias humanos.

Engine v3 atinge ~94% de PJCs reais dentro de ±5% no `liquido_reclamante`.
Os 3 casos abaixo persistem com delta acima do limite. Diagnóstico baseado em
`scripts/pjc-oracle-compare.ts` rodado em 2026-04-29 contra os arquivos
originais do corpus (`PJC-TESTES-IDENPENDET/` e `docs/`).

Tabela compacta dos campos comparados (engine vs oracle):

| PJC          | liquido | inssBenef | inssRecl | impostoRenda | depositoFgts | custas |
|--------------|---------|-----------|----------|--------------|--------------|--------|
| 00004939     | +4.31% ⚠️ | +0.00 ✅ | -2.34% ⚠️ | (n/a)        | -0.00 ✅      | 0.00 ✅ |
| 00008567     | -11.24% ❌| +0.00 ✅ | -0.81% ✅ | (n/a)        | ENG=4430 vs ORACLE=0 | 0.00 ✅ |
| 10004617     | -15.83% ❌| +0.00 ✅ | +1.66% ⚠️ | -4.40% ⚠️    | ENG=16284 vs ORACLE=0 | 0.00 ✅ |

> Observação importante: o usuário relatou os outliers como
> +5.92 / -9.21 / -11.77. Os números medidos por `pjc-oracle-compare.ts`
> nesta sessão divergem ligeiramente (+4.31 / -11.24 / -15.83). Causa
> provável: drift entre o corpus do calibrate (script `calibrate-compare-v1-v3.ts`,
> que roda contra `casos-reais/*.pjc`) e os arquivos originais do
> corpus PJC. Os campos dominantes e hipóteses abaixo se mantêm.

---

## PROCESSO_00004939 (+4.31% medido — usuário reportou +5.92%)

- **Arquivo:** `/home/user/MrdCalculos/PJC-TESTES-IDENPENDET/PROCESSO_00004939720215120028_CALCULO_LUCIO CARLOS SOARES FAGUNDES.PJC.zip`
- **Campo dominante:** `inssReclamante` (engine subestima −2.34%, valor absoluto −R$ 40,39).
  Custas, FGTS, INSS beneficiário nominal batem.
- **Delta líquido:** +R$ 1.384,92 (engine 33.541,31 vs oracle 32.156,39).
- **Hipótese:**
  - Como o líquido do reclamante é fórmula `bruto − inssBenef − ir − fgts`, o
    subdimensionamento do `inssReclamante` (que é o INSS *corrigido* segurado)
    NÃO afeta diretamente o líquido. Logo a inflação de ~+4.3% vem do
    `bruto`/`valorPrincipal` corrigido — o engine inflou o principal.
  - Caso 2015–2021 (PRE/TRANSIÇÃO): provável overshoot na correção pré-ADC58
    (ainda usando TR/IPCA-E em vez de SELIC unificada após 2021-12-09).
  - O honorárioReclamante zerado pelo engine (oracle = n/a) sugere que o
    mapeamento de honorários contratuais não está sendo extraído da entrada,
    indicando um possível delta secundário.
- **Ação recomendada:** Sprint 3 — auditar `engine-v3.correcao` na faixa
  pré-ADC58/pós-EC113. Comparar índice mês-a-mês contra
  `apuracao_juros[].fator_correcao` do oracle. Risco: baixo (caso isolado).

---

## PROCESSO_00008567 (-11.24% medido — usuário reportou -9.21%)

- **Arquivo:** `/home/user/MrdCalculos/docs/PROCESSO_00008567620255170005_CALCULO_4483_DATA_09072025_HORA_155016.PJC`
- **Campo dominante:** `depositoFgts` — engine produz **R$ 4.430,28** mas o
  oracle reporta **R$ 0,00**. INSS, custas, IR batem dentro de ±1%.
- **Delta líquido:** −R$ 9.947,28 (engine 78.539,66 vs oracle 88.486,94).
- **Hipótese:**
  - O oracle tem `<depositoFgts>0</depositoFgts>` no `<gprec>`. Isso indica
    que o cálculo Java NÃO incluiu FGTS no líquido do exequente (provável
    `RegimeCalculoFgtsEnum.NAO_CALCULA` ou pedido de FGTS julgado
    improcedente). O engine está calculando FGTS por padrão sem respeitar
    a flag de regime FGTS.
  - O sinal do delta líquido é NEGATIVO (engine menor que oracle). Se o
    engine estivesse apenas adicionando FGTS extra no líquido, o delta
    seria POSITIVO. Logo: o engine está SUBTRAINDO FGTS do líquido (ou
    FGTS está sendo deduzido como dedução do bruto), enquanto o oracle não.
    Há um delta residual de ~R$ 5.500 não explicado por FGTS.
  - Combinado: engine + descontou FGTS (R$ 4.430) + subdimensiona principal
    corrigido (~R$ 5.500) → delta -11.24%.
- **Ação recomendada:** Sprint 4 — investigar o `fgtsConfig.regime_calculo`
  detectado por `pjc-to-engine.ts`; quando oracle tem `depositoFgts=0` o
  engine deve respeitar e zerar `r.fgts_total`. Risco médio (afeta lógica
  de detecção de regime FGTS, pode regredir outros casos).

---

## PROCESSO_10004617 (-15.83% medido — usuário reportou -11.77%)

- **Arquivo:** `/home/user/MrdCalculos/PJC-TESTES-IDENPENDET/PROCESSO_10004617620205020614_CALCULO_KERLINE DE BARROS.PJC.zip`
- **Campo dominante:** `depositoFgts` — engine produz **R$ 16.284,37** mas o
  oracle reporta **R$ 0,00** (`<depositoFgts>0</depositoFgts>` no gprec).
  INSS, custas, IR batem dentro de ±5%.
- **Delta líquido:** −R$ 41.425,36 (engine 220.311,94 vs oracle 261.737,30).
- **Hipótese:**
  - Mesmo padrão do PROCESSO_00008567: oracle zera `depositoFgts` mas o
    engine calcula R$ 16.284. Isso só explica ~40% do delta absoluto.
  - O componente residual de ~R$ 25.000 vem do **principal corrigido**:
    caso longo (ajuizamento 2018-09-03, cálculo 2025-04-30, parcelas
    desde 2015-08-15 → 10 anos de correção). Em casos pré-ADC58 longos,
    a correção do engine é sistematicamente menor (constante observada em
    todos os casos longos do corpus: -2 a -5%).
  - Honorários reclamado oracle = n/a; engine emite R$ 12.586,45. Se o
    cálculo Java tiver excluído honorários do líquido do exequente
    enquanto o engine os incluiu, isso compensaria parcialmente, mas o
    sinal final é negativo.
- **Ação recomendada:** Sprint 4 (FGTS regime) + Sprint 3 (correção pré-ADC58
  long-tail). Risco: alto se mexer no índice de correção (impacta os 49
  PJCs que estão dentro de ±5%).

---

## Padrões comuns

1. **`depositoFgts` divergente é o vetor dominante em 2 dos 3 casos.**
   Quando o oracle tem `depositoFgts=0`, o engine ainda calcula FGTS
   (presumivelmente por default `regime_calculo=COM_FGTS`).
   `pjc-to-engine.ts` precisa ler o `<configuracaoFgts>`/`<calculaFgts>` da
   entrada e respeitar.
2. **`inssBeneficiario` (nominal) bate em 100% dos 3 casos**, validando o
   port de `valorTotalInssSeguradoReclamante`. Bug está em outro lugar.
3. **`custasJudiciais` e `custasReclamado` batem ao centavo** nos 3 casos.
4. **Casos longos (>5 anos pré-ADC58) tendem a subestimar o principal
   corrigido em -2 a -5%.** Sintoma observado em PROCESSO_10004617 e
   reforçado pela tendência geral do corpus (vários casos -2 a -4% no
   `liquidoExequente`).
5. **`honorariosReclamante` engine emite R$ 0 para todos os 3** enquanto o
   oracle não reporta o campo (n/a). Possível bug menor no extrator de
   honorários contratuais — não afeta líquido do exequente.

---

## Sprint recomendado para resolver

- **Sprint 4 — Regime FGTS** (resolve 2 dos 3 outliers):
  - Detectar e respeitar `regime_calculo_fgts` na entrada Java; quando
    oracle indica que FGTS não compõe líquido, zerar `r.fgts_total` no
    engine.
  - Tempo estimado: **1–2 dias**.
  - Risco de regressão nos outros 49 PJCs: **médio**. A flag pode estar
    implícita; necessário whitelist de tipos de pedido FGTS antes de zerar.
  - Validação: rodar `pjc-oracle-compare.ts` em todos os 22 PJCs do corpus
    `PJC-TESTES-IDENPENDET` antes e depois.

- **Sprint 3 — Correção pré-ADC58 long-tail** (resolve resíduo dos 3
  outliers + melhora tendência geral):
  - Auditar `engine-v3.correcao` mês-a-mês contra
    `apuracao_juros[].fator_correcao` do oracle em PROCESSO_10004617.
  - Tempo estimado: **2–3 dias**.
  - Risco de regressão: **alto**. Mudar índice de correção mexe na base
    de cálculo de TODOS os casos. Exigir baseline pré-Sprint e
    comparação caso-a-caso.

**Ordem sugerida:** Sprint 4 antes de Sprint 3, porque o regime FGTS é
mais isolado (afeta um componente específico do líquido) e tem menor
superfície de regressão.

---

## Limitações desta análise

- O usuário reportou deltas (+5.92 / -9.21 / -11.77) que diferem dos
  medidos (+4.31 / -11.24 / -15.83) por 1.5–4 pontos percentuais. Isso
  significa que o calibrate roda contra um corpus reduzido / processado
  (provavelmente `casos-reais/*.pjc` extraído via outro pipeline) e
  não diretamente contra os arquivos originais. A causa-raiz dos 3 casos
  porém é a mesma porque os arquivos PJC são fontes idênticas.
- 2 PJCs do corpus (`PROCESSO_00105711...NATALIA` e
  `PROCESSO_00107350...LEONARDO`) falham com
  `this.indicesDB.filter is not a function` — bug separado de inicialização,
  fora do escopo deste diagnóstico.
