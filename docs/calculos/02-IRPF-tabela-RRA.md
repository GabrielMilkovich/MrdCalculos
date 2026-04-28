# 02 — IRPF (Imposto de Renda Pessoa Física)

## O que é

Retenção de imposto de renda na fonte sobre o crédito trabalhista do
reclamante. Em liquidação dois regimes coexistem:

- **Regime tradicional (Lei 7.713/1988):** tabela progressiva mensal aplicada
  sobre a soma do principal corrigido líquido de deduções.
- **Regime RRA — Rendimentos Recebidos Acumuladamente (Lei 7.713/88, art.
  12-A, incluído pela Lei 12.350/2010):** o imposto é calculado dividindo o
  total tributável pelo número de meses (NM) a que se refere e aplicando a
  tabela vigente no momento do pagamento, multiplicando o resultado pelo NM.

## Fórmula

### Regime tradicional (mensal)
```
base = principal_tributável + 13°/férias - dependentes×R$189,59 - INSS
       - pensão alimentícia - prev. privada - honorários (se dedutíveis)
IR = max(0, base × alíquota_faixa - parcela_dedutível)
```

### Regime RRA — Art. 12-A
```
NM = número de meses cobertos pela ação trabalhista
base_mensal = (rendimento_acumulado - deduções_proporcionais) / NM
IR_mensal = base_mensal × alíquota_RRA - parcela_dedutível_RRA
IR_total = IR_mensal × NM
```
A tabela RRA tem faixas próprias (mais largas) e parcelas dedutíveis
proporcionais ao NM.

### Tributação exclusiva 13° (em separado)
13º salário: tabela progressiva aplicada isoladamente (sem somar a outros
rendimentos). Férias indenizadas: idem (Súm.STJ 386 — isentas; férias gozadas:
tributadas em separado se flag `tributacao_separada_ferias=true`).

## Lei / súmula referência

- **Lei 7.713/1988** — institui IRPF e tabela mensal
- **Lei 7.713/1988, art. 12-A** (incluído pela Lei 12.350/2010) — RRA
- **IN RFB 1.500/2014, arts. 36-39** — regulamenta RRA
- **Súmula 386 STJ** — férias indenizadas e adicional 1/3: isentas
- **Solução de Consulta COSIT 31/2014** — juros de mora trabalhistas: isentos
- **Lei 8.541/1992, art. 46** — retenção na fonte por sentença judicial
- **OJ 400 SDI-1 TST** — juros de mora não compõem base de IR

## Flags UI que controlam (módulo `ModuloIR`)

| Flag | Status | Efeito |
|---|---|---|
| `apurar` | Conectada | Liga/desliga IR no resultado |
| `tributacao_exclusiva_13` | Conectada | 13° tributado isoladamente |
| `tributacao_separada_ferias` | Conectada | Férias gozadas tributadas em separado |
| `dependentes` | Conectada | Aplica dedução R$189,59/dep/mês |
| `aposentado_65` | Conectada | Isenção R$1.903,98/m (Lei 7.713/88 art.6º XV) |
| `deduzir_cs` | Conectada | Deduz INSS segurado da base |
| `deduzir_pensao` | Conectada | Deduz pensão alimentícia |
| `deduzir_prev_privada` | Conectada | Deduz prev. complementar (limite 12% renda) |
| `deduzir_honorarios` | Conectada | Deduz honorários contratuais (Lei 9.250/95) |
| `apurar_rra` | Conectada (Sprint 4.2-A1) | Ativa regime Art. 12-A RRA |
| `aplicar_regime_caixa` | Conectada (Sprint 4.2-A1) | IR no recebimento (regime caixa) |
| `incidir_sobre_principal_tributavel` | Conectada (Sprint 4.2-A1) | Inclui principal tributável na base |
| `incidir_sobre_principal_nao_tributavel` | Conectada (Sprint 4.2-A1) | Tributa parcelas indenizatórias (raro) |
| `incidir_sobre_juros` | Em estudo | Tributação juros mora (vs OJ 400 TST) |
| `cobrar_reclamado` | Em estudo | IR cobrado da reclamada (vs reclamante) |

## Como o engine implementa

- `/home/user/MrdCalculos/src/lib/pjecalc/modulos/irpf-modulo-adapter.ts:67-280` —
  bridge UI → core, incluindo `apurar_rra` (linhas 122-195)
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/calculo/irpf/irpf.ts` —
  porte da `Irpf.java`
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/irpf/tabela-irpf.ts` —
  tabela progressiva por competência (1996-2025)
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/irpf/faixas/faixa-fiscal.ts` —
  faixas RRA + tradicional

## Casos especiais

1. **Juros de mora trabalhistas:** isentos por SC COSIT 31/2014 + OJ 400 SDI-1
   TST. Engine **NÃO** tributa juros por padrão (`incidir_sobre_juros=false`).
2. **Férias indenizadas:** isentas (Súm.STJ 386). Férias gozadas tributadas no
   recebimento (regime competência) ou em separado se flag ativa.
3. **Aposentados ≥ 65 anos:** dedução adicional R$1.903,98/m (Lei 7.713/88 art.
   6º XV) — flag `aposentado_65`.
4. **RRA — número de meses (NM):** o sistema infere NM da diferença entre
   `data_inicial` e `data_final` do contrato em meses, ou aceita override do
   campo `numero_meses_rra` da UI. NM ≥ 1.
5. **Honorários contratuais:** dedutíveis até 20% do crédito (Lei 9.250/95
   art.8º II "g"). Honorários sucumbenciais: não dedutíveis (renda do advogado).
6. **Compensação INSS retido na fonte:** o INSS segurado deduzido da base
   já reduz o IR retido — não há dupla compensação.
