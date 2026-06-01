# Spec — Cartão de Ponto

> **Seção 7/16** — paridade de input PJe-Calc Cidadão **v2.15.1**.
> Aba sob "Períodos e Ponto".
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico) | `pjecalc-fonte/negocio/.../dominio/cartaodeponto/` (`ApuracaoCartaoDePonto.java`, `OcorrenciaJornadaApuracaoCartao.java`) | tipos, validação |
> | App PJe-Calc | `PINTRS PJE CALC/...cartaodeponto-apuracao-cartaodeponto...png` + `...cartaodeponto-cartaodeponto...png` | escopo, labels |

---

## 0. Escopo — DECISÃO (dono autorizou: "Model B / marcações")
O PJe-Calc tem **dois modelos** de Cartão de Ponto:
- **Model A — `CartaoDePonto`** (`TBCARTAODEPONTO`): cartão nomeado com linhas `(competência, valor)` — **agregados mensais**. Tela `cartaodeponto-cartaodeponto.jsf` ("Visualizar Cartão"). Mapeia ao MRD `pjecalc_cartao_ponto` — **o que o engine lê** (`toEngineCartaoPonto`).
- **Model B — `ApuracaoCartaoDePonto`** (`TBAPURACAOCARTAODEPONTO`): período + config de jornada + **grade de 12 marcações/dia** (`OcorrenciaJornadaApuracaoCartao`). Tela `cartaodeponto-apuracao-cartaodeponto.jsf`.

**Breadcrumb confirma:** o menu "Cartão de Ponto" → `Cálculo > Cartão de Ponto > Buscar` → lista Apurações (Data Inicial/Final + "Grade de Ocorrências"). Logo **"Cartão de Ponto" = Model B**. A aba ativa do MRD (`ModuloCartaoPontoDiario`, grava `pjecalc_apuracao_diaria`) já é esse modelo — **correto**.

**Escopo desta seção:** validação de paridade das **marcações diárias** (Model B / grade). A config rica do `ApuracaoCartaoDePonto` (forma de apuração, tolerância, intervalos art.71/253/384, horário noturno, preenchimento semanal/escala) **NÃO é exposta** pela UI atual → **dívida registrada** (§5). Model A (agregados) e a ponte daily→engine ficam fora (engine = consome input, não altera).

## 1. Marcações diárias — `OcorrenciaJornadaApuracaoCartao` (Java)
`@Entity TBOCORRENCIAJORNADA` (`OcorrenciaJornadaApuracaoCartao.java:54`). Campos de entrada:
| # | Campo | Tipo | Col. | Validação | Origem |
|---|---|---|---|---|---|
| 1 | dataOcorrencia | Date | `DDTOCORRENCIA` | — | `:74-76` |
| 2-13 | hrEntrada1..6 / hrSaida1..6 | String HH:mm | `MVLENTRADA1..6`/`MVLSAIDA1..6` (VARCHAR2(5)) | `Utils.getHoraSeValida` no get/set; faixa hora/minuto | `:77-100,218-336` |
| 14 | alteradaManualmente | Boolean | `SFLALTERADA` | — | default false `:101-103` |

> **12 marcações/dia = 6 turnos × (entrada, saída)** (não 4). Horas extras/noturnas são **derivadas** (campos `@Transient`), não armazenadas nem de entrada.

### Validação — `validar()` (`:553-586`) + `validarHorasDeEntradaSaida()` (`:514-528`)
- Cada turno `Turno(entradaN, saidaN)`: entrada sem saída (ou vice-versa) → inválido; hora ∈ faixa válida; minuto ∈ faixa válida (`:649-668`).
- **MSG0187** — jornada de mais de dois dias (`:575-576`).
- **MSG0185** — períodos sem descanso entre si OU turno corrente dentro de período já lançado (sobreposição) (`:578-579`).
- **MSG0186** — turno corrente dentro de período de descanso (`:581-582`).
- Sobreposição intra-dia entre turnos: `CartaoDePontoUtils.validarJornadasRelativas` → MSG0185 (`CartaoDePontoUtils.java:428`).
- Ordenação por `dataOcorrencia`.

## 2. Config da Apuração (`ApuracaoCartaoDePonto`) — FORA do escopo de UI atual (dívida)
Período (dataInicial/Final, sem `@Required` no campo; overlap entre apurações → MSG0024 em `validar():324-327`), `formaDeApuracaoCartao` (enum, default HMF), tolerância (turno/dia), jornada diária por dia-da-semana, intervalos intrajornada 4-6h/>6h, art.253/384/72, feriados/sábados/domingos, horário noturno (enum, Súmula 60), preenchimento LIVRE/PROGRAMACAO/ESCALA + templates semanais/escala. `validarHoras()` valida cada campo HH:mm → MSG0004. **Registrado como dívida**: a UI MRD não expõe essa config; engine usa agregados.

### Enums (referência p/ quando a config for implementada)
- `FormaDeApuracaoCartaoEnum`: NAP/HJD/HMF(default)/HST/APH/HJS/HJM.
- `HorarioNoturnoApuracaroCartaoEnum`: AAG/APE/AUR(default).
- `PreenchimentoJornadasCartaoEnum`: LIV(default)/PRO/ESC.
- `TipoEscalaPreenchimentoJornadaCartaoEnum`: O(default)/Z(12x12)/V(12x24)/D(12x36)/Q(12x48)/C(5x1)/S(6x1)/T(8x2).

## 3. Estado atual no MRD (verificado contra prod)
- **`pjecalc_apuracao_diaria`** (TABELA): marcações + flags + horas derivadas. Colunas: data, dia_semana, ocorrencia, entrada_1..6/saida_1..6, minutos_*, horas_*, is_dsr/is_feriado/is_falta/..., origem, documento_id.
- **`pjecalc_ponto_diario`** (VIEW sobre apuracao_diaria, + competencia) — leitura.
- **`pjecalc_cartao_ponto`** (TABELA, agregados Model A) — **o que o engine lê** (`toEngineCartaoPonto`); a UI diária NÃO escreve aqui (gap conhecido, fora de escopo).
- Módulo ativo `ModuloCartaoPontoDiario` (6 pares E/S/dia, ocorrência, gera dias do mês a partir de admissão/demissão). Já tem `normalizeHora`/`HORA_RE` por campo. **Falta:** validação de consistência do DIA (par completo, ordem, sobreposição de turnos, jornada >2 dias).

### Wiring
Engine lê `pjecalc_cartao_ponto` (agregados). As marcações diárias chegam ao engine por outro caminho (gerar-ocorrencias / PJC analysis) — **motor fora de escopo**. Esta seção valida o INPUT das marcações; prova de persistência via MCP em `pjecalc_apuracao_diaria`.

### Gap / decisão
Escopo = `cartao-ponto-schema.ts` (`validarJornadaDia`: 12 marcações → par completo + ordem cronológica + sem sobreposição MSG0185 + jornada ≤2 dias MSG0187, com suporte a virada de meia-noite p/ jornada noturna) + fiação no `ModuloCartaoPontoDiario` (valida o dia ao editar uma marcação, bloqueando/avisando). Config rica do Apuração = dívida.

## 4. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3253 passed | 45 skipped | 0 failed** (era 3243 → +10, zero regressão)
- [x] testes da seção: `cartao-ponto-schema.test.ts` = **10 verdes**
- [x] eslint limpo (exit 0)
- [x] ≥1 teste validação — par incompleto; sobreposição (MSG0185); jornada >2 dias (MSG0187); hora inválida; virada meia-noite (noturna) válida
- [x] persistência via MCP — round-trip de marcação diária (entrada_1/saida_1/entrada_2/saida_2); row removida
- [x] Playwright e2e → **2 passed (10.3s), exit 0** — `e2e/fluxos/14-cartao-de-ponto.spec.ts` (exibe marcações; turno sobreposto bloqueia)
- [x] spec commitada / commit isolado da seção

## 5. Dívidas registradas
- Config rica do `ApuracaoCartaoDePonto` (forma de apuração, tolerância, intervalos art.71/253/384, horário noturno, preenchimento semanal/escala) — UI inexistente.
- Ponte daily (`apuracao_diaria`) → agregado (`pjecalc_cartao_ponto`) p/ o engine — não existe; engine fora de escopo.
- Validação MSG0186 (turno dentro de período de descanso entre dias) — depende de contexto multi-dia; não implementada no schema local.
