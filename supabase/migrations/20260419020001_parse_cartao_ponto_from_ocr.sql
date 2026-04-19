-- ============================================================
-- FUNÇÃO RPC: parse_cartao_ponto_from_ocr
--
-- Parser determinístico (sem LLM) de cartão de ponto a partir do
-- ocr_text persistido em documents. Popula pjecalc_apuracao_diaria
-- (linhas diárias) + pjecalc_cartao_ponto (agregado por competência).
--
-- Formato esperado (OCR markdown Mistral):
--   | DD/MM/YYYY - Dia | HH:MM | HH:MM | HH:MM | HH:MM | ... Horas Trabalhadas : HH:MM ...
--   | DD/MM/YYYY - Dia | -- | | | | | DSR Semanal (dias) : 1 | ...
--   | DD/MM/YYYY - Dia | -- | | | | | FERIADO (dias) : 1 | ...
--
-- Extrai:
--   - data, batidas (até 4 pares entrada/saída)
--   - minutos_trabalhados (via "Horas Trabalhadas : HH:MM" ou calc dos pares)
--   - minutos_extra_diaria (via "Banco de Horas N% : HH:MM" ou "Hora Extra")
--   - is_feriado / is_dsr / is_falta (via inspeção da linha)
--
-- Chamada: SELECT * FROM parse_cartao_ponto_from_ocr('<case_uuid>');
--   OU específico por documento: ...('<case>', NULL, '<doc_uuid>')
-- ============================================================

CREATE OR REPLACE FUNCTION public.parse_cartao_ponto_from_ocr(
  p_case_id uuid,
  p_calculo_id uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL
)
RETURNS TABLE (
  parsed_days int,
  parsed_months int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_doc RECORD;
  v_text text;
  v_line text;
  v_match text[];
  v_data date;
  v_e1 text; v_s1 text; v_e2 text; v_s2 text;
  v_mt int; v_hext70 int;
  v_is_feriado boolean; v_is_dsr boolean; v_is_falta boolean;
  v_days_inserted int := 0;
  v_months_upserted int := 0;
  v_calculo_id_real uuid;
BEGIN
  IF p_calculo_id IS NULL THEN
    SELECT id INTO v_calculo_id_real FROM pjecalc_calculos
    WHERE case_id = p_case_id LIMIT 1;
  ELSE
    v_calculo_id_real := p_calculo_id;
  END IF;

  DELETE FROM pjecalc_apuracao_diaria
  WHERE case_id = p_case_id
    AND (p_document_id IS NULL OR documento_id = p_document_id);

  DELETE FROM pjecalc_cartao_ponto WHERE case_id = p_case_id;

  FOR v_doc IN (
    SELECT id, file_name, ocr_text
    FROM documents
    WHERE case_id = p_case_id
      AND (tipo = 'cartao_ponto' OR tipo = 'ponto' OR file_name ILIKE '%ponto%')
      AND ocr_text IS NOT NULL
      AND LENGTH(ocr_text) > 100
      AND (p_document_id IS NULL OR id = p_document_id)
  ) LOOP
    v_text := v_doc.ocr_text;

    FOR v_line IN SELECT unnest(string_to_array(v_text, E'\n'))
    LOOP
      v_match := regexp_match(
        v_line,
        '\|\s*(\d{2})/(\d{2})/(\d{4})\s*-\s*\w+\s*\|\s*([0-9:]+|--)\s*\|\s*([0-9:]*)\s*\|\s*([0-9:]*)\s*\|\s*([0-9:]*)'
      );
      IF v_match IS NULL THEN CONTINUE; END IF;

      BEGIN
        v_data := make_date(v_match[3]::int, v_match[2]::int, v_match[1]::int);
      EXCEPTION WHEN OTHERS THEN CONTINUE;
      END;

      v_e1 := NULLIF(TRIM(v_match[4]), ''); IF v_e1 = '--' THEN v_e1 := NULL; END IF;
      v_s1 := NULLIF(TRIM(v_match[5]), '');
      v_e2 := NULLIF(TRIM(v_match[6]), '');
      v_s2 := NULLIF(TRIM(v_match[7]), '');

      v_is_feriado := v_line ILIKE '%FERIADO%';
      v_is_dsr := v_line ILIKE '%DSR Semanal%';
      v_is_falta := (v_e1 IS NULL AND NOT v_is_feriado AND NOT v_is_dsr);

      v_match := regexp_match(v_line, 'Horas Trabalhadas\s*:\s*(\d{1,2}):(\d{2})');
      IF v_match IS NOT NULL THEN
        v_mt := v_match[1]::int * 60 + v_match[2]::int;
      ELSIF v_e1 IS NOT NULL THEN
        v_mt := 0;
        IF v_s1 IS NOT NULL AND v_s1 ~ '^\d{2}:\d{2}$' AND v_e1 ~ '^\d{2}:\d{2}$' THEN
          v_mt := v_mt +
            (EXTRACT(HOUR FROM v_s1::time) - EXTRACT(HOUR FROM v_e1::time)) * 60 +
            (EXTRACT(MINUTE FROM v_s1::time) - EXTRACT(MINUTE FROM v_e1::time));
        END IF;
        IF v_s2 IS NOT NULL AND v_s2 ~ '^\d{2}:\d{2}$' AND v_e2 IS NOT NULL AND v_e2 ~ '^\d{2}:\d{2}$' THEN
          v_mt := v_mt +
            (EXTRACT(HOUR FROM v_s2::time) - EXTRACT(HOUR FROM v_e2::time)) * 60 +
            (EXTRACT(MINUTE FROM v_s2::time) - EXTRACT(MINUTE FROM v_e2::time));
        END IF;
        IF v_mt < 0 THEN v_mt := 0; END IF;
      ELSE
        v_mt := 0;
      END IF;

      v_match := regexp_match(v_line, 'Banco de Horas\s+\d+%\s*:\s*(\d{1,2}):(\d{2})');
      IF v_match IS NOT NULL THEN
        v_hext70 := v_match[1]::int * 60 + v_match[2]::int;
      ELSE
        v_match := regexp_match(v_line, 'Hora Extra\s+\w*\s*\d*%?\s*:\s*(\d{1,2}):(\d{2})');
        IF v_match IS NOT NULL THEN
          v_hext70 := v_match[1]::int * 60 + v_match[2]::int;
        ELSE
          v_hext70 := 0;
        END IF;
      END IF;

      INSERT INTO pjecalc_apuracao_diaria (
        case_id, calculo_id, data, documento_id,
        frequencia_str,
        minutos_trabalhados, minutos_extra_diaria, minutos_noturno,
        horas_trabalhadas, horas_extras_diaria, horas_noturnas,
        is_falta, is_feriado, is_dsr,
        origem
      ) VALUES (
        p_case_id, v_calculo_id_real, v_data, v_doc.id,
        NULLIF(array_to_string(ARRAY[v_e1, v_s1, v_e2, v_s2]::text[], ' | '), ''),
        v_mt, v_hext70, 0,
        v_mt::numeric / 60.0, v_hext70::numeric / 60.0, 0,
        v_is_falta, v_is_feriado, v_is_dsr,
        'OCR_SQL'
      )
      ON CONFLICT (calculo_id, data) DO UPDATE SET
        frequencia_str = COALESCE(EXCLUDED.frequencia_str, pjecalc_apuracao_diaria.frequencia_str),
        minutos_trabalhados = GREATEST(EXCLUDED.minutos_trabalhados, pjecalc_apuracao_diaria.minutos_trabalhados),
        minutos_extra_diaria = GREATEST(EXCLUDED.minutos_extra_diaria, pjecalc_apuracao_diaria.minutos_extra_diaria),
        horas_trabalhadas = GREATEST(EXCLUDED.horas_trabalhadas, pjecalc_apuracao_diaria.horas_trabalhadas),
        horas_extras_diaria = GREATEST(EXCLUDED.horas_extras_diaria, pjecalc_apuracao_diaria.horas_extras_diaria),
        is_falta = EXCLUDED.is_falta AND pjecalc_apuracao_diaria.is_falta,
        is_feriado = EXCLUDED.is_feriado OR pjecalc_apuracao_diaria.is_feriado,
        is_dsr = EXCLUDED.is_dsr OR pjecalc_apuracao_diaria.is_dsr,
        documento_id = COALESCE(pjecalc_apuracao_diaria.documento_id, EXCLUDED.documento_id);

      v_days_inserted := v_days_inserted + 1;
    END LOOP;
  END LOOP;

  INSERT INTO pjecalc_cartao_ponto (
    case_id, calculo_id, competencia,
    dias_trabalhados, feriados_repousos_trabalhados,
    hs_ext_diarias, hs_ext_feriados, hs_ext_repousos,
    hs_ext_f_r, hs_interjornada, repousos_trabalhados,
    horas_extras_50, horas_extras_100,
    origem
  )
  SELECT
    p_case_id,
    v_calculo_id_real,
    to_char(data, 'YYYY-MM'),
    COUNT(*) FILTER (WHERE minutos_trabalhados > 0 AND NOT is_falta),
    COUNT(*) FILTER (WHERE (is_feriado OR is_dsr) AND minutos_trabalhados > 0),
    ROUND(SUM(minutos_extra_diaria) FILTER (WHERE NOT is_feriado AND NOT is_dsr) / 60.0, 2),
    ROUND(SUM(minutos_extra_diaria) FILTER (WHERE is_feriado) / 60.0, 2),
    ROUND(SUM(minutos_extra_diaria) FILTER (WHERE is_dsr AND NOT is_feriado) / 60.0, 2),
    0, 0,
    COUNT(*) FILTER (WHERE is_dsr AND minutos_trabalhados > 0),
    ROUND(SUM(minutos_extra_diaria) FILTER (WHERE NOT is_feriado AND NOT is_dsr) / 60.0, 2),
    ROUND(SUM(minutos_extra_diaria) FILTER (WHERE is_feriado OR is_dsr) / 60.0, 2),
    'OCR_SQL'
  FROM pjecalc_apuracao_diaria
  WHERE case_id = p_case_id
  GROUP BY to_char(data, 'YYYY-MM')
  ON CONFLICT (case_id, competencia) DO UPDATE SET
    dias_trabalhados = EXCLUDED.dias_trabalhados,
    feriados_repousos_trabalhados = EXCLUDED.feriados_repousos_trabalhados,
    hs_ext_diarias = EXCLUDED.hs_ext_diarias,
    hs_ext_feriados = EXCLUDED.hs_ext_feriados,
    hs_ext_repousos = EXCLUDED.hs_ext_repousos,
    repousos_trabalhados = EXCLUDED.repousos_trabalhados,
    horas_extras_50 = EXCLUDED.horas_extras_50,
    horas_extras_100 = EXCLUDED.horas_extras_100,
    updated_at = now();

  GET DIAGNOSTICS v_months_upserted = ROW_COUNT;

  RETURN QUERY SELECT v_days_inserted, v_months_upserted;
END;
$$;

COMMENT ON FUNCTION public.parse_cartao_ponto_from_ocr IS
  'Parser determinístico (sem LLM) de cartão de ponto via SQL/regex. Lê ocr_text persistido em documents, extrai batidas + horas trab/extras + feriados/DSR/faltas, popula pjecalc_apuracao_diaria e pjecalc_cartao_ponto agregado.';
