# Gate 2 — Checklist Manual de Validação Visual

**Contexto:** hotfix OCR/CSV (commits `a32ab36` + `7a3604c` + `5551cd1`)
+ infraestrutura de teste de componente (commits `3e1e4ad` + `11e5910`).

**Quando rodar:** depois do `npm run dev` local, antes do Gate 3 (10
documentos reais).

**Tempo estimado:** ~5 minutos por cenário, ~15 minutos no total.

**O que este checklist cobre:** comportamento tátil que testes
automatizados não capturam — cursor, tooltip, click drop em botão
disabled, renderização visual final do banner. A lógica condicional
em si já está coberta pelos 17 testes (4 RTL + 7 classifier + 6
parser HT/HE) do commit `11e5910`.

---

## Setup

```bash
# Branch ainda é claude/fix-ocr-csv-bugs-SXGcl ou já em main
git checkout main   # ou a branch atual do hotfix
git pull
npm install
npm run dev
# Abre http://localhost:8080
# Faz login com credencial de dev habitual
```

---

## Cenário 1 — Banner-bloqueador (a32ab36)

### Componente alvo
`src/components/cases/data-extraction/ReviewLayout.tsx:320-335` (banner)
e `:445` (botão `disabled`).

```tsx
// src/components/cases/data-extraction/ReviewLayout.tsx:320
{bloqueador && (
  <div role="alert" className="border border-rose-400 ...">
    <div className="flex items-center gap-1.5 font-semibold text-rose-900 ...">
      <AlertTriangle className="h-3.5 w-3.5" /> Download bloqueado —{" "}
      {bloqueadorMotivo ?? "inconsistência grave detectada."}
    </div>
    <p>Re-execute o OCR ... Este bloqueio não pode ser sobrescrito.</p>
  </div>
)}

// src/components/cases/data-extraction/ReviewLayout.tsx:445
disabled={confirmDisabled || downloading || bloqueador === true}
```

Para Holerite e CTPS, banner inline com a mesma estrutura:
- `HoleritePreviewDialog.tsx:398-415` (banner inline)
- `CtpsReviewDialog.tsx:226-241` (banner agregado dos sub-scores)

### Como reproduzir
Abrir um documento que sabidamente dispara score baixo:
- PDF scan rasurado / contraste ruim
- Holerite com rubricas que não somam o "Total Bruto" declarado
- Cartão de ponto onde o parser extrai zero apurações

### O que olhar (tátil)
- [ ] **Banner vermelho aparece** acima da área de revisão, com ícone
      `AlertTriangle`, texto começando com "Download bloqueado —"
      seguido do motivo específico
- [ ] **Texto do motivo é legível** (não é `[object Object]`, não está
      truncado)
- [ ] **Botão "Baixar CSV" / "Confirmar e baixar ZIP" está disabled**
      visualmente (opacidade reduzida, cursor `not-allowed` no hover)
- [ ] **Click no botão disabled não dispara nada** — sem AlertDialog
      de gate, sem toast, sem network request
- [ ] **Tooltip do botão (hover)** mostra `Download bloqueado: <motivo>`
- [ ] **Banner usa `role="alert"`** (clique direito → inspect element
      → confirma `role="alert"`)

### Falha = parar e reportar

---

## Cenário 2 — Holerite totalizador (7a3604c)

### Componente alvo
`src/components/cases/data-extraction/HoleritePreviewDialog.tsx:695-714`
(linha da tabela com `origem='totalizador_suspeito'`):

```tsx
// src/components/cases/data-extraction/HoleritePreviewDialog.tsx:695
const rowClass = isTotalizadorSuspeito
  ? "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-900 ..."
  : ...

// disabled checkbox
<Checkbox
  ...
  disabled={isDesconto || isTotalizadorSuspeito}
/>
```

Badge de origem em `:807`:
```tsx
const motivo = origem === "totalizador_suspeito"
  ? "Linha parece totalizador (Total Bruto / Líquido / Total Desc).
     Excluída do CSV automaticamente."
  : hint?.motivo ?? null;
```

### Como reproduzir
Holerite real onde o OCR captura uma linha terminal tipo:
- `Total Liquido R$ 5.000,00`
- `Liquido a Receber 4.250,00`
- `Total Desc 385,75`
- `Liquido 2.989,25`

### O que olhar (tátil)
- [ ] **Rubricas reais (Salário, Periculosidade, etc.)** aparecem na
      tabela com cor neutra, checkbox marcado, categoria atribuída
- [ ] **Linha do totalizador** (se vazou do parser) aparece com **fundo
      rose-50 / texto rose-900**, checkbox **disabled**, categoria
      "Ignorado"
- [ ] **Tooltip do badge "totalizador"** ao hover mostra: "Linha parece
      totalizador (Total Bruto / Líquido / Total Desc). Excluída do CSV
      automaticamente."
- [ ] **Total no rodapé do dialog** ("Total que vai pro ZIP final")
      **NÃO inclui** o valor do totalizador — só as rubricas reais
- [ ] **Bonus crítico:** se você tem holerite com rubrica legítima cujo
      nome contém "Liquido" como palavra (ex: "Liquido Mensal",
      "Adiantamento Liquido"), confirma que **NÃO** sumiu da tabela
      nem foi marcada como `totalizador_suspeito`

### Vetor de falso-positivo a vigiar
Rubrica nome `Liquido a Receber Antecipado` — pelo regex atual de
hints (`hints.ts` linha `liquido\s+a\s+receber\b`), é classificada
como totalizador. Se isso aparecer em holerite real e for rubrica
legítima do empregador, reportar — é dívida na regra de hint, não
no parser.

### Falha = parar e reportar

---

## Cenário 3 — Cartão de ponto HT/HE (5551cd1)

### Componente alvo
`src/features/data-extraction/parsers/cartao-ponto/layouts/generico-v1.ts:432-441`
(detecção document-level):

```ts
// src/features/data-extraction/parsers/cartao-ponto/layouts/generico-v1.ts:432
const TEM_COLUNAS_HT_HE =
  /\bHT\b[\s\S]{0,40}?\bHE\b/i.test(ocrText) ||
  /\bHE\b[\s\S]{0,40}?\bHT\b/i.test(ocrText) ||
  /\bHE\b[\s\S]{0,40}?\bDSR\b/i.test(ocrText);

// :598 - quando true, cap em 4 horas por linha
const marcacoes = capturarMarcacoes(
  semData,
  inseridas,
  desconsideradas,
  TEM_COLUNA_DUPLA_REGISTRADO_TRABALHO || TEM_COLUNAS_HT_HE ? 4 : undefined,
);
```

UI exibe as marcações em `CartaoPontoReviewDialog.tsx` (tabela editável
de batidas).

### Como reproduzir
Cartão de ponto de fornecedor que sabidamente usa colunas HT/HE
inline (Senior, ADP, Totvs). Header da tabela tem texto tipo:
`Data E1 S1 E2 S2 HT HE` ou variantes.

### O que olhar (tátil)
- [ ] **Para cada dia:** exatamente o número de pares E/S que a tabela
      original do empregador mostra (tipicamente 2 pares — manhã +
      tarde)
- [ ] **Valores das colunas HT/HE no final da linha** (ex: `08:30`,
      `00:30`) **NÃO aparecem** como entrada/saída de batida na tabela
      revisada
- [ ] **Marcação cronologicamente impossível** (ex: entrada `08:30` →
      saída `00:30`) **não existe** na tabela revisada
- [ ] **Score do documento** (badge no header do dialog) deve ser
      `alta` ou `média` — se vier `baixa` com banner-bloqueador
      acionado, é outro problema (Cenário 1)

### Vetor da dívida técnica P0 a vigiar
Se o OCR do scan **perdeu o cabeçalho** "HT HE" (acontece em scans
ruins), o detector `TEM_COLUNAS_HT_HE` retorna `false`, cap default
de 12 horas se aplica, e a batida-fantasma `08:30 → 00:30` reaparece
na tabela. **Se observar isso em produção:** registrar exatamente
qual fornecedor + qual cartão e me reportar. Critério P0 documentado
no commit `5551cd1` e no teste `cartao-ponto-ht-he-variants.test.ts`
da seção "fronteira honesta do detector".

### Falha = decidir reverter `5551cd1` ou apenas registrar para PATCH 3

---

## Bônus — PATCH 4 (OCR visível por default)

Não é cenário próprio, mas vale confirmar de passagem:

### Componente alvo
`src/components/cases/data-extraction/ReviewLayout.tsx:166-170`:

```ts
// Default: OCR VISÍVEL. Operador precisa do contexto fonte para revisão
// jurídica responsável. Pode esconder se quiser e a preferência persiste.
const [ocrHidden, setOcrHidden] = useState<boolean>(() =>
  readLs(LS_KEY_OCR_HIDDEN + lsSuffix, false),
);
```

### O que olhar
- [ ] **Em browser limpo** (modo anônimo / `localStorage.clear()`), ao
      abrir qualquer dialog de revisão (cartão / férias / faltas), o
      **painel OCR aparece visível** ao lado da tabela editável
- [ ] Clicar em "Ocultar OCR" no header esconde — e a preferência
      persiste no `localStorage` (chave `review-layout:ocr-hidden`)

---

## Entrega do Gate 2

Após executar os 3 cenários:

1. Capturar 1 screenshot por cenário (banner, totalizador, batidas)
2. Anexar os screenshots em `docs/audit/gate2-screenshots/`
3. Preencher um YES/NO simples no fim deste arquivo:

```
- [ ] Cenário 1 banner-bloqueador: OK
- [ ] Cenário 2 holerite totalizador: OK
- [ ] Cenário 3 cartão HT/HE: OK
- [ ] PATCH 4 OCR visível default: OK
```

Se todos os 4 marcados, Gate 2 fecha → liberar Gate 3 (10 docs reais).
Se qualquer falha, registrar arquivo:linha do bug + screenshot e me
chamar antes de prosseguir.
