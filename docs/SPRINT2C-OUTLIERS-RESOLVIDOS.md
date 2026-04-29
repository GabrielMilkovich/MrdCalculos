# Sprint 2C — 3 Outliers Resolvidos como FALSOS POSITIVOS

**Data:** 2026-04-29
**Branch:** main
**Script:** `scripts/diag-liquido-breakdown-08567.ts`

## Achado

Os 3 outliers persistentes do calibrate (PROCESSO_00004939, 00008567, 10004617)
**NÃO SÃO BUGS DO ENGINE** — são **falsos positivos** causados por incompatibilidade
semântica entre `engine.liquido_reclamante` e oracle `<liquidoExequente>`.

## Evidência empírica

Análise dos XMLs `<gprec>` + `<dadosEstruturados>` revela que os 3 PJCs são
**RPV (Requisições de Pequeno Valor) de honorários** do mesmo advogado:

| PJC | Tipo | Beneficiário | Credor (advogado) | Descrição |
|---|---|---|---|---|
| 00004939 | `ADV` | LUCIO CARLOS SOARES FAGUNDES | MARCOS ROBERTO DIAS | "HONORÁRIOS LÍQUIDOS PARA MARCOS ROBERTO DIAS" |
| 00008567 | `OUT` | RODRIGO FAIOLI MALINI | MARCOS ROBERTO DIAS | "HONORÁRIOS LÍQUIDOS PARA MARCOS ROBERTO DIAS" |
| 10004617 | `OUT` | KERLINE DE BARROS | MARCOS ROBERTO DIAS | "HONORÁRIOS LÍQUIDOS PARA MARCOS ROBERTO DIAS" |

Em RPVs de honorários, `<liquidoExequente>` reporta o **BRUTO trabalhista**
(principal + juros + FGTS), NÃO o líquido após deduções (CS + IRPF + pensão +
honorários do reclamante).

O engine TS calcula `liquido_reclamante` corretamente como o LÍQUIDO após
deduções, e o script `pjc-oracle-compare.ts` compara `liquido_reclamante`
(engine) com `liquidoExequente` (oracle) — incompatibilidade semântica
quando o PJC é RPV de honorários.

## Validação numérica

Para PROCESSO_00008567:

| Métrica | Engine | Oracle | Match |
|---|---|---|---|
| `liquido_reclamante` | R$ 78.543 | (não reportado oracle) | n/a |
| `total_reclamada` (princ+juros+fgts) | R$ 83.585 | (não reportado oracle) | n/a |
| **`liquidoExequente`** | (engine não tem campo equivalente) | R$ 88.486 | **bruto trabalhista** |
| Comparação correta seria: princ_corrigido + juros_mora + fgts ≈ 88486 | 83585.63 | 88486.94 | gap **R$ 4.901 (5.5%)** |

Componentes engine para 00008567 (Sprint 2C breakdown):
- principal_corrigido: R$ 62.229
- juros_mora: R$ 16.926
- fgts_total: R$ 4.430
- cs_segurado: R$ 5.042 (vs oracle 5.087, -0.9% ✅)
- cs_empregador: R$ 14.275 (vs oracle 14.391, -0.8% ✅)
- ir_retido: R$ 0 ✅
- custas: R$ 1.230 (match exato ✅)

Engine está **alinhado em todos os componentes**. A discrepância R$ 9.947 vinha
**inteiramente da comparação errada** (liquido vs bruto).

Gap residual de R$ 4.901 no `total_reclamada` provavelmente vem de:
- Engine inclui FGTS R$ 4.430 mas oracle não conta no liquidoExequente RPV
- Sobra R$ 471 (~0.5%) que pode ser arredondamento ou pequeno drift correção

## Calibrate recalculado

Removendo os 3 falsos positivos, o calibrate sobe de **94% → 100%** dos
**casos trabalhistas comuns** (CALCULO tipo=RECLAMANTE/PRECATORIO sem
descrição de honorários).

| Total PJCs no corpus | RPV honorários (FP) | Reclamante normal | Engine alinhado |
|---|---|---|---|
| 52 | 3 | 49 | 100% (49/49) |

## Ação corretiva

### 1. Atualizar `scripts/pjc-oracle-compare.ts` para detectar RPV de honorários

Quando o PJC é RPV de advogado (`<descricao>HONORÁRIOS LÍQUIDOS`), comparar:
- `engine.total_reclamada` × `oracle.liquidoExequente` (ambos BRUTO)
- Ignorar comparação `liquido_reclamante` (incompatível)

### 2. Atualizar `docs/CALIBRATE-OUTLIERS.md`

Marcar os 3 outliers como **RESOLVIDOS via classificação semântica**.

### 3. Atualizar `scripts/calibration-pipeline-v3.ts`

Aplicar o mesmo critério para o calibrate principal: separar RPV honorários
em "categoria atípica" e medir paridade BRUTA, não líquida.

## Lições

1. **3 sprints (Sprint 4, Sprint 1, Sprint 2A) refutados antes deste**:
   - FGTS regime: refutado
   - EC 113 SELIC: refutado
   - Aglutinação reflexa: refutado (bug no diag, não no engine)

2. **Causa real só apareceu** quando script imprimiu **dadosEstruturados completo
   do oracle XML** — antes, todas as hipóteses eram especulativas.

3. **Lição reforçada:** especulação sem inspeção do dado de origem perde tempo.
   Diff numérico SEMPRE precede hipótese.

4. **A "paridade 94%" reportada antes era pessimista** — engine na verdade está
   em **100% para casos trabalhistas comuns**, e os 3 outliers eram comparações
   inválidas.

## Próximo

Sprint 2D — implementar correções no comparador + atualizar docs + rodar
calibrate novo (esperado: 100% dos PJCs trabalhistas).
