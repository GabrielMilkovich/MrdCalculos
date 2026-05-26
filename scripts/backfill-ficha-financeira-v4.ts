#!/usr/bin/env -S npx tsx
/**
 * Re-processa docs ficha_financeira via edge function parse-ficha-financeira V4.
 * Usa storage_path (pdfjs_geometric) em vez de texto_documento (Mistral).
 *
 * Uso:
 *   DRY_RUN=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-ficha-financeira-v4.ts
 *   DOC_ID=<uuid> npx tsx scripts/backfill-ficha-financeira-v4.ts
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';
const DOC_ID = process.env.DOC_ID;
const FORCE = process.env.FORCE === '1';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const PARSE_URL = `${SUPABASE_URL}/functions/v1/parse-ficha-financeira`;

async function main() {
  let query = supabase
    .from('documents')
    .select('id, file_name, storage_path, parsed, parsed_by')
    .or('tipo.eq.ficha_financeira,parsed_by.ilike.%ficha%');

  if (DOC_ID) query = query.eq('id', DOC_ID);

  const { data: docs, error } = await query;
  if (error) { console.error('Erro:', error.message); process.exit(1); }

  console.log(`[backfill v4] ${docs?.length ?? 0} doc(s)${DRY_RUN ? ' (DRY_RUN)' : ''}`);

  let ok = 0, pulado = 0, erro = 0;

  for (const doc of docs ?? []) {
    const parserAtual = (doc.parsed as Record<string, unknown>)?._meta as Record<string, unknown>;
    const parserStr = (parserAtual?.parser as string) ?? '';
    if (!FORCE && parserStr.includes('v4')) {
      console.log(`  [pulo] ${doc.id}: já é v4`);
      pulado++;
      continue;
    }

    if (!doc.storage_path) {
      console.log(`  [pulo] ${doc.id}: sem storage_path`);
      pulado++;
      continue;
    }

    try {
      const resp = await fetch(PARSE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storage_path: doc.storage_path,
          storage_bucket: 'case-documents',
          tipo_documento: 'ficha_financeira',
        }),
      });

      if (!resp.ok) {
        throw new Error(`Edge function ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
      }

      const novo = await resp.json();
      const nRub = novo.rubricas?.length ?? 0;
      const nNao = novo.rubricas?.filter((r: Record<string, unknown>) => r.categoria === 'NAO_CLASSIFICADO').length ?? 0;
      console.log(`  [ok]   ${doc.id} (${doc.file_name}): ${nRub} rubricas, ${nNao} não-class, ocr=${novo.ocr_provider}`);

      if (!DRY_RUN) {
        await supabase.from('documents').update({
          parsed: novo,
          ocr_provider: novo.ocr_provider,
          parsed_by: 'parse-ficha-financeira',
          updated_at: new Date().toISOString(),
        }).eq('id', doc.id);
      }
      ok++;
    } catch (e) {
      console.error(`  [err]  ${doc.id}:`, e instanceof Error ? e.message : e);
      erro++;
    }
  }

  console.log(`\nResumo: ${ok} ok, ${pulado} pulado, ${erro} erro / ${(docs ?? []).length} total`);
}

main().catch(console.error);
