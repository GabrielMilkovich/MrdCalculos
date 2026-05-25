import { encode as base64Encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const PDF_MAX_BYTES = 30 * 1024 * 1024;
const SIGNED_URL_EXPIRY = 300;

export async function baixarPdfBase64(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<{ base64: string; bytes: Uint8Array } | null> {
  const buckets = ["juriscalculo-documents", "documents"];
  let signedUrl: string | null = null;
  for (const bucket of buckets) {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(storagePath, SIGNED_URL_EXPIRY);
    if (data?.signedUrl) {
      signedUrl = data.signedUrl;
      break;
    }
  }
  if (!signedUrl) return null;

  const resp = await fetch(signedUrl);
  if (!resp.ok) return null;

  const bytes = new Uint8Array(await resp.arrayBuffer());
  if (bytes.length > PDF_MAX_BYTES) return null;

  return { base64: base64Encode(bytes), bytes };
}

export async function extrairTextoDoPdf(bytes: Uint8Array): Promise<string> {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(bytes);
    const textParts: string[] = [];
    const streamMatches = raw.match(/\(((?:[^()\\]|\\[()\\nrtbf])*)\)/g);
    if (streamMatches) {
      for (const m of streamMatches) {
        const inner = m.slice(1, -1)
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\");
        if (inner.length > 2 && /[a-zA-ZÀ-úÇç0-9]/.test(inner)) {
          textParts.push(inner);
        }
      }
    }
    return textParts.join(" ");
  } catch {
    return "";
  }
}
