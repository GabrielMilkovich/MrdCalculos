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
