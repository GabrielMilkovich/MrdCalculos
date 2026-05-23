/**
 * Sprint Hotfix bug #10 — converte o campo `dobra` da tabela
 * `pjecalc_ocorrencia_calculo` (NUMERIC(4,2)) para o boolean que o
 * domínio espera.
 *
 * CAUSA DO FIX: ModuloResumo.tsx usava `!!Number(oc.dobra)` que
 * booleanizava QUALQUER valor não-zero como `true`. Como o persist
 * grava `dobra=1` por default (oc sem dobra legal — `pjc-persist.ts:275`
 * faz `oc.dobra ? 2 : 1`), todas as ocorrências importadas viravam
 * `dobra=true` no read, propagando pelo engine V3 (que exporta
 * `getDobra() ? 2 : 1` em `engine-v3.ts:675`) e gravando `dobra=2`
 * em 100% das ocorrências CALCULADA. Resultado: bruto inflado em 2×
 * (caso ROSICLEIA: R$ 463.845,23 vs gabarito R$ 231.922,57).
 *
 * SEMÂNTICA CORRETA (alinhada com `orchestrator.ts:227,416` e
 * `pjc-persist.ts:275`):
 *   - 0 ou 1 → sem dobra (false)
 *   - 2 (ou mais) → dobra legítima (true) — ex: férias Art. 137 §2º
 *     CLT, Art. 467 CLT
 *
 * Aceita string, number, null, undefined. NaN → false (defensivo).
 */
export function parseDobraFromDb(raw: unknown): boolean {
  const n = Number(raw);
  if (!Number.isFinite(n)) return false;
  return n >= 2;
}
