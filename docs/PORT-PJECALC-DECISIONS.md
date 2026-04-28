# PORT PJe-Calc — Decisões de Design

Registro de decisões de arquitetura/design tomadas durante o port. Cada decisão descreve: contexto, opções consideradas, escolha, motivo.

---

## Formato

```
### D-NNN — <título curto>

**Data:** YYYY-MM-DD
**Fase:** N
**Contexto:** ...
**Opções:**
  A) ...
  B) ...
**Decisão:** <letra + justificativa curta>
**Consequências:** ...
**Revisitar se:** ...
```

---

## D-001 — Estratégia B antes de A

**Data:** 2026-04-22
**Fase:** 0
**Contexto:** Auditoria mostra 21,7% de cobertura (gap de ~86k linhas Java). Duas estratégias possíveis: (A) port total em ~6 meses, ou (B) port focado nos 14 `.pjc` reais em ~3-4 semanas.

**Opções:**
- A) Port total — paridade completa, mas prazo longo e alto custo.
- B) Port focado — paridade medida rápida, infraestrutura reaproveitável; cobre 80% do uso real com 30% do esforço.

**Decisão:** B, com reavaliação de A após estabilização da B com dados reais de uso.

**Consequências:** métodos não acionados pelos 14 casos ficam para segunda onda. Risco de casos atípicos (RRA complexo, estabilidade, reintegração) continuarem incompletos até A ser executada.

**Revisitar se:** usuário reportar lacuna em novo caso real; ou se Estratégia B entregar paridade <±0,01% e restar orçamento.

---

## D-002 — `Decimal.js` com precisão 20 para toda aritmética monetária

**Data:** 2026-04-22
**Fase:** 0 (inherited from CLAUDE.md)
**Contexto:** Java usa `BigDecimal`; JS nativo `number` tem precisão binária insuficiente para moeda.

**Decisão:** `Decimal.js` configurado uma vez em `core/base/comum/decimal-config.ts` com `Decimal.set({ precision: 20 })`. Nenhuma classe portada cria valores monetários via `number`.

**Consequências:** port de métodos `BigDecimal.divide(x, scale, rounding)` requer mapeamento explícito: `dec.div(x).toDecimalPlaces(scale, Decimal.ROUND_<MODE>)`.

**Revisitar se:** performance virar gargalo em calibrate em escala.

---

## D-003 — Espelhamento exato de pacotes Java → diretórios TS

**Data:** 2026-04-22
**Fase:** 0
**Contexto:** Para facilitar rastreabilidade entre fonte Java e port TS.

**Decisão:** `negocio/dominio/calculo/fgts/Fgts.java` → `src/lib/pjecalc/core/dominio/calculo/fgts/fgts.ts`. Convenção `CamelCase.java` → `kebab-case.ts`.

**Consequências:** facilita busca e manutenção; custo pequeno em aninhamento de diretórios.

---

## D-004 — Enums Java → const objects TS

**Data:** 2026-04-22
**Fase:** 0
**Contexto:** Enums Java têm campos (descricao, id, codigo) e métodos. `enum` TS não suporta isso adequadamente.

**Decisão:** usar `const` objects + union type de keys:

```typescript
export const TipoDeBaseDoFgtsEnum = {
  PADRAO: { value: 'PADRAO', descricao: 'Padrão' },
  CORRIGIDO: { value: 'CORRIGIDO', descricao: 'Corrigido' },
} as const;
export type TipoDeBaseDoFgtsEnumKey = keyof typeof TipoDeBaseDoFgtsEnum;
```

**Consequências:** comparações usam `.value` em vez de `===` direto sobre enum; trade-off aceitável.

---

## D-005 — Feature flags `USE_PORTED_*` para ativação gradual

**Data:** 2026-04-22
**Fase:** 0
**Contexto:** Port é gradual; engine atual precisa continuar funcionando durante todas as fases.

**Decisão:** cada módulo portado ganha flag `VITE_USE_PORTED_<MODULO>` em `.env`. Quando golden tests do novo estão 100% verdes, flag vira `true` em prod. Flags são removidas na Fase 9.

**Consequências:** alguma complexidade em wiring (`isPortedEnabled('IRPF')` em vários pontos). Compensa pela possibilidade de rollback instantâneo.

---

## D-006 — Tolerância zero a "melhorias" durante o port

**Data:** 2026-04-22
**Fase:** 0
**Contexto:** É tentador corrigir bugs óbvios do PJe-Calc original durante a tradução. Isso compromete a medição de paridade.

**Decisão:** fidelidade semântica absoluta. Bugs são documentados em `PORT-PJECALC-KNOWN-DIVERGENCES.md`, nunca corrigidos no código portado. Correção vira fase separada após paridade medida.

**Consequências:** MRD pode temporariamente herdar bugs conhecidos. Revisão pós-Fase 9 avalia cada divergência com flag opcional.

---

## D-007 — Golden tests de método + golden tests end-to-end

**Data:** 2026-04-22
**Fase:** 0
**Contexto:** Precisamos validar tanto métodos isolados quanto fluxo completo.

**Decisão:** combinar dois níveis:
- **End-to-end:** fixtures em `__golden__/fixtures/<caso>.json` rodam o engine portado e comparam contra outputs do `.pjc` real. Implementam o gate de calibrate.
- **Método:** cada classe portada tem seu próprio `__tests__/<classe>.golden.test.ts` com fixtures pequenas para métodos críticos.

**Consequências:** duplo custo de manutenção, mas cobertura forte. Harness único em `__golden__/runner.ts` reduz redundância.

---

## D-008 — Branch de Fase 0 em `claude/audit-pjecalc-mrdcalc-2A322`

**Data:** 2026-04-22
**Fase:** 0
**Contexto:** Prompt do usuário sugeriu criar `feat/pjecalc-port-completa` a partir de `main`. Porém, a branch designada do harness desta sessão é `claude/audit-pjecalc-mrdcalc-2A322`, que já contém PR #17 merged. Criar branch nova a partir de `main` perderia esse fix.

**Decisão:** manter a Fase 0 em `claude/audit-pjecalc-mrdcalc-2A322`. Após merge em `main`, fases 1+ abrem novas branches `feat/pjecalc-port-fase-N-<modulo>` a partir de `main` atualizado.

**Consequências:** PR da Fase 0 será revisada e mergeada ao `main` antes da Fase 1 começar. Usuário pode renomear a branch em review se preferir `feat/pjecalc-port-completa`.
