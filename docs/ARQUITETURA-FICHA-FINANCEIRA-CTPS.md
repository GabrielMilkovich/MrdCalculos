# Arquitetura — Importação de Ficha Financeira e CTPS

> Plano estrutural completo para fechar Prioridades 2 e 3 do `PENDENCIAS-CONSOLIDADO.md`.
> Escopo declarado pelo Gabriel: "solução estrutural completa (arquitetura nova, catálogo de códigos, validador, testes)".
>
> **Estimativa do esforço total: 40-70h.** Não é hotfix.

---

## 1. Contexto e diagnóstico (resumo)

Caso de teste auditado: **ROQUE GUERREIRO TEIXEIRA vs GRUPO CASAS BAHIA / Via Varejo** — processo `0000610-03.2021.5.09.0245` (TRT9).

PDFs anexados em `docs/casos-teste/roque/`:
- `Contracheques.pdf` (405KB, mensais consolidados)
- `CTPS.pdf` (83KB, com Período Aquisitivo + Afastamentos + Afastamentos Outros)
- `Ficha Financeira 2016/2018/2019/2020/2021.pdf` (5 PDFs anuais ADP/Via Varejo)

CSVs gerados pelo MRD Calc (caminho velho, pré-commits 24/05) em `docs/casos-teste/roque/extraido-mrdcalc-velho/`:
- `Ficha_Financeira_2016_pjecalc.zip` — 50 linhas em `auditoria_completa.csv`, todas com `Codigo` vazio e `Origem=fallback`, todas com `Categoria=salario_fixo`. `historico_salarial_salario_fixo.csv` virou 1 linha `06/2021; 21532,58` (soma de tudo)
- `Ficha_Financeira_2018_pjecalc.zip` — idem
- `CTPS_ctps.zip` — `CTPS_ferias.csv` VAZIO (só cabeçalho), `CTPS_faltas.csv` com 19 períodos aquisitivos exportados como faltas não-justificadas

Falhas catastróficas confirmadas:
- PDF tem texto extraível (`pdftotext -layout` lê tudo perfeitamente, fontes embebidas CourierNewPSMT). Parser ignorou e fez OCR ruim
- Códigos de rubrica (4 dígitos: `0040`, `0501`, `0620`...) ignorados — coluna `Codigo` vazia em 100% das linhas
- Classes PGTO/DESC/BASE/ENCAR/OUTRO/PROV ignoradas — tudo cai em `salario_fixo` por fallback
- 12 colunas de mês (Janeiro-Dezembro) colapsadas em 3 valores aleatórios (`Vencimento`, `Desconto`, `Quantidade`)
- Data de geração do PDF (06/2021) virou competência das rubricas (rubricas de 2016!)
- Bases de cálculo (`Base IR`, `Base INSS`, `Base FGTS`) viraram verbas em vez de serem filtradas
- CTPS: períodos aquisitivos (`24/11/2003 a 22/11/2004`) exportados como faltas não-justificadas → 6202 dias de "falta" fictícia

**Causa raiz:** Ficha Financeira está sendo classificada como `holerite` no upload e processada pelo pipeline de holerite (`holerite-zip.ts`), que foi feito pra processar 1 contracheque mensal único, não tabela anual com 12 meses.

---

## 2. Estado atual do código (mapeamento)

### Já existe (reusar, não reescrever)

| Componente | Caminho | Linhas | Observação |
|---|---|---|---|
| Parser determinístico ADP | `supabase/functions/_shared/parsers/ficha-financeira-deterministic.ts` | 262 | Fast path zero-custo, detecta layout, parse markdown table |
| Edge function Ficha | `supabase/functions/parse-ficha-financeira/index.ts` | 440 | Fast path → Claude Sonnet+PDF fallback com tool calling |
| Blocklist códigos | Embutido nos dois arquivos acima | — | Cobre 5xxx, 6xxx, 8xxx, 9xxx, 0509/0517/0521/0525 |
| Catálogo código → categoria | `CODE_TO_CATEGORY` no parser determinístico | 25 entradas | **Insuficiente** — caso ROQUE tem ~60 códigos únicos |
| Mapper ontologia V2 | `supabase/migrations/20260524000000_rubrica_aliases_v2.sql` | — | Mapeia alias OCR → categoria, pode ser reusado |
| Tipos UI | `src/features/data-extraction/types.ts` | — | `TipoExtracao` enum precisa receber `ficha_financeira` |
| Pipeline orchestrator | `supabase/functions/process-document-start/` | — | Onde adicionar roteamento por tipo |

### NÃO existe (construir)

1. Migration enum + CHECK constraint pra `ficha_financeira`
2. Classificador automático `holerite` vs `ficha_financeira` no upload
3. Trigger pipeline rotear `ficha_financeira` → `parse-ficha-financeira`
4. UI de preview/edição de Ficha Financeira (tabela mensal, não cabe no HoleritePreviewDialog)
5. Exporter ZIP no formato PJe-Calc 2.15.1 (1 linha por competência mensal)
6. Validador semântico (soma rubricas extraídas vs Total do PDF, ±1%)
7. Catálogo de códigos expandido (mínimo 100 códigos Via Varejo + comuns de outros empregadores)
8. Smoke real importando ZIP no PJe-Calc 2.15.1 desktop
9. Teste e2e no CI bloqueando PR que escapa da faixa ±5%

---

## 3. Arquitetura proposta

### 3.1. Fluxo end-to-end

```
┌─────────────────────────────────────────────────────────────────┐
│  UPLOAD                                                          │
│  Operador anexa PDF na case page                                 │
└────────────────────────────────┬─────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  CLASSIFICADOR DE TIPO (novo)                                    │
│  Heurística determinística (Edge Function "classify-document"):  │
│  - Lê primeiras 5 páginas via pdftotext                          │
│  - Detecta:                                                      │
│    * Título contém "Ficha Financeira" → ficha_financeira         │
│    * Header tem 12 meses distintos (Janeiro..Dezembro) → ficha   │
│    * 1 competência única + Período/Líquido → holerite            │
│    * "Carteira de Trabalho" / "Anotações Gerais" → ctps          │
│    * Tabela diária com horários → cartao_ponto                   │
│  - Confiança baixa → operador escolhe manualmente                │
└────────────────────────────────┬─────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PIPELINE ORCHESTRATOR                                           │
│  (process-document-start, switch case por tipo_extracao)         │
│                                                                   │
│  ficha_financeira ──► parse-ficha-financeira (já existe)         │
│  holerite         ──► holerite-classify-confirm (já existe)      │
│  cartao_ponto     ──► extract-document-rubricas                  │
│  ctps             ──► extract-ctps-ferias + extract-ctps-faltas  │
└────────────────────────────────┬─────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  EXTRAÇÃO                                                        │
│  parse-ficha-financeira:                                         │
│  1. Fast path: parseFichaFinanceiraDeterministico (existe)       │
│  2. Fallback: Claude Sonnet 4.6 + PDF + tool calling (existe)    │
│  3. Pós-processamento: blocklist + filtro PGTO (existe)          │
│  4. ENRIQUECIMENTO (novo):                                       │
│     - Lookup código no CATÁLOGO EXPANDIDO                        │
│     - Marca cada rubrica com: categoria_pje, incide_fgts,        │
│       incide_inss, natureza_indenizatoria                        │
│  5. VALIDAÇÃO SEMÂNTICA (novo):                                  │
│     - Σ rubricas PGTO por mês vs Total do PDF (extraído à parte) │
│     - Tolerância ±1% (configurável)                              │
│     - Falha → status `extracao_invalida`, bloqueia importação    │
└────────────────────────────────┬─────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  UI: FichaFinanceiraPreviewDialog (novo)                         │
│  - Tabela 12 colunas (Jan-Dez), 1 linha por rubrica              │
│  - Coluna "Total ano" calculada                                  │
│  - Linha "Total mês" no rodapé com cor (verde se valida, vermelho│
│    se fora da tolerância)                                        │
│  - Cada rubrica tem dropdown de categoria + incide_fgts/inss     │
│  - Botões: "Aceitar", "Reclassificar", "Pular este código"       │
│  - Conflito: operador classificou cod X como Y, sistema esperava │
│    Z → opção "Aprender pra próxima vez" salva em rubrica_aliases │
└────────────────────────────────┬─────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  EXPORTER: ficha-financeira-zip.ts (novo)                        │
│  Produz:                                                          │
│  - historico_salarial_<categoria>.csv (1 por categoria com soma>0)│
│    Formato PJe-Calc 2.15.1: 1 LINHA POR COMPETÊNCIA MENSAL       │
│    Cabeçalho: MES_ANO;VALOR;FGTS;FGTS_REC.;CONTRIBUICAO_SOCIAL;  │
│                CONTRIBUICAO_SOCIAL_REC.                          │
│  - auditoria_completa.csv: trilha de classificação com           │
│    Codigo, Denominacao, Classe, Categoria, Origem (catalog/      │
│    operador/blocklist), Total_Ano                                │
│  - resumo_validacao.txt: relatório do validador semântico        │
│  - metadata.json: ano, empregado, empresa, fonte (deterministic/ │
│    claude), totais por categoria                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. Princípios de design

1. **PDF com texto extraível NUNCA passa por OCR.** Detectar via `pdfinfo` + `pdffonts` antes de qualquer extração. Se tem fonte embebida e texto extraível, ler direto com pdfjs/pdftotext.

2. **Códigos numéricos são chave primária**, não nomes. Nomes mudam (truncamento, OCR ruim, variação por empresa). Códigos são estáveis dentro de cada folha de pagamento (ADP, Senior, Totvs, etc).

3. **Catálogo versionado e expansível.** Novo empregador = nova seção no catálogo. PR review checa qualidade da classificação.

4. **Validador semântico obrigatório.** Soma de tudo extraído ≠ Total do PDF → bloqueia. Nunca importar dados que não fecham.

5. **Separação clara entre extração e classificação.** Extração é determinística (código + valor + competência). Classificação (cod 0620 = comissão) é configurável via catálogo + override do operador.

6. **Aprendizado incremental.** Operador classifica manualmente código novo → vira sugestão pro próximo caso via tabela `rubrica_aliases` (já existe na V2).

---

## 4. Catálogo de códigos (expandido)

### 4.1. Status atual

`CODE_TO_CATEGORY` em `ficha-financeira-deterministic.ts` tem 25 códigos. Insuficiente para o caso ROQUE que tem **60+ códigos únicos** entre 5 anos de ficha financeira.

### 4.2. Catálogo proposto

Mover de constante hardcoded pra **tabela do banco** `rubrica_catalogo`:

```sql
CREATE TABLE public.rubrica_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- chave primária composta
  empregador text NOT NULL,                  -- 'VIA_VAREJO', 'MAGALU', 'CASAS_BAHIA', 'GENERICO'
  codigo text NOT NULL,                       -- '0620', '0501', etc
  -- classificação
  denominacao_canonica text NOT NULL,         -- 'Comissões' (canônico)
  categoria_pje text NOT NULL,                -- 'comissao', 'dsr', etc
  classe_documento text NOT NULL,             -- 'PGTO', 'DESC', 'BASE', 'ENCAR', 'OUTRO', 'PROV'
  -- flags de incidência
  incide_fgts boolean NOT NULL DEFAULT true,
  incide_inss boolean NOT NULL DEFAULT true,
  incide_ir boolean NOT NULL DEFAULT true,
  natureza_indenizatoria boolean NOT NULL DEFAULT false,
  -- aprendizado
  origem text NOT NULL DEFAULT 'manual',      -- 'manual' | 'ontologia' | 'inferido'
  confianca text NOT NULL DEFAULT 'alta',     -- 'alta' | 'media' | 'baixa'
  observacoes text,
  -- timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- constraints
  UNIQUE (empregador, codigo)
);

CREATE INDEX idx_rubrica_catalogo_codigo ON rubrica_catalogo (codigo);
CREATE INDEX idx_rubrica_catalogo_empregador_codigo ON rubrica_catalogo (empregador, codigo);
```

### 4.3. Seed inicial — Via Varejo (do caso ROQUE)

Catálogo deduzido da auditoria dos 5 PDFs de ficha + Contracheques.pdf:

```sql
INSERT INTO rubrica_catalogo (empregador, codigo, denominacao_canonica, categoria_pje, classe_documento, incide_fgts, incide_inss, incide_ir, natureza_indenizatoria) VALUES
-- PROVENTOS (PGTO)
('VIA_VAREJO', '0040', 'Participação Lucros',             'plr',           'PGTO', false, false, true,  true),
('VIA_VAREJO', '0501', 'DSR (Comissão)',                  'dsr_comissao',  'PGTO', true,  true,  true,  false),
('VIA_VAREJO', '0502', 'DSR (H. Extra)',                  'dsr_he',        'PGTO', true,  true,  true,  false),
('VIA_VAREJO', '0510', 'Adiantamento 13º Salário',         'decimo_terceiro_adto', 'PGTO', true, true, true, false),
('VIA_VAREJO', '0511', '13º Salário 1ª Parcela',           'decimo_terceiro', 'PGTO', true, true, true, false),
('VIA_VAREJO', '0590', '1/3 Adic. Constitucional Férias',  'ferias_terco',  'PGTO', true,  true,  true,  false),
('VIA_VAREJO', '0591', '1/3 Adic. Constitucional Férias',  'ferias_terco',  'PGTO', true,  true,  true,  false),
('VIA_VAREJO', '0620', 'Comissões',                        'comissao',      'PGTO', true,  true,  true,  false),
('VIA_VAREJO', '0712', 'Mínimo Garantido — Comissionista', 'minimo_garantido', 'PGTO', true, true, true, false),
('VIA_VAREJO', '0832', 'Insuficiência Saldo no Mês',       'insuf_saldo',   'PGTO', true,  true,  true,  false),
('VIA_VAREJO', '2750', 'Média de Férias',                  'ferias_media',  'PGTO', false, true,  true,  false),
('VIA_VAREJO', '2751', 'Média Férias',                     'ferias_media',  'PGTO', false, true,  true,  false),
('VIA_VAREJO', '2752', 'Diferença Média Férias',           'ferias_media',  'PGTO', false, true,  true,  false),
('VIA_VAREJO', '2823', 'Adiantamento Quinzenal',           'adto_quinzenal','PGTO', true,  true,  true,  false),
('VIA_VAREJO', '3290', 'Prêmio Antecipado',                'premio',        'PGTO', true,  true,  true,  false),
('VIA_VAREJO', '3317', 'Adicional Sábado Com. 25%',        'adicional_sabado', 'PGTO', true, true, true, false),
('VIA_VAREJO', '3368', 'Horas Justificadas / TRN',         'horas_justificadas', 'PGTO', true, true, true, false),
('VIA_VAREJO', '3391', 'Comissão Garantia',                'comissao_garantia', 'PGTO', true, true, true, false),
('VIA_VAREJO', '3393', 'Comissão Seguros',                 'comissao_seguros', 'PGTO', true, true, true, false),
('VIA_VAREJO', '3415', '1/3 Férias Pagas',                 'ferias_terco',  'PGTO', true,  true,  true,  false),
('VIA_VAREJO', '3453', 'Comissão Frete',                   'comissao_frete', 'PGTO', true, true, true, false),
('VIA_VAREJO', '4013', 'Horas Extras Com 75%',             'horas_extras_75', 'PGTO', true, true, true, false),
('VIA_VAREJO', '4016', 'Horas Extras Com 70%',             'horas_extras_70', 'PGTO', true, true, true, false),
('VIA_VAREJO', '4096', 'Comissão Montagem',                'comissao_montagem', 'PGTO', true, true, true, false),
('VIA_VAREJO', '4101', 'Prêmio Meta',                      'premio_meta',   'PGTO', true,  true,  true,  false),
('VIA_VAREJO', '4325', 'Adiantamento',                     'adiantamento',  'PGTO', true,  true,  true,  false),
('VIA_VAREJO', '7035', 'Ajuste de Líquido',                'ajuste',        'PGTO', false, false, false, false),
('VIA_VAREJO', '7076', 'PLR Variável',                     'plr',           'PGTO', false, false, true,  true),
('VIA_VAREJO', '8441', 'Antecip. Prêmio Estímulo',         'premio_estimulo', 'PGTO', true, true, true, false),
('VIA_VAREJO', '8489', 'Campanha Serviços',                'campanha',      'PGTO', true,  true,  true,  false),
-- DESCONTOS (DESC) — NÃO entram no histórico salarial, mas precisam ser identificados
('VIA_VAREJO', '0833', 'Desc. Insuficiência Saldo',        'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '2824', 'Adiantamento Quinzenal',           'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '3640', 'Prestação de Carnê',               'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '3669', 'Despesa Médica / Hospitalar',      'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '3673', 'Seguro Vida Individual',           'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '3678', 'Seguro Vida Familiar',             'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '3684', 'Convênio Médico',                  'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '3720', 'Prêmio Antecipado',                'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '3721', 'Convênio Odontológico',            'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '3743', 'Adiantamento',                     'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '3784', 'Férias Recebidas',                 'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '3795', 'Unimed FESP',                      'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '3796', 'Unimed FESP — Dependente',         'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '5500', 'IR Retido',                        'desconto_ir',   'DESC', false, false, false, false),
('VIA_VAREJO', '5560', 'INSS',                             'desconto_inss', 'DESC', false, false, false, false),
('VIA_VAREJO', '5580', 'INSS de Férias',                   'desconto_inss', 'DESC', false, false, false, false),
('VIA_VAREJO', '5616', 'Vale Alimentação',                 'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '5760', 'Contrib Sindical',                 'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '7103', 'Vale Alimentação — V',             'desconto',      'DESC', false, false, false, false),
('VIA_VAREJO', '7520', 'IR Férias',                        'desconto_ir',   'DESC', false, false, false, false),
('VIA_VAREJO', '9953', 'Líquido Férias',                   'totalizador',   'DESC', false, false, false, false),
-- BASES (BASE) — IGNORAR
('VIA_VAREJO', '5501', 'Base IR',                          'base',          'BASE', false, false, false, false),
('VIA_VAREJO', '5551', 'Base IR Part Lucros',              'base',          'BASE', false, false, false, false),
('VIA_VAREJO', '5561', 'Base INSS',                        'base',          'BASE', false, false, false, false),
('VIA_VAREJO', '8000', 'Salário Contribuição',             'base',          'BASE', false, false, false, false),
('VIA_VAREJO', '9900', 'Base Contribuição Sindical',       'base',          'BASE', false, false, false, false),
('VIA_VAREJO', '9921', 'Base FGTS',                        'base',          'BASE', false, false, false, false),
('VIA_VAREJO', '9926', 'Base FGTS Férias',                 'base',          'BASE', false, false, false, false);
```

[opinião técnica] Esse seed inicial cobre ~95% do caso ROQUE. Códigos não cobertos vão pro fluxo de operador classificar manualmente + sistema aprender. Após 3-5 casos Via Varejo classificados, catálogo cobre 99%+ automaticamente.

### 4.4. Estratégia para outros empregadores

Catálogo `VIA_VAREJO` é só o primeiro. Operação esperada:

1. Operador upa Ficha Financeira de empresa nova (Renner, Carrefour, etc)
2. Parser determinístico não reconhece layout → cai no Claude fallback
3. Claude extrai códigos + denominações
4. UI mostra cada código sem match no catálogo como "amarelo" (precisa classificar)
5. Operador classifica cada um (dropdown de categoria)
6. Sistema salva em `rubrica_catalogo` com `empregador='<DETECTADO>'`, `origem='manual'`
7. Próximo caso da mesma empresa → catálogo já tem os códigos → automático

---

## 5. Validador semântico

### 5.1. Especificação

**Regra:** Para cada competência mensal da Ficha Financeira:

```
Σ(rubricas extraídas com categoria != 'desconto' AND classe = 'PGTO') ≈ Total_Vencimentos_PDF ± 1%
```

Onde:
- `Total_Vencimentos_PDF` é a linha "Total Vencimentos" ou "Total de Proventos" do PDF para aquele mês
- Tolerância 1% é arbitrária; configurável via env `FICHA_VALIDATOR_TOLERANCE_PCT`

### 5.2. Implementação

Novo arquivo `supabase/functions/_shared/validators/ficha-financeira-validator.ts`:

```typescript
export interface ValidationResult {
  ok: boolean;
  competencias: Array<{
    competencia: string;        // 'YYYY-MM'
    total_extraido: number;
    total_pdf: number | null;   // null se não encontrado
    delta_abs: number;
    delta_pct: number;
    status: 'ok' | 'fora_tolerancia' | 'total_pdf_ausente';
  }>;
  resumo: {
    total_competencias: number;
    competencias_ok: number;
    competencias_fora: number;
    competencias_sem_total: number;
    pior_delta_pct: number;
  };
}

export function validarFichaFinanceira(
  extracao: ResultadoParse,
  totaisPorMesPDF: Map<string, number>,
  tolerancePct: number = 1.0,
): ValidationResult {
  // implementação
}
```

### 5.3. Como extrair Total do PDF

Estratégia: parser determinístico adicional `extrairTotaisPorMes` que procura linha "Total Vencimentos" ou "Total de Proventos" no PDF e mapeia pra cada mês.

Para ADP/Via Varejo, totalizador é linha com código fora do range 0000-9999 ou denominação `^Total\b` na própria tabela.

[opinião técnica] Caso Total não exista no PDF (algumas fichas não trazem), validador retorna `competencias_sem_total > 0` e UI mostra alerta amarelo. Não bloqueia, mas registra incerteza.

---

## 6. UI — FichaFinanceiraPreviewDialog

### 6.1. Wireframe ASCII

```
┌─ Ficha Financeira 2016 — ROQUE GUERREIRO TEIXEIRA / Via Varejo ──────┐
│                                                                        │
│  Status: ✅ Validado (15 meses ok, 0 fora tolerância)                  │
│                                                                        │
│  ┌─────────┬─────────────────────┬──────┬──────┬──────┬─────┬──────┐  │
│  │ Código  │ Denominação         │ Cat. │ Jan  │ Fev  │ ... │ Total│  │
│  ├─────────┼─────────────────────┼──────┼──────┼──────┼─────┼──────┤  │
│  │ 0040    │ Participação Lucros │ PLR  │ 1600 │   0  │ ... │ 1600 │  │
│  │ 0501    │ DSR (Comissão)      │ DSR  │ 362  │  27  │ ... │ 2094 │  │
│  │ 0620    │ Comissões           │ COM. │ 1309 │ 515  │ ... │ 7407 │  │
│  │ 4013    │ Horas Extras Com 75%│ HE   │   -  │   -  │ ... │  6,5 │  │
│  │ ...     │ ...                 │ ...  │ ...  │ ...  │ ... │ ...  │  │
│  ├─────────┼─────────────────────┼──────┼──────┼──────┼─────┼──────┤  │
│  │ TOTAL   │ Σ extraído (PGTO)   │      │ 5234 │ 1234 │ ... │ ...  │  │
│  │ PDF     │ Total Vencimentos   │      │ 5234 │ 1234 │ ... │ ...  │  │
│  │ DELTA   │ ±%                  │      │ 0,0% │ 0,0% │ ... │ ...  │  │
│  └─────────┴─────────────────────┴──────┴──────┴──────┴─────┴──────┘  │
│                                                                        │
│  ⚠️ Códigos sem catálogo: 4131 (Prêmio Metal), 6112 (Total Comissão)  │
│     [Classificar manualmente]                                          │
│                                                                        │
│  [Cancelar]  [Reclassificar tudo via Claude]  [Aceitar e baixar ZIP]  │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2. Componentes

- `FichaFinanceiraPreviewDialog.tsx` — wrapper
- `FichaFinanceiraTable.tsx` — tabela mensal editável
- `ClassificacaoCellEditor.tsx` — dropdown de categoria com sugestão
- `ValidationBanner.tsx` — verde/amarelo/vermelho com detalhes do delta

### 6.3. Estado interno

```typescript
interface FichaFinanceiraState {
  ano: number;
  empregador: string;
  empregado: string;
  rubricas: Array<RubricaEditavel>;
  totaisPorMes: Map<string, number>;
  validation: ValidationResult;
  pendingClassifications: Array<{ codigo: string; sugestoes: string[] }>;
}

interface RubricaEditavel {
  codigo: string;
  denominacao: string;
  categoria_atual: CategoriaPje;
  categoria_sugerida: CategoriaPje | null;
  origem: 'catalogo' | 'claude' | 'operador';
  valores_mensais: Map<string, Decimal>;
  total_ano: Decimal;
  incluida: boolean;  // toggle se entra no histórico salarial
}
```

---

## 7. Exporter ZIP — formato PJe-Calc 2.15.1

### 7.1. Arquivos no ZIP

```
ficha_<empregador>_<ano>.zip
├── historico_salarial_<categoria>.csv  (1 por categoria com soma > 0)
├── auditoria_completa.csv              (trilha de classificação)
├── resumo_validacao.txt                (relatório do validador)
└── metadata.json                       (ano, empresa, totais)
```

### 7.2. Formato `historico_salarial_<categoria>.csv`

Spec do PJe-Calc 2.15.1 (confirmado em `csv-historico.ts` existente):

```csv
"MES_ANO";"VALOR";"FGTS";"FGTS_REC.";"CONTRIBUICAO_SOCIAL";"CONTRIBUICAO_SOCIAL_REC."
"01/2016";"5234,67";"S";"N";"S";"N"
"02/2016";"1234,56";"S";"N";"S";"N"
"03/2016";"3456,78";"S";"N";"S";"N"
...
"12/2016";"4321,09";"S";"N";"S";"N"
```

**Critério:** 1 linha por competência mensal com soma > 0 das rubricas daquela categoria. **NÃO 1 linha por ano.**

Flags `FGTS`, `FGTS_REC.`, `CONTRIBUICAO_SOCIAL`, `CONTRIBUICAO_SOCIAL_REC.`:
- Vem do catálogo (`incide_fgts`, `incide_inss`)
- `_REC.` = "recolhido" = padrão "N" (ônus da empresa provar que recolheu)

### 7.3. Formato `auditoria_completa.csv`

```csv
Ordem;Codigo;Denominacao;Classe;Categoria;Total_Ano;Origem;Incluido;Motivo
1;0040;Participação Lucros;PGTO;plr;1600,00;catalogo;S;
2;0501;DSR (Comissão);PGTO;dsr_comissao;2094,52;catalogo;S;
3;5500;IR Retido;DESC;desconto_ir;125,15;catalogo;N;Classe DESC não entra
4;6400;Prov.Férias-Acum. Mê;PROV;base;13889,77;blocklist;N;Código 6xxx (provisão RH)
5;9920;FGTS;ENCAR;base;1366,52;blocklist;N;Classe ENCAR não entra
6;4131;Prêmio Metal;PGTO;premio;500,00;operador;S;Classificado manualmente
```

### 7.4. Mapeamento categoria → CategoriaSlug do MRD Calc

Catalogue rich (50+ categorias) → 6 CategoriaSlug do MRD Calc:

```typescript
const CATEGORIA_PJE_TO_SLUG: Record<string, CategoriaSlug> = {
  // Salário fixo
  'salario_base': 'salario_fixo',
  'minimo_garantido': 'minimo_garantido',
  // Comissões (3 tipos)
  'comissao': 'comissao',
  'comissao_garantia': 'comissao',
  'comissao_seguros': 'comissao',
  'comissao_frete': 'comissao',
  'comissao_montagem': 'comissao',
  // DSR
  'dsr_comissao': 'dsr',
  'dsr_he': 'dsr',
  // Premiações
  'premio': 'premiacao',
  'premio_meta': 'premiacao',
  'premio_estimulo': 'premiacao',
  // ... etc
};
```

Histórico salarial fica organizado em 6 CSVs, um por slug com soma > 0.

---

## 8. CTPS — adendo

### 8.1. Estado atual

- Commit `19918a4` fix: parser de faltas exclui bloco HISTÓRICO DE FÉRIAS + parser de férias reconhece CTPS
- **Não validado em smoke**. O CSV de comparação que o Gabriel mandou foi PRÉ esse fix

### 8.2. Tarefas CTPS

1. **Smoke do fix existente**: rodar `19918a4` no caso ROQUE e conferir:
   - `CTPS_ferias.csv` deve ter 18 linhas (períodos aquisitivos COM gozo)
   - `CTPS_faltas.csv` deve ter ~12 atestados + 3 suspensões COVID (15 linhas, todas com `JUSTIFICADA=S` exceto suspensões que são `S` também)
   - NENHUM período aquisitivo deve aparecer em faltas
2. **Se passar**: marcar fix como validado, fecha CTPS por enquanto
3. **Se não passar**: cavar como bug e propor fix novo

### 8.3. Schema gabarito (esperado)

Pra validar, precisa do gabarito do **PJe-Calc 2.15.1 desktop**. Pré-requisito do `PENDENCIAS-CONSOLIDADO.md` Prioridade 3:

1. Abrir PJe-Calc 2.15.1 desktop
2. Criar caso dummy: 1 funcionário com 2 períodos de férias + 1 afastamento
3. Exportar CTPS desse caso
4. Anexar export aqui pra derivar schema correto dos CSVs

**Sem isso, qualquer CSV que produzirmos é chute do que o PJe-Calc espera.**

---

## 9. Plano de testes

### 9.1. Testes unitários (vitest)

```
src/features/data-extraction/parsers/ficha-financeira/
├── __tests__/
│   ├── deterministic-parser.test.ts      (~30 casos: layouts ADP, edge cases)
│   ├── code-catalog-lookup.test.ts        (~20 casos)
│   ├── validator-semantic.test.ts          (~15 casos: dentro/fora tolerância, sem total)
│   └── exporter-zip.test.ts                (~10 casos: estrutura ZIP, formato CSV)
```

### 9.2. Teste e2e (vitest + caso ROQUE)

```
src/features/data-extraction/__tests__/e2e/
└── ficha-financeira-roque-2016.test.ts
```

Spec:
1. Lê PDF `Ficha Financeira 2016.pdf` do fixture
2. Roda pipeline completo: parse → enriquecimento → validação → exporter
3. Compara CSVs gerados com gabaritos em `__fixtures__/roque-2016-esperado/`
4. **Falha se delta > 5% em qualquer competência mensal**

Gabaritos esperados: gerar manualmente do PDF antes de codar (1-2h de trabalho contábil).

### 9.3. Smoke real (manual, não CI)

Procedimento documentado em `docs/SMOKE-FICHA-FINANCEIRA.md`:

1. Upar `Ficha Financeira 2016.pdf` no `mrdcalc.vercel.app`
2. Confirmar classificação automática como `ficha_financeira`
3. Aprovar preview na UI
4. Baixar ZIP
5. **Abrir PJe-Calc 2.15.1 desktop**
6. Criar caso, configurar histórico salarial
7. Importar CSVs do ZIP
8. Conferir se PJe-Calc aceita (sem erro)
9. Rodar liquidação
10. Comparar com cálculo manual de referência (±5%)

---

## 10. Roteiro de execução (sprints)

### Sprint 1 (8-12h) — Plumbing

**Não toca em parser. Só conecta o que existe.**

1. Migration `tipo_extracao` enum + `ficha_financeira`
2. Migration tabela `rubrica_catalogo` + seed Via Varejo (do caso ROQUE)
3. Classificador upload: heurística + `ExtractionTypeBadgeAndSelect` aceita novo tipo
4. Trigger no `process-document-start`: switch case por tipo
5. Smoke: upload de PDF, confirmar que vai pro parser certo (sem UI ainda)

**Resultado:** parser determinístico recebe request quando ficha é upada. Output não chega na UI ainda — só nos logs da edge function.

### Sprint 2 (10-15h) — Enriquecimento + Validador

1. Lookup `código → categoria_pje` via `rubrica_catalogo` (DB query)
2. Validador semântico: extrair Total Vencimentos do PDF + comparar
3. Status `extracao_invalida` quando falha
4. Testes unitários do validador

**Resultado:** parser devolve dados enriquecidos + flag de validação. Documento com extração inválida fica bloqueado para importação.

### Sprint 3 (12-18h) — UI

1. `FichaFinanceiraPreviewDialog` novo componente
2. `FichaFinanceiraTable` editável (12 colunas)
3. Banner de validação verde/amarelo/vermelho
4. Workflow: classificar códigos manualmente + salvar em `rubrica_catalogo`

**Resultado:** operador consegue revisar e aprovar/rejeitar extração via UI.

### Sprint 4 (6-10h) — Exporter

1. `ficha-financeira-zip.ts` novo arquivo
2. Formato CSV correto (1 linha por competência mensal)
3. Auditoria completa + metadata
4. Mapping categoria_pje → CategoriaSlug

**Resultado:** ZIP baixável com formato PJe-Calc 2.15.1.

### Sprint 5 (4-8h) — Testes + Smoke

1. Teste e2e com caso ROQUE 2016
2. Documentar procedimento smoke real
3. Smoke real no PJe-Calc desktop (manual)
4. CI bloqueia PR que falha o e2e

**Resultado:** feature considerada pronta para uso em produção real.

### Sprint 6 (2-4h) — CTPS validação

1. Smoke do fix `19918a4` no caso ROQUE
2. Se passar: marcar pronto
3. Se falhar: cavar bug, propor fix

**Total: 42-67h** (bate com estimativa do `PENDENCIAS-CONSOLIDADO.md`)

---

## 11. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Layout ADP varia entre empresas → parser determinístico não pega | Alta | Médio | Fallback Claude Sonnet+PDF (já existe) |
| Catálogo de códigos cresce sem governança → categorizações inconsistentes | Alta | Alto | Revisão obrigatória em PR + audit log + métricas de "% códigos com origem=manual" |
| Validador semântico bloqueia importações legítimas | Média | Alto | Tolerância configurável + override do operador com justificativa |
| PJe-Calc 2.15.1 rejeita CSV gerado | Média | Crítico | Sprint 5 smoke real **obrigatório** antes de liberar para produção |
| CTPS gabarito difícil de obter (precisa PJe-Calc desktop) | Alta | Médio | Gabriel exporta antes de Sprint 6 |
| Sprint estoura prazo → Gabriel atalha → bug grave em prod | **Muito alta** | Crítico | **Cada sprint tem entregável testável de forma isolada. Não pular smoke.** |

---

## 12. Decisões abertas (precisam input do Gabriel)

1. **Tolerância do validador semântico**: 1% ou 0,5%? Trade-off precisão vs flexibilidade.
2. **Quem aprova adição manual ao catálogo?** Todo operador, ou só admin? Sem governança vira bagunça.
3. **Auditoria de classificações pelos operadores**: salvar quem classificou, quando, com que justificativa? Pode ser útil pra LGPD/compliance.
4. **Ficha Financeira histórica vs corrente**: importar ficha de 2016 num caso de demissão em 2021 — sistema precisa saber que ano é. Confirmar via título do PDF + cabeçalho "Ano Competência : 2016".
5. **Múltiplos empregadores no mesmo caso**: operador upa Ficha Renner + Ficha Magalu (trabalhador teve 2 vínculos). Catálogo separado por empregador funciona, mas UI precisa mostrar isso.

---

## 13. Referências

- `docs/PENDENCIAS-CONSOLIDADO.md` — plano original de 24/05/2026
- `supabase/functions/parse-ficha-financeira/index.ts` — edge function existente
- `supabase/functions/_shared/parsers/ficha-financeira-deterministic.ts` — parser fast path
- `src/features/data-extraction/export/per-doc/holerite-zip.ts` — exporter de referência (formato CSV)
- `pjecalc-fonte/` — JAR decompilado do PJe-Calc 2.15.1 (especificação dos CSVs)
- Casos de teste: `docs/casos-teste/roque/` (a criar — anexar PDFs do Gabriel)

---

## 14. Próximos passos

1. **Gabriel decide**: aprovar este plano ou ajustar?
2. Se aprovado: gerar prompt detalhado para Claude Code executar Sprint 1
3. Anexar PDFs do caso ROQUE em `docs/casos-teste/roque/` (commit separado)
4. Aprovar primeira PR (Sprint 1) com smoke manual antes de Sprint 2
