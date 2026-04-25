# State directory — mensageria entre agentes

Este diretório guarda estado vivo do pipeline de agentes.

## Estrutura

```
state/
├── README.md                    # você está aqui
├── STATUS.md                    # estado vivo dos pipelines (atualizado por ORCHESTRATOR)
├── <task_id>.json               # estado de cada task (handoff entre agentes)
├── specs/<task_id>.json         # output do JAVA-ANALYST
├── baselines/<task_id>.json     # snapshot pré-mudança (calibrate, vitest)
├── learnings/<task_id>-attempt-N.md  # log de tentativas falhas (REGRESSION-GUARD)
└── locks/<file_escaped>.lock    # locks de arquivo (evitar conflito paralelo)
```

## Convenções

### task_id
Formato: `YYYY-MM-DD-<module>-<method>` em snake-case.

Exemplos:
- `2026-04-25-irpf-liquidar`
- `2026-04-26-inss-calcular-valor-base-verbas`

### File lock encoding
Caminho do arquivo virou nome de lock substituindo `/` por `__`.
Exemplo: `src/lib/pjecalc/core/dominio/calculo/irpf/maquina-de-calculo-de-irpf.ts`
        → `src__lib__pjecalc__core__dominio__calculo__irpf__maquina-de-calculo-de-irpf.ts.lock`

## Lifecycle de uma task

1. **ORCHESTRATOR** cria `<task_id>.json` com `status: pending`
2. **JAVA-ANALYST** lê, produz `specs/<task_id>.json`, atualiza state
3. **TEST-WRITER** lê spec, cria fixtures e tests, atualiza state
4. **TS-PORTER** pega lock(s), lê tests, implementa, atualiza state
5. **VALIDATOR** roda gates, atualiza state com PASS/FAIL
6a. PASS → ORCHESTRATOR pega próxima task
6b. FAIL → REGRESSION-GUARD reverte, log em `learnings/`

## Limpeza

Tasks completadas: mover de `state/<task_id>.json` para `state/archive/<task_id>.json` mensalmente.

Locks órfãos: ORCHESTRATOR limpa locks com `acquired_at` > 24h.

## Ignorar do git?

Este diretório DEVE ser commitado para que o trabalho dos agentes seja
auditável. Cada task vira parte do histórico do projeto.

Exceto:
- `locks/` — efêmero, adicionar ao .gitignore
- `archive/` — pode ficar, mas crescerá com tempo
