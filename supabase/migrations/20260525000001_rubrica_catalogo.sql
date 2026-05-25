-- Sprint 1 Tarefa 1.2: Tabela rubrica_catalogo + seed Via Varejo.
-- Catálogo de códigos de rubrica por empregador para enriquecimento
-- automático de Ficha Financeira.
--
-- Plano: docs/ARQUITETURA-FICHA-FINANCEIRA-CTPS.md Sprint 1, seção 4

BEGIN;

CREATE TABLE IF NOT EXISTS public.rubrica_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empregador text NOT NULL,
  codigo text NOT NULL,
  denominacao_canonica text NOT NULL,
  categoria_pje text NOT NULL,
  classe_documento text NOT NULL,
  incide_fgts boolean NOT NULL DEFAULT true,
  incide_inss boolean NOT NULL DEFAULT true,
  incide_ir boolean NOT NULL DEFAULT true,
  natureza_indenizatoria boolean NOT NULL DEFAULT false,
  origem text NOT NULL DEFAULT 'manual',
  confianca text NOT NULL DEFAULT 'alta',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empregador, codigo)
);

CREATE INDEX IF NOT EXISTS idx_rubrica_catalogo_codigo
  ON public.rubrica_catalogo (codigo);

CREATE INDEX IF NOT EXISTS idx_rubrica_catalogo_empregador_codigo
  ON public.rubrica_catalogo (empregador, codigo);

ALTER TABLE public.rubrica_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rubrica_catalogo"
  ON public.rubrica_catalogo FOR SELECT
  TO authenticated USING (true);

-- CHECK constraints
ALTER TABLE public.rubrica_catalogo
  ADD CONSTRAINT rubrica_catalogo_classe_check
  CHECK (classe_documento = ANY (ARRAY[
    'PGTO'::text, 'DESC'::text, 'BASE'::text,
    'ENCAR'::text, 'OUTRO'::text, 'PROV'::text
  ]));

ALTER TABLE public.rubrica_catalogo
  ADD CONSTRAINT rubrica_catalogo_origem_check
  CHECK (origem = ANY (ARRAY['manual'::text, 'ontologia'::text, 'inferido'::text]));

ALTER TABLE public.rubrica_catalogo
  ADD CONSTRAINT rubrica_catalogo_confianca_check
  CHECK (confianca = ANY (ARRAY['alta'::text, 'media'::text, 'baixa'::text]));

-- Seed Via Varejo (caso ROQUE — 56 códigos)
INSERT INTO public.rubrica_catalogo
  (empregador, codigo, denominacao_canonica, categoria_pje, classe_documento,
   incide_fgts, incide_inss, incide_ir, natureza_indenizatoria, origem)
VALUES
  -- PROVENTOS (PGTO)
  ('VIA_VAREJO', '0040', 'Participação Lucros',              'plr',                'PGTO', false, false, true,  true,  'manual'),
  ('VIA_VAREJO', '0501', 'DSR (Comissão)',                   'dsr_comissao',       'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '0502', 'DSR (H. Extra)',                   'dsr_he',             'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '0510', 'Adiantamento 13º Salário',          'decimo_terceiro_adto','PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '0511', '13º Salário 1ª Parcela',            'decimo_terceiro',    'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '0590', '1/3 Adic. Constitucional Férias',   'ferias_terco',       'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '0591', '1/3 Adic. Constitucional Férias',   'ferias_terco',       'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '0620', 'Comissões',                         'comissao',           'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '0712', 'Mínimo Garantido — Comissionista',  'minimo_garantido',   'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '0832', 'Insuficiência Saldo no Mês',        'insuf_saldo',        'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '2750', 'Média de Férias',                   'ferias_media',       'PGTO', false, true,  true,  false, 'manual'),
  ('VIA_VAREJO', '2751', 'Média Férias',                      'ferias_media',       'PGTO', false, true,  true,  false, 'manual'),
  ('VIA_VAREJO', '2752', 'Diferença Média Férias',            'ferias_media',       'PGTO', false, true,  true,  false, 'manual'),
  ('VIA_VAREJO', '2823', 'Adiantamento Quinzenal',            'adto_quinzenal',     'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '3290', 'Prêmio Antecipado',                 'premio',             'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '3317', 'Adicional Sábado Com. 25%',         'adicional_sabado',   'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '3368', 'Horas Justificadas / TRN',          'horas_justificadas', 'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '3391', 'Comissão Garantia',                 'comissao_garantia',  'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '3393', 'Comissão Seguros',                  'comissao_seguros',   'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '3415', '1/3 Férias Pagas',                  'ferias_terco',       'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '3453', 'Comissão Frete',                    'comissao_frete',     'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '4013', 'Horas Extras Com 75%',              'horas_extras_75',    'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '4016', 'Horas Extras Com 70%',              'horas_extras_70',    'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '4096', 'Comissão Montagem',                 'comissao_montagem',  'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '4101', 'Prêmio Meta',                       'premio_meta',        'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '4325', 'Adiantamento',                      'adiantamento',       'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '7035', 'Ajuste de Líquido',                 'ajuste',             'PGTO', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '7076', 'PLR Variável',                      'plr',                'PGTO', false, false, true,  true,  'manual'),
  ('VIA_VAREJO', '8441', 'Antecip. Prêmio Estímulo',          'premio_estimulo',    'PGTO', true,  true,  true,  false, 'manual'),
  ('VIA_VAREJO', '8489', 'Campanha Serviços',                 'campanha',           'PGTO', true,  true,  true,  false, 'manual'),
  -- DESCONTOS (DESC)
  ('VIA_VAREJO', '0833', 'Desc. Insuficiência Saldo',         'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '2824', 'Adiantamento Quinzenal',            'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '3640', 'Prestação de Carnê',                'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '3669', 'Despesa Médica / Hospitalar',       'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '3673', 'Seguro Vida Individual',            'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '3678', 'Seguro Vida Familiar',              'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '3684', 'Convênio Médico',                   'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '3720', 'Prêmio Antecipado',                 'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '3721', 'Convênio Odontológico',             'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '3743', 'Adiantamento',                      'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '3784', 'Férias Recebidas',                   'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '3795', 'Unimed FESP',                       'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '3796', 'Unimed FESP — Dependente',          'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '5500', 'IR Retido',                         'desconto_ir',        'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '5560', 'INSS',                              'desconto_inss',      'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '5580', 'INSS de Férias',                    'desconto_inss',      'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '5616', 'Vale Alimentação',                  'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '5760', 'Contrib Sindical',                  'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '7103', 'Vale Alimentação — V',              'desconto',           'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '7520', 'IR Férias',                         'desconto_ir',        'DESC', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '9953', 'Líquido Férias',                    'totalizador',        'DESC', false, false, false, false, 'manual'),
  -- BASES (BASE)
  ('VIA_VAREJO', '5501', 'Base IR',                           'base',               'BASE', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '5551', 'Base IR Part Lucros',               'base',               'BASE', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '5561', 'Base INSS',                         'base',               'BASE', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '8000', 'Salário Contribuição',              'base',               'BASE', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '9900', 'Base Contribuição Sindical',        'base',               'BASE', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '9921', 'Base FGTS',                         'base',               'BASE', false, false, false, false, 'manual'),
  ('VIA_VAREJO', '9926', 'Base FGTS Férias',                  'base',               'BASE', false, false, false, false, 'manual')
ON CONFLICT (empregador, codigo) DO NOTHING;

COMMIT;
