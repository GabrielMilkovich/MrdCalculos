-- ============================================================
-- documents.case_id: FK para cases.id
--
-- Sem essa FK, o PostgREST nao resolve joins embutidos como
--   .select("*, cases!inner(criado_por)")
-- e retorna 404 "Documento nao encontrado" na edge function
-- `ocr-document` (e em outras que fazem o mesmo join).
--
-- ON DELETE CASCADE: ao apagar um case, os documents sao apagados
-- juntos (comportamento esperado pelo dominio — documento sem caso
-- nao faz sentido e ja vem assim da logica de exclusao na UI).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documents_case_id_fkey'
      AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_case_id_fkey
      FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
