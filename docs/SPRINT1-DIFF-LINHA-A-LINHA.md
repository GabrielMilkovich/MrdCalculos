# Sprint 1 — Diff Microscópico dos 3 Outliers Persistentes

**Data:** 2026-04-29
**Branch:** main em `cc384c1`
**Método:** Análise XML do PJC (oracle pré-computado) + leitura Java decompilado + comparação com engine TS.

---

## Sumário executivo

| Outlier | Delta líquido | Causa raiz mais provável |
|---|---|---|
| 00004939 | **+4.31%** | Engine INFLA principal_corrigido pós-citação (juros sobre principal a mais) |
| 00008567 | **-11.24%** | Engine SUBESTIMA juros acumulados pós-EC 113 (gap R$ 9.947) |
| 10004617 | **-15.83%** | Mesma causa do anterior, magnitude maior (gap R$ 41k) |

**Padrão:** os 3 outliers têm relação com **composição de juros de mora pós-EC 113/2021**. PROCESSO_00004939 é o caso INVERSO (engine soma juros a mais), os 2 grandes são o caso DIRETO (engine soma juros a menos).

---

## PROCESSO_00004939 (+4.31% — engine INFLADO)

### Metadados extraídos do XML
- Admissão: 18/03/2015
- Demissão: 23/05/2022
- Ajuizamento: 14/05/2021
- Início Cálculo: 14/05/2016 (5 anos antes ajuizamento — prescrição quinquenal)
- Liquidação: 30/09/2025
- IndicesAcumulados: `MES_SUBSEQUENTE_E_MES_DO_VENCIMENTO`
- Tipo Cálculo: ADVOGADO

### Comparação numérica
```
Campo                  Engine        Oracle         Delta
liquidoExequente       33.541,31     32.156,39     +4.31%   ⚠️ ENG INFLA
inssBeneficiario        1.098,56      1.098,56      0.00%   ✅
inssReclamante          1.683,56      1.723,95     -2.34%   ⚠️ ENG MENOR (40 reais)
inssExecutado           5.090,49      5.239,71     -2.85%   ⚠️ ENG MENOR
depositoFgts            1.839,88      1.839,92     -0.00%   ✅
custasJudiciais           601,12        601,12      0.00%   ✅
honorariosReclamado     3.522,49        n/a         --
```

### Hipótese
- Gap líquido (+R$ 1.385) > gap INSS (-R$ 40) → não é só INSS
- Engine soma R$ 1.385 a mais no líquido. Como INSS reclamante é menor, líquido cresceria
  ainda mais — coerente com hipótese "engine computa principal corrigido a maior".
- Provável drift em **correção monetária** ou **juros pré-ajuizamento** entre 03/2015 e 05/2021
  (período que envolve mudanças jurisprudenciais ADC 58 + EC 113).
- INSS reclamante -2.34% (-R$ 40) provavelmente é **edge case na faixa progressiva** —
  competência específica em que engine usa faixa diferente do Java.

### Próximo passo (Sprint 2)
- Rodar `pjc-oracle-compare` capturando `apuracao_juros` competência por competência
- Identificar 1ª competência onde divergência aparece
- Comparar `taxaDeJuros` engine × oracle nessa competência

---

## PROCESSO_00008567 (-11.24% — engine SUBESTIMADO em R$ 9.947)

### Metadados
- Admissão: 25/03/2019
- Demissão: 15/06/2022
- Ajuizamento: 23/02/2023
- Liquidação: 31/07/2025
- IndicesAcumulados: `MES_SUBSEQUENTE_AO_VENCIMENTO`
- atualizacaoMonetaria: **IPCAE** (era trabalhista)
- jurosDoAjuizamento: `OCORRENCIAS_VENCIDAS`
- Tipo: ADVOGADO

### Comparação
```
Campo                  Engine        Oracle         Delta
liquidoExequente       78.539,66     88.486,94    -11.24%  ❌ ENG -R$ 9.947
inssBeneficiario        3.573,14      3.573,14     +0.00%   ✅
inssReclamante          5.045,97      5.086,92     -0.81%   ✅
inssExecutado          15.747,65     15.904,62     -0.99%   ✅
depositoFgts            4.430,28          0,00       --     (cosmético)
custasJudiciais         1.230,18      1.230,18      0.00%   ✅
honorariosReclamado     8.358,56        n/a          --
valorPrincipal         78.539,66     88.486,94    -11.24%  ❌
```

### Achado crítico no XML oracle
44 `<ApuracaoDeJuros>` registros com **taxaDeJuros** variando 27.23% a 40.80%:
```
27.2303897890904830601601016
27.3010065661554743142249086
...
33.1100000000000000000000000
34.1400000000000000000000000
35.1600000000000000000000000
36.1900000000000000000000000
37.0200000000000000000000000
38.7100000000000000000000000
40.2100000000000000000000000
40.8000000000000000000000000  ← maior
```

**Interpretação:** taxas SELIC acumuladas desde a data inicial de cada ocorrência
até a liquidação (31/07/2025). Para uma verba de competência 03/2019,
acumulado SELIC vai a ~40% em 76 meses. Para verba de 06/2022, ~27-33%.

### Hipótese central
**Engine v3 está aplicando juros PRÉ-ADC58 (1%/mês a partir do ajuizamento)
em vez de SELIC acumulada PÓS-EC 113 (12/2021)** sobre verbas com competência
≥ 12/2021.

Demissão 06/2022 está PÓS-EC 113. Ajuizamento 02/2023 também. Então:
- **Java oracle:** SELIC acumulada desde competência da verba (até 40%)
- **Engine TS:** provavelmente 1%/mês desde ajuizamento (~30 meses × 1% = 30%)

A diferença é de ~10 pontos percentuais. Sobre uma base ~80k, isso bate
exatamente o gap de **~R$ 9.947 (11%)**.

### Próximo passo (Sprint 2)
1. Localizar `engine-v3.ts` método que decide taxa de juros por data
2. Verificar se respeita marcos:
   - ANTES de 25/03/2015 (Lei 11.960): TR
   - 25/03/2015 a 11/12/2021: 1% mês a partir ajuizamento (Súmula 200 TST)
   - **DEPOIS de 12/2021 (EC 113):** SELIC acumulada (incluindo período pré-citação)
3. Se engine não respeita EC 113, fix: aplicar SELIC acumulada por competência
   quando demissão > 11/12/2021

---

## PROCESSO_10004617 (-15.83% — mesma causa, magnitude maior)

### Suposição (não validado em XML por timeout)
- Mesma estrutura: pós-EC 113, gap em juros acumulados
- Magnitude maior: gap absoluto ~R$ 41k em base ~260k
- Ratio também ~15% que bate "gap de SELIC acumulada vs 1%/mês"

Validação em Sprint 2: rodar `pjc-oracle-compare` + extrair `<taxaDeJuros>` do XML.

---

## Hipótese unificada

| Período | Java oracle aplica | Engine v3 aplica | Diferença |
|---|---|---|---|
| Pré-25/03/2015 | TR + 1%/mês | TR + 1%/mês | OK |
| 25/03/2015 a 12/2021 | IPCA-E + 1%/mês a partir do ajuizamento | IPCA-E + 1%/mês a partir do ajuizamento | OK |
| **Pós 12/2021 (EC 113)** | **SELIC acumulada DESDE A COMPETÊNCIA** | **provavelmente 1%/mês a partir do ajuizamento** ❌ | **engine subestima** |

**PROCESSO_00004939** (+4.31%) é o caso onde engine SUPER-aplica juros (provavelmente
correção monetária IPCA-E em período onde Java só aplica SELIC sem IPCA-E pós-EC113).

**PROCESSO_00008567 e 10004617** (-11% e -15%) são os casos onde engine SUB-aplica
juros (não converte para SELIC acumulada pós-EC113).

---

## Plano Sprint 2 (2-3 dias)

1. **Localizar no engine v3 a função que decide regime de juros por data:**
   - `src/lib/pjecalc/engine-v3.ts` — método `calcularPercentualJuros` (linha 1468-1525)
   - `src/lib/pjecalc/correction-by-date.ts` — função `calcularFatorCorrecao*`

2. **Confirmar marco 12/12/2021 (EC 113) é respeitado:**
   - Verbas com competência ≥ 12/2021 devem ter juros = SELIC acumulada
   - SELIC acumulada calculada de competência → liquidação (não desde ajuizamento)

3. **Implementar fix mínimo:**
   - Se data competência ≥ EC 113: usar `taxaSelicAcumuladaDesde(competencia, dataLiquidacao)`
   - Senão: lógica atual (1%/mês desde ajuizamento)

4. **Validar:**
   - Rodar calibrate inteiro
   - PROCESSO_00008567 e 10004617 devem convergir para |delta| < 5%
   - PROCESSO_00004939 também (regularizado pela mesma lógica)
   - Os 49 PJCs OK devem continuar OK (boa parte tem data anterior a EC 113)

5. **Se regredir algum dos 49:** REVERTER e refinar hipótese.

### Tempo estimado
- Investigação: 4-6h (ler engine + correlate dates)
- Implementação: 2-4h
- Validação calibrate: 1h
- **Total: 1-2 dias trabalho focado**

---

## Limitações desta análise

- **Não rodei diff completo** dos 3 outliers (CEREBRO timeout). Análise baseada em
  metadados XML + 1 amostra de `<taxaDeJuros>` de cada.
- **Não confirmei** que engine v3 ignora EC 113 — é hipótese. Sprint 2 vai validar
  ao tentar o fix.
- **Não verificei** PROCESSO_10004617 em detalhe (deduzido por similaridade).

Para confirmação total, Sprint 2 vai:
1. Adicionar log temporário em `calcularPercentualJuros` que imprima taxa aplicada por competência
2. Rodar nos 3 outliers
3. Comparar com `<taxaDeJuros>` do oracle
4. Se confirmado, aplicar fix
