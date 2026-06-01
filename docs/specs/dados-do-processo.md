# Spec — Dados do Processo

> **Seção 1/16** do projeto de paridade de input PJe-Calc Cidadão **v2.15.1**.
> Esta spec é a **fonte canônica de campos/validações** para a tela "Dados do Processo"
> (aba sob "Dados do Cálculo", ao lado de "Parâmetros Gerais").
>
> | Fonte da verdade | Path | Usado para |
> |---|---|---|
> | Código Java decompilado (canônico p/ regra e validação) | `pjecalc-fonte/negocio/br/jus/trt8/pjecalc/...` | tipos, constraints, validação, defaults |
> | App PJe-Calc rodando (canônico p/ rótulo, ordem, visibilidade) | `PINTRS PJE CALC/...calculo-jsf-...04_31_51.png` | labels, ordem, agrupamento |
>
> **Status:** spec concluída. Schema/form/wiring/testes nas etapas seguintes.
> **Regra:** quando Java e tela divergirem, **regra de negócio segue o Java**.

---

## 0. Modelo de domínio (Java)

A tela é modelada por 3 entidades + embeddables:

| Entidade Java | Arquivo | Papel |
|---|---|---|
| `Calculo` | `negocio/.../dominio/calculo/Calculo.java:184` | Agregado raiz ("Dados do Cálculo"): header + parâmetros |
| `Processo` | `negocio/.../dominio/processo/Processo.java:60` | Identificação do processo; embeda `IdentificadorDoProcesso`, `Reclamante`, `Reclamado` |
| `IdentificadorDoProcesso` | `negocio/.../dominio/processo/IdentificadorDoProcesso.java:26` | Número CNJ decomposto (`@Embeddable`) |
| `Reclamante` / `Reclamado` | `negocio/.../dominio/participante/{Reclamante,Reclamado}.java` | Partes (estendem `ParticipanteProcesso`) |
| `Advogado` | `negocio/.../dominio/processo/Advogado.java:48` | Advogados por parte (1-N) — **detalhado na spec `advogados.md` (Seção 3)** |

Infra de validação:
- **CPF/CNPJ/CEI:** enum `base/.../base/constantes/TipoDocumentoFiscal.java` → `.validar(String)` (`:129`), dispatch p/ CEI (`:12`), CNPJ (`:48`), CPF (`:91`).
- **PIS/PASEP/NIT:** `@DocumentoPrevidenciario` (`base/.../comum/annotations/DocumentoPrevidenciario.java:21`) → `ValidadorDocumentoPrevidenciario.java` (length 11 numérico `:60-71`; módulo-11 multiplicador `"3298765432"` `:28-58`).
- **CNJ dígito verificador:** `IdentificadorDoProcesso.calcularDigito(...)` (`:47-54`) — `98 − (numeroCompleto mod 97)` (BigInteger, Res. CNJ 65/2008).
- **Mensagens** (`negocio/.../constantes/Mensagens.java`): `MSG0003`=campo obrigatório (`:10`), `MSG0004`=valor inválido (`:11`), `MSG0109`=dígito CNJ inválido (`:108`). Os textos exibíveis vivem em bundle de runtime (não estão no decompilado); o argumento de label em cada call-site identifica o campo.

> Reuso no MRD: `src/lib/validadores.ts` já implementa `validarCPF`, `validarCNPJ`, `validarPIS`, `validarProcessoCNJ` (mesmo mod-97) + formatadores. **Usar esses — não duplicar.**

---

## 1. Tabela de campos canônica (PJe-Calc)

Ordem/agrupamento conforme screenshot. `Obrig.` = obrigatório do ponto de vista de **input do usuário**.
Tipos TS são os do schema-alvo (Decimal p/ dinheiro).

### 1.1 — Header "Dados do Cálculo"

| # | Campo (label) | Tipo | Obrig. | Default | Validação | Origem Java |
|---|---|---|---|---|---|---|
| 1 | **Número** | int (sistema, read-only) | — | sequência DB `SQCALCULO` | nenhuma (gerado) | `Calculo.java:205-208` (`id`, sem campo de negócio) |
| 2 | **Tipo** | enum `TipoCalculoEnum` | sim (`@NotNull`) | auto no 1º save: `ADVOGADO` (sem instância) / `VARA` (1ª) / `GABINETE` (2ª) | `@NotNull` | `Calculo.java:290-294`; auto em `salvar()` `:759-772` |
| 3 | **Data de Criação** | date | sim (`@NotNull`) | auto `new Date()` no 1º save | `@NotNull` (sem `@Past`) | `Calculo.java:216-219`; auto `:754-755` |

> **Nota de paridade:** os três "*" do screenshot são do header. **Número** é o id do banco (display), **Tipo** e **Data de Criação** são auto-preenchidos no save. Do ponto de vista de digitação, **nenhum** é campo de entrada manual obrigatório bloqueante — Tipo é editável via dropdown.

### 1.2 — Identificação do Processo

Número CNJ é **decomposto** em 6 inteiros (`IdentificadorDoProcesso`). Sem Bean Validation; só `@Column length` (JPA, não-enforced) + checagens imperativas em `consistir()`.

| # | Campo | Tipo | Obrig. | Default | Validação | Origem Java |
|---|---|---|---|---|---|---|
| 4 | **Número** (CNJ) | int(7) | condicional* | null | `consistirNumero` `:143` | `IdentificadorDoProcesso.java:30-31` |
| 5 | **Dígito** | int(2) | condicional* | null | `consistirDigito` `:171` + check-digit `MSG0109` `:176-177` | `:40-41` |
| 6 | **Ano** | int(4) | condicional* | null | `comAno`: length>4 → `MSG0004 "Ano"` `:80-86`; `consistirAno` `:150` | `:32-33` |
| 7 | **Juízo** (justiça/segmento) | int(1) | — | **5** (Justiça do Trabalho) | preservado em `limparCampos` | `:34-35`; default `:43-45` |
| 8 | **Tribunal** (região/TRT) | int(2) | condicional* | null | `consistirRegiao` → `MSG0003 "Tribunal"` `:157-159` | `:36-37` |
| 9 | **Vara** (origem) | int(4) | condicional* | null | `consistirVara` `:164` | `:38-39` |
| 10 | **Valor da Causa** | **Decimal** (19,2) | não | null | **nenhuma** (não consta em `validar`/`consistir`) | `Processo.java:72` (`MVLCAUSA`) |
| 11 | **Autuado em** | date | não | null | **nenhuma** | `Processo.java:75` (`DDTAUTUACAO`) |

> \* **Regra "tudo-ou-nada" do CNJ** (`consistir()` `:182-218`): se **qualquer** dos campos {numero, ano, regiao, vara, digito} estiver preenchido, **todos** os outros tornam-se obrigatórios (`MSG0003`), e quando os 6 estão presentes o **dígito deve bater** com `calcularDigito` (mod-97) senão `MSG0109`. Ou seja: CNJ inteiro é **opcional**, mas **parcial é inválido**. `justica` default 5 não dispara a regra sozinho.
>
> **Decisão de implementação MRD (autônoma, UI):** renderizar **um campo único mascarado** `NNNNNNN-DD.AAAA.J.TR.OOOO` validado por `validarProcessoCNJ` (mesmo mod-97), persistido como `processo_cnj` (texto canônico). Equivale em **validação** à regra tudo-ou-nada + dígito. Justificativa: a diretriz do projeto é "NÃO é clone visual da UI JSF". A decomposição é derivável do texto. (Ver §6 decisões.)

### 1.3 — Reclamante (`Reclamante extends ParticipanteProcesso`)

| # | Campo | Tipo | Obrig. | Default | Validação | Origem Java |
|---|---|---|---|---|---|---|
| 12 | **Nome** | string(150) | não | null | nenhuma (`validar()` é no-op) | `ParticipanteProcesso.java:25`; `Reclamante.java:42-44` |
| 13 | **Doc. Fiscal — Tipo** | enum `TipoDocumentoFiscalEnum` (CPF/CNPJ/CEI) | não | null | — | `ParticipanteProcesso.java:28` |
| 14 | **Doc. Fiscal — Número** | string(14) | não | null | **se preenchido**, valida check-digit por tipo (`Calculo.validar` `:722-737`); senão `MSG0004 "Número"`. Setter remove não-dígitos (`:52-54`) | `ParticipanteProcesso.java:30` |
| 15 | **Doc. Previdenciário — Tipo** | enum `TipoDocumentoPrevidenciarioEnum` (PIS/PASEP/NIT) | não | null | — | `Reclamante.java:36` |
| 16 | **Doc. Previdenciário — Número** | string(11) | não | null | `@Length(max=11)` + `@DocumentoPrevidenciario` (length 11 + mod-11) | `Reclamante.java:38-40` |

### 1.4 — Reclamada (`Reclamado extends ParticipanteProcesso`)

| # | Campo | Tipo | Obrig. | Default | Validação | Origem Java |
|---|---|---|---|---|---|---|
| 17 | **Nome** | string(150) | não | null | **nenhuma** (Reclamado não tem `validar()`; `Processo.validar` não valida reclamado) | `Reclamado.java:22` (override `SNMRECLAMADO`) |
| 18 | **Doc. Fiscal — Tipo** | enum `TipoDocumentoFiscalEnum` | não | null | — | herdado `ParticipanteProcesso.java:28` |
| 19 | **Doc. Fiscal — Número** | string(14) | não | null | **nenhuma** — o switch de check-digit em `Calculo.validar` aplica **só ao reclamante** | herdado `ParticipanteProcesso.java:30` |

> Reclamada **não tem** Documento Previdenciário (bate com o screenshot: só Nome + Doc Fiscal).

### 1.5 — Advogados (aninhados por parte)

Entidade `Advogado` separada (1-N por parte, discriminada por `TipoAdvogadoEnum` RT/RD). Campos: Nome (obrig., `MSG0003`), OAB (persistido, **nunca validado**), Documento (tipo+número, valida check-digit só se número preenchido). `Advogado.validar()` (`Advogado.java:137-165`) **não** é chamado por `Calculo.validar`/`Processo.validar` (roda na camada de serviço/UI). **Detalhamento completo na spec `advogados.md` (Seção 3).** Aqui só registramos que as partes embedam listas de advogados.

---

## 2. Enums

| Enum | Valores (constante → label `nome` / `valor` DB) | Arquivo |
|---|---|---|
| `TipoCalculoEnum` | ADVOGADO→"Advogado"/"A"; CREDOR→"Credor"/"C"; DEVEDOR→"Devedor"/"D"; VARA→"Vara"/"V"; GABINETE→"Gabinete"/"G" | `constantes/TipoCalculoEnum.java:15-19` |
| `TipoDocumentoFiscalEnum` | CPF; CNPJ; CEI (`getValor()`=`name()`) | `constantes/TipoDocumentoFiscalEnum.java:18,32,46` |
| `TipoDocumentoPrevidenciarioEnum` | PIS; PASEP; NIT | `constantes/TipoDocumentoPrevidenciarioEnum.java:7-9` |
| `TipoAdvogadoEnum` | RECLAMANTE→"Reclamante"/"RT"; RECLAMADO→"Reclamado"/"RD" | `constantes/TipoAdvogadoEnum.java:7-8` |

---

## 3. Visibilidade / ordem

- Tela sem render condicional estrutural: todos os blocos sempre visíveis.
- Único condicional: a **máscara/validação do Doc. Fiscal** depende do **Tipo** (CPF 11 díg / CNPJ 14 díg / CEI 12 díg).
- Doc. Previdenciário: **só no Reclamante**.
- Ordem: Header (Número, Tipo, Data Criação) → Identificação do Processo → Reclamante (+ advogados) → Reclamada (+ advogados) → [Salvar | Fechar].

---

## 4. Estado atual no MRD (verificado contra prod `xhvlhrgfoeahgofhljbs`)

### 4.1 Modelo de dados real
- **`pjecalc_calculos`** = tabela base (77 colunas) — agregado "Cálculo" completo (processo + partes + TODOS os parâmetros + tributos). Equivale ao `Calculo` Java.
- **`pjecalc_dados_processo`** = **VIEW** (projeção de 21 colunas) sobre `pjecalc_calculos`. Colunas expostas: `id, case_id, processo_cnj, vara, tribunal, instancia, fase, data_admissao, data_demissao, data_ajuizamento, data_citacao, data_inicio_calculo, data_fim_calculo, data_liquidacao, tipo_demissao, reclamante_nome, reclamante_cpf, reclamado_nome, reclamado_cnpj, created_at, updated_at`.
- Engine consome de `dadosProcesso` apenas `data_citacao` (`orchestrator.ts:1606-1610`) e tenta `modo_calculo` (`:1613`) — **que não existe** na view nem na base → sempre `'independent'` (dívida latente).

### 4.2 🐞 Bug pré-existente (a corrigir nesta seção)
`ModuloDadosProcesso.tsx:130-140` faz `insert/update` na **view** com `...form` espalhado, incluindo chaves que **não são colunas**: `numero_processo` (deveria ser `processo_cnj`), `comarca`, `uf`, `tipo_acao`, `rito`, `data_distribuicao`, `data_transito`, `juiz`, `objeto`, `dia_fechamento_mes`, `prazo_ferias_proporcional`, `inicio_ferias_coletivas`, `tipo_calculo`, `modo_calculo`, e `reclamada_nome`/`reclamada_cnpj` (colunas reais são `reclamado_*`). → o save **falha** (PostgREST rejeita coluna inexistente). **Tese a provar com teste antes do fix** (CLAUDE.md: reproduzir bug com teste).

### 4.3 Gap vs PJe-Calc

| Campo PJe (Dados do Processo) | Coluna MRD (`pjecalc_calculos`) | Status | Ação |
|---|---|---|---|
| Tipo (TipoCalculoEnum) | — | ausente | **+coluna** `tipo_calculo text` default `'ADVOGADO'` |
| Número CNJ | `processo_cnj` (texto único) | presente (não decomposto) | manter texto; validar via `validarProcessoCNJ` |
| Valor da Causa | — | ausente | **+coluna** `valor_causa numeric(19,2)` (Decimal) |
| Autuado em | — | ausente | **+coluna** `data_autuacao date` |
| Tribunal / Vara | `tribunal` / `vara` (text) | presente | manter |
| Reclamante Nome | `reclamante_nome` | presente | manter |
| Reclamante Doc Fiscal (tipo+nº) | `reclamante_cpf` (só nº, CPF) | parcial | **+coluna** `reclamante_doc_tipo text` default `'CPF'`; nº reusa `reclamante_cpf` |
| Reclamante Doc Previdenciário | — | ausente | **+colunas** `reclamante_pis_nit text` + `reclamante_pis_nit_tipo text` default `'PIS'` |
| Reclamada Nome | `reclamado_nome` | presente | manter |
| Reclamada Doc Fiscal (tipo+nº) | `reclamado_cnpj` (só nº, CNPJ) | parcial | **+coluna** `reclamado_doc_tipo text` default `'CNPJ'`; nº reusa `reclamado_cnpj` |
| Advogados por parte | tabela `pjecalc_advogados` (Seção 3) | separado | cross-ref Seção 3 |
| Número/Data de Criação (header) | `id`/`created_at` | presente | display-only |

> **Migração additiva** (nullable, sem destruir): `+tipo_calculo, +valor_causa, +data_autuacao, +reclamante_doc_tipo, +reclamante_pis_nit, +reclamante_pis_nit_tipo, +reclamado_doc_tipo` em `pjecalc_calculos`; `CREATE OR REPLACE VIEW pjecalc_dados_processo` expondo as novas colunas (manter projeção simples = view auto-updatable). Verificar RLS de `pjecalc_calculos` + auto-updatability antes de migrar (Etapa 2).

### 4.4 Extras MRD (fora de escopo de paridade — **manter**, marcar)
`data_citacao` + `modo_calculo` (toggle ADC 58) e a busca **Datajud** (`buscar-citacao-datajud`) são **extensões MRD**, não existem na Dados do Processo do PJe-Calc. `rito`, `objeto`, `juiz`, `comarca`, `tipo_acao`, `data_distribuicao`, `data_transito` são campos inventados (sem coluna/sem origem Java) → **remover do payload** (causam o bug 4.2). `instancia`, `fase`, `tipo_demissao` existem na view mas pertencem a contexto/Parâmetros — manter como estão, sem expor nesta tela (baixa prioridade).

---

## 5. Wiring com o engine (`PjeCalcEngineV3`)

- `orchestrator.ts:1552` injeta `dadosProcesso` nos params do engine.
- `orchestrator.ts:1606-1613`: propaga `data_citacao` → `engineParams.data_citacao`; lê `modo_calculo` (default `independent`).
- **Conclusão de paridade:** os campos de identificação do processo/partes são **metadados** (relatórios/identificação), não entram no cálculo financeiro — exceto `data_citacao` (ADC 58) e, futuramente, `valor_causa` (base de custas/honorários em alguns modos). **Prova de wiring (Etapa 4):** ≥1 teste garantindo que cada campo persistido é lido de volta pelo adapter `caseData.dadosProcesso` e que `data_citacao`/`valor_causa` chegam aos params do engine. Campo órfão = bug.

---

## 6. Decisões em aberto (registrar antes de migrar)

1. **CNJ campo único mascarado** (recomendado) vs 6 sub-campos decompostos (pixel-parity). → adotando campo único + `validarProcessoCNJ`; validação equivalente. Reversível.
2. **Reuso de `reclamante_cpf`/`reclamado_cnpj`** como coluna de "número do documento" (genérico CPF/CNPJ/CEI) em vez de renomear — evita quebrar a view + leituras. Dívida de naming registrada.
3. **`tipo_calculo` default** `'ADVOGADO'`: MRD é contexto advogado/standalone (sem setor/instância do PJe interno). Confere com `salvar()` Java quando `instancia == null`.

---

## 7. Definition of Done desta seção (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3186 passed | 45 skipped | 0 failed** (exit 0); testes da seção: `dados-processo-schema.test.ts` (15) + `dados-processo-adapter.test.ts` (6) = **21 verdes**. Inclui teste que reproduz o bug 4.2 (`toPjecalcCalculosPayload` só gera colunas reais).
- [x] persistência verificada via **Supabase real (MCP)**: insert nas colunas de paridade → re-leitura **pela view `pjecalc_dados_processo`** (mesma que o serviço usa) retornou todos os campos (tipo_calculo, valor_causa=1234.56, processo_cnj, data_autuacao, reclamante_pis_nit, modo_calculo) → linha de teste removida (prod limpo).
- [x] eslint limpo nos arquivos da seção (exit 0)
- [x] ≥1 teste provando cada campo no input do engine (§5) — `dados-processo-adapter.test.ts` cobre data_citacao, modo_calculo, valor_causa→valor_da_causa; regressão validada contra os 22 PJCs reais (`parity-pjcs-novos-independent` verde).
- [x] migração additiva aplicada via MCP (2 migrations: colunas de paridade + modo_calculo) — colunas confirmadas na view.
- [~] tipos: `src/lib/pjecalc/types.ts` (superfície usada pelo app) atualizado. Gerado `src/integrations/supabase/types.ts`: refresh mecânico via `generate_typescript_types` no pipeline — app usa cliente untyped p/ estas tabelas; tsc verde (nenhum caminho tipado referencia as novas colunas).
- [x] esta spec commitada (fa25f49) + atualizada
- [x] Playwright e2e (browser): `e2e/fluxos/08-dados-do-processo.spec.ts` → **2 passed (14.8s), exit 0** — (1) preenche→salva→**recarrega→persiste**; (2) CNJ com dígito inválido **bloqueia**. Backend Supabase stubado (rede interceptada). No sandbox foi necessário subir o dev server em IPv4 (`--host 127.0.0.1`) por limitação de bind IPv6 do ambiente (`vite.config.ts` usa `host: "::"`); persistência também confirmada via MCP (round-trip pela view).
- [x] commits isolados da seção (spec, 2 migrations, implementação)
