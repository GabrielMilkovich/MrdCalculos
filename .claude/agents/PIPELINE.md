# Pipeline de Coordenação — Agentes MRD Calc

## Fluxo padrão de uma tarefa de porte

```
┌──────────────┐
│ ORCHESTRATOR │  decide qual módulo atacar agora
└──────┬───────┘
       │ cria task em state/<task_id>.json
       ▼
┌──────────────┐
│ JAVA-ANALYST │  lê Java decompilado, produz spec.json
└──────┬───────┘
       │ atualiza state com deliverable.spec
       ▼
┌──────────────┐
│ TEST-WRITER  │  gera fixtures + golden tests
└──────┬───────┘
       │ atualiza state com deliverable.tests
       ▼
┌──────────────┐
│ TS-PORTER    │  implementa em TS, faz commit isolado
└──────┬───────┘
       │ atualiza state com deliverable.commit_sha
       ▼
┌──────────────┐
│ VALIDATOR    │  roda tsc + vitest + calibrate vs baseline
└──────┬───────┘
       │
       ├─ PASS ──────► push para branch port/<module>
       │
       └─ FAIL ──────►
                     ┌──────────────────┐
                     │ REGRESSION-GUARD │  git revert
                     └──────────────────┘
                            │
                            ▼
                     escala para humano se 3 fails consecutivos

  Em paralelo, sem bloquear:
┌──────────────┐
│ AUDITOR      │  semanal: roda gap analysis, atualiza KNOWN-LIMITATIONS
└──────────────┘
```

---

## Mensageria via filesystem

Cada tarefa é um arquivo JSON em `.claude/agents/state/`:

**Exemplo:** `.claude/agents/state/2026-04-25-irpf-liquidar.json`

```json
{
  "task_id": "2026-04-25-irpf-liquidar",
  "module": "irpf",
  "method": "MaquinaDeCalculoDeIrpf.liquidar",
  "java_file": "pjecalc-fonte/.../calculo/irpf/MaquinaDeCalculoDeIrpf.java",
  "java_lines": "914-1050",
  "ts_file": "src/lib/pjecalc/core/dominio/calculo/irpf/maquina-de-calculo-de-irpf.ts",
  "history": [
    {
      "ts": "2026-04-25T14:00:00Z",
      "agent": "ORCHESTRATOR",
      "status": "created",
      "deliverable": null,
      "next": "JAVA-ANALYST"
    },
    {
      "ts": "2026-04-25T14:35:00Z",
      "agent": "JAVA-ANALYST",
      "status": "completed",
      "deliverable": {
        "spec_path": ".claude/agents/state/specs/irpf-liquidar.json",
        "branches_detected": 4,
        "dependencies": ["TabelaProgressivaIRRF", "ProporcoesIrpf"],
        "complexity_estimate": "high",
        "ambiguities": ["RRA_ANOS_ANTERIORES base é do ano corrente ou anterior?"]
      },
      "next": "TEST-WRITER"
    }
  ],
  "current_status": "pending",
  "current_agent": "TEST-WRITER",
  "blockers": [
    "RRA_ANOS_ANTERIORES interpretation — escalado para humano em 14:36"
  ]
}
```

Agentes seguintes leem o state, atualizam, passam adiante.

---

## Locks para parallelismo

Quando um agente trabalha em arquivos, pega lock em `.claude/agents/state/locks/<file>.lock`:

```
.claude/agents/state/locks/
├── src__lib__pjecalc__core__dominio__calculo__inss.lock
└── src__lib__pjecalc__core__dominio__calculo__irpf.lock
```

Conteúdo do .lock:
```json
{ "agent": "TS-PORTER", "task_id": "2026-04-25-irpf-liquidar", "acquired_at": "..." }
```

ORCHESTRATOR garante que tarefas concorrentes ataquem arquivos diferentes.

---

## Pipelines paralelos — exemplo

Cenário: 3 pipelines simultâneos atacando módulos independentes.

| Tempo | Pipeline INSS | Pipeline IRPF | Pipeline Custas |
|---|---|---|---|
| T+0h | JAVA-ANALYST | — | — |
| T+1h | TEST-WRITER | JAVA-ANALYST | — |
| T+2h | TS-PORTER | TEST-WRITER | JAVA-ANALYST |
| T+3h | VALIDATOR | TS-PORTER | TEST-WRITER |
| T+4h | (push) | VALIDATOR | TS-PORTER |
| T+5h | — | (push) | VALIDATOR |
| T+6h | — | — | (push) |

Sem conflito porque arquivos diferentes. ORCHESTRATOR controla.

---

## Estado de comunicação

Em qualquer momento, `.claude/agents/state/STATUS.md` mostra estado vivo:

```markdown
# Estado dos Pipelines — atualizado a cada 5min

## Pipeline 1: INSS.liquidar
- Status: ✅ Concluído (push em 2026-04-25T15:30Z)
- Resultado: calibrate 12/13 ±5% (era 11/13)

## Pipeline 2: IRPF.liquidar
- Status: 🔄 TS-PORTER em andamento (50% completo)
- Bloqueio: nenhum

## Pipeline 3: Custas.liquidar
- Status: ❌ FAIL — REGRESSION-GUARD revertido às 15:25Z
- Motivo: vitest falhou em 3 testes existentes
- Próxima ação: JAVA-ANALYST revisar spec
```

ORCHESTRATOR e AUDITOR leem este arquivo para tomar decisões.

---

## Ciclo de retry e escalação

```
Tarefa atribuída
    ↓
[ATTEMPT 1] → FAIL → REGRESSION-GUARD revert → log learning
    ↓
[ATTEMPT 2 com nova abordagem] → FAIL → REGRESSION-GUARD revert
    ↓
[ATTEMPT 3 com input do AUDITOR] → FAIL → REGRESSION-GUARD revert
    ↓
ESCALAÇÃO HUMANA — não tentar mais sozinho
```

Cada agente respeita esse limite. Após 3 fails, problema vai para humano.
