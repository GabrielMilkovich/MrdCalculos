-- =====================================================
-- Seed do Rubrica Mapping (PR 3 v5)
-- =====================================================
-- 99 rubricas Via Varejo enumeradas + 3 regras soft, da planilha canônica
-- entregue pelo escritório (Planilha_Comissão_DSR_nova.xlsx).
--
-- Idempotente: usa ON CONFLICT DO NOTHING. Reaplicações são seguras.
-- =====================================================

BEGIN;

-- ============================================================
-- minimo_garantido (3)
-- ============================================================
INSERT INTO rubrica_mapping (rubrica_normalizada, rubrica_original, bucket, layout_aplicavel, tipo_regra, prioridade) VALUES
  ('minimo garantido', 'Mínimo Garantido', 'minimo_garantido', 'via_varejo', 'enumerado_explicito', 100),
  ('horas justificadas / trn', 'Horas Justificadas / TRN', 'minimo_garantido', 'via_varejo', 'enumerado_explicito', 100),
  ('treinamento', 'Treinamento', 'minimo_garantido', 'via_varejo', 'enumerado_explicito', 100)
ON CONFLICT DO NOTHING;

-- ============================================================
-- comissoes_produtos (24)
-- ============================================================
INSERT INTO rubrica_mapping (rubrica_normalizada, rubrica_original, bucket, layout_aplicavel, tipo_regra, prioridade) VALUES
  ('adic. tempo de servico', 'Adic. Tempo de Serviço', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('antec. credito dif. de comissoes', 'Antec. Crédito Dif. De Comissões', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('ajuste liquido', 'Ajuste Líquido', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('comissoes', 'Comissões', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('comissao adicional', 'Comissão adicional', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('compl. comissao', 'Compl. Comissão', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('compl. comissao vem. int. ii', 'Compl. Comissão vem. Int. II', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('comissoes produtos online', 'Comissões Produtos Online', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('comissao lib. black friday', 'Comissão Lib. Black Friday', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('comissao garantida', 'Comissão Garantida', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('dia do comerciario', 'Dia do Comerciário', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('dif. de convencao coletiva', 'Dif. De Convenção Coletiva', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('dif. salario dissidio', 'Dif. Salário Dissídio', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('hora normal trabalhada', 'Hora Normal Trabalhada', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('inventario', 'Inventário', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('manuseio de valores', 'Manuseio de Valores', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('proventos', 'Proventos', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('quebra de caixa', 'Quebra de Caixa', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('quinquenio / trienio', 'Quinquênio / Triênio', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('remuneracao garantida', 'Remuneração Garantida', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('comissao antecipada', 'Comissão antecipada', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('comissoes venda produto online', 'Comissões Venda Produto online', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('dif comissao mes ant', 'Dif comissão mês ant', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100),
  ('adiantamento em folha (emp)', 'adiantamento em folha (EMP)', 'comissoes_produtos', 'via_varejo', 'enumerado_explicito', 100)
ON CONFLICT DO NOTHING;

-- ============================================================
-- dsr_comissoes (7)
-- ============================================================
INSERT INTO rubrica_mapping (rubrica_normalizada, rubrica_original, bucket, layout_aplicavel, tipo_regra, prioridade) VALUES
  ('dsr (comissao)', 'DSR (Comissão)', 'dsr_comissoes', 'via_varejo', 'enumerado_explicito', 100),
  ('dsr e feriados', 'DSR e Feriados', 'dsr_comissoes', 'via_varejo', 'enumerado_explicito', 100),
  ('int. premio no dsr', 'Int. Prêmio no Dsr', 'dsr_comissoes', 'via_varejo', 'enumerado_explicito', 100),
  ('dsr s/ media hora notuma', 'DSR s/ Média Hora Notuma', 'dsr_comissoes', 'via_varejo', 'enumerado_explicito', 100),
  ('rep rem s/ comissoes', 'Rep Rem s/ Comissões', 'dsr_comissoes', 'via_varejo', 'enumerado_explicito', 100),
  ('dsr premios', 'DSR Prêmios', 'dsr_comissoes', 'via_varejo', 'enumerado_explicito', 100)
ON CONFLICT DO NOTHING;

-- ============================================================
-- comissoes_servicos (16)
-- ============================================================
INSERT INTO rubrica_mapping (rubrica_normalizada, rubrica_original, bucket, layout_aplicavel, tipo_regra, prioridade) VALUES
  ('com. serv. seguros', 'Com. Serv. Seguros', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('com. serv. garantia', 'Com. Serv. Garantia', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('com. serv. tecnicos', 'Com. Serv. Técnicos', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('com. frete', 'Com. Frete', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('com. montagem', 'Com. Montagem', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('com. serv. odont.', 'Com. Serv. Odont.', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('com. planos operad.', 'Com. Planos Operad.', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('com. tecnicos pto lj', 'Com. Técnicos PTO LJ', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('com. catalogo', 'Com. Catálogo', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('com. serv. fin.', 'Com. Serv. Fin.', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('com. venda expressa', 'Com. Venda Expressa', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('camapanha', 'Camapanha', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('camapanha moveis', 'Camapanha Móveis', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('camapanha servicos', 'Camapanha Serviços', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('camapanha cartao pf', 'Camapanha Cartão PF', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('compl. com. seguros', 'Compl. Com. Seguros', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100),
  ('comissoes servicos online', 'Comissões Serviços Online', 'comissoes_servicos', 'via_varejo', 'enumerado_explicito', 100)
ON CONFLICT DO NOTHING;

-- ============================================================
-- premios (21)
-- ============================================================
INSERT INTO rubrica_mapping (rubrica_normalizada, rubrica_original, bucket, layout_aplicavel, tipo_regra, prioridade) VALUES
  ('premio', 'Prêmio', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('premio mensal', 'Prêmio Mensal', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('premio meta', 'Prêmio Meta', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('premio antecipado', 'Prêmio Antecipado', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('premio estimulo', 'Prêmio Estímulo', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('premio performance', 'Prêmio Performance', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('premio (lb)', 'Prêmio (LB)', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('premio gar. estendida', 'Prêmio Gar. Estendida', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('pr recarga de celular', 'PR Recarga de celular', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('pr (cartao de credito)', 'PR (Cartão de Crédito)', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('prm', 'PRM', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('gratificacao', 'Gratificação', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('dif. premio vendedor', 'Dif. Prêmio Vendedor', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('ppr pula meio (magalu)', 'PPR Pula meio (MagaLu)', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('pr. adc.', 'PR. Adc.', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('premio seguro', 'Prêmio Seguro', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('pr. garantia compl.', 'PR. Garantia Compl.', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('premiacao incentivo', 'Premiação Incentivo', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('pr saude', 'PR Saúde', 'premios', 'via_varejo', 'enumerado_explicito', 100),
  ('premio atend. loja', 'Prêmio Atend. Loja', 'premios', 'via_varejo', 'enumerado_explicito', 100)
ON CONFLICT DO NOTHING;

-- ============================================================
-- desconsiderar (28)
-- ============================================================
INSERT INTO rubrica_mapping (rubrica_normalizada, rubrica_original, bucket, layout_aplicavel, tipo_regra, prioridade) VALUES
  ('dif. 13 salario', 'Dif. 13° Salário', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('dif. ferias', 'Dif. Férias', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('dif. de medias 13 salario', 'Dif. de Médias 13° Salário', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('ferias pagas', 'Férias Pagas', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('antec. vale trasnp. - admissao', 'Antec. Vale Trasnp. - Admissão', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('banco de horas 100% noturna', 'Banco de Horas 100% Noturna', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('dsr h. extra', 'DSR H. Extra', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('13 de ferias pagas', '13° de Férias Pagas', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('media ferias', 'Média Férias', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('salario maternidade / paternidade', 'Salário Maternidade / Paternidade', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('devolucao inss 13 salario', 'Devolução INSS 13° Salário', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('abono de ferias pago', 'Abono de Férias Pago', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('abono p/ comissao', 'Abono p/ Comissão', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('13 de abono pago', '13° de Abono Pago', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('banco de horas', 'Banco de Horas', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('int. ad. not. no dsr', 'Int. Ad. Not. No Dsr', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('auxilio aimientacao', 'Auxílio Aimientação', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('auxilio doenca', 'Auxílio Doença', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('ch. extras nunca', 'CH. Extras nunca', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('devolucao de carne', 'Devolução de carnê', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('restituicao de ferias p/ 13', 'Restituição de férias p/ 13°', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('reembolso (de nenhum tipo)', 'Reembolso (de nenhum tipo)', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('compl. he garatido', 'Compl. HE Garatido', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('refeicao', 'Refeição', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('abono salarial conv. col. trab.', 'Abono Salarial Conv. Col. Trab.', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('horas noturnas', 'Horas Noturnas', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100),
  ('adicional noturno', 'Adicional Noturno', 'desconsiderar', 'via_varejo', 'enumerado_explicito', 100)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Regras soft (3)
-- ============================================================
INSERT INTO rubrica_mapping (rubrica_normalizada, bucket, layout_aplicavel, tipo_regra, prioridade, excecoes, observacao) VALUES
  ('premio', 'premios', 'via_varejo', 'regra_soft_contains', 50,
   ARRAY['premio antecipado de comissao', 'premio sobre comissao'],
   'Tudo que contém "prêmio" → bucket Prêmios (regra do escritório).'),
  ('gratificacao', 'premios', 'via_varejo', 'regra_soft_contains', 50,
   ARRAY[]::text[],
   'Tudo que contém "gratificação" → bucket Prêmios.'),
  ('dsr ', 'dsr_comissoes', 'via_varejo', 'regra_soft_startswith', 50,
   ARRAY['dsr 13', 'dsr horas extras', 'dsr h. extra', 'dsr he', 'dsr h extra'],
   'Tudo que começa com "DSR " → bucket DSR (exceto 13° e horas extras).')
ON CONFLICT DO NOTHING;

COMMIT;
