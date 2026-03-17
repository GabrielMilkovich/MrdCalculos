/**
 * Sincronização automática de dados validados → módulos PJe-Calc.
 * Extraído de PjeCalcInline.syncFromOCR para reuso pós-validação.
 * 
 * CRITICAL FIX: Never use new Date() as fallback for critical dates.
 * Missing dates must be left empty so the canonical blocker catches them.
 */
import { supabase } from "@/integrations/supabase/client";
import * as svc from "./service";

export interface SyncResult {
  syncedFields: number;
  errors: string[];
  warnings: string[];
}

export async function syncFromValidation(caseId: string): Promise<SyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Fetch facts, case, contract, existing params, extraction items in parallel
  const [factsRes, caseRes, contractRes, existingParams, existingDP, existingHistRes, existingVerbasRes, extractionItemsRes, extractionsRes] = await Promise.all([
    supabase.from("facts").select("*").eq("case_id", caseId),
    supabase.from("cases").select("*").eq("id", caseId).maybeSingle(),
    supabase.from("employment_contracts").select("*").eq("case_id", caseId).maybeSingle(),
    svc.getParametros(caseId),
    svc.getDadosProcesso(caseId),
    svc.getHistoricoSalarial(caseId),
    svc.getVerbas(caseId),
    supabase.from("extracao_item").select("*").eq("case_id", caseId).in("status", ["AUTO", "APROVADO"] as any),
    supabase.from("extractions").select("*").eq("case_id", caseId).in("status", ["validado", "pendente"]),
  ]);

  const facts = factsRes.data || [];
  const caseData = caseRes.data;
  const contractData = contractRes.data;

  // Build fact map preferring confirmed facts
  const factMap: Record<string, string> = {};
  for (const f of facts) {
    if (!factMap[f.chave] || f.confirmado) {
      factMap[f.chave] = f.valor;
    }
  }

  // Enrich from extractions table (validated OCR data)
  const extractions = extractionsRes.data || [];
  for (const ext of extractions) {
    if (ext.valor_proposto && ext.campo && !factMap[ext.campo]) {
      factMap[ext.campo] = ext.valor_proposto;
    }
  }

  // Enrich from extracao_item (pipeline-extracted fields)
  const extracaoItems = extractionItemsRes.data || [];
  for (const item of extracaoItems) {
    if (item.valor && item.field_key && item.target_field) {
      const key = item.target_field;
      if (!factMap[key] && !key.startsWith('rubrica_')) {
        factMap[key] = item.valor;
      }
    }
  }

  // Enrich from case/contract tables
  if (!factMap.data_admissao && contractData?.data_admissao) factMap.data_admissao = contractData.data_admissao;
  if (!factMap.data_demissao && contractData?.data_demissao) factMap.data_demissao = contractData.data_demissao;
  if (!factMap.salario_base && contractData?.salario_inicial) factMap.salario_base = String(contractData.salario_inicial);
  if (!factMap.numero_processo && caseData?.numero_processo) factMap.numero_processo = caseData.numero_processo;
  if (!factMap.reclamante && caseData?.cliente) factMap.reclamante = caseData.cliente;
  if (contractData?.funcao && !factMap.cargo) factMap.cargo = contractData.funcao;

  if (Object.keys(factMap).length === 0) {
    return { syncedFields: 0, errors: [], warnings: [] };
  }

  // ── Parâmetros ──
  // CRITICAL FIX: Do NOT use new Date() as fallback for critical dates.
  // Missing dates will be caught by the canonical input blocker (E002/E003).
  const autoParams: Record<string, unknown> = { case_id: caseId };
  if (factMap.data_admissao) autoParams.data_admissao = factMap.data_admissao;
  if (factMap.data_demissao) autoParams.data_demissao = factMap.data_demissao;
  if (factMap.data_ajuizamento) autoParams.data_ajuizamento = factMap.data_ajuizamento;
  if (factMap.data_citacao) autoParams.data_citacao = factMap.data_citacao;
  if (factMap.data_liquidacao) autoParams.data_liquidacao = factMap.data_liquidacao;
  
  if (factMap.salario_base || factMap.salario_mensal || factMap.ultimo_salario) {
    const salVal = parseFloat(
      (factMap.salario_base || factMap.salario_mensal || factMap.ultimo_salario)
        .replace(/[^\d.,]/g, '')
        .replace(',', '.')
    );
    if (!isNaN(salVal) && salVal > 0) {
      autoParams.ultima_remuneracao = salVal;
      autoParams.maior_remuneracao = salVal;
    }
  }
  if (factMap.jornada_contratual || factMap.carga_horaria) {
    const jornada = parseInt(factMap.jornada_contratual || factMap.carga_horaria);
    if (jornada && jornada > 0) autoParams.carga_horaria_padrao = jornada;
  }
  if (factMap.estado || factMap.uf) autoParams.estado = (factMap.estado || factMap.uf).toUpperCase().trim();
  if (factMap.municipio || factMap.cidade) autoParams.municipio = factMap.municipio || factMap.cidade;

  // Only upsert if we have at least data_admissao (from a real source, not a fallback)
  if (!autoParams.data_admissao) {
    warnings.push('data_admissao ausente — parâmetros não serão criados automaticamente. Preencha manualmente.');
  }

  try {
    await svc.upsertParametros({
      case_id: caseId,
      // FIXED: Use empty string instead of new Date() — let blocker catch it
      data_admissao: (autoParams.data_admissao as string) || '',
      data_ajuizamento: (autoParams.data_ajuizamento as string) || '',
      ...(autoParams.data_demissao ? { data_demissao: autoParams.data_demissao as string } : {}),
      ...(autoParams.ultima_remuneracao ? { ultima_remuneracao: autoParams.ultima_remuneracao as number } : {}),
      ...(autoParams.maior_remuneracao ? { maior_remuneracao: autoParams.maior_remuneracao as number } : {}),
      ...(autoParams.carga_horaria_padrao ? { carga_horaria_padrao: autoParams.carga_horaria_padrao as number } : {}),
      ...(autoParams.estado ? { estado: autoParams.estado as string } : {}),
      ...(autoParams.municipio ? { municipio: autoParams.municipio as string } : {}),
      ...(!existingParams ? { regime_trabalho: 'tempo_integral', sabado_dia_util: true } : {}),
    });
  } catch (e) {
    errors.push(`Parâmetros: ${(e as Error).message}`);
  }

  // ── Dados do Processo ──
  const processData: Record<string, unknown> = { case_id: caseId };
  if (factMap.numero_processo) processData.numero_processo = factMap.numero_processo;
  if (factMap.reclamante || factMap.nome_reclamante) processData.reclamante_nome = factMap.reclamante || factMap.nome_reclamante;
  if (factMap.cpf_reclamante || factMap.cpf) processData.reclamante_cpf = factMap.cpf_reclamante || factMap.cpf;
  if (factMap.reclamada || factMap.nome_reclamada || factMap.empregador) processData.reclamada_nome = factMap.reclamada || factMap.nome_reclamada || factMap.empregador;
  if (factMap.cnpj_reclamada || factMap.cnpj) processData.reclamada_cnpj = factMap.cnpj_reclamada || factMap.cnpj;
  if (factMap.vara) processData.vara = factMap.vara;
  if (factMap.comarca) processData.comarca = factMap.comarca;
  if (factMap.cargo || factMap.funcao) processData.objeto = factMap.cargo || factMap.funcao;

  if (Object.keys(processData).length > 1) {
    try {
      await svc.upsertDadosProcesso(processData as any);
    } catch (e) {
      errors.push(`Dados Processo: ${(e as Error).message}`);
    }
  }

  // ── Histórico Salarial + Monthly Breakdown ──
  const HIST_NAME = 'Salário Base';
  if (autoParams.data_admissao && autoParams.ultima_remuneracao && !existingHistRes.length) {
    try {
      await svc.insertHistoricoSalarial({
        case_id: caseId,
        nome: HIST_NAME,
        periodo_inicio: autoParams.data_admissao as string,
        periodo_fim: (autoParams.data_demissao as string) || '',
        tipo_valor: 'informado',
        valor_informado: autoParams.ultima_remuneracao as number,
        incidencia_fgts: true,
        incidencia_cs: true,
      });

      // CRITICAL FIX: Generate monthly salary history entries (pjecalc_hist_salarial_mes)
      // Without these, the engine has no per-competência salary data.
      await generateMonthlySalaryHistory(
        caseId,
        autoParams.data_admissao as string,
        (autoParams.data_demissao as string) || '',
        autoParams.ultima_remuneracao as number,
        errors,
      );
    } catch (e) {
      errors.push(`Histórico: ${(e as Error).message}`);
    }
  }

  // ── Verbas auto-geradas (with hist_salarial_nome linkage) ──
  if (!existingVerbasRes.length && autoParams.data_admissao) {
    const periodo = {
      inicio: autoParams.data_admissao as string,
      fim: (autoParams.data_demissao as string) || '',
    };

    const updatedHist = await svc.getHistoricoSalarial(caseId);
    const histIds = updatedHist.map(h => h.id);
    const histName = updatedHist.length > 0 ? updatedHist[0].nome : HIST_NAME;

    const baseCalculoPrincipal = {
      historicos: histIds,
      verbas: [],
      tabelas: histIds.length ? [] : ['ultima_remuneracao'],
      proporcionalizar: false,
      integralizar: false,
    };

    try {
      const principalData = await svc.insertVerba({
        case_id: caseId,
        nome: 'Horas Extras 50%',
        caracteristica: 'comum',
        ocorrencia_pagamento: 'mensal',
        tipo: 'principal',
        multiplicador: 1.5,
        divisor_informado: (autoParams.carga_horaria_padrao as number) || 220,
        periodo_inicio: periodo.inicio,
        periodo_fim: periodo.fim,
        ordem: 0,
        base_calculo: baseCalculoPrincipal,
        // CRITICAL FIX: Link verba to historical salary name
        hist_salarial_nome: histName,
        incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
      });

      const principalId = principalData?.id || null;
      const reflexas = [
        { nome: 'RSR s/ Horas Extras', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', tipo: 'reflexa', multiplicador: 1, divisor_informado: 26, ordem: 1 },
        { nome: '13º Salário', caracteristica: '13_salario', ocorrencia_pagamento: 'dezembro', tipo: 'reflexa', multiplicador: 1, divisor_informado: 12, ordem: 2 },
        { nome: 'Férias + 1/3', caracteristica: 'ferias', ocorrencia_pagamento: 'periodo_aquisitivo', tipo: 'reflexa', multiplicador: 1.3333, divisor_informado: 12, ordem: 3 },
      ];
      for (const ref of reflexas) {
        try {
          await svc.insertVerba({
            case_id: caseId, ...ref, periodo_inicio: periodo.inicio, periodo_fim: periodo.fim,
            verba_principal_id: principalId,
            base_calculo: { historicos: [], verbas: principalId ? [principalId] : [], tabelas: [], proporcionalizar: false, integralizar: false },
            incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
          });
        } catch (e) {
          errors.push(`Verba ${ref.nome}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      errors.push(`Verba HE: ${(e as Error).message}`);
    }
  }

  // ── Auto-configurar módulos com defaults sensatos ──
  await autoConfigureModules(caseId, autoParams, factMap, errors, warnings);

  return { syncedFields: Object.keys(factMap).length, errors, warnings };
}

/**
 * Generate monthly salary history entries (pjecalc_hist_salarial_mes).
 * This is CRITICAL for the engine to have per-competência base values.
 */
async function generateMonthlySalaryHistory(
  caseId: string,
  dataAdmissao: string,
  dataDemissao: string,
  valor: number,
  errors: string[],
): Promise<void> {
  // Wait for hist_salarial to be created via trigger
  await new Promise(r => setTimeout(r, 500));

  const historicos = await svc.getHistoricoSalarial(caseId);
  if (historicos.length === 0) return;

  const histId = historicos[0].id;
  const start = new Date(dataAdmissao + 'T00:00:00');
  const end = dataDemissao ? new Date(dataDemissao + 'T00:00:00') : new Date();
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);

  let count = 0;
  while (cur <= end && count < 600) { // safety limit: 50 years
    const comp = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-01`;
    try {
      await svc.insertHistoricoOcorrencia({
        historico_id: histId,
        competencia: comp,
        valor,
        tipo: 'informado',
      });
    } catch (e) {
      // Ignore duplicates (ON CONFLICT)
      const msg = (e as Error).message;
      if (!msg.includes('duplicate') && !msg.includes('unique')) {
        errors.push(`Hist mensal ${comp}: ${msg}`);
      }
    }
    cur.setMonth(cur.getMonth() + 1);
    count++;
  }
}

/** Auto-configura módulos de config via pjecalc_calculos e pjecalc_correcao_config */
async function autoConfigureModules(
  caseId: string,
  params: Record<string, unknown>,
  factMap: Record<string, string>,
  errors: string[],
  warnings: string[],
) {
  // Wait for pjecalc_calculos to exist (created by trigger on parametros insert)
  await new Promise(r => setTimeout(r, 300));

  // Get calculo_id
  const { data: calculoRow } = await supabase
    .from("pjecalc_calculos")
    .select("id")
    .eq("case_id", caseId)
    .maybeSingle();

  if (calculoRow) {
    const calcId = calculoRow.id;
    // Update writable columns directly on pjecalc_calculos
    const { error } = await supabase.from("pjecalc_calculos").update({
      honorarios_percentual: 15,
      honorarios_sobre: 'condenacao',
      custas_percentual: 2,
      custas_limite: 10.64,
      multa_477_habilitada: true,
      multa_467_habilitada: false,
    }).eq("id", calcId);
    if (error) errors.push(`Config Calculos: ${error.message}`);

    // FIXED: Only set data_liquidacao if explicitly provided, otherwise warn
    if (params.data_liquidacao) {
      await supabase.from("pjecalc_calculos").update({
        data_liquidacao: params.data_liquidacao as string,
      }).eq("id", calcId);
    } else if (factMap.data_liquidacao) {
      await supabase.from("pjecalc_calculos").update({
        data_liquidacao: factMap.data_liquidacao,
      }).eq("id", calcId);
    } else {
      // Set today as a default but warn the user
      await supabase.from("pjecalc_calculos").update({
        data_liquidacao: new Date().toISOString().slice(0, 10),
      }).eq("id", calcId);
      warnings.push('data_liquidacao não encontrada em documentos — usando data atual como fallback. Revise este valor.');
    }

    // Upsert correcao config — skip if combination-by-date already set
    const existCorrecaoRes = await supabase
      .from("pjecalc_atualizacao_config" as any)
      .select("id, combinacoes_indice, regime_padrao")
      .eq("calculo_id", calcId)
      .eq("tipo", "correcao")
      .maybeSingle();

    const existCorrecao = existCorrecaoRes.data as unknown as { id: string; combinacoes_indice?: string; regime_padrao?: string } | null;
    const hasCombinations = existCorrecao?.combinacoes_indice || existCorrecao?.regime_padrao === 'COMBINACAO';

    if (!hasCombinations) {
      if (existCorrecao) {
        await supabase.from("pjecalc_atualizacao_config" as any).update({
          regime_padrao: "IPCA-E",
        }).eq("id", existCorrecao.id);
      } else {
        const { error } = await supabase.from("pjecalc_atualizacao_config" as any).insert({
          calculo_id: calcId,
          tipo: "correcao",
          regime_padrao: "IPCA-E",
        });
        if (error) errors.push(`Correção Config: ${error.message}`);
      }
    }

    // Upsert juros config
    const existJurosRes = await supabase
      .from("pjecalc_atualizacao_config" as any)
      .select("id, regime_padrao")
      .eq("calculo_id", calcId)
      .eq("tipo", "juros")
      .maybeSingle();

    const existJuros = existJurosRes.data as unknown as { id: string; regime_padrao?: string } | null;
    const hasCombJuros = existJuros?.regime_padrao === 'COMBINACAO';

    if (!hasCombJuros) {
      if (existJuros) {
        await supabase.from("pjecalc_atualizacao_config" as any).update({
          regime_padrao: "simples_mensal",
        }).eq("id", existJuros.id);
      } else {
        const { error } = await supabase.from("pjecalc_atualizacao_config" as any).insert({
          calculo_id: calcId,
          tipo: "juros",
          regime_padrao: "simples_mensal",
        });
        if (error) errors.push(`Juros Config: ${error.message}`);
      }
    }
  }
}
