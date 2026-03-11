/**
 * seed-reference-tables
 * Seeds INSS, IR, and salário-mínimo historical tables
 * POST /seed-reference-tables { tables: ['inss','ir','salario_minimo','seguro_desemprego','salario_familia'] }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// INSS Progressive Brackets (2015-2025)
// =====================================================
const INSS_FAIXAS: Array<{ competencia_inicio: string; competencia_fim: string | null; faixa: number; valor_ate: number; aliquota: number }> = [
  // 2015-2017 (3 faixas)
  { competencia_inicio: '2015-01', competencia_fim: '2015-12', faixa: 1, valor_ate: 1399.12, aliquota: 8 },
  { competencia_inicio: '2015-01', competencia_fim: '2015-12', faixa: 2, valor_ate: 2331.88, aliquota: 9 },
  { competencia_inicio: '2015-01', competencia_fim: '2015-12', faixa: 3, valor_ate: 4663.75, aliquota: 11 },
  { competencia_inicio: '2016-01', competencia_fim: '2016-12', faixa: 1, valor_ate: 1556.94, aliquota: 8 },
  { competencia_inicio: '2016-01', competencia_fim: '2016-12', faixa: 2, valor_ate: 2594.92, aliquota: 9 },
  { competencia_inicio: '2016-01', competencia_fim: '2016-12', faixa: 3, valor_ate: 5189.82, aliquota: 11 },
  { competencia_inicio: '2017-01', competencia_fim: '2017-12', faixa: 1, valor_ate: 1659.38, aliquota: 8 },
  { competencia_inicio: '2017-01', competencia_fim: '2017-12', faixa: 2, valor_ate: 2765.66, aliquota: 9 },
  { competencia_inicio: '2017-01', competencia_fim: '2017-12', faixa: 3, valor_ate: 5531.31, aliquota: 11 },
  { competencia_inicio: '2018-01', competencia_fim: '2018-12', faixa: 1, valor_ate: 1693.72, aliquota: 8 },
  { competencia_inicio: '2018-01', competencia_fim: '2018-12', faixa: 2, valor_ate: 2822.90, aliquota: 9 },
  { competencia_inicio: '2018-01', competencia_fim: '2018-12', faixa: 3, valor_ate: 5645.80, aliquota: 11 },
  { competencia_inicio: '2019-01', competencia_fim: '2019-12', faixa: 1, valor_ate: 1751.81, aliquota: 8 },
  { competencia_inicio: '2019-01', competencia_fim: '2019-12', faixa: 2, valor_ate: 2919.72, aliquota: 9 },
  { competencia_inicio: '2019-01', competencia_fim: '2019-12', faixa: 3, valor_ate: 5839.45, aliquota: 11 },
  // 2020+ (4 faixas progressivas — Reforma Previdenciária)
  { competencia_inicio: '2020-01', competencia_fim: '2020-02', faixa: 1, valor_ate: 1830.29, aliquota: 8 },
  { competencia_inicio: '2020-01', competencia_fim: '2020-02', faixa: 2, valor_ate: 3050.52, aliquota: 9 },
  { competencia_inicio: '2020-01', competencia_fim: '2020-02', faixa: 3, valor_ate: 6101.06, aliquota: 11 },
  { competencia_inicio: '2020-03', competencia_fim: '2020-12', faixa: 1, valor_ate: 1045.00, aliquota: 7.5 },
  { competencia_inicio: '2020-03', competencia_fim: '2020-12', faixa: 2, valor_ate: 2089.60, aliquota: 9 },
  { competencia_inicio: '2020-03', competencia_fim: '2020-12', faixa: 3, valor_ate: 3134.40, aliquota: 12 },
  { competencia_inicio: '2020-03', competencia_fim: '2020-12', faixa: 4, valor_ate: 6101.06, aliquota: 14 },
  { competencia_inicio: '2021-01', competencia_fim: '2021-12', faixa: 1, valor_ate: 1100.00, aliquota: 7.5 },
  { competencia_inicio: '2021-01', competencia_fim: '2021-12', faixa: 2, valor_ate: 2203.48, aliquota: 9 },
  { competencia_inicio: '2021-01', competencia_fim: '2021-12', faixa: 3, valor_ate: 3305.22, aliquota: 12 },
  { competencia_inicio: '2021-01', competencia_fim: '2021-12', faixa: 4, valor_ate: 6433.57, aliquota: 14 },
  { competencia_inicio: '2022-01', competencia_fim: '2022-12', faixa: 1, valor_ate: 1212.00, aliquota: 7.5 },
  { competencia_inicio: '2022-01', competencia_fim: '2022-12', faixa: 2, valor_ate: 2427.35, aliquota: 9 },
  { competencia_inicio: '2022-01', competencia_fim: '2022-12', faixa: 3, valor_ate: 3641.03, aliquota: 12 },
  { competencia_inicio: '2022-01', competencia_fim: '2022-12', faixa: 4, valor_ate: 7087.22, aliquota: 14 },
  { competencia_inicio: '2023-01', competencia_fim: '2023-12', faixa: 1, valor_ate: 1320.00, aliquota: 7.5 },
  { competencia_inicio: '2023-01', competencia_fim: '2023-12', faixa: 2, valor_ate: 2571.29, aliquota: 9 },
  { competencia_inicio: '2023-01', competencia_fim: '2023-12', faixa: 3, valor_ate: 3856.94, aliquota: 12 },
  { competencia_inicio: '2023-01', competencia_fim: '2023-12', faixa: 4, valor_ate: 7507.49, aliquota: 14 },
  { competencia_inicio: '2024-01', competencia_fim: '2024-12', faixa: 1, valor_ate: 1412.00, aliquota: 7.5 },
  { competencia_inicio: '2024-01', competencia_fim: '2024-12', faixa: 2, valor_ate: 2666.68, aliquota: 9 },
  { competencia_inicio: '2024-01', competencia_fim: '2024-12', faixa: 3, valor_ate: 4000.03, aliquota: 12 },
  { competencia_inicio: '2024-01', competencia_fim: '2024-12', faixa: 4, valor_ate: 7786.02, aliquota: 14 },
  { competencia_inicio: '2025-01', competencia_fim: null, faixa: 1, valor_ate: 1518.00, aliquota: 7.5 },
  { competencia_inicio: '2025-01', competencia_fim: null, faixa: 2, valor_ate: 2793.88, aliquota: 9 },
  { competencia_inicio: '2025-01', competencia_fim: null, faixa: 3, valor_ate: 4190.83, aliquota: 12 },
  { competencia_inicio: '2025-01', competencia_fim: null, faixa: 4, valor_ate: 8157.41, aliquota: 14 },
];

// =====================================================
// IR Brackets (2015-2025)
// =====================================================
const IR_FAIXAS: Array<{ competencia_inicio: string; competencia_fim: string | null; faixa: number; valor_ate: number; aliquota: number; deducao: number; deducao_dependente: number }> = [
  // 2015-2022 (same brackets frozen)
  ...[2015,2016,2017,2018,2019,2020,2021,2022].flatMap(ano => [
    { competencia_inicio: `${ano}-01`, competencia_fim: `${ano}-12`, faixa: 1, valor_ate: 1903.98, aliquota: 0, deducao: 0, deducao_dependente: 189.59 },
    { competencia_inicio: `${ano}-01`, competencia_fim: `${ano}-12`, faixa: 2, valor_ate: 2826.65, aliquota: 7.5, deducao: 142.80, deducao_dependente: 189.59 },
    { competencia_inicio: `${ano}-01`, competencia_fim: `${ano}-12`, faixa: 3, valor_ate: 3751.05, aliquota: 15, deducao: 354.80, deducao_dependente: 189.59 },
    { competencia_inicio: `${ano}-01`, competencia_fim: `${ano}-12`, faixa: 4, valor_ate: 4664.68, aliquota: 22.5, deducao: 636.13, deducao_dependente: 189.59 },
    { competencia_inicio: `${ano}-01`, competencia_fim: `${ano}-12`, faixa: 5, valor_ate: 999999.99, aliquota: 27.5, deducao: 869.36, deducao_dependente: 189.59 },
  ]),
  // 2023
  { competencia_inicio: '2023-01', competencia_fim: '2023-04', faixa: 1, valor_ate: 1903.98, aliquota: 0, deducao: 0, deducao_dependente: 189.59 },
  { competencia_inicio: '2023-01', competencia_fim: '2023-04', faixa: 2, valor_ate: 2826.65, aliquota: 7.5, deducao: 142.80, deducao_dependente: 189.59 },
  { competencia_inicio: '2023-01', competencia_fim: '2023-04', faixa: 3, valor_ate: 3751.05, aliquota: 15, deducao: 354.80, deducao_dependente: 189.59 },
  { competencia_inicio: '2023-01', competencia_fim: '2023-04', faixa: 4, valor_ate: 4664.68, aliquota: 22.5, deducao: 636.13, deducao_dependente: 189.59 },
  { competencia_inicio: '2023-01', competencia_fim: '2023-04', faixa: 5, valor_ate: 999999.99, aliquota: 27.5, deducao: 869.36, deducao_dependente: 189.59 },
  // 2023 May+ (new brackets)
  { competencia_inicio: '2023-05', competencia_fim: '2023-12', faixa: 1, valor_ate: 2112.00, aliquota: 0, deducao: 0, deducao_dependente: 189.59 },
  { competencia_inicio: '2023-05', competencia_fim: '2023-12', faixa: 2, valor_ate: 2826.65, aliquota: 7.5, deducao: 158.40, deducao_dependente: 189.59 },
  { competencia_inicio: '2023-05', competencia_fim: '2023-12', faixa: 3, valor_ate: 3751.05, aliquota: 15, deducao: 370.40, deducao_dependente: 189.59 },
  { competencia_inicio: '2023-05', competencia_fim: '2023-12', faixa: 4, valor_ate: 4664.68, aliquota: 22.5, deducao: 651.73, deducao_dependente: 189.59 },
  { competencia_inicio: '2023-05', competencia_fim: '2023-12', faixa: 5, valor_ate: 999999.99, aliquota: 27.5, deducao: 884.96, deducao_dependente: 189.59 },
  // 2024
  { competencia_inicio: '2024-01', competencia_fim: '2024-12', faixa: 1, valor_ate: 2259.20, aliquota: 0, deducao: 0, deducao_dependente: 189.59 },
  { competencia_inicio: '2024-01', competencia_fim: '2024-12', faixa: 2, valor_ate: 2826.65, aliquota: 7.5, deducao: 169.44, deducao_dependente: 189.59 },
  { competencia_inicio: '2024-01', competencia_fim: '2024-12', faixa: 3, valor_ate: 3751.05, aliquota: 15, deducao: 381.44, deducao_dependente: 189.59 },
  { competencia_inicio: '2024-01', competencia_fim: '2024-12', faixa: 4, valor_ate: 4664.68, aliquota: 22.5, deducao: 662.77, deducao_dependente: 189.59 },
  { competencia_inicio: '2024-01', competencia_fim: '2024-12', faixa: 5, valor_ate: 999999.99, aliquota: 27.5, deducao: 896.00, deducao_dependente: 189.59 },
  // 2025
  { competencia_inicio: '2025-01', competencia_fim: null, faixa: 1, valor_ate: 2428.80, aliquota: 0, deducao: 0, deducao_dependente: 189.59 },
  { competencia_inicio: '2025-01', competencia_fim: null, faixa: 2, valor_ate: 2826.65, aliquota: 7.5, deducao: 182.16, deducao_dependente: 189.59 },
  { competencia_inicio: '2025-01', competencia_fim: null, faixa: 3, valor_ate: 3751.05, aliquota: 15, deducao: 394.16, deducao_dependente: 189.59 },
  { competencia_inicio: '2025-01', competencia_fim: null, faixa: 4, valor_ate: 4664.68, aliquota: 22.5, deducao: 675.49, deducao_dependente: 189.59 },
  { competencia_inicio: '2025-01', competencia_fim: null, faixa: 5, valor_ate: 999999.99, aliquota: 27.5, deducao: 908.73, deducao_dependente: 189.59 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const tables = body.tables || ['inss', 'ir'];
    const results: Record<string, { inserted: number; errors: string[] }> = {};

    if (tables.includes('inss')) {
      // Upsert INSS faixas
      const { error } = await supabase
        .from('pjecalc_inss_faixas')
        .upsert(INSS_FAIXAS, { onConflict: 'competencia_inicio,faixa' });
      results.inss = { inserted: INSS_FAIXAS.length, errors: error ? [error.message] : [] };
    }

    if (tables.includes('ir')) {
      // Upsert IR faixas
      const { error } = await supabase
        .from('pjecalc_ir_faixas')
        .upsert(IR_FAIXAS, { onConflict: 'competencia_inicio,faixa' });
      results.ir = { inserted: IR_FAIXAS.length, errors: error ? [error.message] : [] };
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
