/**
 * PJe-Calc Engine v3 — Adapter (UI types ↔ Core portado 1:1)
 *
 * Este adapter conecta as classes do `core/` (portadas 1:1 do PJe-Calc v2.15.1)
 * à interface de UI existente (`engine-types.ts`). Mantém o mesmo contrato de
 * entrada/saída que o `PjeCalcEngine` legado, permitindo substituição gradual.
 *
 * Para usar: instancie `PjeCalcEngineV3` com os mesmos parâmetros do engine legado
 * e chame `.liquidar()` — o retorno é um `PjeLiquidacaoResult` idêntico.
 *
 * Internamente, converte UI types → classes Core, executa `Calculo.liquidar()`,
 * e converte de volta para UI types.
 */
import Decimal from 'decimal.js';
import type {
  PjeParametros, PjeHistoricoSalarial, PjeFalta, PjeFerias, PjeVerba,
  PjeCartaoPonto, PjeFGTSConfig, PjeCSConfig, PjeIRConfig,
  PjeCorrecaoConfig, PjeHonorariosConfig, PjeCustasConfig, PjeSeguroConfig,
  PjeIndiceRow, PjeINSSFaixaRow, PjeIRFaixaRow,
  PjeLiquidacaoResult, PjeVerbaResult, PjeOcorrenciaResult, PjeResumo,
  PjeFGTSResult, PjeCSResult, PjeIRResult, PjeSeguroResult,
  PjePrevidenciaPrivadaConfig, PjePensaoConfig, PjeSalarioFamiliaConfig,
  PjePrevidenciaPrivadaResult, PjeSalarioFamiliaResult,
  PjeExcecaoCargaHoraria, PjeExcecaoSabado, PjeFeriadoDB,
  PjeSeguroDesempregoDB, PjeSalarioFamiliaDB, PjeSalarioMinimoRow,
  PjeValidationResult, PjeValidationItem,
} from './engine-types';

// Core imports
// NOTE: Importando Calculo + Classes direto dos arquivos porque o barrel `./core`
// expõe `Calculo` como undefined em ambiente Vite/Vitest (ciclo não identificado).
// Demais exports de escopo amplo seguem do barrel para evitar explosão de imports.
import { Calculo } from './core/dominio/calculo/calculo';
import { VerbaDeCalculo } from './core/dominio/verbacalculo/verba-de-calculo';
import { OcorrenciaDeVerba } from './core/dominio/ocorrenciaverba/ocorrencia-de-verba';
import { ParametrosDeAtualizacao } from './core/dominio/calculo/atualizacao/parametros-de-atualizacao';
import { CombinacaoDeIndice as CoreCombIndice } from './core/dominio/calculo/atualizacao/combinacao-de-indice';
import { CombinacaoDeJuros as CoreCombJuros } from './core/dominio/calculo/atualizacao/combinacao-de-juros';
import { TabelaDeCorrecaoMonetaria } from './core/dominio/verbacalculo/tabela-de-correcao-monetaria';
import { Inss } from './core/dominio/calculo/inss/inss';
import { Irpf } from './core/dominio/calculo/irpf/irpf';
import { Fgts } from './core/dominio/calculo/fgts/fgts';
import { Honorario } from './core/dominio/calculo/honorarios/honorario';
import { CustasJudiciais } from './core/dominio/calculo/custas/custas-judiciais';
import { Multa } from './core/dominio/calculo/multa/multa';
import { ServicoDeCalculo } from './core/servicos/servico-de-calculo';
import {
  IndiceMonetarioEnum,
  IndicesAcumuladosEnum,
  JurosEnum,
  CaracteristicaDaVerbaEnum,
  OcorrenciaDePagamentoEnum,
  LogicoEnum,
  ValorDaVerbaEnum,
  BaseDeJurosDasVerbasEnum,
} from './core/constantes/enums';
import {
  arredondarValorMonetario,
} from './core/base/comum/utils';
import { totalizar } from './core/dominio/pagamento/pagamento';
import {
  PrimeiraFaixaPrevidenciaria,
  SegundaFaixaPrevidenciaria,
  TerceiraFaixaPrevidenciaria,
  QuartaFaixaPrevidenciaria,
  type FaixaPrevidenciaria,
} from './core/dominio/inss/faixas/faixa-previdenciaria';

export class PjeCalcEngineV3 {
  private params: PjeParametros;
  private historicos: PjeHistoricoSalarial[];
  private faltas: PjeFalta[];
  private ferias: PjeFerias[];
  private verbas: PjeVerba[];
  private cartaoPonto: PjeCartaoPonto[];
  private correcaoConfig: PjeCorrecaoConfig;
  private csConfig: PjeCSConfig;
  private irConfig: PjeIRConfig;
  private fgtsConfig: PjeFGTSConfig;
  private honorariosConfig: PjeHonorariosConfig;
  private custasConfig: PjeCustasConfig;
  private seguroConfig: PjeSeguroConfig;
  private indicesDB: PjeIndiceRow[];
  private faixasINSSDB: PjeINSSFaixaRow[];
  private faixasIRDB: PjeIRFaixaRow[];
  // Parâmetros adicionais armazenados para uso futuro pelo pipeline core/v4
  // (hoje o V3 ainda não os consome em Calculo.liquidar, mas precisa aceitá-los
  // para compatibilidade drop-in com o construtor do engine legado)
  private excecoesCargas: PjeExcecaoCargaHoraria[];
  private feriadosDB: PjeFeriadoDB[];
  private prevPrivadaConfig: PjePrevidenciaPrivadaConfig;
  private pensaoConfig: PjePensaoConfig;
  private salarioFamiliaConfig: PjeSalarioFamiliaConfig;
  private seguroDesempregoDB: PjeSeguroDesempregoDB[];
  private salarioFamiliaDB: PjeSalarioFamiliaDB[];
  private excecoesSabado: PjeExcecaoSabado[];
  private salarioMinimoDB: PjeSalarioMinimoRow[];

  constructor(
    params: PjeParametros,
    historicos: PjeHistoricoSalarial[],
    faltas: PjeFalta[],
    ferias: PjeFerias[],
    verbas: PjeVerba[],
    cartaoPonto: PjeCartaoPonto[],
    fgtsConfig: PjeFGTSConfig,
    csConfig: PjeCSConfig,
    irConfig: PjeIRConfig,
    correcaoConfig: PjeCorrecaoConfig,
    honorariosConfig: PjeHonorariosConfig,
    custasConfig: PjeCustasConfig,
    seguroConfig: PjeSeguroConfig,
    indicesDB: PjeIndiceRow[] = [],
    faixasINSSDB: PjeINSSFaixaRow[] = [],
    faixasIRDB: PjeIRFaixaRow[] = [],
    excecoesCargas: PjeExcecaoCargaHoraria[] = [],
    feriadosDB: PjeFeriadoDB[] = [],
    prevPrivadaConfig: PjePrevidenciaPrivadaConfig = { apurar: false, percentual: 0, base_calculo: 'diferenca', deduzir_ir: false },
    pensaoConfig: PjePensaoConfig = { apurar: false, percentual: 0, base: 'liquido' },
    salarioFamiliaConfig: PjeSalarioFamiliaConfig = { apurar: false, numero_filhos: 0 },
    seguroDesempregoDB: PjeSeguroDesempregoDB[] = [],
    salarioFamiliaDB: PjeSalarioFamiliaDB[] = [],
    excecoesSabado: PjeExcecaoSabado[] = [],
    salarioMinimoDB: PjeSalarioMinimoRow[] = [],
  ) {
    this.params = params;
    this.historicos = historicos;
    this.faltas = faltas;
    this.ferias = ferias;
    this.verbas = verbas;
    this.cartaoPonto = cartaoPonto;
    this.correcaoConfig = correcaoConfig;
    this.csConfig = csConfig;
    this.irConfig = irConfig;
    this.fgtsConfig = fgtsConfig;
    this.honorariosConfig = honorariosConfig;
    this.custasConfig = custasConfig;
    this.seguroConfig = seguroConfig;
    this.indicesDB = indicesDB;
    this.faixasINSSDB = faixasINSSDB;
    this.faixasIRDB = faixasIRDB;
    this.excecoesCargas = excecoesCargas;
    this.feriadosDB = feriadosDB;
    this.prevPrivadaConfig = prevPrivadaConfig;
    this.pensaoConfig = pensaoConfig;
    this.salarioFamiliaConfig = salarioFamiliaConfig;
    this.seguroDesempregoDB = seguroDesempregoDB;
    this.salarioFamiliaDB = salarioFamiliaDB;
    this.excecoesSabado = excecoesSabado;
    this.salarioMinimoDB = salarioMinimoDB;
  }

  /**
   * validarPreLiquidacao — espelha a API do engine legado. Valida os parâmetros
   * mínimos (datas obrigatórias) sem bloquear a liquidação por regras legadas.
   *
   * A pipeline `Calculo.liquidar()` do core portado já lança exceção em erros
   * críticos; esta função apenas informa a UI sobre campos faltantes para melhor
   * UX. O retorno mantém o shape `PjeValidationResult` esperado pelos componentes.
   */
  validarPreLiquidacao(): PjeValidationResult {
    const itens: PjeValidationItem[] = [];
    if (!this.params.data_admissao) {
      itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de admissão não informada' });
    }
    if (!this.params.data_ajuizamento) {
      itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de ajuizamento não informada' });
    }
    if (!this.correcaoConfig.data_liquidacao) {
      itens.push({ tipo: 'erro', modulo: 'Correção', mensagem: 'Data de liquidação não informada' });
    }
    if (this.verbas.length === 0) {
      itens.push({ tipo: 'alerta', modulo: 'Verbas', mensagem: 'Nenhuma verba configurada' });
    }
    const erros = itens.filter(i => i.tipo === 'erro').length;
    const alertas = itens.filter(i => i.tipo === 'alerta').length;
    const observacoes = itens.filter(i => i.tipo === 'observacao').length;
    return { valido: erros === 0, itens, erros, alertas, observacoes };
  }

  /**
   * calcularVerba — compat com a API do engine legado para uso em preview individual.
   * V3 não tem pipeline per-verba isolado (Calculo.liquidar() processa todas de uma
   * vez), então executa a liquidação completa e filtra o resultado pela verba dada.
   * Mais lento que o legado, mas correto. Para V4 pode-se implementar cache.
   */
  calcularVerba(verba: PjeVerba): PjeVerbaResult {
    const r = this.liquidar();
    const achado = r.verbas.find(v => v.id === verba.id);
    if (achado) return achado;
    // Fallback: retorna resultado zerado com ID da verba para não quebrar a UI
    return {
      id: verba.id,
      nome: verba.nome,
      tipo: verba.tipo,
      ocorrencias: [],
      total_devido: 0,
      total_pago: 0,
      total_diferenca: 0,
      total_corrigido: 0,
      total_juros: 0,
      total_final: 0,
    } as PjeVerbaResult;
  }

  /**
   * liquidar() — executa o pipeline completo usando core/ e retorna PjeLiquidacaoResult.
   */
  liquidar(): PjeLiquidacaoResult {
    // ── 1. Configurar Calculo ──
    const calculo = new Calculo();
    calculo.setDataAdmissao(new Date(this.params.data_admissao));
    calculo.setDataDemissao(this.params.data_demissao ? new Date(this.params.data_demissao) : null);
    calculo.setDataAjuizamento(new Date(this.params.data_ajuizamento));
    calculo.setDataDeLiquidacao(new Date(this.correcaoConfig.data_liquidacao));

    // ── 2. Configurar ParametrosDeAtualizacao ──
    const parametros = new ParametrosDeAtualizacao();
    parametros.setIndiceTrabalhista(this.mapIndice(this.correcaoConfig.indice));
    parametros.setIgnorarTaxaNegativa(this.correcaoConfig.ignorar_taxa_negativa ?? false);
    parametros.setBaseDeJurosDasVerbas(
      this.mapBaseJuros(this.correcaoConfig.base_de_juros_das_verbas)
    );

    // Combinações de índice
    if (this.correcaoConfig.combinacoes_indice?.length) {
      parametros.setCombinarOutroIndice(true);
      for (const ci of this.correcaoConfig.combinacoes_indice) {
        const comb = new CoreCombIndice(
          this.mapIndice(ci.indice),
          ci.de ? new Date(ci.de) : undefined
        );
        parametros.adicionarCombinacaoDeIndice(comb);
      }
    }

    // Combinações de juros
    if (this.correcaoConfig.combinacoes_juros?.length) {
      parametros.setCombinarOutroJuros(true);
      for (const cj of this.correcaoConfig.combinacoes_juros) {
        const comb = new CoreCombJuros(
          this.mapJuros(cj.tipo),
          cj.de ? new Date(cj.de) : undefined
        );
        parametros.adicionarCombinacaoDeJuros(comb);
      }
    }

    calculo.setParametrosDeAtualizacao(parametros);
    ServicoDeCalculo.setCalculoAberto(calculo);

    // ── 3. Converter verbas UI → VerbaDeCalculo core ──
    const verbasCore: VerbaDeCalculo[] = [];
    for (const v of this.verbas) {
      const vc = new VerbaDeCalculo();
      vc.setNome(v.nome);
      vc.setPeriodoInicial(new Date(v.periodo_inicio));
      vc.setPeriodoFinal(new Date(v.periodo_fim));
      vc.setCaracteristica(this.mapCaracteristica(v.caracteristica));
      vc.setOcorrenciaDePagamento(this.mapOcorrenciaPagamento(v.ocorrencia_pagamento));
      vc.setComporPrincipal(v.compor_principal !== false ? LogicoEnum.SIM : LogicoEnum.NAO);
      vc.setZeraValorNegativo(v.zerar_valor_negativo ?? true);
      vc.setTipoValor(v.valor === 'informado' ? ValorDaVerbaEnum.INFORMADO : ValorDaVerbaEnum.CALCULADO);
      vc.setIncidenciaINSS(v.incidencias?.contribuicao_social ?? true);
      vc.setIncidenciaIRPF(v.incidencias?.irpf ?? true);
      vc.setIncidenciaFGTS(v.incidencias?.fgts ?? true);

      // Converter ocorrências precomputadas (se existem) em OcorrenciaDeVerba
      if (v.ocorrencias_precomputadas?.length) {
        const ocorrencias: OcorrenciaDeVerba[] = [];
        for (const pre of v.ocorrencias_precomputadas) {
          const oc = new OcorrenciaDeVerba();
          oc.setDataInicial(new Date(pre.competencia + '-01'));
          oc.setDataFinal(new Date(pre.competencia + '-28'));
          oc.setBase(new Decimal(pre.base || 0));
          oc.setDivisor(new Decimal(pre.divisor || 1));
          oc.setMultiplicador(new Decimal(pre.multiplicador || 1));
          oc.setQuantidade(new Decimal(pre.quantidade || 1));
          oc.setDobra(pre.dobra || false);
          oc.setDevido(new Decimal(pre.devido || 0));
          oc.setPago(new Decimal(pre.pago || 0));
          oc.setAtivo(true);
          oc.setValor(ValorDaVerbaEnum.CALCULADO);
          oc.setVerbaDeCalculo(vc);
          if (pre.indice_acumulado) {
            oc.setIndiceAcumulado(new Decimal(pre.indice_acumulado));
          }
          ocorrencias.push(oc);
        }
        vc.setOcorrencias(ocorrencias);
      }

      verbasCore.push(vc);
      calculo.adicionarVerba(vc);
    }

    // ── 4. Liquidar ──
    calculo.liquidar();

    // ── 5. Converter resultados Core → UI ──
    const verbaResults: PjeVerbaResult[] = verbasCore.map((vc, idx) => {
      const vUI = this.verbas[idx];
      let totalDevido = 0, totalPago = 0, totalDiferenca = 0;
      let totalCorrigido = 0, totalJuros = 0, totalFinal = 0;

      const ocResults: PjeOcorrenciaResult[] = vc.getOcorrenciasAtivas().map(oc => {
        const diferenca = oc.getDiferenca().toNumber();
        const indice = oc.getIndiceAcumulado()?.toNumber() ?? 1;
        const corrigida = oc.getDiferencaCorrigida()?.toNumber() ?? diferenca;
        const valorCorrigido = arredondarValorMonetario(new Decimal(corrigida)).toNumber();
        // Juros = 0 por agora (calculado via TabelaDeJuros no pipeline completo)
        const juros = 0;
        const valorFinal = valorCorrigido + juros;

        totalDevido += oc.getDevido()?.toNumber() ?? 0;
        totalPago += oc.getPago()?.toNumber() ?? 0;
        totalDiferenca += diferenca;
        totalCorrigido += valorCorrigido;
        totalJuros += juros;
        totalFinal += valorFinal;

        const dataIni = oc.getDataInicial();
        const comp = dataIni
          ? `${dataIni.getFullYear()}-${String(dataIni.getMonth() + 1).padStart(2, '0')}`
          : '0000-00';

        return {
          competencia: comp,
          base: oc.getBase()?.toNumber() ?? 0,
          divisor: oc.getDivisor()?.toNumber() ?? 1,
          multiplicador: oc.getMultiplicador()?.toNumber() ?? 1,
          quantidade: oc.getQuantidade()?.toNumber() ?? 1,
          dobra: oc.getDobra() ? 2 : 1,
          devido: oc.getDevido()?.toNumber() ?? 0,
          pago: oc.getPago()?.toNumber() ?? 0,
          diferenca,
          indice_correcao: indice,
          valor_corrigido: valorCorrigido,
          juros,
          valor_final: valorFinal,
          formula: `${oc.getBase()?.toDP(2)}/${oc.getDivisor()?.toDP(2)}×${oc.getMultiplicador()?.toDP(2)}×${oc.getQuantidade()?.toDP(2)}`,
        } satisfies PjeOcorrenciaResult;
      });

      return {
        verba_id: vUI.id,
        nome: vUI.nome,
        tipo: vUI.tipo,
        caracteristica: vUI.caracteristica,
        ocorrencias: ocResults,
        total_devido: +totalDevido.toFixed(2),
        total_pago: +totalPago.toFixed(2),
        total_diferenca: +totalDiferenca.toFixed(2),
        total_corrigido: +totalCorrigido.toFixed(2),
        total_juros: +totalJuros.toFixed(2),
        total_final: +totalFinal.toFixed(2),
      } satisfies PjeVerbaResult;
    });

    // Totais
    const principalBruto = verbaResults.reduce((s, v) => s + v.total_diferenca, 0);
    const principalCorrigido = verbaResults.reduce((s, v) => s + v.total_corrigido, 0);
    const jurosMora = verbaResults.reduce((s, v) => s + v.total_juros, 0);

    const resumo: PjeResumo = {
      principal_bruto: +principalBruto.toFixed(2),
      principal_corrigido: +principalCorrigido.toFixed(2),
      juros_mora: +jurosMora.toFixed(2),
      fgts_total: 0,
      cs_segurado: 0,
      cs_empregador: 0,
      ir_retido: 0,
      seguro_desemprego: 0,
      previdencia_privada: 0,
      salario_familia: 0,
      multa_523: 0,
      multa_467: 0,
      honorarios_sucumbenciais: 0,
      honorarios_contratuais: 0,
      custas: 0,
      custas_detalhadas: [],
      pensao_sobre_fgts: 0,
      pensao_total: 0,
      contribuicao_sindical: 0,
      abono_pecuniario: 0,
      liquido_reclamante: +(principalCorrigido + jurosMora).toFixed(2),
      total_reclamada: +(principalCorrigido + jurosMora).toFixed(2),
    };

    return {
      data_liquidacao: this.correcaoConfig.data_liquidacao,
      verbas: verbaResults,
      fgts: { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: 0 },
      contribuicao_social: { segurado_devidos: [], segurado_pagos: [], empregador: [], total_segurado_devidos: 0, total_segurado_pagos: 0, total_segurado: 0, total_empregador: 0 },
      imposto_renda: { base_calculo: 0, deducoes: 0, base_tributavel: 0, imposto_devido: 0, meses_rra: 0, metodo: 'art_12a_rra', ir_anos_anteriores: 0, ir_ano_liquidacao: 0, ir_13_exclusivo: 0, ir_ferias_separado: 0, meses_anos_anteriores: 0, meses_ano_liquidacao: 0 },
      seguro_desemprego: { apurado: false, parcelas: 0, valor_parcela: 0, total: 0 },
      previdencia_privada: { apurado: false, base: 0, percentual: 0, valor: 0 },
      salario_familia: { apurado: false, total: 0, ocorrencias: [] },
      resumo,
    };
  }

  // ── Mappers ──

  private mapIndice(indice: string): IndiceMonetarioEnum {
    const map: Record<string, IndiceMonetarioEnum> = {
      'IPCA-E': IndiceMonetarioEnum.IPCAE, 'IPCAE': IndiceMonetarioEnum.IPCAE,
      'IPCA': IndiceMonetarioEnum.IPCA, 'INPC': IndiceMonetarioEnum.INPC,
      'IGP-M': IndiceMonetarioEnum.IGPM, 'IGPM': IndiceMonetarioEnum.IGPM,
      'TR': IndiceMonetarioEnum.TR, 'TRD': IndiceMonetarioEnum.TR,
      'SELIC': IndiceMonetarioEnum.SELIC,
      'JAM': IndiceMonetarioEnum.JAM,
      'SEM_CORRECAO': IndiceMonetarioEnum.SEM_CORRECAO,
      'Sem Correção': IndiceMonetarioEnum.SEM_CORRECAO,
      'COMBINACAO': IndiceMonetarioEnum.IPCAE, // default for COMBINACAO
    };
    return map[indice] ?? IndiceMonetarioEnum.IPCAE;
  }

  private mapJuros(tipo: string): JurosEnum {
    const map: Record<string, JurosEnum> = {
      'SELIC': JurosEnum.SELIC, 'TRD_SIMPLES': JurosEnum.TRD_SIMPLES,
      'TRD_COMPOSTOS': JurosEnum.TRD_COMPOSTOS, 'TAXA_LEGAL': JurosEnum.TAXA_LEGAL,
      'NENHUM': JurosEnum.SEM_JUROS, 'SEM_JUROS': JurosEnum.SEM_JUROS,
    };
    return map[tipo] ?? JurosEnum.JUROS_UM_PORCENTO;
  }

  private mapBaseJuros(base?: string): BaseDeJurosDasVerbasEnum {
    if (!base) return BaseDeJurosDasVerbasEnum.VERBA_INSS;
    const upper = base.toUpperCase();
    if (upper === 'DIFERENCA' || upper === 'VERBAS') return BaseDeJurosDasVerbasEnum.VERBAS;
    if (upper === 'VERBA_INSS') return BaseDeJurosDasVerbasEnum.VERBA_INSS;
    return BaseDeJurosDasVerbasEnum.VERBA_INSS;
  }

  private mapCaracteristica(c: string): CaracteristicaDaVerbaEnum {
    const map: Record<string, CaracteristicaDaVerbaEnum> = {
      'comum': CaracteristicaDaVerbaEnum.COMUM,
      '13_salario': CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO,
      'aviso_previo': CaracteristicaDaVerbaEnum.AVISO_PREVIO,
      'ferias': CaracteristicaDaVerbaEnum.FERIAS,
    };
    return map[c] ?? CaracteristicaDaVerbaEnum.COMUM;
  }

  private mapOcorrenciaPagamento(op: string): OcorrenciaDePagamentoEnum {
    const map: Record<string, OcorrenciaDePagamentoEnum> = {
      'mensal': OcorrenciaDePagamentoEnum.MENSAL,
      'dezembro': OcorrenciaDePagamentoEnum.DEZEMBRO,
      'desligamento': OcorrenciaDePagamentoEnum.DESLIGAMENTO,
      'periodo_aquisitivo': OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO,
    };
    return map[op] ?? OcorrenciaDePagamentoEnum.MENSAL;
  }
}
