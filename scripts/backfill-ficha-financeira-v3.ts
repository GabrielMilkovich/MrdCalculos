/**
 * Backfill: re-parseia documentos ficha_financeira existentes com parser V3.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-ficha-financeira-v3.ts
 *
 * O que faz:
 *   1. Busca docs com parsed_by contendo 'ficha_financeira' e ocr_text não-null
 *   2. Re-roda parseFichaFinanceiraDeterministico sobre ocr_text
 *   3. Atualiza parsed JSONB com resultado V3 (cutoff + ontologia V2)
 *
 * Sem dependência Mistral/Claude. Custo zero. ~16ms por documento.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Dynamic import pra evitar problemas com Deno-only imports no parser
  const { parseFichaFinanceiraDeterministico } = await import(
    '../supabase/functions/_shared/parsers/ficha-financeira-deterministic'
  );

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, file_name, ocr_text, parsed_by')
    .or('parsed_by.ilike.%ficha_financeira%,tipo.eq.ficha_financeira')
    .not('ocr_text', 'is', null);

  if (error) {
    console.error('Erro ao buscar docs:', error.message);
    process.exit(1);
  }

  console.log(`Encontrados ${docs?.length ?? 0} documentos para backfill.`);

  let atualizados = 0;
  let erros = 0;

  for (const doc of docs ?? []) {
    if (!doc.ocr_text || doc.ocr_text.length < 200) {
      console.log(`  SKIP ${doc.id} (${doc.file_name}): ocr_text muito curto`);
      continue;
    }

    const resultado = parseFichaFinanceiraDeterministico(doc.ocr_text);
    if (!resultado) {
      console.log(`  SKIP ${doc.id} (${doc.file_name}): parser retornou null`);
      continue;
    }

    const { error: updErr } = await supabase
      .from('documents')
      .update({
        parsed: resultado,
        parsed_by: 'ficha_financeira_via_varejo_v1',
        updated_at: new Date().toISOString(),
      })
      .eq('id', doc.id);

    if (updErr) {
      console.error(`  ERRO ${doc.id}: ${updErr.message}`);
      erros++;
    } else {
      console.log(`  OK ${doc.id} (${doc.file_name}): ${resultado.rubricas.length} rubricas V3`);
      atualizados++;
    }
  }

  console.log(`\nBackfill completo: ${atualizados} atualizados, ${erros} erros.`);
}

main().catch(console.error);
