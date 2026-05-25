# Investigação — 0% concordância Parser × LLM (Holerite)

## Problema

Relatório do caso ROQUE mostrou 0% de concordância entre parser determinístico
e LLM extractor (extract-rubricas-ai) no holerite Via Varejo.

## Hipóteses investigadas

### H1: Layout via_varejo_v1 caindo no genérico (CONFIRMADA)

O parser `via_varejo_v1` estava marcado como "provisório" com regex frágil
(`RE_LINHA_RUBRICA = /^(\d{4})\s+([\p{L}]...)$/u`). A âncora `$` no final
exigia que a linha terminasse exatamente após os valores, mas linhas reais
de holerite têm espaços trailing, campos extras, etc.

**Fix aplicado (Sprint 6):** regex relaxada para `RE_LINHA_COD` sem âncora
final, aceita códigos 3-5 dígitos, warning provisório removido.

### H2: LLM extractor vê totalizadores como rubricas

O prompt do `extract-rubricas-ai` instrui a IA a ignorar "Total", "Base",
"Líquido", mas variações de OCR ("Total Venc", "Tot. Desc") podem escapar.
Quando o LLM inclui totalizadores e o parser não, o matching falha.

**Status:** Parcialmente mitigado pelo blocklist no pós-processamento.

### H3: Matching Levenshtein insuficiente

O comparador (`comparador-llm-parser.ts`) usa Levenshtein ≤ 3 para matching
por nome normalizado. Para nomes longos como "HORAS EXTRAS COM 75%" vs
"HRS EXTRAS 75%", a distância é > 3.

**Status:** Potencial contribuição significativa. Recomendação: aumentar
limiar para nomes > 15 chars, ou usar matching por código quando disponível.

### H4: Valores em formatos diferentes

Parser devolve valores BR já parseados (number). LLM pode devolver string
"1.309,42" ou número 1309.42. O comparador normaliza, mas edge cases em
arredondamento podem causar mismatch.

**Status:** Improvável como causa principal (afeta delta, não matching).

## Recomendações

1. **Matching por código** (priority 1): quando parser e LLM ambos
   devolvem `codigo`, comparar por código antes de nome
2. **Limiar Levenshtein adaptativo**: `min(3, nome.length * 0.2)`
3. **Smoke real** (Track A.1): rodar comparação com fixture real após
   fix do parser via_varejo_v1

## Status

- [x] H1 investigada e corrigida
- [x] H2 parcialmente mitigada
- [ ] H3 fix pendente (baixo risco, melhoria incremental)
- [ ] H4 descartada como causa principal
- [ ] Smoke real pendente (Track A.1)
