# Phase 2 Features — Engine Implementation Pending

> **Data:** 2026-04-27
> **Status:** UI persistida + Tipos TS + Parser + Adapter — engine NÃO consome
> **Aguarda:** PJC ground-truth para validar implementação

## Como ler este documento

Cada feature listada tem:
- **Status atual**: o que funciona (parser, adapter, UI)
- **Pendência engine**: o que o engine ainda não calcula
- **Bloqueador**: o que precisa para implementar
- **Prioridade**: ALTA (legal+frequente), MÉDIA, BAIXA

## Honorários (5 features pendentes)

### `tipo_imposto_renda` PF/PJ + `apurarIRRF` honorário
- **Status:** UI ✓ + Tipos ✓ + Parser ✓ + Adapter ✓
- **Pendência:** engine não calcula IRPF sobre honorário (PF tabela progressiva, PJ 1,5% fixo)
- **Bloqueador:** 0/47 PJCs com `apurarIRRF=true`
- **Lei:** Lei 7.713/88 + IN RFB 1.500/2014
- **Prioridade:** MÉDIA (legalmente obrigatório se honorário PJ)

### `apurar_irpf_sobre_juros`
- **Status:** UI ✓ + Tipos ✓
- **Pendência:** engine ignora — sempre incide IRPF sobre valor base, não sobre juros
- **Bloqueador:** sem ground-truth
- **Prioridade:** BAIXA

### `tipo_cobranca_reclamante` (DESCONTAR_CREDITO/COBRAR)
- **Status:** UI ✓ + Tipos ✓ + Adapter ✓
- **Pendência:** engine sempre desconta. Não suporta COBRAR (à parte)
- **Bloqueador:** 6/47 PJCs com `DESCONTAR_CREDITO`, 0/47 com `COBRAR`
- **Prioridade:** MÉDIA

### `aplicar_juros` honorário + `data_apartir_de_aplicar_juros`
- **Status:** UI ✓ + Tipos ✓
- **Pendência:** engine não aplica juros mora sobre honorário
- **Bloqueador:** 0/47 PJCs com `aplicar_juros=true`
- **Prioridade:** BAIXA

### `tipo_indice_correcao` 'outro'
- **Status:** UI ✓
- **Pendência:** engine só usa índice TRABALHISTA
- **Bloqueador:** todos os PJCs do corpus usam UTILIZAR_INDICE_TRABALHISTA
- **Prioridade:** BAIXA

## IR (5 features pendentes)

### RRA — Art. 12-A Lei 7.713/88
- **Status:** UI ✓ + Tipos (apurar_rra, rra_meses, rra_numero_parcelas) + Adapter ✓
- **Pendência:** engine usa tabela progressiva tradicional. RRA = tributa sobre média mensal
- **Bloqueador:** 0/47 PJCs com `rraMeses>0` no XML
- **Lei:** Lei 7.713/88 art. 12-A (rendimentos > 12 meses)
- **Prioridade:** ALTA potencial (impacto até -30% IR em casos longos), MAS bloqueada por ground-truth
- **Plano:** implementar quando aparecer caso real

### `regime_caixa` (vs competência)
- **Status:** UI ✓ + Tipos ✓
- **Pendência:** engine usa só competência
- **Prioridade:** MÉDIA

### `incidir_sobre_principal_tributavel` / `_nao_tributavel`
- **Status:** UI ✓ + Tipos ✓
- **Pendência:** engine não distingue verbas tributáveis/não-tributáveis
- **Prioridade:** BAIXA (caso especial)

## Pensão Alimentícia (4 features pendentes)

### `incidencia_sobre_fgts` + `incidencia_sobre_multa_fgts`
- **Status:** UI ✓ + Tipos ✓ + Adapter ✓
- **Pendência:** engine calcula pensão sobre líquido, ignora FGTS
- **Lei:** Lei 5.478/68 art. 4º (filho menor) + Súmula 277 STJ
- **Bloqueador:** 0/47 PJCs com pensão alimentícia ativa
- **Prioridade:** ALTA potencial quando aparecer caso

### `descontar_antes_ir` (Lei 9.250/95 art. 4º II)
- **Status:** UI ✓
- **Pendência:** engine não deduz pensão da base IR
- **Prioridade:** ALTA (legalmente obrigatório se ativada)

### `dependentes[]` (lista de beneficiários)
- **Status:** Tipos ✓
- **Pendência:** persistência + UI dedicada
- **Prioridade:** BAIXA

## Multa 523 CPC

### `apurar_523_cpc` no MultasConfig (dup com correcaoConfig)
- **Status:** UI ✓ + Tipos ✓
- **Pendência:** UI grava em MultasConfig mas engine usa flag legado em correcaoConfig.multa_523
- **Plano:** unificar via mapper no adapter
- **Prioridade:** MÉDIA

## Previdência Privada (2 features pendentes)

### `teto_mensal`
- **Status:** UI ✓ + Tipos ✓
- **Pendência:** engine não respeita teto contratual
- **Prioridade:** BAIXA (0/47 corpus)

### `juros` (trabalhista/pago_atraso/nenhum)
- **Status:** UI ✓ + Tipos ✓
- **Pendência:** engine usa juros trabalhista por default
- **Prioridade:** BAIXA

## Salário-Família

### `cotas_anuais[]` (override retroativo)
- **Status:** Tipos ✓
- **Pendência:** engine usa default 2025
- **Plano:** quando aparecer caso retroativo (2020-2024), implementar com tabela INSS oficial
- **Prioridade:** MÉDIA (afeta casos pré-2025 pequenos)

## Resumo

| Bucket | Features | % do corpus que ativa |
|--------|---------:|----------------------:|
| Phase 2 alta prioridade | 4 (RRA, Pensão FGTS, IRRF PJ, regime caixa) | 0% |
| Phase 2 média prioridade | 5 (tipoCobranca, multa 523, cotas anuais, etc) | 0-13% |
| Phase 2 baixa prioridade | 8 | 0% |
| **Total Phase 2** | **17** | **0% no corpus** |

**Conclusão honesta:** Phase 2 não bloqueia nenhum caso real do corpus
atual. Implementar requer PJC novo com a feature ativa para servir como
ground-truth.

## O que NÃO está em Phase 2 (engine consome)

- `limitarTeto` ✓
- FGTS via `<OcorrenciaDeFgts>` ✓
- Honorário base BRUTO/BC/BCP ✓
- Honorário `data_vencimento` (correção IPCA-E) ✓
- INSS empregador correção+juros ✓
- INSS aliquota empresa/SAT ✓
- Multa 467/477 ✓
- LC 110 10%/0,5% ✓
- Aprendiz FGTS 2% ✓
- Prev. Privada `base_calculo` + `deduzir_ir` ✓ (antes hardcoded, agora editáveis)
