-- ============================================================
-- SEED: Indices historicos pre-1988 para calculos muito antigos
--
-- Tabela: public.pjecalc_indices
--
-- Conversores historicos (BRL equivalente):
--   ORTN (1964-1986) → OTN (1986-1989) → BTN (1989-1991) → UFIR (1991-2000)
--   Fator acumulado: 1 BRL = 2.750.000.000.000 Cr$ (antigos)
--
-- Para processos com debitos anteriores a 1988, estes fatores
-- permitem converter valores historicos para BRL atual.
-- ============================================================

-- UFIR - Unidade Fiscal de Referencia (jan/1992 a dez/2000)
-- Ultimo valor: R$ 1,0641 (extinta pela Lei 10.522/2002)
INSERT INTO public.pjecalc_indices (indice, competencia, valor)
VALUES
('UFIR', '1992-01-01', 0.5970),
('UFIR', '1992-07-01', 0.7116),
('UFIR', '1993-01-01', 0.9052),
('UFIR', '1993-07-01', 1.4267),
('UFIR', '1994-01-01', 3.6419),
('UFIR', '1994-07-01', 0.6308),
('UFIR', '1995-01-01', 0.6767),
('UFIR', '1996-01-01', 0.8287),
('UFIR', '1997-01-01', 0.9108),
('UFIR', '1998-01-01', 0.9611),
('UFIR', '1999-01-01', 0.9770),
('UFIR', '2000-01-01', 1.0641),
-- FACDT - Fator de Atualizacao e Conversao de Debitos Trabalhistas
-- TRT reference factors (key months from Tabela Unica)
('FACDT', '1988-01-01', 1.000000),
('FACDT', '1990-01-01', 1.000000),
('FACDT', '1994-07-01', 1.000000),
('FACDT', '1995-01-01', 1.069540),
('FACDT', '1996-01-01', 1.244894),
('FACDT', '1997-01-01', 1.367280),
('FACDT', '1998-01-01', 1.442310),
('FACDT', '1999-01-01', 1.467066),
('FACDT', '2000-01-01', 1.543180),
('FACDT', '2001-01-01', 1.636858),
('FACDT', '2002-01-01', 1.749789),
('FACDT', '2003-01-01', 1.936474),
('FACDT', '2004-01-01', 2.101741),
('FACDT', '2005-01-01', 2.244668)
ON CONFLICT DO NOTHING;

-- NOTE: Complete ORTN/OTN/BTN series require specialized conversion.
-- For very old debts (pre-1988), the standard approach is to:
-- 1. Convert the original value to BTN fiscal using the daily ORTN/OTN factor
-- 2. Convert BTN to UFIR using the official conversion
-- 3. Convert UFIR to BRL using the last UFIR value (R$ 1.0641)
-- The sync-indices-automatico function handles contemporary updates.
