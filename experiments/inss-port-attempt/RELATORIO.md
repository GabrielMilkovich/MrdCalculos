# Experimento — Porte 1:1 de `calcularValorBaseVerbas`

> **Data:** 2026-04-25
> **Método portado:** `MaquinaDeCalculoDoInss.calcularValorBaseVerbas` (Java linhas 606-622)
> **Tamanho do método Java:** 16 linhas + 1 método auxiliar (`atualizarDiferencaDasOcorrenciasParaRegimeIntermitente`, 16 linhas)
> **Total Java analisado:** ~32 linhas de código + N classes de dependência

---

## Tempo gasto (medido)

```
INÍCIO:  17:41:07
FIM:     17:43:32
TOTAL:   2 minutos e 25 segundos
```

**Observação importante:** este foi um caso **otimizado**:
- Já tinha investigado este método antes (no flag-flip experiment)
- Já conhecia as classes envolvidas (`Inss`, `OcorrenciaDeVerba`, `Utils`)
- Não precisei rodar testes ou validar contra calibrate

Para um método **virgem** (que eu nunca vi antes), estimativa realista: **15-30 minutos** apenas para esta etapa de leitura + porte estrutural. Sem contar testes, validação, debug.

---

## Dificuldades reais que encontrei

### 1. Dependência transitiva profunda

Para portar 16 linhas de Java, precisei:
- Ler `OcorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias()` (Java linha 663-684, ~22 linhas)
- Ler `Utils.somar()`, `Utils.zerarSeNegativo()`, `Utils.nulo()`, `Utils.naoNulo()` (4 helpers)
- Identificar `OptimizerListSearch` (estrutura de busca otimizada — ~30 linhas)
- Identificar `Competencia`, `RegimeDoContrato`, `CaracteristicaDaVerba` (3 enums/classes)

**Total de leitura para portar 16 linhas:** ~100 linhas de Java.

Razão: 16 linhas × **6,25 linhas de leitura por linha portada**.

Para 30.000 linhas de Java a portar, isso seria 187.500 linhas de leitura. Inviável fazer "leitura completa" — agente precisa ser inteligente sobre o que ler.

### 2. Semântica null-safe do Java diferente do TS

Java's `BigDecimal` tem semântica null-aware via `Utils.somar(null, x) = null`. TS:

| Caso | Java retorna | Nosso TS atual retorna |
|---|---|---|
| `somar(5, null)` | `null` | `5 + null = NaN` |
| `zerarSeNegativo(null)` | `null` | `Math.max(null, 0) = 0` (errado) |

Se o porte TS usar `+` em vez de `somar`, o comportamento diverge silenciosamente em casos com null.

**Solução:** criar `helpers/decimal-utils.ts` que replica `Utils.java`. Nosso TS atual NÃO tem isso — usa `+` direto.

### 3. Decompilador deixa armadilhas

Linha 615:
```java
if (isDecimoTerceiro && isCarac13 || !isDecimoTerceiro && !isCarac13) {
```

Isso é um **XNOR** (`isDecimoTerceiro == isCarac13`), expresso como decompilador entendeu. Programador humano teria escrito `isDecimoTerceiro == isCarac13` ou usado um helper. Tem que reconhecer o padrão para não chutar errado.

### 4. Dependências cíclicas implícitas

`MaquinaDeCalculoDoInss` chama `ocorrencia.getVerbaDeCalculo().getCalculo().getRegimeDoContrato()`. Para isso funcionar:
- `OcorrenciaDeVerba` precisa de `getVerbaDeCalculo()` retornando `VerbaDeCalculo`
- `VerbaDeCalculo` precisa de `getCalculo()` retornando `Calculo`
- `Calculo` precisa de `getRegimeDoContrato()` retornando enum

Se qualquer um desses não estiver implementado no TS atual, o porte quebra.

### 5. Contexto não-óbvio: por que isso existe?

Esse método existe para separar `valorBase` (histórico salarial) de `valorBaseVerbas` (diferenças das verbas). Sem entender o **modelo conceitual** ("INSS Java tem 2 bases distintas"), o porte fica mecânico mas pode aplicar a soma errado em outro contexto.

---

## 5 divergências reais detectadas vs `InssModuloAdapter` atual

Comparei com `src/lib/pjecalc/modulos/inss-modulo-adapter.ts` linhas 80-105:

| # | Divergência | Impacto |
|---|---|---|
| **1** | Nosso TS usa `oc.getDiferenca()` direto. Java usa `getDiferencaParaCalculoDasIncidencias()` que aplica regras de férias (dobra, abono, indenizadas) | Casos com férias têm INSS errado |
| **2** | Nosso TS NÃO trata regime INTERMITENTE no 13º | Trabalhador intermitente (Lei 13.467/17) tem 13º errado |
| **3** | Nosso TS converte para `number` no meio do cálculo (precisão perdida) | Casos > R$ 1M podem ter erro de centavos |
| **4** | Nosso TS filtra `incidenciaINSS` inline; Java pré-filtra | Mesma semântica, mas Java é mais limpo |
| **5** | Nosso TS NÃO usa semântica null-aware do `Utils.somar` | Pode mascarar bugs em casos com férias indenizadas |

**Importante:** estas divergências **NÃO explicam o gap de joseli-silva** (-32% INSS). Joseli tem comissões/DSR/mínimo garantido — nada de férias nem regime intermitente. As divergências #1 e #2 não se aplicam a ele.

→ **Conclusão:** o gap de joseli vem do **chamador** deste método (`liquidarInssSobreSalariosDevidos`, Java linhas 704-900), não deste método em si. **Próxima investigação deveria ser lá.**

---

## Avaliação honesta: posso portar 100% do PJe-Calc?

### O que aprendi

Para portar 1 método de 16 linhas com qualidade:

| Etapa | Tempo realista |
|---|---|
| Leitura cuidadosa do Java + dependências | 10-15 min |
| Identificação de divergências com TS atual | 5-10 min |
| Escrita do porte 1:1 | 5-10 min |
| **TOTAL por método** | **20-35 minutos** |

E **não inclui**:
- Escrita de testes (TEST-WRITER) — +30 min
- Validação contra calibrate — +10 min
- Debug se calibrate piorar — variável (15 min a 4h)

**Realista por método pequeno-médio: 1-2 horas de trabalho sério.**

### Volume do PJe-Calc

```
802 arquivos Java
~125.000 linhas
~3.000 métodos (estimativa: 40 linhas/método em média)
```

**Cálculo brutal:**
- 3.000 métodos × 1,5h = **4.500 horas**
- 4.500h ÷ 8h/dia = **563 dias úteis**
- 563 ÷ 22 (dias úteis/mês) = **~26 meses** = **2 anos e 2 meses**

Por **1 pessoa** trabalhando full-time. Com 3 agentes paralelos (otimista): **~8-9 meses**.

### O que isto significa para o objetivo "100% paridade"

- **100% paridade literal** (todos 3000 métodos portados 1:1) = **anos de trabalho**
- **100% paridade funcional** (resultado idêntico nos casos reais) = **possível em meses, focando em Maquina* e dependências diretas**
- **Paridade ±0.5% nos casos reais** (proposta da simulação anterior) = **5-6 semanas factível**

**Minha opinião honesta:** pegar como meta "paridade ±0.5% nos 5-10 casos reais que aparecem na prática" é o caminho viável. "100% paridade literal" é academicismo que custa anos.

---

## O que o experimento prova

✅ **Posso portar mecanicamente**, com cuidado, métodos do Java para TS preservando lógica.

✅ **Detecto divergências reais** entre Java e TS atual ao comparar.

✅ **TypeScript valida sintaticamente** o porte (tsc passa).

❌ **NÃO posso garantir paridade numérica** sem rodar — só validei sintaxe.

❌ **Volume total é proibitivo** se for 1:1 literal de 3000 métodos.

❌ **Algumas dependências profundas** (OptimizerListSearch, Hibernate proxies, Calendar Java) precisariam de adaptação significativa, não porte literal.

---

## Recomendação concreta para próxima sessão

Com base neste experimento real:

1. **Mude meta:** "100% paridade literal" → "paridade funcional ±0.5% nos casos reais"
2. **Foque ataque em chamadores, não chamados:** o gap de joseli está em `liquidarInssSobreSalariosDevidos`, não em `calcularValorBaseVerbas`
3. **Crie `helpers/java-utils.ts`** primeiro (replica Utils.somar/zerarSeNegativo) — fundação que destrava muito porte
4. **Use este arquivo como template:** quando o sistema de agentes for ativado, esse experimento mostra o formato esperado de output do TS-PORTER

---

## Arquivo entregue para uso futuro

`experiments/inss-port-attempt/calcular-valor-base-verbas.ts` (240 linhas)

Pode ser usado como:
- Referência durante futuro porte real do método
- Template do que TS-PORTER (agente) deve produzir
- Documentação executável do método (quem ler, entende a semântica)

**NÃO usar em produção** — é experimento isolado, não está ligado ao motor.

---

## Perguntas que ficaram em aberto (para humano)

1. **Devo continuar este experimento** atacando `liquidarInssSobreSalariosDevidos` (200 linhas Java) — método que provavelmente explica o gap de joseli?
2. **Aceita criar `helpers/java-utils.ts`** como fundação reutilizável?
3. **Concorda com mudança de meta** para "±0.5% nos casos reais" em vez de "100% literal"?
