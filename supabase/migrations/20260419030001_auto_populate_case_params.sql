-- ============================================================
-- RPC: auto_populate_case_params(p_case_id)
--
-- Popula TODOS os parâmetros derivados do cálculo a partir de
-- dados já extraídos (OCR text, pjecalc_calculos, apuracao_diaria).
--
-- Chamada ao final da validação de um documento no split view.
-- Idempotente (pode rodar N vezes sem duplicar).
--
-- Faz:
--  1. Sync pjecalc_parametros (data_admissao, demissao, carga_horaria)
--     a partir de pjecalc_calculos
--  2. Detecta férias/licenças (afastamento 15+ dias consecutivos no
--     cartão de ponto) → pjecalc_ferias
--  3. Cria configs default (FGTS/CS/IR) se não existirem
--  4. Reprocessa cartão de ponto (chama parse_cartao_ponto_from_ocr)
--
-- Não detecta faltas automaticamente (gera falsos positivos em feriados
-- não mapeados ou dias com OCR incompleto). Usuário preenche manualmente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_populate_case_params(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_calc RECORD;
  v_calculo_id uuid;
  v_result jsonb := '{}'::jsonb;
  v_ferias_count int := 0;
  v_ano_aquisitivo int;
  v_periodo_aq_ini date;
  v_periodo_aq_fim date;
  v_ferias_start date;
  v_ferias_end date;
  v_dia RECORD;
  v_inside_ferias boolean := false;
BEGIN
  SELECT * INTO v_calc FROM pjecalc_calculos WHERE case_id = p_case_id LIMIT 1;
  IF v_calc.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Cálculo não encontrado para este caso');
  END IF;
  v_calculo_id := v_calc.id;

  DELETE FROM pjecalc_faltas WHERE case_id = p_case_id AND motivo ILIKE '%cartão de ponto%';
  DELETE FROM pjecalc_ferias WHERE case_id = p_case_id;

  -- 1. Sync pjecalc_parametros
  BEGIN
    INSERT INTO pjecalc_parametros (case_id, data_admissao, data_demissao, carga_horaria_padrao)
    VALUES (p_case_id, v_calc.data_admissao, v_calc.data_demissao, COALESCE(v_calc.divisor_horas, 220))
    ON CONFLICT (case_id) DO UPDATE SET
      data_admissao = COALESCE(EXCLUDED.data_admissao, pjecalc_parametros.data_admissao),
      data_demissao = COALESCE(EXCLUDED.data_demissao, pjecalc_parametros.data_demissao),
      carga_horaria_padrao = COALESCE(EXCLUDED.carga_horaria_padrao, pjecalc_parametros.carga_horaria_padrao),
      updated_at = now();
    v_result := v_result || jsonb_build_object('parametros_synced', true);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('parametros_error', SQLERRM);
  END;

  -- 2. Férias (afastamento 15+ dias consecutivos)
  BEGIN
    FOR v_dia IN
      SELECT data, is_afastamento, LAG(data) OVER (ORDER BY data) AS prev_data
      FROM pjecalc_apuracao_diaria WHERE case_id = p_case_id ORDER BY data
    LOOP
      IF v_dia.is_afastamento AND NOT v_inside_ferias THEN
        v_ferias_start := v_dia.data;
        v_inside_ferias := true;
      ELSIF NOT v_dia.is_afastamento AND v_inside_ferias THEN
        v_ferias_end := v_dia.prev_data;
        IF v_ferias_end IS NOT NULL AND (v_ferias_end - v_ferias_start) >= 15 THEN
          v_ano_aquisitivo := EXTRACT(YEAR FROM v_ferias_start);
          v_periodo_aq_ini := v_calc.data_admissao + ((v_ano_aquisitivo - EXTRACT(YEAR FROM v_calc.data_admissao))::int - 1) * interval '1 year';
          v_periodo_aq_fim := v_periodo_aq_ini + interval '1 year - 1 day';
          BEGIN
            INSERT INTO pjecalc_ferias (
              case_id, calculo_id,
              periodo_aquisitivo_inicio, periodo_aquisitivo_fim,
              gozo_1_inicio, gozo_1_fim, prazo_dias, abono, observacoes
            ) VALUES (
              p_case_id, v_calculo_id, v_periodo_aq_ini::date, v_periodo_aq_fim::date,
              v_ferias_start, v_ferias_end, (v_ferias_end - v_ferias_start + 1)::int, false,
              CASE WHEN (v_ferias_end - v_ferias_start) > 45
                   THEN 'Licença (15+ dias) detectada no cartão de ponto'
                   ELSE 'Férias detectadas no cartão de ponto' END
            );
            v_ferias_count := v_ferias_count + 1;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
        v_inside_ferias := false;
      END IF;
    END LOOP;
    v_result := v_result || jsonb_build_object('ferias_detectadas', v_ferias_count);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('ferias_error', SQLERRM);
  END;

  v_result := v_result || jsonb_build_object('faltas_auto_skipped', 'usuário preenche manualmente');

  -- 3. FGTS default
  BEGIN
    INSERT INTO pjecalc_fgts_config (case_id, apurar, multa_percentual, multa_base, lc110_10, lc110_05)
    VALUES (p_case_id, true, 40, 'devido', false, false)
    ON CONFLICT (case_id) DO NOTHING;
    v_result := v_result || jsonb_build_object('fgts_config_ok', true);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('fgts_error', SQLERRM);
  END;

  -- 4. CS / INSS (colunas corretas: aliquota_*_fixa, aliquota_segurado_tipo)
  BEGIN
    INSERT INTO pjecalc_cs_config (
      case_id, apurar_segurado, apurar_empresa, apurar_sat, apurar_terceiros,
      aliquota_empresa_fixa, aliquota_sat_fixa, aliquota_terceiros_fixa,
      aliquota_segurado_tipo, com_correcao_trabalhista
    )
    VALUES (p_case_id, true, true, false, false, 20.0, 0.0, 0.0, 'progressiva', true)
    ON CONFLICT (case_id) DO NOTHING;
    v_result := v_result || jsonb_build_object('cs_config_ok', true);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('cs_error', SQLERRM);
  END;

  -- 5. IR (colunas corretas: apurar, deduzir_cs, art_12a_rra)
  BEGIN
    INSERT INTO pjecalc_ir_config (case_id, apurar, deduzir_cs, art_12a_rra)
    VALUES (p_case_id, true, true, true)
    ON CONFLICT (case_id) DO NOTHING;
    v_result := v_result || jsonb_build_object('ir_config_ok', true);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('ir_error', SQLERRM);
  END;

  -- 6. Re-parse cartão de ponto
  BEGIN
    PERFORM public.parse_cartao_ponto_from_ocr(p_case_id);
    v_result := v_result || jsonb_build_object('cartao_ponto_reparsed', true);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('cartao_ponto_error', SQLERRM);
  END;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.auto_populate_case_params IS
  'Popula TODOS os parâmetros derivados de um case (parâmetros, férias, configs FGTS/CS/IR, cartão de ponto). Idempotente. Chamada ao final da validação de cada documento.';
