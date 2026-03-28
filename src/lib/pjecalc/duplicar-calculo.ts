// =====================================================
// DUPLICAÇÃO DE CÁLCULO — Clone completo de um caso
// =====================================================

import { supabase } from '@/integrations/supabase/client';

/**
 * Duplicate an entire pjecalc calculation (all tables) for a given case.
 * Creates a new calculation record with duplicado_de pointing to the original.
 *
 * @param caseId - The original case ID to duplicate
 * @param newCaseId - The target case ID for the duplicate
 * @returns The new calculation ID
 */
export async function duplicarCalculo(
  caseId: string,
  newCaseId: string,
): Promise<string> {
  // 1. Read the original calculation
  const { data: original, error: fetchError } = await supabase
    .from('pjecalc_calculos')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();

  if (fetchError || !original) {
    throw new Error(`Cálculo original não encontrado para case_id=${caseId}: ${fetchError?.message}`);
  }

  // 2. Create the duplicate calculation record
  const { data: newCalc, error: insertError } = await supabase
    .from('pjecalc_calculos')
    .insert({
      case_id: newCaseId,
      duplicado_de: original.id,
      // Copy all configurable fields from original
      estado: original.estado,
      municipio: original.municipio,
      data_admissao: original.data_admissao,
      data_demissao: original.data_demissao,
      data_ajuizamento: original.data_ajuizamento,
      data_citacao: original.data_citacao,
      data_inicial: original.data_inicial,
      data_final: original.data_final,
      prescricao_quinquenal: original.prescricao_quinquenal,
      prescricao_fgts: original.prescricao_fgts,
      regime_trabalho: original.regime_trabalho,
      carga_horaria_padrao: original.carga_horaria_padrao,
      maior_remuneracao: original.maior_remuneracao,
      ultima_remuneracao: original.ultima_remuneracao,
      prazo_aviso_previo: original.prazo_aviso_previo,
      prazo_aviso_dias: original.prazo_aviso_dias,
      projetar_aviso_indenizado: original.projetar_aviso_indenizado,
      limitar_avos_periodo: original.limitar_avos_periodo,
      zerar_valor_negativo: original.zerar_valor_negativo,
      sabado_dia_util: original.sabado_dia_util,
      considerar_feriado_estadual: original.considerar_feriado_estadual,
      considerar_feriado_municipal: original.considerar_feriado_municipal,
      tipo_mes: original.tipo_mes,
      numero_processo: original.numero_processo,
      reclamante_nome: original.reclamante_nome,
      reclamante_cpf: original.reclamante_cpf,
      reclamada_nome: original.reclamada_nome,
      reclamada_cnpj: original.reclamada_cnpj,
      vara: original.vara,
      perito: original.perito,
      funcao: original.funcao,
    })
    .select('id')
    .single();

  if (insertError || !newCalc) {
    throw new Error(`Erro ao duplicar cálculo: ${insertError?.message}`);
  }

  const newCalcId = newCalc.id;

  // 3. Copy child tables (historicos, verbas, faltas, ferias, cartao_ponto, configs)
  const childTables = [
    'pjecalc_historico_salarial',
    'pjecalc_verbas',
    'pjecalc_faltas',
    'pjecalc_ferias',
    'pjecalc_cartao_ponto',
  ] as const;

  for (const table of childTables) {
    const { data: rows } = await supabase
      .from(table)
      .select('*')
      .eq('calculo_id', original.id);

    if (rows && rows.length > 0) {
      const newRows = rows.map((row: Record<string, unknown>) => {
        const { id, calculo_id, created_at, updated_at, ...rest } = row;
        return { ...rest, calculo_id: newCalcId };
      });

      await supabase.from(table).insert(newRows);
    }
  }

  // 4. Copy config tables (single-row configs linked to calculo_id)
  const configTables = [
    'pjecalc_fgts_config',
    'pjecalc_cs_config',
    'pjecalc_ir_config',
    'pjecalc_correcao_config',
    'pjecalc_honorarios_config',
    'pjecalc_custas_config',
    'pjecalc_seguro_config',
  ] as const;

  for (const table of configTables) {
    const { data: config } = await supabase
      .from(table)
      .select('*')
      .eq('calculo_id', original.id)
      .maybeSingle();

    if (config) {
      const { id, calculo_id, created_at, updated_at, ...rest } = config as Record<string, unknown>;
      await supabase.from(table).insert({ ...rest, calculo_id: newCalcId });
    }
  }

  return newCalcId;
}
