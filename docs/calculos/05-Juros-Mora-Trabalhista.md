# 05 — Juros de Mora Trabalhista (TRD + SELIC + TAXA_LEGAL)

## O que é

Os juros de mora compensam o credor pelo atraso no pagamento. Na Justiça do
Trabalho coexistem três regimes principais a depender do período e do
devedor:

- **TRD_SIMPLES (1%/m simples)** — período pré-citação para a generalidade
  dos devedores privados (CLT art. 883 + Súm.TST 200).
- **SELIC** — pós-citação (ADC 58/59 STF) e para débitos previdenciários
  (Lei 11.941/2009).
- **FAZENDA_PUBLICA** — antes de 09/12/2021: 0,5%/m (TR + 0,5% Lei 11.960/09);
  a partir da EC 113/2021: SELIC pura.
- **TAXA_LEGAL (CC art. 406)** — devedor civil; até 29/08/2024: 1%/m simples;
  a partir de 30/08/2024 (Lei 14.905/2024): SELIC menos IPCA-E.

## Fórmula

### TRD (Tabela Única JT — empírica)
```
TRD_SIMPLES_mensal = TR_mensal + 0,15%/m
```
Componente: TR (Taxa Referencial BCB) + spread fixo de 0,15%/m, alinhado à
Tabela Única da Justiça do Trabalho (cf. histórica antes da ADC 58).

### Súmula TST 200 (período trabalhista pré-citação)
```
juros_pre = principal × Σ TRD_mensal_i      (simples, mês a mês)
```

### SELIC (pós-citação — ADC 58/59)
```
juros + correção = principal × (1 + SELIC_acumulada%/100)
```
SELIC engloba juros e correção — não cumular com IPCA-E no mesmo período.

### TAXA_LEGAL pós-Lei 14.905/2024
```
TAXA_LEGAL_mensal = max(0, SELIC_mensal - IPCA-E_mensal)
juros_civil = principal × Σ TAXA_LEGAL_mensal
```
Antes de 30/08/2024: 1%/m simples (CC art. 406 antiga redação + Súm. STJ 539).

### FAZENDA_PUBLICA pré-EC 113
```
juros = principal × 0,5%/m       (caderneta poupança sem rendimento real,
                                   conforme Lei 11.960/09 modulada pelo STF)
```

## Lei / súmula referência

- **CLT, art. 883** — juros de mora 1%/m simples
- **Súmula TST 200** — juros sobre principal corrigido (e não nominal)
- **STF, ADC 58/59 (Tema 1.191)** — SELIC pós-citação na JT
- **EC 113/2021, art. 3º** — SELIC para Fazenda Pública
- **Lei 11.960/2009, art. 5º** — TR + 0,5% Fazenda (declarado inconstitucional
  na ADI 4.357/4.425 e substituído pela EC 113)
- **Lei 14.905/2024** — nova redação CC art. 406 (taxa legal = SELIC - IPCA)
- **Súmula STJ 539** — taxa legal CC art. 406 = SELIC (regra anterior)
- **Súmula Vinculante 17 STF** — não incidência durante período de graça
  do precatório

## Flags UI que controlam (módulo `ModuloCorrecao` / `ModuloJuros`)

| Flag | Status | Efeito |
|---|---|---|
| `juros_tipo` | Conectada | Seleciona regime: `simples_mensal`, `selic`, `taxa_legal`, `fazenda_publica` |
| `juros_pre_judicial` | Conectada (Sprint 4.2-A2) | Aplica TRD/TR antes da citação |
| `combinar_juros` | Conectada (Sprint 4.2-A2) | Multi-segmentos (ADC 58 transição) |
| `cs_dev_juros_prev` | Conectada | SELIC INSS (Lei 11.941/09) |
| `cs_dev_juros_trab` | Em estudo | 1%/m Súm.TST 200 sobre INSS (raríssimo) |

## Como o engine implementa

- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:1414-1500` —
  branch `juros_pre_judicial` (CC art. 406 + ADC 58)
- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:1480-1500` —
  TAXA_LEGAL pós Lei 14.905/2024
- `/home/user/MrdCalculos/src/lib/pjecalc/engine-v3.ts:1656-1720` —
  componente Súm.TST 200 (IPCA-E + 1%/m simples)
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/juros/padrao/juros-padrao.ts` —
  `JurosPadrao` (TRD + 0,15%/m)
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/juros/selicirpf/juros-selic-irpf.ts`
  e `selicinss/juros-selic-inss.ts` — SELIC por destinatário
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/juros/fazendapublica/juros-fazenda-publica.ts` —
  branch Fazenda + EC 113
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/juros/taxalegal/juros-taxa-legal.ts` —
  Lei 14.905/2024
- `/home/user/MrdCalculos/src/lib/pjecalc/core/dominio/juros/precatorios/juros-precatorio-ec-136-2025.ts` —
  precatório EC 136/2025 (futuro)

## Casos especiais

1. **Cumulação proibida (ADC 58):** SELIC engloba juros e correção. Aplicar
   IPCA-E + SELIC sobre o mesmo período é vedado e configura bis in idem.
   O engine impede isso via segmentação por data.
2. **Juros simples vs compostos:** padrão da JT é **simples**; SELIC é
   **acumulada/composta** (já no fator). Engine combina os dois corretamente.
3. **Juros e IR:** juros de mora trabalhistas são **isentos** de IR (SC COSIT
   31/2014 + OJ 400 SDI-1 TST). Flag `incidir_sobre_juros` permite override
   (em estudo — uso raro).
4. **Período graça do precatório:** entre a expedição e o prazo de pagamento
   (até 30/06 do exercício seguinte) os juros **não** incidem (Súm.Vinc. 17
   STF). Tratado pelo módulo `precatorio-rpv.ts`.
5. **Taxa SELIC negativa:** flag `ignorar_taxa_negativa` substitui por zero
   (impede regressão monetária).
6. **Combinações de juros (Sprint 4.2-A2):** flag `combinar_juros` ativa
   `combinacoes_juros[]` permitindo, por ex., TRD até 18/12/2020 e SELIC
   adiante (transição ADC 58).
