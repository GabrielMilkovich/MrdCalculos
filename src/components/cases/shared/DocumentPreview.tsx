/**
 * DocumentPreview — preview compartilhado de PDF/imagem do storage.
 *
 * Extraído do DocumentOcrValidation para ser reusado tanto na sub-etapa
 * OCR quanto na sub-etapa Extração do modo data_extraction.
 *
 * Lógica idêntica à versão original:
 *   - Tenta gerar signed URL fresca de 2 buckets (juriscalculo-documents
 *     primeiro, fallback case-documents).
 *   - Cai no arquivo_url salvo se nenhum bucket funcionar.
 *   - Renderiza <img> para imagens e <object>/<iframe> para PDFs.
 */
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  storagePath: string | null;
  arquivoUrl?: string | null;
  mimeType: string | null;
  fileName: string | null;
  /** className extra para o container externo. Default: min-h-[500px] flex flex-col border rounded-md */
  className?: string;
}

async function getFreshSignedUrl(storagePath: string): Promise<string | null> {
  for (const bucket of ["juriscalculo-documents", "case-documents"]) {
    // TTL 15min — URL deve durar só o suficiente pra renderizar o preview.
    const { data } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 900);
    if (data?.signedUrl) return data.signedUrl;
  }
  return null;
}

export function DocumentPreview({
  storagePath,
  arquivoUrl,
  mimeType,
  fileName,
  className,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (storagePath) {
        const fresh = await getFreshSignedUrl(storagePath);
        if (!cancelled) setUrl(fresh ?? arquivoUrl ?? null);
      } else {
        setUrl(arquivoUrl ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storagePath, arquivoUrl]);

  return (
    <div className={className ?? "flex flex-col border rounded-md min-h-[500px]"}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          Documento original
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline text-muted-foreground hover:text-foreground"
          >
            Nova aba
          </a>
        )}
      </div>
      <div className="flex-1 bg-muted/20 flex items-center justify-center overflow-hidden">
        {!url ? (
          <span className="text-sm text-muted-foreground">URL indisponível.</span>
        ) : mimeType?.startsWith("image/") ? (
          <img
            src={url}
            alt={fileName || ""}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <object data={url} type="application/pdf" className="w-full h-full">
            <iframe
              src={url}
              title={fileName || "preview"}
              className="w-full h-full border-0"
            />
          </object>
        )}
      </div>
    </div>
  );
}
