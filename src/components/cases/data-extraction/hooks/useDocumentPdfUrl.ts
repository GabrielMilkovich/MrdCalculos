import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useDocumentPdfUrl(documentId: string | undefined, open: boolean) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !documentId) {
      setPdfUrl(null);
      return;
    }
    let cancelado = false;
    (async () => {
      const { data: doc } = await supabase
        .from('documents')
        .select('storage_path')
        .eq('id', documentId)
        .single();
      const path = doc?.storage_path;
      if (!path) return;
      for (const bucket of ['juriscalculo-documents', 'case-documents']) {
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 900);
        if (!cancelado && data?.signedUrl) {
          setPdfUrl(data.signedUrl);
          return;
        }
      }
    })().catch(() => {});
    return () => { cancelado = true; };
  }, [open, documentId]);

  return pdfUrl;
}
