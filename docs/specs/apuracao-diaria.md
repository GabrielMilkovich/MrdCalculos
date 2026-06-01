# Spec — Apuração Diária

> **Seção 8/16** — paridade de input PJe-Calc Cidadão **v2.15.1**.
> Aba sob "Períodos e Ponto".
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico) | `pjecalc-fonte/negocio/.../dominio/cartaodeponto/ApuracaoDiariaCartao.java` + `MaquinaDeCalculoDeCartaoDePonto.java` | classificação input vs output |

---

## 0. VEREDITO — FORA DE ESCOPO DE ENTRADA (output computado do motor)

**`ApuracaoDiariaCartao` é um registro de RESULTADO computado**, gerado integralmente
pelo motor de cálculo do cartão de ponto. **Não é tela de entrada de dados.** Conforme
a regra do projeto ("Motor de cálculo... você CONSOME o input dele, não altera" +
"Integrações que não fazem sentido aqui: marque como 'fora de escopo explícito'"),
esta seção é **explicitamente marcada como fora de escopo de entrada** e **não
implementada** como formulário.

### Evidências (Java, verificado diretamente)
1. **Zero validação:** `ApuracaoDiariaCartao.java` não tem nenhuma anotação Bean-Validation
   (`@Required`/`@NotNull`/`@ValidValue`/`@Length`) nem método `validar()`. Só
   getters/setters + `equals`/`hashCode`/`compareTo` + `salvar()` passthrough
   (`ApuracaoDiariaCartao.java:48-122`, `:371-399`). Contraste: a grade de entrada
   real `OcorrenciaJornadaApuracaoCartao` **tem** `validar()` + `validarHorasDeEntradaSaida()`
   (`OcorrenciaJornadaApuracaoCartao.java:514,554`).
2. **Gerado pelo motor:** única instanciação em
   `MaquinaDeCalculoDeCartaoDePonto.gerarRegistroApuracaoDiaria(...)`
   (`MaquinaDeCalculoDeCartaoDePonto.java:209`), com **todos** os campos derivados
   da linha de marcações `ojac` via `transformarEmHoras(...)` (`:212-249`). Driver:
   `processarApuracaoCartaoDePonto` (`:76-113`); persistência `salvarApuracoesDiarias`
   (`:1128-1132`). Nenhum controller/action escreve nessa entidade.
3. **Só consumida por relatório:** fora do próprio pacote, as únicas referências são
   `Calculo` (o `Set` dono), `RepositorioDeCalculo` (cascade-delete, sem CRUD), e
   `CartaoDePontoDiarioJRAdapter` (JasperReports — visualização) (`:304-380`).
4. **Nenhum campo é editável pelo usuário.** `frequenciaDiaria` (`SDSFREQUENCIADIARIA`)
   é string formatada de saída (`ojac.formatarFrequencia()`, `:212`); `feriadoConsiderado`
   (`SFLFERIADOCONSIDERADO`, default TRUE) é **copiado do pai** `ApuracaoCartaoDePonto.considerarFeriados`
   (`:235`; fonte editável em `ApuracaoCartaoDePonto.java:156-158`), não editado por dia.

### Não há conceito de entrada "Apuração Diária" separado
A grade de **entrada** por dia é `OcorrenciaJornadaApuracaoCartao` (Model B), **já coberta
na Seção 7 (Cartão de Ponto)**. "Apuração Diária" é a projeção **computada** dessa grade.

## 1. Estado atual no MRD (verificado)
- O menu lateral tem dois itens: `cartao_ponto` ("Cartão de Ponto") e `cartao_ponto_diario`
  ("Apuração Diária") — **ambos roteiam para o MESMO componente `ModuloCartaoPontoDiario`**
  (`PjeCalcInline.tsx:413,415`). Ou seja, no MRD "Apuração Diária" **já é** a mesma UI de
  marcações diárias da Seção 7; não há superfície de entrada distinta.
- A tabela `pjecalc_apuracao_diaria` guarda tanto as marcações (entrada — §7) quanto colunas
  de horas derivadas (`minutos_*`, `horas_*`) que correspondem ao papel de output do
  `ApuracaoDiariaCartao`. As colunas de horas derivadas são populadas pelo pipeline de
  cálculo/OCR, não por digitação.

## 2. Ação desta seção
- **Nenhuma implementação de entrada.** Marcado como fora de escopo explícito.
- A validação de marcações diárias (a parte de entrada que existe) foi entregue na **Seção 7**
  (`cartao-ponto-schema.ts` / `ModuloCartaoPontoDiario`). 
- O único parâmetro de input que afeta a apuração diária (`considerarFeriados`) pertence à
  config do `ApuracaoCartaoDePonto` (Cartão de Ponto), registrada como **dívida** na Seção 7
  (config rica não exposta na UI).

## 3. Definition of Done (seção de classificação/escopo)
- [x] Java lido e classificado: `ApuracaoDiariaCartao` = output computado (sem validação; gerado pelo motor). Citações acima.
- [x] Confirmado que MRD não tem superfície de entrada distinta (roteia p/ ModuloCartaoPontoDiario).
- [x] Marcado "fora de escopo explícito" (regra do projeto: motor = consome, não altera).
- [x] spec commitada
- [x] commit isolado (doc-only; sem código/migração/teste — nada a implementar)

## 4. Dívidas / cross-refs
- Entrada real de jornada: **Seção 7 (Cartão de Ponto)**.
- Config `ApuracaoCartaoDePonto` (incl. `considerarFeriados`): dívida registrada na Seção 7.
- Se no futuro quiser exibir a apuração diária computada no MRD: é trabalho de
  **relatório/visualização** sobre o resultado do motor, não de entrada — fora deste projeto.
