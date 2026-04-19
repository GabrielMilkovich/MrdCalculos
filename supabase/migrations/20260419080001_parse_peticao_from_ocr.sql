-- ============================================================
-- Parser de petição inicial / sentença / acordão
--
-- Extrai ÂNCORAS JURÍDICAS previsíveis via regex:
--   - Percentuais HE (50%, 70%, 100%)
--   - Adicionais (noturno, periculosidade, insalubridade)
--   - Multas CLT (art. 477, art. 467)
--   - Honorários sucumbenciais/contratuais (%)
--   - Índice de correção (IPCA-E, SELIC, TR, TAXA_LEGAL)
--   - Tipo de juros
--   - Data da citação
--   - Prescrição (quinquenal, trintenária FGTS)
--   - Tipo de demissão (sem/com justa causa, pedido, indireta)
--
-- Retorna JSONB com todos os campos encontrados.
-- UPDATE pjecalc_calculos com COALESCE para data_citacao e tipo_demissao.
-- Demais campos devem ser aplicados via UI ou RPC separada (pois a
-- estrutura das configs varia e pode conflitar com dados já preenchidos).
-- ============================================================

CREATE OR REPLACE FUNCTION public.parse_peticao_from_ocr(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_text text; v_match text[];
  v_calculo_id uuid;
  v_extracted jsonb := '{}'::jsonb;
  v_he_50 boolean := false;
  v_he_100 boolean := false;
  v_adic_noturno boolean := false;
  v_pericul_pct numeric; v_insalub_pct numeric;
  v_multa_477 boolean := false; v_multa_467 boolean := false;
  v_hon_suc_pct numeric; v_hon_cont_pct numeric;
  v_indice text; v_juros_tipo text;
  v_data_cit date;
  v_prescricao_5 boolean := false; v_prescricao_fgts boolean := false;
  v_tipo_demissao text;
BEGIN
  SELECT id INTO v_calculo_id FROM pjecalc_calculos WHERE case_id = p_case_id LIMIT 1;
  IF v_calculo_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Cálculo não encontrado');
  END IF;

  SELECT string_agg(ocr_text, E'\n---\n')
  INTO v_text
  FROM documents
  WHERE case_id = p_case_id
    AND ocr_text IS NOT NULL AND LENGTH(ocr_text) > 200
    AND (tipo IN ('peticao', 'sentenca', 'acordao', 'decisao', 'outro')
         OR file_name ILIKE '%peti%' OR file_name ILIKE '%senten%'
         OR file_name ILIKE '%acord%' OR file_name ILIKE '%decisao%'
         OR file_name ILIKE '%inicial%');

  IF v_text IS NULL THEN
    RETURN jsonb_build_object('warning', 'Nenhuma petição/sentença/acordão encontrado');
  END IF;

  -- HE percentuais
  IF v_text ~* '(hora|hr)s?\s*extras?\s*(a|com|de)\s*50\s*%' THEN v_he_50 := true; END IF;
  IF v_text ~* '(hora|hr)s?\s*extras?\s*(a|com|de)\s*(100|70)\s*%' THEN v_he_100 := true; END IF;
  IF v_text ~* 'adicional\s+noturn[oa]' THEN v_adic_noturno := true; END IF;

  -- Adicionais
  v_match := regexp_match(v_text, 'pericul[o]?sidade\s+(?:de\s+)?(\d{1,2})\s*%', 'i');
  IF v_match IS NOT NULL THEN v_pericul_pct := v_match[1]::numeric;
  ELSIF v_text ~* 'pericul[o]?sidade' THEN v_pericul_pct := 30; END IF;

  v_match := regexp_match(v_text, 'insalubridade\s+(?:de\s+|em\s+)?(?:grau\s+\w+\s+)?(\d{1,2})\s*%', 'i');
  IF v_match IS NOT NULL THEN v_insalub_pct := v_match[1]::numeric;
  ELSIF v_text ~* 'insalubridade' THEN v_insalub_pct := 40; END IF;

  -- Multas CLT
  IF v_text ~* 'multa.{0,30}art\.?\s*477' OR v_text ~* '§\s*8.{0,20}477' THEN v_multa_477 := true; END IF;
  IF v_text ~* 'multa.{0,30}art\.?\s*467' OR v_text ~* 'parcelas\s+incontroversas' THEN v_multa_467 := true; END IF;

  -- Honorários
  v_match := regexp_match(v_text, 'honor.rios\s+(?:de\s+)?sucumb.ncia\w*\s+(?:de\s+)?(\d{1,2})\s*%', 'i');
  IF v_match IS NOT NULL THEN v_hon_suc_pct := v_match[1]::numeric;
  ELSE
    v_match := regexp_match(v_text, 'condeno.*honor.rios.*(\d{1,2})\s*%', 'i');
    IF v_match IS NOT NULL THEN v_hon_suc_pct := v_match[1]::numeric; END IF;
  END IF;

  v_match := regexp_match(v_text, 'honor.rios\s+contratua\w+\s+(?:de\s+)?(\d{1,2})\s*%', 'i');
  IF v_match IS NOT NULL THEN v_hon_cont_pct := v_match[1]::numeric; END IF;

  -- Índice
  IF v_text ~* 'IPCA[-\s]?E' THEN v_indice := 'IPCA-E';
  ELSIF v_text ~* '\bSELIC\b' THEN v_indice := 'SELIC';
  ELSIF v_text ~* '\bTR\b(?!T)' THEN v_indice := 'TR';
  ELSIF v_text ~* 'taxa\s+legal|lei\s+14\.?905' THEN v_indice := 'TAXA_LEGAL';
  END IF;

  -- Juros
  IF v_text ~* 'SELIC' AND v_text ~* 'juros' THEN v_juros_tipo := 'selic';
  ELSIF v_text ~* '(taxa\s+legal|lei\s+14\.?905)' THEN v_juros_tipo := 'taxa_legal';
  ELSIF v_text ~* 'TR\s*\+\s*1\s*%|1\s*%\s*(ao|a\.)\s*m.s' THEN v_juros_tipo := 'tr_1_porcento';
  END IF;

  -- Citação
  v_match := regexp_match(v_text, '(?:cita[cç][aã]o|citad[ao])\s*(?:em|no\s+dia|:)\s*(\d{2})/(\d{2})/(\d{4})', 'i');
  IF v_match IS NOT NULL THEN
    BEGIN v_data_cit := make_date(v_match[3]::int, v_match[2]::int, v_match[1]::int);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  -- Prescrição
  IF v_text ~* 'prescri[cç][aã]o\s+quinquenal' THEN v_prescricao_5 := true; END IF;
  IF v_text ~* 'prescri[cç][aã]o\s+trint[eê]naria' OR v_text ~* 'FGTS.{0,30}trint[eê]n' THEN
    v_prescricao_fgts := true;
  END IF;

  -- Tipo demissão
  IF v_text ~* 'sem\s+justa\s+causa' OR v_text ~* 'dispensa\s+imotivada' THEN
    v_tipo_demissao := 'sem_justa_causa';
  ELSIF v_text ~* 'com\s+justa\s+causa' THEN
    v_tipo_demissao := 'com_justa_causa';
  ELSIF v_text ~* 'pedido\s+de\s+demiss' THEN
    v_tipo_demissao := 'pedido_demissao';
  ELSIF v_text ~* 'rescis.o\s+indireta' THEN
    v_tipo_demissao := 'rescisao_indireta';
  END IF;

  v_extracted := jsonb_build_object(
    'he_50', v_he_50, 'he_100', v_he_100, 'adicional_noturno', v_adic_noturno,
    'periculosidade_pct', v_pericul_pct, 'insalubridade_pct', v_insalub_pct,
    'multa_477', v_multa_477, 'multa_467', v_multa_467,
    'honorarios_sucumbenciais_pct', v_hon_suc_pct,
    'honorarios_contratuais_pct', v_hon_cont_pct,
    'indice_correcao', v_indice, 'juros_tipo', v_juros_tipo,
    'data_citacao', v_data_cit,
    'prescricao_quinquenal', v_prescricao_5,
    'prescricao_fgts_trintenaria', v_prescricao_fgts,
    'tipo_demissao', v_tipo_demissao
  );

  UPDATE pjecalc_calculos SET
    data_citacao = COALESCE(data_citacao, v_data_cit),
    tipo_demissao = COALESCE(tipo_demissao, v_tipo_demissao),
    updated_at = now()
  WHERE id = v_calculo_id;

  RETURN v_extracted;
END;
$$;

COMMENT ON FUNCTION public.parse_peticao_from_ocr IS
  'Parser regex de petição/sentença/acordão: extrai âncoras jurídicas (HE, multas, honorários, índice, juros, citação, prescrição, tipo demissão). Retorna JSONB.';
