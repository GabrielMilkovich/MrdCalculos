-- ============================================================
-- parse_cartao_ponto_from_ocr v7: suporta 3 formatos + licença maternidade
--
-- Formatos suportados:
--   Casas Bahia (2021+): | DD/MM/YYYY - Dia | E1 | S1 | E2 | S2 | ...
--   Casas Bahia (licenças): | DD/MM/YYYY - Dia | -- | | ... Licença Maternidade ... |
--   Via Varejo (2018-2021, 2 variantes):
--     | DD/MM/YYYY | DIA | NUM | N | HH:MM HH:MM HH:MM HH:MM | ...
--     | DD/MM/YYYY DIA | NUM | N | HH:MM HH:MM HH:MM HH:MM | ...
--
-- Usa safe_hhmm_to_min() para validar HH:MM antes de cast (OCR às vezes
-- retorna "59:41" inválido que quebraria ::time).
--
-- Detecta: feriado, DSR, afastamento (licença maternidade/atestado), falta.
-- Popula: pjecalc_apuracao_diaria (linha/dia) + pjecalc_cartao_ponto (agregado/mês).
-- ============================================================

CREATE OR REPLACE FUNCTION public.safe_hhmm_to_min(t text)
RETURNS int LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE h int; m int; parts text[];
BEGIN
  IF t IS NULL OR t = '' THEN RETURN NULL; END IF;
  parts := regexp_match(t, '^(\d{1,2}):(\d{2})$');
  IF parts IS NULL THEN RETURN NULL; END IF;
  h := parts[1]::int; m := parts[2]::int;
  IF h < 0 OR h > 23 OR m < 0 OR m > 59 THEN RETURN NULL; END IF;
  RETURN h * 60 + m;
END; $$;


CREATE OR REPLACE FUNCTION public.parse_cartao_ponto_from_ocr(
  p_case_id uuid,
  p_calculo_id uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL
)
RETURNS TABLE (parsed_days int, parsed_months int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_doc RECORD;
  v_text text;
  v_line text;
  v_match text[];
  v_data date;
  v_e1 text; v_s1 text; v_e2 text; v_s2 text;
  v_e1m int; v_s1m int; v_e2m int; v_s2m int;
  v_mt int; v_hext70 int;
  v_is_feriado boolean; v_is_dsr boolean; v_is_falta boolean; v_is_afastamento boolean;
  v_days_inserted int := 0;
  v_months_upserted int := 0;
  v_calculo_id_real uuid;
  v_rest_of_line text;
  v_hora_match RECORD;
  v_horas text[];
BEGIN
  IF p_calculo_id IS NULL THEN
    SELECT id INTO v_calculo_id_real FROM pjecalc_calculos WHERE case_id = p_case_id LIMIT 1;
  ELSE
    v_calculo_id_real := p_calculo_id;
  END IF;

  DELETE FROM pjecalc_apuracao_diaria
  WHERE case_id = p_case_id AND (p_document_id IS NULL OR documento_id = p_document_id);
  DELETE FROM pjecalc_cartao_ponto WHERE case_id = p_case_id;

  FOR v_doc IN (
    SELECT id, file_name, ocr_text FROM documents
    WHERE case_id = p_case_id
      AND (tipo = 'cartao_ponto' OR tipo = 'ponto' OR file_name ILIKE '%ponto%')
      AND ocr_text IS NOT NULL AND LENGTH(ocr_text) > 100
      AND (p_document_id IS NULL OR id = p_document_id)
  ) LOOP
    v_text := v_doc.ocr_text;

    FOR v_line IN SELECT unnest(string_to_array(v_text, E'\n')) LOOP
      -- Casas Bahia
      v_match := regexp_match(v_line, '\|\s*(\d{2})/(\d{2})/(\d{4})\s*-\s*\w+\s*\|\s*(.+)');
      IF v_match IS NOT NULL THEN
        BEGIN v_data := make_date(v_match[3]::int, v_match[2]::int, v_match[1]::int);
        EXCEPTION WHEN OTHERS THEN CONTINUE; END;
        v_rest_of_line := v_match[4];
        v_e1 := NULL; v_s1 := NULL; v_e2 := NULL; v_s2 := NULL;
        v_match := regexp_match(v_rest_of_line, '^([0-9:]+|--)\s*\|\s*([0-9:]*)\s*\|\s*([0-9:]*)\s*\|\s*([0-9:]*)');
        IF v_match IS NOT NULL THEN
          v_e1 := NULLIF(TRIM(v_match[1]), ''); IF v_e1 = '--' THEN v_e1 := NULL; END IF;
          v_s1 := NULLIF(TRIM(v_match[2]), '');
          v_e2 := NULLIF(TRIM(v_match[3]), '');
          v_s2 := NULLIF(TRIM(v_match[4]), '');
        END IF;
      ELSE
        -- Via Varejo (2 variantes)
        v_match := regexp_match(
          v_line,
          '\|\s*(\d{2})/(\d{2})/(\d{4})(?:\s+\w+)?\s*\|\s*(?:\w+\s*\|\s*)?\d+\s*\|\s*N\s*\|\s*([^|]+)'
        );
        IF v_match IS NULL THEN CONTINUE; END IF;
        BEGIN v_data := make_date(v_match[3]::int, v_match[2]::int, v_match[1]::int);
        EXCEPTION WHEN OTHERS THEN CONTINUE; END;
        v_rest_of_line := v_match[4];
        v_e1 := NULL; v_s1 := NULL; v_e2 := NULL; v_s2 := NULL;
        v_horas := '{}';
        FOR v_hora_match IN
          SELECT (regexp_matches(v_rest_of_line, '(\d{2}:\d{2})', 'g'))[1] AS h
        LOOP
          v_horas := array_append(v_horas, v_hora_match.h);
          IF array_length(v_horas, 1) >= 4 THEN EXIT; END IF;
        END LOOP;
        IF array_length(v_horas, 1) >= 1 THEN v_e1 := v_horas[1]; END IF;
        IF array_length(v_horas, 1) >= 2 THEN v_s1 := v_horas[2]; END IF;
        IF array_length(v_horas, 1) >= 3 THEN v_e2 := v_horas[3]; END IF;
        IF array_length(v_horas, 1) >= 4 THEN v_s2 := v_horas[4]; END IF;
      END IF;

      v_e1m := safe_hhmm_to_min(v_e1);
      v_s1m := safe_hhmm_to_min(v_s1);
      v_e2m := safe_hhmm_to_min(v_e2);
      v_s2m := safe_hhmm_to_min(v_s2);
      IF v_e1m IS NULL THEN v_e1 := NULL; END IF;
      IF v_s1m IS NULL THEN v_s1 := NULL; END IF;
      IF v_e2m IS NULL THEN v_e2 := NULL; END IF;
      IF v_s2m IS NULL THEN v_s2 := NULL; END IF;

      v_is_feriado := v_line ILIKE '%FERIADO%';
      v_is_dsr := v_line ILIKE '%DSR Semanal%' OR v_line ILIKE '%DSR %'
                OR v_line ILIKE '%DOMINGO%' OR v_line ILIKE '% COM %';
      v_is_afastamento := v_line ILIKE '%Licença Maternidade%' OR v_line ILIKE '%Licenca Maternidade%'
                        OR v_line ILIKE '%Atestado%' OR v_line ILIKE '%Afastamento%'
                        OR v_line ILIKE '%Auxilio Doença%' OR v_line ILIKE '%Auxílio Doença%'
                        OR v_line ILIKE '%Auxilio Doenca%';
      v_is_falta := (COALESCE(v_e1, '') = '' AND NOT v_is_feriado AND NOT v_is_dsr AND NOT v_is_afastamento)
                   OR (v_line ILIKE '%FALTA%' AND COALESCE(v_e1, '') = '');

      -- Minutos trabalhados
      v_match := regexp_match(v_line, 'Horas Trabalhadas\s*:\s*(\d{1,2}):(\d{2})');
      IF v_match IS NOT NULL THEN
        v_mt := v_match[1]::int * 60 + v_match[2]::int;
      ELSIF v_e1m IS NOT NULL AND v_s1m IS NOT NULL THEN
        v_mt := GREATEST(0, v_s1m - v_e1m);
        IF v_e2m IS NOT NULL AND v_s2m IS NOT NULL THEN
          v_mt := v_mt + GREATEST(0, v_s2m - v_e2m);
        END IF;
      ELSE
        v_mt := 0;
      END IF;

      -- Extras
      v_match := regexp_match(v_line, 'Banco de Horas\s+\d+%\s*:\s*(\d{1,2}):(\d{2})');
      IF v_match IS NOT NULL THEN
        v_hext70 := v_match[1]::int * 60 + v_match[2]::int;
      ELSE
        v_match := regexp_match(v_line, 'Hora Extra\s+\w*\s*\d*%?\s*:\s*(\d{1,2}):(\d{2})');
        IF v_match IS NOT NULL THEN
          v_hext70 := v_match[1]::int * 60 + v_match[2]::int;
        ELSIF v_mt > 480 THEN
          v_hext70 := v_mt - 480;
        ELSE
          v_hext70 := 0;
        END IF;
      END IF;

      INSERT INTO pjecalc_apuracao_diaria (
        case_id, calculo_id, data, documento_id, frequencia_str,
        minutos_trabalhados, minutos_extra_diaria, minutos_noturno,
        horas_trabalhadas, horas_extras_diaria, horas_noturnas,
        is_falta, is_feriado, is_dsr, is_afastamento, origem
      ) VALUES (
        p_case_id, v_calculo_id_real, v_data, v_doc.id,
        NULLIF(array_to_string(ARRAY[v_e1, v_s1, v_e2, v_s2]::text[], ' | '), ''),
        v_mt, v_hext70, 0, v_mt::numeric / 60.0, v_hext70::numeric / 60.0, 0,
        v_is_falta, v_is_feriado, v_is_dsr, v_is_afastamento, 'OCR_SQL'
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
        is_afastamento = EXCLUDED.is_afastamento OR pjecalc_apuracao_diaria.is_afastamento,
        documento_id = COALESCE(pjecalc_apuracao_diaria.documento_id, EXCLUDED.documento_id);

      v_days_inserted := v_days_inserted + 1;
    END LOOP;
  END LOOP;

  INSERT INTO pjecalc_cartao_ponto (
    case_id, calculo_id, competencia,
    dias_trabalhados, feriados_repousos_trabalhados,
    hs_ext_diarias, hs_ext_feriados, hs_ext_repousos,
    hs_ext_f_r, hs_interjornada, repousos_trabalhados,
    horas_extras_50, horas_extras_100, origem
  )
  SELECT
    p_case_id, v_calculo_id_real, to_char(data, 'YYYY-MM'),
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
