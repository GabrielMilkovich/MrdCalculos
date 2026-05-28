# CTPS V2 — Pendências e gaps documentados

Sprint CTPS V2 encerrada em 2026-05-28 (Fase 5.1). Itens abaixo são
backlog rastreável — implementação posterior conforme necessidade.

---

## 1. Formato `historico_ferias.csv` não validado contra PJe-Calc real

**Arquivo:** `ferias-pjecalc-format.ts`

**Estado:** o formato (RELATIVAS / PRAZO / SITUACAO / G1/G2/G3 / ABONO etc.)
foi inferido do spec da sprint + leitura das fixtures. Determinístico e
consistente com o ground truth do Roque, mas NÃO testado contra import real.

**Casos a validar:**

- [ ] Import num .PJC real do PJe-Calc aceita o arquivo sem erro
- [ ] Aquisitivo simples com 1 gozo (15 das 17 linhas do Roque)
- [ ] Aquisitivo com gozo fracionado em G1+G2 (Roque 2005-2006: 1 linha
      única com G1=15/05/2006 a 24/05/2006 + G2=11/09/2006 a 20/09/2006)
- [ ] Cálculo de período concessivo (aquisitivo + 1 ano)
- [ ] Coluna ABONO + QTD_DIAS_ABONO bate com o que PJe-Calc espera
- [ ] SITUACAO=GOZADAS é o valor correto pra férias quitadas

**Se PJe-Calc rejeitar:** conserto cirúrgico em `ferias-pjecalc-format.ts`.
Parsers de seção (`parse-historico-ferias.ts`) e schema (`CtpsHistoricoFeriasItem`)
estão corretos e independentes do formato de saída — não tocá-los.

**Fixture de referência:** `fixtures/ctps/roque_guerreiro/expected/historico_ferias.csv`

---

## 2. `historico_salarial.csv` em comissionistas: VALOR=0,00

**Arquivo:** `csv-historico-salarial.ts`

Pra comissionista Via Varejo, `sal_tarefa` e `min_garantido` são 0/null no
PDF, então o VALOR exportado é "0,00" em todas as linhas. Isso é fiel ao
documento (engine puxa salário real do holerite), mas o PJe-Calc pode
esperar valores.

- [ ] Validar se "0,00" é aceito pelo PJe-Calc
- [ ] Se não, definir merge: buscar VALOR no holerite/Ficha Financeira da
      mesma competência antes do export

---

## 3. Merge histórico-salarial-CTPS com Ficha Financeira

**Contexto:** O histórico salarial do CTPS captura DATAS DE MUDANÇA
(ADMISSÃO, Redução COVID, Retorno COVID, reajustes) — não os valores reais.
Os valores em R$ vivem na Ficha Financeira (12 colunas mensais) e nos
holerites.

- [ ] Definir interface de merge: dado uma competência X, qual fonte é
      autoritativa (CTPS data + FichFin valor, ou holerite quando único)
- [ ] Engine de cálculo precisa reconciliar fontes — onde mora essa lógica?
      (Provavelmente em `src/lib/pjecalc/` quando rolar a integração com
      o cálculo trabalhista)

---

## 4. PDFs vetorizados (Izabela 2022)

**Estado:** Fallback Claude vision NÃO implementado. Tirado de escopo da
sprint conforme decisão de 28/05.

- [ ] Fallback Claude vision pra PDFs onde `extrairGeometrico` retorna
      texto vazio (PDF é vetor de imagem, não text-native)
- [ ] Hoje cai no fallback legacy (`parseFerias`/`parseFaltas`) ou erro
      "OCR vazio" — sem cobertura V2

---

## 5. SAP Casas Bahia

**Estado:** Detector já tem regex pra SAP (`detectar.ts`), mas parsers
calibrados só pra ADP-Web. Nenhuma fixture SAP no repo.

- [ ] Coletar fixture SAP real
- [ ] Calibrar parsers de seção (DADOS_PESSOAIS, etc.) pro layout SAP
- [ ] Pode precisar variantes regex por emissor (`if emissor==='SAP' ...`)

---

## 6. Migração da UI `CtpsReviewDialog` pro shape V2 completo

**Estado:** UI continua exibindo só férias + faltas (shape legacy). O dado
V2 completo (50 campos) está disponível via `ctpsV2` prop opcional mas
só é usado pra gerar 4 CSVs no download. Dialog ainda mostra 2 tabs
(Férias / Faltas), não os 13 campos pessoais/contratuais.

- [ ] Adicionar tabs/seções pra dados_pessoais, local_trabalho,
      funcao_atual, dependentes, etc.
- [ ] Permitir revisão e edição inline desses campos
- [ ] Persistir edições (escrever de volta em `documents.parsed` ou
      coluna nova)

---

## 7. Otimização: ler de `documents.parsed.ctps_v2` em vez de re-parsear

**Contexto:** Hoje o `case 'ctps'` em `per-doc/index.ts` chama
`parseFichaAnotacoes(ocrText)` toda vez que o operador clica em "Exportar".
Se o `mapperCtpsV2` fosse plugado no `v6-pipeline` (escopo backlog), o
resultado V2 já estaria em `documents.parsed.ctps_v2` no primeiro processamento.

- [ ] Plugar `mapperCtpsV2` no `dispatcher.ts` (já implementado em
      `_shared/mappers/ctps-v2.ts`, só falta adicionar no array `TODOS_MAPPERS`)
- [ ] No `case 'ctps'` em `per-doc/index.ts`, preferir `doc.parsed.ctps_v2`
      quando presente; cair pro re-parse só como fallback

Custo: re-parse atual é ~50ms por export. Otimização improdutiva enquanto
volume for baixo. Marca quando começar a doer.

---

## Pendências fora da sprint CTPS V2

### Ficha Financeira backfill (de várias sprints atrás)

Edge function v20 deployada, 4 docs do ROQUE com parsed v3/v1 antigo.
Backfill bloqueado pela decisão de auth A/B/C ainda pendente:
- **A:** `verify_jwt:false` + bypass interno
- **B:** user JWT real (precisa flow client-side)
- **C:** pausar backfill, aceitar v3/v1 antigo
