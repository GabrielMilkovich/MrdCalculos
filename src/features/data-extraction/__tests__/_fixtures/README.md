# Fixture Bank — banco de regressão de CSVs

Cada bug reportado por usuário/auditoria vira uma fixture eterna aqui. Os
testes em `__tests__/fixture-bank.test.ts` e
`__tests__/parsers/<doc>-invariantes.test.ts` iteram automaticamente todas
as fixtures cadastradas — basta adicionar a pasta para começar a testar.

## Estrutura

```
_fixtures/
├── cartao-ponto/
│   └── <id-curto>/
│       ├── ocr.txt          (obrigatório) — OCR puro do documento
│       ├── expected.csv     (opcional)   — CSV esperado byte-a-byte
│       └── notes.md         (recomendado) — contexto + bugs cobertos
├── ferias/
├── faltas/
└── holerite/
```

## Como adicionar uma fixture nova

1. Identifique o tipo do documento (cartao-ponto / ferias / faltas / holerite)
2. Crie pasta `_fixtures/<doc>/<id-curto>/`
3. Cole o OCR completo em `ocr.txt`
4. (Opcional) Cole o CSV esperado em `expected.csv` — vai habilitar
   comparação byte-a-byte
5. (Opcional) Escreva `notes.md` com contexto: empresa, período, bugs
   históricos, dias-chave para conferir
6. Rode `npx vitest run` — fixture é detectada automaticamente

## O que é validado em cada fixture

Independente de ter `expected.csv` ou não, **invariantes universais** são
sempre validadas:

### Cartão-Ponto
- I1 — Datas do CSV ⊆ datas do OCR (sem data fantasma)
- I2 — Datas únicas no CSV
- I3 — Toda hora HH:MM no CSV existe no OCR (sem alucinação)
- I4 — Round-trip: re-parsear o CSV preserva todas as batidas
- I6 — 13 colunas exatas
- I7 — UTF-8 + `;` + CRLF

### Férias
- I3 — Relativa do CSV ⊆ relativas do OCR
- I2 — Datas de gozo do CSV ⊆ datas do OCR
- I4 — 15 colunas
- I5 — Encoding correto
- I6 — Prazo ∈ [0, 60]
- I7 — Situação válida (G/GP/NG/I/P)

### Faltas
- I1 — Datas do CSV ⊆ datas do OCR
- I2 — 5 colunas
- I3 — Booleanos S/N
- I5 — Encoding correto
- I6 — Justificativa ≤ 200 chars

### Holerite
- I1 — Nomes do classify ⊆ nomes do parser
- I2 — Soma agregada == soma das `incluir=true`
- I4 — Descontos sempre `incluir=false`
- I5 — Hint "ignorar" sempre `incluir=false`
- I6 — Sem hint → `salario_fixo` (fallback)

Adicionalmente, **fuzzers determinísticos** com 5 seeds × 100-200 inputs
sintéticos por documento garantem que entradas nunca-vistas não quebram
nenhuma das invariantes acima.

## Re-gerar `expected.csv` após mudança intencional no parser

Quando você corrigir um bug no parser e a saída esperada mudar, rode:

```bash
npx tsx scripts/regen-expected-csv.ts <doc> <fixture-id>
```

(Crie o script se ainda não existir — ele só roda parser + builder e
escreve no expected.csv.)
