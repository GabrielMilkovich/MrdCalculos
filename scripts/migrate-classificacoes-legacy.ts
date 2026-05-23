// scripts/migrate-classificacoes-legacy.ts
//
// Migra `documents.metadata.classificacoes_manuais_holerite` (escopo por-doc,
// usado antes da Sprint 3c) para `rubrica_aliases_tentativa` (escopo por-case).
//
// NÃO É EXECUTADO automaticamente. Está aqui pronto pra rodar no commit 4
// (após Sprint 3c em prod sem regressão). Sequência do commit 4:
//   1. Rodar este script (executa migration de dados)
//   2. Remover shim de leitura legacy do `useClassificacoesTentativa`
//   3. Deletar chave `classificacoes_manuais_holerite` do JSONB de documents
//
// USO:
//   npx tsx scripts/migrate-classificacoes-legacy.ts --dry-run    (default)
//   npx tsx scripts/migrate-classificacoes-legacy.ts --apply      (escreve)
//
// Pré-requisito: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no ambiente.
// Service role necessário pra contornar RLS (script roda como sistema).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no env.',
  );
  process.exit(1);
}

const DRY_RUN = !process.argv.includes('--apply');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Normalize 1:1 com mapper V2 + gerador do seed.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Categorias V1 → V2 rename. Espelha CATEGORIA_V1_TO_V2 do código TS.
const CATEGORIA_V1_TO_V2: Record<string, string> = {
  COMISSAO_PRODUTOS: 'COMISSOES_PRODUTOS',
  COMISSAO_SERVICOS: 'COMISSOES_SERVICOS',
  PREMIO: 'PREMIOS',
  DSR_PAGO: 'DSR_S_COMISSOES',
  DESCONSIDERAR: 'DESCONSIDERADAS',
};

// Regras por categoria — espelha categoria_rules do overrides + seed.
const CATEGORIA_RULES: Record<
  string,
  { tipo_pjecalc: string; base_dsr: boolean; base_13: boolean; base_ferias: boolean; incluido: boolean }
> = {
  MINIMO_GARANTIDO: { tipo_pjecalc: 'SALARIO', base_dsr: false, base_13: true, base_ferias: true, incluido: true },
  SALARIO_SUBSTITUICAO: { tipo_pjecalc: 'SALARIO_SUBSTITUICAO', base_dsr: false, base_13: true, base_ferias: true, incluido: true },
  COMISSOES_PRODUTOS: { tipo_pjecalc: 'COMISSAO', base_dsr: true, base_13: true, base_ferias: true, incluido: true },
  COMISSOES_SERVICOS: { tipo_pjecalc: 'COMISSAO', base_dsr: true, base_13: true, base_ferias: true, incluido: true },
  DSR_S_COMISSOES: { tipo_pjecalc: 'DSR', base_dsr: false, base_13: true, base_ferias: true, incluido: true },
  PREMIOS: { tipo_pjecalc: 'PREMIO', base_dsr: true, base_13: true, base_ferias: true, incluido: true },
  DESCONSIDERADAS: { tipo_pjecalc: 'DESCONSIDERAR', base_dsr: false, base_13: false, base_ferias: false, incluido: false },
};

interface DocRow {
  id: string;
  case_id: string | null;
  criado_por: string | null;
  metadata: Record<string, unknown> | null;
}

async function main() {
  console.log(
    `Migration de classificacoes_manuais_holerite → rubrica_aliases_tentativa`,
  );
  console.log(`Modo: ${DRY_RUN ? 'DRY RUN (sem escrita)' : 'APPLY (escrevendo)'}\n`);

  // Lê todos documents com a chave legacy populada
  const { data: docs, error: errDocs } = await supabase
    .from('documents')
    .select('id, case_id, criado_por, metadata')
    .not('metadata->classificacoes_manuais_holerite', 'is', null);

  if (errDocs) {
    console.error(`Erro lendo documents: ${errDocs.message}`);
    process.exit(1);
  }
  if (!docs || docs.length === 0) {
    console.log('Nenhum document com chave legacy. Nada a migrar.');
    return;
  }

  console.log(`Encontrados ${docs.length} documents com chave legacy.\n`);

  let totalRubricas = 0;
  let totalUpserts = 0;
  const skipped: Array<{ doc_id: string; reason: string }> = [];

  for (const doc of docs as DocRow[]) {
    if (!doc.case_id) {
      skipped.push({ doc_id: doc.id, reason: 'sem case_id' });
      continue;
    }
    if (!doc.criado_por) {
      skipped.push({ doc_id: doc.id, reason: 'sem criado_por' });
      continue;
    }
    const meta = doc.metadata as Record<string, unknown> | null;
    const previas = (meta?.classificacoes_manuais_holerite ?? null) as
      | Record<string, string>
      | null;
    if (!previas || typeof previas !== 'object') continue;

    for (const [nomeOriginal, catRaw] of Object.entries(previas)) {
      const catV2 = CATEGORIA_V1_TO_V2[catRaw] ?? catRaw;
      const regras = CATEGORIA_RULES[catV2];
      if (!regras) {
        skipped.push({
          doc_id: doc.id,
          reason: `categoria desconhecida '${catRaw}' para '${nomeOriginal}'`,
        });
        continue;
      }
      totalRubricas += 1;
      const row = {
        case_id: doc.case_id,
        normalized_key: normalize(nomeOriginal),
        alias_original: nomeOriginal,
        categoria: catV2,
        tipo_pjecalc: regras.tipo_pjecalc,
        base_dsr: regras.base_dsr,
        base_13: regras.base_13,
        base_ferias: regras.base_ferias,
        incluido: regras.incluido,
        criado_por: doc.criado_por,
        updated_at: new Date().toISOString(),
      };

      if (DRY_RUN) {
        console.log(
          `  [dry] case=${doc.case_id.slice(0, 8)} '${nomeOriginal}' → ${catV2}`,
        );
        continue;
      }

      const { error: errUp } = await supabase
        .from('rubrica_aliases_tentativa')
        .upsert(row, { onConflict: 'case_id,normalized_key' });
      if (errUp) {
        skipped.push({
          doc_id: doc.id,
          reason: `upsert falhou ${nomeOriginal}: ${errUp.message}`,
        });
      } else {
        totalUpserts += 1;
      }
    }
  }

  console.log(`\nResultado:`);
  console.log(`  ${totalRubricas} rubricas processadas`);
  if (!DRY_RUN) {
    console.log(`  ${totalUpserts} UPSERTs em rubrica_aliases_tentativa`);
  }
  if (skipped.length > 0) {
    console.log(`  ${skipped.length} pulados:`);
    for (const s of skipped.slice(0, 20)) {
      console.log(`    - doc ${s.doc_id.slice(0, 8)}: ${s.reason}`);
    }
    if (skipped.length > 20) {
      console.log(`    ... e mais ${skipped.length - 20}`);
    }
  }
  console.log(
    DRY_RUN
      ? '\n💡 Rode com --apply para executar a migração.'
      : '\n✅ Migração concluída. Próximo passo (commit 4): remover shim de leitura + deletar chave JSONB.',
  );
}

main().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
