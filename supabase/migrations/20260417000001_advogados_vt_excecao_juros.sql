-- Migration: Criar tabelas pjecalc_advogados e pjecalc_vale_transporte_config
-- (pjecalc_vale_transporte foi dropada em 20260304; recriando como _config vinculada ao cálculo)

BEGIN;

-- Advogados do processo
CREATE TABLE IF NOT EXISTS public.pjecalc_advogados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL,
  nome text NOT NULL,
  oab text NOT NULL,
  oab_uf text NOT NULL DEFAULT 'SP',
  cpf text,
  email text,
  telefone text,
  representa text NOT NULL DEFAULT 'RECLAMANTE' CHECK (representa IN ('RECLAMANTE', 'RECLAMADO', 'AMBOS')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pjecalc_advogados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage advogados" ON public.pjecalc_advogados
  FOR ALL USING (auth.role() = 'authenticated');

-- Vale Transporte (por cálculo, com linhas de transporte)
CREATE TABLE IF NOT EXISTS public.pjecalc_vale_transporte_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL,
  apurar boolean NOT NULL DEFAULT false,
  desconto_empregado_pct numeric NOT NULL DEFAULT 6.00,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(calculo_id)
);

CREATE TABLE IF NOT EXISTS public.pjecalc_vale_transporte_linhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.pjecalc_vale_transporte_config(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'URBANO' CHECK (tipo IN ('URBANO', 'INTERMUNICIPAL', 'INTERESTADUAL')),
  valor_passagem numeric NOT NULL DEFAULT 0,
  quantidade_dia integer NOT NULL DEFAULT 2,
  data_encerramento date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pjecalc_vale_transporte_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pjecalc_vale_transporte_linhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage vt config" ON public.pjecalc_vale_transporte_config
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage vt linhas" ON public.pjecalc_vale_transporte_linhas
  FOR ALL USING (auth.role() = 'authenticated');

-- Exceções de juros por período
CREATE TABLE IF NOT EXISTS public.pjecalc_excecao_juros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  tipo_juros text NOT NULL DEFAULT 'SEM_JUROS' CHECK (tipo_juros IN ('SEM_JUROS', 'SELIC', 'TAXA_LEGAL', 'UM_PORCENTO', 'MEIO_PORCENTO')),
  percentual numeric,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pjecalc_excecao_juros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage excecao juros" ON public.pjecalc_excecao_juros
  FOR ALL USING (auth.role() = 'authenticated');

COMMIT;
