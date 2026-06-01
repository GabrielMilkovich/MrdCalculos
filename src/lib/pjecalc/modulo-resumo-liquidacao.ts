/**
 * Núcleo de liquidação do "ModuloResumo-direto" (botão Liquidar da aba Resumo).
 * =============================================================================
 *
 * Extraído de `ModuloResumo.tsx:executarLiquidacao` (FASE 2 Addendum 1) para
 * que o caminho que o advogado MAIS clica fique testável de forma fiel — antes
 * ele era uma closure de 400+ linhas dentro do componente, sem teste.
 *
 * Faz: carrega os dados do caso (service + tabelas brutas) → monta os 26
 * argumentos do engine → `validarPreLiquidacao` → (se válido) `liquidar`.
 * NÃO faz UI nem persistência — isso fica no componente, que chama esta função.
 *
 * É a 3ª "cópia" de liquidação do produto (junto de `orchestrator` e
 * `convertPjcToEngineInputs`). O fix de verdade é colapsar as três numa só
 * (backlog pós-go-live, ver docs/FASE2-ORCHESTRATOR-PARIDADE.md). Até lá, esta
 * cópia recebe os mesmos fixes da Fase 2 (split IPCA-E/SELIC + verba inativa)
 * e ganha teste de paridade GOLDEN contra o V3-puro.
 */
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import * as svc from "@/lib/pjecalc/service";
import { parseDobraFromDb } from "@/lib/pjecalc/parse-dobra-from-db";
import { PjeCalcEngineV3 } from "@/lib/pjecalc/engine-v3";
import {
  loadSeguroDesempregoDB,
  loadSalarioFamiliaDBRows,
  loadExcecoesSabado,
  loadSalarioMinimoDB,
} from "@/lib/pjecalc/orchestrator";
import type {
  PjeParametros, PjeHistoricoSalarial, PjeFalta, PjeFerias,
  PjeVerba, PjeCartaoPonto, PjeFGTSConfig, PjeCSConfig,
  PjeIRConfig, PjeCorrecaoConfig, PjeHonorariosConfig,
  PjeCustasConfig, PjeSeguroConfig, PjeLiquidacaoResult,
  PjeIndiceRow, PjeINSSFaixaRow, PjeIRFaixaRow,
  PjeValidationResult,
  PjeExcecaoCargaHoraria,
  PjePrevidenciaPrivadaConfig, PjePensaoConfig, PjeSalarioFamiliaConfig,
} from "@/lib/pjecalc/engine-types";

export interface ResumoLiquidacaoCore {
  /** Resultado da liquidação — `undefined` se a pré-validação bloqueou. */
  result?: PjeLiquidacaoResult;
  preValidation: PjeValidationResult;
  uiWarnings: Array<{ code: string; message: string }>;
}

/**
 * Carrega os dados do caso, monta os inputs do engine e liquida.
 * Espelha 1:1 o que o botão Liquidar fazia inline. Não toca em UI/persistência.
 */
export async function executarLiquidacaoResumoCore(caseId: string): Promise<ResumoLiquidacaoCore> {
  // Load all module data in parallel via service layer
  const [paramsRes, histData, faltasData, feriasData, verbasData, cartaoData, excecoesCargaData] = await Promise.all([
    svc.getParametros(caseId),
    svc.getHistoricoSalarial(caseId),
    svc.getFaltas(caseId),
    svc.getFerias(caseId),
    svc.getVerbas(caseId),
    svc.getCartaoPonto(caseId),
    svc.getExcecoesCarga(caseId),
  ]);

  const [fgtsData, csData, irData, correcaoDataLocal, honorariosData, custasData, seguroData] = await Promise.all([
    svc.getFgtsConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
    svc.getCsConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
    svc.getIrConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
    svc.getCorrecaoConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
    svc.getHonorarios(caseId).then(r => (r || {}) as Record<string, unknown>),
    svc.getCustasConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
    svc.getSeguroConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
  ]);

  const [indicesData, inssFaixasData, irFaixasData, dadosProcessoLocal,
         prevPrivadaData, pensaoData, sfData, feriadosData, multasData,
         seguroDesempregoDBRows, salarioFamiliaDBRows, excecoesSabadoRows,
         salarioMinimoDBRows] = await Promise.all([
    svc.getIndicesCorrecao(),
    svc.getInssFaixas(),
    svc.getIrFaixas(),
    svc.getDadosProcesso(caseId),
    svc.getPrevPrivConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
    svc.getPensaoConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
    svc.getSalarioFamiliaConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
    svc.getFeriados(),
    svc.getMultasConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
    loadSeguroDesempregoDB(),
    loadSalarioFamiliaDBRows(),
    loadExcecoesSabado(caseId),
    loadSalarioMinimoDB(),
  ]);

  if (!paramsRes) throw new Error("Configure os Parâmetros primeiro.");
  if (!verbasData?.length) throw new Error("Adicione pelo menos uma Verba.");

  const params = paramsRes as unknown as PjeParametros;
  params.case_id = caseId;

  const uiWarnings: Array<{ code: string; message: string }> = [];

  if (dadosProcessoLocal?.data_citacao && !params.data_citacao) {
    params.data_citacao = dadosProcessoLocal.data_citacao;
  }

  if (!params.data_citacao) {
    if (params.data_ajuizamento) {
      const ajuiz = new Date(params.data_ajuizamento);
      if (!isNaN(ajuiz.getTime())) {
        const estimada = new Date(ajuiz);
        estimada.setDate(estimada.getDate() + 60);
        params.data_citacao = estimada.toISOString().slice(0, 10);
        uiWarnings.push({
          code: 'W_CITACAO_ESTIMADA',
          message: `data_citacao não informada — usando ajuizamento + 60 dias (${params.data_citacao})`,
        });
      }
    } else {
      uiWarnings.push({
        code: 'W_CITACAO_E_AJUIZAMENTO_AUSENTES',
        message: 'Datas processuais não informadas — correção sem split IPCA-E/SELIC',
      });
    }
  }

  if (!params.ultima_remuneracao && histData?.length) {
    const somaHistoricos = histData.reduce((sum: number, h) => sum + (Number(h.valor_informado) || 0), 0);
    if (somaHistoricos > 0) params.ultima_remuneracao = somaHistoricos;
  }

  const histIds = histData.map(h => h.id);
  const histOcorrencias = await svc.getHistoricoOcorrenciasByIds(histIds);

  const historicos = histData.map((h) => ({
    ...(h as unknown as PjeHistoricoSalarial),
    periodo_inicio: h.periodo_inicio || params.data_inicial || params.data_admissao,
    periodo_fim: h.periodo_fim || params.data_final || params.data_demissao,
    ocorrencias: histOcorrencias
      .filter((o) => (o as Record<string, unknown>).historico_id === h.id)
      .map((o) => {
        const oc = o as Record<string, unknown>;
        return { id: oc.id as string, historico_id: oc.historico_id as string, competencia: oc.competencia as string, valor: Number(oc.valor), tipo: ((oc.tipo as string) || 'calculado') as 'calculado' | 'informado' };
      }),
  }));
  const faltas = faltasData as unknown as PjeFalta[];
  const ferias = feriasData as unknown as PjeFerias[];

  const cartaoPonto: PjeCartaoPonto[] = cartaoData.map((r) => ({
    competencia: r.competencia,
    dias_uteis: r.dias_uteis || 22,
    dias_trabalhados: r.dias_trabalhados || 22,
    horas_extras_50: r.horas_extras_50 || 0,
    horas_extras_100: r.horas_extras_100 || 0,
    horas_noturnas: r.horas_noturnas || 0,
    intervalo_suprimido: r.intervalo_suprimido || 0,
    dsr_horas: r.dsr_horas || 0,
    sobreaviso: r.sobreaviso || 0,
  }));

  // Bug #16 + FASE 2 fix (Grade load quebrado): carrega as ocorrências da Grade
  // (precomputadas do PJC) ANTES de instanciar o engine. A tabela
  // pjecalc_ocorrencia_calculo é chaveada por `calculo_id` — NÃO tem coluna
  // `case_id`. A query antiga por `case_id` retornava vazio (coluna inexistente),
  // fazendo o engine cair em preencherOcorrenciasFromScratch e INFLAR
  // massivamente casos PJC importados (ex.: leide-santana +120%). Buscamos o
  // calculo_id primeiro e filtramos por ele.
  const { data: calcRowGrade } = await supabase.from("pjecalc_calculos")
    .select("id").eq("case_id", caseId).maybeSingle();
  const calculoIdGrade = calcRowGrade ? (calcRowGrade as { id: string }).id : null;
  const { data: ocsGradeRaw } = calculoIdGrade
    ? await fromUntyped("pjecalc_ocorrencia_calculo")
        .select("*").eq("calculo_id", calculoIdGrade).eq("ativa", true)
    : { data: [] as Record<string, unknown>[] };
  const ocsGrade = (ocsGradeRaw as Record<string, unknown>[]) || [];
  const ocsPorVerba = new Map<string, Array<{
    competencia: string; base: number; divisor: number; multiplicador: number;
    quantidade: number; dobra: boolean; devido: number; pago: number;
  }>>();
  for (const oc of ocsGrade) {
    const verbaId = (oc.verba_base_id ?? oc.reflexo_id) as string | null;
    if (!verbaId) continue;
    const compRaw = oc.competencia as string | null;
    const competencia = compRaw ? compRaw.slice(0, 7) : "";
    if (!competencia) continue;
    const arr = ocsPorVerba.get(verbaId) ?? [];
    arr.push({
      competencia,
      base: Number(oc.base_valor) || 0,
      divisor: Number(oc.divisor) || 1,
      multiplicador: Number(oc.multiplicador) || 1,
      quantidade: Number(oc.quantidade) || 0,
      dobra: parseDobraFromDb(oc.dobra),
      devido: Number(oc.devido) || 0,
      pago: Number(oc.pago) || 0,
    });
    ocsPorVerba.set(verbaId, arr);
  }

  // FASE 2 fix (verba inativa): descarta Calculadas ativa=false, espelhando o
  // V3-puro (pjc-to-engine:154) e o orchestrator (toEngineVerbas). O import PJC
  // grava todas as Calculadas, inclusive as desativadas — incluí-las inflava o
  // principal. `toEngineReflexos`/engine já tratam reflexos inativos à parte.
  const verbas = verbasData.filter((v) => v.ativa !== false).map((v) => {
    const ocs = ocsPorVerba.get((v as { id: string }).id);
    return {
      ...(v as unknown as PjeVerba),
      ocorrencias_precomputadas: ocs && ocs.length > 0 ? ocs : undefined,
      base_calculo: {
        historicos: (v as Record<string, any>).base_calculo?.historicos || [],
        verbas: (v as Record<string, any>).base_calculo?.verbas || [],
        tabelas: (v as Record<string, any>).base_calculo?.tabelas || ['ultima_remuneracao'],
        proporcionalizar: (v as Record<string, any>).base_calculo?.proporcionalizar ?? false,
        integralizar: (v as Record<string, any>).base_calculo?.integralizar ?? false,
      },
      exclusoes: (v as Record<string, any>).exclusoes || { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: false },
      incidencias: (v as Record<string, any>).incidencias || { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
      juros_ajuizamento: (v as Record<string, any>).juros_ajuizamento || 'ocorrencias_vencidas',
      gerar_verba_reflexa: (v as Record<string, any>).gerar_verba_reflexa || 'diferenca',
      gerar_verba_principal: (v as Record<string, any>).gerar_verba_principal || 'diferenca',
      valor: v.valor || 'calculado',
      tipo_divisor: (v as Record<string, any>).tipo_divisor || 'informado',
      tipo_quantidade: (v as Record<string, any>).tipo_quantidade || 'informada',
      quantidade_proporcionalizar: (v as Record<string, any>).quantidade_proporcionalizar || false,
      dobrar_valor_devido: (v as Record<string, any>).dobrar_valor_devido || false,
      zerar_valor_negativo: (v as Record<string, any>).zerar_valor_negativo || false,
      compor_principal: (v as Record<string, any>).compor_principal ?? true,
      divisor_informado: v.divisor_informado || 30,
      multiplicador: v.multiplicador || 1,
      quantidade_informada: (v as Record<string, any>).quantidade_informada || 1,
    };
  });

  const d = (obj: Record<string, unknown>, key: string, fallback: unknown = undefined) => obj[key] ?? fallback;

  const fgtsConfig = {
    apurar: d(fgtsData, 'apurar', true), destino: d(fgtsData, 'destino', 'pagar_reclamante'),
    compor_principal: d(fgtsData, 'compor_principal', true), multa_apurar: d(fgtsData, 'multa_apurar', true),
    multa_tipo: d(fgtsData, 'multa_tipo', 'calculada'), multa_percentual: d(fgtsData, 'multa_percentual', 40),
    multa_base: d(fgtsData, 'multa_base', 'devido'), multa_valor_informado: d(fgtsData, 'multa_valor_informado'),
    saldos_saques: d(fgtsData, 'saldos_saques', []), deduzir_saldo: d(fgtsData, 'deduzir_saldo', false),
    lc110_10: d(fgtsData, 'lc110_10', false), lc110_05: d(fgtsData, 'lc110_05', false),
  } as PjeFGTSConfig;

  const csConfig = {
    apurar_segurado: d(csData, 'apurar_segurado', true), cobrar_reclamante: d(csData, 'cobrar_reclamante', true),
    cs_sobre_salarios_pagos: d(csData, 'cs_sobre_salarios_pagos', false),
    aliquota_segurado_tipo: d(csData, 'aliquota_segurado_tipo', 'empregado'),
    aliquota_segurado_fixa: d(csData, 'aliquota_segurado_fixa'), limitar_teto: d(csData, 'limitar_teto', true),
    apurar_empresa: d(csData, 'apurar_empresa', true), apurar_sat: d(csData, 'apurar_sat', true),
    apurar_terceiros: d(csData, 'apurar_terceiros', true), aliquota_empregador_tipo: 'fixa',
    aliquota_empresa_fixa: d(csData, 'aliquota_empresa_fixa', 20),
    aliquota_sat_fixa: d(csData, 'aliquota_sat_fixa', 2),
    aliquota_terceiros_fixa: d(csData, 'aliquota_terceiros_fixa', 5.8),
    periodos_simples: d(csData, 'periodos_simples', []),
  } as PjeCSConfig;

  const irConfig = {
    apurar: d(irData, 'apurar', true), incidir_sobre_juros: d(irData, 'incidir_sobre_juros', false),
    cobrar_reclamado: d(irData, 'cobrar_reclamado', false), tributacao_exclusiva_13: d(irData, 'tributacao_exclusiva_13', true),
    tributacao_separada_ferias: d(irData, 'tributacao_separada_ferias', false), deduzir_cs: d(irData, 'deduzir_cs', true),
    deduzir_prev_privada: d(irData, 'deduzir_prev_privada', false), deduzir_pensao: d(irData, 'deduzir_pensao', false),
    deduzir_honorarios: d(irData, 'deduzir_honorarios', false), aposentado_65: d(irData, 'aposentado_65', false),
    dependentes: d(irData, 'dependentes', 0),
  } as PjeIRConfig;

  // Load combination-by-date data from pjecalc_atualizacao_config
  let combinacoesIndice: unknown[] | undefined;
  let combinacoesJuros: unknown[] | undefined;
  {
    const { data: calculoRow2 } = await supabase.from("pjecalc_calculos").select("id").eq("case_id", caseId).maybeSingle();
    if (calculoRow2) {
      const calculoIdLocal = (calculoRow2 as { id: string }).id;
      const { data: atConfigs } = await supabase
        .from("pjecalc_atualizacao_config" as never)
        .select("*").eq("calculo_id", calculoIdLocal);
      if (atConfigs) {
        type AtConfig = { tipo: string; combinacoes_indice?: string; combinacoes_juros?: string };
        for (const ac of atConfigs as unknown as AtConfig[]) {
          if (ac.tipo === 'correcao' && ac.combinacoes_indice) {
            try { combinacoesIndice = JSON.parse(ac.combinacoes_indice); } catch { /* ignore */ }
            if (!combinacoesJuros && ac.combinacoes_juros) {
              try { combinacoesJuros = JSON.parse(ac.combinacoes_juros); } catch { /* ignore */ }
            }
          }
        }
      }
    }
  }

  // FASE 2 fix (mesmo do orchestrator): import PJC grava combinacoes em
  // pjecalc_correcao_config, não em pjecalc_atualizacao_config. Sem este
  // fallback o ModuloResumo perdia o split IPCA-E/SELIC em casos importados.
  const ciRaw = correcaoDataLocal.combinacoes_indice;
  if ((!combinacoesIndice || combinacoesIndice.length === 0) && ciRaw) {
    try { combinacoesIndice = typeof ciRaw === 'string' ? JSON.parse(ciRaw) : (ciRaw as unknown[]); } catch { /* ignore */ }
  }
  const cjRaw = correcaoDataLocal.combinacoes_juros;
  if ((!combinacoesJuros || combinacoesJuros.length === 0) && cjRaw) {
    try { combinacoesJuros = typeof cjRaw === 'string' ? JSON.parse(cjRaw) : (cjRaw as unknown[]); } catch { /* ignore */ }
  }

  const correcaoConfigLocal = {
    indice: correcaoDataLocal.indice || 'IPCA-E', epoca: correcaoDataLocal.epoca || 'mensal',
    data_fixa: correcaoDataLocal.data_fixa,
    juros_tipo: correcaoDataLocal.juros_tipo || 'simples_mensal',
    juros_percentual: correcaoDataLocal.juros_percentual ?? 1,
    juros_inicio: correcaoDataLocal.juros_inicio || 'ajuizamento',
    multa_523: correcaoDataLocal.multa_523 ?? false, multa_523_percentual: correcaoDataLocal.multa_523_percentual ?? 10,
    multa_467: d(multasData, 'apurar_467', false), multa_467_percentual: d(multasData, 'percentual_467', 50),
    data_liquidacao: correcaoDataLocal.data_liquidacao || new Date().toISOString().slice(0, 10),
    combinacoes_indice: combinacoesIndice,
    combinacoes_juros: combinacoesJuros,
    combinar_indice: combinacoesIndice && combinacoesIndice.length > 0 ? true : undefined,
    combinar_juros: combinacoesJuros && combinacoesJuros.length > 0 ? true : undefined,
    juros_pre_judicial: (correcaoDataLocal as Record<string, unknown>).aplicar_juros_fase_pre_judicial as boolean ?? true,
    juros_apos_deducao_cs: true,
  } as PjeCorrecaoConfig;

  const honorariosConfig = {
    apurar_sucumbenciais: d(honorariosData, 'apurar_sucumbenciais', true),
    percentual_sucumbenciais: d(honorariosData, 'percentual_sucumbenciais', 15),
    base_sucumbenciais: d(honorariosData, 'base_sucumbenciais', 'condenacao'),
    apurar_contratuais: d(honorariosData, 'apurar_contratuais', false),
    percentual_contratuais: d(honorariosData, 'percentual_contratuais', 20),
    valor_fixo: d(honorariosData, 'valor_fixo'),
  } as PjeHonorariosConfig;

  const custasConfigLocal = {
    apurar: d(custasData, 'apurar', true), percentual: d(custasData, 'percentual', 2),
    valor_minimo: d(custasData, 'valor_minimo', 10.64), valor_maximo: d(custasData, 'valor_maximo'),
    isento: d(custasData, 'isento', false), assistencia_judiciaria: d(custasData, 'assistencia_judiciaria', false),
    itens: d(custasData, 'itens', []),
  } as PjeCustasConfig;

  const seguroConfig = {
    apurar: d(seguroData, 'apurar', false), parcelas: d(seguroData, 'parcelas', 5),
    valor_parcela: d(seguroData, 'valor_parcela'), recebeu: d(seguroData, 'recebeu', false),
  } as PjeSeguroConfig;

  const prevPrivadaConfig = {
    apurar: d(prevPrivadaData, 'apurar', false), percentual: d(prevPrivadaData, 'percentual', 0),
    base_calculo: d(prevPrivadaData, 'base_calculo', 'diferenca'), deduzir_ir: d(prevPrivadaData, 'deduzir_ir', false),
  } as PjePrevidenciaPrivadaConfig;

  const pensaoConfig = {
    apurar: d(pensaoData, 'apurar', false), percentual: d(pensaoData, 'percentual', 0),
    valor_fixo: d(pensaoData, 'valor_fixo'), base: d(pensaoData, 'base', 'liquido'),
    incidir_sobre_juros: d(pensaoData, 'incidir_sobre_juros', false),
    incidencia_sobre_fgts: d(pensaoData, 'incidencia_sobre_fgts', false),
    incidencia_sobre_multa_fgts: d(pensaoData, 'incidencia_sobre_multa_fgts', false),
    descontar_antes_ir: d(pensaoData, 'descontar_antes_ir', true),
  } as PjePensaoConfig;

  const salarioFamiliaConfig = {
    apurar: d(sfData, 'apurar', false), numero_filhos: d(sfData, 'numero_filhos', 0),
    filhos_detalhes: d(sfData, 'filhos_detalhes'),
  } as PjeSalarioFamiliaConfig;

  const feriadosDB = feriadosData.map((f) => ({
    data: f.data as string, nome: f.nome as string, tipo: (f.tipo as string) || 'nacional',
    uf: f.uf as string | undefined, municipio: f.municipio as string | undefined,
  }));

  const indicesDB: PjeIndiceRow[] = indicesData.map((i) => ({
    indice: i.indice as string, competencia: i.competencia as string,
    valor: Number(i.valor), acumulado: Number(i.acumulado || 0),
  }));

  const faixasINSSDB: PjeINSSFaixaRow[] = inssFaixasData.map((f) => ({
    competencia_inicio: f.competencia_inicio as string, competencia_fim: f.competencia_fim as string,
    faixa: f.faixa as number, valor_ate: Number(f.valor_ate), aliquota: Number(f.aliquota),
  }));

  const faixasIRDB: PjeIRFaixaRow[] = irFaixasData.map((f) => ({
    competencia_inicio: f.competencia_inicio as string, competencia_fim: f.competencia_fim as string,
    faixa: f.faixa as number, valor_ate: Number(f.valor_ate), aliquota: Number(f.aliquota),
    deducao: Number(f.deducao), deducao_dependente: Number(f.deducao_dependente),
  }));

  const verbasCast = verbas.map(v => ({ ...v, valor: v.valor as "calculado" | "informado" }));
  const atualizacaoRaw = (correcaoDataLocal as Record<string, unknown>).atualizacao as Record<string, unknown> | undefined;
  const atualizacaoConfig = atualizacaoRaw ? {
    aplicar_pensao: atualizacaoRaw.aplicar_pensao as boolean ?? false,
    aplicar_multas_indenizacoes: atualizacaoRaw.aplicar_multas_indenizacoes as boolean ?? false,
    aplicar_honorarios: atualizacaoRaw.aplicar_honorarios as boolean ?? false,
    aplicar_custas: atualizacaoRaw.aplicar_custas as boolean ?? false,
  } : {};
  const excecoesCargas: PjeExcecaoCargaHoraria[] = (excecoesCargaData ?? []).map((e) => ({
    periodo_inicio: e.periodo_inicio,
    periodo_fim: e.periodo_fim,
    carga_horaria_mensal: Number(e.carga_horaria_mensal) || 0,
  }));

  const multasConfigLocal = {
    apurar_467: d(multasData, 'apurar_467', false) as boolean,
    apurar_477: d(multasData, 'apurar_477', false) as boolean,
    percentual_467: d(multasData, 'percentual_467', 50) as number,
    valor_477_tipo: d(multasData, 'valor_477_tipo', 'salario') as 'salario' | 'informado',
    valor_477_informado: d(multasData, 'valor_477_informado') as number | undefined,
    apurar_523_cpc: d(multasData, 'apurar_523_cpc', false) as boolean,
    percentual_523: d(multasData, 'percentual_523', 10) as number,
    multas_indenizacoes: d(multasData, 'multas_indenizacoes', []) as Array<unknown>,
  };

  const engine = new PjeCalcEngineV3(
    params, historicos, faltas, ferias, verbasCast, cartaoPonto,
    fgtsConfig, csConfig, irConfig, correcaoConfigLocal,
    honorariosConfig, custasConfigLocal, seguroConfig,
    indicesDB, faixasINSSDB, faixasIRDB,
    excecoesCargas,
    feriadosDB.map(f => ({ ...f, tipo: f.tipo as "estadual" | "facultativo" | "municipal" | "nacional" })),
    prevPrivadaConfig,
    pensaoConfig,
    salarioFamiliaConfig,
    seguroDesempregoDBRows,
    salarioFamiliaDBRows,
    excecoesSabadoRows,
    salarioMinimoDBRows,
    multasConfigLocal,
    atualizacaoConfig,
  );

  const preValidation = engine.validarPreLiquidacao();
  if (!preValidation.valido) {
    return { preValidation, uiWarnings };
  }

  const result = engine.liquidar();
  if (uiWarnings.length > 0) {
    result.warnings = uiWarnings;
  }

  return { result, preValidation, uiWarnings };
}
