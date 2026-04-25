# Sistema de 7 agentes — MRD Calc → 100% paridade PJe-Calc

> **Objetivo:** porte 1:1 do PJe-Calc v2.15.1 (Java) para TypeScript com
> verificação automática contra corpus de PJCs reais. Meta primeira:
> ≤±0,01% em 100% dos 14 PJCs do corpus, depois expandir para 50.

## Visão geral

Este diretório contém a configuração de 7 agentes especializados que
trabalham em pipeline para portar código do PJe-Calc oficial. Cada
agente tem:
- Função única e bem-definida
- Princípios estritos (verdade, não mentira, escalação)
- Contratos de input/output claros
- Limites para escalação humana

## Os 7 agentes

| # | Agente | Função | Modelo | Quando usar |
|---|---|---|---|---|
| 0 | **ORCHESTRATOR** | Distribui trabalho | opus | Início de cada sessão |
| 1 | **AUDITOR** | Verifica claims vs realidade | opus | Semanal + sob demanda |
| 2 | **JAVA-ANALYST** | Lê Java, produz spec | opus | Antes de cada porte |
| 3 | **TEST-WRITER** | Gera fixtures e tests | sonnet | Após spec |
| 4 | **TS-PORTER** | Implementa em TS | opus | Após tests |
| 5 | **VALIDATOR** | Roda gates de qualidade | sonnet | Após implementação |
| 6 | **REGRESSION-GUARD** | Auto-revert em FAIL | sonnet | Quando VALIDATOR diz FAIL |

## Pipeline padrão

```
ORCHESTRATOR
    ↓
JAVA-ANALYST → TEST-WRITER → TS-PORTER → VALIDATOR
                                              ↓
                                          PASS/FAIL
                                              ↓
                                     REGRESSION-GUARD (se FAIL)
```

## Princípios compartilhados

Todos os 7 agentes seguem `SHARED-PRINCIPLES.md`. Resumo dos 10 princípios:

1. **Verdade acima de tudo** — nunca mentir para agradar
2. **Entrega, não paralisia** — sempre tentar antes de pedir ajuda
3. **Automação, mas não cega** — sempre validar antes de declarar feito
4. **Cuidado extremo com código que funciona** — não tocar fora do escopo
5. **Comunicação honesta** entre agentes — contratos JSON
6. **Escalação para humano** em decisões jurídicas/produto
7. **Observabilidade** — log de cada ação
8. **Vocabulário comum** — "implementado" ≠ "stub"
9. **Anti-padrões proibidos** — sem "provavelmente funciona"
10. **Pergunta-teste:** "Se um auditor da Receita Federal pedisse evidência, eu teria provas?"

## Como usar (a partir da próxima sessão Claude Code)

### Iniciar primeiro ciclo

```
> Use o agente orchestrator para iniciar o ciclo de porte.
> Reporte o plano (módulo escolhido + justificativa) antes de invocar
> JAVA-ANALYST. Aguarde minha aprovação.
```

### Auditoria semanal

```
> Use o agente auditor para fazer auditoria semanal completa.
> Gere relatório em docs/AUDIT-LOG.md (append-only) e identifique
> drift entre claims e realidade.
```

### Em caso de FAIL repetido (escalação)

ORCHESTRATOR vai notificar via `STATUS.md`. Você (humano) vai precisar:
1. Ler `learnings/<task_id>-attempt-*.md`
2. Decidir: dar mais contexto, mudar abordagem, ou aceitar gap como dívida

## Estrutura de arquivos

```
.claude/agents/
├── README.md                    # este arquivo
├── SHARED-PRINCIPLES.md         # 10 princípios obrigatórios
├── PIPELINE.md                  # como agentes coordenam
├── 00-orchestrator.md           # agente
├── 01-auditor.md
├── 02-java-analyst.md
├── 03-test-writer.md
├── 04-ts-porter.md
├── 05-validator.md
├── 06-regression-guard.md
└── state/                       # mensageria
    ├── README.md
    ├── STATUS.md                # estado vivo
    ├── <task_id>.json           # tasks
    ├── specs/
    ├── baselines/
    ├── learnings/
    └── locks/
```

## Métricas de sucesso

O sistema tem sucesso quando:

| Métrica | Hoje | Meta 1ª etapa | Meta 2ª etapa |
|---|---|---|---|
| calibrate:v3 ±0,01% por caso | 0/13 | **13/13** | 50/50 (corpus expandido) |
| calibrate:v3 média absoluta | -2,49% | <0,01% | <0,01% |
| Stubs no `core/` | 152 | <20 | 0 |
| Linhas TS / Java (% port) | 24% | 70% | 100% |
| Tests passando (sem coverage) | 652 | aumentar c/ módulos | 1000+ |
| Tests passando (com coverage) | 644 (8 timeout) | 1000 sem timeout | 1000 sem timeout |

## Estimativa de prazo

Com 3 pipelines paralelos (3x ORCHESTRATOR designando módulos diferentes):

- **Semana 1:** Setup + AUDITOR rodando, baseline travado
- **Semana 2-3:** INSS portado de fato (6 outliers PRE_ADC58 → 0)
- **Semana 4-7:** IRPF portado (1.675 linhas Java → 1.500+ linhas TS)
- **Semana 8-9:** Calculo restante (3.087 linhas Java → completar)
- **Semana 10-11:** Calculo Externo + módulos menores
- **Semana 12:** Expansão corpus para 50 PJCs
- **Semana 13-14:** Hardening (TS strict, refactor, docs)

**Total: 14 semanas (~3,5 meses)**.

Sem agentes, mesmo trabalho seria 6-9 meses (estimativa baseada em 30K
linhas de código TS a escrever cuidadosamente com paridade verificada).

## Custo operacional estimado

Inferência da API Claude para 3 pipelines paralelos rodando 8h/dia:

| Item | Custo/dia | Custo/mês |
|---|---|---|
| Opus (ORCHESTRATOR, AUDITOR, JAVA-ANALYST, TS-PORTER) | ~$15-30 | ~$300-600 |
| Sonnet (TEST-WRITER, VALIDATOR, REGRESSION-GUARD) | ~$5-10 | ~$100-200 |
| **Total** | **~$20-40/dia** | **~$400-800/mês** |

(Estimativa rough — ajustar conforme uso real medido após semana 1.)

## Notas operacionais

- `.claude/agents/` está em `.gitignore` por padrão. Para versionar, adicione
  como exceção em `.gitignore` ou commite explicitamente.
- Logs em `state/learnings/` são valiosos para post-mortem — preserve.
- Se trocar versão da API Claude, releia SHARED-PRINCIPLES.md (modelos
  novos podem ter comportamentos diferentes).
