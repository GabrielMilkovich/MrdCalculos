/**
 * Seed: Caso Roque Guerreiro Teixeira vs Via Varejo S.A.
 * Comissionista — dados extraídos da CTPS e contracheques reais
 * Admissão: 24/11/2003 | Demissão: 09/03/2021 (sem justa causa)
 * Aviso prévio indenizado: 78 dias → projeção: 26/05/2021
 * Local: Pinhais, PR | Processo: 0000610-03.2021.5.09.0245
 */
import { supabase } from "@/integrations/supabase/client";

const PROCESSO = "0000610-03.2021.5.09.0245";

export async function deleteCasoRoque(): Promise<void> {
  const { data } = await supabase.from("cases").select("id").eq("cliente", "Roque Guerreiro Teixeira");
  if (data) {
    for (const c of data) {
      await supabase.from("cases").delete().eq("id", c.id);
    }
  }
}

export async function seedCasoRoque(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada");

  await deleteCasoRoque();

  // 1. Case
  const { data: c, error: cErr } = await supabase.from("cases").insert({
    cliente: "Roque Guerreiro Teixeira",
    numero_processo: PROCESSO,
    tribunal: "TRT 9ª Região",
    status: "em_analise",
    criado_por: user.id,
    tags: ["comissionista", "via_varejo", "caso_real", "covid"],
  }).select("id").single();
  if (cErr || !c) throw new Error("Erro ao criar caso: " + cErr?.message);
  const caseId = (c as any).id;

  try {
    // 2. Employment contract
    await supabase.from("employment_contracts" as any).insert({
      case_id: caseId,
      data_admissao: "2003-11-24",
      data_demissao: "2021-03-09",
      funcao: "Vendedor Interno",
      salario_inicial: 0,
      tipo_demissao: "sem_justa_causa" as any,
      jornada_contratual: { horas_semanais: 44, divisor: 220 },
      local_trabalho: "Pinhais, PR",
    });

    // 3. Facts
    const facts = [
      { chave: "data_admissao", valor: "2003-11-24", tipo: "data" as any },
      { chave: "data_demissao", valor: "2021-03-09", tipo: "data" as any },
      { chave: "salario_base", valor: "comissionista_pura", tipo: "texto" as any },
      { chave: "cargo", valor: "VENDEDOR INTERNO", tipo: "texto" as any },
      { chave: "cnpj_empregador", valor: "33.041.260/0778-92", tipo: "texto" as any },
      { chave: "razao_social_empregador", valor: "Via Varejo S.A.", tipo: "texto" as any },
      { chave: "nome_empregado", valor: "ROQUE GUERREIRO TEIXEIRA", tipo: "texto" as any },
      { chave: "cpf_empregado", valor: "359.257.019-68", tipo: "texto" as any },
      { chave: "local_trabalho", valor: "Pinhais, PR", tipo: "texto" as any },
      { chave: "uf", valor: "PR", tipo: "texto" as any },
      { chave: "municipio", valor: "Pinhais", tipo: "texto" as any },
      { chave: "pis_pasep", valor: "10581555438", tipo: "texto" as any },
      { chave: "tipo_rescisao", valor: "sem_justa_causa", tipo: "texto" as any },
      { chave: "aviso_previo_projetado", valor: "2021-05-26", tipo: "data" as any },
      { chave: "aviso_previo_dias", valor: "78", tipo: "numero" as any },
      { chave: "sindicato", valor: "SIND.EMPREGADOS COMERCIO DE CURITIBA", tipo: "texto" as any },
    ];
    await supabase.from("facts" as any).insert(
      facts.map(f => ({
        case_id: caseId, ...f,
        origem: "manual" as any, confirmado: true,
        confirmado_por: user.id, confirmado_em: new Date().toISOString(), confianca: 1.0,
      }))
    );

    // 4. Parâmetros — prescrição quinquenal a partir do ajuizamento
    const paramsPayload = {
      case_id: caseId,
      data_admissao: "2003-11-24",
      data_demissao: "2021-03-09",
      data_ajuizamento: "2021-06-03",
      data_inicial: "2016-06-03",
      data_final: "2021-03-09",
      carga_horaria_padrao: 220,
      sabado_dia_util: true,
      projetar_aviso_indenizado: true,
      limitar_avos_periodo: false,
      zerar_valor_negativo: false,
      prescricao_quinquenal: true,
      prescricao_fgts: false,
      estado: "PR",
      municipio: "Pinhais",
      prazo_aviso_previo: "indenizado",
      prazo_aviso_dias: "78",
      regime_trabalho: "tempo_integral",
      ultima_remuneracao: 1500,
      maior_remuneracao: 3000,
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

    // 5. Histórico Salarial — rubricas dos contracheques
    const historicoRubricas = [
      { nome: "COMISSÕES", tipo_valor: "VARIAVEL", valor_informado: 400, incidencia_fgts: true, incidencia_cs: true },
      { nome: "DSR (Comissão)", tipo_valor: "VARIAVEL", valor_informado: 80, incidencia_fgts: true, incidencia_cs: true },
      { nome: "DSR (H.Extra)", tipo_valor: "VARIAVEL", valor_informado: 10, incidencia_fgts: true, incidencia_cs: true },
      { nome: "MÍNIMO GARANTIDO - COMISSÃO", tipo_valor: "VARIAVEL", valor_informado: 1400, incidencia_fgts: true, incidencia_cs: true },
      { nome: "AD.SABADO COM.25%", tipo_valor: "VARIAVEL", valor_informado: 35, incidencia_fgts: true, incidencia_cs: true },
      { nome: "COMISSÕES PRODUTOS ONLINE", tipo_valor: "VARIAVEL", valor_informado: 15, incidencia_fgts: true, incidencia_cs: true },
      { nome: "PREMIO ANTECIPADO", tipo_valor: "VARIAVEL", valor_informado: 16, incidencia_fgts: true, incidencia_cs: true },
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
        periodo_inicio: "2016-06-03",
        periodo_fim: "2021-03-09",
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

      // Monthly values with realistic variation
      if (calculoId) {
        const ocorrencias: any[] = [];
        const cur = new Date(2016, 5, 1); // June 2016
        const end = new Date(2021, 2, 1); // March 2021
        while (cur <= end) {
          const comp = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
          const variation = 0.3 + Math.random() * 1.4;
          let valor = Math.round(rub.valor_informado * variation * 100) / 100;

          // COVID suspension periods: zero values
          const isSuspended =
            (cur >= new Date(2020, 3, 24) && cur <= new Date(2020, 4, 23)) || // Apr-May 2020
            (cur >= new Date(2020, 4, 24) && cur <= new Date(2020, 5, 22)) || // May-Jun 2020
            (cur >= new Date(2020, 9, 6) && cur <= new Date(2020, 10, 4));    // Oct-Nov 2020

          if (isSuspended && rub.nome !== "MÍNIMO GARANTIDO - COMISSÃO") {
            valor = 0;
          }

          // COVID salary reduction Jul-Oct 2020 (25%)
          const isReduced = cur >= new Date(2020, 6, 8) && cur <= new Date(2020, 9, 5);
          if (isReduced) {
            valor = Math.round(valor * 0.75 * 100) / 100;
          }

          // Mínimo garantido only when commissions are low
          if (rub.nome === "MÍNIMO GARANTIDO - COMISSÃO") {
            valor = Math.random() > 0.5 ? Math.round(rub.valor_informado * variation * 100) / 100 : 0;
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
    const ferias = [
      { pa_inicio: "2003-11-24", pa_fim: "2004-11-22", gozo_inicio: "2004-10-11", gozo_fim: "2004-10-30", dias: 20, abono: true, dias_abono: 10 },
      { pa_inicio: "2004-11-23", pa_fim: "2005-11-22", gozo_inicio: "2005-09-12", gozo_fim: "2005-10-01", dias: 20, abono: true, dias_abono: 10 },
      { pa_inicio: "2005-11-23", pa_fim: "2006-11-22", gozo_inicio: "2006-05-15", gozo_fim: "2006-05-24", dias: 10, abono: false, dias_abono: 0 },
      { pa_inicio: "2006-11-23", pa_fim: "2007-11-23", gozo_inicio: "2007-09-10", gozo_fim: "2007-09-29", dias: 20, abono: true, dias_abono: 10 },
      { pa_inicio: "2007-11-24", pa_fim: "2008-11-22", gozo_inicio: "2008-09-15", gozo_fim: "2008-10-04", dias: 20, abono: true, dias_abono: 10 },
      { pa_inicio: "2008-11-23", pa_fim: "2009-11-22", gozo_inicio: "2009-09-14", gozo_fim: "2009-10-13", dias: 30, abono: false, dias_abono: 0 },
      { pa_inicio: "2009-11-23", pa_fim: "2010-11-23", gozo_inicio: "2010-10-04", gozo_fim: "2010-11-02", dias: 30, abono: false, dias_abono: 0 },
      { pa_inicio: "2010-11-24", pa_fim: "2011-11-24", gozo_inicio: "2011-10-03", gozo_fim: "2011-11-01", dias: 30, abono: false, dias_abono: 0 },
      { pa_inicio: "2011-11-25", pa_fim: "2012-11-23", gozo_inicio: "2012-09-01", gozo_fim: "2012-09-30", dias: 30, abono: false, dias_abono: 0 },
      { pa_inicio: "2012-11-24", pa_fim: "2013-11-23", gozo_inicio: "2013-09-02", gozo_fim: "2013-10-01", dias: 30, abono: false, dias_abono: 0 },
      { pa_inicio: "2013-11-24", pa_fim: "2014-11-23", gozo_inicio: "2015-01-12", gozo_fim: "2015-02-10", dias: 30, abono: false, dias_abono: 0 },
      { pa_inicio: "2014-11-24", pa_fim: "2015-11-23", gozo_inicio: "2016-01-11", gozo_fim: "2016-02-09", dias: 30, abono: false, dias_abono: 0 },
      { pa_inicio: "2015-11-24", pa_fim: "2016-11-23", gozo_inicio: "2017-01-09", gozo_fim: "2017-02-07", dias: 30, abono: false, dias_abono: 0 },
      { pa_inicio: "2016-11-24", pa_fim: "2017-11-23", gozo_inicio: "2018-01-08", gozo_fim: "2018-02-06", dias: 30, abono: false, dias_abono: 0 },
      { pa_inicio: "2017-11-24", pa_fim: "2018-11-23", gozo_inicio: "2019-04-01", gozo_fim: "2019-04-30", dias: 30, abono: false, dias_abono: 0 },
      { pa_inicio: "2018-11-24", pa_fim: "2019-11-23", gozo_inicio: "2020-03-25", gozo_fim: "2020-04-23", dias: 30, abono: false, dias_abono: 0 },
      { pa_inicio: "2019-11-24", pa_fim: "2021-02-21", gozo_inicio: "2020-06-23", gozo_fim: "2020-07-02", dias: 10, abono: false, dias_abono: 0 },
    ];

    await supabase.from("pjecalc_ferias" as any).insert(
      ferias.map(f => ({
        case_id: caseId,
        calculo_id: calculoId,
        periodo_aquisitivo_inicio: f.pa_inicio,
        periodo_aquisitivo_fim: f.pa_fim,
        gozo_inicio: f.gozo_inicio,
        gozo_fim: f.gozo_fim,
        dias: f.dias,
        abono: f.abono,
        dias_abono: f.dias_abono,
        situacao: "gozadas",
      }))
    );

    // 7. Faltas e afastamentos (dados reais da CTPS)
    const faltas = [
      { data_inicial: "2009-03-13", data_final: "2009-03-27", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2011-01-19", data_final: "2011-03-29", justificada: true, motivo: "Auxílio Doença" },
      { data_inicial: "2012-03-15", data_final: "2012-03-16", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2012-05-07", data_final: "2012-06-12", justificada: true, motivo: "Auxílio Doença" },
      { data_inicial: "2013-05-03", data_final: "2013-05-17", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2014-01-15", data_final: "2014-01-16", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2014-07-15", data_final: "2014-07-16", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2014-07-29", data_final: "2014-07-30", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2014-07-31", data_final: "2014-08-03", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2014-08-13", data_final: "2014-08-14", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2018-09-12", data_final: "2018-09-13", justificada: true, motivo: "Atestado Médico" },
      { data_inicial: "2019-09-28", data_final: "2019-09-29", justificada: true, motivo: "Atestado Médico" },
      // COVID suspensions
      { data_inicial: "2020-04-24", data_final: "2020-05-24", justificada: true, motivo: "Suspensão Contrato COVID", tipo_falta: "SUSPENSAO" },
      { data_inicial: "2020-05-24", data_final: "2020-06-23", justificada: true, motivo: "Suspensão Contrato COVID", tipo_falta: "SUSPENSAO" },
      { data_inicial: "2020-10-06", data_final: "2020-11-05", justificada: true, motivo: "Suspensão Contrato COVID", tipo_falta: "SUSPENSAO" },
    ];

    for (let i = 0; i < faltas.length; i += 20) {
      await supabase.from("pjecalc_faltas" as any).insert(
        faltas.slice(i, i + 20).map(f => ({
          case_id: caseId,
          calculo_id: calculoId,
          ...f,
        }))
      );
    }

    // 8. Verbas — comissionista com pedidos típicos
    const periodoCalc = { inicio: "2016-06-03", fim: "2021-03-09" };
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
          { nome: "13º SALÁRIO SOBRE INTERVALO", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12 },
          { nome: "FÉRIAS + 1/3 SOBRE INTERVALO", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12 },
          { nome: "RSR SOBRE INTERVALO", caracteristica: "comum", ocorrencia_pagamento: "mensal", multiplicador: 1, divisor_informado: 26 },
        ],
      },
      {
        nome: "DOMINGOS E FERIADOS TRABALHADOS",
        multiplicador: 2.0, divisor_informado: 220,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE DOMINGOS/FERIADOS", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12 },
          { nome: "FÉRIAS + 1/3 SOBRE DOMINGOS/FERIADOS", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12 },
        ],
      },
      {
        nome: "DIFERENÇAS SALARIAIS (REDUÇÃO COVID)",
        multiplicador: 1, divisor_informado: 1,
        reflexas: [
          { nome: "13º SALÁRIO SOBRE DIF.SALARIAIS COVID", caracteristica: "13_salario", ocorrencia_pagamento: "dezembro", multiplicador: 1, divisor_informado: 12 },
          { nome: "FÉRIAS + 1/3 SOBRE DIF.SALARIAIS COVID", caracteristica: "ferias", ocorrencia_pagamento: "periodo_aquisitivo", multiplicador: 1.3333, divisor_informado: 12 },
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

    // 11. IR config (1 dependente IRRF conforme CTPS - cônjuge)
    const { data: existIr } = await supabase.from("pjecalc_ir_config" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existIr) {
      await supabase.from("pjecalc_ir_config" as any).update({ habilitado: true, metodo: "progressivo", dependentes: 1 }).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_ir_config" as any).insert({ case_id: caseId, habilitado: true, metodo: "progressivo", dependentes: 1 });
    }

    // 12. Correção monetária
    const correcaoPayload = { indice: "IPCA-E", epoca: "mensal", juros_tipo: "simples_mensal", juros_percentual: 1, juros_inicio: "ajuizamento", multa_523: false, multa_523_percentual: 0, data_liquidacao: new Date().toISOString().slice(0, 10), data_citacao: "2021-08-03" };
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
    const dadosPayload = { numero_processo: PROCESSO, vara: "Vara do Trabalho de Pinhais", uf: "PR", comarca: "Pinhais", reclamante_nome: "Roque Guerreiro Teixeira", reclamante_cpf: "359.257.019-68", reclamada_nome: "Via Varejo S.A.", reclamada_cnpj: "33.041.260/0778-92", data_citacao: "2021-08-03" };
    const { data: existDados } = await supabase.from("pjecalc_dados_processo" as any).select("id").eq("case_id", caseId).maybeSingle();
    if (existDados) {
      await supabase.from("pjecalc_dados_processo" as any).update(dadosPayload).eq("case_id", caseId);
    } else {
      await supabase.from("pjecalc_dados_processo" as any).insert({ case_id: caseId, ...dadosPayload });
    }

    // 16. Upload documents to storage + insert metadata
    const documentos = [
      { file_name: "CTPS.pdf", tipo: "ctps" },
      { file_name: "Contracheques.pdf", tipo: "contracheque" },
      { file_name: "Cartoes_de_ponto.pdf", tipo: "cartao_ponto" },
      { file_name: "Ficha_Financeira_2016.pdf", tipo: "ficha_financeira" },
      { file_name: "Ficha_Financeira_2017.pdf", tipo: "ficha_financeira" },
      { file_name: "Ficha_Financeira_2018.pdf", tipo: "ficha_financeira" },
      { file_name: "Ficha_Financeira_2019.pdf", tipo: "ficha_financeira" },
      { file_name: "Ficha_Financeira_2020.pdf", tipo: "ficha_financeira" },
      { file_name: "Ficha_Financeira_2021.pdf", tipo: "ficha_financeira" },
    ];

    for (const doc of documentos) {
      const storagePath = `${caseId}/${doc.file_name}`;
      let uploadSuccess = false;

      try {
        const resp = await fetch(`/reports/roque-guerreiro/${doc.file_name}`);
        if (resp.ok) {
          const blob = await resp.blob();
          const file = new File([blob], doc.file_name, { type: "application/pdf" });
          const { error: uploadErr } = await supabase.storage
            .from("case-documents")
            .upload(storagePath, file, { upsert: true, contentType: "application/pdf" });
          if (!uploadErr) uploadSuccess = true;
          else console.warn(`[SEED] Upload failed for ${doc.file_name}:`, uploadErr.message);
        }
      } catch (fetchErr) {
        console.warn(`[SEED] Error uploading ${doc.file_name}:`, fetchErr);
      }

      await supabase.from("documents").insert({
        case_id: caseId,
        file_name: doc.file_name,
        tipo: doc.tipo as any,
        status: "uploaded",
        storage_path: uploadSuccess ? storagePath : null,
        metadata: { source: "seed", path: `/reports/roque-guerreiro/${doc.file_name}` },
        owner_user_id: user.id,
      });
    }

    return caseId;
  } catch (err: any) {
    await supabase.from("cases").delete().eq("id", caseId);
    throw err;
  }
}
