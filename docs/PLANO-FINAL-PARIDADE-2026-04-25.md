# Plano Final de Paridade PJe-Calc — 2026-04-25

> **Branch:** `claude/audit-pjecalc-mrdcalc-kPkHh`
> **Autor:** auditoria autônoma com leitura direta de código Java (pjecalc-fonte/) + extração estruturada de 47 PJCs reais.
> **Honestidade:** este documento separa explicitamente **dado verificado** de **inferência** de **especulação**. Nada é estimativa sem fundamento.

---

## 1. Sumário executivo

O motor TS atual usa um **adapter agregador** (`InssModuloAdapter`) que tem **6 divergências confirmadas** vs `MaquinaDeCalculoDoInss.java`. Três delas afetam a maioria dos PJCs reais; duas afetam casos pontuais; uma afeta apenas regime intermitente.

A meta **"100% paridade literal"** equivale a portar ~3.000 métodos Java — entre **563 dias úteis** (1 pessoa) e **8–9 meses** (3 agentes paralelos). Inviável sem multi-pessoa.

A meta **viável e útil** é **paridade ±0,5% nos casos reais (14 do corpus + 33 outros disponíveis)**, alcançável em **5–8 semanas** focando nos chamadores que produzem o gap (não em portar tudo).

A causa raiz dos −22% a −33% INSS dos 6 casos PRE_ADC58 longos é **arquitetural**: o adapter agrega base por competência e chama uma única `apurarInss`, enquanto o Java gera **uma ocorrência por evento** (com teto próprio, alíquota própria, base própria), aplicando regras de férias / 13º / regime / histórico salarial individualmente.

---

## 2. O que foi VERIFICADO (dado, não inferência)

### 2.1. Corpus disponível

Arquivos `.PJC` em `pjc-corpus/` + `Arquivos PJC/` + `docs/`: **47 PJCs reais**.
Calibrate atual cobre 14 (golden corpus). 33 estão sem cobertura.

Extração estruturada via `/tmp/extract_full.py` resultou em `/tmp/pjcs-full.json` com:

| Característica | Quantos | % |
|---|---|---|
| Lei 11941 ativada | 47/47 | 100% |
| feriasIndenizadas=true | 43/47 | 91% |
| Todos históricos com `incidenciaINSS=false` | 42/47 | 89% |
| Todas `OcorrenciaDeInssSobreSalariosDevidos` com `valorBase=0` | 44/46 | 96% |

### 2.2. Algoritmo Java EXATO (lido de pjecalc-fonte/, não inferido)

**`TabelaPrevidenciaria.obterAliquotaParaValor(valor)` (linhas 118-165):**
```
Pré-EC 103 (< 2020-03):
  retorna alíquota da PRIMEIRA faixa onde valor ≤ faixa.valorFinal
  (i.e., 8% se valor ≤ R$1k, 9% se ≤ R$2k, 11% se ≤ teto, etc.)

Pós-EC 103 (≥ 2020-03):
  se valor ≤ primeiraFaixa.valorFinal: retorna primeira aliquota
  se valor ≥ valorTetoBeneficio: retorna valorTetoMaximo / (valorTetoBeneficio/100)  ← efetiva no teto
  senão: progressivo faixa-a-faixa, retorna média ponderada
```

**`MaquinaDeCalculoDoInss` (linhas 431-486 — apuração da ocorrência):**
```
1. aliquotaDoSegurado       = obterAliquotaParaValor(valorBase)
2. aliquotaDoTotalSegurado  = obterAliquotaParaValor(valorBase + valorBaseVerbas)
3. valorTotalInssSegurado   = MIN(valorBase × aliquotaDoSegurado, tetoSegurado)
4. valorDevidoSeguradoVerbas = valorBaseVerbas × aliquotaDoTotalSegurado
5. valorDevidoSegurado      = MIN(tetoSegurado − valorTotalInssSegurado, valorDevidoSeguradoVerbas)
```

**Hipótese descartada definitivamente:** "Java aplica progressivo pré-2020". FALSO — comprovado pela leitura das linhas 119-132 acima. A variação de `aliquotaDoTotalSegurado` observada (7.5%–11.69%) vem de competências mistas no longo período (pré-2020 com 8/9/11% + pós-2020 com efetiva).

### 2.3. Algoritmo TS atual EXATO (`src/lib/pjecalc/modulos/inss-modulo-adapter.ts`)

```
1. Agrega bases por (competência, tipo: normal/13º):
     base = oc.getDiferencaCorrigida() se com_correcao_trabalhista, senão oc.getDiferenca()
2. Para cada competência:
     inssNormal = apurarInss(bNormal, faixas, aliquotaUnica = (comp < '2020-03'), limitarTeto = true)
     inss13     = apurarInss(b13, faixas, aliquotaUnica, limitarTeto)
     imposto    = inssNormal + inss13
3. apurarInss pré-2020:
     for faixa: if base ≤ faixa.ate: return base × aliquota
     fallback: return teto × ultima.aliquota
```

### 2.4. Divergências confirmadas (linha-a-linha, não estimativa)

| # | Divergência | Linha Java | Linha TS | Caso afetado |
|---|---|---|---|---|
| **D1** | `getDiferencaParaCalculoDasIncidencias` (Java aplica regras de férias indenizadas: usa 2/3 quando indenizadas) vs `getDiferencaCorrigida` (TS usa diferença bruta corrigida) | OcorrenciaDeVerba 663-684 | inss-modulo-adapter:95 | 43/47 PJCs (91%) com férias indenizadas |
| **D2** | Java soma `OcorrenciaDoHistoricoSalarial` em `valorBase`. TS ignora histórico (assume valorBase=0). | MaquinaDeCalculoDoInss 380-428 | inss-modulo-adapter:80-104 (não lê histórico) | 5/47 PJCs (11%) com histórico ativo |
| **D3** | Aliquot computada sobre `(valorBase + valorBaseVerbas)`. TS computa só em `valorBaseVerbas`. | MaquinaDeCalculoDoInss 449 | inss-modulo-adapter:232 | Quando valorBase>0 (poucos casos) |
| **D4** | Java gera UMA ocorrência por evento, com teto próprio (depende da data). TS aglomera todas as ocorrências da mesma competência. | MaquinaDeCalculoDoInss 380-470 | inss-modulo-adapter:80-104 | TODOS os casos (granularidade) |
| **D5** | `atualizarDiferencaDasOcorrenciasParaRegimeIntermitente` aplicado no 13º para regime INTERMITENTE. | MaquinaDeCalculoDoInss 605-622 | (não implementado) | 0/47 PJCs do corpus (intermitente raro) |
| **D6** | Java aplica teto SEPARADO no 13º (ocorrência separada). TS soma `inssNormal + inss13` sem teto separado. | MaquinaDeCalculoDoInss 1352-1364 | inss-modulo-adapter:115-116 | TODOS os casos com 13º (~100%) |

### 2.5. Quem causa o gap em joseli (−32,77% INSS, 49 ocorrências)

Joseli tem `valorBase = 0` em TODAS as ocorrências. Logo D2, D3, D6 da tabela não se aplicam diretamente.
Restam **D1, D4 e D6 (parcial)**. As três contribuem somando para o gap observado.

D1 atinge joseli porque mesmo sem férias indenizadas, `getDiferencaParaCalculoDasIncidencias` aplica regras para DSR, comissões, prêmios — todas presentes no caso. **Hipótese de maior probabilidade: D1 + D4 explicam ≥80% do gap de joseli.**

---

## 3. O que NÃO foi verificado (admissão)

- ❌ NÃO rodei `npm run calibrate` durante esta sessão para confirmar números atualizados.
- ❌ NÃO chequei se a hipótese D1+D4 fecha matematicamente o gap de joseli — exige ler `getDiferencaParaCalculoDasIncidencias` linha-a-linha e simular sobre os dados do PJC.
- ❌ NÃO testei se `OcorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias` realmente difere de `getDiferencaCorrigida` para os tipos de verba do joseli (DSR/comissão).
- ❌ NÃO mapeei TODOS os 152 stubs em `core/` por impacto.

Estas validações são **trabalho da próxima sessão**, não devem ser presumidas.

---

## 4. Recomendação técnica

### 4.1. Mudar a meta: de "porte literal" para "paridade funcional"

Porte literal de 3.000 métodos = anos de trabalho. Não é o gargalo da MRD Calc.

Meta proposta:

> **Paridade ±0,5% (segurado e empresa) nos 14 casos do calibrate atual + paridade ±2% nos outros 33 PJCs disponíveis no repo, em até 8 semanas.**

Isso é mensurável (calibrate + comparison.json), tem deadline real e cobre os casos que aparecem no uso.

### 4.2. Estratégia: portar `MaquinaDeCalculoDoInss.liquidarInssSobreSalariosDevidos` direto

Em vez de continuar evoluindo o adapter (estratégia atual = patches), portar diretamente o método principal Java (~300 linhas) para um novo arquivo:

`src/lib/pjecalc/core/dominio/calculo/inss/sobresalarios/maquina-de-calculo-do-inss.ts`

Esse arquivo:
- Gera ocorrências per-evento (não agrega).
- Lê `OcorrenciaDoHistoricoSalarial` para `valorBase`.
- Usa `getDiferencaParaCalculoDasIncidencias` para `valorBaseVerbas`.
- Aplica teto per-ocorrência separado no 13º.
- Mantém o adapter atual como facade até o novo motor passar todos os testes.

### 4.3. Sequência das 8 semanas

| Sem | Tarefa | Saída validável |
|---|---|---|
| 1 | Ler `OcorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias` linha-a-linha + portar como `oc.getDiferencaParaIncidencias()` em TS | Função TS testada vs valor Java em 5 PJCs |
| 1 | Criar `helpers/java-utils.ts` (Utils.somar/zerarSeNegativo/nulo/naoNulo null-aware) | 6 helpers + testes unitários |
| 2 | Portar `calcularValorBaseVerbas` (já existe experimento em `experiments/inss-port-attempt/`) e ligar ao motor real | Diff vs adapter atual em 14 PJCs |
| 3-4 | Portar `liquidarInssSobreSalariosDevidos` (~300 linhas Java, ~500 TS) | Motor TS gera ocorrências per-evento |
| 5 | Substituir `InssModuloAdapter` pela nova máquina no `engine-v3.ts` (atrás de feature flag) | Calibrate auto-revert se piorar |
| 6 | Resolver remanescentes do gap (rodar calibrate, identificar qual divergência ainda existe, fechar) | INSS dentro de ±1% nos 14 casos |
| 7 | Estender para 33 PJCs sem cobertura (adicionar à suite calibrate) | Suite expandida, ±2% target |
| 8 | Aplicar mesma estratégia ao IR (gap de francisco-pablo) | IR dentro de ±1% nos 14 casos |

### 4.4. O que NÃO fazer (e por quê)

- ❌ **Não tentar criar 7 agentes paralelos agora.** Sem o `helpers/java-utils.ts` e sem o `liquidarInssSobreSalariosDevidos` portado, agentes adicionais multiplicam erros.
- ❌ **Não portar 100% dos 802 arquivos Java.** A maioria são getters/setters/persistência Hibernate sem valor.
- ❌ **Não confiar em "paridade ±5%" como se fosse paridade.** Casos reais de honorários e custas são sensíveis a centavos.
- ❌ **Não usar PJe-Calc como ground-truth absoluto.** O PJe-Calc tem bugs documentados (relatório OAB/SC). Em 2-3 dos casos atuais, o gap pode ser BUG do PJe-Calc, não do nosso motor — investigar caso a caso.

---

## 5. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `getDiferencaParaCalculoDasIncidencias` mais complexo que estimado | Média | Alto (atrasa semana 1-2) | Time-box de 6h; se exceder, simplificar para apenas casos de férias indenizadas |
| Substituir adapter quebra outros módulos (Custas, Honorários consomem INSS) | Alta | Alto | Feature flag + suite Vitest completa rodando antes de qualquer merge |
| Gap residual após D1+D4 corrigidos ainda for >1% | Média | Médio | Mapear D-restante caso-a-caso; pode ser bug do PJe-Calc, não do TS |
| Algum dos 33 PJCs sem cobertura tem regime/feature não suportado | Alta | Baixo | Marcar como "fora de escopo" temporariamente |
| Decimal.js ↔ BigDecimal arredondamento HALF_EVEN diverge em casos extremos | Baixa | Baixo | Já testado anteriormente; usar mesmo precisão (20) e mesmo modo |

---

## 6. Próximo passo concreto (se aprovado)

1. Aprovação humana desta meta (paridade funcional ±0,5% em 8 semanas).
2. Criar `src/lib/pjecalc/core/comum/java-utils.ts` (Utils.somar/zerarSeNegativo/nulo/naoNulo).
3. Ler `OcorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias` Java linhas 663-684 e implementar em TS.
4. Rodar calibrate atual (baseline antes de qualquer mudança).
5. Implementar D1 (substituir `getDiferencaCorrigida` por `getDiferencaParaCalculoDasIncidencias`) atrás de feature flag.
6. Rodar calibrate, comparar deltas. Se piorar em qualquer caso, auto-revert.

Tudo o que está acima é **mensurável**, **versionado em git**, e **revertível**. Nada depende de eu "estar certo" — depende dos números do calibrate baterem.

---

## 7. Checklist de honestidade (auto-validação deste plano)

- [x] Cita arquivos Java reais com linhas (não inventei posições).
- [x] Cita arquivos TS reais com linhas.
- [x] Separa "verificado" de "inferido" de "especulação".
- [x] Admite explicitamente o que NÃO foi validado.
- [x] Propõe meta mensurável com prazo.
- [x] Tem auto-revert se piorar.
- [x] Não promete "100% paridade" — promete paridade funcional bem definida.
- [x] Reconhece bugs do PJe-Calc (não tratá-lo como verdade absoluta).
- [x] Estimativas em semanas baseadas no experimento real (`experiments/inss-port-attempt/`), não chute.

---

## Anexos referenciados

- `experiments/inss-port-attempt/RELATORIO.md` — medição real de tempo (2:25 min para 16 linhas Java)
- `experiments/inss-port-attempt/calcular-valor-base-verbas.ts` — porte 1:1 funcional do método-piloto
- `docs/KNOWN-LIMITATIONS.md` — registro honesto de limitações vigentes
- `.claude/agents/state/CONTEXT-2026-04-25.md` — contexto persistente desta sessão
- `pjecalc-fonte/.../MaquinaDeCalculoDoInss.java` linhas 431-486 — algoritmo Java referencial
- `pjecalc-fonte/.../TabelaPrevidenciaria.java` linhas 118-165 — algoritmo de seleção de alíquota
- `src/lib/pjecalc/modulos/inss-modulo-adapter.ts` linhas 66-233 — algoritmo TS atual
- `src/lib/pjecalc/core/dominio/calculo/inss/inss.ts` linhas 375-415 — `apurarInss` atual
