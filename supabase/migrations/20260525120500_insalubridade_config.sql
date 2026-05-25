ALTER TABLE pjecalc_multas_config
  ADD COLUMN IF NOT EXISTS insalubridade_config jsonb;

COMMENT ON COLUMN pjecalc_multas_config.insalubridade_config IS
  'Config de Adicional de Insalubridade (NR 15 MTE). Schema: { ativo: bool, grau: minimo_10|medio_20|maximo_40, base_calculo: salario_minimo|salario_base|salario_contratual, periodo_inicio, periodo_fim, atividade, observacoes }';
