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
import { InssModuloAdapter } from './modulos/inss-modulo-adapter';
import { IrpfModuloAdapter } from './modulos/irpf-modulo-adapter';
import { SELIC_MENSAL } from './indices-fallback';
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

    // ── 4. Wire módulos INSS + IRPF no pipeline do Calculo ──
    // A ordem de execução em Calculo.liquidar() é: verbas → INSS → IRPF.
    // O IrpfAdapter mantém ref ao InssAdapter para deduzir CS no momento certo.
    const inssAdapter = new InssModuloAdapter(verbasCore, this.csConfig, this.faixasINSSDB);
    const irpfAdapter = new IrpfModuloAdapter(
      verbasCore, this.irConfig, this.faixasIRDB,
      this.honorariosConfig, inssAdapter,
      this.correcaoConfig.data_liquidacao,
    );
    calculo.setInss(inssAdapter);
    calculo.setIrpf(irpfAdapter);

    // ── 5. Liquidar (pipeline Calculo + módulos) ──
    // Calculo.liquidar() computa indice_acumulado por ocorrência via composição
    // por segmento (ADC 58/59). Não mais precisa preservar o valor pré-computado
    // vindo do PJC, pois o engine agora calcula corretamente:
    //   - SELIC/SELIC_FAZENDA/JAM/DFP/IT/TABELA_UNICA_*: soma simples
    //   - IPCA-E/IPCA/INPC/IGP-M/TR/IPCAETR: produto
    //   - SEM_CORRECAO em um segmento: fator = 1
    calculo.liquidar();

    // Cache effective INSS rate for VERBA_INSS juros base reduction
    let totalDifPreJuros = 0;
    for (const vc of verbasCore) {
      for (const oc of vc.getOcorrenciasAtivas()) {
        const dif = oc.getDiferenca().toNumber();
        if (dif > 0) totalDifPreJuros += dif;
      }
    }
    const inssTotal = inssAdapter.totalSegurado + inssAdapter.totalEmpregador;
    (this as unknown as { _inssEffectiveRate?: number })._inssEffectiveRate =
      totalDifPreJuros > 0 ? Math.min(0.15, Math.max(0.05, inssTotal / totalDifPreJuros)) : 0.105;

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
        // Juros aplicados sobre DIFERENCA (nominal) ajustada pelo INSS proporcional
        // quando base_de_juros_das_verbas = VERBA_INSS (Sumula 200 TST + config PJe).
        // Sem VERBA_INSS, usa DIFERENCA pura.
        const jurosBase = Math.max(0, diferenca) * this.getJurosBaseMultiplier(vUI);
        const juros = this.calcularJurosOcorrencia(oc, jurosBase);
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

    // Multa 467 CLT: 50% sobre verbas RESCISORIAS (aviso, saldo salario, 13, ferias) nao pagas
    const multa467 = this.calcularMulta467(verbaResults);
    // Multa 523 CPC: 10% sobre total devido nao pago em 15 dias apos intimacao
    const multa523 = this.correcaoConfig.multa_523
      ? (principalCorrigido + jurosMora) * (this.correcaoConfig.multa_523_percentual ?? 10) / 100
      : 0;

    // FGTS rescisório + multa 40% (BUG FIX: era hardcoded em zero)
    const fgtsResult = this.calcularFGTS(verbaResults);

    // Descontos do líquido do reclamante (INSS segurado + IRPF)
    const csSegurado = inssAdapter.totalSegurado;
    const csEmpregador = inssAdapter.totalEmpregador;
    const csReclamante = inssAdapter.csReclamante;
    const irRetido = irpfAdapter.impostoDevido;
    // FGTS entra no liquido APENAS quando compor_principal=true. PJe-Calc com
    // destino=pagar_reclamante ainda separa FGTS do liquido no resultado "liquido_exequente".
    const fgtsNoLiquido = this.fgtsConfig.compor_principal ? fgtsResult.total_fgts : 0;
    // Honorarios contratuais: descontados do liquido do reclamante
    const honorariosContratuais = this.honorariosConfig.apurar_contratuais
      ? (this.honorariosConfig.valor_fixo ??
         (principalCorrigido + jurosMora) * (this.honorariosConfig.percentual_contratuais ?? 0) / 100)
      : 0;
    const liquidoReclamante = +(principalCorrigido + jurosMora + fgtsNoLiquido + multa467 + multa523
      - csReclamante - irRetido - honorariosContratuais).toFixed(2);

    const resumo: PjeResumo = {
      principal_bruto: +principalBruto.toFixed(2),
      principal_corrigido: +principalCorrigido.toFixed(2),
      juros_mora: +jurosMora.toFixed(2),
      fgts_total: fgtsResult.total_fgts,
      cs_segurado: +csSegurado.toFixed(2),
      cs_empregador: +csEmpregador.toFixed(2),
      ir_retido: +irRetido.toFixed(2),
      seguro_desemprego: 0,
      previdencia_privada: 0,
      salario_familia: 0,
      multa_523: +multa523.toFixed(2),
      multa_467: +multa467.toFixed(2),
      honorarios_sucumbenciais: +(this.honorariosConfig.apurar_sucumbenciais
        ? (principalCorrigido + jurosMora) * (this.honorariosConfig.percentual_sucumbenciais ?? 0) / 100
        : 0).toFixed(2),
      honorarios_contratuais: +honorariosContratuais.toFixed(2),
      custas: 0,
      custas_detalhadas: [],
      pensao_sobre_fgts: 0,
      pensao_total: 0,
      contribuicao_sindical: 0,
      abono_pecuniario: 0,
      liquido_reclamante: liquidoReclamante,
      total_reclamada: +(principalCorrigido + jurosMora + fgtsResult.total_fgts).toFixed(2),
    };

    return {
      data_liquidacao: this.correcaoConfig.data_liquidacao,
      verbas: verbaResults,
      fgts: fgtsResult,
      contribuicao_social: {
        segurado_devidos: inssAdapter.seguradoDevidos.map(d => ({
          ...d, recolhido: 0, diferenca: d.valor,
        })),
        segurado_pagos: [],
        empregador: inssAdapter.empregadorPorCompetencia,
        total_segurado_devidos: +csSegurado.toFixed(2),
        total_segurado_pagos: 0,
        total_segurado: +csSegurado.toFixed(2),
        total_empregador: +csEmpregador.toFixed(2),
      },
      imposto_renda: {
        base_calculo: irpfAdapter.baseCalculo,
        deducoes: irpfAdapter.deducoes,
        base_tributavel: irpfAdapter.baseTributavel,
        imposto_devido: irpfAdapter.impostoDevido,
        meses_rra: irpfAdapter.mesesRRA,
        metodo: irpfAdapter.metodo,
        ir_anos_anteriores: 0,
        ir_ano_liquidacao: irpfAdapter.irAnoLiquidacao,
        ir_13_exclusivo: irpfAdapter.ir13Exclusivo,
        ir_ferias_separado: irpfAdapter.irFeriasSeparado,
        meses_anos_anteriores: 0,
        meses_ano_liquidacao: irpfAdapter.mesesRRA,
      },
      seguro_desemprego: { apurado: false, parcelas: 0, valor_parcela: 0, total: 0 },
      previdencia_privada: { apurado: false, base: 0, percentual: 0, valor: 0 },
      salario_familia: { apurado: false, total: 0, ocorrencias: [] },
      resumo,
    };
  }

  // ── Cálculo de Multa 467 CLT (50% sobre verbas rescisórias não pagas) ──

  /**
   * Art. 467 CLT: 50% sobre verbas rescisórias (aviso prévio, saldo de salário,
   * 13° proporcional, férias) quando o empregador não paga no 1° audiência.
   * Base = verbas rescisórias CORRIGIDAS.
   */
  private calcularMulta467(verbaResults: PjeVerbaResult[]): number {
    if (!this.correcaoConfig.multa_467) return 0;
    const pct = this.correcaoConfig.multa_467_percentual ?? 50;
    let baseRescisoria = 0;
    for (const vr of verbaResults) {
      const carac = vr.caracteristica;
      if (carac === 'aviso_previo' || carac === '13_salario' || carac === 'ferias') {
        baseRescisoria += vr.total_corrigido;
      }
    }
    return +(baseRescisoria * pct / 100).toFixed(2);
  }

  // ── Cálculo de FGTS (depósitos + multa 40%) ──

  /**
   * Calcula FGTS rescisório + multa sobre diferenças salariais.
   * - Depósito: aliquota% sobre diferença (default 8%)
   * - Correção FGTS aproximada: 1 + 3% a.a. (TR assumida zero pós-2017)
   * - Multa: multa_percentual% sobre saldo corrigido (default 40%)
   * - LC 110/2001: +10% (Art. 1°) e +5% (Art. 2°) opcionais
   */
  private calcularFGTS(verbaResults: PjeVerbaResult[]): PjeFGTSResult {
    // Sempre calcula se houver verba com incidência FGTS + diferença positiva.
    // O flag fgtsConfig.apurar indica se HÁ SALDO INICIAL; mas as diferenças
    // reconhecidas no processo geram FGTS+multa mesmo sem saldo prévio.
    const temIncidenciaFgts = this.verbas.some((v, i) => {
      const inc = v.incidencias?.fgts !== false;
      const temDif = (verbaResults[i]?.total_diferenca ?? 0) > 0;
      return inc && temDif;
    });
    if (!temIncidenciaFgts) {
      return { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: 0 };
    }

    const dataLiq = new Decimal(new Date(this.correcaoConfig.data_liquidacao).getTime());
    const depositos: { competencia: string; base: number; aliquota: number; valor: number }[] = [];
    let totalDepositosCorrigido = new Decimal(0);
    const aliquota = 8;

    for (let i = 0; i < verbaResults.length; i++) {
      const vResult = verbaResults[i];
      const vUI = this.verbas[i];
      if (vUI.incidencias?.fgts === false) continue;

      for (const oc of vResult.ocorrencias) {
        if (oc.diferenca <= 0) continue;
        const valorDep = new Decimal(oc.diferenca).times(aliquota).div(100).toDP(2);
        depositos.push({
          competencia: oc.competencia,
          base: oc.diferenca,
          aliquota,
          valor: valorDep.toNumber(),
        });
        // Correção aproximada: 3% a.a. composto desde a competência
        const dataComp = new Decimal(new Date(oc.competencia + '-01').getTime());
        const anos = dataLiq.minus(dataComp).div(1000 * 3600 * 24 * 365.25).toNumber();
        const fator = new Decimal(1.03).pow(Math.max(0, anos));
        totalDepositosCorrigido = totalDepositosCorrigido.plus(valorDep.times(fator));
      }
    }

    const totalDepositos = depositos.reduce((s, d) => s + d.valor, 0);

    // Saldo saque — deduzir se configurado
    const saldoSaques = this.fgtsConfig.saldos_saques ?? [];
    const saldoDeduzido = this.fgtsConfig.deduzir_saldo
      ? saldoSaques.reduce((s, sq) => s + (sq.valor ?? 0), 0)
      : 0;

    // Base da multa
    let baseMulta = totalDepositosCorrigido;
    if (this.fgtsConfig.multa_base === 'nominal') baseMulta = new Decimal(totalDepositos);
    else if (this.fgtsConfig.multa_base === 'devido_menos_saldo') baseMulta = baseMulta.minus(saldoDeduzido);

    const multaPct = this.fgtsConfig.multa_percentual ?? 40;
    let multaValor = 0;
    if (this.fgtsConfig.multa_apurar) {
      if (this.fgtsConfig.multa_tipo === 'informada') {
        multaValor = this.fgtsConfig.multa_valor_informado ?? 0;
      } else {
        multaValor = baseMulta.times(multaPct).div(100).toDP(2).toNumber();
      }
    }

    // LC 110/2001 — incide sobre base FGTS corrigida
    const lc110_10 = this.fgtsConfig.lc110_10 ? totalDepositosCorrigido.times(10).div(100).toDP(2).toNumber() : 0;
    const lc110_05 = this.fgtsConfig.lc110_05 ? totalDepositosCorrigido.times(5).div(100).toDP(2).toNumber() : 0;

    const totalFgts = +(totalDepositosCorrigido.toNumber() - saldoDeduzido + multaValor + lc110_10 + lc110_05).toFixed(2);

    return {
      depositos,
      total_depositos: +totalDepositos.toFixed(2),
      multa_valor: multaValor,
      lc110_10,
      lc110_05,
      saldo_deduzido: saldoDeduzido,
      total_fgts: totalFgts,
    };
  }

  // ── Cálculo de juros (simples) ──

  /**
   * Calcula juros de mora sobre o valor corrigido de uma ocorrência.
   * Regime: juros_tipo do correcaoConfig (default: 'simples_mensal' a 1% a.m.).
   *
   * Data-início: max(vencimento_da_competencia, juros_inicio).
   *   - 'ajuizamento' (default PJe-Calc): data_ajuizamento do parametros
   *   - 'citacao': params.data_citacao (ou ajuizamento+60d se ausente)
   *   - 'vencimento': data da competência (juros por toda a inadimplência)
   *
   * Data-fim: data_liquidacao do correcaoConfig.
   */
  /**
   * Multiplicador da base de juros conforme base_de_juros_das_verbas.
   * - 'VERBA_INSS' (default do PJe-Calc): reduz por INSS proporcional (~10%)
   * - 'DIFERENCA' / outros: 1.0 (sem reducao)
   * Usa INSS efetivo computado pelo adapter se disponivel; senao 0.105 aproximado.
   */
  private getJurosBaseMultiplier(verba: PjeVerba): number {
    const base = (this.correcaoConfig.base_de_juros_das_verbas ?? 'DIFERENCA').toUpperCase().replace(/-/g, '_');
    if (base !== 'VERBA_INSS') return 1;
    // Somente reduz se a verba incidir INSS
    if (verba.incidencias?.contribuicao_social === false) return 1;
    // INSS efetivo: se o adapter ja rodou, use total_inss / total_dif.
    // Caso contrario, aproxima 10.5% (media entre 7.5% e 14% da progressiva).
    const cachedRate = (this as unknown as { _inssEffectiveRate?: number })._inssEffectiveRate;
    const rate = cachedRate ?? 0.105;
    return 1 - rate;
  }

  private calcularJurosOcorrencia(oc: OcorrenciaDeVerba, valorCorrigido: number): number {
    if (valorCorrigido <= 0) return 0;
    const tipo = (this.correcaoConfig.juros_tipo ?? 'simples_mensal') as string;
    if (tipo === 'nenhum' || tipo === 'sem_juros') return 0;

    const dataLiq = new Date(this.correcaoConfig.data_liquidacao);
    const inicioJuros = this.resolverDataInicioJuros();
    const dataComp = oc.getDataInicial();
    if (!dataComp) return 0;

    const valor = new Decimal(valorCorrigido);
    const combs = this.correcaoConfig.combinacoes_juros ?? [];

    // Quando combinacoes_juros tem entrada-base (sem 'de') e entrada com 'de',
    // ha juros PRE-JUDICIAIS (competencia -> ajuizamento) na base, depois o outro
    // tipo pos-ajuizamento. Nesse caso, inicio e a competencia, nao o ajuizamento.
    const temBase = combs.some(c => !c.de);
    const temPeriodoExplicito = combs.some(c => !!c.de);
    const aplicaPreJudicial = temBase && temPeriodoExplicito;

    const inicio = aplicaPreJudicial
      ? dataComp  // pre-judicial: conta desde a competencia
      : (dataComp.getTime() > inicioJuros.getTime() ? dataComp : inicioJuros);
    if (inicio.getTime() >= dataLiq.getTime()) return 0;
    if (combs.length > 0) {
      return valor.times(this.pctJurosCombinado(inicio, dataLiq, tipo, combs)).div(100).toDP(2).toNumber();
    }
    return valor.times(this.pctJurosSegmento(inicio, dataLiq, tipo)).div(100).toDP(2).toNumber();
  }

  /**
   * Retorna o percentual de juros acumulado em um segmento [inicio, fim] sob um tipo único.
   * Tipos: 'selic' soma SELIC mensal pro-rata. 'simples_mensal' e 'taxa_legal' = 1%/mês.
   * 'composto' retorna percentual equivalente (1 + r)^meses - 1. 'trd_simples' = 1%/mês.
   * 'um_porcento' = 1%/mês. 'meio_porcento' = 0.5%/mês. 'nenhum'/'sem_juros' = 0.
   */
  private pctJurosSegmento(inicio: Date, fim: Date, tipo: string): Decimal {
    if (inicio.getTime() >= fim.getTime()) return new Decimal(0);
    const t = tipo.toLowerCase();
    if (t === 'nenhum' || t === 'sem_juros') return new Decimal(0);
    if (t === 'selic' || t === 'selic_bacen' || t === 'selic_fazenda') {
      return new Decimal(this.somarSelicSimples(inicio, fim));
    }
    const pctMes = new Decimal(this.correcaoConfig.juros_percentual ?? (t === 'meio_porcento' ? 0.5 : 1));
    const meses = this.mesesEntre(inicio, fim);
    if (t === 'composto') {
      const fator = new Decimal(1).plus(pctMes.div(100)).pow(meses).minus(1);
      return fator.times(100);
    }
    return pctMes.times(meses);
  }

  /**
   * Combinações: lista ordenada de {de: Date, tipo: string}. Antes do primeiro "de",
   * aplica o `tipoBase`. A cada "de", troca o regime.
   */
  private pctJurosCombinado(
    inicio: Date, fim: Date, tipoBase: string,
    combs: { de?: string; tipo: string }[],
  ): Decimal {
    const ordenadas = [...combs]
      .filter(c => c.tipo)
      .map(c => ({ de: c.de ? new Date(c.de) : null, tipo: c.tipo }))
      .sort((a, b) => (a.de?.getTime() ?? 0) - (b.de?.getTime() ?? 0));

    let total = new Decimal(0);
    let cursor = inicio;
    let tipoAtual = tipoBase;

    for (const c of ordenadas) {
      if (!c.de) { tipoAtual = c.tipo; continue; }
      if (c.de.getTime() <= inicio.getTime()) { tipoAtual = c.tipo; continue; }
      if (c.de.getTime() >= fim.getTime()) break;
      total = total.plus(this.pctJurosSegmento(cursor, c.de, tipoAtual));
      cursor = c.de;
      tipoAtual = c.tipo;
    }
    total = total.plus(this.pctJurosSegmento(cursor, fim, tipoAtual));
    return total;
  }

  private resolverDataInicioJuros(): Date {
    const tipo = this.correcaoConfig.juros_inicio ?? 'ajuizamento';
    if (tipo === 'citacao') {
      const dc = this.params.data_citacao;
      if (dc) return new Date(dc);
      const aj = new Date(this.params.data_ajuizamento);
      aj.setDate(aj.getDate() + 60);
      return aj;
    }
    if (tipo === 'vencimento') {
      return new Date(this.params.data_admissao);
    }
    return new Date(this.params.data_ajuizamento);
  }

  private mesesEntre(inicio: Date, fim: Date): number {
    const ms = fim.getTime() - inicio.getTime();
    return new Decimal(ms).div(1000 * 3600 * 24 * 30.4375).toDP(6).toNumber();
  }

  private somarSelicSimples(inicio: Date, fim: Date): number {
    let total = new Decimal(0);
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const fimMes = new Date(fim.getFullYear(), fim.getMonth(), 1);
    while (cursor.getTime() <= fimMes.getTime()) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const taxa = SELIC_MENSAL[key];
      if (taxa !== undefined) {
        const ehInicio = cursor.getFullYear() === inicio.getFullYear() && cursor.getMonth() === inicio.getMonth();
        const ehFim = cursor.getFullYear() === fim.getFullYear() && cursor.getMonth() === fim.getMonth();
        let fator = 1;
        if (ehInicio && ehFim) {
          const dias = fim.getDate() - inicio.getDate();
          const diasMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
          fator = Math.max(0, dias) / diasMes;
        } else if (ehInicio) {
          const diasMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
          fator = (diasMes - inicio.getDate() + 1) / diasMes;
        } else if (ehFim) {
          const diasMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
          fator = fim.getDate() / diasMes;
        }
        total = total.plus(new Decimal(taxa).times(fator));
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return total.toNumber();
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
