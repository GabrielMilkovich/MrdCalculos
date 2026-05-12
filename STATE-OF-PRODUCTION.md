# STATE OF PRODUCTION — MRD Calc

**Data:** 2026-05-12 (atualizado após auditoria externa "primeira + segunda + terceira leva")
**Auditoria externa:** 30+ achados verificados em código (CRÍTICO/IMPORTANTE/MENOR)
**Veredicto geral honesto:** **Em produção como Validador/Replicador de PJC + Pipeline OCR→CSV.** **NÃO em produção como motor autônomo de cálculo from-scratch.**

> Este documento foi reescrito do zero para refletir a realidade verificável
> em código, conforme apontado pela auditoria externa. A versão anterior
> (datada 2026-04-29 com "Fake frontend: 100", "94% paridade", "PRODUCAO
> READY") **não bate com o código** e foi removida. Nada de hype.

---

## Veredicto executivo

### O que funciona (Tier "pode entregar")

✅ **Validador / Replicador de XML PJe-Calc Cidadão**
- Importa XML do PJe-Calc Cidadão via `pjc-analyzer.ts` + `pjc-to-engine.ts`
- `engine-v3.ts` (1971 LOC) aplica fator de correção sobre `ocorrencias_precomputadas` vindas do XML
- Suite `parity-v3-vs-pjc.test.ts` rodando contra 14 PJCs reais em `public/reports/` (versionados):
  - 8/14 casos válidos (6 erros vêm do parser PJC, não do engine)
  - **8/8 válidos em APROV≤5%** (3 GOLDEN ≤1%, 5 entre 1-5%)
  - Delta médio absoluto: 1.56%, delta global: -0.45%
  - Limite agregado guard-rail: APROV≤5% deve cobrir ≥50% dos válidos (hoje: 100%)
  - Limite de erro de execução: <50% (hoje: 43%, tracking de regressão)

✅ **Pipeline OCR→CSV PJe-Calc Cidadão**
- Mistral OCR → auto-detect de tipo → parsers determinísticos por layout → review dialog → ZIP
- 2192 testes vitest passando
- 4 parsers determinísticos (holerite, ferias, faltas, cartao_ponto) com fixtures reais
- `cartao-ponto-csv.ts` cuidadoso com Decimal e CRLF
- AUDIT #4/#24: `ocr_confidence` deixou de ser hardcoded 1.0 — agora é score heurístico real (0.2..0.95) baseado em densidade alfanumérica, presença de placeholders, chars por página
- AUDIT #23: score do extrator V6 deixou de ser binário (0.7/0.95) — agora reflete densidade e qualidade do texto

✅ **Pipeline OCR → Calculadora (PR #74, já mergeado em main)**
- 4 módulos de parâmetros (Histórico Salarial, Faltas, Férias, Cartão de Ponto) com UI estilo PJE-Calc (6 pares E/S no cartão de ponto)
- Auto-fill determinístico ao confirmar OCR, sem CSV intermediário
- `useCalculoAtivo(caseId)` resolve o `calculo_id` certo, garantindo que o motor enxergue os dados inseridos

### O que NÃO funciona (Tier "não pode passar como pronto")

❌ **Cálculo trabalhista from-scratch (verba cadastrada manualmente sem XML PJC)**
- AUDIT #15/#19: `MaquinaDeCalculo.executarGerarOcorrencias()` está portada mas **nunca é instanciada em código vivo**
- Verba com `valor='calculado'` sem `ocorrencias_precomputadas` → engine retorna **R$ 0,00**
- **MITIGAÇÃO (já aplicada):** `engine-v3.ts` agora coleta esse caso e expõe via `resumo.verbas_sem_ocorrencias`. O `ModuloResumo` mostra **banner vermelho bloqueante** instruindo o operador a importar XML PJC antes de assinar peça
- Não está escondido — está explícito. Operador vê o aviso antes de qualquer valor numérico.

⚠️ **Módulos cosméticos (persistem dados mas o engine V3 ainda não lê)**
- AUDIT #1: 4 módulos com banner amarelo `ExperimentalBanner`:
  - `ModuloExcecoesCarga` (carga horária reduzida)
  - `ModuloExcecoesSabado` (sábado não-útil)
  - `ModuloSeguroDesemprego` — **MITIGAÇÃO (já aplicada):** AUDIT #2 implementou faixas progressivas Lei 7.998/90 (`calcularParcelaSeguroDesemprego2024`)
  - `ModuloSalarioFamilia` — **MITIGAÇÃO (já aplicada):** AUDIT #3 cota agora consulta tabela histórica (`PjeSalarioFamiliaDB`), com fallback documentado
- Banner explica o que NÃO funciona ainda + workaround sugerido em cada um

### Tier "dívida assumida, fora desta sessão"

🔧 **Refator arquitetural maior**

| # AUDIT | Item | Esforço estimado |
|---|---|---|
| #14 | Engine V3 + domain-orchestrator coexistem com responsabilidades sobrepostas — decidir um e descontinuar o outro | 4-6 semanas |
| #18 | `Calculo.java` portado 41% — completar `liquidar()` + `Pagamento.java` (22%) + `ApuracaoDeJuros` (0%) | 4-8 semanas |
| #16/#17 | `pjecalc_ocorrencia_calculo` write-only — ocorrências persistidas nunca alimentam de volta o engine | 1-2 semanas |
| #6 | 3 pipelines de OCR coexistem (`ocr-document`, `process-document`, `process-document-mistral`) — consolidar | 1-2 semanas |
| #22 | Duplicação de regex/PII entre client V5 e edge V6 — **MITIGAÇÃO (já aplicada):** teste de paridade `auto-detect-tipo-paridade.test.ts` detecta divergência. Refator para `_shared/` segue pendente | 1 semana |
| #27 | Pipeline pós-OCR fire-and-forget sem backpressure de erro | 3-5 dias |
| #28 | Holerite só tem 2 layouts (Via Varejo + genérico) | adicionar por demanda |

---

## Mudanças aplicadas nesta sessão para alinhar com a auditoria

| AUDIT # | Mudança | Arquivo |
|---|---|---|
| #15, #19 | Engine V3 expõe `verbas_sem_ocorrencias` no resumo + banner bloqueante na UI | `engine-v3.ts`, `engine-types.ts`, `ModuloResumo.tsx` |
| #1 | `ExperimentalBanner` aplicado em 4 módulos fake-frontend | `ExperimentalBanner.tsx` + 4 módulos |
| #2 | Faixas progressivas Lei 7.998/90 (Seguro-Desemprego) | `engine-v3.ts:calcularParcelaSeguroDesemprego2024` |
| #3, #12 | Cota salário-família lida da tabela histórica com fallback documentado | `engine-v3.ts` |
| #4, #24 | `ocr_confidence` deixa de ser hardcoded 1.0 → score heurístico | `ocr-document/index.ts` |
| #23 | Score do extrator V6 deixa de ser binário → heurística real | `_shared/extrator-geometrico.ts` |
| #5 | `parseBR` usa `Decimal.js` (mantém API `number` + nova `parseBRDecimal`) | `parsers/holerite/types.ts` |
| #7 | Teste de paridade auto-detect client↔edge | `auto-detect-tipo-paridade.test.ts` |
| #20 | `parity-v3-vs-pjc.test.ts` aponta para corpus real (`public/reports/`), fail loud quando ausente, threshold agregado APROV≤5% ≥50% | `parity-v3-vs-pjc.test.ts` |
| — | `STATE-OF-PRODUCTION.md` reescrito do zero refletindo realidade do audit | este arquivo |

---

## Validação final

```
npm run build      ✓ 22s
tsc --noEmit       ✓ 0 erros
vitest run         ✓ 2192 passed / 43 skipped / 0 failed
```

---

## Decisão de produto pendente

A pergunta executiva é se o produto é entregue como:

**(A)** **"Validador/Replicador de PJe-Calc + Pipeline OCR→Calculadora"** — honesto, funciona, banners explicam limitações. Pode entregar essa semana.

**(B)** **"Motor de cálculos trabalhistas autônomo com precisão pericial"** (string atual do `package.json`) — exige 4-12 semanas de port Java→TS sério antes de não-ser-ficção.

A recomendação interna é (A) com roadmap declarado para (B). O `package.json description` deve ser ajustado.

---

*Documento mantido honesto. Auditoria externa é bem-vinda e foi internalizada
ponto a ponto. Se alguém da equipe encontrar afirmação aqui que não bate com
o código, levante imediatamente.*
