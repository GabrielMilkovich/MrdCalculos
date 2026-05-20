/**
 * PJC → Database Persistence Layer
 * Maps PJCAnalysis from pjc-analyzer.ts into pjecalc_* v2 tables
 */

import { supabase } from '@/integrations/supabase/client';
import type { PJCAnalysis, OcorrenciaAnalysis } from './pjc-analyzer';
import { convertPjcToEngineInputs } from './pjc-to-engine';
import * as svc from './service';

export interface PersistResult {
  calculo_id: string;
  verbas_inseridas: number;
  reflexos_inseridos: number;
  historicos_inseridos: number;
  ocorrencias_hist_inseridas: number;
  faltas_inseridas: number;
  ferias_inseridas: number;
  ocorrencias_verba_inseridas: number;
  warnings: string[];
}

/**
 * Persists a fully parsed PJCAnalysis into the v2 database tables.
 * Creates or updates pjecalc_calculos and populates all child tables.
 */
export async function persistirPJCAnalysis(
  caseId: string,
  userId: string,
  analysis: PJCAnalysis,
): Promise<PersistResult> {
  const warnings: string[] = [];
  const p = analysis.parametros;

  // 1. Upsert pjecalc_calculos
  const { data: calcData, error: calcError } = await supabase
    .from('pjecalc_calculos')
    .upsert({
      case_id: caseId,
      user_id: userId,
      reclamante_nome: p.beneficiario,
      reclamante_cpf: p.cpf,
      reclamado_nome: p.reclamado,
      reclamado_cnpj: p.cnpj,
      data_admissao: p.admissao || null,
      data_demissao: p.demissao || null,
      data_ajuizamento: p.ajuizamento || null,
      data_inicio_calculo: p.inicio_calculo || null,
      data_fim_calculo: p.termino_calculo || null,
      divisor_horas: p.carga_horaria || 220,
      status: 'ABERTO',
    }, { onConflict: 'case_id' })
    .select('id')
    .single();

  if (calcError || !calcData) {
    throw new Error(`Falha ao criar cálculo: ${calcError?.message}`);
  }

  const calculoId = calcData.id;

  // 2. Clear existing child data for idempotent re-import
  await Promise.all([
    supabase.from('pjecalc_ocorrencia_calculo').delete().eq('calculo_id', calculoId),
    supabase.from('pjecalc_reflexo_base_verba').delete().in('reflexo_id',
      (await supabase.from('pjecalc_reflexo').select('id').eq('calculo_id', calculoId)).data?.map(r => r.id) || []
    ),
  ]);
  await Promise.all([
    supabase.from('pjecalc_reflexo').delete().eq('calculo_id', calculoId),
    supabase.from('pjecalc_verba_base').delete().eq('calculo_id', calculoId),
    supabase.from('pjecalc_hist_salarial_mes').delete().eq('calculo_id', calculoId),
    supabase.from('pjecalc_hist_salarial').delete().eq('calculo_id', calculoId),
    supabase.from('pjecalc_evento_intervalo').delete().eq('calculo_id', calculoId),
  ]);

  // 3. Insert histórico salarial
  let historicos_inseridos = 0;
  let ocorrencias_hist_inseridas = 0;
  const histIdMap = new Map<string, string>(); // nome → db id

  for (const hist of analysis.historicos_salariais) {
    const { data: histRow, error: histErr } = await supabase
      .from('pjecalc_hist_salarial')
      .insert({
        calculo_id: calculoId,
        nome: hist.nome,
        tipo_variacao: hist.tipo_variacao || 'VARIAVEL',
        incide_fgts: hist.incide_fgts,
        incide_inss: hist.incide_inss,
      })
      .select('id')
      .single();

    if (histErr || !histRow) {
      warnings.push(`Histórico ${hist.nome}: ${histErr?.message}`);
      continue;
    }
    historicos_inseridos++;
    histIdMap.set(hist.nome, histRow.id);

    // Insert monthly occurrences
    if (hist.competencias.length > 0) {
      const monthRows = hist.competencias.map(c => ({
        calculo_id: calculoId,
        hist_salarial_id: histRow.id,
        competencia: c.comp.length === 7 ? `${c.comp}-01` : c.comp,
        valor: c.valor,
        origem: 'PJC_IMPORT',
      }));

      const { error: monthErr } = await supabase
        .from('pjecalc_hist_salarial_mes')
        .insert(monthRows);

      if (monthErr) {
        warnings.push(`Ocorrências hist ${hist.nome}: ${monthErr.message}`);
      } else {
        ocorrencias_hist_inseridas += monthRows.length;
      }
    }
  }

  // 4. Insert faltas as eventos_intervalo
  let faltas_inseridas = 0;
  for (const falta of analysis.faltas) {
    const { error } = await supabase.from('pjecalc_evento_intervalo').insert({
      calculo_id: calculoId,
      tipo: falta.tipo || 'FALTA',
      data_inicio: falta.data_inicio,
      data_fim: falta.data_fim,
      justificado: falta.justificada,
      observacoes: `Importado do PJC`,
    });
    if (!error) faltas_inseridas++;
    else warnings.push(`Falta ${falta.data_inicio}: ${error.message}`);
  }

  // 5. Insert férias as eventos_intervalo
  let ferias_inseridas = 0;
  for (const fer of analysis.ferias) {
    const { error } = await supabase.from('pjecalc_evento_intervalo').insert({
      calculo_id: calculoId,
      tipo: 'FERIAS',
      data_inicio: fer.gozo_inicio || fer.aquisitivo_inicio,
      data_fim: fer.gozo_fim || fer.aquisitivo_fim,
      ferias_aquisitivo_inicio: fer.aquisitivo_inicio || null,
      ferias_aquisitivo_fim: fer.aquisitivo_fim || null,
      ferias_concessivo_inicio: fer.concessivo_inicio || null,
      ferias_concessivo_fim: fer.concessivo_fim || null,
      ferias_dias: fer.dias,
      ferias_abono: fer.abono,
      ferias_dias_abono: fer.dias_abono,
      ferias_dobra: fer.dobra,
      ferias_situacao: fer.situacao,
    });
    if (!error) ferias_inseridas++;
    else warnings.push(`Férias ${fer.aquisitivo_inicio}: ${error.message}`);
  }

  // 6. Insert verbas (Calculada) into pjecalc_verba_base
  let verbas_inseridas = 0;
  const verbaIdMap = new Map<string, string>(); // pjc_id → db_id

  const calculadas = analysis.verbas.filter(v => v.tipo === 'Calculada');
  for (const v of calculadas) {
    const { data: vbRow, error: vbErr } = await supabase
      .from('pjecalc_verba_base')
      .insert({
        calculo_id: calculoId,
        nome: v.nome,
        codigo: v.id,
        caracteristica: v.caracteristica || 'COMUM',
        periodicidade: v.ocorrencia_pagamento || 'MENSAL',
        tipo_variacao: v.variacao || 'VARIAVEL',
        multiplicador: v.formula.multiplicador.valor,
        divisor: v.formula.divisor.valor,
        periodo_inicio: v.periodo_inicio || null,
        periodo_fim: v.periodo_fim || null,
        ordem: v.ordem,
        ativa: v.ativo,
        incide_fgts: v.incidencias.fgts,
        incide_inss: v.incidencias.inss,
        incide_ir: v.incidencias.irpf,
        hist_salarial_nome: v.formula.base_tabelada === 'HISTORICO_SALARIAL' ? 'HISTORICO_SALARIAL' : null,
        observacoes: `PJC import: ${v.descricao || ''} | qty_tipo=${v.formula.quantidade.tipo} qty_val=${v.formula.quantidade.valor}`,
      })
      .select('id')
      .single();

    if (vbErr || !vbRow) {
      warnings.push(`Verba ${v.nome}: ${vbErr?.message}`);
      continue;
    }
    verbas_inseridas++;
    verbaIdMap.set(v.id, vbRow.id);
  }

  // 7. Insert reflexos into pjecalc_reflexo + pjecalc_reflexo_base_verba
  let reflexos_inseridos = 0;
  const reflexos = analysis.verbas.filter(v => v.tipo === 'Reflexo');

  for (const r of reflexos) {
    const { data: refRow, error: refErr } = await supabase
      .from('pjecalc_reflexo')
      .insert({
        calculo_id: calculoId,
        nome: r.nome,
        codigo: r.id,
        tipo: r.caracteristica || 'COMUM',
        comportamento_reflexo: r.comportamento_reflexo || null,
        periodo_media_reflexo: r.periodo_media || null,
        tratamento_fracao_mes: r.tratamento_fracao || null,
        periodo_inicio: r.periodo_inicio || null,
        periodo_fim: r.periodo_fim || null,
        ordem: r.ordem,
        ativa: r.ativo,
        incide_fgts: r.incidencias.fgts,
        incide_inss: r.incidencias.inss,
        incide_ir: r.incidencias.irpf,
        gerar_principal: r.gerar_principal === 'true' || r.gerar_principal === 'DEVIDO',
        gerar_reflexo: r.gerar_reflexo === 'true' || r.gerar_reflexo === 'DEVIDO',
        observacoes: `PJC import | div=${r.formula.divisor.valor} mult=${r.formula.multiplicador.valor}`,
      })
      .select('id')
      .single();

    if (refErr || !refRow) {
      warnings.push(`Reflexo ${r.nome}: ${refErr?.message}`);
      continue;
    }
    reflexos_inseridos++;
    verbaIdMap.set(r.id, refRow.id);

    // Link base_verbas
    for (const bv of r.formula.base_verbas) {
      const dbVerbaId = verbaIdMap.get(bv.id);
      if (!dbVerbaId) {
        warnings.push(`BaseVerba ref ${bv.id} (${bv.nome}) não encontrada no mapa`);
        continue;
      }
      await supabase.from('pjecalc_reflexo_base_verba').insert({
        reflexo_id: refRow.id,
        verba_base_id: dbVerbaId,
        integralizar: bv.integralizar === 'SIM',
      });
    }
  }

  // 8. Insert ocorrências for all verbas
  let ocorrencias_verba_inseridas = 0;
  for (const v of analysis.verbas) {
    const dbId = verbaIdMap.get(v.id);
    if (!dbId) continue;

    // Get all occurrences (not just sample)
    // The analyzer only stores sample, so we use what we have
    const ocorrencias = v.ocorrencias_sample || [];
    if (ocorrencias.length === 0) continue;

    const ocRows = ocorrencias.map((oc: OcorrenciaAnalysis) => ({
      calculo_id: calculoId,
      verba_base_id: v.tipo === 'Calculada' ? dbId : null,
      reflexo_id: v.tipo === 'Reflexo' ? dbId : null,
      tipo: v.nome,
      nome: v.nome,
      competencia: oc.competencia || '2020-01-01',
      base_valor: oc.base,
      multiplicador: oc.multiplicador,
      divisor: oc.divisor,
      quantidade: oc.quantidade,
      dobra: oc.dobra ? 2 : 1,
      devido: oc.devido,
      pago: oc.pago,
      diferenca: oc.devido - oc.pago,
      correcao: 0,
      juros: 0,
      total: oc.devido - oc.pago,
      origem: 'PJC_IMPORT',
      ativa: true,
    }));

    const { error: ocErr } = await supabase
      .from('pjecalc_ocorrencia_calculo')
      .insert(ocRows);

    if (ocErr) {
      warnings.push(`Ocorrências ${v.nome}: ${ocErr.message}`);
    } else {
      ocorrencias_verba_inseridas += ocRows.length;
    }
  }

  // 9. Insert resultado (ground truth from PJC)
  const res = analysis.resultado;
  await supabase.from('pjecalc_resultado').upsert({
    calculo_id: calculoId,
    total_bruto: 0,
    total_liquido_antes_descontos: 0,
    desconto_inss_reclamante: res.inss_reclamante,
    desconto_inss_reclamado: res.inss_reclamado,
    desconto_ir: res.imposto_renda,
    fgts_depositar: res.fgts_deposito,
    honorarios: res.honorarios.reduce((s, h) => s + h.valor, 0),
    custas: res.custas,
    total_reclamante: res.liquido_exequente,
    total_reclamado: 0,
    resumo_verbas: analysis.verbas.map(v => ({
      nome: v.nome,
      tipo: v.tipo,
      total_devido: v.total_devido,
      total_pago: v.total_pago,
      total_diferenca: v.total_diferenca,
    })),
    engine_version: 'PJC_IMPORT',
  }, { onConflict: 'calculo_id' });

  // 10. Popula TODAS as tabelas de configuração (parametros, correcao, fgts, cs,
  //     ir, honorarios, multas, pensao, prev_privada, salario_familia, seguro,
  //     custas) usando o conversor PJC→engine que já normaliza os valores.
  //
  // Isso garante que, ao importar um .PJC, TODOS os módulos da UI venham
  // preenchidos automaticamente — não só verbas/ocorrências.
  // Cada upsert de configuração é isolado em seu próprio runStep para que
  // uma falha em uma tabela (ex: schema desalinhado) NÃO cascateie e bloqueie
  // as próximas — antes do fix, o try/catch único deixava o caso sem params
  // e com a importação falsamente marcada como "concluída com sucesso".
  const runStep = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (stepErr) {
      const msg = stepErr instanceof Error ? stepErr.message : String(stepErr);
      warnings.push(`${label}: ${msg}`);
    }
  };

  try {
    const inputs = convertPjcToEngineInputs(analysis, `pjc-import-${calculoId}`);

    // 10.1 Parâmetros gerais (pjecalc_parametros)
    await runStep('Parâmetros', () => svc.upsertParametros({
      case_id: caseId,
      data_admissao: inputs.params.data_admissao,
      data_demissao: inputs.params.data_demissao ?? null,
      data_ajuizamento: inputs.params.data_ajuizamento,
      data_citacao: inputs.params.data_citacao ?? null,
      data_inicial: inputs.params.data_inicial ?? null,
      data_final: inputs.params.data_final ?? null,
      carga_horaria_padrao: inputs.params.carga_horaria_padrao ?? 220,
      regime_trabalho: inputs.params.regime_trabalho ?? 'tempo_integral',
      estado: inputs.params.estado ?? '',
      municipio: inputs.params.municipio ?? '',
      prescricao_quinquenal: inputs.params.prescricao_quinquenal ?? true,
      prescricao_fgts: inputs.params.prescricao_fgts ?? false,
      projetar_aviso_indenizado: inputs.params.projetar_aviso_indenizado ?? false,
    } as never));

    // 10.2 Correção / Juros (pjecalc_correcao_config)
    await runStep('Correção/Juros', () => svc.upsertCorrecaoConfig({
      case_id: caseId,
      indice: inputs.correcaoConfig.indice,
      epoca: inputs.correcaoConfig.epoca,
      juros_tipo: inputs.correcaoConfig.juros_tipo,
      juros_percentual: inputs.correcaoConfig.juros_percentual,
      juros_inicio: inputs.correcaoConfig.juros_inicio,
      multa_523: inputs.correcaoConfig.multa_523,
      multa_523_percentual: inputs.correcaoConfig.multa_523_percentual,
      data_liquidacao: inputs.correcaoConfig.data_liquidacao,
      combinacoes_indice: inputs.correcaoConfig.combinacoes_indice
        ? JSON.stringify(inputs.correcaoConfig.combinacoes_indice)
        : undefined,
      combinacoes_juros: inputs.correcaoConfig.combinacoes_juros
        ? JSON.stringify(inputs.correcaoConfig.combinacoes_juros)
        : undefined,
      ignorar_taxa_negativa: inputs.correcaoConfig.ignorar_taxa_negativa,
      aplicar_juros_fase_pre_judicial: inputs.correcaoConfig.aplicar_juros_fase_pre_judicial,
      base_de_juros_das_verbas: inputs.correcaoConfig.base_de_juros_das_verbas,
      ente_publico: inputs.correcaoConfig.ente_publico,
    } as never));

    // 10.3 FGTS (pjecalc_fgts_config)
    await runStep('FGTS', () => svc.upsertFgtsConfig({
      case_id: caseId,
      apurar: inputs.fgtsConfig.apurar,
      destino: inputs.fgtsConfig.destino,
      compor_principal: inputs.fgtsConfig.compor_principal,
      aliquota: inputs.fgtsConfig.aliquota ?? 8,
      multa_apurar: inputs.fgtsConfig.multa_apurar,
      multa_tipo: inputs.fgtsConfig.multa_tipo,
      multa_percentual: inputs.fgtsConfig.multa_percentual,
      multa_base: inputs.fgtsConfig.multa_base,
      multa_valor_informado: inputs.fgtsConfig.multa_valor_informado ?? null,
      deduzir_saldo: inputs.fgtsConfig.deduzir_saldo,
      lc110_10: inputs.fgtsConfig.lc110_10,
      lc110_05: inputs.fgtsConfig.lc110_05,
      multa_art_467: inputs.fgtsConfig.multa_art_467 ?? false,
      excluir_aviso_multa: inputs.fgtsConfig.excluir_aviso_multa ?? false,
      perdas_monetarias: inputs.fgtsConfig.perdas_monetarias ?? false,
    } as never));

    // 10.4 Contribuição Social (pjecalc_cs_config)
    await runStep('Contribuição Social', () => svc.upsertCsConfig({
      case_id: caseId,
      apurar_segurado: inputs.csConfig.apurar_segurado,
      cobrar_reclamante: inputs.csConfig.cobrar_reclamante,
      cs_sobre_salarios_pagos: inputs.csConfig.cs_sobre_salarios_pagos,
      aliquota_segurado_tipo: inputs.csConfig.aliquota_segurado_tipo,
      aliquota_segurado_fixa: inputs.csConfig.aliquota_segurado_fixa ?? null,
      limitar_teto: inputs.csConfig.limitar_teto,
      apurar_empresa: inputs.csConfig.apurar_empresa,
      apurar_sat: inputs.csConfig.apurar_sat,
      apurar_terceiros: inputs.csConfig.apurar_terceiros,
      aliquota_empresa_fixa: inputs.csConfig.aliquota_empresa_fixa,
      aliquota_sat_fixa: inputs.csConfig.aliquota_sat_fixa,
      aliquota_terceiros_fixa: inputs.csConfig.aliquota_terceiros_fixa,
      periodos_simples: inputs.csConfig.periodos_simples ?? [],
      cnae: inputs.csConfig.cnae ?? null,
    } as never));

    // 10.5 Imposto de Renda (pjecalc_ir_config)
    await runStep('IR', () => svc.upsertIrConfig({
      case_id: caseId,
      apurar: inputs.irConfig.apurar,
      incidir_sobre_juros: inputs.irConfig.incidir_sobre_juros ?? false,
      cobrar_reclamado: inputs.irConfig.cobrar_reclamado ?? false,
      tributacao_exclusiva_13: inputs.irConfig.tributacao_exclusiva_13 ?? false,
      tributacao_separada_ferias: inputs.irConfig.tributacao_separada_ferias ?? false,
      aplicar_regime_caixa: inputs.irConfig.aplicar_regime_caixa ?? false,
      deduzir_cs: inputs.irConfig.deduzir_cs ?? true,
      deduzir_prev_privada: inputs.irConfig.deduzir_prev_privada ?? true,
      deduzir_pensao: inputs.irConfig.deduzir_pensao ?? true,
      deduzir_honorarios: inputs.irConfig.deduzir_honorarios ?? true,
      aposentado_65: inputs.irConfig.aposentado_65 ?? false,
      dependentes: inputs.irConfig.dependentes ?? 0,
    } as never));

    // 10.6 Honorários (pjecalc_honorarios)
    await runStep('Honorários', () => svc.upsertHonorarios({
      case_id: caseId,
      apurar_sucumbenciais: inputs.honorariosConfig.apurar_sucumbenciais,
      percentual_sucumbenciais: inputs.honorariosConfig.percentual_sucumbenciais,
      base_sucumbenciais: inputs.honorariosConfig.base_sucumbenciais,
      apurar_contratuais: inputs.honorariosConfig.apurar_contratuais,
      percentual_contratuais: inputs.honorariosConfig.percentual_contratuais,
      valor_fixo: inputs.honorariosConfig.valor_fixo ?? null,
      items: inputs.honorariosConfig.items ?? [],
    } as never));

    // 10.7 Custas (pjecalc_custas_config)
    await runStep('Custas', () => svc.upsertCustasConfig({
      case_id: caseId,
      apurar: inputs.custasConfig.apurar,
      tipo_custas: inputs.custasConfig.tipo_custas,
      percentual_custas: inputs.custasConfig.percentual_custas,
      valor_informado: inputs.custasConfig.valor_informado ?? null,
      pagar_reclamado: inputs.custasConfig.pagar_reclamado ?? true,
      isento: inputs.custasConfig.isento ?? false,
    } as never));

    // 10.8 Seguro-Desemprego (pjecalc_seguro_config)
    await runStep('Seguro-Desemprego', () => svc.upsertSeguroConfig(caseId, {
      apurar: inputs.seguroConfig.apurar,
      parcelas: inputs.seguroConfig.parcelas,
      valor_parcela: inputs.seguroConfig.valor_parcela ?? null,
      recebeu: inputs.seguroConfig.recebeu,
      valor_tipo: (inputs.seguroConfig as Record<string, unknown>).valor_tipo ?? 'calculado',
      empregado_domestico: (inputs.seguroConfig as Record<string, unknown>).empregado_domestico ?? false,
      tipo_solicitacao: (inputs.seguroConfig as Record<string, unknown>).tipo_solicitacao ?? 'trabalhador_urbano',
      compor_principal: (inputs.seguroConfig as Record<string, unknown>).compor_principal ?? true,
    }));

    // 10.9 Pensão Alimentícia (pjecalc_pensao_config)
    if (inputs.pensaoConfig) {
      const pensao = inputs.pensaoConfig;
      await runStep('Pensão', () => svc.upsertPensaoConfig(caseId, {
        apurar: pensao.apurar,
        percentual: pensao.percentual,
        incidir_sobre_juros: pensao.incidir_sobre_juros ?? false,
        base: pensao.base ?? 'liquido',
        beneficiario: pensao.beneficiario ?? '',
        observacoes: pensao.observacoes ?? '',
        valor_fixo: pensao.valor_fixo ?? null,
      }));
    }

    // 10.10 Previdência Privada (pjecalc_prev_priv_config)
    if (inputs.prevPrivadaConfig) {
      const prev = inputs.prevPrivadaConfig;
      await runStep('Previdência Privada', () => svc.upsertPrevPrivConfig(caseId, {
        apurar: prev.apurar,
        percentual: prev.percentual,
        base_calculo: prev.base_calculo ?? 'diferenca',
        periodos: (prev as Record<string, unknown>).periodos ?? [],
        observacao: null,
      }));
    }

    // 10.11 Salário-Família (pjecalc_salario_familia_config)
    if (inputs.salarioFamiliaConfig) {
      const sf = inputs.salarioFamiliaConfig;
      await runStep('Salário-Família', () => svc.upsertSalarioFamiliaConfig(caseId, {
        apurar: sf.apurar,
        numero_filhos: sf.numero_filhos,
        filhos_detalhes: sf.filhos_detalhes ?? [],
        observacoes: '',
      }));
    }

    // 10.12 Multas CLT / Indenizações (pjecalc_multas_config).
    // O PJCAnalysis atual não extrai multas explicitamente. Inicializamos
    // com defaults seguros. As multas 467/477 são inferidas pelo usuário
    // via UI (ModuloMultasCLT). Preserva o registro existente caso haja.
    const multasRaw = (analysis as unknown as { multas?: Record<string, unknown> }).multas;
    await runStep('Multas CLT', () => svc.upsertMultasConfig(caseId, {
      apurar_467: Boolean(multasRaw?.apurar_467),
      apurar_477: Boolean(multasRaw?.apurar_477),
      valor_467: (multasRaw?.valor_467 as number) ?? 0,
      valor_477_tipo: (multasRaw?.valor_477_tipo as string) ?? 'salario',
      valor_477_informado: (multasRaw?.valor_477_informado as number | null) ?? null,
      observacoes: '',
      multas_indenizacoes: (multasRaw?.items as unknown[]) ?? [],
    }));
  } catch (cfgErr) {
    // Só captura erros de conversão (convertPjcToEngineInputs). Os upserts
    // individuais agora são isolados por runStep — falhas viram warnings
    // específicos e não bloqueiam os steps subsequentes.
    warnings.push(`Conversão PJC→Engine: ${cfgErr instanceof Error ? cfgErr.message : String(cfgErr)}`);
  }

  return {
    calculo_id: calculoId,
    verbas_inseridas,
    reflexos_inseridos,
    historicos_inseridos,
    ocorrencias_hist_inseridas,
    faltas_inseridas,
    ferias_inseridas,
    ocorrencias_verba_inseridas,
    warnings,
  };
}
