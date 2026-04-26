# FASE 0 — D1 fix: INSS empregador (Bug 1 + Bug 2)

> **Caso âncora:** antonio-harley
> **Data:** 2026-04-26
> **Resultado:** cs_empregador 3 924,92 → 6 306,52 (gap −38,05% → −0,47%)

## 1. Diagnóstico

PJC do antonio: `inssReclamado = 6 336,11`, engine: `cs_empregador = 3 924,92`.
Gap **−38,05%** (R$ 2 411).

**Decomposição numérica:**

| Etapa                                          | Valor       | Componente bug |
|------------------------------------------------|------------:|----------------|
| Engine atual: 20% × base nominal               | 3 924,92    | partida        |
| + SAT 2% × base nominal                        | + 392,49    | **Bug 1**      |
| × (1 + juros médio ~46,7%)                     | × 1,46      | **Bug 2**      |
| **= alvo PJC**                                 | **6 336,11**|                |

## 2. Causa raiz

### Bug 1 — Parser zera `aliquota_sat` quando XML não tem `<ContribuicaoSocial>`
- `pjc-analyzer.ts:745-746` busca elementos `<ContribuicaoSocial>`/`<contribuicaoSocial>`
- Antonio (e a maioria dos PJCs) não têm esses elements, mas têm
  `<aliquotaSAT>2.0000</aliquotaSAT>` em CADA `<OcorrenciaDeInssSobreSalariosDevidos>`
- Fallback antigo (linha 776): `aliquota_sat: 0` → engine usa SAT=0%
- **Consequência no front-end:** usuário vê checkbox "SAT/RAT" marcado e
  alíquota 2% no input, mas o engine calcula como se estivesse 0%

### Bug 2 — Engine não aplica correção+juros+multa sobre `cs_empregador`
- `engine-v3.ts:632`: `csEmpregador = inssAdapter.totalEmpregador` (NOMINAL puro)
- Para `cs_segurado`, o engine APLICA `(1 + pctJuros/100)` por competência
  (linhas 612-629). Para empregador, NÃO aplicava
- Java aplica fórmula equivalente — confirmado lendo `<OcorrenciaDeInssSobreSalariosDevidos>`
  com `taxaDeJuros=46-49%` e somando `(empresa+sat+terc) × (1+taxaJuros/100)`
  = 6 336,27 ≈ PJC 6 336,11 (R$ 0,16)

## 3. Fix aplicado

### Bug 1 — `src/lib/pjecalc/pjc-analyzer.ts`
- Adicionado bloco que **lê alíquotas de `<OcorrenciaDeInssSobreSalariosDevidos>`**
  da primeira ocorrência com `valorBaseVerbas` preenchido
- Sobrescreve `aliquota_empresa`, `aliquota_sat`, `aliquota_terceiros`
- Define `apurar_empresa/sat/terceiros = (aliquota > 0)`
- **NÃO sobrescreve `aliquota_segurado`** (na ocorrência ela é a alíquota
  da FAIXA daquela competência, não global fixa — sobrescrever quebraria
  o cálculo progressivo)

### Bug 2 — `src/lib/pjecalc/engine-v3.ts:632`
- Substituído `csEmpregador = inssAdapter.totalEmpregador` por loop
  ocorrência-a-ocorrência aplicando `(1 + pctJuros/100)`
- Reusa `taxasJurosFromPJC` / `tabelaSelicInss` / `pctJurosCombinado` —
  exatamente a mesma lógica que já é aplicada ao `cs_segurado`

### Adapter — `src/lib/pjecalc/pjc-to-engine.ts:770-772`
- Mudado para respeitar `csConf?.apurar_sat ?? <fallback>` em vez de
  forçar `true` quando há empregador ativo

## 4. Resultado validado

| Item             | Antes do fix | Depois do fix | PJC      | Δ       |
|------------------|-------------:|--------------:|---------:|--------:|
| cs_empregador    | 3 924,92     | **6 306,52**  | 6 336,11 | -0,47%  |
| cs_segurado      | 2 394,34     | 2 394,34      | 2 405,58 | -0,47%  |
| total_reclamada  | 40 013,94    | 40 013,94     | 39 929,92| +0,21%  |

O gap residual de -0,47% é o mesmo do segurado e indica que a correção
monetária aplicada SOBRE o INSS é ligeiramente diferente entre engine e
Java — gap estrutural compartilhado entre as duas pernas, fora de escopo
deste fix.

## 5. Comportamento marcar/desmarcar das chaves INSS (front-end)

Componente: `src/components/cases/pjecalc/ModuloCS.tsx`

### Checkbox **"Empresa"** (default ✓, alíquota 20%)
- **MARCADO**: engine calcula `empresa_inss = aliquota_empresa × base × (1+juros)`
  e soma a `cs_empregador`
- **DESMARCADO**: engine zera essa parcela (`empresa: 0`); cs_empregador
  passa a refletir apenas SAT + Terceiros (se marcados). Útil quando
  empregador é Simples Nacional ou empresa imune

### Checkbox **"SAT/RAT"** (default ✓, alíquota 2%)
- **MARCADO**: engine calcula `sat = aliquota_sat × base × (1+juros)`
  e soma a `cs_empregador`. Alíquota varia por CNAE (1% leve / 2% médio
  / 3% grave). Agora respeita o valor extraído do PJC ou customizado.
- **DESMARCADO**: zera a parcela SAT. Usar quando empregador não tem
  obrigação de RAT (ex: alguns empregadores domésticos)

### Checkbox **"Terceiros"** (default ✓, alíquota 5,8%)
- **MARCADO**: engine calcula `terceiros = aliquota_terceiros × base × (1+juros)`.
  Default 5,8% = soma SESC+SENAC+SEBRAE+INCRA+Salário-Educação para varejo
- **DESMARCADO**: zera. **Padrão pelos PJCs analisados:** Java persiste
  `<aliquotaTerceiros>null</aliquotaTerceiros>` quando empregador NÃO tem
  contribuição a terceiros (algumas categorias específicas) — nesse caso o
  parser agora desmarca automaticamente

### Botão **CNAE auto-fill**
- Aplica `sat_rat` e `terceiros` baseado no CNAE escolhido (tabela de
  CNAEs no projeto)

### Cobrar do Reclamante (`cobrar_reclamante`)
- **MARCADO**: dedução do INSS segurado do líquido do reclamante
  (`csReclamante = csSegurado` na engine-v3.ts:633)
- **DESMARCADO**: empregador paga TODA a contribuição (não desconta do
  reclamante) — `csReclamante = 0`. Líquido do reclamante fica maior

## 6. Cobertura por outros PJCs

Verificado em outros 3 cases (joseli, rosicleia, antonio) que `<aliquotaSAT>2.0000</aliquotaSAT>`
e `<aliquotaTerceiros>null</aliquotaTerceiros>` aparecem nas ocorrências.
tiago e carla não têm essas tags (PJCs sem recálculo final), então o
parser cai no fallback existente — nenhuma regressão.

## 7. Suite + calibrate

- Suite Vitest: **1035 passing** (sem regressão)
- Calibrate v3: idêntico (gap de `total_reclamada` não muda — empregador é
  obrigação da empresa, não vai pro líquido do reclamante)
- tsc: limpo

## 8. Próximos passos (FASE 0 continuação)

- D2 — honorários sucumbenciais −8,65% (hipótese: Java usa base = LE+INSS_recl).
  Já matematicamente desvendado (15% × 41 569,20 = 6 235,38). Próximo investigar
  fórmula exata Java.
- D3 — cs_segurado/cs_empregador residual −0,47% (correção monetária).
- D4 — principal_corrigido +0,30% (arredondamento composto).
