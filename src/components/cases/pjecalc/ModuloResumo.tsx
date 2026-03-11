import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Loader2, FileBarChart, Printer, FileCode, AlertTriangle, CheckCircle2, Info, XCircle, Lock, Unlock, Copy, MoreVertical, FileText, FileSpreadsheet, ClipboardCheck, GitCompareArrows, Download, Gavel } from "lucide-react";
import { PainelRevisao } from "./PainelRevisao";
import { MemoriaCalculoExpandida } from "./MemoriaCalculoExpandida";
import { ComparacaoCenarios } from "./ComparacaoCenarios";
import { calcularCompletude } from "@/lib/pjecalc/completude";
import * as svc from "@/lib/pjecalc/service";
import {
  PjeCalcEngine,
  type PjeParametros, type PjeHistoricoSalarial, type PjeFalta, type PjeFerias,
  type PjeVerba, type PjeCartaoPonto, type PjeFGTSConfig, type PjeCSConfig,
  type PjeIRConfig, type PjeCorrecaoConfig, type PjeHonorariosConfig,
  type PjeCustasConfig, type PjeSeguroConfig, type PjeLiquidacaoResult,
  type PjeIndiceRow, type PjeINSSFaixaRow, type PjeIRFaixaRow,
  type PjeValidationResult,
  type PjeExcecaoCargaHoraria, type PjeFeriadoDB,
  type PjePrevidenciaPrivadaConfig, type PjePensaoConfig, type PjeSalarioFamiliaConfig,
} from "@/lib/pjecalc/engine";
import { gerarRelatorioPDF } from "@/lib/pjecalc/pdf-report";
import { gerarRelatorioMemoriaCalculo } from "@/lib/pjecalc/pdf-report-memoria";
import { gerarRelatorioDiferenca } from "@/lib/pjecalc/pdf-report-diferenca";
import { gerarRelatorioCriteriosLegais } from "@/lib/pjecalc/relatorio-criterios";
import { gerarRelatorioConsolidado } from "@/lib/pjecalc/pdf-report-consolidado";
import { gerarRelatorioCompleto, downloadRelatorioCompleto } from "@/lib/pjecalc/pdf-report-completo";
import { downloadXML } from "@/lib/pjecalc/xml-export";
import { fecharCalculo, reabrirCalculo, duplicarCalculo } from "@/lib/pjecalc/calc-operations";
import { RelatorioConsolidado } from "./RelatorioConsolidado";

interface Props { caseId: string; }

export function ModuloResumo({ caseId }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'resumo' | 'memoria' | 'revisao' | 'comparacao' | 'paridade'>('resumo');
  const [liquidando, setLiquidando] = useState(false);
  const [validacao, setValidacao] = useState<PjeValidationResult | null>(null);
  const [operando, setOperando] = useState(false);

  const { data: caseData } = useQuery({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const { data } = await supabase.from("cases").select("*").eq("id", caseId).maybeSingle();
      return data;
    },
  });

  // Load additional data for comprehensive report
  const { data: paramsData } = useQuery({
    queryKey: ["pjecalc_parametros_report", caseId],
    queryFn: () => svc.getParametros(caseId),
  });

  const { data: correcaoData } = useQuery({
    queryKey: ["pjecalc_correcao_report", caseId],
    queryFn: () => svc.getCorrecaoConfig(caseId),
  });

  const { data: atualizacaoData = [] } = useQuery({
    queryKey: ["pjecalc_atualizacao_config_report", caseId],
    queryFn: () => svc.getAtualizacaoConfig(caseId),
  });

  const { data: dadosProcessoData } = useQuery({
    queryKey: ["pjecalc_dados_processo_report", caseId],
    queryFn: () => svc.getDadosProcesso(caseId),
  });

  const { data: resultado } = useQuery({
    queryKey: ["pjecalc_liquidacao", caseId],
    queryFn: () => svc.getResultado(caseId),
  });

  // Load verbas to get verba_principal_id linkage for hierarchical display
  const { data: verbasDB = [] } = useQuery({
    queryKey: ["pjecalc_verbas", caseId],
    queryFn: () => svc.getVerbas(caseId),
  });

  // Load faltas, férias and histórico for report sections
  const { data: faltasForReport = [] } = useQuery({
    queryKey: ["pjecalc_faltas_report", caseId],
    queryFn: () => svc.getFaltas(caseId),
  });
  const { data: feriasForReport = [] } = useQuery({
    queryKey: ["pjecalc_ferias_report", caseId],
    queryFn: () => svc.getFerias(caseId),
  });
  const { data: histForReport = [] } = useQuery({
    queryKey: ["pjecalc_hist_report", caseId],
    queryFn: () => svc.getHistoricoSalarial(caseId),
  });


  // parityData is computed below after `res` is derived

  const executarLiquidacao = async () => {
    setLiquidando(true);
    setValidacao(null);
    try {
      // Load all module data in parallel via service layer
      const [paramsRes, histData, faltasData, feriasData, verbasData, cartaoData] = await Promise.all([
        svc.getParametros(caseId),
        svc.getHistoricoSalarial(caseId),
        svc.getFaltas(caseId),
        svc.getFerias(caseId),
        svc.getVerbas(caseId),
        svc.getCartaoPonto(caseId),
      ]);

      // Load config tables in parallel
      const [fgtsData, csData, irData, correcaoDataLocal, honorariosData, custasData, seguroData] = await Promise.all([
        svc.getFgtsConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
        svc.getCsConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
        svc.getIrConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
        svc.getCorrecaoConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
        svc.getHonorarios(caseId).then(r => (r || {}) as Record<string, unknown>),
        svc.getCustasConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
        svc.getSeguroConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
      ]);

      // ── Fase 1: Carregar dados do banco (séries históricas e tabelas versionadas) ──
      const [indicesData, inssFaixasData, irFaixasData, dadosProcessoLocal,
             prevPrivadaData, pensaoData, sfData, feriadosData, multasData] = await Promise.all([
        svc.getIndicesCorrecao(),
        svc.getInssFaixas(),
        svc.getIrFaixas(),
        svc.getDadosProcesso(caseId),
        svc.getPrevPrivConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
        svc.getPensaoConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
        svc.getSalarioFamiliaConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
        svc.getFeriados(),
        svc.getMultasConfig(caseId).then(r => (r || {}) as Record<string, unknown>),
      ]);

      if (!paramsRes) throw new Error("Configure os Parâmetros primeiro.");
      if (!verbasData?.length) throw new Error("Adicione pelo menos uma Verba.");

      const params = paramsRes as unknown as PjeParametros;
      params.case_id = caseId;

      // Preencher data_citacao dos Dados do Processo se disponível
      if (dadosProcessoLocal?.data_citacao && !params.data_citacao) {
        params.data_citacao = dadosProcessoLocal.data_citacao;
      }

      // Calcular ultima_remuneracao a partir dos historicos se não informada
      if (!params.ultima_remuneracao && histData?.length) {
        const somaHistoricos = histData.reduce((sum: number, h) => {
          return sum + (Number(h.valor_informado) || 0);
        }, 0);
        if (somaHistoricos > 0) params.ultima_remuneracao = somaHistoricos;
      }

      // Load historico ocorrencias per historico
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

      const verbas = verbasData.map((v) => ({
        ...(v as unknown as PjeVerba),
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
      }));

      // Cast config objects to engine types (DB schema → engine interface bridge)
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
      let combinacoesIndice: any[] | undefined;
      let combinacoesJuros: any[] | undefined;
      {
        const { data: calculoRow2 } = await supabase.from("pjecalc_calculos").select("id").eq("case_id", caseId).maybeSingle();
        if (calculoRow2) {
          const { data: atConfigs } = await supabase.from("pjecalc_atualizacao_config" as any)
            .select("*").eq("calculo_id", (calculoRow2 as any).id);
          if (atConfigs) {
            for (const ac of atConfigs as any[]) {
              if (ac.tipo === 'correcao' && ac.combinacoes_indice) {
                try { combinacoesIndice = JSON.parse(ac.combinacoes_indice); } catch {}
                if (!combinacoesJuros && ac.combinacoes_juros) {
                  try { combinacoesJuros = JSON.parse(ac.combinacoes_juros); } catch {}
                }
              }
            }
          }
        }
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
        juros_apos_deducao_cs: true, // PJe-Calc Criterion 8: juros após dedução CS
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

      // Execute engine com TODOS os dados
      const verbasCast = verbas.map(v => ({ ...v, valor: v.valor as "calculado" | "informado" }));
      const engine = new PjeCalcEngine(
        params, historicos, faltas, ferias, verbasCast, cartaoPonto,
        fgtsConfig, csConfig, irConfig, correcaoConfigLocal,
        honorariosConfig, custasConfigLocal, seguroConfig,
        indicesDB, faixasINSSDB, faixasIRDB,
        [], // excecoesCargas (TODO: load if table exists)
        feriadosDB.map(f => ({ ...f, tipo: f.tipo as "estadual" | "facultativo" | "municipal" | "nacional" })),
        prevPrivadaConfig,
        pensaoConfig,
        salarioFamiliaConfig,
      );

      // ── Validação pré-liquidação ──
      const preValidation = engine.validarPreLiquidacao();
      setValidacao(preValidation);

      if (!preValidation.valido) {
        toast.error(`Liquidação bloqueada: ${preValidation.erros} erro(s) crítico(s) encontrado(s)`);
        return;
      }

      if (preValidation.alertas > 0) {
        toast.warning(`${preValidation.alertas} alerta(s) encontrado(s) — liquidação prosseguindo`);
      }

      const result = engine.liquidar();

      // Get calculo_id from pjecalc_calculos (real table)
      const { data: calculoRow } = await supabase
        .from("pjecalc_calculos")
        .select("id")
        .eq("case_id", caseId)
        .maybeSingle();
      
      if (!calculoRow) throw new Error("Cálculo não encontrado. Execute 'Sincronizar Dados' primeiro.");
      const calculoId = (calculoRow as any).id;

      // Delete previous resultado if exists
      await supabase.from("pjecalc_resultado" as any).delete().eq("calculo_id", calculoId);

      // Persist resultado to REAL table (pjecalc_resultado)
      const { error: resError } = await supabase.from("pjecalc_resultado" as any).insert({
        calculo_id: calculoId,
        total_bruto: result.resumo.principal_bruto,
        total_diferenca: result.resumo.principal_bruto,
        total_correcao: result.resumo.principal_corrigido - result.resumo.principal_bruto,
        total_juros: result.resumo.juros_mora,
        total_liquido_antes_descontos: result.resumo.principal_corrigido + result.resumo.juros_mora,
        desconto_inss_reclamante: result.contribuicao_social.total_segurado,
        desconto_ir: result.imposto_renda.imposto_devido,
        desconto_inss_reclamado: result.contribuicao_social.total_empregador,
        honorarios: result.resumo.honorarios_sucumbenciais + result.resumo.honorarios_contratuais,
        custas: result.resumo.custas,
        fgts_depositar: result.fgts.total_depositos,
        fgts_multa_40: result.fgts.multa_valor,
        total_reclamante: result.resumo.liquido_reclamante,
        total_reclamado: result.resumo.total_reclamada,
        engine_version: '2.1.0',
        resumo_verbas: result as any,
      });
      if (resError) console.error("Erro ao persistir resultado:", resError);

      // ── Persistir ocorrências calculadas na tabela REAL (pjecalc_ocorrencia_calculo) ──
      const ocRows: any[] = [];
      for (const vr of result.verbas) {
        for (const oc of vr.ocorrencias) {
          ocRows.push({
            calculo_id: calculoId,
            verba_base_id: vr.verba_id,
            tipo: vr.tipo || 'principal',
            nome: vr.nome,
            competencia: oc.competencia + '-01', // date format
            base_valor: oc.base,
            divisor: oc.divisor,
            multiplicador: oc.multiplicador,
            quantidade: oc.quantidade,
            dobra: oc.dobra,
            devido: oc.devido,
            pago: oc.pago,
            diferenca: oc.diferenca,
            correcao: oc.valor_corrigido - oc.diferenca,
            juros: oc.juros,
            total: oc.valor_final,
            origem: 'CALCULADA',
            ativa: true,
          });
        }
      }
      if (ocRows.length > 0) {
        // Delete existing CALCULADA rows
        await supabase.from("pjecalc_ocorrencia_calculo" as any)
          .delete()
          .eq("calculo_id", calculoId)
          .eq("origem", "CALCULADA");
        // Insert in batches of 500
        for (let i = 0; i < ocRows.length; i += 500) {
          const { error: ocErr } = await supabase.from("pjecalc_ocorrencia_calculo" as any).insert(ocRows.slice(i, i + 500));
          if (ocErr) console.error("Erro ao persistir ocorrências:", ocErr);
        }
      }

      qc.invalidateQueries({ queryKey: ["pjecalc_liquidacao", caseId] });
      toast.success("Liquidação executada com sucesso!");
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    } finally {
      setLiquidando(false);
    }
  };

  const res = (resultado?.resultado as unknown as PjeLiquidacaoResult) || null;
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const isFechado = resultado?.status === 'fechado';
  const reportMeta = {
    cliente: caseData?.cliente,
    processo: caseData?.numero_processo,
    dataLiquidacao: resultado?.data_liquidacao,
    engineVersion: resultado?.engine_version,
  };
  // Parse combination-by-date data for report criteria
  const correcaoAtConfig = atualizacaoData.find((a: any) => a.tipo === 'correcao');
  let correcaoCombinacoes: any[] | undefined;
  let jurosCombinacoes: any[] | undefined;
  if (correcaoAtConfig?.combinacoes_indice) {
    try {
      correcaoCombinacoes = typeof correcaoAtConfig.combinacoes_indice === 'string'
        ? JSON.parse(correcaoAtConfig.combinacoes_indice) : correcaoAtConfig.combinacoes_indice;
    } catch { /* ignore */ }
  }
  if (correcaoAtConfig?.combinacoes_juros) {
    try {
      jurosCombinacoes = typeof correcaoAtConfig.combinacoes_juros === 'string'
        ? JSON.parse(correcaoAtConfig.combinacoes_juros) : correcaoAtConfig.combinacoes_juros;
    } catch { /* ignore */ }
  }

  const reportMetaCompleto = {
    ...reportMeta,
    reclamado: dadosProcessoData?.reclamado || '',
    vara: dadosProcessoData?.vara || caseData?.tribunal || '',
    perito: dadosProcessoData?.perito || '',
    dataAdmissao: paramsData?.data_admissao || '',
    dataDemissao: paramsData?.data_demissao || '',
    dataAjuizamento: paramsData?.data_ajuizamento || '',
    dataInicioCalculo: paramsData?.data_inicial || '',
    dataFimCalculo: paramsData?.data_final || '',
    funcao: dadosProcessoData?.funcao || '',
    uf: paramsData?.estado || '',
    municipio: paramsData?.municipio || '',
    cargaHoraria: paramsData?.carga_horaria_padrao || 220,
    sabadoDiaUtil: paramsData?.sabado_dia_util ?? true,
    prescricaoQuinquenal: paramsData?.prescricao_quinquenal ?? false,
    projetarAvisoPrevio: paramsData?.projetar_aviso_indenizado ?? false,
    considerarFeriados: true,
    considerarFeriadosEstaduais: paramsData?.considerar_feriado_estadual ?? false,
    zerarNegativo: paramsData?.zerar_valor_negativo ?? false,
    limitar_avos: paramsData?.limitar_avos_periodo ?? false,
    prazoAvisoPrevio: paramsData?.prazo_aviso_previo || 'Calculado',
    indiceCorrecao: correcaoData?.indice || 'IPCA-E',
    jurosTipo: correcaoData?.juros_tipo || 'simples_mensal',
    jurosPercentual: correcaoData?.juros_percentual ?? 1,
    jurosInicio: correcaoData?.juros_inicio || 'ajuizamento',
    correcaoCombinacoes,
    jurosCombinacoes,
    // Pass faltas, férias and histórico for report sections
    faltas: (faltasForReport || []).map((f: any) => ({
      inicio: f.data_inicial || f.data_inicio,
      fim: f.data_final || f.data_fim,
      justificada: f.justificada ?? f.justificado ?? false,
      justificativa: f.justificativa || f.motivo || '',
    })),
    ferias: (feriasForReport || []).map((f: any) => ({
      relativa: f.relativas || f.relativa || '',
      periodo_aquisitivo_inicio: f.periodo_aquisitivo_inicio || f.ferias_aquisitivo_inicio || '',
      periodo_aquisitivo_fim: f.periodo_aquisitivo_fim || f.ferias_aquisitivo_fim || '',
      periodo_concessivo_inicio: f.periodo_concessivo_inicio || f.ferias_concessivo_inicio || '',
      periodo_concessivo_fim: f.periodo_concessivo_fim || f.ferias_concessivo_fim || '',
      prazo: f.prazo_dias || f.ferias_dias || 30,
      situacao: f.situacao || f.ferias_situacao || 'Gozadas',
      abono: f.abono || f.ferias_abono || false,
      gozo1_inicio: f.gozo_inicio || f.data_inicio || '',
      gozo1_fim: f.gozo_fim || f.data_fim || '',
      gozo2_inicio: f.gozo2_inicio || f.ferias_gozo2_inicio || '',
      gozo2_fim: f.gozo2_fim || f.ferias_gozo2_fim || '',
      gozo3_inicio: f.gozo3_inicio || f.ferias_gozo3_inicio || '',
      gozo3_fim: f.gozo3_fim || f.ferias_gozo3_fim || '',
    })),
    historicoSalarial: (histForReport || []).map((h: any) => ({
      nome: h.nome,
      periodo_inicio: h.periodo_inicio || '',
      periodo_fim: h.periodo_fim || '',
      tipo_valor: h.tipo_valor || 'informado',
      valor_informado: h.valor_informado,
      incidencia_fgts: h.incidencia_fgts ?? h.incide_fgts ?? true,
      incidencia_cs: h.incidencia_cs ?? h.incide_inss ?? true,
    })),
    // Verbas linkage for hierarchical display
    verbasLinkage: Object.fromEntries(
      verbasDB.filter(v => v.verba_principal_id).map(v => [v.id, v.verba_principal_id!])
    ),
    honorariosNome: '',
  };

  const handleFechar = async () => {
    if (!resultado?.id) return;
    setOperando(true);
    try {
      await fecharCalculo(resultado.id);
      qc.invalidateQueries({ queryKey: ["pjecalc_liquidacao", caseId] });
      toast.success("Cálculo fechado — edições bloqueadas.");
    } catch (e) { toast.error((e as Error).message); }
    finally { setOperando(false); }
  };

  const handleReabrir = async () => {
    if (!resultado?.id) return;
    setOperando(true);
    try {
      await reabrirCalculo(resultado.id);
      qc.invalidateQueries({ queryKey: ["pjecalc_liquidacao", caseId] });
      toast.success("Cálculo reaberto — edições permitidas.");
    } catch (e) { toast.error((e as Error).message); }
    finally { setOperando(false); }
  };

  const handleDuplicar = async () => {
    setOperando(true);
    try {
      const newCaseId = await duplicarCalculo(caseId);
      toast.success("Cálculo duplicado com sucesso!");
      navigate(`/pjecalc/${newCaseId}`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setOperando(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Resumo da Liquidação</h2>
          {isFechado && <Badge variant="destructive" className="text-[10px]"><Lock className="h-3 w-3 mr-1" />Fechado</Badge>}
        </div>
        <div className="flex gap-2">
          {res && (
            <>
              {/* Primary Export Button */}
              <Button size="sm" onClick={() => gerarRelatorioCompleto(res, reportMetaCompleto)} className="bg-primary text-primary-foreground">
                <FileBarChart className="h-4 w-4 mr-1" /> Exportar PDF
              </Button>
              {/* Download Button */}
              <Button size="sm" variant="outline" onClick={() => downloadRelatorioCompleto(res, reportMetaCompleto)}>
                <Download className="h-4 w-4 mr-1" /> Download PDF
              </Button>

              {/* Reports dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm"><Printer className="h-4 w-4 mr-1" /> Outros Relatórios</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => gerarRelatorioCompleto(res, reportMetaCompleto)}>
                    <FileBarChart className="h-4 w-4 mr-2" /> Relatório Completo (PDF)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => gerarRelatorioPDF(res, reportMeta)}>
                    <FileBarChart className="h-4 w-4 mr-2" /> Resumo da Liquidação
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => gerarRelatorioMemoriaCalculo(res, reportMeta)}>
                    <FileText className="h-4 w-4 mr-2" /> Memória de Cálculo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => gerarRelatorioDiferenca(res, reportMeta)}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Relatório por Diferença
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // Need to load configs for criterios report
                    gerarRelatorioCriteriosLegais(
                      res,
                      resultado?.resultado ? { case_id: caseId, data_admissao: '', data_ajuizamento: '', estado: '', municipio: '', regime_trabalho: 'tempo_integral', carga_horaria_padrao: 220, prescricao_quinquenal: false, prescricao_fgts: false, prazo_aviso_previo: 'nao_apurar', projetar_aviso_indenizado: false, limitar_avos_periodo: false, zerar_valor_negativo: false, sabado_dia_util: true, considerar_feriado_estadual: false, considerar_feriado_municipal: false } as any : {} as any,
                      { indice: 'IPCA-E', epoca: 'mensal', juros_tipo: 'simples_mensal', juros_percentual: 1, juros_inicio: 'ajuizamento', multa_523: false, multa_523_percentual: 10, data_liquidacao: resultado?.data_liquidacao || '' },
                      { apurar: true, incidir_sobre_juros: false, cobrar_reclamado: false, tributacao_exclusiva_13: true, tributacao_separada_ferias: false, deduzir_cs: true, deduzir_prev_privada: false, deduzir_pensao: false, deduzir_honorarios: false, aposentado_65: false, dependentes: 0 },
                      { apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false, aliquota_segurado_tipo: 'empregado', limitar_teto: true, apurar_empresa: true, apurar_sat: true, apurar_terceiros: true, aliquota_empregador_tipo: 'fixa', aliquota_empresa_fixa: 20, aliquota_sat_fixa: 2, aliquota_terceiros_fixa: 5.8, periodos_simples: [] },
                      { apurar: true, destino: 'pagar_reclamante', compor_principal: true, multa_apurar: true, multa_tipo: 'calculada', multa_percentual: 40, multa_base: 'devido', saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false },
                      reportMeta,
                    );
                  }}>
                    <FileText className="h-4 w-4 mr-2" /> Critérios Legais
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    // Consolidated report using current calculation
                    gerarRelatorioConsolidado(
                      [{ id: caseId, nome: caseData?.cliente || 'Cálculo Principal', resultado: res, dataLiquidacao: resultado?.data_liquidacao || '' }],
                      reportMeta,
                    );
                  }}>
                    <FileBarChart className="h-4 w-4 mr-2" /> Consolidado por Processo
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => downloadXML(res, reportMeta)}>
                    <FileCode className="h-4 w-4 mr-2" /> Exportar XML
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <RelatorioConsolidado processoNumero={caseData?.numero_processo || undefined} clienteNome={caseData?.cliente} />

              {/* Operations dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isFechado ? (
                    <DropdownMenuItem onClick={handleReabrir} disabled={operando}>
                      <Unlock className="h-4 w-4 mr-2" /> Reabrir Cálculo
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleFechar} disabled={operando}>
                      <Lock className="h-4 w-4 mr-2" /> Fechar Cálculo
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDuplicar} disabled={operando}>
                    <Copy className="h-4 w-4 mr-2" /> Duplicar Cálculo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Button onClick={executarLiquidacao} disabled={liquidando || isFechado} size="sm">
            {liquidando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {isFechado ? 'Fechado' : 'Liquidar'}
          </Button>
        </div>
      </div>

      {/* ── Validação Pré-Liquidação ── */}
      {validacao && validacao.itens.length > 0 && (
        <Card className={validacao.valido ? 'border-yellow-500/50' : 'border-destructive/50'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {validacao.valido 
                ? <AlertTriangle className="h-4 w-4 text-yellow-500" />
                : <XCircle className="h-4 w-4 text-destructive" />
              }
              Validação Pré-Liquidação
              <Badge variant={validacao.valido ? 'secondary' : 'destructive'} className="text-[10px] ml-auto">
                {validacao.erros} erros · {validacao.alertas} alertas · {validacao.observacoes} obs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {validacao.itens.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs py-1 border-b border-border/20 last:border-0">
                  {item.tipo === 'erro' && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />}
                  {item.tipo === 'alerta' && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />}
                  {item.tipo === 'observacao' && <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                  <div>
                    <span className="font-medium text-muted-foreground">[{item.modulo}]</span>{' '}
                    <span>{item.mensagem}</span>
                    {item.detalhe && <div className="text-muted-foreground text-[10px] mt-0.5">{item.detalhe}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!res ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          <FileBarChart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          Configure todos os módulos e clique em <strong>Liquidar</strong> para executar o cálculo completo.
        </CardContent></Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Principal Bruto', value: res.resumo.principal_bruto, color: 'text-foreground' },
              { label: 'Corrigido + Juros', value: res.resumo.principal_corrigido + res.resumo.juros_mora, color: 'text-primary' },
              { label: 'Líquido Reclamante', value: res.resumo.liquido_reclamante, color: 'text-[hsl(var(--success))]' },
              { label: 'Total Reclamada', value: res.resumo.total_reclamada, color: 'text-destructive' },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className={`text-lg font-bold ${item.color}`}>{fmt(item.value)}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Copiar Fundamentação para Petição */}
          <Card>
            <CardContent className="p-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  const dataLiq = resultado?.data_liquidacao || new Date().toISOString().slice(0, 10);
                  const indice = correcaoData?.indice || 'IPCA-E';
                  const jurosDesc = correcaoData?.juros_tipo === 'selic' ? 'Taxa SELIC' : `${correcaoData?.juros_percentual ?? 1}% a.m.`;
                  const texto = `FUNDAMENTAÇÃO LEGAL DA LIQUIDAÇÃO

O presente cálculo foi elaborado em estrita conformidade com os critérios fixados pelo E. STF na ADC 58 (Ações Declaratórias de Constitucionalidade nºs 58 e 59), que determinou a aplicação do ${indice} como índice de correção monetária para débitos trabalhistas na fase pré-judicial, e da Taxa SELIC a partir do ajuizamento da reclamação trabalhista, conforme tese vinculante.

A atualização monetária observou o regime de combinação por data, respeitando as transições de índices determinadas pela jurisprudência consolidada.

Os juros de mora foram aplicados na modalidade ${jurosDesc}, conforme o Art. 39 da Lei 8.177/91, incidindo a partir do ajuizamento da ação (Art. 883 da CLT c/c Súmula 200 do TST).

O Imposto de Renda foi calculado pelo regime de Rendimentos Recebidos Acumuladamente (RRA), nos termos do Art. 12-A da Lei 7.713/88, com ${res.imposto_renda.meses_rra} meses de acumulação.

A Contribuição Social do segurado foi apurada conforme tabela progressiva vigente (Art. 28, §9º, Lei 8.212/91), e a cota patronal conforme alíquotas legais (20% + SAT + Terceiros).

Os honorários advocatícios sucumbenciais foram fixados em conformidade com o Art. 791-A da CLT, observada a OJ 394 da SDI-1 do TST, que determina a incidência sobre o valor bruto da condenação.

${res.resumo.fgts_total > 0 ? 'O FGTS foi calculado à alíquota de 8% sobre as verbas de natureza salarial, com multa rescisória de 40% conforme Art. 18, §1º, da Lei 8.036/90.\n\n' : ''}Data da liquidação: ${dataLiq}
Valor líquido do reclamante: ${fmt(res.resumo.liquido_reclamante)}
Total da reclamada: ${fmt(res.resumo.total_reclamada)}`;

                  navigator.clipboard.writeText(texto);
                  toast.success("Fundamentação copiada para a área de transferência!");
                }}
              >
                <Gavel className="h-4 w-4 mr-2" />
                Copiar Fundamentação para Petição (ADC 58 + OJ 394)
              </Button>
            </CardContent>
          </Card>
          {/* Detailed Breakdown */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Composição da Liquidação</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-xs">
                <tbody>
                  {[
                    ['Principal Bruto (nominal)', res.resumo.principal_bruto],
                    ['(+) Correção Monetária', res.resumo.principal_corrigido - res.resumo.principal_bruto],
                    ['(+) Juros de Mora', res.resumo.juros_mora],
                    ['= BRUTO DEVIDO AO RECLAMANTE', res.resumo.principal_corrigido + res.resumo.juros_mora],
                    ['(-) Contribuição Social Segurado', -res.resumo.cs_segurado],
                    ['(-) IRRF (Art. 12-A RRA)', -res.resumo.ir_retido],
                    ...((res.resumo.previdencia_privada || 0) > 0 ? [['(-) Previdência Privada', -res.resumo.previdencia_privada]] : []),
                    ...((res.resumo.pensao_total || 0) > 0 ? [['(-) Pensão Alimentícia', -res.resumo.pensao_total]] : []),
                  ].map(([label, value]) => {
                    const isBrutoLine = (label as string).startsWith('= BRUTO');
                    return (
                    <tr key={label as string} className={`border-b border-border/30 ${isBrutoLine ? 'font-semibold bg-muted/30' : ''}`}>
                      <td className="py-2 text-muted-foreground">{label}</td>
                      <td className="py-2 text-right font-mono font-medium">{fmt(value as number)}</td>
                    </tr>
                    );
                  })}
                  <tr className="border-t-2 border-primary/30 font-bold">
                    <td className="py-2">LÍQUIDO RECLAMANTE</td>
                    <td className="py-2 text-right font-mono text-[hsl(var(--success))]">{fmt(res.resumo.liquido_reclamante)}</td>
                  </tr>
                  {res.resumo.fgts_total > 0 && (
                    <tr className="border-b border-border/30">
                      <td className="py-2 text-muted-foreground">FGTS (depósitos + multa)</td>
                      <td className="py-2 text-right font-mono font-medium">{fmt(res.resumo.fgts_total)}</td>
                    </tr>
                  )}
                  <tr className="font-bold">
                    <td className="py-2">CS EMPREGADOR</td>
                    <td className="py-2 text-right font-mono">{fmt(res.resumo.cs_empregador)}</td>
                  </tr>
                  {res.resumo.honorarios_sucumbenciais > 0 && (
                    <tr className="border-b border-border/30">
                      <td className="py-2 text-muted-foreground">Honorários Sucumbenciais</td>
                      <td className="py-2 text-right font-mono">{fmt(res.resumo.honorarios_sucumbenciais)}</td>
                    </tr>
                  )}
                  {res.resumo.custas > 0 && (
                    <tr className="border-b border-border/30">
                      <td className="py-2 text-muted-foreground">Custas Processuais</td>
                      <td className="py-2 text-right font-mono">{fmt(res.resumo.custas)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-destructive/30 font-bold">
                    <td className="py-2">TOTAL RECLAMADA</td>
                    <td className="py-2 text-right font-mono text-destructive">{fmt(res.resumo.total_reclamada)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Verbas Detail — Hierarchical Tree */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Verbas ({res.verbas.length})</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50">
                  <th className="p-2 text-left">Verba</th>
                  <th className="p-2 text-center">Tipo</th>
                  <th className="p-2 text-right">Devido</th>
                  <th className="p-2 text-right">Pago</th>
                  <th className="p-2 text-right">Diferença</th>
                  <th className="p-2 text-right">Corrigido</th>
                  <th className="p-2 text-right">Juros</th>
                  <th className="p-2 text-right font-bold">Final</th>
                </tr></thead>
                <tbody>
                  {(() => {
                    const principals = res.verbas.filter(v => v.tipo === 'principal');
                    const reflexas = res.verbas.filter(v => v.tipo === 'reflexa');
                    const rows: JSX.Element[] = [];
                    for (const p of principals) {
                      // Principal row
                      rows.push(
                        <tr key={p.verba_id} className="border-b border-border/30 bg-muted/20">
                          <td className="p-2 font-semibold">
                            {p.nome}
                            {(() => {
                              // Detect OJ 415: credit was absorbed if any month had pago > devido
                              const hasOverpay = p.ocorrencias.some(oc => oc.pago > oc.devido);
                              const naiveDif = p.ocorrencias.reduce((s, oc) => s + Math.max(0, oc.devido - oc.pago), 0);
                              const oj415Applied = hasOverpay && Math.abs(naiveDif - p.total_diferenca) > 0.01;
                              return oj415Applied ? (
                                <Badge variant="outline" className="ml-2 text-[9px] border-amber-500 text-amber-600">OJ 415</Badge>
                              ) : null;
                            })()}
                          </td>
                          <td className="p-2 text-center"><Badge variant="default" className="text-[10px]">P</Badge></td>
                          <td className="p-2 text-right font-mono">{fmt(p.total_devido)}</td>
                          <td className="p-2 text-right font-mono">{fmt(p.total_pago)}</td>
                          <td className="p-2 text-right font-mono">{fmt(p.total_diferenca)}</td>
                          <td className="p-2 text-right font-mono">{fmt(p.total_corrigido)}</td>
                          <td className="p-2 text-right font-mono">{fmt(p.total_juros)}</td>
                          <td className="p-2 text-right font-mono font-bold">{fmt(p.total_final)}</td>
                        </tr>
                      );
                      // Find reflexas linked to this principal via verba_principal_id from DB
                      const linkedReflexas = reflexas.filter(r => {
                        const dbVerba = verbasDB.find((vdb: any) => vdb.id === r.verba_id);
                        return dbVerba?.verba_principal_id === p.verba_id;
                      });
                      for (const ref of linkedReflexas) {
                        rows.push(
                          <tr key={ref.verba_id} className="border-b border-border/20">
                            <td className="p-2 pl-6 text-muted-foreground"><span className="text-primary/50 mr-1">└</span> {ref.nome}</td>
                            <td className="p-2 text-center"><Badge variant="secondary" className="text-[10px]">R</Badge></td>
                            <td className="p-2 text-right font-mono">{fmt(ref.total_devido)}</td>
                            <td className="p-2 text-right font-mono">{fmt(ref.total_pago)}</td>
                            <td className="p-2 text-right font-mono">{fmt(ref.total_diferenca)}</td>
                            <td className="p-2 text-right font-mono">{fmt(ref.total_corrigido)}</td>
                            <td className="p-2 text-right font-mono">{fmt(ref.total_juros)}</td>
                            <td className="p-2 text-right font-mono font-bold">{fmt(ref.total_final)}</td>
                          </tr>
                        );
                      }
                    }
                    // Orphan reflexas (no verba_principal_id in DB)
                    const linkedIds = new Set(
                      verbasDB.filter((vdb: any) => vdb.verba_principal_id).map((vdb: any) => vdb.id)
                    );
                    for (const ref of reflexas) {
                      if (linkedIds.has(ref.verba_id)) continue;
                      rows.push(
                        <tr key={ref.verba_id} className="border-b border-border/30">
                          <td className="p-2 font-medium text-destructive">⚠ {ref.nome}</td>
                          <td className="p-2 text-center"><Badge variant="destructive" className="text-[10px]">R</Badge></td>
                          <td className="p-2 text-right font-mono">{fmt(ref.total_devido)}</td>
                          <td className="p-2 text-right font-mono">{fmt(ref.total_pago)}</td>
                          <td className="p-2 text-right font-mono">{fmt(ref.total_diferenca)}</td>
                          <td className="p-2 text-right font-mono">{fmt(ref.total_corrigido)}</td>
                          <td className="p-2 text-right font-mono">{fmt(ref.total_juros)}</td>
                          <td className="p-2 text-right font-mono font-bold">{fmt(ref.total_final)}</td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* FGTS Detail */}
          {res.fgts.total_fgts > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">FGTS</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div><span className="text-muted-foreground">Depósitos (8%)</span><div className="font-mono font-medium">{fmt(res.fgts.total_depositos)}</div></div>
                  <div><span className="text-muted-foreground">Multa</span><div className="font-mono font-medium">{fmt(res.fgts.multa_valor)}</div></div>
                  {res.fgts.lc110_10 > 0 && <div><span className="text-muted-foreground">LC 110 (10%)</span><div className="font-mono font-medium">{fmt(res.fgts.lc110_10)}</div></div>}
                  <div><span className="text-muted-foreground font-bold">Total FGTS</span><div className="font-mono font-bold">{fmt(res.fgts.total_fgts)}</div></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* IR Detail */}
          {res.imposto_renda.imposto_devido > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Imposto de Renda (Art. 12-A RRA)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div><span className="text-muted-foreground">Base</span><div className="font-mono">{fmt(res.imposto_renda.base_calculo)}</div></div>
                  <div><span className="text-muted-foreground">Deduções</span><div className="font-mono">{fmt(res.imposto_renda.deducoes)}</div></div>
                  <div><span className="text-muted-foreground">Meses RRA</span><div className="font-mono">{res.imposto_renda.meses_rra}</div></div>
                  <div><span className="text-muted-foreground font-bold">IRRF</span><div className="font-mono font-bold text-destructive">{fmt(res.imposto_renda.imposto_devido)}</div></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation from result */}
          {res.validacao && res.validacao.itens.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Validação do Cálculo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs">
                  {res.validacao.itens.filter(i => i.tipo !== 'observacao').map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {item.tipo === 'alerta' && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                      {item.tipo === 'erro' && <XCircle className="h-3 w-3 text-destructive" />}
                      <span className="text-muted-foreground">[{item.modulo}]</span> {item.mensagem}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auditoria em modo puro */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gavel className="h-4 w-4 text-primary" />
                Auditoria do Sistema (Modo Puro)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                O cálculo está sendo executado apenas com insumos internos do sistema (sem baseline externo de PJe-Calc).
              </p>
            </CardContent>
          </Card>

          <div className="text-[10px] text-muted-foreground text-right">
            Liquidação em {resultado?.data_liquidacao || '—'} • Engine v{resultado?.engine_version}
          </div>
        </>
      )}
    </div>
  );
}
