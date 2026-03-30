-- Tabela de índices de correção monetária (dados reais BCB)
-- Populada via Edge Function populate-bcb-indices com séries oficiais:
--   IPCA-E (10764), SELIC (4390), INPC (188), TR (7812), IGP-M (189)
-- Período: 2000-01 até presente. ~1573 registros.

CREATE TABLE IF NOT EXISTS pjecalc_correcao_monetaria (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indice      text        NOT NULL,
  competencia date        NOT NULL,
  valor       numeric,
  acumulado   numeric,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (indice, competencia)
);

CREATE INDEX IF NOT EXISTS idx_pjecalc_correcao_idx_comp
  ON pjecalc_correcao_monetaria (indice, competencia);
