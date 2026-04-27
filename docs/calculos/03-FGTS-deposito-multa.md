# 03 — FGTS (Fundo de Garantia + Multa Rescisória)

## O que é

O FGTS é o depósito mensal de 8% sobre a remuneração devida ao trabalhador,
recolhido em conta vinculada na CAIXA. Em liquidação trabalhista o sistema
calcula:

1. **Depósitos atrasados** — diferenças mensais não recolhidas, corrigidas pela
   TR (ou alternativa pós-Súm.Vinc. 58 STF) + 3% a.a. (juros do FGTS).
2. **Multa rescisória de 40%** — devida em despedida sem justa causa (CLT art.
   18 §1º + CF/88 art. 7º I).
3. **Multas LC 110/2001** — 10% (Art. 1º) e 5% (Art. 2º) sobre o saldo do FGTS,
   instituídas para recompor expurgos inflacionários (Plano Verão e Collor I).

## Fórmula

### Depósito mensal corrigido
```
Para cada competência:
  base = remuneração devida × incidência_FGTS
  depósito = base × 8%   (ou 2% para aprendiz — Lei 10.097/2000)
  fator_correção = (1 + taxa_anual)^anos
    onde taxa_anual = 3% (default) ou 4% se perdas_monetárias=true
  depósito_corrigido = depósito × fator_correção
```

### Multa 40% (CLT art. 18 §1)
```
saldo_corrigido = Σ depósito_corrigido (excluindo aviso prévio se flag ON)
multa_40 = saldo_corrigido × 40%       (multa_percentual configurável)
```
Se `excluir_aviso_multa=true`, depósitos de aviso prévio são excluídos da base
da multa (CLT art. 477 §6 + Súm.TST 305).

### Multa Art. 467 CLT (50%)
```
base_467 = Σ verbas rescisórias com compor_principal=true
multa_467 = base_467 × 50%
```
Aplicada apenas sobre verbas **incontroversas** (CLT art. 467, redação
Lei 10.272/2001).

### LC 110/2001
```
LC110_10 = saldo_corrigido × 10%   (Art. 1°)
LC110_05 = saldo_corrigido × 5%    (Art. 2°)
```

## Lei / súmula referência

- **CF/88, art. 7º, III** — FGTS como direito do trabalhador
- **Lei 8.036/1990** — Lei do FGTS (alíquota 8%, multa 40%)
- **CLT, art. 18 §1º** — multa de 40% na rescisão sem justa causa
- **CLT, art. 467** — multa de 50% sobre incontroversas (Lei 10.272/2001)
- **CLT, art. 477 §6** + **Súmula 305 TST** — aviso prévio fora da base da multa
- **LC 110/2001, arts. 1º e 2º** — contribuições sociais 10% + 5%
- **Súmula Vinculante 58 STF** — TR como índice de correção (constitucional)
- **Lei 10.097/2000** — alíquota 2% para aprendiz

## Flags UI que controlam (módulo `ModuloFGTS` — 100% conectado)

| Flag | Engine | Linha (engine-v3.ts) |
|---|---|---|
| `apurar` | Conectada | 1224 |
| `compor_principal` | Conectada | 1298 |
| `perdas_monetarias` | Conectada | 1286 |
| `multa_apurar` | Conectada | 1304-1330 |
| `multa_percentual` | Conectada | 1308 |
| `excluir_aviso_multa` | Conectada | 1310 |
| `multa_art_467` | Conectada | 1322 |
| `deduzir_saldo` | Conectada | 1334 |
| `lc110_10` | Conectada | 1342 |
| `lc110_05` | Conectada | 1346 |

## Como o engine implementa

- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:1212-1370` —
  função `calcularFGTS()` (depósitos + multa 40% + LC 110 + Art. 467)
- `/home/user/MrdCalculos/src/lib/pjecalc/expurgos-fgts.ts` — expurgos
  inflacionários históricos
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/calculo/fgts/` —
  porte do `Fgts.java`

### Override por PJC
Quando importado de `.PJC` real, o engine usa o campo
`fgts_override_total` (extraído de `<OcorrenciaDeFgts>`). Validado: gap engine
vs Java cai de média 9,38% para próximo de zero em 45/47 PJCs do corpus.

## Casos especiais

1. **Aviso prévio indenizado:** depósito de FGTS é devido (Súm.TST 305) mas
   pode ser excluído da base da multa 40% via flag `excluir_aviso_multa` (CLT
   art. 477 §6 — interpretação restritiva).
2. **Aprendiz:** alíquota 2% (Lei 10.097/2000). Configurável via campo
   `aliquota` em `fgtsConfig`.
3. **Perdas monetárias:** flag `perdas_monetarias` adiciona 1% a.a. à correção
   (compensação parcial pela não correção pelo INPC, conforme decisão STF
   ARE 709212).
4. **Saldo já depositado (`deduzir_saldo`):** quando o reclamante já levantou
   parte do FGTS via guia, o saldo é abatido do total devido para evitar
   pagamento em duplicidade.
5. **LC 110/2001:** as multas só se aplicam sobre depósitos com competência
   ANTES de 31/12/2006 (extinção tácita após esse marco — entendimento
   majoritário). UI permite override manual via flags `lc110_10` e `lc110_05`.
6. **Multa 40% em pedido de demissão / aposentadoria:** **NÃO** se aplica
   (CLT art. 487 §2 / Súm.TST 295). Engine zera quando `multa_apurar=false`.
