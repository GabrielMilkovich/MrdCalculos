-- ============================================================
-- Parsers UNIVERSAIS multi-sistema para cobertura global
--
-- Holerite: ADP, TOTVS/Protheus, SAP, Sênior, DATASUL, Fortes,
--           Folhamatic, eSocial + formato livre
-- Cartão de ponto: Casas Bahia, Via Varejo, TOTVS, SAP, Sênior,
--                  eSocial, PAT + formato livre
-- ============================================================

-- HOLERITE UNIVERSAL
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
  v_matched_format text;
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
           OR file_name ILIKE '%contracheque%' OR file_name ILIKE '%holerite%'
           OR file_name ILIKE '%recibo%' OR file_name ILIKE '%demonstrativo%')
      AND ocr_text IS NOT NULL AND LENGTH(ocr_text) > 100
      AND (p_document_id IS NULL OR id = p_document_id)
  ) LOOP
    v_text := v_doc.ocr_text;
    v_competencia := NULL;

    FOR v_line IN SELECT unnest(string_to_array(v_text, E'\n')) LOOP
      v_matched_format := NULL;

      -- Competência múltiplos padrões
      v_match := regexp_match(v_line, '(?:REFER.NCIA|COMPET.NCIA|MES[/\s]REF)[^|0-9]*\|?\s*(\w{3})/(\d{4})');
      IF v_match IS NULL THEN v_match := regexp_match(v_line, '\|\s*(\w{3})/(\d{4})\s*\|'); END IF;
      IF v_match IS NULL THEN
        v_match := regexp_match(v_line, '(?:Compet[eê\.]ncia|Per.odo|M.s.Ref)[:\s\.]+(\d{2})/(\d{4})');
        IF v_match IS NOT NULL THEN
          BEGIN v_ano := v_match[2]::int; v_mes := v_match[1]::int;
                IF v_mes BETWEEN 1 AND 12 THEN v_competencia := make_date(v_ano, v_mes, 1); END IF;
          EXCEPTION WHEN OTHERS THEN NULL; END;
          CONTINUE;
        END IF;
      END IF;
      IF v_match IS NOT NULL THEN
        v_mes := public.parse_month_abbrev(v_match[1]);
        IF v_mes IS NOT NULL THEN
          v_ano := v_match[2]::int;
          v_competencia := make_date(v_ano, v_mes, 1);
        ELSIF v_match[1] ~ '^\d{1,2}$' THEN
          v_mes := v_match[1]::int; v_ano := v_match[2]::int;
          IF v_mes BETWEEN 1 AND 12 THEN v_competencia := make_date(v_ano, v_mes, 1); END IF;
        END IF;
      END IF;

      IF v_competencia IS NULL THEN CONTINUE; END IF;

      v_codigo := NULL; v_desc := NULL; v_venc := NULL; v_desc_val := NULL;

      -- Formato A: ADP (4 cols markdown)
      v_match := regexp_match(v_line,
        '\|\s*(\d{3,5})\s+(.+?)\s*\|\s*([\d\.,]*)\s*\|\s*([\d\.,]*)\s*\|\s*([\d\.,]*)\s*\|');
      IF v_match IS NOT NULL THEN
        v_codigo := TRIM(v_match[1]); v_desc := TRIM(v_match[2]);
        v_venc := public.parse_brl_number(v_match[4]);
        v_desc_val := public.parse_brl_number(v_match[5]);
        v_matched_format := 'ADP';
      END IF;

      -- Formato B: TOTVS (3 cols)
      IF v_codigo IS NULL THEN
        v_match := regexp_match(v_line,
          '\|\s*(\d{3,5})\s*\|\s*([A-Za-zÀ-ÿ][^|]{2,50}?)\s*\|\s*([\d\.,]+)\s*\|');
        IF v_match IS NOT NULL THEN
          v_codigo := TRIM(v_match[1]); v_desc := TRIM(v_match[2]);
          v_venc := public.parse_brl_number(v_match[3]);
          v_matched_format := 'TOTVS';
        END IF;
      END IF;

      -- Formato C: SAP/Sênior/DATASUL (sem pipe, espaços)
      IF v_codigo IS NULL THEN
        v_match := regexp_match(v_line,
          '^\s*(\d{3,5})\s{2,}([A-Za-zÀ-ÿ][A-Za-zÀ-ÿçÇ0-9\s\.\-\/\(\)]{2,50}?)\s{2,}([\d]{1,3}(?:\.\d{3})*(?:,\d{2}))\s*$');
        IF v_match IS NOT NULL THEN
          v_codigo := TRIM(v_match[1]); v_desc := TRIM(v_match[2]);
          v_venc := public.parse_brl_number(v_match[3]);
          v_matched_format := 'SAP_SENIOR';
        END IF;
      END IF;

      -- Formato D: Folhamatic/Fortes (5 cols)
      IF v_codigo IS NULL THEN
        v_match := regexp_match(v_line,
          '\|\s*(\d{3,5})\s*\|\s*([A-Za-zÀ-ÿ][^|]{2,50}?)\s*\|\s*([\d\.,]*)\s*\|\s*([\d\.,]*)\s*\|\s*([\d\.,]*)\s*\|');
        IF v_match IS NOT NULL THEN
          v_codigo := TRIM(v_match[1]); v_desc := TRIM(v_match[2]);
          v_venc := public.parse_brl_number(v_match[4]);
          v_desc_val := public.parse_brl_number(v_match[5]);
          v_matched_format := 'FOLHAMATIC';
        END IF;
      END IF;

      IF v_codigo IS NULL OR v_desc IS NULL THEN CONTINUE; END IF;
      IF v_desc ILIKE '%BASE%' OR v_desc ILIKE '%TOTAIS%' OR v_desc ILIKE '---%'
         OR v_desc ILIKE '%DESCRI%O%' OR v_desc ~ '^-+$' THEN CONTINUE; END IF;

      v_valor := COALESCE(v_venc, -COALESCE(v_desc_val, 0));
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
          format('Categoria: %s | Código: %s | Formato: %s', v_categoria, v_codigo, v_matched_format)
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


-- Learning System: tabela de padrões por empresa
CREATE TABLE IF NOT EXISTS public.document_format_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text,
  empresa_nome text,
  doc_type text NOT NULL,
  formato_detectado text NOT NULL,
  regex_pattern text,
  rubrica_mappings jsonb DEFAULT '{}'::jsonb,
  samples_count int DEFAULT 0,
  confidence numeric DEFAULT 0.8,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cnpj, doc_type, formato_detectado)
);

CREATE INDEX IF NOT EXISTS idx_dfp_cnpj_type ON public.document_format_patterns (cnpj, doc_type);

ALTER TABLE public.document_format_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dfp_read_all ON public.document_format_patterns;
CREATE POLICY dfp_read_all ON public.document_format_patterns
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE OR REPLACE FUNCTION public.register_format_pattern(
  p_cnpj text, p_empresa text, p_doc_type text,
  p_formato text, p_samples int DEFAULT 1
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO document_format_patterns (cnpj, empresa_nome, doc_type, formato_detectado, samples_count, last_used_at)
  VALUES (p_cnpj, p_empresa, p_doc_type, p_formato, p_samples, now())
  ON CONFLICT (cnpj, doc_type, formato_detectado) DO UPDATE SET
    empresa_nome = COALESCE(EXCLUDED.empresa_nome, document_format_patterns.empresa_nome),
    samples_count = document_format_patterns.samples_count + EXCLUDED.samples_count,
    last_used_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
