# Motores Legados — `src/lib/calculation/`

Arquivos neste diretório estão **DEPRECATED**. Mantidos apenas como rede de
segurança temporária até **2026-05-20** (4 semanas após consolidação V3).

## Conteúdo

| Arquivo | O que era | Substituto |
|---|---|---|
| `engine.ts` | Motor V1 (`CalculationEngine`) — registry de calculators + helpers | `@/lib/pjecalc/engine-v3` (`PjeCalcEngineV3`) |
| `engine/CalculationEngineV2.ts` | Motor V2 (`CalculationEngineV2`) — variante factory `createCalculationEngine` | idem |
| `engine/RubricaEngine.ts`, `RubricaRegistry.ts`, `RubricasRescisao.ts` | Sistema de rubricas (V1/V2) | substituído por `core/dominio/verba*` |
| `engine/ReportGenerator.ts`, `SituationAnalyzer.ts`, `TestScenarios.ts` | Helpers de relatório e análise (V1/V2) | substituídos pelos `pdf-report-*.ts` em `pjecalc/` |
| `v2.ts` | Entry point V2 | n/a |
| `calculators/` | 8 calculators isolados (FGTS, INSS, intrajornada, horas extras, reflexos, verbas rescisórias, atualização monetária) | substituídos pelo core portado em `pjecalc/core/` |

## Política

- ❌ Não importar destes arquivos em código novo.
- ❌ Não adicionar features aqui.
- ❌ Não corrigir bugs aqui (exceto segurança crítica).
- ✅ Usar `PjeCalcEngineV3` em todos os caminhos novos.

## Importadores remanescentes (lista exaustiva nesta data)

- `src/lib/calculation/index.ts` — barrel público re-exporta 7 símbolos
  de `_legacy/engine` por compatibilidade transitória. Será simplificado
  quando o diretório for removido.
- `src/components/admin/RegressionTestRunner.tsx` — usa `TestScenarios`.
- `src/components/cases/CalculationReportView.tsx` — usa `ReportGenerator`
  e `SituationAnalyzer` (apenas types).
- `_legacy/calculators/atualizacao-monetaria.ts` — import relativo interno
  para `_legacy/engine` (fica dentro do próprio `_legacy/`).

## Remoção planejada

Diretório será removido em PR separada após ~4 semanas de V3 rodando em
produção sem incidentes.

Responsável: Gabriel Milkovich.
