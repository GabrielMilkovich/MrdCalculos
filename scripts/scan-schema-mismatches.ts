/**
 * Schema mismatch scanner
 * Compares TypeScript types.ts expected columns against actual Supabase DB columns.
 * Outputs SQL migration to add missing columns.
 */
import fs from 'fs';

const typesPath = 'src/integrations/supabase/types.ts';
const src = fs.readFileSync(typesPath, 'utf8');

// Real DB columns (extracted from SQL query earlier)
const dbColumns: Record<string, string[]> = {
  cases: ['id','cliente','numero_processo','status','criado_por','criado_em','atualizado_em','tribunal','tags'],
  documents: ['id','case_id','tipo','arquivo_url','hash','uploaded_em','owner_user_id','file_name','mime_type','storage_path','status','page_count','ocr_confidence','error_message','updated_at','queue_priority','queued_at','processing_started_at','processing_completed_at','retry_count','max_retries','metadata','periodo_inicio','periodo_fim','competencia','hash_integridade','versao_documento','periodo_referencia_inicio','periodo_referencia_fim','ocr_confianca','validado','validado_em','validado_por'],
  parties: ['id','case_id','tipo','nome','documento','documento_tipo','contato','created_at','updated_at'],
  pjecalc_calculos: ['id','case_id','user_id','processo_cnj','vara','tribunal','instancia','fase','data_admissao','data_demissao','data_ajuizamento','data_citacao','data_inicio_calculo','data_fim_calculo','data_liquidacao','data_ultima_atualizacao','tipo_demissao','aviso_previo_tipo','aviso_previo_dias','projetar_aviso_indenizado','jornada_contratual_horas','divisor_horas','valor_ultima_remuneracao','valor_maior_remuneracao','regime_contrato','atualizacao_monetaria','indices_acumulados','ignorar_taxa_correcao_negativa','sabado_dia_util','prescricao_fgts','prescricao_quinquenal','data_prescricao_quinquenal','percentual_he_50','percentual_he_100','percentual_adicional_noturno','considera_feriado_nacional','considera_feriado_estadual','considera_feriado_municipal','uf','municipio_ibge','zera_valor_negativo','limitar_avos_periodo_calculo','dia_fechamento_mes','calculo_externo','status','ativo','validado','engine_version','hash_calculo','hash_atualizacao','titulo','observacoes','tags','ordem','created_at','updated_at','last_calculated_at'],
};

// Extract expected columns from types.ts
// Pattern: a table definition starts with "      tablename: {\n        Row: {"
const tableBlocks = src.matchAll(/^\s{6}(\w+):\s*\{\s*\n\s{8}Row:\s*\{\n([\s\S]*?)\n\s{8}\}/gm);
const expected: Record<string, string[]> = {};
for (const m of tableBlocks) {
  const tableName = m[1];
  const rowBody = m[2];
  const cols = [...rowBody.matchAll(/^\s+(\w+):\s/gm)].map(x => x[1]);
  if (cols.length > 0) expected[tableName] = cols;
}

console.log(`Parsed ${Object.keys(expected).length} tables from types.ts`);

// Compare
const missing: Record<string, string[]> = {};
for (const [table, dbCols] of Object.entries(dbColumns)) {
  const exp = expected[table];
  if (!exp) {
    console.log(`!! types.ts has no entry for table: ${table}`);
    continue;
  }
  const dbSet = new Set(dbCols);
  const miss = exp.filter(c => !dbSet.has(c));
  if (miss.length > 0) {
    missing[table] = miss;
  }
}

console.log('\n=== Mismatches (expected in types.ts but MISSING in DB) ===');
for (const [table, miss] of Object.entries(missing)) {
  console.log(`${table}: ${miss.join(', ')}`);
}

// Also check reverse: in DB but not in types
console.log('\n=== Reverse: in DB but MISSING in types.ts (non-blocking but worth knowing) ===');
for (const [table, dbCols] of Object.entries(dbColumns)) {
  const exp = expected[table];
  if (!exp) continue;
  const expSet = new Set(exp);
  const extra = dbCols.filter(c => !expSet.has(c));
  if (extra.length > 0) {
    console.log(`${table}: ${extra.join(', ')}`);
  }
}
