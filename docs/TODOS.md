# MRD Calc — Catálogo de TODOs / FIXMEs

**Data de catalogação:** 2026-04-29
**Total identificados (após filtro de comentários reais):** 114
- Produção (`src/`): 80
- Testes/edge-cases: 34

Este documento agrupa todos os marcadores `TODO` e `FIXME` rastreados no
código por **categoria de prioridade** (P0/P1/P2/cosmético) e indica
**bloqueadores explícitos** quando aplicável.

> Convenção: o sufixo entre parênteses (`fase-N`, `integracao-futura`,
> `fora de escopo`) reflete o port progressivo do core Java do PJe-Calc
> oficial. Itens sem sufixo são pendências de produto, não de port.

---

## P0 — Bloqueadores ou risco operacional imediato

Nenhum TODO marcado como bloqueador efetivo. Itens de port (`fase-*`)
são gerenciados pelo plano de portagem em
`docs/PORT-PJECALC-PLAN.md` e não bloqueiam o engine V3 atualmente em
produção (`src/lib/pjecalc/engine-v3.ts`).

### Pendências críticas potenciais (verificar antes de escalar para
produção em casos pré-1994 ou com cartao-ponto OCR truncado)

- `src/components/cases/PjeCalcInline.tsx:399` — `cartaoPonto: []` não
  carregado no preview da check (pode subestimar HE em casos com
  ponto). **Status:** mitigado por warning na UI.
- `src/lib/pjecalc/core/comum/rotinasdecalculo/calculador-de-indices.ts:21`
  — popular valores históricos reais quando casos pré-1994 forem
  processados. **Status:** stub seguro retornando `1.0` (sem correção)
  quando a competência é < 1994.

---

## P1 — Port Java→TS do core (planejado em `docs/PORT-PJECALC-PLAN.md`)

A grande maioria dos TODOs do código está concentrada no diretório
`src/lib/pjecalc/core/` — port em fases do PJe-Calc Java oficial.
Quando a flag `VITE_USE_PORTED_<MODULO>=true` está off (padrão), o
engine legado/V3 cobre o caso, então estes TODOs **não afetam o
resultado em produção**.

### fase-6 — Atualização ocorrências INSS

- `src/lib/pjecalc/core/dominio/calculo/inss/sobresalarios/ocorrencia-de-inss-sobre-salarios-devidos-atualizacao.ts:87` — `atualizarJurosDoCalculoExterno` (Java linha 132)
- `src/lib/pjecalc/core/dominio/calculo/inss/sobresalarios/ocorrencia-de-inss-sobre-salarios-devidos-atualizacao.ts:125` — somar `ultima.getJurosDiferenca()` em CalculoExterno
- `src/lib/pjecalc/core/dominio/calculo/inss/sobresalarios/ocorrencia-de-inss-sobre-salarios-pagos-atualizacao.ts:79` — `atualizarJurosDoCalculoExterno` (Java linha 131)

### fase-7 — IRPF avançado

- `src/lib/pjecalc/core/dominio/calculo/irpf/maquina-de-calculo-de-irpf.ts:56` — percorrer `calculo.verbasAtivas`
- `src/lib/pjecalc/core/dominio/calculo/irpf/maquina-de-calculo-de-irpf.ts:72` — IRPF
- `src/lib/pjecalc/core/dominio/calculo/irpf/maquina-de-calculo-de-irpf.ts:82` — IRPF
- `src/lib/pjecalc/core/dominio/calculo/irpf/maquina-de-calculo-de-irpf.ts:87` — IRPF (junção fase-9)
- `src/lib/pjecalc/core/dominio/calculo/irpf/maquina-de-calculo-de-irpf.ts:92` — IRPF (junção fase-9)
- `src/lib/pjecalc/core/dominio/calculo/irpf/maquina-de-calculo-de-irpf.ts:101` — IRPF
- `src/lib/pjecalc/core/dominio/calculo/irpf/maquina-de-calculo-de-irpf.ts:106` — IRPF
- `src/lib/pjecalc/core/dominio/calculo/irpf/maquina-de-calculo-de-irpf.ts:111` — IRPF
- `src/lib/pjecalc/core/dominio/calculo/irpf/maquina-de-calculo-de-irpf.ts:116` — IRPF
- `src/lib/pjecalc/core/dominio/calculo/irpf/tabela-de-juros-de-irpf.ts:11` — depende de `JurosSelicIrpf.obterTodosPorPeriodo`
- `src/lib/pjecalc/core/dominio/calculo/irpf/tabela-de-juros-de-irpf.ts:32` — `carregarTabelaDeJurosSelic`

### fase-8 — Filtros de honorário/multa (infra repositórios)

- `src/lib/pjecalc/core/dominio/calculo/honorarios/filtro-de-honorario.ts:22`
- `src/lib/pjecalc/core/dominio/calculo/multa/filtro-de-multa.ts:18`

### fase-9 — Pagamento (rateio + filtro)

- `src/lib/pjecalc/core/dominio/pagamento/filtro-do-pagamento.ts:17`
- `src/lib/pjecalc/core/dominio/pagamento/maquina-de-rateio-do-pagamento.ts:61`

### fase-10 — Calculo (TabelaDeJuros + filtro + getValorBruto)

- `src/lib/pjecalc/core/dominio/calculo/filtro-do-calculo.ts:54` — RepositorioDeCalculo
- `src/lib/pjecalc/core/dominio/calculo/calculo.ts:1010` — `getValorBruto` port fiel ao Java
- `src/lib/pjecalc/core/dominio/calculo/tabela-de-juros-do-calculo.ts:117` — delegar para `TabelaDeJuros` de comum

### fase-11/12 — Verba calculada/informada (formula + reflexo)

- `src/lib/pjecalc/core/dominio/verbacalculo/filtro-de-verba-de-calculo.ts:21`
- `src/lib/pjecalc/core/dominio/verbacalculo/maquina-de-calculo-da-verba-calculada.ts:28`
- `src/lib/pjecalc/core/dominio/verbacalculo/maquina-de-calculo-da-verba-informada.ts:21`

### fase-13 — Cartão de ponto + jornada

- `src/lib/pjecalc/core/dominio/cartaodeponto/cartao-de-ponto-utils.ts:58` — `horasParaAcrescentar`
- `src/lib/pjecalc/core/dominio/cartaodeponto/filtro-do-cartao-de-ponto.ts:19`
- `src/lib/pjecalc/core/dominio/cartaodeponto/filtro-da-apuracao-cartao-de-ponto.ts:15`
- `src/lib/pjecalc/core/dominio/cartaodeponto/jornada-diaria.ts:98` — horas noturnas com prorrogação
- `src/lib/pjecalc/core/dominio/verbacalculo/maquina-de-calculo.ts:14` — PERIODO_AQUISITIVO depende de Ferias
- `src/lib/pjecalc/core/dominio/verbacalculo/maquina-de-calculo.ts:304` — porte completo exige Ferias (GOZADAS/INDENIZADAS)
- `src/lib/pjecalc/core/dominio/verbacalculo/maquina-de-calculo.ts:409` — `diasParaExcluir` (Java 459-474)
- `src/lib/pjecalc/core/dominio/verbacalculo/maquina-de-calculo.ts:510` — depende de `FormulaReflexo` com BaseVerba iterável

### fase-14 — Apuração diária

- `src/lib/pjecalc/core/dominio/cartaodeponto/maquina-de-calculo-de-cartao-de-ponto.ts:61` — fluxo completo do Java
- `src/lib/pjecalc/core/dominio/cartaodeponto/maquina-de-calculo-de-cartao-de-ponto.ts:73` — `ApuracaoDiariaCartao`
- `src/lib/pjecalc/core/dominio/calculoexterno/parcelas-atualizaveis-custas-utils.ts:25` — `descontoCreditosDoReclamante.salvar(true)`

### fase-15 — Cálculo externo (parcelas atualizáveis)

20 itens em `src/lib/pjecalc/core/dominio/calculoexterno/*.ts` —
todos relacionados a `ParcelasAtualizaveis*Utils`:

- `parcelas-atualizaveis-debitos-reclamante-utils.ts:14, 34, 42, 49`
- `parcelas-atualizaveis-creditos-reclamante-utils.ts:48, 55, 61, 66, 68`
- `parcelas-atualizaveis-honorario-utils.ts:77`
- `parcelas-atualizaveis-desconto-creditos-reclamante-utils.ts:38, 44, 46, 81, 96`
- `parcelas-atualizaveis-multa-indenizacao-utils.ts:68`
- `parcelas-atualizaveis-outros-debitos-reclamado-utils.ts:39, 48, 68, 90, 113`

### integracao-futura — repositórios pendentes

- `src/lib/pjecalc/core/dominio/calculo/custas/maquina-de-calculo-de-custas.ts:316` — ramo BRUTO_DEVIDO_AO_RECLAMANTE_MAIS_DEBITOS_RECLAMADO
- `src/lib/pjecalc/core/dominio/calculo/inss/inss.ts:301` — repositório de geração de ocorrências
- `src/lib/pjecalc/core/dominio/calculo/inss/tabela-de-juros-de-inss.ts:267, 310, 362` — delegar para parent TabelaDeJuros
- `src/lib/pjecalc/core/dominio/calculo/inss/sobresalarios/maquina-de-calculo-do-inss.ts:60, 415` — fluxo completo + amortizar pagamento
- `src/lib/pjecalc/core/dominio/inss/multa/taxa-multa-previdenciaria.ts:128` — `resolverTaxaCalculoExterno`
- `src/lib/pjecalc/core/dominio/calculo/atualizacao/indice-precatorio.ts:211` — `IndiceTR/IndiceIPCAE` portados

---

## P2 — Integrações externas (HTTP/PDF assinaturas)

### Rede / autenticação ICP-Brasil

- `src/lib/pjecalc/esocial-http-client.ts:8` — fora de escopo da task atual
- `src/lib/pjecalc/pje-http-client.ts:11` — Autenticação mTLS com cert ICP-Brasil A1/A3
- `src/lib/pjecalc/pje-integration.ts:259` — implementar envio HTTP real ao PJe
- `src/lib/crypto/icp-brasil.ts:149` — validação completa da cadeia contra AC Raiz Brasileira v5/v6
- `src/lib/crypto/icp-brasil.ts:224` — embed real (parsing low-level do PDF)
- `src/lib/crypto/icp-verificador.ts:143` — parsing /ByteRange + /Contents e validação CMS

---

## P2 — Termos / bases tabeladas pendentes

- `src/lib/pjecalc/core/dominio/termo/base-tabelada.ts:38` — TETO_INSS requer tabela histórica de tetos previdenciários
- `src/lib/pjecalc/core/dominio/termo/base-tabelada.ts:39` — SALARIO_DA_CATEGORIA requer lookup em `pjecalc_salario_categoria_ocorrencia`
- `src/lib/pjecalc/core/dominio/termo/base-tabelada.ts:40` — HISTORICO_SALARIAL requer lookup em `pjecalc_hist_salarial_mes`
- `src/lib/pjecalc/core/dominio/termo/quantidade.ts:259` — requer `CartaoDePontoDaVerba + OcorrenciaDoCartaoDePonto`
- `src/lib/pjecalc/core/dominio/termo/comportamento/comportamento-media-pelo-valor.ts:47` — `TabelaDeCorrecaoMonetaria` quando corrigir=true
- `src/lib/pjecalc/core/dominio/termo/comportamento/comportamento-media-pelo-valor.ts:48` — `calcularFatorDasCompetencias`
- `src/lib/pjecalc/core/dominio/termo/comportamento/comportamento-media-pelo-valor.ts:160` — fator de conversão entre última competência e data do reflexo

---

## Cosméticos / referências em testes

### Edge-case tests (features não implementadas registradas como TODO em testes)

34 TODOs em `src/lib/pjecalc/__tests__/edge-cases/*.ts` — descrevem
features não implementadas que estão **explicitamente skipped**:

- `p0-bloqueadores.test.ts` — regimes RURAL, APRENDIZ, ESTAGIARIO,
  reconvenção, pensão alimentícia ativa, split entre herdeiros, RRA
  curto, servidor público temp
- `p1-regulatorios.test.ts` — ADC 58, EC 113, Lei 14.973/2024,
  Lei 14.905/2024, insalubridade regional, acumulação de adicionais,
  hora noturna reduzida, salário-família, Simples Nacional
- `p2-validacao-inputs.test.ts` — múltiplas correções

Estes não são TODOs ativos — são placeholders para regressão quando
as features forem implementadas.

---

## Resumo executivo

| Categoria              | Quantidade |
| ---------------------- | ---------- |
| **Bloqueadores ativos**| 0          |
| **Port Java fase-6 a fase-15** | 60+ |
| **Integrações HTTP/ICP** | 6        |
| **Termos/bases tabeladas** | 7      |
| **Tests edge-case (skipped)** | 34 |

**Conclusão:** o engine V3 (`src/lib/pjecalc/engine-v3.ts`, motor
canônico em produção) **não tem TODO bloqueador**. Todos os itens
restantes ou (a) estão sob feature flag desligada e cobertos pelo
caminho legado, ou (b) referem-se a integrações externas (HTTP/ICP)
fora do escopo do cálculo trabalhista, ou (c) são testes de
features ainda não implementadas.

---

_Catalogo gerado a partir de: `grep -rE "(//|/\*|^\s*\*)\s*(TODO|FIXME)\b" src/`._
