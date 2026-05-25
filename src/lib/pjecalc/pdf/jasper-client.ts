import { supabase } from "@/integrations/supabase/client";

export interface JasperRenderOptions {
  template: string;
  params?: Record<string, unknown>;
  data: unknown;
}

export async function renderPdfViaJasper(
  opts: JasperRenderOptions,
): Promise<Blob> {
  const { data, error } = await supabase.functions.invoke("render-pdf", {
    body: opts,
  });

  if (error) {
    throw new Error(`render-pdf falhou: ${error.message}`);
  }

  if (data instanceof Blob) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new Blob([data], { type: "application/pdf" });
  }

  throw new Error(
    "render-pdf retornou formato inesperado: " + typeof data,
  );
}

export function isJasperEnabled(): boolean {
  return import.meta.env.VITE_USE_JASPER_RENDERER === "true";
}
