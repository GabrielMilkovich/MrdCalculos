-- ============================================================
-- Parsers SQL universais para holerites + RPC mestra unificada.
--
-- Princípio: toda a extração estruturada roda em SQL determinístico.
-- O LLM só é chamado como último recurso (extract-and-fill).
--
-- Inclui:
--   - parse_month_abbrev()  : "JUN" → 6
--   - parse_brl_number()    : "1.234,56" → 1234.56
--   - classify_rubrica()    : "DSR(Comissão)" → 'dsr'
--   - parse_holerite_from_ocr() : extrai rubricas + valores mensais
--   - auto_populate_case_params() : orquestrador (cartão + holerite + férias + configs)
-- ============================================================

-- 1. Helpers
CREATE OR REPLACE FUNCTION public.parse_month_abbrev(p text)
RETURNS int LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE UPPER(p)
    WHEN 'JAN' THEN 1 WHEN 'FEV' THEN 2 WHEN 'MAR' THEN 3
    WHEN 'ABR' THEN 4 WHEN 'MAI' THEN 5 WHEN 'JUN' THEN 6
    WHEN 'JUL' THEN 7 WHEN 'AGO' THEN 8 WHEN 'SET' THEN 9
    WHEN 'OUT' THEN 10 WHEN 'NOV' THEN 11 WHEN 'DEZ' THEN 12
    ELSE NULL END;
END $$;

CREATE OR REPLACE FUNCTION public.parse_brl_number(p text)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v text;
BEGIN
  IF p IS NULL OR TRIM(p) = '' THEN RETURN NULL; END IF;
  v := TRIM(p);
  v := regexp_replace(v, '\.(?=\d{3}[,.])', '', 'g');
  v := REPLACE(v, ',', '.');
  IF v !~ '^-?\d+(\.\d+)?$' THEN RETURN NULL; END IF;
  RETURN v::numeric;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.classify_rubrica(p_desc text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_desc IS NULL THEN RETURN 'outros'; END IF;
  p_desc := UPPER(p_desc);
  IF p_desc ~ 'INSS' AND p_desc !~ 'BASE' THEN RETURN 'inss'; END IF;
  IF p_desc ~ 'IR |IRPF' AND p_desc !~ 'BASE' THEN RETURN 'irrf'; END IF;
  IF p_desc ~ 'FGTS' AND p_desc !~ 'BASE' THEN RETURN 'fgts_info'; END IF;
  IF p_desc ~ 'SAL.*RIO|VENCIMENTO' AND p_desc !~ 'FAM|BASE' THEN RETURN 'salario_base'; END IF;
  IF p_desc ~ '13.*SAL|DECIMO' THEN RETURN 'decimo_terceiro'; END IF;
  IF p_desc ~ 'F.RIAS' AND p_desc !~ 'BASE|PROVIS' THEN RETURN 'ferias'; END IF;
  IF p_desc ~ '1/3.*ADIC|ADIC.*CONST.*FER' THEN RETURN 'adicional_ferias_1_3'; END IF;
  IF p_desc ~ 'COMISS' THEN RETURN 'comissao'; END IF;
  IF p_desc ~ '\bDSR\b|REPOUSO' THEN RETURN 'dsr'; END IF;
  IF p_desc ~ 'HORA.*EXTRA|\bHE\b|HRS.*EXTRA' THEN RETURN 'horas_extras'; END IF;
  IF p_desc ~ 'NOTURN' THEN RETURN 'adicional_noturno'; END IF;
  IF p_desc ~ 'INSALUB' THEN RETURN 'adicional_insalubridade'; END IF;
  IF p_desc ~ 'PERICUL' THEN RETURN 'adicional_periculosidade'; END IF;
  IF p_desc ~ 'TRANSPORTE|\bVT\b' THEN RETURN 'vale_transporte'; END IF;
  IF p_desc ~ 'ALIMENTA|\bVR\b|REFEI' THEN RETURN 'vale_alimentacao'; END IF;
  IF p_desc ~ 'FAM.LIA|SAL.*FAM' THEN RETURN 'salario_familia'; END IF;
  IF p_desc ~ 'PR.MIO|BONUS|BÔNUS' THEN RETURN 'premio'; END IF;
  IF p_desc ~ 'AVISO.*PR.VIO' THEN RETURN 'aviso_previo'; END IF;
  IF p_desc ~ 'GRATIFIC' THEN RETURN 'gratificacao'; END IF;
  IF p_desc ~ 'PENS.O|PENSAO' THEN RETURN 'pensao_alimenticia'; END IF;
  IF p_desc ~ 'ADIANT|EMPR.STIMO|CONSIGNADO|CART.O' THEN RETURN 'desconto_outros'; END IF;
  RETURN 'outros';
END $$;

-- 2. Parser holerite/contracheque
CREATE OR REPLACE FUNCTION public.parse_holerite_from_ocr(
  p_case_id uuid,
  p_calculo_id uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL
)
RETURNS TABLE (rubricas_criadas int, valores_mensais int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_doc RECORD;
  v_text text; v_line text; v_match text[];
  v_codigo text; v_desc text;
  v_venc numeric; v_desc_val numeric; v_valor numeric;
  v_competencia date;
  v_mes int; v_ano int;
  v_calculo_id_real uuid;
  v_hist_id uuid;
  v_categoria text;
  v_rubricas int := 0;
  v_valores int := 0;
BEGIN
  IF p_calculo_id IS NULL THEN
    SELECT id INTO v_calculo_id_real FROM pjecalc_calculos WHERE case_id = p_case_id LIMIT 1;
  ELSE
    v_calculo_id_real := p_calculo_id;
  END IF;

  DELETE FROM pjecalc_hist_salarial_mes
  WHERE case_id = p_case_id
    AND (p_document_id IS NULL OR documento_id = p_document_id);
  DELETE FROM pjecalc_hist_salarial WHERE case_id = p_case_id;

  FOR v_doc IN (
    SELECT id, file_name, ocr_text FROM documents
    WHERE case_id = p_case_id
      AND (tipo IN ('holerite', 'ficha_financeira', 'contracheque')
           OR file_name ILIKE '%contracheque%' OR file_name ILIKE '%holerite%')
      AND ocr_text IS NOT NULL AND LENGTH(ocr_text) > 100
      AND (p_document_id IS NULL OR id = p_document_id)
  ) LOOP
    v_text := v_doc.ocr_text;
    v_competencia := NULL;

    FOR v_line IN SELECT unnest(string_to_array(v_text, E'\n')) LOOP
      -- Competência (REFERÊNCIA | JUN/2021)
      v_match := regexp_match(v_line, '(?:REFER.NCIA|COMPET.NCIA)[^|]*\|\s*(\w{3})/(\d{4})');
      IF v_match IS NULL THEN
        v_match := regexp_match(v_line, '\|\s*(\w{3})/(\d{4})\s*\|');
      END IF;
      IF v_match IS NOT NULL THEN
        v_mes := public.parse_month_abbrev(v_match[1]);
        IF v_mes IS NOT NULL THEN
          v_ano := v_match[2]::int;
          v_competencia := make_date(v_ano, v_mes, 1);
        END IF;
      END IF;

      -- Linha de rubrica: | CODIGO DESC | QTDE | VENCIMENTO | DESCONTO |
      v_match := regexp_match(
        v_line,
        '\|\s*(\d{3,4})\s+(.+?)\s*\|\s*([\d\.,]*)\s*\|\s*([\d\.,]*)\s*\|\s*([\d\.,]*)\s*\|'
      );
      IF v_match IS NULL OR v_competencia IS NULL THEN CONTINUE; END IF;

      v_codigo := TRIM(v_match[1]);
      v_desc := TRIM(v_match[2]);
      v_venc := public.parse_brl_number(v_match[4]);
      v_desc_val := public.parse_brl_number(v_match[5]);
      v_valor := COALESCE(v_venc, -COALESCE(v_desc_val, 0));

      IF v_desc ILIKE '%BASE%' OR v_desc ILIKE '%TOTAIS%' OR v_desc ILIKE '---%' THEN CONTINUE; END IF;
      IF v_valor IS NULL OR v_valor = 0 THEN CONTINUE; END IF;

      v_categoria := public.classify_rubrica(v_desc);

      SELECT id INTO v_hist_id FROM pjecalc_hist_salarial
      WHERE case_id = p_case_id AND nome = v_desc;

      IF v_hist_id IS NULL THEN
        INSERT INTO pjecalc_hist_salarial (
          case_id, calculo_id, nome, tipo_variacao,
          incide_inss, incide_fgts, incide_ir,
          valor_fixo, observacoes
        ) VALUES (
          p_case_id, v_calculo_id_real, v_desc,
          CASE WHEN v_categoria IN ('salario_base', 'salario_familia') THEN 'FIXA' ELSE 'VARIAVEL' END,
          v_categoria NOT IN ('vale_transporte', 'vale_alimentacao', 'fgts_info', 'irrf'),
          v_categoria NOT IN ('vale_transporte', 'vale_alimentacao', 'fgts_info', 'irrf', 'premio'),
          v_categoria NOT IN ('vale_transporte', 'vale_alimentacao', 'fgts_info', 'salario_familia'),
          v_valor,
          'Categoria: ' || v_categoria || ' | Código: ' || v_codigo
        )
        RETURNING id INTO v_hist_id;
        v_rubricas := v_rubricas + 1;
      END IF;

      INSERT INTO pjecalc_hist_salarial_mes (
        case_id, calculo_id, hist_salarial_id, competencia, valor, origem, documento_id
      ) VALUES (
        p_case_id, v_calculo_id_real, v_hist_id, v_competencia, v_valor, 'OCR_SQL', v_doc.id
      )
      ON CONFLICT (hist_salarial_id, competencia) DO UPDATE SET
        valor = GREATEST(EXCLUDED.valor, pjecalc_hist_salarial_mes.valor);

      v_valores := v_valores + 1;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_rubricas, v_valores;
END;
$$;

-- 3. RPC mestra unificada (chama todos os parsers)
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
  v_ponto_ret RECORD;
  v_holerite_ret RECORD;
BEGIN
  SELECT * INTO v_calc FROM pjecalc_calculos WHERE case_id = p_case_id LIMIT 1;
  IF v_calc.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Cálculo não encontrado');
  END IF;
  v_calculo_id := v_calc.id;

  DELETE FROM pjecalc_faltas WHERE case_id = p_case_id AND motivo ILIKE '%cartão de ponto%';
  DELETE FROM pjecalc_ferias WHERE case_id = p_case_id;

  -- 1. pjecalc_parametros
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

  -- 2. Cartão de ponto
  BEGIN
    SELECT * INTO v_ponto_ret FROM public.parse_cartao_ponto_from_ocr(p_case_id);
    v_result := v_result || jsonb_build_object(
      'cartao_ponto_dias', v_ponto_ret.parsed_days,
      'cartao_ponto_meses', v_ponto_ret.parsed_months
    );
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('cartao_ponto_error', SQLERRM);
  END;

  -- 3. Holerite/contracheque
  BEGIN
    SELECT * INTO v_holerite_ret FROM public.parse_holerite_from_ocr(p_case_id);
    v_result := v_result || jsonb_build_object(
      'holerite_rubricas', v_holerite_ret.rubricas_criadas,
      'holerite_valores', v_holerite_ret.valores_mensais
    );
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('holerite_error', SQLERRM);
  END;

  -- 4. Férias/licenças
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
                   THEN 'Licença detectada no cartão de ponto'
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

  -- 5. Configs default
  BEGIN
    INSERT INTO pjecalc_fgts_config (case_id, apurar, multa_percentual, multa_base, lc110_10, lc110_05)
    VALUES (p_case_id, true, 40, 'devido', false, false)
    ON CONFLICT (case_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    INSERT INTO pjecalc_cs_config (
      case_id, apurar_segurado, apurar_empresa, apurar_sat, apurar_terceiros,
      aliquota_empresa_fixa, aliquota_sat_fixa, aliquota_terceiros_fixa,
      aliquota_segurado_tipo, com_correcao_trabalhista
    )
    VALUES (p_case_id, true, true, false, false, 20.0, 0.0, 0.0, 'progressiva', true)
    ON CONFLICT (case_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    INSERT INTO pjecalc_ir_config (case_id, apurar, deduzir_cs, art_12a_rra)
    VALUES (p_case_id, true, true, true)
    ON CONFLICT (case_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  v_result := v_result || jsonb_build_object('configs_default_criadas', true);

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.auto_populate_case_params IS
  'RPC mestra: popula TODOS os parâmetros derivados (cartão de ponto, holerite, férias, configs FGTS/CS/IR) via parsers SQL determinísticos.';
