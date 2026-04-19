-- ============================================================
-- Parser UNIVERSAL: extrai campos comuns de QUALQUER documento OCR'd
--
-- Rouba dados-chave (CNJ, CPF, CNPJ, PIS, datas, cargo, vara,
-- tribunal, nome reclamante, razão social, dependentes) do texto
-- completo (todos os docs agregados) via regex.
--
-- Usa COALESCE no UPDATE pra NUNCA sobrescrever dados já preenchidos
-- manualmente pelo usuário — só preenche se null.
--
-- Integrado ao auto_populate_case_params() — roda 1x no começo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.parse_universal_document_fields(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_text text;
  v_match text[];
  v_calculo_id uuid;
  v_cnj text; v_cpf text; v_cnpj text; v_pis text;
  v_nome_recl text; v_nome_recla text;
  v_adm date; v_dem date; v_nasc date;
  v_data_aj date;
  v_cargo text; v_vara text; v_tribunal text;
  v_dependentes int;
  v_extracted jsonb := '{}'::jsonb;
BEGIN
  SELECT id INTO v_calculo_id FROM pjecalc_calculos WHERE case_id = p_case_id LIMIT 1;
  IF v_calculo_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Calculo nao encontrado');
  END IF;

  SELECT string_agg(ocr_text, E'\n\n--- DOC BREAK ---\n\n')
  INTO v_text
  FROM documents
  WHERE case_id = p_case_id AND ocr_text IS NOT NULL AND LENGTH(ocr_text) > 50;

  IF v_text IS NULL THEN
    RETURN jsonb_build_object('warning', 'Nenhum documento com OCR');
  END IF;

  -- CNJ: NNNNNNN-NN.NNNN.N.NN.NNNN (tolerante a variações de separador)
  v_match := regexp_match(v_text, '(\d{7}[-\.]?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4})');
  IF v_match IS NOT NULL THEN
    v_cnj := v_match[1];
    v_extracted := v_extracted || jsonb_build_object('cnj', v_cnj);
  END IF;

  -- CPF
  v_match := regexp_match(v_text, '(?:CPF|CPT)[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})');
  IF v_match IS NULL THEN
    v_match := regexp_match(v_text, '\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b');
  END IF;
  IF v_match IS NOT NULL THEN
    v_cpf := regexp_replace(v_match[1], '[.\-]', '', 'g');
    IF LENGTH(v_cpf) = 11 THEN
      v_extracted := v_extracted || jsonb_build_object('cpf', v_cpf);
    END IF;
  END IF;

  -- CNPJ
  v_match := regexp_match(v_text, '(?:CNPJ|C\.N\.P\.J)[:\s\.]*(\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2})');
  IF v_match IS NOT NULL THEN
    v_cnpj := regexp_replace(v_match[1], '[.\-/]', '', 'g');
    IF LENGTH(v_cnpj) = 14 THEN
      v_extracted := v_extracted || jsonb_build_object('cnpj', v_cnpj);
    END IF;
  END IF;

  -- PIS/PASEP
  v_match := regexp_match(v_text, '(?:PIS|PASEP|PIS/PASEP|PASSP)[:\s/]*(\d{3}\.?\d{5}\.?\d{2}-?\d)');
  IF v_match IS NOT NULL THEN
    v_pis := regexp_replace(v_match[1], '[.\-]', '', 'g');
    v_extracted := v_extracted || jsonb_build_object('pis', v_pis);
  END IF;

  -- Nome reclamante
  v_match := regexp_match(v_text, '(?:Nome|Reclamante|Empregado|Autor)\s*[:\.]?\s*([A-ZÀ-ÚÇ][A-Za-zÀ-ÿçÇ\s]{8,60}?)(?:\s+(?:Matr|CPF|CTPS|PIS|Data|C\.R|CPT|Estabel|Est|$))');
  IF v_match IS NOT NULL THEN
    v_nome_recl := TRIM(v_match[1]);
    IF LENGTH(v_nome_recl) > 5 THEN
      v_extracted := v_extracted || jsonb_build_object('reclamante_nome', v_nome_recl);
    END IF;
  END IF;

  -- Razão social reclamada
  v_match := regexp_match(v_text, '(?:Estabelecimento|Empresa|Reclamada|Ré|Re)\s*[:\.]?\s*([A-Z][A-Za-zÀ-ÿ\s\.\/\-]+?(?:S/A|S\.A|SA|LTDA|ME|EIRELI))');
  IF v_match IS NOT NULL THEN
    v_nome_recla := TRIM(v_match[1]);
    IF LENGTH(v_nome_recla) > 5 THEN
      v_extracted := v_extracted || jsonb_build_object('reclamada_nome', v_nome_recla);
    END IF;
  END IF;

  -- Data admissão / demissão / nascimento / ajuizamento
  v_match := regexp_match(v_text, '(?:Admiss|ADMISS)[\.a-zA-Z]*\s*[:\.]?\s*(\d{2})/(\d{2})/(\d{4})');
  IF v_match IS NOT NULL THEN
    BEGIN v_adm := make_date(v_match[3]::int, v_match[2]::int, v_match[1]::int);
          v_extracted := v_extracted || jsonb_build_object('data_admissao', v_adm);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  v_match := regexp_match(v_text, '(?:Demiss|DEMISS|Desligamento)[\.a-zA-Z]*\s*[:\.]?\s*(\d{2})/(\d{2})/(\d{4})');
  IF v_match IS NOT NULL THEN
    BEGIN v_dem := make_date(v_match[3]::int, v_match[2]::int, v_match[1]::int);
          v_extracted := v_extracted || jsonb_build_object('data_demissao', v_dem);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  v_match := regexp_match(v_text, '(?:Nascimento|Dt\.?\s*Nasc\.?)\s*[:\.]?\s*(\d{2})/(\d{2})/(\d{4})');
  IF v_match IS NOT NULL THEN
    BEGIN v_nasc := make_date(v_match[3]::int, v_match[2]::int, v_match[1]::int);
          v_extracted := v_extracted || jsonb_build_object('data_nascimento', v_nasc);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  v_match := regexp_match(v_text, '(?:Ajuizamento|Distribui)\w*\s*[:\.]?\s*(\d{2})/(\d{2})/(\d{4})');
  IF v_match IS NOT NULL THEN
    BEGIN v_data_aj := make_date(v_match[3]::int, v_match[2]::int, v_match[1]::int);
          v_extracted := v_extracted || jsonb_build_object('data_ajuizamento', v_data_aj);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  -- Cargo
  v_match := regexp_match(v_text, '(?:CARGO|Cargo|Fun[\.a-z]{1,3}o|FUN[A-Z]{1,3}O|Ocupa[\.a-z]{1,3}o)\s*[:\.]?\s*([A-ZÀ-ÚÇ][A-Za-zÀ-ÿçÇ\s\-]{3,50}?)(?:\s+(?:DEP|FILH|C\.R|\||$))');
  IF v_match IS NOT NULL THEN
    v_cargo := TRIM(v_match[1]);
    IF LENGTH(v_cargo) > 3 THEN
      v_extracted := v_extracted || jsonb_build_object('cargo', v_cargo);
    END IF;
  END IF;

  -- Vara / Tribunal
  v_match := regexp_match(v_text, '(\d+[ªa]?\s+Vara\s+(?:do\s+Trabalho|Trabalhista|Civel|Federal)[^,\n\|]{0,60})');
  IF v_match IS NOT NULL THEN
    v_vara := TRIM(v_match[1]);
    v_extracted := v_extracted || jsonb_build_object('vara', v_vara);
  END IF;

  v_match := regexp_match(v_text, '\b(TRT[-\s]*\d{1,2}[ªa]?\s*Regi[\.a-z]{0,3}o)');
  IF v_match IS NOT NULL THEN
    v_tribunal := TRIM(v_match[1]);
    v_extracted := v_extracted || jsonb_build_object('tribunal', v_tribunal);
  END IF;

  -- Dependentes (contagem "Filho(a)" em CTPS)
  SELECT COUNT(*) INTO v_dependentes
  FROM regexp_matches(v_text, 'Filho\(a\)', 'gi') m;
  IF v_dependentes > 0 THEN
    v_extracted := v_extracted || jsonb_build_object('dependentes', v_dependentes);
  END IF;

  -- UPDATE com COALESCE (nunca sobrescreve)
  UPDATE pjecalc_calculos SET
    reclamante_nome = COALESCE(reclamante_nome, v_nome_recl),
    reclamante_cpf = COALESCE(reclamante_cpf, v_cpf),
    reclamado_nome = COALESCE(reclamado_nome, v_nome_recla),
    reclamado_cnpj = COALESCE(reclamado_cnpj, v_cnpj),
    data_admissao = COALESCE(data_admissao, v_adm),
    data_demissao = COALESCE(data_demissao, v_dem),
    data_ajuizamento = COALESCE(data_ajuizamento, v_data_aj),
    processo_cnj = COALESCE(processo_cnj, v_cnj),
    vara = COALESCE(vara, v_vara),
    tribunal = COALESCE(tribunal, v_tribunal),
    updated_at = now()
  WHERE id = v_calculo_id;

  RETURN v_extracted;
END;
$$;

COMMENT ON FUNCTION public.parse_universal_document_fields IS
  'Parser regex universal (CNJ, CPF, CNPJ, PIS, datas, cargo, vara, tribunal, nome reclamante/reclamada, dependentes) de QUALQUER documento OCR. UPDATE com COALESCE preserva dados existentes.';


-- Integra ao auto_populate_case_params: roda antes do reload de v_calc
-- para que admissão/demissão extraídos dos docs populem pjecalc_parametros.
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
  v_periodo_aq_ini date; v_periodo_aq_fim date;
  v_ferias_start date; v_ferias_end date;
  v_dia RECORD; v_inside_ferias boolean := false;
  v_ponto_ret RECORD; v_holerite_ret RECORD;
  v_universal_ret jsonb;
BEGIN
  SELECT * INTO v_calc FROM pjecalc_calculos WHERE case_id = p_case_id LIMIT 1;
  IF v_calc.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Calculo nao encontrado');
  END IF;
  v_calculo_id := v_calc.id;

  DELETE FROM pjecalc_faltas WHERE case_id = p_case_id AND motivo ILIKE '%cartão de ponto%';
  DELETE FROM pjecalc_ferias WHERE case_id = p_case_id;

  -- 0. Parser universal (CNJ, CPF, CNPJ, PIS, datas, cargo, vara)
  BEGIN
    v_universal_ret := public.parse_universal_document_fields(p_case_id);
    v_result := v_result || jsonb_build_object('campos_universais', v_universal_ret);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('universal_error', SQLERRM);
  END;

  -- Recarrega v_calc após universal parser
  SELECT * INTO v_calc FROM pjecalc_calculos WHERE id = v_calculo_id;

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

  -- 3. Holerite
  BEGIN
    SELECT * INTO v_holerite_ret FROM public.parse_holerite_from_ocr(p_case_id);
    v_result := v_result || jsonb_build_object(
      'holerite_rubricas', v_holerite_ret.rubricas_criadas,
      'holerite_valores', v_holerite_ret.valores_mensais
    );
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('holerite_error', SQLERRM);
  END;

  -- 4. Férias / licenças
  BEGIN
    FOR v_dia IN
      SELECT data, is_afastamento, LAG(data) OVER (ORDER BY data) AS prev_data
      FROM pjecalc_apuracao_diaria WHERE case_id = p_case_id ORDER BY data
    LOOP
      IF v_dia.is_afastamento AND NOT v_inside_ferias THEN
        v_ferias_start := v_dia.data; v_inside_ferias := true;
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
                   THEN 'Licenca detectada no cartao de ponto'
                   ELSE 'Ferias detectadas no cartao de ponto' END
            );
            v_ferias_count := v_ferias_count + 1;
          EXCEPTION WHEN OTHERS THEN NULL; END;
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
