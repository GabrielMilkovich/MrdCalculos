# PLANO — Port de PJe-Calc v2.15.1 (Java) para TypeScript

> **Estratégia adotada: B — Port focado em `public/reports/` (13 casos .pjc).**
> Prazo-alvo: 3–4 semanas (~9 fases).
> Decisão tomada em 21/04/2026. Estratégia A (port total, 86k linhas, ~6 meses) fica para reavaliação após conclusão de B, se dados de uso real justificarem.

---

## 0. TL;DR

- **É:** port linha-a-linha de métodos Java que são acionados no caminho de execução dos 14 casos `.pjc` de `public/reports/`. Substituição gradual do engine atual em `src/lib/pjecalc/engine-v3.ts` por uma port semanticamente fiel em `src/lib/pjecalc/core/`.
- **Não é:** reescrita criativa; refatoração fora de `src/lib/pjecalc/core/`; port de relatórios JasperReports, persistência, web services ou meta-dados.
- **Fonte canônica:** `./pjecalc-fonte/` (802 arquivos Java decompilados, commitado no repo).
- **Medida de sucesso:** paridade ≤ ±0,01% nos 14 casos `.pjc` + zero crashes em calibrate.

---

## 1. Escopo da Estratégia B

### 1.1. Incluído

Apenas os métodos Java que são de fato chamados durante o cálculo dos 14 casos listados abaixo. Instrumentação de chamadas pode ser usada para identificar esse conjunto antes de portar classe-a-classe.

Casos-alvo em `public/reports/`:

1. `antonio-harley.pjc`
2. `carla-pego.pjc`
3. `caso-real-v2.pjc`
4. `francisco-pablo.pjc`
5. `islan-rodrigues.pjc`
6. `izabela-cristina.pjc`
7. `joseli-silva.pjc`
8. `leandro-casademunt.pjc`
9. `leide-santana.pjc`
10. `pyter-gabriel.pjc`
11. `roque-guerreiro.pjc`
12. `rosicleia-pereira-chaves.pjc`
13. `tiago-jose.pjc`
14. `vanderlei-carvalho.pjc`

### 1.2. Excluído

- Classes `Repositorio*.java`, `Filtro*.java` — camada JPA/Hibernate substituída pelo Supabase client.
- Classes `*JRAdapter*.java` — relatórios JasperReports; o MRD já usa `pdf-report-*.ts`.
- Serviços Seam (`servicos/Servico*.java`) — integrações resolvidas via Edge Functions.
- Meta-dados (`Usuario`, `Perfil`, `Processo`, `AssuntoCnj`) — tabelas Supabase.
- Métodos Java **não acionados** no caminho dos 14 casos (reavaliáveis em Estratégia A futura).

---

## 2. Regras inegociáveis (de `CLAUDE.md`)

- `Decimal.js` com 20 dígitos para TODOS os valores monetários. Nunca `number` nativo, nunca `parseFloat`/`parseInt` em moeda.
- Sem `as any` não justificado.
- Suite de testes Vitest atual não pode quebrar durante nenhuma fase.
- Migrations já aplicadas nunca editadas — só novas.
- RLS do Supabase respeitado.
- Tratamento de erro em queries Supabase (`const { data, error }`).

---

## 3. Arquitetura-alvo

### 3.1. Estrutura de diretórios — espelhamento do Java

```
Java:                                     TypeScript:
negocio/dominio/calculo/Calculo.java   →  src/lib/pjecalc/core/dominio/calculo/calculo.ts
negocio/dominio/calculo/fgts/Fgts.java →  src/lib/pjecalc/core/dominio/calculo/fgts/fgts.ts
negocio/comum/Utils.java               →  src/lib/pjecalc/core/base/comum/utils.ts (já existe)
negocio/constantes/*.java              →  src/lib/pjecalc/core/constantes/*.ts
```

Convenção: `CamelCase.java` → `kebab-case.ts` (ex: `VerbaDeCalculo.java` → `verba-de-calculo.ts`).

### 3.2. Padrões Java → TypeScript

| Java | TypeScript |
|---|---|
| `BigDecimal.multiply(x)` | `dec.times(x)` |
| `BigDecimal.divide(x, 2, HALF_EVEN)` | `dec.div(x).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)` |
| `List<T>` | `T[]` (ou `readonly T[]` quando imutável) |
| `Set<T>` | `Set<T>` (nativo JS) |
| `Map<K,V>` | `Map<K,V>` (nativo JS) |
| `enum` com método | `const object` + `type` união de keys |
| `@Entity`, `@Table`, `@Transient` | ignorados — Supabase gerencia |
| `@OneToMany(LAZY)` | coleções eager, sem proxy |
| `synchronized` | ignorado — JS single-threaded |
| `java.util.Date` / `LocalDate` | `Competencia` / `HelperDate` (`core/base/comum/`) |
| `null`-able sem anotação | explicitar `T \| null` em TS |
| `NegocioException` | classe TS que estende `Error` |

### 3.3. Integração com pipeline v3

O engine portado é agnóstico à origem dos dados. Lê de estruturas TS que:

- Em produção vêm das tabelas `pjecalc_calculos`, `pjecalc_hist_salarial`, etc., preenchidas pela v3 (OCR → staging).
- Em testes vêm de fixtures golden ou instâncias em memória.

`src/lib/pjecalc/service.ts` e `pjc-to-engine.ts` ficam como adapters entre o schema Supabase/XML e os objetos de domínio portados.

---

## 4. Fases

Cada fase é uma PR separada, mergeable, com gate de qualidade. Fase N+1 não começa sem fase N merged e verde.

### Fase 0 — Setup e baseline ← **FASE ATUAL**

Entregáveis:
1. Docs scaffolded (`PORT-PJECALC-PLAN.md`, `PORT-PJECALC-CHANGELOG.md`, `PORT-PJECALC-DECISIONS.md`, `PORT-PJECALC-KNOWN-DIVERGENCES.md`, `AUDITORIA-COMPLETA-PJECALC-vs-MRDCALC.md`).
2. Harness de golden tests + schema de fixture em `src/lib/pjecalc/core/__golden__/`.
3. Feature flags `USE_PORTED_*` + helper `isPortedEnabled()`.
4. Script `scripts/audit-java-vs-ts.ts` para CI.
5. Baseline de calibrate salvo em `docs/baselines/calibrate-fase0.json`.
6. PR `[WIP] feat: port PJe-Calc Fase 0 — setup` aberta, **não mergeada**.

Gate: `vitest` verde, `tsc --noEmit` limpo, calibrate rodando (delta atual aceito como baseline).

### Fase 1 — Fundação: `comum/` e `constantes/`

Escopo-B: apenas helpers e enums acionados pelos 14 casos. Expandir `core/base/comum/` e `core/constantes/` conforme demanda real.

Prioritários:
- `Competencia.java` (completar)
- `HelperDate.java` (completar)
- `Periodo.java`
- `Utils.java` (completar)
- Enums acionados: `TipoDeBaseDoFgtsEnum`, `BaseDeJurosDasVerbasEnum`, `IndiceMonetarioEnum`, `RegimeDoContratoEnum`, outros conforme tracing.

Gate: vitest verde, tsc limpo, calibrate sem piora.

### Fase 2 — Tabelas de índices acionadas

Escopo-B: apenas tabelas/índices usados pelos 14 casos. Provavelmente IPCA-E, SELIC, TR, INPC, IGP-M, FACDT/TUACDT.

Gate: cada tabela com teste golden comparando ≥ 50 competências contra valor esperado (tolerância ≤ 10⁻¹⁰).

### Fase 3 — `verbacalculo/` + `ocorrenciaverba/` (núcleo da verba)

Crítico: `VerbaDeCalculo.java` com 32 de 36 métodos ausentes + classe nova obrigatória `Verba.java` (hoje ausente no TS).

Gate: calibrate dos 14 casos em ≤ ±10%.

### Fase 4 — `cartaodeponto/` + `historicosalarial/`

Crítico: `MaquinaDeCalculoDeCartaoDePonto.java` (hoje 5% coberto).

Regras trabalhistas: art. 71, 66, 73, 253, 384 CLT; Súmulas 60, 113, 172, 437 TST; DSR Lei 605/1949; turnos ininterruptos art. 7º XIV CF; compensação art. 59 CLT; banco de horas; feriados.

Gate: cartão de 12 meses de 3 layouts (ADP, Senior, TOTVS) bate ≤ R$ 0,01.

### Fase 5 — `calculo/inss/` + `calculo/irpf/`

Crítico: `MaquinaDeCalculoDoInss.java` (25%), `MaquinaDeCalculoDeIrpf.java` (7%).

IRPF inclui: tabela histórica 1996-2026, RRA art. 12-A Lei 7.713/1988, 13º isolado, isenções art. 6º Lei 7.713/88, deduções, SELIC sobre diferenças.

Gate: caso RRA complexo bate ≤ R$ 0,01.

### Fase 6 — `calculo/fgts/` + `calculo/custas/` + `calculo/honorarios/`

Regras: multa 40% / 20%, saques no curso (doença, aposentadoria), expurgos Planos Verão/Collor; art. 791-A CLT pós-reforma; honorários periciais.

Gate: casos de multa 40%, 467, 477, honorários sucumbenciais em causa mista.

### Fase 7 — `pagamento/` (rateio e débitos/créditos)

Crítico: `Atualizacao.java` (8%), `Pagamento.java` (11%).

Regras: ordem de imputação (art. 354 CC adaptado trabalhista), rateio proporcional, ADC 58/59 STF (IPCA-E → SELIC pós-citação), juros pré-judiciais, Súmula 381/450 TST (taxa negativa).

Gate: calibrate em ≤ ±2%.

### Fase 8 — Orquestrador central + órfãos

Crítico: `Calculo.java` (26%, 239 métodos).

Menores: `ParametrosDeAtualizacao`, `previdenciaprivada`, `salariofamilia`, `segurodesemprego`, `pensaoalimenticia`, `multa`, `ferias`, `faltas`, `juros`, `formula`.

Gate: calibrate em ≤ ±0,5%.

### Fase 9 — Convergência

1. Refatorar `engine-v3.ts` + `orchestrator.ts` como fachadas delegando a `core/`.
2. Consertar `pjc-to-engine.ts` para mapear 100% das verbas do XML.
3. Migrar `verba-modules/*.ts` para o engine portado.
4. Remover feature flags `USE_PORTED_*` (port ativada permanentemente).
5. Descartar código morto.

Gate final: calibrate em ≤ ±0,01%, zero crashes, suite Vitest verde, cobertura linha-a-linha nas categorias 1/2/3 ≥ 95% (auditoria automatizada em CI).

---

## 5. Metodologia de testes — "golden"

### 5.1. Golden end-to-end (método principal da Estratégia B)

Os 14 `.pjc` de `public/reports/` são a fonte da verdade. Cada `.pjc` é um XML com inputs + outputs calculados pelo PJe-Calc real.

- Fixtures em `src/lib/pjecalc/core/__golden__/fixtures/`.
- Harness em `src/lib/pjecalc/core/__golden__/runner.ts`.
- Schema em `src/lib/pjecalc/core/__golden__/types.ts`.

### 5.2. Golden de método (quando necessário)

Para métodos de alto risco (IRPF RRA, INSS faixas históricas, rateio), fixtures específicas comparam valor TS ↔ valor extraído do `.pjc` para aquele método isolado.

### 5.3. Regressão contínua

- Todo golden vira parte de `npx vitest run` (não excluído).
- Teste `regressao-calculo-portado-vs-atual.test.ts` roda cada caso com flag ON (portado) e OFF (atual) — diferença nunca pode piorar.

---

## 6. Não-regressão durante o port

### 6.1. Código antigo

- O engine atual (`engine-v3.ts`, `orchestrator.ts`, `verba-modules/*`) continua funcionando durante todas as fases.
- Ninguém apaga ou refatora código antigo até Fase 9.
- Cada módulo portado ganha feature flag `USE_PORTED_<MODULO>` em `.env`:

```
VITE_USE_PORTED_IRPF=false
VITE_USE_PORTED_INSS=false
VITE_USE_PORTED_FGTS=false
VITE_USE_PORTED_CARTAO=false
VITE_USE_PORTED_ATUALIZACAO=false
VITE_USE_PORTED_PAGAMENTO=false
VITE_USE_PORTED_CALCULO=false
```

Rollback instantâneo: flag → `false` + redeploy.

### 6.2. Tolerância a bugs do PJe-Calc original

**Durante o port: fidelidade semântica absoluta.** Se o Java faz X, o TS faz X. Bugs óbvios do PJe-Calc são preservados e documentados em [PORT-PJECALC-KNOWN-DIVERGENCES.md](./PORT-PJECALC-KNOWN-DIVERGENCES.md), **nunca** corrigidos no port.

Após conclusão da Estratégia B (±0,01% nos 14 casos), uma fase separada revisa divergências e decide caso-a-caso, com flag de rollback.

---

## 7. Fluxo de trabalho por sessão

### 7.1. Abertura

1. Ler `CLAUDE.md`, `docs/PORT-PJECALC-PLAN.md`, fase atual.
2. `git pull` na branch da fase.
3. `npx vitest run` — confirmar ponto de partida verde.
4. `npm run calibrate` — salvar snapshot.
5. Abrir arquivos Java em `pjecalc-fonte/` + TS existentes.
6. Usar `ultrathink` em decisões ambíguas.

### 7.2. Ciclo de port

Para cada classe Java:
1. Leia o `.java` inteiro antes de traduzir.
2. Identifique dependências (se alguma ainda não portada, porte-a primeiro).
3. Crie/atualize o `.ts` espelho.
4. Porte método a método preservando semântica.
5. Escreva teste golden simultaneamente.
6. `npx vitest run <arquivo>` — verde.
7. `npx tsc --noEmit` — limpo.
8. Commit pequeno: `port: <classe>.<metodo> + teste golden`.

### 7.3. Fechamento

1. `git diff --stat`.
2. `npx vitest run` completo.
3. `npm run calibrate` — não pode piorar.
4. Documentar em [PORT-PJECALC-CHANGELOG.md](./PORT-PJECALC-CHANGELOG.md).
5. Push.

---

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Tempo excede 4 semanas | Escopo-B é por definição focado; se expandir para A, documentar e reavaliar |
| Java decompilado ambíguo | `ultrathink` + consulta a outros métodos chamadores; nunca inventar |
| Bugs do Java sendo portados fielmente | Documentar em KNOWN-DIVERGENCES, corrigir em fase posterior |
| Divergência decompilado vs JAR | Testes golden usam `.pjc` reais, não recompilação Java |
| Feature flags poluindo | Expiram na Fase 9 |

---

## 9. Critérios de aceite finais (ao fim da Fase 9)

### 9.1. Paridade

- [ ] Calibrate dos 14 casos `.pjc` em ≤ ±0,01%
- [ ] Zero crashes em calibrate
- [ ] 5+ casos reais do escritório Milkovich validados por perito ≤ R$ 0,01

### 9.2. Cobertura (Estratégia B)

- [ ] 100% dos métodos acionados pelos 14 casos portados
- [ ] `VerbaDeCalculo.java`: 36/36 métodos de negócio portados
- [ ] `Verba.java`: classe nova portada
- [ ] `MaquinaDeCalculoDeCartaoDePonto.java`: paridade por caso ≤ R$ 0,01
- [ ] `MaquinaDeCalculoDeIrpf.java`: paridade por caso ≤ R$ 0,01
- [ ] `Atualizacao.java`: paridade por caso ≤ R$ 0,01
- [ ] `Calculo.java`: orquestrador ≥ 95% dos 239 métodos portados

### 9.3. Qualidade técnica

- [ ] ≥ 1.500 testes Vitest verdes
- [ ] ≥ 200 testes golden específicos Java → TS (escopo B)
- [ ] `npx tsc --noEmit` limpo
- [ ] Nenhum `as any` não justificado
- [ ] Todo valor monetário em `Decimal.js`
- [ ] Todas as flags `USE_PORTED_*` removidas
- [ ] `engine-v3.ts` delega a `core/`
- [ ] `pjc-to-engine.ts` mapeia 100% das verbas

### 9.4. Integração

- [ ] Pipeline v3 (OCR → staging → engine portado) end-to-end em 3+ casos reais
- [ ] Badge de paridade no README
- [ ] `PORT-PJECALC-COMPLETA.md` escrito

### 9.5. Manutenibilidade

- [ ] Script `scripts/audit-java-vs-ts.ts` roda em CI
- [ ] Regressão de cobertura detectada em PR via esse script

---

## 10. Paralelismo entre sessões

Podem paralelizar (branches independentes, merges sequenciais em `feat/pjecalc-port-completa` ou equivalente):

- Fase 2 (tabelas) ⫫ Fase 1 (comum/constantes), se enums em Fase 1 vierem primeiro.
- Fase 5 INSS ⫫ Fase 5 IRPF.
- Fase 6 FGTS ⫫ Fase 6 Custas ⫫ Fase 6 Honorários.

**NÃO podem paralelizar:**

- Fase 3 (verbacalculo) precede Fase 4 (cartão usa `CartaoDePontoDaVerba`).
- Fase 7 (pagamento) depende de Fase 5 + 6.
- Fase 8 (`Calculo.java` central) depende de todas.
- Fase 9 é sequencial e final.

---

## 11. Observações operacionais (Fase 0)

- **Branch de desenvolvimento:** esta Fase 0 está sendo desenvolvida em `claude/audit-pjecalc-mrdcalc-2A322` (branch designado pelo harness de sessão). PR #17 (fix typo calibrate) já consta no histórico desta branch em `8d4e450`. Caso o usuário prefira consolidar em `feat/pjecalc-port-completa`, basta renomear ou cherry-pick na review.
- **PR Fase 0:** `[WIP] feat(port): PJe-Calc Fase 0 — setup` — aberta, não mergeada até validação humana.
- **Próxima sessão:** Fase 1 inicia em branch nova a partir da Fase 0 merged.
