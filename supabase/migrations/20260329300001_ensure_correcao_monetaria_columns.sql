-- Ensure pjecalc_correcao_monetaria has the acumulado column and unique constraint
DO $$
BEGIN
  -- Add acumulado column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pjecalc_correcao_monetaria' AND column_name = 'acumulado'
  ) THEN
    ALTER TABLE public.pjecalc_correcao_monetaria ADD COLUMN acumulado numeric(20,8);
  END IF;

  -- Create unique constraint for upsert
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pjecalc_correcao_monetaria_indice_competencia_key'
  ) THEN
    ALTER TABLE public.pjecalc_correcao_monetaria
    ADD CONSTRAINT pjecalc_correcao_monetaria_indice_competencia_key
    UNIQUE (indice, competencia);
  END IF;
END $$;
