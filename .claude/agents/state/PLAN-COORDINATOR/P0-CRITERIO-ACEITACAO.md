# P0 — Critério de Aceitação por Componente

> **Data:** 2026-04-26
> **Objetivo:** Definir tolerância numérica para considerar cada métrica "OK"
> antes de iniciar fixes.

## Princípios

1. **Tolerância varia por componente** — INSS por competência tem cálculo
   determinístico (faixa progressiva); FGTS depende de séries de índices ao
   longo de décadas com mais ruído. Não faz sentido cobrar 0,01% em ambos.
2. **Tolerância varia por horizonte temporal** — caso curto (antonio 13m)
   tem menos acumulação de erro que caso longo (leandro 201m).
3. **Erros estruturais conhecidos** (ex: precisão de Decimal.js vs BigDecimal)
   são aceitos quando documentados.
4. **Ground-truth tem que ser confiável** — só comparamos contra PJCs
   onde `LE = PC + juros + FGTS` (não stale).

## Tolerâncias propostas

### Por competência (granular)
| Métrica | Tolerância | Justificativa |
|---------|-----------:|---------------|
| **INSS nominal por comp** (cs_normal por mês) | **±R$ 0,02** ou ±0,1% | Cálculo determinístico via faixa progressiva. Empiricamente bate em antonio. |
| **Valor corrigido por comp** | **±0,1%** | Aplicação de fator IPCA-E acumulado. Diferença vem de precisão. |
| **Juros por comp (taxa)** | **±0,01pp** | Quando comparamos `taxaDeJuros` Java vs nossa derivada. |

### Totais agregados
| Métrica | Tolerância | Justificativa |
|---------|-----------:|---------------|
| **cs_segurado (INSS recl. corrigido)** | **±0,5%** | Acumulação de correção sobre INSS. Antonio: -0,47% (limite). |
| **cs_empregador** | **±0,5%** | Mesma raiz que segurado. |
| **principal_corrigido** | **±0,5%** | Antonio: +0,30% (dentro). |
| **juros_mora** | **±2%** | Engine usa `pctJurosCombinado` (TR-Simples + SELIC); Java usa taxa unificada. Pode divergir mais até refatorar. |
| **fgts_total** | **±2%** quando port completo; **±50%** estado atual | Estado atual é simplificado; após port completo, esperar ±2%. |
| **ir_retido** | **±1%** | Tabela progressiva + RRA. Casos com IR=0 devem bater 0 exato. |
| **honorários** | **±0,5%** quando aplicado fórmula correta | Após D2 fix, deveria propagar gap de `total_reclamada`. |
| **liquidoExequente / total_reclamada** | **±0,5%** | Métrica composta — bate quando partes batem. Antonio: +0,21% (dentro). |
| **liquidoReclamante (eng) vs Java** | **±1%** | Após deduções (INSS, IR, hono). |

### Casos excepcionais
| Cenário | Tolerância | Tratamento |
|---------|-----------:|------------|
| **PJC com LE stale** (= val_principal = val_corr_total) | N/A | Marcar como "não comparável"; usar `apuracao_juros` direto como ground-truth. |
| **IR com RRA art. 12-A** (caso > 12 meses) | **±2%** | Cálculo complexo (alíquota efetiva sobre média). Mais tolerância. |
| **FGTS com `destinoDoFgts=DEPOSITAR`** | N/A se nenhum corpus | Adiar até ter caso. |
| **Casos com previdência privada > 0** | N/A se nenhum corpus | Adiar até ter caso. |

## Critério geral para considerar caso "OK"

Um caso é **fechado a 100%** quando TODOS os componentes estão dentro de
suas tolerâncias E o `liquidoExequente` (ou `total_reclamada`) bate ±0,5%
do PJC (quando este é confiável).

Um caso é **estruturalmente aceitável** quando:
- LE bate ±0,5%
- Componentes individuais podem estar fora da tolerância individual,
  mas o erro é compensado matematicamente (ex: antonio: juros -17%, FGTS +436%,
  somam para +0,21%)
- Causa documentada como dívida técnica futura

## O que NÃO é aceitável

- Engine reportar "ok" quando interno está fora (mascaramento por compensação)
- Aplicar fix sem validar empiricamente que reduz gap
- Confiar em relatório de agente sem validação pessoal
- "Trapaça" — usar valor PJC direto sem recalcular (`valor_fixo` cego)
