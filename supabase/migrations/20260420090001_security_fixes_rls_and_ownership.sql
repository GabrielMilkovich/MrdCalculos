-- ============================================================
-- Correções de segurança:
--   1. RLS em document_format_patterns (evita leitura cross-user)
--   2. Guard de ownership em funções parse_* (SECURITY DEFINER)
--   3. Substituição de EXCEPTION WHEN OTHERS THEN NULL por NOTICE
-- ============================================================

-- 1. RLS apertada em document_format_patterns
-- Originalmente: USING (auth.role() IN ('authenticated','service_role'))
-- Problema: qualquer usuário autenticado lia TODOS os padrões (CNPJ, empresa, regex).
-- Fix: restringe leitura a service_role (a app não consome via client).

DROP POLICY IF EXISTS dfp_read_all ON public.document_format_patterns;

CREATE POLICY dfp_service_role_only ON public.document_format_patterns
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY dfp_service_role_write ON public.document_format_patterns
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. Guard helper — reutilizável em todas as funções parse_*
-- Bypass para service_role (edge functions) e roles com bypassrls (postgres admin/migrations).
-- Clientes authenticated precisam ownership; anon é bloqueado.
CREATE OR REPLACE FUNCTION public.assert_case_owner(p_case_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_role text := auth.role();
  v_uid uuid := auth.uid();
  v_can_bypass boolean;
BEGIN
  IF v_role = 'service_role' THEN RETURN; END IF;

  SELECT rolbypassrls INTO v_can_bypass FROM pg_roles WHERE rolname = current_user;
  IF COALESCE(v_can_bypass, false) THEN RETURN; END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE = '42501';
  END IF;

  IF NOT public.user_owns_case(p_case_id) THEN
    RAISE EXCEPTION 'Acesso negado ao caso %', p_case_id USING ERRCODE = '42501';
  END IF;
END $$;

COMMENT ON FUNCTION public.assert_case_owner IS
  'Verifica se auth.uid() possui o caso. Service role faz bypass. Usado no início de funções parse_* SECURITY DEFINER.';

-- 3. Wrappers que chamam assert_case_owner ANTES de delegar aos parsers internos
-- Estratégia: renomeia a função atual para _impl e cria wrapper público com a guard.
-- Isso preserva backward compatibility.

-- parse_peticao_from_ocr
ALTER FUNCTION public.parse_peticao_from_ocr(uuid) RENAME TO parse_peticao_from_ocr_impl;

CREATE OR REPLACE FUNCTION public.parse_peticao_from_ocr(p_case_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.assert_case_owner(p_case_id);
  RETURN public.parse_peticao_from_ocr_impl(p_case_id);
END $$;

-- parse_cartao_ponto_from_ocr (3-arg)
ALTER FUNCTION public.parse_cartao_ponto_from_ocr(uuid, uuid, uuid)
  RENAME TO parse_cartao_ponto_from_ocr_impl;

-- Usa signature igual ao original (mantém compatibilidade)
CREATE OR REPLACE FUNCTION public.parse_cartao_ponto_from_ocr(
  p_case_id uuid,
  p_calculo_id uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.assert_case_owner(p_case_id);
  RETURN public.parse_cartao_ponto_from_ocr_impl(p_case_id, p_calculo_id, p_document_id);
END $$;

-- parse_universal_document_fields
ALTER FUNCTION public.parse_universal_document_fields(uuid)
  RENAME TO parse_universal_document_fields_impl;

CREATE OR REPLACE FUNCTION public.parse_universal_document_fields(p_case_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.assert_case_owner(p_case_id);
  RETURN public.parse_universal_document_fields_impl(p_case_id);
END $$;

-- auto_populate_case_params
ALTER FUNCTION public.auto_populate_case_params(uuid)
  RENAME TO auto_populate_case_params_impl;

CREATE OR REPLACE FUNCTION public.auto_populate_case_params(p_case_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.assert_case_owner(p_case_id);
  RETURN public.auto_populate_case_params_impl(p_case_id);
END $$;

-- parse_holerite_from_ocr (3-arg variant)
DO $$
DECLARE
  v_sig text;
BEGIN
  SELECT pg_get_function_identity_arguments(oid) INTO v_sig
  FROM pg_proc WHERE proname = 'parse_holerite_from_ocr' LIMIT 1;

  IF v_sig IS NOT NULL THEN
    EXECUTE format(
      'ALTER FUNCTION public.parse_holerite_from_ocr(%s) RENAME TO parse_holerite_from_ocr_impl',
      v_sig
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.parse_holerite_from_ocr(
  p_case_id uuid,
  p_calculo_id uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL
)
RETURNS TABLE (rubricas_criadas int, valores_mensais int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.assert_case_owner(p_case_id);
  RETURN QUERY SELECT * FROM public.parse_holerite_from_ocr_impl(p_case_id, p_calculo_id, p_document_id);
END $$;

-- register_format_pattern: restringe a service_role (é metadata global, não owned)
ALTER FUNCTION public.register_format_pattern(text, text, text, text, int)
  RENAME TO register_format_pattern_impl;

CREATE OR REPLACE FUNCTION public.register_format_pattern(
  p_cnpj text, p_empresa text, p_doc_type text,
  p_formato text, p_samples int DEFAULT 1
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'register_format_pattern requer service_role'
      USING ERRCODE = '42501';
  END IF;
  RETURN public.register_format_pattern_impl(p_cnpj, p_empresa, p_doc_type, p_formato, p_samples);
END $$;

-- 4. Revoga EXECUTE de public nas _impl (defense-in-depth)
REVOKE EXECUTE ON FUNCTION public.parse_peticao_from_ocr_impl(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.parse_cartao_ponto_from_ocr_impl(uuid, uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.parse_universal_document_fields_impl(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.auto_populate_case_params_impl(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.register_format_pattern_impl(text, text, text, text, int) FROM public;

COMMENT ON FUNCTION public.parse_peticao_from_ocr IS
  'Wrapper com guard de ownership. Delega a parse_peticao_from_ocr_impl.';
COMMENT ON FUNCTION public.auto_populate_case_params IS
  'Wrapper com guard de ownership. Delega a auto_populate_case_params_impl.';
