# PORT PJe-Calc — Changelog

Log de classes portadas por sessão. Cada entrada: data, fase, classe Java, linhas Java, linhas TS resultantes, testes adicionados, impacto no calibrate.

---

## Formato

```
### YYYY-MM-DD — Fase N — Sessão #M

**Classes portadas:**
- `CaminhoJava.java` (N linhas Java → M linhas TS) — M métodos; T testes golden
  - Observações: ...

**Impacto no calibrate:**
- Delta médio antes: X%
- Delta médio depois: Y%
- Casos melhorados: ...
- Casos inalterados: ...
- Casos piorados (investigar!): ...

**Divergências descobertas:**
- (vide PORT-PJECALC-KNOWN-DIVERGENCES.md)
```

---

## 2026-04-22 — Fase 0 — Sessão #1 (setup)

**Atividades:**
- Docs scaffolded (`PORT-PJECALC-PLAN.md`, `CHANGELOG`, `DECISIONS`, `KNOWN-DIVERGENCES`).
- `AUDITORIA-COMPLETA-PJECALC-vs-MRDCALC.md` consolidado.
- Harness de golden tests criado em `src/lib/pjecalc/core/__golden__/`.
- Feature flags `USE_PORTED_*` + helper `isPortedEnabled()`.
- Script `scripts/audit-java-vs-ts.ts` para CI.
- Baseline de calibrate capturado em `docs/baselines/calibrate-fase0.json`.

**Classes portadas:** nenhuma (setup).

**Impacto no calibrate:** baseline (N/A — ponto zero).

---

## 2026-04-22 — Fase 1 — Sessão #1 (fundação — `base/comum/` + `constantes/`)

**Classes portadas:**
- `base/comum/Constantes.java` (17 linhas Java → 44 linhas TS) — marcos legais
  (Reforma Trabalhista 11/11/2017, Reforma Previdência 01/03/2020, Lei
  12.506/2011 aviso prévio proporcional), separadores e constantes numéricas.
- `base/comum/HelperIterate.java` (25 linhas Java → 36 linhas TS) — wrapper
  fluente `iterate(coll).where(pred)`. Preserva simetria com código cliente
  que será portado em fases seguintes.
- `base/comum/Utils.java` — string helpers ausentes (isVazio, isNaoVazios,
  substituirPontoPorVirgula, filtrarSomenteNumeros, objetoParaString).
- 6 enums espelhados em arquivos individuais `constantes/<nome>.ts`:
  - `TipoDeVerbaEnum` (P/R)
  - `TipoFeriadoEnum` (F/P/B)
  - `AbrangenciaDoFeriadoEnum` (F/E/M — Federal/Estadual/Municipal)
  - `TipoSalarioPagoEnum` (N/U/M/H)
  - `TipoValorCalculadoEnum` (VALOR_DEVIDO/VALOR_PAGO)
  - `DestinoDoFgtsEnum` (P/D + nome + mensagem)

  Padrão adotado: `enum X { A = 'A' }` + `XNomes: Record<X, string>`
  companion map quando Java tem campo `nome` (ou `mensagem`) associado.

**Testes adicionados:** 34 novos
- 6 Constantes (marcos legais)
- 5 HelperIterate (iteração, null-safety, Iterable customizado)
- 12 string helpers de Utils
- 11 enums espelhados (cobre todos os 6 enums + companion maps)

**Gate Fase 1:**
- Vitest: 707 passed | 6 skipped | 0 failed (55 suites, +34 testes novos).
- `tsc --noEmit`: limpo.
- `npm run calibrate`: 13/13 casos válidos, delta médio **-30,68%**
  (idêntico ao baseline Fase 0 — ausência de regressão confirmada).
- `npm run audit:port:check`: OK (cobertura subiu 17,6% → 17,7%).

**Classes fora desta sessão (decisão explícita):**
- `Competencia.java`, `HelperDate.java`, `Periodo.java` já estão 95%+
  cobertas — sem gap material acionável pelos 14 casos.
- Métodos de Utils omitidos: reflexão, Groovy shell, I/O (GZIP/ZIP),
  ResourceBundle, formatação UI — fora do caminho de cálculo.
- `TipoDeCorrecaoDoFgtsEnum` (polimórfico com `abstract indice(OcorrenciaDeFgts)`)
  — port adiado para Fase 6, quando `OcorrenciaDeFgts` for completado.

**Impacto no calibrate:** nulo (fundação; impacto real começa a Fase 3).

**Divergências descobertas:** nenhuma.

---

## 2026-04-22 — Fase 2 — Sessão #1 (tabelas de índices)

**Escopo:** golden tests para as 7 tabelas de índices já populadas (Jan/2005 → Fev/2026, 254 competências cada).

**Atividades:**
- Novo arquivo `src/lib/pjecalc/core/dominio/indices/__tests__/tabelas-indices.golden.test.ts` com 4 camadas de validação por tabela:
  1. Snapshot SHA-256 da tabela inteira (detecta mudanças acidentais).
  2. Amostra longitudinal (≥50 competências) com `toBeCloseTo(taxa, 10)`.
  3. Validação de cálculo acumulado (multiplicativo para IPCA-E, somatório simples para SELIC).
  4. Integridade estrutural (sem buracos entre meses) + range plausível.

**Tabelas validadas:**
- `TABELA_IPCAE` — 50+ competências, acumulado Jan-Dez/2020 ≈ 4,52% (IBGE oficial).
- `TABELA_IPCA` — 15+ competências, snapshot.
- `TABELA_TR` — período zero-TR 2017-2021 validado.
- `TABELA_SELIC_MENSAL` — mínimo pandemia 2020-08, pico SELIC 2023, acumulado ≈ 12% em 2023.
- `TABELA_INPC` / `TABELA_IGPM` / `TABELA_IPC` — sanity (integridade + range + hash).

**Divergências descobertas:**
- **DV-001** — `TABELA_IPCA` é cópia byte-a-byte de `TABELA_IPCAE` (mesmo hash SHA-256). IBGE publica IPCA e IPCA-E como séries distintas com diferenças de 0,01 a 0,5% em picos. Afeta casos com combinações `"indice":"IPCA"` (ex: leide-santana pós-2024-08-30). Preservada por fidelidade; correção pós-Fase 9. Ver `PORT-PJECALC-KNOWN-DIVERGENCES.md` DV-001.

**Classes fora desta sessão (decisão explícita):**
- `JurosTaxaLegal.java` (TAXA_LEGAL): Warning W047 do calibrate indica que o engine atual já tolera ausência dos dados via fallback. Port adiado para Fase 6 (FGTS) onde os dados seriam populados com Lei 14.905/2024.
- SELIC diária, SELIC Fazenda, JAM, DFP, DNFP, IT, Tabela Única, precatórios — tabelas com esqueleto mas sem dados populados; port adiado até haver caso que as acione.

**Gate Fase 2:**
- Vitest: 734 passed | 6 skipped | 0 failed (+27 testes novos vs Fase 1).
- `tsc --noEmit`: limpo.
- `npm run calibrate`: 13/13 válidos, delta médio **-30,68%** (idêntico Fase 0/1 — sem regressão).
- `npm run audit:port:check`: OK.

**Impacto no calibrate:** nulo (adicionar testes não muda comportamento do engine).

---

## 2026-04-22 — Fase 3 — Sessão #1 (núcleo da verba — `verba/` + `verbacalculo/`)

**Escopo:** port linha-a-linha das classes de domínio base de verba + dos 10
métodos de vinculação (cartões/históricos/vales) que estavam ausentes em
`VerbaDeCalculo` e eram causa raiz do bug do conversor `.pjc` descartar 34%
das verbas (auditoria §7).

**Classes portadas:**

- `constantes/CaracteristicaDaVerbaEnum.java` (92 linhas Java, polimórfico) →
  `core/constantes/caracteristica-da-verba-operadores.ts` (108 linhas TS).
  Em Java cada constante do enum sobrescreve métodos abstratos
  (`definirOcorrenciaDePagamentoPara`, `getOcorrenciaDePagamento`,
  `permiteAlterarAOcorrenciaDePagamento`). Em TS adotamos padrão *strategy*
  via `Record<Enum, Operador>` com closures — preserva semântica 1-a-1 sem
  recorrer a classes derivadas ou `as any`.

- **`dominio/verba/Verba.java`** (808 linhas Java, ANTES **AUSENTE** no TS) →
  `core/dominio/verba/verba.ts` (498 linhas TS). Classe de domínio base.
  Cobre 100% dos métodos de negócio do Java:
  - 34 getters/setters (metadados, incidências, exclusões)
  - 4 mutadores fluentes de característica (`comCaracteristicaComum`,
    `comCaracteristicaDeDecimoTerceiro`, `comCaracteristicaDeAvisoPrevio`,
    `comCaracteristicaDeFerias`)
  - 4 mutadores fluentes de ocorrência de pagamento (`pagamento*`)
  - 4 predicados `isVerba*` + 4 predicados `isComPagamento*`
  - `isValorCalculado` / `isValorInformado`, `isPrincipal` / `isReflexo`
  - `isInformarDivisor`, `isComportamento{ValorMensal,MediaPeloValor,MediaPelaQuantidade}`
  - `isTipoDaQuantidade{Informada,Avos,ImportadaDoCalendario,ImportadaDoCartaoDePonto}`
    (a última preserva bug Java que sempre retorna false — DV-002)
  - `isPermiteAplicarPropocionalidadeABase` / `...AQuantidade`
  - `permiteAlterarOcorrenciaDePagamento` via operador polimórfico
  - `setCaracteristica` com side-effect de redefinição de ocorrência
  - `validar()` — NegocioException com MSG0003/MSG0004, fiel ao Java
    (incluindo o `throw` imediato no ramo `Reflexo && multiplicador==0`)
  - `montarNomeCompleto(Set<Verba>|null)` com regra "descrição SOBRE principal"
  - `aplicarConfiguracaoImplicita()` (substitui `salvar()` que em Java chamava
    `configurarVerbaInformada` / `configurarVerbaPrincipal` — responsabilidade
    de persistência movida para o service Supabase)

- `dominio/verbacalculo/VerbaDeCalculo.java` — **10 métodos de vinculação**
  (linhas Java 847–975) anexados a `verba-de-calculo.ts`:
  - `adicionarCartoesVinculadosAtravesDaQuantidade` / `...DoDivisor`
  - `removerDosCartoesDaVerbaDaQuantidade` / `...DoDivisor`
  - `adicionarHistoricosVinculadosAtravesDoValorDevido` / `...ValorPago`
  - `removerDosHistoricosDaVerbaDoValorDevido` / `...ValorPago`
  - `adicionarValesVinculadosAtravesDoValorDevido` / `...ValorPago`
  - `removerDosValesDaVerbaDoValorDevido` / `...ValorPago`

  Contrato preservado 1-a-1 com Java: `adicionar*` limpa a lista destino e
  chama `setVerbaDeCalculo(this)` em cada item; `remover*` só descarta itens
  com `id != null` (itens transientes permanecem — regra do Java mantida).

- Enum `BaseDeCalculoDoPrincipalEnum` em `constantes/enums.ts` — valores
  `HISTORICO_SALARIAL = 'HS'` e `VALE_TRANSPORTE = 'VT'` acrescidos
  (estavam ausentes). Java tem 6 valores; TS tinha 4.

**Testes adicionados:** 70 golden tests
- 55 em `core/dominio/verba/__tests__/verba.golden.test.ts`:
  - 17 defaults do construtor (paridade com Verba.java)
  - 4 mutadores fluentes de característica
  - 4 `permiteAlterarOcorrenciaDePagamento` por característica
  - 10 operadores polimórficos (includes null-safety)
  - 9 `validar()` — ramos principal/reflexo, MSG0003/MSG0004,
    caso especial do `throw` direto em reflexo com multiplicador 0
  - 4 `montarNomeCompleto` (principal, reflexo com/sem bases, explícito)
  - 3 `aplicarConfiguracaoImplicita`
  - 4 `isPermiteAplicarPropocionalidade*`
- 15 em `core/dominio/verbacalculo/__tests__/verba-de-calculo-vinculacao.golden.test.ts`:
  - 4 cartões quantidade + divisor (adicionar/remover/re-invocar)
  - 6 históricos valor-devido + valor-pago (+ independência entre coleções)
  - 4 vales valor-devido + valor-pago
  - 1 re-ancoragem entre verbas (paridade Java: item re-vinculado)

**Divergências descobertas:**
- **DV-002** — `Verba.isTipoDaQuantidadeImportadaDoCartaoDePonto()` retorna
  `false` incondicionalmente no Java (linha 678-680). Port preserva o bug
  para paridade. Correção futura: o método deveria checar
  `TipoDeQuantidadeEnum.IMPORTADA_DO_CARTAO_DE_PONTO` (valor que não existe
  no enum atual — provavelmente removido entre versões). Ver
  `PORT-PJECALC-KNOWN-DIVERGENCES.md` DV-002.

**Classes fora desta sessão (decisão explícita — escopo Fase 3 limitado):**
- `Calculo.java` (3.087 linhas Java, 816 TS) — orquestrador central, 239
  métodos. Gap de ~2.271 linhas. Permanece parcialmente portado.
  Consolidação/completion ficará para **Fase 8** (orquestrador final).
- `VerbaDeCalculo.java` restante (1.598 linhas Java) — os outros 22 métodos
  de negócio (ajuste de juros, consistência, gestão manual de ocorrências,
  gerar/copiar) ficam pendentes. Esta sessão portou os 10 mais críticos.
- `OcorrenciaDeVerba.java` (786 linhas) — expansão dos métodos ausentes
  fica para sessão seguinte. A estrutura base já existe em
  `ocorrenciaverba/ocorrencia-de-verba.ts`.
- Subclasses concretas (`Calculada`, `Informada`, `Reflexo`, `Principal`)
  já existem no TS e permanecem inalteradas nesta sessão.
- 6 coleções de vinculação adicionadas a `VerbaDeCalculo` são usadas apenas
  em memória — NÃO há wiring com o engine atual (isso fica para Fase 9).
  Port garantiu o contrato semântico; ativação virá depois.

**Gate Fase 3:**
- Vitest: 804 passed | 6 skipped | 0 failed (59 suites, **+70 testes novos**).
- `tsc --noEmit`: limpo.
- `npm run calibrate`: 13/13 válidos, delta médio **-30,68%** (idêntico
  Fase 0/1/2 — port domínio puro, sem wiring; regressão zero confirmada).
- `npm run audit:port:check`: OK.

**Impacto no calibrate:** nulo (classes de domínio não estão conectadas
ao orquestrador). Ativação condicional virá na Fase 9 via feature flags
`USE_PORTED_VERBA` e `USE_PORTED_VERBA_DE_CALCULO`.

**Observação operacional:** esta Fase 3 foi desenvolvida em
`claude/audit-pjecalc-mrdcalc-kPkHh` após merge de
`claude/audit-pjecalc-mrdcalc-2A322` (Fases 0+1+2). As mudanças continuam
isoladas em `src/lib/pjecalc/core/` — nenhum código fora do core foi
tocado (nem pipeline v3, nem engine v3, nem `verba-modules/*`).

---

## 2026-04-22 — Fase 4 — Sessão #1 (cartaodeponto — helpers + comparação)

**Escopo:** port focado nas helpers puras e métodos de comparação dos
domínios de cartão de ponto que geram bang-for-buck sem obrigar refatoração
estrutural do modelo de turnos. O grosso do trabalho restante
(`MaquinaDeCalculoDeCartaoDePonto` 1.435 linhas, `ApuracaoCartaoDePonto`
1.214 linhas, `getQuantidadeHorasNoturnas`) permanece para sessões futuras
e exige refatoração de `Turno` do modelo `Decimal` para `Date` (explicado
abaixo).

**Classes portadas:**

- `dominio/cartaodeponto/ApuracaoCartaoDePonto.java` — **2 métodos novos**
  em `apuracao-cartao-de-ponto.ts`:
  - `obterInicioAtividadeHorarioNoturno()` — devolve "21:00" (agrícola),
    "20:00" (pecuária) ou "22:00" (urbana). Porte 1-a-1 das linhas
    809-817. Base legal: CLT art. 73 §2º (urbana) e Lei 5.889/73 art. 7º
    (agrícola/pecuária).
  - `obterFimAtividadeHorarioNoturno()` — devolve "05:00" (urbana/agrícola)
    ou "04:00" (pecuária). Porte 1-a-1 das linhas 819-827. Paridade Java
    preserva o fato de urbana e agrícola compartilharem `05:00` apesar de
    ramos distintos no switch Java.

- `dominio/cartaodeponto/CartaoDePontoUtils.java` — **5 helpers puras**
  em `cartao-de-ponto-utils.ts`:
  - `isPeriodosSemDescanso(Jornada)` — linhas 203-220. Detecta colagem
    entre turnos (saída do turno N ≡ entrada do turno N+1, com `trim()`).
  - `hasEntradaNoPeriodoNoturnoDaMadrugada(Jornada)` — linhas 453-482.
    Verifica se alguma das 6 entradas cai antes do fim do horário noturno.
    Relevante para Súmula 60 TST.
  - `getInicioAtividadeNoturna(ApuracaoCartaoDePontoLike)` — linhas 130-144.
    Parseia "HH:mm" de início do noturno em `Date` (epoch-relative).
    Fallback para 22:00 em dia-1 em caso de parse error.
  - `getFimAtividadeNoturna(ApuracaoCartaoDePontoLike)` — linhas 112-128.
    Parseia fim do noturno e adiciona 24h (porque "05:00" é amanhã).
    Fallback para 05:00 em dia-2.
  - `isJornadaDeMaisDeDoisDias(Jornada)` — linhas 628-637. Compara a última
    saída (busca reversa dos 6 turnos) contra 47:59 (172.740.000 ms).

- `dominio/cartaodeponto/ApuracaoDiariaCartao.java` — **3 métodos novos**:
  - `equalsApuracaoDiaria(unknown)` — linhas 385-394. Igualdade por `id`.
    Preserva semântica Java: dois transientes (ambos `id==null`) são
    tratados como iguais.
  - `compareTo(ApuracaoDiariaCartao)` — linhas 397-399. Ordena ascendente
    por `dataOcorrencia`. Caso `null` é ancorado no fim (Java quebra com
    NPE; TS preserva estabilidade sem throw).
  - `getDataOcorrencia()` — alias de `getData()` para compatibilidade com
    o nome do campo Java (mantém ambos para o caller local).

- `dominio/cartaodeponto/JornadaDiaria.Turno` — 1 método:
  - `getQuantidadeHorasTrabalhadas()` — linhas 211-213. Alias algébrico de
    `getDuracaoMillis()` (soma diurnas+noturnas = duração total quando
    não há overlap, o que é invariante de como turnos são construídos).

**Classes NÃO portadas nesta sessão (decisão operacional):**

- `Turno.getQuantidadeHorasNoturnas()` e `calcularQuantidadeHorasDiurnas()`
  — portar exige **refatorar `Turno` de `Decimal` (millis) para `Date`** e
  adicionar `getFatorHoraFicta()` + `isProrrogarHorarioNoturno()` ao
  `JornadaDiaria`. Porte tractável mas requer sessão dedicada com cuidado
  de regressão nos callers atuais. Ficou documentado inline.
- `CartaoDePontoUtils.isPeriodoCorrenteDentroDePeriodoJaLancado` /
  `...DentroDePeriodoDeDescanso` — funções de validação (~50 linhas cada)
  com alta lógica booleana embaralhada. Port adiado por complexidade /
  baixo retorno nos 13 casos de calibrate (validações UI, não cálculo).
- `validarListaDeJornadas`, `validarJornadasRelativas`,
  `montarHorariosParaValidacoes`, `checarPrimeiroTurnoParaMontagem` e
  variantes — pipeline de validação cruzada entre jornadas consecutivas.
  Adiado; mesmo critério anterior.
- `MaquinaDeCalculoDeCartaoDePonto.java` (1.435 linhas, hoje ~5%) —
  **maior gap do projeto.** Exige sessão dedicada com foco em jornada
  CLT (intrajornada art. 71, DSR, feriados, Súmula 60). Fica para a
  próxima sessão da Fase 4 ou para a Fase 8 junto com `Calculo.java`.
- `ApuracaoCartaoDePonto.java` métodos de cálculo (1.214 linhas, hoje
  ~21%) — complementares ao MaquinaDeCalculo; mesma faixa de adiamento.
- `HistoricoSalarial.java` — reconnaissance confirmou que os métodos
  faltantes em TS são **persistência/repository** (salvar, obter,
  obterVerbasVinculadas) — sem ação nesta sessão; ficam encobertos
  pelo Supabase adapter no MRD.
- `CartaoDePonto.java` — idem: métodos faltantes são estáticos de
  repositório.

**Divergências descobertas:** nenhuma nova.

**Testes adicionados:** **51 golden tests novos**
- 31 em `cartao-de-ponto-utils.golden.test.ts` (helpers + constantes +
  obterInicio/FimAtividadeHorarioNoturno da Apuracao)
- 16 em `apuracao-diaria-cartao.golden.test.ts` (equals 7 + compareTo 7
  + getDataOcorrencia 2)
- 4 em `jornada-diaria-turno.golden.test.ts` (getQuantidadeHorasTrabalhadas)

**Gate Fase 4:**
- Vitest: **855 passed** | 6 skipped | 0 failed (62 suites, **+51 testes
  vs Fase 3**).
- `tsc --noEmit`: limpo.
- `npm run calibrate`: 13/13 válidos, delta médio **-30,68%** (idêntico
  baseline Fase 0/1/2/3 — port de helpers puros, sem wiring; zero
  regressão).
- `npm run audit:port:check`: OK.

**Impacto no calibrate:** nulo (helpers não conectadas ao orquestrador).
Ativação virá na Fase 9 via feature flag `USE_PORTED_CARTAO`.

---

## 2026-04-22 — Fase 5 — Sessão #1 (INSS + IRPF — validações e helpers)

**Escopo:** port focado nas validações de negócio e helpers de data que
estavam ausentes nas classes de domínio de INSS e IRPF. Os motores
`MaquinaDeCalculoDoInss` (1.640 linhas Java) e `MaquinaDeCalculoDeIrpf`
(1.675 linhas Java), ambos ~25% e ~7% cobertos respectivamente, ficam
para sessão dedicada — exigem reformulação estrutural que sai do
escopo single-session.

**Classes portadas:**

- `calculo/inss/AliquotasDoEmpregadorPorPeriodo.java:170-184`
  → `aliquotas-do-empregador-por-periodo.ts` — método `validar()`.
  Regras: (1) pelo menos uma das 3 alíquotas (empresa/RAT/terceiros)
  deve ser informada — senão 3 MensagemDeRecurso MSG0045; (2) período
  não pode coincidir com outro do mesmo Inss — MSG0024.

- `calculo/inss/PeriodoDoINSSComOpcaoSimples.java:140-163`
  → `periodo-do-inss-com-opcao-simples.ts` — método `validar()`.
  Regras: (1) datas inicial/final dentro de [Admissão, Demissão??
  DataTérminoCalculo] — senão MSG0004; (2) sem coincidência com outro
  período Simples — MSG0024.

- `calculo/inss/sobresalarios/InssSobreSalarios.java:166-216`
  → `inss-sobre-salarios.ts` — métodos
  `getDataParaRestricaoSalarioDevido()` e `getDataParaRestricaoSalarioPago()`.
  Constroem `Periodo` com labels para uso em mensagens de erro. Devido
  aplica regra da maior data entre Admissão, InícioCálculo e Prescrição
  Quinquenal; Pago vai direto de Admissão → (Demissão ?? TérminoCalc).

- `calculo/inss/sobresalarios/InssSobreSalariosDevidos.java:240-250`
  → `inss-sobre-salarios-devidos.ts` — método
  `sugerirDataTerminoCalculo()`. Sub-variante de `sugerirDatas` que
  atualiza apenas `dataTerminoPeriodo` sem tocar no início. Preferência
  por `dataTerminoCalculo` em caso de empate (semântica Java
  `greaterThenOrEquals`).

- `calculo/irpf/Irpf.java:486-490` → `irpf.ts` — método
  `validarQuantidadeDependentes()`. Valida invariante: se
  `possuiDependentes == true`, `quantidadeDependentes` deve ser > 0.
  Chamado pelo `salvar()` do Java antes de persistir.

**Bug corrigido** (descoberto nesta sessão):
- Uso incorreto do construtor `NegocioException(null, msgDeRecurso)` em
  `verba.ts` (Fase 3) e em vários pontos novos. O construtor ignora o
  2º parâmetro quando o 1º é null (não-Error). Corrigido para
  `new NegocioException(msgDeRecurso)` (single-arg). Teste de Fase 3
  que validava apenas `toThrow` não detectou a ausência de mensagem.

**Classes NÃO portadas nesta sessão (decisão operacional):**

- `MaquinaDeCalculoDoInss.java` (1.640 Java vs 423 TS) — maior gap
  absoluto do módulo INSS. `liquidarInssSobreSalariosDevidos/Pagos`
  (~200 linhas cada) são núcleos complexos com loops recursivos +
  juros + multa. Exige sessão dedicada.
- `MaquinaDeCalculoDeIrpf.java` (1.675 Java vs 118 TS) — 93% ausente.
  `calcularIrpf`, `aplicarPagamento`, `calcularJurosEMulta` dependem
  de tabela histórica IRPF + RRA art. 12-A + SELIC. Exige sessão
  dedicada.
- `InssSobreSalarios.validar(NegocioException, boolean)` (~40 linhas) —
  validação agregada de período com regras Lei 11941/2009. Porte
  adiado por complexidade / dependência cruzada com `NegocioException`
  acumulador passado por parâmetro (semântica não-idiomática em TS).
- `AliquotasDoEmpregadorPorPeriodo.compareTo` — reconnaissance
  indicou presença mas inspeção direta do Java não achou. Skipped.

**Testes adicionados:** **28 golden tests novos**
- 7 em `aliquotas-do-empregador-por-periodo.golden.test.ts`
- 6 em `periodo-do-inss-com-opcao-simples.golden.test.ts`
- 11 em `inss-sobre-salarios-helpers.golden.test.ts`
  (getDataParaRestricaoSalarioDevido 5 + getDataParaRestricaoSalarioPago 2
  + sugerirDataTerminoCalculo 4)
- 4 em `irpf-validar-dependentes.golden.test.ts`

**Gate Fase 5:**
- Vitest: **883 passed** | 6 skipped | 0 failed (66 suites,
  **+28 testes vs Fase 4**).
- `tsc --noEmit`: limpo.
- `npm run calibrate`: 13/13 válidos, delta médio **-30,68%** (idêntico
  baseline — port de validações/helpers puros, sem wiring; zero regressão).
- `npm run audit:port:check`: OK.

**Impacto no calibrate:** nulo. Ativação virá na Fase 9 via
`USE_PORTED_INSS` e `USE_PORTED_IRPF`.

---

## 2026-04-22 — Fase 6 — Sessão #1 (FGTS + Custas + Honorários)

**Escopo:** port focado nos métodos de domínio FGTS (com prioridade para
classe `OcorrenciaDeFgts` que estava 100% AUSENTE), no helper estático de
custas (teto previdenciário × 4) e nas validações `Honorario`. Os
motores `MaquinaDeCalculoDoFgts` (274 Java vs 216 TS — já parcial),
`MaquinaDeCalculoDeCustas` e `MaquinaDeCalculoDeHonorarios` ficam
intactos — porte completo dos motores requer sessão dedicada.

**Classes portadas:**

- **NOVA**: `dominio/calculo/fgts/OcorrenciaDeFgts.java` (441 linhas Java,
  ANTES **100% AUSENTE** no TS) → `ocorrencia-de-fgts.ts` (305 linhas TS).
  Cobre todos os getters/setters (~30), predicados (`isOriginal`,
  `isValorCalculado`, `isValorInformado`, `isDepositadoInformado`),
  cópia (`copiar`, `recuperarValorOriginal`,
  `copiarValoresInformadosAnteriormente`), e **toda a cadeia de cálculo
  derivado**:
  - `getSomaDasBases(excluirAviso?)` — Java L309-318
  - `getValorDevido` / `getValorDevidoSemAviso` — Java L293-299
  - `getValorDevidoCorrigido` / `getValorDevidoSemAvisoCorrigido` — L320-326
  - `getDiferenca(excluiAviso?)` com clamp 0 — L339-358
  - `getDiferencaCorrigida` — L360-371
  - `getJuros` / `getTotal` — L377-390
  - `getValorDaContribuicaoSocialDe05` — L328-333 (LC 110/2001, janela
    01/01/2002 → 01/12/2006, alíquota 0,5% sobre as bases)
  - `getValorDaContribuicaoSocialDe05Corrigido`, `getJurosDaContribuicaoSocialDe05`,
    `getTotalDaContribuicaoSocialDe05` — L335-401
  - `equalsOcorrencia` (variante TS de `equals` Java EqualsBuilder) — L427-439

- **NOVA**: `constantes/aliquota-do-fgts-operadores.ts` — strategy
  `calcularAliquotaDoFgts(aliquota, valor)` que substitui o método
  polimórfico `calcular()` de `AliquotaDoFgtsEnum.java:9-30`. Mesmo
  padrão de `caracteristica-da-verba-operadores` (Fase 3).

- `constantes/enums.ts` — alinhamento com Java:
  - **`TipoDeBaseDoFgtsEnum`** corrigido: trocados valores `DEVIDO/CORRIGIDO`
    (que não existiam no Java e não eram usados em lugar algum) por
    `CALCULADA/INFORMADA` conforme Java.
  - **NOVO** `TipoDeDepositadoDoFgtsEnum` (CALCULADA/INFORMADA) —
    estava AUSENTE no TS.
  - `IndiceDeCorrecaoDoFGTSEnum` recebe valores reais do Java
    (`UTILIZAR_INDICE_TRABALHISTA=UIT`, `UTILIZAR_INDICE_JAM=UIJ`,
    `UTILIZAR_INDICE_JAM_E_TRABALHISTA=UJT`) com `@deprecated` nos
    valores antigos para compat com `parametros-de-atualizacao.ts`.

- `dominio/calculo/custas/CustasJudiciais.java:262-272`
  → `custas-judiciais.ts::calcularValorTetoCustasConhecimento` — antes
  era **stub que retornava `null`**. Implementado com **estratégia
  injetável** `tetoBeneficioFinder(competencia)`: o orquestrador
  injeta o loader real de `TabelaPrevidenciariaSeguradoEmpregado`
  quando aquela classe for portada (futura). Multiplica teto × 4 (CLT
  art. 789 §1º + Resolução CSJT 219/2018).

- `dominio/calculo/honorarios/Honorario.java:524-560`
  → `honorario.ts::validar()` + `validarDocumentoFiscal()`. Antes a
  classe tinha apenas `consistirDados`. Validações:
  - `validar`: 5 regras (origemRegistro=ATUALIZACAO sem data → MSG0003;
    dataEvento anterior à liquidação → MSG0127; futura → MSG0128;
    apurarIRRF=true sem tipoIR → MSG0003; baseVerbasNãoCompõem sem
    verbas selecionadas → MSG0167)
  - `validarDocumentoFiscal`: apurarIRRF=true exige `numeroDocumentoFiscalCredor`
    não-nulo/não-branco → MSG0003

**Decisões operacionais (sem port):**

- `Fgts.isSomenteJurosJAM`, `isDeveCobrarMulta`, `isMultaCalculada/Informada`
  e `isComporOPrincipal` (Java L481-525, L848-858) — `Fgts.ts` atual NÃO
  tem os campos necessários (`calculo`, `tipoDoValorDaMulta`, `comporPrincipal`,
  `multaDoArtigo467`). Adicionar exigiria reestruturação significativa do
  Fgts.ts existente que é usado pelo engine V3 atual. Postergado para
  sessão dedicada de "Fgts.ts completo".
- `MaquinaDeCalculoDoFgts.liquidarFgts` complexo, `TotalizadorDoFgts` (176L
  Java vs 0 TS), `LegendaDaFormulaDoFgts` (75L vs 0), `TabelaDeJurosDeFgts`
  (17L vs 0) — postergados.
- `CustasJudiciais.encontrarValorConsolidadoDoReclamado` — depende de 4
  totalizadores `getTotalCustasConhecimento*` que não existem no TS.
  Portar agora exigiria implementar a cadeia inteira. Postergado.
- `CustasJudiciaisDaAtualizacao` (2.185 linhas Java) — maior gap absoluto
  da Fase 6. Sessão dedicada.
- `HonorarioDaAtualizacao` (732 linhas) — postergado.
- `MaquinaDeCalculoDeHonorarios` complexo — postergado.

**Bug corrigido:**
- Construtor `MensagemDeRecurso` quando recebe **dois argumentos string**
  trata como `(atributo, chave)`, mas o Java usa `(chave, paramFormatado)`.
  Em TS resolvido passando 4 args explícitos
  `new MensagemDeRecurso(null, null, chave, param)` no caso MSG0127.
  (Bug não impacta retroativamente: nenhum port anterior usava esse
  padrão duplo-string.)

**Testes adicionados:** **53 golden tests novos**
- 38 em `ocorrencia-de-fgts.golden.test.ts`:
  - 5 defaults (alíquota 8%, tipo CALCULADA, predicado isOriginal)
  - 3 predicados (isValorCalculado/Informado, isDepositadoInformado, isOriginal)
  - 4 getSomaDasBases (com/sem aviso, nulos, todos nulos)
  - 2 getValorDevido (8% e 2%)
  - 4 getDiferenca (positivo, negativo→0, depositado null, sem aviso)
  - 2 getDiferencaCorrigida (com índice, diferença 0)
  - 3 juros/total (cálculo, taxa null, total = soma)
  - 5 Contribuição Social LC 110/2001 (fora janela, dentro, borda final, depois, corrigida)
  - 1 total CS = corrigido + juros
  - 5 cópia (replicar campos, recuperar, valores informados, calculados, null no-op)
  - 4 igualdade (mesma instância, outro tipo, mesmo id, ids diferentes)
- 4 em `custas-judiciais-teto.golden.test.ts` (stub null, finder×4, finder
  null, normalização da data para dia-1)
- 11 em `honorario-validar.golden.test.ts` (4 ATUALIZACAO + 2 IRRF + 1
  base verbas + 4 documento fiscal)

**Gate Fase 6:**
- Vitest: **936 passed** | 6 skipped | 0 failed (69 suites,
  **+53 testes vs Fase 5**).
- `tsc --noEmit`: limpo.
- `npm run calibrate`: 13/13 válidos, delta médio **-30,68%** (idêntico
  baseline — port de domínio puro, sem wiring; zero regressão).
- `npm run audit:port:check`: OK.

**Impacto no calibrate:** nulo. Ativação virá na Fase 9 via
`USE_PORTED_FGTS`, `USE_PORTED_CUSTAS`, `USE_PORTED_HONORARIOS`.

---

## 2026-04-22 — Fase 7 — Sessão #1 (Pagamento — rateio + análises)

**Escopo:** módulo Pagamento tem 16.863 linhas Java (maior categoria em
gap absoluto do projeto; coração do delta -30% do calibrate). Esta
sessão porta **helpers puros e validações** reutilizáveis sem
reestruturar as classes centrais (`Pagamento` 1.643L, `Atualizacao`,
`MaquinaDeRateioDoPagamento`, `CreditosDoReclamante`). Motores e
classes-tipo ficam para sessão(ões) dedicadas.

**Classes/métodos portados:**

- **`pagamento-utils.ts::ratearValor(valor, parcelas)`** — porte 1-a-1 de
  `PagamentoUtils.java:338-357`. Distribui `valor` proporcionalmente
  entre `parcelas`. Regras preservadas:
  - Soma das parcelas zero → vetor zerado (evita div/0)
  - Parcelas nulas tratadas como zero
  - `arredondarValorMonetario` em cada fração
  - `arrumarArredondamento` no final para soma = valor exata

- **`pagamento-utils.ts::arrumarArredondamento(rateios, valor)`** —
  porte 1-a-1 de `PagamentoUtils.java:359-387`. Ajuste centavo-a-centavo
  nas **maiores parcelas (por |valor|)**, sem repetir índices. Guarda-
  limite adicionado em TS: máx iterações = N parcelas (evita loop
  infinito caso o delta exceda N × 1 centavo). Comportamento prático
  idêntico ao Java.

- **`pagamento-utils.ts::analisarMultas(multas)`** — porte 1-a-1 de
  `PagamentoUtils.java:233-269`. Categoriza multas por
  `tipoCredorDevedor` em 4 dimensões + 3 listas (devidas p/ terceiros
  pelo reclamante/reclamado, e a cobrar do reclamante quando
  `tipoCobrancaReclamante=COBRAR`). Retorna tipo estruturado
  `AnaliseDeMultas` em vez de `Object[]` do Java.

- **`pagamento-utils.ts::analisarHonorarios(honorarios)`** — porte 1-a-1
  de `PagamentoUtils.java:271-297`. Análogo a `analisarMultas` para
  honorários (3 dimensões + 3 listas). Retorna
  `AnaliseDeHonorarios`.

- **`pagamento.ts`** — 3 campos adicionados (`valorParcelaOutrosDebitos`,
  `valorParcelaDebitosCobrarDoReclamante` + getters/setters) e método
  **`verificarRateioInicial()`** — porte 1-a-1 de
  `Pagamento.java:425-432`. Valida que soma das 3 parcelas bate com
  `valorPagamento`; retorna `NegocioException` acumulador (não lança).

**Decisões operacionais (NÃO portados):**

- `PagamentoUtils.verificaSeExiste*` (26 métodos predicados) — dependem
  de getters não-triviais de `Calculo`, `Honorario.obterTodosPor()`,
  `Multa.obterTodosPor()` e módulos ausentes. Mantidos como stub
  `return false`. Port completo exige Fase 10 (integração).
- `Pagamento.consistirCamposObrigatorios` (~61L) — validação em cascata
  envolvendo ~50 verificações sobre campos que em parte só existirão
  após `Pagamento.ts` ser completamente expandido. Sessão dedicada.
- `Pagamento.consistirRecolhimentosDeDebitosDoReclamante` — depende de
  `MultaDoPagamento.getValorMulta()` e `HonorarioDoPagamento.getValorHonorario()`.
  Postergado.
- `MaquinaDeRateioDoPagamento.calcularRateio*` (~200L, complexo) —
  orquestrador com 9 getters internos e estado. Sessão dedicada.
- `Atualizacao.liquidarParaCadaEvento`, `CreditosDoReclamante`,
  `DebitosDoReclamante`, `OutrosDebitosReclamado`, `HonorarioDaAtualizacao`,
  `CustasJudiciaisDaAtualizacao` (2.185 linhas — maior classe do módulo),
  `PensaoAlimenticiaDaAtualizacao` — todos postergados.

**Testes adicionados:** **27 golden tests novos**
- 7 em `pagamento-utils.golden.test.ts::ratearValor` (iguais, proporcionais,
  soma zero, ajuste de arredondamento, parcela única, nulas, decimais)
- 3 em `pagamento-utils.golden.test.ts::arrumarArredondamento` (positivo,
  negativo, zero)
- 7 em `pagamento-utils.golden.test.ts::analisarMultas` (vazio, cada
  variante do enum `CredorDevedorMultaEnum`, cobrar, múltiplas)
- 5 em `pagamento-utils.golden.test.ts::analisarHonorarios` (vazio,
  cada variante, misto)
- 5 em `pagamento-verificar-rateio.golden.test.ts` (soma bate, divergente,
  nulas, valorPagamento null, não lança)

**Gate Fase 7:**
- Vitest: **963 passed** | 6 skipped | 0 failed (71 suites,
  **+27 testes vs Fase 6**).
- `tsc --noEmit`: limpo.
- `npm run calibrate`: 13/13 válidos, delta médio **-30,68%** (idêntico
  baseline — port de helpers puros, sem wiring; zero regressão).
- `npm run audit:port:check`: OK.

**Impacto no calibrate:** nulo. `ratearValor` é o helper crítico onde
mora parte do delta de arredondamento entre Java e a implementação
atual do engine TS — mas ativação só virá na Fase 9.
