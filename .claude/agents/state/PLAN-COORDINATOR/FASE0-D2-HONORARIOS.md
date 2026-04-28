# FASE 0 — D2 fix: Honorários sucumbenciais (base/percentual)

> **Caso âncora:** antonio-harley
> **Data:** 2026-04-26
> **Resultado:** honorários sucumb. 5 695,72 → 6 247,99 (gap −8,65% → +0,20%)

## 1. Diagnóstico

Antonio-harley:
- PJC honorário = 6 235,38
- Engine antigo = 5 695,72 (-8,65%)
- Aritmética: 6 235,38 = **15% × 41 569,20**
- Decomposição de 41 569,20:
  - liquidoExequente PJC = 39 929,92
  - INSS-segurado nominal = 1 639,28
  - IR = 0
  - **41 569,20 = LE + INSS_seg + IR**

## 2. Causa raiz

### Bug no engine (`engine-v3.ts:676`)
```ts
const baseHonorarios = principalCorrigido + jurosMora;  // ❌ falta FGTS, ignora base_sucumbenciais
```

Engine antigo sempre usava `principal_corrigido + juros` ignorando:
1. **FGTS** (entra no BRUTO Java quando `compor_principal=true`)
2. **INSS-segurado nominal** (LE Java é POS-INSS; BRUTO é PRÉ-INSS)
3. **`base_sucumbenciais` config** (BRUTO/BC/BCP) — sempre usava o equivalente a BC

### Bug no parser (`pjc-analyzer.ts:463`)
- Lia somente `<honorario>` aninhado em `<honorariosReclamado>` (versão antiga do XML)
- **NÃO lia `<Honorario>` top-level** (versão atual) que tem campos ricos:
  - `<aliquota>` — percentual aplicado
  - `<baseParaApuracao>` — BRUTO / BC / BCP
  - `<baseHonorario>` — base monetária exata (ground-truth do Java)
  - `<tipoValor>` — CALCULADO ou INFORMADO
  - `<tipoDeDevedor>` — RECLAMADO ou RECLAMANTE

### Bug no adapter (`pjc-to-engine.ts:963`)
- `buildHonorariosConfig` populava só `valor_fixo` cego
- **NÃO criava `items[]`** com percentual/base/devedor por honorário
- Engine então usava sempre 15% × base default

## 3. Fórmula Java confirmada

`MaquinaDeCalculoDeHonorarios.java:60-85`:
```java
case BRUTO:
    bruto = calculo.calcularBrutoDevidoAoReclamante();  // PC_corrigido + juros + FGTS + multas
    break;
case BRUTO_MENOS_CONTRIBUICAO_SOCIAL:
    descontoCS = INSS_segurado_nominal_reclamante;
    bruto = calcularBrutoDevidoAoReclamante();
    break;
case BRUTO_MENOS_CS_MENOS_PP:
    descontoPP = previdenciaPrivada;
    descontoCS = INSS_segurado_nominal_reclamante;
    bruto = calcularBrutoDevidoAoReclamante();
    break;

baseHonorario = bruto - descontoCS - descontoPP;
valor = baseHonorario × percentual;
```

E `calcularBrutoDevidoAoReclamante` em `Calculo.java:2511`:
- = totalCorrigidoApuracaoJuros + totalJurosApuracaoJuros + FGTS + salFamilia + segDes + multas
- Java grava esse valor exato em `<Honorario><baseHonorario>` no XML (descoberto)

## 4. Fix aplicado

### Parser — `pjc-analyzer.ts`
- Estendido tipo `honorarios[]` com `aliquota`, `base_para_apuracao`, `base_honorario`, `tipo_valor`, `tipo_honorario`, `tipo_devedor`
- Lê primeiro `<Honorario>` top-level (versão atual); fallback para `<honorario>` aninhado (versão antiga)

### Adapter — `pjc-to-engine.ts:buildHonorariosConfig`
- Constrói `items[]` mapeando:
  - `tipoDeDevedor: RECLAMADO` → `devedor: 'reclamado'`
  - `tipoDeDevedor: RECLAMANTE` → `devedor: 'reclamante'`
  - `baseParaApuracao: BRUTO` → `base: 'condenacao'`
  - `BRUTO_MENOS_CONTRIBUICAO_SOCIAL` → `'bruto_menos_cs'`
  - `BRUTO_MENOS_CS_MENOS_PP` → `'bruto_menos_cs_menos_pp'`
  - `tipoValor: CALCULADO` → `tipo: 'percentual'` (engine recalcula)
  - `tipoValor: INFORMADO` → `tipo: 'valor_fixo'` (engine usa direto)

### Engine — `engine-v3.ts:676`
- Calcula `brutoSemInss = principalCorrigido + jurosMora + fgtsNoLiquido`
- Soma `inssSegNominalReclamante` quando `apurar_segurado && cobrar_reclamante`
- `brutoDevidoReclamante = brutoSemInss + inssSegNominalReclamante`
- Aplica `resolverBaseHonorario(base)` — desconta INSS/PP conforme base
- Cada item do `items[]` resolve sua própria base individualmente

### Tipos — `engine-types.ts:633-654`
- `PjeHonorarioBase` agora cobre 'condenacao'/'causa'/'proveito' (legado UI) +
  'bruto_menos_cs'/'bruto_menos_cs_menos_pp'/'verbas_nao_principal' (paridade Java)

## 5. Resultado validado

| Caso              | PJC hono   | ENG antigo | ENG novo  | Δ%       | Comentário |
|-------------------|-----------:|-----------:|----------:|---------:|------------|
| antonio-harley    |  6 235,38  |  5 695,72  | 6 247,99  |  +0,20%  | Bate (gap residual = total_reclamada) |
| carla-pego        |  4 733,74  |  3 854,53  | 4 782,84  |  +1,04%  | Bate |
| caso-real-v2      |  4 853,99  |  3 947,55  | 4 903,88  |  +1,03%  | Bate |
| izabela-cristina  | 12 784,13  | 10 405,72  |13 108,82  |  +2,54%  | Bate |
| joseli-silva      | 88 162,37  | 71 729,12  |86 901,78  |  −1,43%  | Reflete gap LE |
| leandro-casademunt| 60 020,06  | 48 826,38  |59 534,77  |  −0,81%  | Bate |
| roque-guerreiro   | 24 445,72  | 19 871,10  |24 080,81  |  −1,49%  | Bate |
| vanderlei         |  6 400,39  |  5 207,84  | 6 372,23  |  −0,44%  | Bate |
| francisco-pablo   | 17 710,43  | 14 405,75  |18 841,16  |  +6,38%  | Reflete overshoot LE |
| tiago-jose        | 18 743,27  | 15 246,82  |20 384,12  |  +8,75%  | Reflete overshoot LE (+19%) |
| islan-rodrigues   |  1 045,49  |    850,21  | 1 081,42  |  +3,44%  | Reflete overshoot LE |
| leide-santana     | 21 127,87  | 17 188,74  |22 207,78  |  +5,11%  | Reflete overshoot LE |
| rosicleia         | 26 886,93  | 21 869,55  |28 334,23  |  +5,38%  | Reflete overshoot LE |

**O gap dos honorários agora é DERIVADO do gap de `total_reclamada`** —
quando bate (vanderlei, antonio, joseli), bate; quando o engine sobreestima
LE (tiago, francisco), o erro se propaga proporcionalmente. Comportamento
honesto e esperado.

## 6. Comportamento marcar/desmarcar das chaves Honorários (front-end)

Componente: `src/components/cases/pjecalc/ModuloHonorarios.tsx`

### Adicionar Item (Sucumbência ou Contratual)
- **Devedor: Reclamado** → SOMA aos sucumbenciais, vai para o reclamante
  como crédito separado (não deduz do líquido). Aparece em
  `honorarios_sucumbenciais` no resumo
- **Devedor: Reclamante** → SOMA aos contratuais, **DEDUZ** do líquido do
  reclamante. Aparece em `honorarios_contratuais` no resumo

### Tipo: Percentual vs Valor Fixo
- **Percentual**: engine aplica `% × base` (recalcula a cada liquidação)
- **Valor Fixo**: engine usa o valor literal (não recalcula). Útil quando
  o juiz fixou um valor monetário absoluto

### Apurar Imposto de Renda (`apurar_ir`)
- **MARCADO**: aplica IRPF sobre o honorário (deduz do valor que vai ao advogado)
- **DESMARCADO**: honorário pago integralmente sem retenção

### Base (selecionável quando UI estiver completa)
- **'condenacao' (BRUTO)**: PC_corrigido + juros + FGTS + INSS_seg_nominal + multas
- **'bruto_menos_cs' (BC)**: BRUTO − INSS_seg_nominal (= equivalente a líquido_exequente
  Java sem IR)
- **'bruto_menos_cs_menos_pp' (BCP)**: BC − previdência privada

> Nota: a UI atual em ModuloHonorarios.tsx só permite `'condenacao'` —
> base_sucumbenciais é fixa. Para suportar BC/BCP no front, adicionar
> `<Select>` no Modal de Edição (próximo passo de UX).

## 7. Suite + calibrate

- Suite Vitest: **1035 passing** (sem regressão)
- Calibrate v3: idêntico (honorários sucumbenciais não entram em `total_reclamada`)
- tsc: limpo

## 8. O que NÃO foi feito (sinceridade)

- **`tipoCobrancaReclamante`** (DESCONTAR_CREDITO etc.) não foi mapeado;
  PJCs analisados sempre têm RECLAMADO como devedor. Será relevante quando
  encontrarmos PJC com honorário cobrado do reclamante (raro)
- **`<verbasSelecionadas>`** para base = VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL
  ainda não implementado. Caso obscuro
- **Correção do honorário** sobre `dataVencimento → dataLiquidacao` quando
  honorário foi fixado em data anterior à liquidação. Engine atual não
  aplica essa correção — pode gerar mais 0.5-2% de gap em casos onde
  hono foi fixado em data antiga
- **IRPF sobre honorário** (`apurarIRRF`): mapeado mas não calculado pelo
  engine. Como nenhum PJC analisado tem `apurarIRRF=true`, sem prejuízo

## 9. Próximos passos (FASE 0 continuação)

- D3 — cs_segurado/cs_empregador residual −0,47% (correção monetária do INSS)
- D4 — principal_corrigido +0,30% (arredondamento composto)
- D5 — juros mora possivelmente sub-calculados (gap em tiago/francisco propaga)
