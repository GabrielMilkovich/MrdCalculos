-- Expande seed de rubrica_aliases com denominações Via Varejo.
-- Originados da auditoria do caso ROQUE GUERREIRO.
-- ON CONFLICT (normalized_key) DO NOTHING: não sobrescreve aliases existentes.

-- Primeiro, expandir CHECK constraint pra aceitar nova source
ALTER TABLE public.rubrica_aliases DROP CONSTRAINT IF EXISTS chk_source_valido;
ALTER TABLE public.rubrica_aliases ADD CONSTRAINT chk_source_valido
  CHECK (source = ANY (ARRAY['seed_v2'::text, 'planilha_v1'::text, 'user_classification'::text, 'seed_via_varejo_v1'::text]));

INSERT INTO public.rubrica_aliases (
  alias_original, normalized_key, categoria, tipo_pjecalc,
  base_dsr, base_13, base_ferias, incluido,
  source, confidence, reviewed
) VALUES
('Comissões',                        'comissoes',                      'COMISSOES_PRODUTOS', 'COMISSAO', true, true, true, true, 'seed_via_varejo_v1', 0.95, true),
('Comissão Garantia',                'comissao garantia',              'COMISSOES_PRODUTOS', 'COMISSAO', true, true, true, true, 'seed_via_varejo_v1', 0.90, true),
('Comissão Seguros',                 'comissao seguros',               'COMISSOES_SERVICOS', 'COMISSAO', true, true, true, true, 'seed_via_varejo_v1', 0.90, true),
('Comissão Frete',                   'comissao frete',                 'COMISSOES_SERVICOS', 'COMISSAO', true, true, true, true, 'seed_via_varejo_v1', 0.90, true),
('Comissão Montagem',                'comissao montagem',              'COMISSOES_SERVICOS', 'COMISSAO', true, true, true, true, 'seed_via_varejo_v1', 0.90, true),
('Campanha Serviços',                'campanha servicos',              'PREMIOS',            'PREMIO',   true, true, true, true, 'seed_via_varejo_v1', 0.85, true),
('Mínimo Garantido',                 'minimo garantido',               'MINIMO_GARANTIDO',   'SALARIO',  true, true, true, true, 'seed_via_varejo_v1', 0.95, true),
('Mínimo Garantido — Comissionista', 'minimo garantido comissionista', 'MINIMO_GARANTIDO',   'SALARIO',  true, true, true, true, 'seed_via_varejo_v1', 0.95, true),
('DSR (Comissão)',                   'dsr comissao',                   'DSR_S_COMISSOES',    'DSR',      false, true, true, true, 'seed_via_varejo_v1', 0.95, true),
('DSR (H. Extra)',                   'dsr h extra',                    'DSR_S_COMISSOES',    'DSR',      false, true, true, true, 'seed_via_varejo_v1', 0.95, true),
('DSR s/ Comissão',                  'dsr s comissao',                 'DSR_S_COMISSOES',    'DSR',      false, true, true, true, 'seed_via_varejo_v1', 0.90, true),
('Prêmio Antecipado',                'premio antecipado',              'PREMIOS',            'PREMIO',   true, true, true, true, 'seed_via_varejo_v1', 0.90, true),
('Prêmio Meta',                      'premio meta',                    'PREMIOS',            'PREMIO',   true, true, true, true, 'seed_via_varejo_v1', 0.90, true),
('Antecip. Prêmio Estímulo',         'antecip premio estimulo',        'PREMIOS',            'PREMIO',   true, true, true, true, 'seed_via_varejo_v1', 0.90, true),
('Horas Extras Com 75%',             'horas extras com 75',            'SALARIO_SUBSTITUICAO','SALARIO_SUBSTITUICAO', true, true, true, true, 'seed_via_varejo_v1', 0.90, true),
('Horas Extras Com 70%',             'horas extras com 70',            'SALARIO_SUBSTITUICAO','SALARIO_SUBSTITUICAO', true, true, true, true, 'seed_via_varejo_v1', 0.90, true),
('Adicional Sábado Com. 25%',        'adicional sabado com 25',        'SALARIO_SUBSTITUICAO','SALARIO_SUBSTITUICAO', true, true, true, true, 'seed_via_varejo_v1', 0.90, true),
('Horas Justificadas',               'horas justificadas',             'SALARIO_SUBSTITUICAO','SALARIO_SUBSTITUICAO', true, true, true, true, 'seed_via_varejo_v1', 0.85, true),
('Horas Justificadas / TRN',         'horas justificadas trn',         'SALARIO_SUBSTITUICAO','SALARIO_SUBSTITUICAO', true, true, true, true, 'seed_via_varejo_v1', 0.85, true),
('Participação Lucros',              'participacao lucros',            'DESCONSIDERADAS',    'DESCONSIDERAR', false, false, false, false, 'seed_via_varejo_v1', 0.95, true),
('PLR Variável',                     'plr variavel',                   'DESCONSIDERADAS',    'DESCONSIDERAR', false, false, false, false, 'seed_via_varejo_v1', 0.95, true),
('Adiantamento Quinzenal',           'adiantamento quinzenal',         'DESCONSIDERADAS',    'DESCONSIDERAR', false, false, false, false, 'seed_via_varejo_v1', 0.90, true),
('Adiantamento',                     'adiantamento',                   'DESCONSIDERADAS',    'DESCONSIDERAR', false, false, false, false, 'seed_via_varejo_v1', 0.80, true),
('Insuficiência Saldo no Mês',       'insuficiencia saldo no mes',     'DESCONSIDERADAS',    'DESCONSIDERAR', false, false, false, false, 'seed_via_varejo_v1', 0.85, true),
('Ajuste de Líquido',                'ajuste de liquido',              'DESCONSIDERADAS',    'DESCONSIDERAR', false, false, false, false, 'seed_via_varejo_v1', 0.90, true),
('Média de Férias',                  'media de ferias',                'DESCONSIDERADAS',    'DESCONSIDERAR', false, false, false, false, 'seed_via_varejo_v1', 0.85, true),
('1/3 Adic. Constitucional Férias',  '1 3 adic constitucional ferias', 'DESCONSIDERADAS',    'DESCONSIDERAR', false, false, false, false, 'seed_via_varejo_v1', 0.90, true),
('1/3 Férias Pagas',                 '1 3 ferias pagas',               'DESCONSIDERADAS',    'DESCONSIDERAR', false, false, false, false, 'seed_via_varejo_v1', 0.90, true),
('Insuf. Saldo Mês',                 'insuf saldo mes',                'DESCONSIDERADAS',    'DESCONSIDERAR', false, false, false, false, 'seed_via_varejo_v1', 0.80, true)
ON CONFLICT (normalized_key) DO NOTHING;
