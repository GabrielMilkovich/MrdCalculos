# Estado dos Pipelines — atualizado pelo ORCHESTRATOR

> Última atualização: 2026-04-25 (inicialização do sistema de agentes)

## Pipelines ativos

_Nenhum ainda. ORCHESTRATOR ainda não rodou primeiro ciclo._

## Pipelines concluídos com sucesso

_Nenhum._

## Pipelines em retry/escalação

_Nenhum._

## Backlog priorizado

A ser populado por ORCHESTRATOR após primeira execução. Ranking esperado:

1. **IRPF.liquidar** — gap 93%, alto impacto, alto risco
2. **INSS.calcularValorBaseVerbas + obterAliquotaParaValor** — gap 74%, 6 PRE_ADC58 outliers
3. **Calculo.aplicarPagamento** — gap 80%, médio impacto
4. **Calculo Externo.*** — gap >90%, baixo impacto (poucos casos usam)

## Métricas de baseline (2026-04-25)

```
calibrate:v3 (corpus public/reports/, 14 PJCs):
  Total: 14 | Válidos: 13 | Erros: 1 (pyter SKIP)
  ±5%: 11/13 (85%)
  ±10%: 13/13 (100%)
  Média absoluta: -2,49%

vitest run (sem coverage):
  652 passed | 6 skipped | 48 files

vitest run --coverage (com coverage):
  ⚠️ 8 testes fail por timeout (parity-pjcs-novos-independent)

tsc --noEmit:
  ✅ exit 0

ESLint:
  ✅ 0 errors | 41 warnings
```

## Próxima ação esperada

Humano deve:
1. Ler `.claude/agents/SHARED-PRINCIPLES.md` e validar princípios
2. Ler cada agente em `.claude/agents/0X-*.md` e validar
3. Se OK, invocar **ORCHESTRATOR** para iniciar primeiro ciclo

Comando para iniciar (em sessão Claude Code futura):
```
> Use o agente orchestrator para começar o ciclo de porte do PJe-Calc.
> Comece pelo módulo de maior gap. Reporte plano antes de executar.
```
