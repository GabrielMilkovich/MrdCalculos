-- Seção 2 (Parâmetros Gerais): colunas que o engine LÊ (toEngineParams) mas
-- pjecalc_calculos não tinha. Valores no formato do engine (PjeParametros).
-- Aditiva/reversível. Aplicada via MCP em xhvlhrgfoeahgofhljbs (MRDCALCC) 2026-05-29.
-- Decisão de wiring: canonicalizar params em pjecalc_calculos (getParametros passa
-- a ler/mapear desta tabela; pjecalc_parametros vira fallback). Ver docs/specs/parametros-gerais.md.
--
-- NOTA: estas são as 3 colunas GENUINAMENTE novas. regime_trabalho / limitar_avos /
-- zerar_valor_negativo NÃO entram aqui — já existem como regime_contrato /
-- limitar_avos_periodo_calculo / zera_valor_negativo (mapeadas no adapter).
ALTER TABLE public.pjecalc_calculos
  ADD COLUMN IF NOT EXISTS prazo_aviso_previo   text    DEFAULT 'nao_apurar',   -- PjeParametros.prazo_aviso_previo (≠ aviso_previo_tipo)
  ADD COLUMN IF NOT EXISTS tipo_mes             text    DEFAULT 'comercial',    -- PjeParametros.tipo_mes (Art.64 CLT)
  ADD COLUMN IF NOT EXISTS pontos_facultativos  text[]  DEFAULT '{}'::text[];   -- PjeParametros.pontos_facultativos

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pjecalc_calculos_prazo_aviso_chk') THEN
    ALTER TABLE public.pjecalc_calculos ADD CONSTRAINT pjecalc_calculos_prazo_aviso_chk
      CHECK (prazo_aviso_previo IS NULL OR prazo_aviso_previo IN ('nao_apurar','calculado','informado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pjecalc_calculos_tipo_mes_chk') THEN
    ALTER TABLE public.pjecalc_calculos ADD CONSTRAINT pjecalc_calculos_tipo_mes_chk
      CHECK (tipo_mes IS NULL OR tipo_mes IN ('civil','comercial'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
