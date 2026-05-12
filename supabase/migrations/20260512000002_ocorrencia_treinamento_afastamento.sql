-- Parser determinístico de cartão de ponto pode emitir TREINAMENTO e
-- AFASTAMENTO além das ocorrências básicas. CHECK anterior rejeitava
-- esses dois — INSERT falhava em runtime com check_violation. Detectado
-- por smoke test contra fixture real (rosicleia).
ALTER TABLE public.pjecalc_apuracao_diaria
  DROP CONSTRAINT IF EXISTS pjecalc_apuracao_diaria_ocorrencia_check;

ALTER TABLE public.pjecalc_apuracao_diaria
  ADD CONSTRAINT pjecalc_apuracao_diaria_ocorrencia_check
  CHECK (ocorrencia IN (
    'NORMAL','FALTA','FERIADO','FOLGA','FERIAS','ATESTADO',
    'LICENCA_MEDICA','DSR','COMPENSADO','TREINAMENTO','AFASTAMENTO'
  ));
