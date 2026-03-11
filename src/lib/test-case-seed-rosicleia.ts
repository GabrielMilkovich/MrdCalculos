/**
 * Seed: Caso Rosicleia Pereira Chaves vs Grupo Casas Bahia S.A. (Via Varejo)
 * Comissionista pura — dados extraídos da CTPS e contracheques reais
 * Admissão: 06/06/2018 | Demissão: 04/07/2024 (sem justa causa)
 * Local: Belo Horizonte, MG
 */
import { supabase } from "@/integrations/supabase/client";

const PROCESSO = "ROSICLEIA-SEED-001";

export async function deleteCasoRosicleia(): Promise<void> {
  const { data } = await supabase.from("cases").select("id").eq("cliente", "Rosicleia Pereira Chaves");
  if (data) {
    for (const c of data) {
      await supabase.from("cases").delete().eq("id", c.id);
    }
  }
}

export async function seedCasoRosicleia(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada");

  await deleteCasoRosicleia();

  // 1. Case
  const { data: c, error: cErr } = await supabase.from("cases").insert({
    cliente: "Rosicleia Pereira Chaves",
    numero_processo: PROCESSO,
    tribunal: "TRT 3ª Região",
    status: "em_analise",
    criado_por: user.id,
    tags: ["comissionista", "via_varejo", "caso_real"],
  }).select("id").single();
  if (cErr || !c) throw new Error("Erro ao criar caso: " + cErr?.message);
  const caseId = (c as any).id;

  try {
    // 2. Employment contract
    await supabase.from("employment_contracts" as any).insert({
      case_id: caseId,
      data_admissao: "2018-06-06",
      data_demissao: "2024-07-04",
      funcao: "Vendedor Interno",
      salario_inicial: 0,
      tipo_demissao: "sem_justa_causa" as any,
      jornada_contratual: { horas_semanais: 44, divisor: 220 },
      local_trabalho: "Belo Horizonte, MG",
    });

    // 3. Facts
    const facts = [
      { chave: "data_admissao", valor: "2018-06-06", tipo: "data" as any },
      { chave: "data_demissao", valor: "2024-07-04", tipo: "data" as any },
      { chave: "salario_base", valor: "comissionista_pura", tipo: "texto" as any },
      { chave: "cargo", valor: "VENDEDOR INTERNO", tipo: "texto" as any },
      { chave: "cnpj_empregador", valor: "33.041.260/0501-88", tipo: "texto" as any },
      { chave: "razao_social_empregador", valor: "Grupo Casas Bahia S.A.", tipo: "texto" as any },
      { chave: "nome_empregado", valor: "ROSICLEIA PEREIRA CHAVES", tipo: "texto" as any },
      { chave: "cpf_empregado", valor: "100.233.396-24", tipo: "texto" as any },
      { chave: "local_trabalho", valor: "Belo Horizonte, MG", tipo: "texto" as any },
      { chave: "uf", valor: "MG", tipo: "texto" as any },
      { chave: "municipio", valor: "Belo Horizonte", tipo: "texto" as any },
      { chave: "pis_pasep", valor: "16538936807", tipo: "texto" as any },
      { chave: "tipo_rescisao", valor: "sem_justa_causa", tipo: "texto" as any },
      { chave: "aviso_previo_projetado", valor: "2024-08-21", tipo: "data" as any },
    ];
    await supabase.from("facts" as any).insert(
      facts.map(f => ({
        case_id: caseId, ...f,
        origem: "manual" as any, confirmado: true,
        confirmado_por: user.id, confirmado_em: new Date().toISOString(), confianca: 1.0,
      }))
    );

    // 4. Parâmetros
    const paramsPayload = {
      case_id: caseId,
      data_admissao: "2018-06-06",
      data_demissao: "2024-07-04",
      data_ajuizamento: "2024-08-21",
      data_inicial: "2019-08-21",
      data_final: "2024-07-04",
      carga_horaria_padrao: 220,
      sabado_dia_util: true,
      projetar_aviso_indenizado: true,
      limitar_avos_periodo: false,
      zerar_valor_negativo: false,
      prescricao_quinquenal: true,
      prescricao_fgts: false,
      estado: "MG",
      municipio: "Belo Horizonte",
      prazo_aviso_previo: "indenizado",
      prazo_aviso_dias: "48",
      regime_trabalho: "tempo_integral",
      ultima_remuneracao: 1700,
      maior_remuneracao: 3500,
    };

    const { data: existingParams } = await supabase
      .from("pjecalc_parametros" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existingParams) {
      await supabase.from("pjecalc_parametros" as any).update(paramsPayload).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_parametros" as any).insert(paramsPayload);
    }

    await new Promise(r => setTimeout(r, 500));

    const { data: calculoRow } = await supabase
      .from("pjecalc_calculos").select("id").eq("case_id", caseId).maybeSingle();
    const calculoId = (calculoRow as any)?.id;

    // 5. Histórico Salarial — rubricas reais extraídas dos contracheques
    const historicoRubricas = [
      { nome: "COMISSÕES", tipo_valor: "VARIAVEL", valor_informado: 500, incidencia_fgts: true, incidencia_cs: true },
      { nome: "COM.SERV.TECNICOS", tipo_valor: "VARIAVEL", valor_informado: 40, incidencia_fgts: true, incidencia_cs: true },
      { nome: "COMISSÃO SEGUROS", tipo_valor: "VARIAVEL", valor_informado: 30, incidencia_fgts: true, incidencia_cs: true },
      { nome: "COMISSÃO FRETE", tipo_valor: "VARIAVEL", valor_informado: 5, incidencia_fgts: true, incidencia_cs: true },
      { nome: "COMISSÕES PRODUTOS ONLINE", tipo_valor: "VARIAVEL", valor_informado: 200, incidencia_fgts: true, incidencia_cs: true },
      { nome: "COMISSÕES SERVIÇOS ONLINE", tipo_valor: "VARIAVEL", valor_informado: 50, incidencia_fgts: true, incidencia_cs: true },
      { nome: "DSR COMISSÃO", tipo_valor: "VARIAVEL", valor_informado: 200, incidencia_fgts: true, incidencia_cs: true },
      { nome: "PRÊMIO MENSAL VENDAS", tipo_valor: "VARIAVEL", valor_informado: 200, incidencia_fgts: true, incidencia_cs: true },
      { nome: "INT. PRÊMIO NO DSR", tipo_valor: "VARIAVEL", valor_informado: 40, incidencia_fgts: true, incidencia_cs: true },
      { nome: "MÍNIMO GARANTIDO COMISS.", tipo_valor: "VARIAVEL", valor_informado: 800, incidencia_fgts: true, incidencia_cs: true },
      { nome: "COMISSÃO ANTECIPADA", tipo_valor: "VARIAVEL", valor_informado: 600, incidencia_fgts: true, incidencia_cs: true },
      { nome: "COMISSÃO GARANTIA", tipo_valor: "VARIAVEL", valor_informado: 50, incidencia_fgts: true, incidencia_cs: true },
    ];

    const histIds: string[] = [];

    for (const rub of historicoRubricas) {
      const insertPayload: any = {
        case_id: caseId,
        nome: rub.nome,
        tipo_valor: rub.tipo_valor,
        valor_informado: rub.valor_informado,
        incidencia_fgts: rub.incidencia_fgts,
        incidencia_cs: rub.incidencia_cs,
        periodo_inicio: "2018-06-06",
        periodo_fim: "2024-07-04",
      };
      if (calculoId) insertPayload.calculo_id = calculoId;

      const { data: histInserted, error: histErr } = await supabase
        .from("pjecalc_historico_salarial" as any)
        .insert(insertPayload)
        .select("id")
        .single();

      if (histErr || !histInserted) {
        console.warn(`Erro hist_salarial ${rub.nome}:`, histErr?.message);
        continue;
      }
      histIds.push((histInserted as any).id);

      // Monthly occurrences with realistic variation
      if (calculoId) {
        const ocorrencias: any[] = [];
        const cur = new Date(2018, 5, 1); // June 2018
        const end = new Date(2024, 6, 1); // July 2024
        while (cur <= end) {
          const comp = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
          const variation = 0.3 + Math.random() * 1.4;
          let valor = Math.round(rub.valor_informado * variation * 100) / 100;

          // Licença maternidade: jan-jul 2023 → zero comissões
          const isMaternidade = cur >= new Date(2023, 0, 16) && cur <= new Date(2023, 6, 14);
          if (isMaternidade && rub.nome !== "MÍNIMO GARANTIDO COMISS.") {
            valor = 0;
          }

          // Mínimo garantido only when commissions are low
          if (rub.nome === "MÍNIMO GARANTIDO COMISS.") {
            valor = Math.random() > 0.6 ? Math.round(rub.valor_informado * variation * 100) / 100 : 0;
          }

          ocorrencias.push({
            calculo_id: calculoId,
            hist_salarial_id: (histInserted as any).id,
            competencia: comp,
            valor,
            origem: "seed",
          });
          cur.setMonth(cur.getMonth() + 1);
        }
        for (let i = 0; i < ocorrencias.length; i += 50) {
          await supabase.from("pjecalc_hist_salarial_mes" as any).insert(ocorrencias.slice(i, i + 50));
        }
      }
    }

    // 6. Férias (dados reais da CTPS)
    await supabase.from("pjecalc_ferias" as any).insert([
      { case_id: caseId, calculo_id: calculoId, periodo_aquisitivo_inicio: "2018-06-06", periodo_aquisitivo_fim: "2019-06-05", periodo_concessivo_inicio: "2019-06-06", periodo_concessivo_fim: "2020-06-05", situacao: "gozadas", dias: 30, gozo_inicio: "2019-12-02", gozo_fim: "2019-12-31" },
      { case_id: caseId, calculo_id: calculoId, periodo_aquisitivo_inicio: "2019-06-06", periodo_aquisitivo_fim: "2020-06-05", periodo_concessivo_inicio: "2020-06-06", periodo_concessivo_fim: "2021-06-05", situacao: "gozadas", dias: 30, gozo_inicio: "2020-09-10", gozo_fim: "2020-10-09" },
      { case_id: caseId, calculo_id: calculoId, periodo_aquisitivo_inicio: "2020-06-06", periodo_aquisitivo_fim: "2021-06-05", periodo_concessivo_inicio: "2021-06-06", periodo_concessivo_fim: "2022-06-05", situacao: "gozadas", dias: 30, gozo_inicio: "2021-06-07", gozo_fim: "2021-07-06" },
      { case_id: caseId, calculo_id: calculoId, periodo_aquisitivo_inicio: "2021-06-06", periodo_aquisitivo_fim: "2022-06-05", periodo_concessivo_inicio: "2022-06-06", periodo_concessivo_fim: "2023-06-05", situacao: "gozadas", dias: 30, gozo_inicio: "2022-06-06", gozo_fim: "2022-07-05" },
      { case_id: caseId, calculo_id: calculoId, periodo_aquisitivo_inicio: "2022-06-06", periodo_aquisitivo_fim: "2023-06-05", periodo_concessivo_inicio: "2023-06-06", periodo_concessivo_fim: "2024-06-05", situacao: "gozadas", dias: 30, gozo_inicio: "2023-07-17", gozo_fim: "2023-08-15" },
      { case_id: caseId, calculo_id: calculoId, periodo_aquisitivo_inicio: "2023-06-06", periodo_aquisitivo_fim: "2024-06-05", situacao: "proporcionais", dias: 30 },
    ]);

    // 7. Faltas e afastamentos (dados reais da CTPS)
    const faltas = [
      // Atestados médicos 2019
      { data_inicial: "2019-07-26", data_final: "2019-07-27", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2019-07-29", data_final: "2019-07-30", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2019-07-30", data_final: "2019-07-31", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2019-07-31", data_final: "2019-08-02", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2019-08-19", data_final: "2019-08-20", justificada: true, motivo: "Atestado Médico" },
      // 2020
      { data_inicial: "2020-01-09", data_final: "2020-01-09", justificada: false, motivo: "Falta não justificada" },
      { data_inicial: "2020-02-26", data_final: "2020-02-27", justificada: true, motivo: "Atestado Médico" },
      // 2021
      { data_inicial: "2021-02-02", data_final: "2021-02-03", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2021-07-14", data_final: "2021-07-15", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2021-08-03", data_final: "2021-08-03", justificada: true, motivo: "Licença médica" },
      // 2022
      { data_inicial: "2022-02-08", data_final: "2022-02-08", justificada: true, motivo: "Declaração em horas" },
      { data_inicial: "2022-02-09", data_final: "2022-02-10", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-02-15", data_final: "2022-02-17", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-02-18", data_final: "2022-02-18", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-02-24", data_final: "2022-02-24", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-02-25", data_final: "2022-02-25", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-03-08", data_final: "2022-03-08", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-05-04", data_final: "2022-05-06", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-05-18", data_final: "2022-05-18", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-07-14", data_final: "2022-07-16", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-07-18", data_final: "2022-07-18", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-08-05", data_final: "2022-08-05", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-08-22", data_final: "2022-08-22", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-08-27", data_final: "2022-08-27", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2022-10-04", data_final: "2022-10-04", justificada: false, motivo: "Falta não justificada" },
      { data_inicial: "2022-11-11", data_final: "2022-11-11", justificada: false, motivo: "Falta não justificada" },
      { data_inicial: "2022-12-30", data_final: "2022-12-30", justificada: false, motivo: "Falta não justificada" },
      // 2023 - licença maternidade
      { data_inicial: "2023-01-16", data_final: "2023-07-14", justificada: true, motivo: "Licença maternidade + extensão 60d", tipo_falta: "LICENCA_MATERNIDADE" },
      { data_inicial: "2023-09-04", data_final: "2023-09-04", justificada: true, motivo: "Atestado Odontológico" },
      { data_inicial: "2023-09-18", data_final: "2023-09-18", justificada: false, motivo: "Falta não justificada" },
      { data_inicial: "2023-10-18", data_final: "2023-10-19", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2023-11-07", data_final: "2023-11-07", justificada: false, motivo: "Falta não justificada" },
      { data_inicial: "2023-12-19", data_final: "2023-12-22", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2023-12-29", data_final: "2023-12-29", justificada: false, motivo: "Falta não justificada" },
      // 2024
      { data_inicial: "2024-01-17", data_final: "2024-01-20", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2024-02-06", data_final: "2024-02-06", justificada: false, motivo: "Falta não justificada" },
      { data_inicial: "2024-02-07", data_final: "2024-02-10", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2024-02-27", data_final: "2024-02-27", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2024-03-06", data_final: "2024-03-06", justificada: false, motivo: "Falta não justificada" },
      { data_inicial: "2024-03-08", data_final: "2024-03-08", justificada: true, motivo: "Atestado Odontológico" },
      { data_inicial: "2024-06-11", data_final: "2024-06-17", justificada: true, motivo: "Licença médica" },
      { data_inicial: "2024-07-01", data_final: "2024-07-01", justificada: false, motivo: "Falta não justificada" },
    ];

    // Insert in batches
    for (let i = 0; i < faltas.length; i += 20) {
      await supabase.from("pjecalc_faltas" as any).insert(
        faltas.slice(i, i + 20).map(f => ({
          case_id: caseId,
          calculo_id: calculoId,
          ...f,
        }))
      );
    }

    // 8. Verbas — comissionista padrão
    const periodoCalc = { inicio: "2019-08-21", fim: "2024-07-04" };
    const baseCalculoPrincipal = {
      historicos: histIds,
      verbas: [],
      tabelas: ["ultima_remuneracao", "maior_remuneracao"],
      proporcionalizar: false,
      integralizar: false,
    };
    const incidenciasPadrao = { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false };

    const verbasPrincipais = [
      {
        nome: "REPOUSO SEMANAL REMUNERADO (COMISSIONISTA)",
        multiplicador: 1, divisor_informado: 26,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE RSR", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12 },
          { nome: "AVISO PRÉVIO SOBRE RSR", caracteristica: "aviso_previo", ocorrencia_pagamento: "desligamento", multiplicador: 1, divisor_informado: 12 },
          { nome: "FÉRIAS + 1/3 SOBRE RSR", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12 },
        ],
      },
      {
        nome: "HORAS EXTRAS 50%",
        multiplicador: 1.5, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE HORAS EXTRAS", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12 },
          { nome: "FÉRIAS + 1/3 SOBRE HORAS EXTRAS", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12 },
          { nome: "RSR SOBRE HORAS EXTRAS", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26 },
        ],
      },
      {
        nome: "INTERVALO INTRAJORNADA",
        multiplicador: 1.5, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE INTERVALO INTRAJORNADA", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12 },
          { nome: "FÉRIAS + 1/3 SOBRE INTERVALO INTRAJORNADA", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12 },
          { nome: "RSR SOBRE INTERVALO INTRAJORNADA", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26 },
        ],
      },
      {
        nome: "DOMINGOS E FERIADOS TRABALHADOS",
        multiplicador: 2.0, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE DOMINGOS/FERIADOS", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12 },
          { nome: "FÉRIAS + 1/3 SOBRE DOMINGOS/FERIADOS", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12 },
          { nome: "RSR SOBRE DOMINGOS/FERIADOS", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26 },
        ],
      },
      {
        nome: "ARTIGO 384 DA CLT",
        multiplicador: 1.5, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE ART. 384", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12 },
          { nome: "FÉRIAS + 1/3 SOBRE ART. 384", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12 },
          { nome: "RSR SOBRE ART. 384", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26 },
        ],
      },
      {
        nome: "COMISSÕES ESTORNADAS",
        multiplicador: 1, divisor_informado: 1,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE COMISSÕES ESTORNADAS", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12 },
          { nome: "FÉRIAS + 1/3 SOBRE COMISSÕES ESTORNADAS", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12 },
        ],
      },
    ];

    let ordem = 0;

    for (const vp of verbasPrincipais) {
      const { data: principalData } = await supabase.from("pjecalc_verbas" as any).insert({
        case_id: caseId,
        calculo_id: calculoId,
        nome: vp.nome,
        tipo: "principal",
        caracteristica: "comum",
        ocorrencia_pagamento: "mensal",
        multiplicador: vp.multiplicador,
        divisor_informado: vp.divisor_informado,
        periodo_inicio: periodoCalc.inicio,
        periodo_fim: periodoCalc.fim,
        ordem: ordem++,
        ativa: true,
        base_calculo: baseCalculoPrincipal,
        incidencias: incidenciasPadrao,
        incide_inss: true,
        incide_fgts: true,
        incide_ir: true,
      }).select("id").single();

      const principalId = (principalData as any)?.id;
      if (!principalId) continue;

      for (const ref of vp.reflexas) {
        await supabase.from("pjecalc_verbas" as any).insert({
          case_id: caseId,
          calculo_id: calculoId,
          nome: ref.nome,
          tipo: "reflexa",
          caracteristica: ref.caracteristica,
          ocorrencia_pagamento: ref.ocorrencia_pagamento,
          multiplicador: ref.multiplicador,
          divisor_informado: ref.divisor_informado,
          periodo_inicio: periodoCalc.inicio,
          periodo_fim: periodoCalc.fim,
          ordem: ordem++,
          verba_principal_id: principalId,
          ativa: true,
          base_calculo: { historicos: [], verbas: [principalId], tabelas: [], proporcionalizar: false, integralizar: false },
          incidencias: incidenciasPadrao,
          incide_inss: true,
          incide_fgts: true,
          incide_ir: true,
        });
      }
    }

    // 9. FGTS config
    const { data: existFgts } = await supabase.from("pjecalc_fgts_config" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existFgts) {
      await supabase.from("pjecalc_fgts_config" as any).update({ habilitado: true, percentual_deposito: 8, percentual_multa: 40 }).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_fgts_config" as any).insert({ case_id: caseId, habilitado: true, percentual_deposito: 8, percentual_multa: 40 });
    }

    // 10. CS config
    const { data: existCs } = await supabase.from("pjecalc_cs_config" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existCs) {
      await supabase.from("pjecalc_cs_config" as any).update({ habilitado: true, regime: "CLT" }).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_cs_config" as any).insert({ case_id: caseId, habilitado: true, regime: "CLT" });
    }

    // 11. IR config (1 dependente IRRF conforme contracheque)
    const { data: existIr } = await supabase.from("pjecalc_ir_config" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existIr) {
      await supabase.from("pjecalc_ir_config" as any).update({ habilitado: true, metodo: "progressivo", dependentes: 1 }).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_ir_config" as any).insert({ case_id: caseId, habilitado: true, metodo: "progressivo", dependentes: 1 });
    }

    // 12. Correção monetária
    const correcaoPayload = { indice: "IPCA-E", epoca: "mensal", juros_tipo: "simples_mensal", juros_percentual: 1, juros_inicio: "ajuizamento", multa_523: false, multa_523_percentual: 0, data_liquidacao: new Date().toISOString().slice(0, 10), data_citacao: "2024-10-15" };
    const { data: existCorrecao } = await supabase.from("pjecalc_correcao_config" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existCorrecao) {
      await supabase.from("pjecalc_correcao_config" as any).update(correcaoPayload).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_correcao_config" as any).insert({ case_id: caseId, ...correcaoPayload });
    }

    // 13. Honorários
    const { data: existHon } = await supabase.from("pjecalc_honorarios" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existHon) {
      await supabase.from("pjecalc_honorarios" as any).update({ percentual: 15, sobre: "condenacao" }).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_honorarios" as any).insert({ case_id: caseId, percentual: 15, sobre: "condenacao" });
    }

    // 14. Multas CLT
    const { data: existMultas } = await supabase.from("pjecalc_multas_config" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existMultas) {
      await supabase.from("pjecalc_multas_config" as any).update({ multa_477: true, multa_467: false }).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_multas_config" as any).insert({ case_id: caseId, multa_477: true, multa_467: false });
    }

    // 15. Dados do processo
    const dadosPayload = { numero_processo: PROCESSO, vara: "Vara do Trabalho de Belo Horizonte", reclamante_nome: "Rosicleia Pereira Chaves", reclamante_cpf: "100.233.396-24", reclamada_nome: "Grupo Casas Bahia S.A.", reclamada_cnpj: "33.041.260/0501-88" };
    const { data: existDados } = await supabase.from("pjecalc_dados_processo" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existDados) {
      await supabase.from("pjecalc_dados_processo" as any).update(dadosPayload).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_dados_processo" as any).insert({ case_id: caseId, ...dadosPayload });
    }

    // 16. Upload documents metadata (reference to files in public/reports/rosicleia/)
    const documentos = [
      { file_name: "CTPS_ate_2021.pdf", tipo: "ctps" },
      { file_name: "CTPS_nova.pdf", tipo: "ctps" },
      { file_name: "Contracheques_ate_06.2021.pdf", tipo: "contracheque" },
      { file_name: "Contracheques_apos_06.2021.pdf", tipo: "contracheque" },
      { file_name: "Cartoes_de_ponto_ate_06.2021.pdf", tipo: "cartao_ponto" },
      { file_name: "Cartoes_de_ponto_06.2021_ate_12.2021.pdf", tipo: "cartao_ponto" },
      { file_name: "Cartoes_de_ponto_2022.pdf", tipo: "cartao_ponto" },
      { file_name: "Cartoes_de_ponto_2023.pdf", tipo: "cartao_ponto" },
      { file_name: "Cartoes_de_ponto_2024.pdf", tipo: "cartao_ponto" },
    ];

    for (const doc of documentos) {
      await supabase.from("documents").insert({
        case_id: caseId,
        file_name: doc.file_name,
        tipo: doc.tipo as any,
        status: "uploaded",
        metadata: { source: "seed", path: `/reports/rosicleia/${doc.file_name}` },
        owner_user_id: user.id,
      });
    }

    return caseId;
  } catch (err: any) {
    await supabase.from("cases").delete().eq("id", caseId);
    throw err;
  }
}
