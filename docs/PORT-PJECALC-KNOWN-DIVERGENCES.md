# PORT PJe-Calc — Divergências Conhecidas

Registro de divergências encontradas entre o comportamento do PJe-Calc v2.15.1 (Java) e o que seria "correto" legal/matematicamente. Durante o port, **preservamos o comportamento do Java** (fidelidade semântica). Esta lista alimenta uma fase posterior de correções, com flag de rollback.

---

## Formato

```
### DV-NNN — <título curto>

**Data descoberta:** YYYY-MM-DD
**Fase:** N
**Arquivo Java:** <pjecalc-fonte/caminho/Arquivo.java:linha>
**Método:** `<nomeDoMetodo>`
**Descrição do bug:**
<o que o Java faz>

**Comportamento correto esperado:**
<o que deveria fazer, segundo CLT/legislação/jurisprudência>

**Impacto medido:**
<qual a divergência em R$ ou % para caso X>

**Decisão do port:** preservar bug (fidelidade). Correção planejada para Fase <N>.

**Caso de teste:**
<link para o golden que expõe a divergência>
```

---

*(vazio — divergências serão adicionadas conforme o port avança)*

---

## DV-001 — TABELA_IPCA é cópia byte-a-byte da TABELA_IPCA-E

**Data descoberta:** 2026-04-22
**Fase:** 2
**Arquivo TS:** `src/lib/pjecalc/core/dominio/indices/ipca/tabela-ipca.ts`
**Arquivo TS referência:** `src/lib/pjecalc/core/dominio/indices/ipcae/tabela-ipcae.ts`

**Descrição:**
Hash SHA-256 das duas tabelas é idêntico (`9637805fae75b1683331c0c49eb27608292856c18c46b99334b8b45d9f02dd15`). `TABELA_IPCA` foi populada como cópia de `TABELA_IPCA-E`, não com valores do IPCA oficial do IBGE.

**Comportamento correto esperado:**
IPCA e IPCA-E são séries distintas do IBGE:
- **IPCA** (série 433): coleta 1º ao último dia do mês de referência.
- **IPCA-E** (série 10764 / 10844): coleta do dia 15 do mês anterior ao dia 15 do mês de referência.

Divergências entre séries (valores públicos IBGE em % mensal):

| Competência | IPCA (IBGE) | IPCA-E (IBGE) | TABELA_IPCA (TS) |
|---|---:|---:|---:|
| 2018-04 | 0,22 | 0,21 | 0,21 |
| 2020-04 | -0,31 | -0,01 | -0,05 |
| 2020-05 | -0,38 | -0,59 | -0,13 |
| 2022-04 | 1,06 | 1,73 | 1,73 |

**Impacto medido:**
Casos `.pjc` com combinações contendo `"indice": "IPCA"` (ex: `leide-santana.pjc`, onde `{"de":"2024-08-30","indice":"IPCA"}`) recebem índice errado. Impacto numérico difere caso a caso; provavelmente contribui com fração do delta -30% observado.

**Decisão do port:**
Preservar bug (fidelidade semântica durante o port). Teste golden freeze documenta o estado atual; correção planejada para **pós-Fase 9** com migração `seed-indices-oficiais.ts` atualizada.

**Caso de teste:**
`src/lib/pjecalc/core/dominio/indices/__tests__/tabelas-indices.golden.test.ts` — describe `TABELA_IPCA — golden` → teste `TABELA_IPCA tem hash idêntico à TABELA_IPCAE (DV-001 preservada)`.

**Observação:**
O PJe-Calc original (Java) lê do banco `TBIPCA` e `TBIPCAE` separadamente — provavelmente com valores corretos. A divergência é exclusiva do port TS atual. Correção requer apenas reseedar `TABELA_IPCA` com valores oficiais IBGE série 433 + atualizar o hash no teste golden + remover o teste de igualdade.

---

## DV-002 — `Verba.isTipoDaQuantidadeImportadaDoCartaoDePonto()` sempre retorna false

**Data descoberta:** 2026-04-22
**Fase:** 3
**Arquivo Java:** `pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/verba/Verba.java:678-680`
**Método:** `isTipoDaQuantidadeImportadaDoCartaoDePonto()`

**Descrição:**
```java
public boolean isTipoDaQuantidadeImportadaDoCartaoDePonto() {
    return false;
}
```

O método ignora o campo `tipoDaQuantidade` e devolve `false` sempre. Os outros três predicados análogos (`isTipoDaQuantidadeInformada`, `isTipoDaQuantidadeAvos`, `isTipoDaQuantidadeImportadaDoCalendario`) comparam corretamente contra o `TipoDeQuantidadeEnum`.

**Comportamento correto esperado:**
Deveria ser `return TipoDeQuantidadeEnum.IMPORTADA_DO_CARTAO_DE_PONTO.equals(this.tipoDaQuantidade);` — simétrico aos demais predicados.

**Hipótese:** o valor `IMPORTADA_DO_CARTAO_DE_PONTO` pode ter sido removido do enum entre versões do PJe-Calc; o método ficou como stub e nunca foi deletado. O TS preserva o stub.

**Impacto medido:**
Hoje zero (método nunca é chamado no caminho quente do cálculo dos 14 casos). Se verbas com quantidade importada do cartão passarem a ser usadas, o bug pode afetar o engine. A detecção real de importação do cartão-ponto é feita via `Verba.getTipoImportadadoDoCartaoDePonto()` (campo separado), então o bug não tem efeito prático conhecido.

**Decisão do port:**
Preservar bug (fidelidade semântica). Port TS tem comentário inline linkando a este DV-002.

**Caso de teste:**
`src/lib/pjecalc/core/dominio/verba/__tests__/verba.golden.test.ts` — describe `Verba — helpers de enums` → teste `isTipoDaQuantidadeImportadaDoCartaoDePonto SEMPRE retorna false (DV-002)`.
