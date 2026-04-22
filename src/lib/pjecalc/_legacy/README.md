# Motores Legados — PJe-Calc

Arquivos neste diretório estão **DEPRECATED**. Mantidos apenas como rede de
segurança temporária até **2026-05-20** (4 semanas após consolidação V3).

## Conteúdo

| Arquivo | O que era | Substituto |
|---|---|---|
| `engine.ts` | Motor V1 monolítico (`PjeCalcEngine`, ~4.591 linhas) | `../engine-v3.ts` → core portado em `../core/` |
| `engine-v4.ts` | Experimento INSS proporcionalizado (herdava V3) | `../engine-v3.ts` (funcionalidade absorvida) |

## Política

- ❌ Não importar destes arquivos em código novo.
- ❌ Não adicionar features aqui.
- ❌ Não corrigir bugs aqui (exceto segurança crítica).
- ✅ Usar `PjeCalcEngineV3` em todos os caminhos novos.

## Importadores remanescentes (lista exaustiva nesta data)

Apenas para fins de auditoria, os únicos pontos no repositório que ainda
importam destes arquivos são:

- `scripts/calibration-pipeline.ts` — script de calibração (`npm run calibrate`),
  ainda mede V1 contra PJC. Migração para V3 será feita em PR futura.
- `scripts/debug-case.mjs` — script de debug isolado.
- `src/lib/pjecalc/__tests__/parity-v4-vs-pjc.test.ts` — teste de paridade
  histórica do V4. Permanece como referência arquivada.

## Remoção planejada

Diretório será removido em PR separada após ~4 semanas de V3 rodando em
produção sem incidentes. Pré-requisito: zero ocorrências de warnings de
deprecação no monitoramento de produção durante esse período.

Responsável: Gabriel Milkovich.
