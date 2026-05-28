# CTPS V2 — Pendências de validação

## Formato `historico_ferias.csv` não validado contra PJe-Calc real

**Arquivo:** `ferias-pjecalc-format.ts`

**Estado:** o formato (RELATIVAS / PRAZO / SITUACAO / G1/G2/G3 / ABONO etc.)
foi inferido do spec da sprint + leitura das fixtures. Determinístico e
consistente com o ground truth do Roque, mas NÃO testado contra import real.

**Casos a validar:**

- [ ] Import num .PJC real do PJe-Calc aceita o arquivo sem erro
- [ ] Aquisitivo simples com 1 gozo (15 das 17 linhas do Roque)
- [ ] Aquisitivo com gozo fracionado em G1+G2 (Roque 2005-2006: 1 linha
      única com G1=15/05/2006 a 24/05/2006 + G2=11/09/2006 a 20/09/2006)
- [ ] Cálculo de período concessivo (aquisitivo + 1 ano) — comparar com
      cálculo do PJe-Calc num caso conhecido
- [ ] Coluna ABONO + QTD_DIAS_ABONO bate com o que PJe-Calc espera
- [ ] SITUACAO=GOZADAS é o valor correto pra férias quitadas (vs
      possíveis "NAO_GOZADAS", "PROPORCIONAL", etc.)

**Se PJe-Calc rejeitar:**

O conserto é cirúrgico em `ferias-pjecalc-format.ts`. Os parsers de
seção (`parse-historico-ferias.ts`) e o schema (`CtpsHistoricoFeriasItem`)
estão corretos e independentes do formato de saída — não tocá-los.

**Fixture de referência:** `fixtures/ctps/roque_guerreiro/expected/historico_ferias.csv`

---

## Outras pendências

- [ ] **`historico_salarial.csv` em comissionistas**: pra comissionista
      Via Varejo, `sal_tarefa` e `min_garantido` são 0/null no PDF, então
      o VALOR exportado é "0,00" em todas as linhas. Isso é fiel ao
      documento (engine puxa salário real do holerite), mas o PJe-Calc
      pode esperar valores. Validar se "0,00" é aceito ou se precisa
      buscar valor de outra fonte (holerite) antes do export.

- [ ] **Suporte SAP/Casas Bahia**: detector já tem regex, mas nenhum
      parser foi calibrado contra fixture SAP. Cobrir quando aparecer
      caso real.

- [ ] **PDFs vetorizados (Izabela 2022)**: caem no fallback
      Claude vision (Fase 5). Sem teste E2E ainda.
