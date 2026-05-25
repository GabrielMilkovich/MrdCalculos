import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== SALÁRIO MÍNIMO NACIONAL ==========
const SALARIO_MINIMO = [
  { competencia: "2025-01-01", valor: 1518.00 },
  { competencia: "2024-01-01", valor: 1412.00 },
  { competencia: "2023-05-01", valor: 1320.00 },
  { competencia: "2023-01-01", valor: 1302.00 },
  { competencia: "2022-01-01", valor: 1212.00 },
  { competencia: "2021-01-01", valor: 1100.00 },
  { competencia: "2020-02-01", valor: 1045.00 },
  { competencia: "2020-01-01", valor: 1039.00 },
  { competencia: "2019-01-01", valor: 998.00 },
  { competencia: "2018-01-01", valor: 954.00 },
  { competencia: "2017-01-01", valor: 937.00 },
  { competencia: "2016-01-01", valor: 880.00 },
  { competencia: "2015-01-01", valor: 788.00 },
  { competencia: "2014-01-01", valor: 724.00 },
  { competencia: "2013-01-01", valor: 678.00 },
  { competencia: "2012-01-01", valor: 622.00 },
  { competencia: "2011-03-01", valor: 545.00 },
  { competencia: "2011-01-01", valor: 540.00 },
  { competencia: "2010-01-01", valor: 510.00 },
  { competencia: "2009-02-01", valor: 465.00 },
  { competencia: "2008-03-01", valor: 415.00 },
  { competencia: "2007-04-01", valor: 380.00 },
  { competencia: "2006-04-01", valor: 350.00 },
  { competencia: "2005-05-01", valor: 300.00 },
  { competencia: "2004-05-01", valor: 260.00 },
  { competencia: "2003-04-01", valor: 240.00 },
  { competencia: "2002-04-01", valor: 200.00 },
];

// ========== CONTRIBUIÇÃO SOCIAL (INSS) - 2025 Progressiva ==========
const CS_SEGURADO_2025 = [
  { competencia: "2025-01-01", tipo: "segurado_empregado", faixa: 1, valor_inicial: 0, valor_final: 1518.00, aliquota: 7.5, teto_maximo: 8157.41, teto_beneficio: 8157.41 },
  { competencia: "2025-01-01", tipo: "segurado_empregado", faixa: 2, valor_inicial: 1518.01, valor_final: 2793.88, aliquota: 9, teto_maximo: 8157.41, teto_beneficio: 8157.41 },
  { competencia: "2025-01-01", tipo: "segurado_empregado", faixa: 3, valor_inicial: 2793.89, valor_final: 4190.83, aliquota: 12, teto_maximo: 8157.41, teto_beneficio: 8157.41 },
  { competencia: "2025-01-01", tipo: "segurado_empregado", faixa: 4, valor_inicial: 4190.84, valor_final: 8157.41, aliquota: 14, teto_maximo: 8157.41, teto_beneficio: 8157.41 },
];

const CS_SEGURADO_2024 = [
  { competencia: "2024-01-01", tipo: "segurado_empregado", faixa: 1, valor_inicial: 0, valor_final: 1412.00, aliquota: 7.5, teto_maximo: 7786.02, teto_beneficio: 7786.02 },
  { competencia: "2024-01-01", tipo: "segurado_empregado", faixa: 2, valor_inicial: 1412.01, valor_final: 2666.68, aliquota: 9, teto_maximo: 7786.02, teto_beneficio: 7786.02 },
  { competencia: "2024-01-01", tipo: "segurado_empregado", faixa: 3, valor_inicial: 2666.69, valor_final: 4000.03, aliquota: 12, teto_maximo: 7786.02, teto_beneficio: 7786.02 },
  { competencia: "2024-01-01", tipo: "segurado_empregado", faixa: 4, valor_inicial: 4000.04, valor_final: 7786.02, aliquota: 14, teto_maximo: 7786.02, teto_beneficio: 7786.02 },
];

const CS_SEGURADO_2023 = [
  { competencia: "2023-05-01", tipo: "segurado_empregado", faixa: 1, valor_inicial: 0, valor_final: 1320.00, aliquota: 7.5, teto_maximo: 7507.49, teto_beneficio: 7507.49 },
  { competencia: "2023-05-01", tipo: "segurado_empregado", faixa: 2, valor_inicial: 1320.01, valor_final: 2571.29, aliquota: 9, teto_maximo: 7507.49, teto_beneficio: 7507.49 },
  { competencia: "2023-05-01", tipo: "segurado_empregado", faixa: 3, valor_inicial: 2571.30, valor_final: 3856.94, aliquota: 12, teto_maximo: 7507.49, teto_beneficio: 7507.49 },
  { competencia: "2023-05-01", tipo: "segurado_empregado", faixa: 4, valor_inicial: 3856.95, valor_final: 7507.49, aliquota: 14, teto_maximo: 7507.49, teto_beneficio: 7507.49 },
];

const CS_EMPREGADOR = [
  { competencia: "2025-01-01", tipo: "empregador_empresa", faixa: 1, valor_inicial: 0, valor_final: 999999999, aliquota: 20, teto_maximo: null, teto_beneficio: null },
  { competencia: "2025-01-01", tipo: "empregador_rat", faixa: 1, valor_inicial: 0, valor_final: 999999999, aliquota: 2, teto_maximo: null, teto_beneficio: null },
  { competencia: "2025-01-01", tipo: "empregador_terceiros", faixa: 1, valor_inicial: 0, valor_final: 999999999, aliquota: 5.8, teto_maximo: null, teto_beneficio: null },
];

// ========== IMPOSTO DE RENDA - Tabela Progressiva 2025 ==========
const IR_2025 = { competencia: "2025-01-01", deducao_dependente: 189.59, deducao_aposentado_65: 1903.98 };
const IR_2024 = { competencia: "2024-01-01", deducao_dependente: 189.59, deducao_aposentado_65: 1903.98 };

const IR_FAIXAS_2025 = [
  { competencia: "2025-01-01", faixa: 1, valor_inicial: 0, valor_final: 2259.20, aliquota: 0, deducao: 0 },
  { competencia: "2025-01-01", faixa: 2, valor_inicial: 2259.21, valor_final: 2826.65, aliquota: 7.5, deducao: 169.44 },
  { competencia: "2025-01-01", faixa: 3, valor_inicial: 2826.66, valor_final: 3751.05, aliquota: 15, deducao: 381.44 },
  { competencia: "2025-01-01", faixa: 4, valor_inicial: 3751.06, valor_final: 4664.68, aliquota: 22.5, deducao: 662.77 },
  { competencia: "2025-01-01", faixa: 5, valor_inicial: 4664.69, valor_final: 999999999, aliquota: 27.5, deducao: 896.00 },
];

const IR_FAIXAS_2024 = [
  { competencia: "2024-01-01", faixa: 1, valor_inicial: 0, valor_final: 2259.20, aliquota: 0, deducao: 0 },
  { competencia: "2024-01-01", faixa: 2, valor_inicial: 2259.21, valor_final: 2826.65, aliquota: 7.5, deducao: 169.44 },
  { competencia: "2024-01-01", faixa: 3, valor_inicial: 2826.66, valor_final: 3751.05, aliquota: 15, deducao: 381.44 },
  { competencia: "2024-01-01", faixa: 4, valor_inicial: 3751.06, valor_final: 4664.68, aliquota: 22.5, deducao: 662.77 },
  { competencia: "2024-01-01", faixa: 5, valor_inicial: 4664.69, valor_final: 999999999, aliquota: 27.5, deducao: 896.00 },
];

// ========== SALÁRIO-FAMÍLIA ==========
const SALARIO_FAMILIA = [
  { competencia: "2025-01-01", faixa: 1, valor_inicial: 0, valor_final: 1819.26, valor_cota: 62.04 },
  { competencia: "2024-01-01", faixa: 1, valor_inicial: 0, valor_final: 1819.26, valor_cota: 62.04 },
  { competencia: "2023-05-01", faixa: 1, valor_inicial: 0, valor_final: 1754.18, valor_cota: 59.82 },
  { competencia: "2022-01-01", faixa: 1, valor_inicial: 0, valor_final: 1655.98, valor_cota: 56.47 },
];

// ========== SEGURO-DESEMPREGO ==========
const SEGURO_DESEMPREGO_2025 = [
  { competencia: "2025-01-01", faixa: 1, valor_inicial: 0, valor_final: 2138.76, percentual: 80, valor_soma: 0, valor_piso: 1518.00, valor_teto: 2313.74 },
  { competencia: "2025-01-01", faixa: 2, valor_inicial: 2138.77, valor_final: 3564.96, percentual: 50, valor_soma: 1711.01, valor_piso: 1518.00, valor_teto: 2313.74 },
  { competencia: "2025-01-01", faixa: 3, valor_inicial: 3564.97, valor_final: 999999999, percentual: 0, valor_soma: 2313.74, valor_piso: 1518.00, valor_teto: 2313.74 },
];

// ========== CUSTAS JUDICIAIS ==========
const CUSTAS = [
  {
    vigencia_inicio: "2022-01-01", vigencia_fim: null,
    atos_oficiais_urbana: 18.62, atos_oficiais_rural: 37.24,
    agravo_instrumento: 44.26, agravo_peticao: 44.26,
    impugnacao_sentenca: 44.26, recurso_revista: 148.10,
    embargos_arrematacao: 44.26, embargos_execucao: 44.26,
    embargos_terceiros: 44.26, piso_custas_conhecimento: 10.64,
    teto_custas_liquidacao: 22474.36, teto_custas_autos: 4494.87,
  },
];

// ========== JUROS DE MORA ==========
const JUROS_MORA = [
  { competencia: "2025-01-01", tipo: "trabalhista", taxa_mensal: 1.0, acumulado: null },
  { competencia: "2024-01-01", tipo: "trabalhista", taxa_mensal: 1.0, acumulado: null },
  { competencia: "2023-01-01", tipo: "trabalhista", taxa_mensal: 1.0, acumulado: null },
];

// ========== FERIADOS NACIONAIS 2025 ==========
const FERIADOS_NACIONAIS_2025 = [
  { data: "2025-01-01", nome: "Confraternização Universal", tipo: "nacional" },
  { data: "2025-03-03", nome: "Carnaval", tipo: "nacional_facultativo" },
  { data: "2025-03-04", nome: "Carnaval", tipo: "nacional_facultativo" },
  { data: "2025-04-18", nome: "Sexta-feira Santa", tipo: "nacional" },
  { data: "2025-04-21", nome: "Tiradentes", tipo: "nacional" },
  { data: "2025-05-01", nome: "Dia do Trabalho", tipo: "nacional" },
  { data: "2025-06-19", nome: "Corpus Christi", tipo: "nacional_facultativo" },
  { data: "2025-09-07", nome: "Independência do Brasil", tipo: "nacional" },
  { data: "2025-10-12", nome: "Nossa Senhora Aparecida", tipo: "nacional" },
  { data: "2025-11-02", nome: "Finados", tipo: "nacional" },
  { data: "2025-11-15", nome: "Proclamação da República", tipo: "nacional" },
  { data: "2025-11-20", nome: "Dia da Consciência Negra", tipo: "nacional" },
  { data: "2025-12-25", nome: "Natal", tipo: "nacional" },
];

const FERIADOS_NACIONAIS_2024 = [
  { data: "2024-01-01", nome: "Confraternização Universal", tipo: "nacional" },
  { data: "2024-02-12", nome: "Carnaval", tipo: "nacional_facultativo" },
  { data: "2024-02-13", nome: "Carnaval", tipo: "nacional_facultativo" },
  { data: "2024-03-29", nome: "Sexta-feira Santa", tipo: "nacional" },
  { data: "2024-04-21", nome: "Tiradentes", tipo: "nacional" },
  { data: "2024-05-01", nome: "Dia do Trabalho", tipo: "nacional" },
  { data: "2024-05-30", nome: "Corpus Christi", tipo: "nacional_facultativo" },
  { data: "2024-09-07", nome: "Independência do Brasil", tipo: "nacional" },
  { data: "2024-10-12", nome: "Nossa Senhora Aparecida", tipo: "nacional" },
  { data: "2024-11-02", nome: "Finados", tipo: "nacional" },
  { data: "2024-11-15", nome: "Proclamação da República", tipo: "nacional" },
  { data: "2024-11-20", nome: "Dia da Consciência Negra", tipo: "nacional" },
  { data: "2024-12-25", nome: "Natal", tipo: "nacional" },
];

// ========== TRT → UF mapping ==========
const TRT_UFS: Record<string, string[]> = {
  TRT1: ["RJ"], TRT2: ["SP"], TRT3: ["MG"], TRT4: ["RS"], TRT5: ["BA"],
  TRT6: ["PE"], TRT7: ["CE"], TRT8: ["PA", "AP"], TRT9: ["PR"],
  TRT10: ["DF", "TO"], TRT11: ["AM", "RR"], TRT12: ["SC"], TRT13: ["PB"],
  TRT14: ["RO", "AC"], TRT15: ["SP"], TRT16: ["MA"], TRT17: ["ES"],
  TRT18: ["GO"], TRT19: ["AL"], TRT20: ["SE"], TRT21: ["RN"],
  TRT22: ["PI"], TRT23: ["MT"], TRT24: ["MS"],
};

// ========== FERIADOS ESTADUAIS por UF ==========
const FERIADOS_ESTADUAIS: Record<string, Array<{ data: string; nome: string }>> = {
  SP: [{ data: "2025-07-09", nome: "Revolução Constitucionalista" }],
  RJ: [{ data: "2025-04-23", nome: "São Jorge" }, { data: "2025-03-01", nome: "Aniversário do Rio" }],
  MG: [{ data: "2025-04-21", nome: "Data Magna de MG" }],
  RS: [{ data: "2025-09-20", nome: "Revolução Farroupilha" }],
  BA: [{ data: "2025-07-02", nome: "Independência da Bahia" }],
  PE: [{ data: "2025-03-06", nome: "Revolução Pernambucana" }],
  CE: [{ data: "2025-03-25", nome: "Data Magna do Ceará" }],
  PA: [{ data: "2025-08-15", nome: "Adesão do Pará" }],
  PR: [{ data: "2025-12-19", nome: "Emancipação do Paraná" }],
  DF: [{ data: "2025-04-21", nome: "Fundação de Brasília" }],
  TO: [{ data: "2025-10-05", nome: "Criação do Tocantins" }],
  AM: [{ data: "2025-09-05", nome: "Elevação do Amazonas" }],
  SC: [{ data: "2025-08-11", nome: "Criação de Santa Catarina" }],
  PB: [{ data: "2025-08-05", nome: "Fundação da Paraíba" }],
  RO: [{ data: "2025-01-04", nome: "Criação de Rondônia" }],
  AC: [{ data: "2025-01-23", nome: "Dia do Evangélico" }, { data: "2025-06-15", nome: "Aniversário do Acre" }],
  MA: [{ data: "2025-07-28", nome: "Adesão do Maranhão" }],
  ES: [{ data: "2025-10-28", nome: "Dia do Servidor Público" }],
  GO: [{ data: "2025-10-24", nome: "Pedra Fundamental de Goiânia" }],
  AL: [{ data: "2025-09-16", nome: "Emancipação de Alagoas" }],
  SE: [{ data: "2025-07-08", nome: "Emancipação de Sergipe" }],
  RN: [{ data: "2025-10-03", nome: "Mártires de Cunhaú e Uruaçu" }],
  PI: [{ data: "2025-10-19", nome: "Dia do Piauí" }],
  MT: [{ data: "2025-11-20", nome: "Consciência Negra" }],
  MS: [{ data: "2025-10-11", nome: "Criação de MS" }],
  AP: [{ data: "2025-10-05", nome: "Criação do Amapá" }],
  RR: [{ data: "2025-10-05", nome: "Criação de Roraima" }],
};

// ========== VERBAS PADRÃO PJe-Calc ==========
const VERBAS_PADRAO = [
  { nome: "Horas Extras 50%", tipo: "principal", valor_tipo: "calculado", caracteristica: "comum", ocorrencia_pagamento: "mensal", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: true },
  { nome: "Horas Extras 100%", tipo: "principal", valor_tipo: "calculado", caracteristica: "comum", ocorrencia_pagamento: "mensal", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: true },
  { nome: "RSR sobre Horas Extras", tipo: "reflexa", valor_tipo: "calculado", caracteristica: "comum", ocorrencia_pagamento: "mensal", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: true },
  { nome: "Adicional Noturno", tipo: "principal", valor_tipo: "calculado", caracteristica: "comum", ocorrencia_pagamento: "mensal", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: true },
  { nome: "Adicional de Insalubridade", tipo: "principal", valor_tipo: "calculado", caracteristica: "comum", ocorrencia_pagamento: "mensal", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: true },
  { nome: "Adicional de Periculosidade", tipo: "principal", valor_tipo: "calculado", caracteristica: "comum", ocorrencia_pagamento: "mensal", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: true },
  { nome: "Reflexo em 13º Salário", tipo: "reflexa", valor_tipo: "calculado", caracteristica: "13_salario", ocorrencia_pagamento: "anual", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: true },
  { nome: "Reflexo em Férias + 1/3", tipo: "reflexa", valor_tipo: "calculado", caracteristica: "ferias", ocorrencia_pagamento: "anual", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: false },
  { nome: "Reflexo em Aviso Prévio", tipo: "reflexa", valor_tipo: "calculado", caracteristica: "aviso_previo", ocorrencia_pagamento: "rescisao", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: true },
  { nome: "Diferenças Salariais", tipo: "principal", valor_tipo: "calculado", caracteristica: "comum", ocorrencia_pagamento: "mensal", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: true },
  { nome: "Intervalo Intrajornada", tipo: "principal", valor_tipo: "calculado", caracteristica: "comum", ocorrencia_pagamento: "mensal", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: true },
  { nome: "Saldo de Salário", tipo: "principal", valor_tipo: "calculado", caracteristica: "rescisao", ocorrencia_pagamento: "rescisao", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: true },
  { nome: "13º Salário Proporcional", tipo: "principal", valor_tipo: "calculado", caracteristica: "13_salario", ocorrencia_pagamento: "rescisao", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: true },
  { nome: "Férias Proporcionais + 1/3", tipo: "principal", valor_tipo: "calculado", caracteristica: "ferias", ocorrencia_pagamento: "rescisao", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: false },
  { nome: "Férias Vencidas + 1/3", tipo: "principal", valor_tipo: "calculado", caracteristica: "ferias", ocorrencia_pagamento: "rescisao", incidencia_fgts: true, incidencia_cs: true, incidencia_irpf: false },
  { nome: "Aviso Prévio Indenizado", tipo: "principal", valor_tipo: "calculado", caracteristica: "aviso_previo", ocorrencia_pagamento: "rescisao", incidencia_fgts: true, incidencia_cs: false, incidencia_irpf: false },
  { nome: "Multa Art. 467 CLT", tipo: "principal", valor_tipo: "calculado", caracteristica: "multa", ocorrencia_pagamento: "rescisao", incidencia_fgts: false, incidencia_cs: false, incidencia_irpf: false },
  { nome: "Multa Art. 477 CLT", tipo: "principal", valor_tipo: "calculado", caracteristica: "multa", ocorrencia_pagamento: "rescisao", incidencia_fgts: false, incidencia_cs: false, incidencia_irpf: false },
  { nome: "Indenização Art. 479 CLT", tipo: "principal", valor_tipo: "calculado", caracteristica: "indenizacao", ocorrencia_pagamento: "rescisao", incidencia_fgts: false, incidencia_cs: false, incidencia_irpf: false },
  { nome: "Dano Moral", tipo: "principal", valor_tipo: "informado", caracteristica: "indenizacao", ocorrencia_pagamento: "unica", incidencia_fgts: false, incidencia_cs: false, incidencia_irpf: false },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { trt } = await req.json();
    if (!trt || !TRT_UFS[trt]) {
      return new Response(JSON.stringify({ error: "TRT inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: Record<string, number> = {};

    // 1. Salário Mínimo
    const { data: smExisting } = await supabase.from("pjecalc_salario_minimo").select("competencia");
    const existingSM = new Set((smExisting || []).map((r: any) => r.competencia));
    const newSM = SALARIO_MINIMO.filter(r => !existingSM.has(r.competencia));
    if (newSM.length > 0) {
      const { error } = await supabase.from("pjecalc_salario_minimo").insert(newSM);
      if (!error) results["salario_minimo"] = newSM.length;
    } else {
      results["salario_minimo"] = 0;
    }

    // 2. Contribuição Social
    const allCS = [...CS_SEGURADO_2025, ...CS_SEGURADO_2024, ...CS_SEGURADO_2023, ...CS_EMPREGADOR];
    let csCount = 0;
    for (const rec of allCS) {
      const { error } = await supabase.from("pjecalc_contribuicao_social").upsert(rec, { onConflict: "competencia,tipo,faixa" });
      if (!error) csCount++;
    }
    results["contribuicao_social"] = csCount;

    // 3. Imposto de Renda
    let irfCount = 0;
    for (const ir of [IR_2025, IR_2024]) {
      const { data: irRow } = await supabase.from("pjecalc_imposto_renda").upsert(ir, { onConflict: "competencia" }).select("id").single();
      if (irRow) {
        const faixas = ir.competencia === "2025-01-01" ? IR_FAIXAS_2025 : IR_FAIXAS_2024;
        for (const f of faixas) {
          const { error } = await supabase.from("pjecalc_imposto_renda_faixas").upsert({
            ir_id: irRow.id,
            faixa: f.faixa,
            valor_inicial: f.valor_inicial,
            valor_final: f.valor_final,
            aliquota: f.aliquota,
            parcela_deduzir: f.deducao,
          }, { onConflict: "ir_id,faixa" });
          if (!error) irfCount++;
        }
      }
    }
    results["imposto_renda"] = irfCount;

    // 4. Salário-família
    let sfCount = 0;
    for (const rec of SALARIO_FAMILIA) {
      const { error } = await supabase.from("pjecalc_salario_familia").upsert(rec, { onConflict: "competencia,faixa" });
      if (!error) sfCount++;
    }
    results["salario_familia"] = sfCount;

    // 5. Seguro-desemprego
    let sdCount = 0;
    for (const rec of SEGURO_DESEMPREGO_2025) {
      const { error } = await supabase.from("pjecalc_seguro_desemprego").upsert(rec, { onConflict: "competencia,faixa" });
      if (!error) sdCount++;
    }
    results["seguro_desemprego"] = sdCount;

    // 6. Custas judiciais
    let cjCount = 0;
    for (const rec of CUSTAS) {
      const { error } = await supabase.from("pjecalc_custas_judiciais").upsert(rec, { onConflict: "vigencia_inicio" });
      if (!error) cjCount++;
    }
    results["custas_judiciais"] = cjCount;

    // 7. Juros de mora
    let jmCount = 0;
    for (const rec of JUROS_MORA) {
      const { error } = await supabase.from("pjecalc_juros_mora").upsert(rec, { onConflict: "competencia,tipo" });
      if (!error) jmCount++;
    }
    results["juros_mora"] = jmCount;

    // 8. Verbas padrão
    const { data: verbasExist } = await supabase.from("pjecalc_verbas_padrao").select("nome");
    const existingVerbas = new Set((verbasExist || []).map((r: any) => r.nome));
    const newVerbas = VERBAS_PADRAO.filter(v => !existingVerbas.has(v.nome));
    if (newVerbas.length > 0) {
      const { error } = await supabase.from("pjecalc_verbas_padrao").insert(newVerbas);
      if (!error) results["verbas"] = newVerbas.length;
    } else {
      results["verbas"] = 0;
    }

    // 9. Feriados (nacionais + estaduais do TRT)
    const ufs = TRT_UFS[trt];
    for (const ano of [2024, 2025]) {
      const feriados = ano === 2025 ? FERIADOS_NACIONAIS_2025 : FERIADOS_NACIONAIS_2024;
      
      for (const uf of ufs) {
        const estaduais = FERIADOS_ESTADUAIS[uf] || [];
        const allFeriados = [
          ...feriados,
          ...estaduais.map(f => ({ ...f, tipo: "estadual" })),
        ];

        await supabase.from("calendars").upsert({
          nome: `Calendário ${uf} ${ano}`,
          uf,
          ano,
          feriados: allFeriados,
          hash_versao: `auto-seed-${trt}-${ano}-${Date.now()}`,
          fonte: `PJe-Calc - ${trt}`,
          ativo: true,
        }, { onConflict: "uf,ano" });
      }
    }
    results["feriados"] = ufs.length * 2;

    const total = Object.values(results).reduce((a, b) => a + b, 0);

    return new Response(JSON.stringify({ 
      success: true, 
      trt,
      ufs,
      total_registros: total,
      detalhes: results 
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
