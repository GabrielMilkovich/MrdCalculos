# Baseline de Paridade — Modo Independente

**Motor:** PjeCalcEngine  
**Índices até:** Fevereiro/2026  
**Modo:** Independente (cálculo do zero, sem dados auxiliares de PJC)

## Resultado por caso (14 casos de referência)

| Caso | PJe-Calc (R$) | MRD Calc (R$) | Delta % | Status |
|---|---:|---:|---:|---|
| MARIA MADALENA | 46.426,51 | 47.473,02 | +2,25% | ✅ |
| VANDERLEI CARVALHO | 61.849,71 | 60.597,23 | −2,03% | ✅ |
| LEANDRO CASADEMUNT | 510.050,92 | 532.870,49 | +4,47% | ✅ |
| TIAGO JOSE | 320.938,56 | 339.052,57 | +5,64% | ⚠️ |
| JOSELI SILVA | 510.459,85 | 454.041,06 | −11,05% | ❌ |
| LEIDE SANTANA | 190.652,72 | 221.715,97 | +16,29% | ❌ |
| ROQUE GUERREIRO | 231.306,58 | 188.499,35 | −18,51% | ❌ |
| ANTONIO HARLEY | 39.929,92 | 32.385,06 | −18,90% | ❌ |
| IZABELA CRISTINA | 73.879,96 | 94.346,37 | +27,70% | ❌ |
| CARLA PEGO | 45.028,19 | 59.157,93 | +31,38% | ❌ |
| ISLAN RODRIGUES | 9.974,39 | 13.570,47 | +36,05% | ❌ |
| ROSICLEIA PEREIRA | 247.215,95 | 353.937,80 | +43,17% | ❌ |
| FRANCISCO PABLO | 166.619,02 | 88.882,43 | −46,66% | ❌ |
| PYTER GABRIEL | N/A | N/A | N/A | — |

## Delta global: +3,92%

## Critério de aprovação
- Delta líquido por caso: ≤ ±5,0%
- Casos aprovados (≤±5%): 3 de 13 válidos

## Limitações conhecidas

### Juros de mora
O engine ainda não aplica juros SELIC pós-citação no regime ADC 58/59. O resultado atual reflete apenas a correção monetária IPCA-E. Para paridade completa, é necessário implementar a aplicação de juros sobre o subset correto de verbas (verbas com CS e IRPF ativos, excluindo aviso prévio e férias indenizadas).

### Data de citação
O PJe-Calc não exporta a data de citação no arquivo PJC. O engine estima a partir da data de ajuizamento quando não informada.

## Roadmap
1. Implementar juros ADC 58/59 com subset correto de verbas
2. Seed de dados de referência no Supabase (INSS, IR, índices, feriados)
3. Teste from-zero com construção manual de inputs
