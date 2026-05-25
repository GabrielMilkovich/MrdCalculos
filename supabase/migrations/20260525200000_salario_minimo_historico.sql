-- Tabela de salários mínimos históricos para consulta dinâmica
-- Fonte: Portarias MTE/MPS anuais (Decretos presidenciais)
CREATE TABLE IF NOT EXISTS pjecalc_salario_minimo_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  valor numeric(10, 2) NOT NULL,
  fonte text DEFAULT 'oficial',
  created_at timestamptz DEFAULT now(),
  UNIQUE (vigencia_inicio)
);

INSERT INTO pjecalc_salario_minimo_historico (vigencia_inicio, vigencia_fim, valor) VALUES
  ('2009-02-01', '2009-12-31', 465.00),
  ('2010-01-01', '2010-12-31', 510.00),
  ('2011-01-01', '2011-12-31', 545.00),
  ('2012-01-01', '2012-12-31', 622.00),
  ('2013-01-01', '2013-12-31', 678.00),
  ('2014-01-01', '2014-12-31', 724.00),
  ('2015-01-01', '2015-12-31', 788.00),
  ('2016-01-01', '2016-12-31', 880.00),
  ('2017-01-01', '2017-12-31', 937.00),
  ('2018-01-01', '2018-12-31', 954.00),
  ('2019-01-01', '2019-12-31', 998.00),
  ('2020-02-01', '2020-12-31', 1045.00),
  ('2021-01-01', '2021-12-31', 1100.00),
  ('2022-01-01', '2022-12-31', 1212.00),
  ('2023-01-01', '2023-12-31', 1320.00),
  ('2024-01-01', '2024-12-31', 1412.00),
  ('2025-01-01', NULL, 1518.00)
ON CONFLICT (vigencia_inicio) DO NOTHING;

ALTER TABLE pjecalc_salario_minimo_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de SM histórico"
  ON pjecalc_salario_minimo_historico FOR SELECT
  USING (true);
