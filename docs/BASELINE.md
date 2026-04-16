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

---

## Auditoria 2026-04-15 — Aplicação das 8 causas-raiz

Documentação completa: [`AUDIT-CALC-PARITY.md`](./AUDIT-CALC-PARITY.md).

### Mudanças incondicionais (já em produção)
- **CAUSA-1/3:** SELIC simples (RFB) consolidada em todos os 5 paths via
  `getSelicSimples()`. Tabela `SELIC_MENSAL` adicionada como fallback.
- **CAUSA-5:** FGTS fallback agora usa TR mensal real + 3% a.a. composto
  (antes: assumia TR=0).
- **CAUSA-8:** documentação da limitação de precisão dos índices hardcoded.

### Mudanças opt-in via config (precisam ser ativadas)
- **CAUSA-2:** `correcaoConfig.selic_pro_rata_die = true` para SELIC pro rata
  die no 1° mês + 1.00% no mês de liquidação.
- **CAUSA-4:** `correcaoConfig.base_de_juros_das_verbas = 'VERBA_INSS'` para
  reduzir base de juros pelo INSS proporcional. Mapeado automaticamente do
  `.pjc` quando importado.
- **CAUSA-6:** `csConfig.com_correcao_trabalhista = true` para INSS sobre
  base monetariamente corrigida. Mapeado automaticamente do `.pjc`.
- **CAUSA-7:** `csConfig.atualizar_inss_selic = true` para SELIC sobre
  parcelas de INSS apuradas (Lei 9.430/96).

### Validação
- 340 → 347 testes passando (+7 cobrindo as novas funcionalidades).
- TypeScript estrito limpo.
- Os 9 testes do `parity-golden.test.ts` (rescisão sem justa causa)
  continuam verdes — paridade exata mantida no caso de fórmula básica.
