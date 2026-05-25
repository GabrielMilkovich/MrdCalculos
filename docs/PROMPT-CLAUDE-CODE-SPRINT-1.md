# Prompt — Claude Code: Sprint 1 (Plumbing Ficha Financeira)

> Copia esse arquivo inteiro no chat do Claude Code (não como prompt, como conteúdo de mensagem).
> Pressuposto: você está no diretório `MrdCalculos/`, branch `main` no SHA pelo menos `e3d2cdc`.

---

## Contexto

Estou trabalhando no MRD Calc (TypeScript/React/Supabase, replica PJe-Calc v2.15.1). Acabei de aprovar o plano em `docs/ARQUITETURA-FICHA-FINANCEIRA-CTPS.md`. **Leia ele inteiro antes de qualquer coisa.**

Estamos executando **Sprint 1 — Plumbing**. Escopo (8-12h):

1. Migration: enum `tipo_extracao` recebe `ficha_financeira`
2. Migration: tabela `rubrica_catalogo` + seed Via Varejo
3. Classificador upload: heurística detecta `ficha_financeira` vs `holerite`
4. Trigger pipeline: `process-document-start` roteia novo tipo para `parse-ficha-financeira`
5. Smoke: upload PDF, confirmar via log que vai pro parser certo

**NÃO** tocar em parser, UI, exporter, validador. Isso é sprint posterior.

---

## Regras (não negociáveis)

1. **Toda hipótese vira SQL ou simulação local ANTES de virar fix.** Hipótese derrubada não vai pro commit.
2. **`git pull --ff-only` antes de qualquer edit** (já queimei isso 2× em sprints passadas).
3. **Validar contra schema real do banco via MCP Supabase** antes de criar migration. Não confiar só em `types.ts` ou nos arquivos de migration locais.
4. **Cada Edge function deployada precisa de smoke real** (curl + log), não só `supabase functions serve`.
5. **Decimal.js em TUDO que é dinheiro.** Number só pra contadores e IDs.
6. **`as any` é proibido** sem comentário justificando.
7. **Migration aplicada nunca é editada.** Se errei, faço migration nova de correção.
8. **Vitest: 2620 ✓ continuam verdes.** Zero regressão.

---

## Tarefas detalhadas

### Tarefa 1.1 — Migration enum `tipo_extracao`

Arquivo: `supabase/migrations/20260525120000_add_ficha_financeira_tipo_extracao.sql`

```sql
-- Adiciona 'ficha_financeira' ao enum tipo_extracao do schema documents.
-- Pré-requisito para roteamento do pipeline de extração para o parser
-- determinístico ADP/Via Varejo que já existe em parse-ficha-financeira.
--
-- Plano: docs/ARQUITETURA-FICHA-FINANCEIRA-CTPS.md Sprint 1

-- 1. Adicionar valor ao enum (PostgreSQL não permite remover, só add)
ALTER TYPE public.tipo_extracao ADD VALUE IF NOT EXISTS 'ficha_financeira';

-- 2. Verificar CHECK constraint se existir (se tipo for text + check)
-- (Se tipo_extracao for ENUM nativo, ADD VALUE acima basta)

-- 3. Comment para documentação
COMMENT ON TYPE public.tipo_extracao IS
  'Tipos de extração: nao_extrair | holerite | ficha_financeira | cartao_ponto | ctps';
```

**ANTES de criar:** validar via MCP Supabase:
```sql
-- Confirma se é enum nativo ou text + check
SELECT typname, typtype FROM pg_type WHERE typname = 'tipo_extracao';
-- Lista valores atuais
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tipo_extracao');
```

Se for text + check constraint em vez de enum:
```sql
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_tipo_extracao_check;
ALTER TABLE documents ADD CONSTRAINT documents_tipo_extracao_check
  CHECK (tipo_extracao IN ('nao_extrair', 'holerite', 'ficha_financeira', 'cartao_ponto', 'ctps'));
```

**Validação pós-migration:**
```sql
SELECT enum_range(NULL::tipo_extracao);
-- Deve listar: {nao_extrair,holerite,cartao_ponto,ctps,ficha_financeira}
```

Atualizar também o tipo TS: `src/features/data-extraction/types.ts`:
```typescript
export type TipoExtracao =
  | 'nao_extrair'
  | 'holerite'
  | 'ficha_financeira'  // NOVO — Sprint 1
  | 'cartao_ponto'
  | 'ctps';
```

E rodar `npm run gen-types-supabase` (se existir, ou comando equivalente) pra atualizar `src/integrations/supabase/types.ts`.

### Tarefa 1.2 — Migration tabela `rubrica_catalogo` + seed

Arquivo: `supabase/migrations/20260525120100_rubrica_catalogo.sql`

DDL completo está em `docs/ARQUITETURA-FICHA-FINANCEIRA-CTPS.md` seção 4.2.

Seed: copiar INSERT da seção 4.3 (56 códigos Via Varejo).

**Pós-migration:**
```sql
-- Validar seed
SELECT empregador, COUNT(*) FROM rubrica_catalogo GROUP BY empregador;
-- Esperado: VIA_VAREJO | 56

-- Validar que blocklist está coberto
SELECT codigo, denominacao_canonica, classe_documento
FROM rubrica_catalogo
WHERE classe_documento IN ('BASE', 'PROV', 'ENCAR')
ORDER BY codigo;
```

RLS:
```sql
ALTER TABLE rubrica_catalogo ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer authenticated user
CREATE POLICY "Authenticated users can read rubrica_catalogo"
  ON rubrica_catalogo FOR SELECT
  TO authenticated USING (true);

-- Escrita: só service role (gerenciado por backend)
-- Operadores adicionam via Edge Function que valida e autoriza.
```

### Tarefa 1.3 — Classificador upload (heurística)

Arquivo novo: `supabase/functions/_shared/classifiers/document-type-classifier.ts`

```typescript
// Classificador heurístico para tipo de extração de documento.
// Determinístico, sem LLM. Roda no upload antes de qualquer processamento.

export type ClassificacaoResult = {
  tipo: 'nao_extrair' | 'holerite' | 'ficha_financeira' | 'cartao_ponto' | 'ctps';
  confianca: 'alta' | 'media' | 'baixa';
  motivos: string[];
};

const HEURISTICAS = {
  ficha_financeira: [
    { regex: /ficha\s+financeira/i, peso: 5, motivo: 'Título contém "Ficha Financeira"' },
    { regex: /ano\s+compet[eê]ncia\s*:\s*\d{4}/i, peso: 3, motivo: 'Header "Ano Competência : YYYY"' },
    { regex: /janeiro.*fevereiro.*mar[çc]o.*abril.*maio.*junho/is, peso: 4, motivo: '12 meses no header' },
    { regex: /pgto.*desc.*base.*encar/is, peso: 2, motivo: 'Coluna Clas com PGTO/DESC/BASE/ENCAR' },
  ],
  holerite: [
    { regex: /demonstrativo\s+de\s+pagamento/i, peso: 4, motivo: 'Título "Demonstrativo de Pagamento"' },
    { regex: /(recibo|holerite|contracheque)/i, peso: 3, motivo: 'Termo holerite/recibo/contracheque' },
    { regex: /per[íi]odo\s*:\s*\d{2}\/\d{2}\/\d{4}\s+a\s+\d{2}\/\d{2}\/\d{4}/i, peso: 3, motivo: 'Período mensal único' },
  ],
  ctps: [
    { regex: /carteira\s+de\s+trabalho/i, peso: 5, motivo: 'Título "Carteira de Trabalho"' },
    { regex: /anota[çc][õo]es\s+gerais/i, peso: 3, motivo: 'Seção "Anotações Gerais"' },
    { regex: /per[íi]odo\s+aquisitivo.*per[íi]odo\s+de\s+gozo/is, peso: 4, motivo: 'Tabela férias/gozo' },
    { regex: /afastamentos/i, peso: 3, motivo: 'Seção Afastamentos' },
  ],
  cartao_ponto: [
    { regex: /(cart[ãa]o\s+de\s+ponto|registro\s+de\s+ponto)/i, peso: 5, motivo: 'Título cartão de ponto' },
    { regex: /(entrada|sa[íi]da).*(entrada|sa[íi]da)/i, peso: 2, motivo: 'Colunas Entrada/Saída' },
  ],
};

export function classifyDocumentType(textoExtraido: string): ClassificacaoResult {
  const scores: Record<string, { peso: number; motivos: string[] }> = {
    ficha_financeira: { peso: 0, motivos: [] },
    holerite: { peso: 0, motivos: [] },
    ctps: { peso: 0, motivos: [] },
    cartao_ponto: { peso: 0, motivos: [] },
  };

  // Limita a primeiras 10000 chars pra performance
  const texto = textoExtraido.slice(0, 10000);

  for (const [tipo, regras] of Object.entries(HEURISTICAS)) {
    for (const regra of regras) {
      if (regra.regex.test(texto)) {
        scores[tipo].peso += regra.peso;
        scores[tipo].motivos.push(regra.motivo);
      }
    }
  }

  // Pega o tipo com maior peso
  const [tipoVencedor, dadosVencedor] = Object.entries(scores)
    .sort(([, a], [, b]) => b.peso - a.peso)[0];

  // Limiar de confiança
  let confianca: 'alta' | 'media' | 'baixa';
  if (dadosVencedor.peso >= 8) confianca = 'alta';
  else if (dadosVencedor.peso >= 4) confianca = 'media';
  else confianca = 'baixa';

  // Peso 0 = não conseguiu classificar
  if (dadosVencedor.peso === 0) {
    return {
      tipo: 'nao_extrair',
      confianca: 'baixa',
      motivos: ['Nenhuma heurística casou'],
    };
  }

  return {
    tipo: tipoVencedor as ClassificacaoResult['tipo'],
    confianca,
    motivos: dadosVencedor.motivos,
  };
}
```

Tests unitários: `supabase/functions/_shared/classifiers/__tests__/document-type-classifier.test.ts`

Casos de teste (mínimo):
- Ficha Financeira ADP/Via Varejo → `ficha_financeira` confiança alta
- Holerite mensal genérico → `holerite` confiança alta
- CTPS digital → `ctps` confiança alta
- Cartão de ponto → `cartao_ponto` confiança alta
- PDF aleatório (lorem ipsum) → `nao_extrair` confiança baixa
- Borderline: PDF que tem "ficha" mas não "ficha financeira" → confiança média

### Tarefa 1.4 — Integrar classificador no upload

Localizar onde upload ocorre. Procurar por:

```bash
grep -rln "uploadDocument\|handleUpload\|onDocumentUpload\|tipo_extracao_origem.*auto" \
  src/components/cases/ src/features/data-extraction/ \
  --include="*.ts" --include="*.tsx"
```

Provavelmente em `DocumentsManager.tsx` ou similar. Onde houver:
```typescript
const tipo = await detectarTipoExtracao(file);
// ou
const tipo = classifierBasico(file);
```

Substituir/aumentar para chamar `classifyDocumentType` após OCR/extração inicial de texto.

Salvar:
```typescript
{
  tipo_extracao: classificacao.tipo,
  tipo_extracao_origem: 'auto',
  tipo_extracao_confianca: classificacao.confianca,
  tipo_extracao_motivos: classificacao.motivos,
}
```

### Tarefa 1.5 — Trigger pipeline orchestrator

Localizar `process-document-start` (provavelmente `supabase/functions/process-document-start/index.ts`).

Hoje provavelmente tem algo como:
```typescript
switch (doc.tipo_extracao) {
  case 'holerite': await chamarHoleriteParser(); break;
  case 'cartao_ponto': await chamarCartaoPontoParser(); break;
  case 'ctps': await chamarCtpsParser(); break;
}
```

Adicionar:
```typescript
case 'ficha_financeira':
  await chamarFichaFinanceiraParser(supabase, doc);
  break;
```

Onde `chamarFichaFinanceiraParser` invoca `parse-ficha-financeira` edge function:
```typescript
async function chamarFichaFinanceiraParser(supabase, doc) {
  const { data, error } = await supabase.functions.invoke('parse-ficha-financeira', {
    body: {
      storage_path: doc.storage_path,
      storage_bucket: doc.storage_bucket || 'case-documents',
      ano_referencia: extrairAnoReferencia(doc), // do título ou OCR
      tipo_documento: 'ficha_financeira',
    },
  });
  if (error) throw error;
  // Salvar resultado em documents.parsed (jsonb)
  await supabase.from('documents').update({
    parsed: data,
    extracao_status: 'done',
  }).eq('id', doc.id);
}
```

### Tarefa 1.6 — Smoke real

```bash
# 1. Deploy migrations
supabase db push

# 2. Deploy edge functions
supabase functions deploy parse-ficha-financeira
supabase functions deploy process-document-start

# 3. Smoke real:
# - Acessar https://mrdcalc.vercel.app
# - Abrir case ROSICLEIA (ou criar novo)
# - Upar "Ficha Financeira 2016.pdf" do caso ROQUE
# - Conferir nos logs da edge function:
#   - process-document-start: "ROUTING: tipo_extracao=ficha_financeira"
#   - parse-ficha-financeira: "DETERMINISTIC: N rubricas extraídas"
# - Conferir documents.parsed no banco (via MCP):
#   SELECT id, file_name, tipo_extracao, parsed->'_meta'->>'parser' AS parser,
#          jsonb_array_length(parsed->'rubricas') AS qtd_rubricas
#   FROM documents
#   WHERE id = '<id_do_doc>';
# - Esperado:
#   tipo_extracao = 'ficha_financeira'
#   parser = 'ficha-financeira-deterministic-v1'
#   qtd_rubricas >= 20 (caso ROQUE 2016 tem 25+ rubricas PGTO)
```

**Se o parser determinístico não pegar (parser=null ou cai no Claude), debug**:
- Roda `pdftotext -layout` localmente no PDF
- Confirma se output tem `|` separadores (parser espera markdown table)
- Se output do extrator atual (pdfjs no edge runtime) não gera `|`, precisa ajustar geometric extractor

---

## Critério de pronto Sprint 1

- [ ] Migration enum `ficha_financeira` aplicada em prod
- [ ] Migration `rubrica_catalogo` aplicada com 56 rows VIA_VAREJO
- [ ] Tipo TS `TipoExtracao` atualizado e `npm run gen-types-supabase` rodou
- [ ] Classificador heurístico tem 6+ testes unitários passando
- [ ] Upload de Ficha Financeira ROQUE 2016 classifica como `ficha_financeira` confiança alta
- [ ] `process-document-start` invoca `parse-ficha-financeira` (visível em log)
- [ ] `documents.parsed` no banco contém JSON com `rubricas[]` length >= 20
- [ ] Vitest: 2620+ ✓ (zero regressão)
- [ ] `tsc --noEmit`: exit 0
- [ ] PR review: explicação de cada decisão no description

---

## O que NÃO fazer nesta sprint

- ❌ Tocar em UI (Sprint 3)
- ❌ Construir validador semântico (Sprint 2)
- ❌ Construir exporter ZIP (Sprint 4)
- ❌ Tocar em CTPS (Sprint 6)
- ❌ Expandir catálogo para outros empregadores (faz quando aparecer caso real)
- ❌ Tentar consertar bugs do parser determinístico que apareçam (registra como Sprint 2)

Se aparecer algo fora do escopo: registra em `docs/PENDENCIAS-CONSOLIDADO.md` "Pendências menores" e segue.

---

## Quando terminar

Cola na conversa:

```
Sprint 1 concluída. Critérios:
- [x] item 1
- [x] item 2
...

Commits: <SHAs>
Smoke real OK / FALHOU (motivo)
Próxima sprint: 2 (Enriquecimento + Validador) — ~10-15h
```

Aguardar minha confirmação antes de começar Sprint 2.
