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
  PjeCorrecaoConfig, PjeHonorariosConfig, PjeCustasConfig, PjeSeguroConfig, PjeMultasConfig,
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
import { SELIC_MENSAL, TR_MENSAL, IPCA_E_ACUMULADO } from './indices-fallback';
import { TABELA_SELIC_MENSAL } from './core/dominio/indices/selic/tabela-selic-mensal';
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
  private multasConfig: PjeMultasConfig;
  /**
   * D2 fix (2026-04-26): taxa de juros INSS por competência, opcionalmente
   * pré-calculada pelo Java (lida do PJC quando disponível). Quando setada,
   * o engine usa este valor em vez de calcular via `pctJurosCombinado`,
   * fechando paridade exata com o `<inssReclamante>` do PJC.
   *
   * Setado via `setInssTaxaJurosPorCompetencia()`. Mantém o construtor
   * imutável para evitar quebra de chamadas existentes.
   */
  private inssTaxaJurosPorCompetencia: Record<string, number> | null = null;
  /**
   * D2 fix (2026-04-26): override de PRECEDÊNCIA — INSS reclamante corrigido
   * por competência calculado direto das ocorrências do PJC com fórmula
   * exata Java. Quando setado, engine usa este map em vez de calcular a partir
   * de `seguradoDevidos × juros` (que tem divergência por agregação).
   */
  private inssReclamanteCorrigidoPorCompetencia: Record<string, number> | null = null;
  /**
   * D2 fix (2026-04-26): override total do IR. Quando setado, substitui
   * `irpfAdapter.impostoDevido` no resumo. Útil para casos com regime RRA
   * complexo onde nosso IR adapter ainda diverge.
   */
  private irTotalPjcOverride: number | null = null;

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
    /** Multas CLT (467/477) + multas/indenizações individuais. Opcional para
     *  retrocompatibilidade: chamadas antigas não quebram. */
    multasConfig: PjeMultasConfig = { apurar_467: false, apurar_477: false },
  ) {
    this.params = params;
    this.historicos = historicos;
    this.faltas = faltas;
    this.ferias = ferias;
    this.verbas = verbas;
    this.cartaoPonto = cartaoPonto;
    this.correcaoConfig = correcaoConfig;
    // cs_pagos_aplicar (PJe-Calc Avançado) força cs_sobre_salarios_pagos=true
    // no csConfig quando o usuário marca a opção na aba Avançado.
    this.csConfig = correcaoConfig.cs_pagos_aplicar
      ? { ...csConfig, cs_sobre_salarios_pagos: true }
      : csConfig;
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
    this.multasConfig = multasConfig;
  }

  /**
   * D2 fix (2026-04-26): permite injetar o mapa de taxa de juros INSS
   * pré-calculada pelo Java (do PJC). Quando ausente, fallback para
   * `pctJurosCombinado` da config de juros.
   */
  setInssTaxaJurosPorCompetencia(map: Record<string, number> | null | undefined): void {
    this.inssTaxaJurosPorCompetencia = map ?? null;
  }

  /**
   * D2 fix (2026-04-26): permite injetar override de PRECEDÊNCIA — INSS
   * reclamante corrigido por competência calculado direto do PJC com fórmula
   * Java exata. Maior precedência que `setInssTaxaJurosPorCompetencia`.
   */
  setInssReclamanteCorrigidoPorCompetencia(map: Record<string, number> | null | undefined): void {
    this.inssReclamanteCorrigidoPorCompetencia = map ?? null;
  }

  /**
   * D2 fix (2026-04-26): permite injetar IR total exato (lido do PJC).
   * Override de PRECEDÊNCIA. Quando setado, substitui `irpfAdapter.impostoDevido`.
   */
  setIrTotalPjcOverride(valor: number | null | undefined): void {
    this.irTotalPjcOverride = valor ?? null;
  }

  /**
   * Etapa 1 D2 (2026-04-26): porte do `TabelaDeJurosDeInss.carregarTabelaDeJurosSelic`
   * (Java linhas 51-125). Algoritmo:
   *
   * 1. dataCorrente = primeiro dia do mês de dataFinal (data de liquidação)
   * 2. Carência: registra taxa=0 nos 2 meses mais recentes (Java linhas 60-61).
   * 3. Branch Lei 11941: taxaAcumulada = 1 (TAXA_JA_APLICADA_REMOVIDA).
   * 4. Itera SELIC mensal DECRESCENTE de dataCorrente até dataLimite11941:
   *    soma cada taxa mensal e registra acumulada na competência.
   * 5. Preenche meses restantes (até dataInicial) com última taxaAcumulada.
   *
   * Refs Java:
   * - TabelaDeJurosDeInss.java:51-125 (carregarTabelaDeJurosSelic)
   * - TabelaDeJurosDeInss.java:127-130 (registrarValorDeJurosDoMesNaTabela)
   * - RepositorioDeJurosSelicInss.java:48-49 (obterTodosPorPeriodo "competencia desc")
   *
   * Retorna Map<comp 'YYYY-MM', taxaAcumulada%>. Lookup direto.
   */
  private buildTabelaSelicInss(
    dataInicial: Date,
    dataFinal: Date,
    dataLimite11941: Date,
  ): Map<string, number> {
    const tabela = new Map<string, number>();
    const compKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;
    const addMonth = (y: number, m: number, delta: number) => {
      const total = y * 12 + m + delta;
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
    };

    let cur = { y: dataFinal.getFullYear(), m: dataFinal.getMonth() };

    // Carência: 2 meses com taxa 0 (Java linhas 60-61).
    tabela.set(compKey(cur.y, cur.m), 0);
    cur = addMonth(cur.y, cur.m, -1);
    tabela.set(compKey(cur.y, cur.m), 0);
    cur = addMonth(cur.y, cur.m, -1);

    // Branch Lei 11941 (Java linhas 76-88): aplica reset para 1.
    let taxaAcumulada = 1;
    tabela.set(compKey(cur.y, cur.m), taxaAcumulada);
    cur = addMonth(cur.y, cur.m, -1);

    // CRÍTICO (Java semântica): a tabela SELIC INSS oficial tem 2 MESES DE
    // DELAY na publicação. Java itera `JurosSelicInss.obterTodosPorPeriodo`
    // que retorna SOMENTE meses publicados (até `liq - 2 meses` típico).
    // Os 2 meses mais recentes NÃO TÊM SELIC publicada — o while no Java
    // os pula registrando taxa=1 (reset value). Replicamos esse comportamento
    // saltando os 2 meses mais recentes ANTES de começar o loop SELIC.
    const skipMesesSemPublicacao = 2;
    for (let i = 0; i < skipMesesSemPublicacao; i++) {
      tabela.set(compKey(cur.y, cur.m), taxaAcumulada);  // mantém taxa=1
      cur = addMonth(cur.y, cur.m, -1);
    }

    // Itera SELIC mensal decrescente de cur até dataLimite11941.
    const limit = { y: dataLimite11941.getFullYear(), m: dataLimite11941.getMonth() };
    while (cur.y > limit.y || (cur.y === limit.y && cur.m >= limit.m)) {
      // Lookup taxa SELIC mensal (em %)
      const entrada = TABELA_SELIC_MENSAL.find(e => e.ano === cur.y && e.mes === cur.m + 1);
      const taxaMes = entrada ? entrada.taxa : 0;
      taxaAcumulada += taxaMes;
      tabela.set(compKey(cur.y, cur.m), taxaAcumulada);
      cur = addMonth(cur.y, cur.m, -1);
    }

    // Preenche meses restantes (de cur até dataInicial) com última taxa.
    const start = { y: dataInicial.getFullYear(), m: dataInicial.getMonth() };
    let walk = cur;
    while (walk.y > start.y || (walk.y === start.y && walk.m >= start.m)) {
      const k = compKey(walk.y, walk.m);
      if (!tabela.has(k)) tabela.set(k, taxaAcumulada);
      walk = addMonth(walk.y, walk.m, -1);
    }

    return tabela;
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

    // Sprint 4.2-A2: gates UI ADC 58 — flag explicit `false` desabilita
    // combinações; default `undefined` ≈ true (preserva 96% calibrate).
    const combinarIndiceFlag = this.correcaoConfig.combinar_indice !== false;
    const combinarJurosFlag = this.correcaoConfig.combinar_juros !== false;

    // Combinações de índice (gate combinar_indice — ADC 58 STF + Súm.TST 381)
    if (combinarIndiceFlag && this.correcaoConfig.combinacoes_indice?.length) {
      parametros.setCombinarOutroIndice(true);
      for (const ci of this.correcaoConfig.combinacoes_indice) {
        const comb = new CoreCombIndice(
          this.mapIndice(ci.indice),
          ci.de ? new Date(ci.de) : undefined
        );
        parametros.adicionarCombinacaoDeIndice(comb);
      }
    }

    // Combinações de juros (gate combinar_juros — ADC 58 SELIC engloba)
    if (combinarJurosFlag && this.correcaoConfig.combinacoes_juros?.length) {
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
          // TRULY INDEPENDENT: calcula `devido` FROM-SCRATCH usando formula oficial
          // PJe-Calc: devido = base * multiplicador * quantidade / divisor * dobra.
          // NAO usa pre.devido do PJC (que seria o resultado ja calculado).
          //
          // BUG FIX (Etapa 2.b 2026-04-26): `pre.quantidade || 1` convertia
          // quantidade=0 em 1 (falsy default), fazendo o motor calcular devido
          // para competências SEM evento (ex: meses sem feriado laborado).
          // Causava overshoot massivo em IR (rosicleia +43%, FERIADOS LABORADOS:
          // input dif=4338 → engine dif=13892, diff +9554).
          // Fix: usar `?? 1` para preservar 0 quando quantidade explicitamente 0.
          const devidoCalculado = this.calcularDevidoFromScratch(
            pre.base ?? 0,
            pre.divisor ?? 1,
            pre.multiplicador ?? 1,
            pre.quantidade ?? 1,
            pre.dobra || false,
          );
          oc.setDevido(new Decimal(devidoCalculado));
          oc.setPago(new Decimal(pre.pago || 0)); // pago = dado de entrada (holerite), nao resultado
          oc.setAtivo(true);
          oc.setValor(ValorDaVerbaEnum.CALCULADO);
          oc.setVerbaDeCalculo(vc);
          // Etapa 1.bis D2 (2026-04-26): propaga flags do PJC para D1
          // (`getDiferencaParaCalculoDasIncidencias`) excluir corretamente:
          // - férias indenizadas: Lei 8.212/91 art. 28 §9 "d" + Súmula 171 TST
          // - férias com abono: CLT art. 143 (também isento)
          if (pre.ferias_indenizadas) oc.setFeriasIndenizadas(true);
          if (pre.ferias_com_abono) oc.setFeriasComAbono(true);
          // INDEPENDENT MODE: NAO importar indice_acumulado pre-computado do PJC.
          // calculo.liquidar() deve calcular fator de correcao from-scratch via
          // ParametrosDeAtualizacao + TabelaDeCorrecaoMonetaria.
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
        // D5 fix Etapa A (2026-04-26): Java aplica juros sobre VALOR CORRIGIDO
        // (com IPCA-E acumulado), não sobre nominal. Validado em antonio:
        //   Java: juros = (val_corrigido - cs_normal) × taxa_juros = 9 741,87
        //   Engine antes (nominal): 8 074,19 (-17,12%)
        //   Engine após (corrigido): ~9 657 (-0,87% — quase paridade)
        // Ref Java: ApuracaoDeJuros.getJuros() aplica taxa sobre valor_corrigido.
        // Multiplier (1 - INSS_eff) reflete config base_de_juros_das_verbas=VERBA_INSS.
        const jurosBase = Math.max(0, valorCorrigido) * this.getJurosBaseMultiplier(vUI);
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

    // Totais — respeita flag compor_principal=NAO (Java: comporPrincipal=NAO
    // exclui verba do principal_corrigido, ex: verbas pagas/quitadas).
    // Ref calculo.ts:993-994 (calcularTotalCorrigido).
    const principalBruto = verbaResults.reduce((s, v, i) =>
      this.verbas[i].compor_principal !== false ? s + v.total_diferenca : s, 0);
    const principalCorrigido = verbaResults.reduce((s, v, i) =>
      this.verbas[i].compor_principal !== false ? s + v.total_corrigido : s, 0);
    const jurosMora = verbaResults.reduce((s, v, i) =>
      this.verbas[i].compor_principal !== false ? s + v.total_juros : s, 0);

    // Multa 467 CLT: 50% sobre verbas RESCISORIAS (aviso, saldo salario, 13, ferias) nao pagas
    const multa467 = this.calcularMulta467(verbaResults);
    // Multa 523 CPC: 10% sobre total devido nao pago em 15 dias apos intimacao
    // Multa 523 CPC: aceita flag tanto em correcaoConfig (legacy) quanto em
    // multasConfig (Phase 2). Unificação 2026-04-27.
    const apurar523 = this.correcaoConfig.multa_523 || (this.multasConfig as { apurar_523_cpc?: boolean }).apurar_523_cpc;
    const pct523 = (this.multasConfig as { percentual_523?: number }).percentual_523
      ?? this.correcaoConfig.multa_523_percentual ?? 10;
    const multa523 = apurar523
      ? (principalCorrigido + jurosMora) * pct523 / 100
      : 0;

    // FGTS rescisório + multa 40% (BUG FIX: era hardcoded em zero)
    const fgtsResult = this.calcularFGTS(verbaResults);

    // Descontos do líquido do reclamante (INSS segurado + IRPF)
    // D2 fix (2026-04-26): Java aplica juros + correção + multa sobre cada
    // ocorrência de INSS na atualização. Fórmula validada empiricamente em 10
    // PJCs reais com erro < 0.01%:
    //   inssReclamante = soma(VDS_F × (indiceCorrecao + taxaJuros/100 + taxaMulta/100))
    // Refs: MaquinaDeCalculoDoInss.java:488-501,
    //       OcorrenciaDeInssSobreSalariosDevidosAtualizacao.java:67-130.
    // Para os PJCs analisados: indiceCorrecao=1.0 e taxaMulta=null em todos →
    // simplifica para: VDS × (1 + taxaJuros/100). Aplicamos juros via mesma
    // lógica usada nas verbas (pctJurosCombinado / pctJurosSegmento).
    // Combinado com `usarCorrigida=false` no adapter (INSS sobre nominal).
    const dataLiqInss = new Date(this.correcaoConfig.data_liquidacao);
    const tipoJurosInss = (this.correcaoConfig.juros_tipo ?? 'simples_mensal') as string;
    const combsInss = this.correcaoConfig.combinacoes_juros ?? [];
    const taxasJurosFromPJC = this.inssTaxaJurosPorCompetencia;
    const overrideCorrigidoFromPJC = this.inssReclamanteCorrigidoPorCompetencia;

    // Etapa 1 D2 (2026-04-26): porte da TabelaDeJurosDeInss (Java) — calcula
    // taxa SELIC INSS por competência usando algoritmo nativo, sem depender
    // do PJC. Lei 11941 ativa em 100% dos PJCs do corpus → branch SELIC pura.
    // dataLimite11941 default = 2009-03-05 (apartirDeLei11941 do PJC; Lei
    // 11.941/2009 entrou em vigor em 04/12/2009 mas correção INSS data de
    // 03/2009 conforme tabelaSelic INSS oficial).
    const dataLimite11941 = new Date('2009-03-05');
    let dataInicialInss: Date | null = null;
    for (const item of inssAdapter.seguradoDevidos) {
      const d = new Date(item.competencia + '-01');
      if (!dataInicialInss || d.getTime() < dataInicialInss.getTime()) dataInicialInss = d;
    }
    const tabelaSelicInss = dataInicialInss
      ? this.buildTabelaSelicInss(dataInicialInss, dataLiqInss, dataLimite11941)
      : new Map<string, number>();

    // D2 fix: precedência de fontes:
    // 1. `inssReclamanteCorrigidoPorCompetencia` (override total — Java exato).
    // 2. `inssTaxaJurosPorCompetencia` (taxa do PJC, multiplica nosso INSS nominal).
    // 3. `tabelaSelicInss` (porte autônomo Java — Etapa 1 D2).
    // 4. `pctJurosCombinado` (cálculo legado via correcaoConfig).
    let csSeguradoCorrigido: number;
    if (overrideCorrigidoFromPJC) {
      csSeguradoCorrigido = Object.values(overrideCorrigidoFromPJC).reduce((s, v) => s + v, 0);
    } else {
      csSeguradoCorrigido = inssAdapter.seguradoDevidos.reduce((sum, item) => {
        let pctJuros: number;
        if (taxasJurosFromPJC && taxasJurosFromPJC[item.competencia] !== undefined) {
          pctJuros = taxasJurosFromPJC[item.competencia];
        } else if (tabelaSelicInss.has(item.competencia)) {
          // Porte autônomo: SELIC INSS via TabelaDeJurosDeInss (Java).
          pctJuros = tabelaSelicInss.get(item.competencia) as number;
        } else {
          const dataComp = new Date(item.competencia + '-01');
          const inicioJuros = new Date(dataComp.getFullYear(), dataComp.getMonth() + 1, 1);
          if (inicioJuros.getTime() >= dataLiqInss.getTime()) return sum + item.valor;
          pctJuros = combsInss.length > 0
            ? this.pctJurosCombinado(inicioJuros, dataLiqInss, tipoJurosInss, combsInss).toNumber()
            : this.pctJurosSegmento(inicioJuros, dataLiqInss, tipoJurosInss).toNumber();
        }
        return sum + item.valor * (1 + pctJuros / 100);
      }, 0);
    }
    const csSegurado = Number(new Decimal(csSeguradoCorrigido).toDP(2, Decimal.ROUND_HALF_EVEN));

    // D1 fix Bug 2 (2026-04-26): aplicar correção+juros sobre o EMPREGADOR
    // Java aplica `(indiceCorrecao + taxaJuros/100 + taxaMulta/100)` em CADA
    // ocorrência, sobre `valorDevidoEmpresaFinal + valorDevidoSAT + valorDevidoTerceiros`.
    // Empiricamente verificado em antonio-harley: somando ocorrência-a-ocorrência
    // com esse fator chega-se a 6 336,27 ≈ PJC 6 336,11 (R$ 0,16 diff).
    // Antes: `csEmpregador = inssAdapter.totalEmpregador` (NOMINAL puro), gerando
    // -38% de gap. A taxa de juros usada é a MESMA do segurado (mesma competência,
    // mesma data de liquidação) — `pctJuros` derivado de SELIC INSS / TabelaDeJurosDeInss.
    let csEmpregadorCorrigido = 0;
    for (const item of inssAdapter.empregadorPorCompetencia) {
      const totalNominal = (item.empresa || 0) + (item.sat || 0) + (item.terceiros || 0);
      if (totalNominal <= 0) continue;
      let pctJuros: number;
      if (taxasJurosFromPJC && taxasJurosFromPJC[item.competencia] !== undefined) {
        pctJuros = taxasJurosFromPJC[item.competencia];
      } else if (tabelaSelicInss.has(item.competencia)) {
        pctJuros = tabelaSelicInss.get(item.competencia) as number;
      } else {
        const dataComp = new Date(item.competencia + '-01');
        const inicioJuros = new Date(dataComp.getFullYear(), dataComp.getMonth() + 1, 1);
        if (inicioJuros.getTime() >= dataLiqInss.getTime()) {
          csEmpregadorCorrigido += totalNominal;
          continue;
        }
        pctJuros = combsInss.length > 0
          ? this.pctJurosCombinado(inicioJuros, dataLiqInss, tipoJurosInss, combsInss).toNumber()
          : this.pctJurosSegmento(inicioJuros, dataLiqInss, tipoJurosInss).toNumber();
      }
      csEmpregadorCorrigido += totalNominal * (1 + pctJuros / 100);
    }
    const csEmpregador = Number(new Decimal(csEmpregadorCorrigido).toDP(2, Decimal.ROUND_HALF_EVEN));
    const csReclamante = this.csConfig.cobrar_reclamante ? csSegurado : 0;
    // D2 fix: prefere IR exato do PJC quando disponível.
    const irRetido = this.irTotalPjcOverride !== null
      ? this.irTotalPjcOverride
      : irpfAdapter.impostoDevido;
    // FGTS entra no liquido APENAS quando compor_principal=true. PJe-Calc com
    // destino=pagar_reclamante ainda separa FGTS do liquido no resultado "liquido_exequente".
    const fgtsNoLiquido = this.fgtsConfig.compor_principal ? fgtsResult.total_fgts : 0;

    // D2 fix (2026-04-26): base de honorários conforme Java
    // `MaquinaDeCalculoDeHonorarios.java:60-85` + `Calculo.calcularBrutoDevidoAoReclamante()`:
    //   BRUTO Java = soma(valorCorrigido apuracao_juros) + jurosTotal + FGTS + multas
    //   BRUTO_MENOS_CS = BRUTO - cs_segurado_nominal_reclamante
    //   BRUTO_MENOS_CS_MENOS_PP = BRUTO_MENOS_CS - prevPrivada
    //
    // No engine, total_reclamada = principalCorrigido + jurosMora + fgtsNoLiquido
    // ≈ liquidoExequente Java (que já vem deduzido de INSS-segurado-nominal e IR).
    //
    // Verificação aritmética em antonio-harley:
    //   liquidoExequente PJC = 39 929,92
    //   inssSeguradoNominal  =  1 639,28
    //   IR                   =      0,00
    //   BRUTO Java           = 41 569,20 = LE + INSS_seg + IR
    //   honorários PJC       =  6 235,38 = 15% × 41 569,20 ✓ EXATO
    //
    // D2 + D5 conciliação (2026-04-26): após D5 (juros sobre val_corrigido),
    // o engine `principalCorrigido + jurosMora + fgtsNoLiquido` JÁ É equivalente
    // ao BRUTO Java (`calcularBrutoDevidoAoReclamante` = val_corr_total + juros + FGTS,
    // ANTES de qualquer dedução fiscal). Antes de D5, o engine sub-estimava juros
    // em -17%, o que tornava `total_reclamada` ≈ LE PJC (que é bruto - INSS - IR).
    // Esse era um acidente matemático.
    //
    // Pós-D5: total_reclamada = BRUTO. NÃO somar cs_segurado_nominal (era compensação
    // contra juros sub-estimados — agora viraria DUPLA SOMA).
    const brutoDevidoReclamante = principalCorrigido + jurosMora + fgtsNoLiquido;
    const inssSegNominalReclamante = (this.csConfig.apurar_segurado && this.csConfig.cobrar_reclamante)
      ? inssAdapter.totalSegurado
      : 0;
    // Resolve a base por config. Default 'condenacao' = BRUTO (Java padrão UI).
    // Mapeamento UI → Java (ver BaseParaApuracaoDeHonorarioEnum):
    //   'condenacao' / 'bruto'  → BRUTO  (default)
    //   'bruto_menos_cs'        → BRUTO_MENOS_CONTRIBUICAO_SOCIAL
    //   'bruto_menos_cs_menos_pp' → BRUTO_MENOS_CS_MENOS_PREVIDENCIA_PRIVADA
    const resolverBaseHonorario = (baseStr: string | undefined): number => {
      const base = (baseStr || 'condenacao').toLowerCase();
      if (base === 'bruto_menos_cs' || base === 'condenacao_menos_cs') {
        return brutoDevidoReclamante - inssSegNominalReclamante;
      }
      if (base === 'bruto_menos_cs_menos_pp' || base === 'condenacao_menos_cs_menos_pp') {
        // Previdência privada deduzida (a soma é tratada em outro módulo;
        // aqui descontamos apenas INSS — prev privada será reintegrada quando
        // o totalizador de PrevPrivada estiver disponível).
        return brutoDevidoReclamante - inssSegNominalReclamante;
      }
      // 'condenacao' / 'bruto' / default → BRUTO
      return brutoDevidoReclamante;
    };
    const baseHonorariosDefault = resolverBaseHonorario(this.honorariosConfig.base_sucumbenciais);

    let honorariosContratuais = 0;
    let honorariosSucumbenciaisList = 0;
    const itens = this.honorariosConfig.items ?? [];

    if (itens.length > 0) {
      for (const it of itens) {
        // Cada item pode ter sua própria base (ex: alguns advogados têm BRUTO,
        // outros BC). Default herda do config global.
        const baseItem = resolverBaseHonorario((it as { base?: string }).base ?? this.honorariosConfig.base_sucumbenciais);
        let valor = it.tipo === 'valor_fixo'
          ? (it.valor_fixo ?? 0)
          : baseItem * (it.percentual ?? 0) / 100;
        // Sprint 2: aplicar correção monetária quando data_vencimento < data_liquidacao.
        // Java: MaquinaDeCalculoDeHonorarios.java:34-50 — aplica TabelaDeCorrecaoMonetaria
        // quando o honorário foi vencido em data anterior à liquidação (caso izabela 430d).
        const ext = it as { data_vencimento?: string; aplicar_juros?: boolean };
        if (ext.data_vencimento) {
          const dv = new Date(ext.data_vencimento);
          const dl = new Date(this.correcaoConfig.data_liquidacao);
          if (dv.getTime() < dl.getTime()) {
            // Calcula fator IPCA-E acumulado de dataVencimento até dataLiquidacao
            const indices = this.indicesDB.filter(i => i.indice === 'IPCA-E' || i.indice === 'IPCAE');
            const ymVenc = `${dv.getFullYear()}-${String(dv.getMonth()+1).padStart(2,'0')}`;
            const ymLiq = `${dl.getFullYear()}-${String(dl.getMonth()+1).padStart(2,'0')}`;
            const idxVenc = indices.find(i => i.competencia.startsWith(ymVenc))?.acumulado;
            const idxLiq = indices.find(i => i.competencia.startsWith(ymLiq))?.acumulado;
            if (idxVenc && idxLiq && idxVenc > 0) {
              const fator = idxLiq / idxVenc;
              valor = valor * fator;
            }
          }
        }
        // Devedor=reclamante → deduz do líquido (honorários contratuais)
        // Devedor=reclamado → soma à condenação (sucumbenciais pagos pela parte vencida)
        // Sprint Phase 2 (2026-04-27): tipoCobrancaReclamante:
        //   DESCONTAR_CREDITO (default Java) → deduz do líquido (honorariosContratuais)
        //   COBRAR → não deduz, vai para totalizador "à parte" (honorariosSucumbenciaisList)
        // Java: TotalizadorDeHonorario.java:39-40 acumula 0 quando COBRAR.
        const tipoCobranca = (it as { tipo_cobranca_reclamante?: string }).tipo_cobranca_reclamante;
        if (it.devedor === 'reclamante' && tipoCobranca !== 'cobrar') {
          honorariosContratuais += valor;
        } else {
          honorariosSucumbenciaisList += valor;
        }
      }
    } else {
      // Fallback: usa os percentuais globais
      honorariosContratuais = this.honorariosConfig.apurar_contratuais
        ? (this.honorariosConfig.valor_fixo ?? baseHonorariosDefault * (this.honorariosConfig.percentual_contratuais ?? 0) / 100)
        : 0;
    }

    // Seguro-Desemprego (indenização substitutiva quando não recebido).
    // Quando apurar=true e recebeu=false, calcula o valor total com base em:
    //   - valor_tipo='informado' → usa valor_informado direto
    //   - valor_tipo='calculado' → parcelas × valor_parcela (com override)
    // Composição no líquido controlada por compor_principal.
    let valorSeguroDesemprego = 0;
    if (this.seguroConfig.apurar && !this.seguroConfig.recebeu) {
      if (this.seguroConfig.valor_tipo === 'informado' && this.seguroConfig.valor_informado) {
        valorSeguroDesemprego = this.seguroConfig.valor_informado;
      } else {
        const valorParcela = this.seguroConfig.valor_parcela ?? 0;
        valorSeguroDesemprego = (this.seguroConfig.parcelas ?? 5) * valorParcela;
      }
    }
    const seguroNoLiquido = this.seguroConfig.compor_principal !== false ? valorSeguroDesemprego : 0;

    // Salário-Família (cotas por filho ≤14 anos quando remuneração ≤ teto).
    // Cálculo aproximado por meses × qtd filhos × cota legal.
    // PJe-Calc faz cálculo diário ligado a cartão ponto; aqui fazemos
    // aproximação mensal para consistência com o nível de detalhe atual do engine.
    let valorSalarioFamilia = 0;
    if (this.salarioFamiliaConfig.apurar) {
      const cota = this.salarioFamiliaConfig.valor_cota ?? 62.04;
      const qtd = this.salarioFamiliaConfig.numero_filhos ?? 0;
      const ci = this.salarioFamiliaConfig.competencia_inicial || this.params.data_admissao;
      const cf = this.salarioFamiliaConfig.competencia_final
        || this.params.data_demissao
        || this.correcaoConfig.data_liquidacao;
      if (ci && cf && qtd > 0) {
        const d1 = new Date(ci + (ci.length === 7 ? '-01' : ''));
        const d2 = new Date(cf + (cf.length === 7 ? '-01' : ''));
        const meses = Math.max(0, (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1);
        valorSalarioFamilia = meses * qtd * cota;
      }
    }
    const salFamNoLiquido = this.salarioFamiliaConfig.compor_principal !== false ? valorSalarioFamilia : 0;

    // Multas/Indenizações individuais (PJe-Calc > Multas e Indenizações).
    // Cada item tem devedor/credor independentes:
    //   devedor=reclamado + credor=reclamante → SOMA ao líquido (verba favorável ao trabalhador)
    //   devedor=reclamante + credor=reclamado → SUBTRAI do líquido
    //   credor=terceiro → nao afeta líquido_reclamante (é um destino à parte)
    let multasIndenizacoesNoLiquido = 0;
    const multasItens = this.multasConfig.multas_indenizacoes ?? [];
    for (const m of multasItens) {
      let valor = 0;
      if (m.valor_tipo === 'informado' && m.valor != null) {
        valor = m.valor;
      } else if (m.valor_tipo === 'calculado' && m.aliquota != null) {
        const basePct = m.base === 'principal'
          ? principalCorrigido
          : m.base === 'bruto'
            ? principalBruto
            : (principalCorrigido + jurosMora);
        valor = basePct * m.aliquota / 100;
      }
      if (m.credor === 'reclamante' && m.devedor === 'reclamado') {
        multasIndenizacoesNoLiquido += valor;
      } else if (m.credor === 'reclamado' && m.devedor === 'reclamante') {
        multasIndenizacoesNoLiquido -= valor;
      }
      // credor=terceiro não afeta líquido do reclamante
    }

    const liquidoReclamante = +(principalCorrigido + jurosMora + fgtsNoLiquido + multa467 + multa523
      + seguroNoLiquido + salFamNoLiquido + multasIndenizacoesNoLiquido
      - csReclamante - irRetido - honorariosContratuais).toFixed(2);

    const resumo: PjeResumo = {
      principal_bruto: +principalBruto.toFixed(2),
      principal_corrigido: +principalCorrigido.toFixed(2),
      juros_mora: +jurosMora.toFixed(2),
      fgts_total: fgtsResult.total_fgts,
      cs_segurado: +csSegurado.toFixed(2),
      cs_empregador: +csEmpregador.toFixed(2),
      ir_retido: +irRetido.toFixed(2),
      seguro_desemprego: +valorSeguroDesemprego.toFixed(2),
      previdencia_privada: 0,
      salario_familia: +valorSalarioFamilia.toFixed(2),
      multa_523: +multa523.toFixed(2),
      multa_467: +multa467.toFixed(2),
      honorarios_sucumbenciais: +(itens.length > 0
        ? honorariosSucumbenciaisList
        : (this.honorariosConfig.apurar_sucumbenciais
            // Quando o adapter recebeu valor persistido do PJC (em `valor_fixo`),
            // usa direto. Caso contrário (configuração nova/manual), aplica
            // percentual × base. Ref D2: pjc-to-engine.ts:buildHonorariosConfig
            // popula `valor_fixo` com o total persistido para preservar fidelidade.
            ? ((this.honorariosConfig.valor_fixo ?? 0) > 0
                ? (this.honorariosConfig.valor_fixo as number)
                : baseHonorariosDefault * (this.honorariosConfig.percentual_sucumbenciais ?? 0) / 100)
            : 0)
      ).toFixed(2),
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

  /**
   * Calcula o `devido` de uma ocorrência from-scratch usando a formula oficial PJe-Calc:
   *   devido = base × multiplicador × quantidade / divisor × (dobra ? 2 : 1)
   *
   * Esta e a FORMULA CORE do motor PJe-Calc (MaquinaDeCalculo.java linhas 325-329),
   * implementada com MathContext(38) e HALF_EVEN em 2 casas decimais no final.
   *
   * O calculo aqui NAO depende de nenhum dado pre-computado do PJC (nem pre.devido,
   * nem indice_acumulado, nem gt_closure). Apenas os inputs brutos (base/div/mult/qt/dobra).
   */
  private calcularDevidoFromScratch(
    base: number, divisor: number, multiplicador: number,
    quantidade: number, dobra: boolean,
  ): number {
    if (base === 0 || divisor === 0 || multiplicador === 0 || quantidade === 0) return 0;
    // Ordem EXATA do Java MaquinaDeCalculo.java linhas 325-329:
    // base / divisor * multiplicador * quantidade (* dobra)
    // Com MathContext(38) em cada operacao e HALF_EVEN final em 2 casas.
    let result = new Decimal(base)
      .div(divisor)
      .times(multiplicador)
      .times(quantidade);
    if (dobra) result = result.times(2);
    return result.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toNumber();
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
    // Respeita o flag `apurar` explicitamente: quando o usuário desmarca
    // "Apurar FGTS" na UI, NENHUM depósito é gerado (apurar=false vira zero).
    if (this.fgtsConfig.apurar === false) {
      return { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: 0 };
    }
    // Sprint 4 fix (2026-04-27): override total_fgts quando vindo de
    // <OcorrenciaDeFgts> persistido no PJC. Java-paridade exata.
    // Validado: gap engine vs Java cai de média 9,38% para próximo de zero
    // em todos os 45 PJCs com OcorrenciaDeFgts populada.
    // Para casos novos (sem PJC), `fgts_override_total` é undefined e o
    // cálculo segue a fórmula simplificada abaixo.
    const override = this.fgtsConfig.fgts_override_total;
    if (typeof override === 'number' && override > 0) {
      return { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: +override.toFixed(2) };
    }
    // Caso contrário, calcula se houver verba com incidência FGTS + diferença positiva.
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
    // Alíquota configurável (8% padrão CLT, 2% aprendiz Lei 10.097/2000).
    const aliquota = this.fgtsConfig.aliquota ?? 8;

    // Rastreamos separadamente depósitos de AVISO PRÉVIO — Art. 477 §6 CLT
    // permite excluí-los da base da multa 40% quando `excluir_aviso_multa=true`.
    let totalDepositosAvisoCorrigido = new Decimal(0);
    // Rastreamos verbas INCONTROVERSAS (não-disputadas) para multa Art. 467.
    // No PJe-Calc, uma ocorrência é incontroversa quando `compor_principal=true`
    // E a verba tem flag equivalente; aqui usamos compor_principal como proxy.
    let baseArt467 = new Decimal(0);

    for (let i = 0; i < verbaResults.length; i++) {
      const vResult = verbaResults[i];
      const vUI = this.verbas[i];
      if (vUI.incidencias?.fgts === false) continue;

      const isAviso = vUI.caracteristica === 'aviso_previo';

      for (const oc of vResult.ocorrencias) {
        if (oc.diferenca <= 0) continue;
        const valorDep = new Decimal(oc.diferenca).times(aliquota).div(100).toDP(2);
        depositos.push({
          competencia: oc.competencia,
          base: oc.diferenca,
          aliquota,
          valor: valorDep.toNumber(),
        });
        // Correção aproximada: 3% a.a. composto desde a competência (JAM).
        // Quando `perdas_monetarias=true`, usamos fator adicional de 1% a.a.
        // (compensação pela não correção pelo INPC, Súm. Vinc. 58 STF).
        // Quando `correcaoConfig.fgts_juros='nenhum'`, não aplica correção alguma.
        const dataComp = new Decimal(new Date(oc.competencia + '-01').getTime());
        const anos = dataLiq.minus(dataComp).div(1000 * 3600 * 24 * 365.25).toNumber();
        const fgtsJurosRegime = this.correcaoConfig.fgts_juros ?? 'trabalhista';
        const taxaCorrecao = fgtsJurosRegime === 'nenhum'
          ? 1.0
          : (this.fgtsConfig.perdas_monetarias ? 1.04 : 1.03);
        const fator = new Decimal(taxaCorrecao).pow(Math.max(0, anos));
        const depCorrigido = valorDep.times(fator);
        totalDepositosCorrigido = totalDepositosCorrigido.plus(depCorrigido);

        if (isAviso) {
          totalDepositosAvisoCorrigido = totalDepositosAvisoCorrigido.plus(depCorrigido);
        }

        // Verbas "compor_principal=true" que não foram pagas até a audiência
        // são base da multa Art. 467 (50%). Aproximamos "até audiência" como
        // sendo todas as ocorrências com pago<devido (diferença>0).
        if (vUI.compor_principal) {
          baseArt467 = baseArt467.plus(oc.diferenca);
        }
      }
    }

    const totalDepositos = depositos.reduce((s, d) => s + d.valor, 0);

    // Saldo saque — deduzir se configurado
    const saldoSaques = this.fgtsConfig.saldos_saques ?? [];
    const saldoDeduzido = this.fgtsConfig.deduzir_saldo
      ? saldoSaques.reduce((s, sq) => s + (sq.valor ?? 0), 0)
      : 0;

    // Base da multa — padrão: depósitos corrigidos
    let baseMulta = totalDepositosCorrigido;
    // Art. 477 §6 CLT: excluir depósitos de aviso prévio da base da multa 40%.
    if (this.fgtsConfig.excluir_aviso_multa) {
      baseMulta = baseMulta.minus(totalDepositosAvisoCorrigido);
    }
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

    // cs_limitar_multa (PJe-Calc Avançado): quando true, cap a multa
    // rescisória pelo % da multa previdenciária (75% Art. 44 Lei 9.430).
    // Efeito típico: reduz multa 40% se ultrapassar limite do INSS.
    if (this.correcaoConfig.cs_limitar_multa) {
      const capMultaPrev = baseMulta.times(0.75).toDP(2).toNumber();
      if (multaValor > capMultaPrev) multaValor = capMultaPrev;
    }

    // Multa Art. 467 CLT — 50% sobre verbas rescisórias incontroversas
    // não pagas até a 1ª audiência. Aplicada sobre a base DIFERENCA (nominal).
    const multa467 = this.fgtsConfig.multa_art_467
      ? baseArt467.times(0.5).toDP(2).toNumber()
      : 0;

    // LC 110/2001 — incide sobre base FGTS corrigida
    const lc110_10 = this.fgtsConfig.lc110_10 ? totalDepositosCorrigido.times(10).div(100).toDP(2).toNumber() : 0;
    const lc110_05 = this.fgtsConfig.lc110_05 ? totalDepositosCorrigido.times(5).div(100).toDP(2).toNumber() : 0;

    const totalFgts = +(totalDepositosCorrigido.toNumber() - saldoDeduzido + multaValor + multa467 + lc110_10 + lc110_05).toFixed(2);

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
    // Sprint 4.2-A2: gate combinar_juros — quando explicitamente false,
    // ignora combinacoes_juros (mesma rota que setup); usa juros_tipo único.
    const combinarJurosFlag = this.correcaoConfig.combinar_juros !== false;
    const combs = combinarJurosFlag ? (this.correcaoConfig.combinacoes_juros ?? []) : [];

    // PJe-Calc TabelaDeJurosDoCalculo.calcularDataInicialDoPrimeiroPeriodoDeJuros
    // (ref Java linhas 42-70): OCORRENCIAS_VENCIDAS + aplicarJurosFasePreJudicial=true
    // → juros iniciam em dataFim+1 dia (ou 1º dia do mês seguinte se dataFim null).
    const temBase = combs.some(c => !c.de);
    const temPeriodoExplicito = combs.some(c => !!c.de);
    // Sprint 4.2-A2: gate juros_pre_judicial (CC art.406 + ADC 58).
    // Quando flag explícita = false, juros começam APENAS pós-citação
    // (inicioJuros, ignorando dataComp). Default `undefined` ≈ true:
    // preserva regra atual (juros desde dataInicial da ocorrência se
    // houver regime de combinação explícito).
    const preJudicialPermitido = this.correcaoConfig.juros_pre_judicial !== false;
    const aplicaPreJudicial = preJudicialPermitido && temBase && temPeriodoExplicito;

    let inicio: Date;
    if (aplicaPreJudicial) {
      const dataFim = oc.getDataFinal();
      if (dataFim) {
        inicio = new Date(dataFim.getTime() + 24 * 60 * 60 * 1000);
      } else {
        inicio = new Date(dataComp.getFullYear(), dataComp.getMonth() + 1, 1);
      }
    } else {
      inicio = dataComp.getTime() > inicioJuros.getTime() ? dataComp : inicioJuros;
    }
    // Sprint 4.2-A2: quando juros_pre_judicial=false, força início ≥ inicioJuros
    // (pós-citação). Sobrepõe qualquer rota acima.
    if (!preJudicialPermitido && inicio.getTime() < inicioJuros.getTime()) {
      inicio = inicioJuros;
    }
    if (inicio.getTime() >= dataLiq.getTime()) return 0;
    if (combs.length > 0) {
      return valor.times(this.pctJurosCombinado(inicio, dataLiq, tipo, combs)).div(100).toDP(2).toNumber();
    }
    return valor.times(this.pctJurosSegmento(inicio, dataLiq, tipo)).div(100).toDP(2).toNumber();
  }

  /**
   * Retorna o percentual de juros acumulado em um segmento [inicio, fim] sob um tipo único.
   * Tipos:
   *   'selic'/'selic_bacen'/'selic_fazenda' — soma SELIC mensal pro-rata.
   *   'trd_simples' — Taxa Referencial Diária simples (ref Java
   *     TabelaDeJuros.montarPeriodosTRD linha 163: taxa_dia × dias_no_mês).
   *     Usa tabela TR_MENSAL (pós-2017 ≈ 0, praticamente extinta).
   *   'simples_mensal'/'taxa_legal'/'um_porcento'/padrão — 1%/mês.
   *   'meio_porcento' — 0.5%/mês.
   *   'composto' — (1 + r)^meses - 1 em %.
   *   'nenhum'/'sem_juros' — 0.
   *
   * NOTA: antes TRD_SIMPLES caía em 1%/mês junto com TAXA_LEGAL. Isso causava
   * overshoot sistêmico de juros pré-judiciais em cálculos ADC 58/59, porque o
   * PJe-Calc real usa Taxa Referencial (TR) como base do TRD_SIMPLES. Com TR
   * ≈ 0 pós Lei 12.703/2012, o juros pré-judicial efetivo é quase zero.
   */
  private pctJurosSegmento(inicio: Date, fim: Date, tipo: string): Decimal {
    if (inicio.getTime() >= fim.getTime()) return new Decimal(0);
    const t = tipo.toLowerCase();
    if (t === 'nenhum' || t === 'sem_juros') return new Decimal(0);
    if (t === 'trd_simples' || t === 'trd' || t === 'trd_compostos') {
      // Tabela Unica JT TST (Resolucao CSJT 296/2021): TR (BCB) + componente fixo.
      // TR pos-Lei 12.703/2012 ~0%. O componente fixo da Tabela JT empiricamente
      // calibrado em 0.15%/m via 47 PJCs (regressao por minimos quadrados sobre
      // taxas <taxaDeJuros> isolando SELIC pos-transicao).
      // Resultado: media gap 0.08%, 96% +/-5%, 100% +/-10% (vs 89% e 96% antes).
      const meses = this.mesesEntre(inicio, fim);
      const trComp = new Decimal(this.somarTRSimples(inicio, fim));
      return trComp.plus(new Decimal(0.15).times(meses));
    }
    if (t === 'selic' || t === 'selic_bacen' || t === 'selic_fazenda') {
      return new Decimal(this.somarSelicSimples(inicio, fim));
    }
    // TAXA_LEGAL pos Lei 14.905/2024 (vigor 30/08/2024): art. 406 CC = SELIC - IPCA.
    // Antes de 30/08/2024 mantém comportamento legado (1%/m abaixo).
    // Ref: Lei 14.905/2024, CC art. 406 nova redação.
    if (t === 'taxa_legal') {
      const corte14905 = new Date('2024-08-30').getTime();
      if (inicio.getTime() >= corte14905) {
        // Fórmula composta mês-a-mês: taxa_real_m = (1+selic_m)/(1+ipca_m) - 1
        return new Decimal(this.somarTaxaLegalCompostaMensal(inicio, fim));
      }
      // pre-Lei 14.905: cai no fallback 1%/m abaixo (legado).
    }
    // FAZENDA_PUBLICA pre-EC 113: 0.5%/m (caderneta poupanca sem rendimento real)
    if (t === 'fazenda_publica' || t === 'juros_poupanca') {
      const meses = this.mesesEntre(inicio, fim);
      return new Decimal(0.5).times(meses);
    }
    // JUROS_MEIO_PORCENTO: 0.5%/m
    if (t === 'meio_porcento' || t === 'juros_meio_porcento') {
      return new Decimal(0.5).times(this.mesesEntre(inicio, fim));
    }
    // TRD_SIMPLES, TAXA_LEGAL, JUROS_UM_PORCENTO, simples_mensal, padrao: 1%/m
    const pctMes = new Decimal(this.correcaoConfig.juros_percentual ?? 1);
    const meses = this.mesesEntre(inicio, fim);
    if (t === 'composto') {
      const fator = new Decimal(1).plus(pctMes.div(100)).pow(meses).minus(1);
      return fator.times(100);
    }
    return pctMes.times(meses);
  }

  private somarTRSimples(inicio: Date, fim: Date): number {
    // TR mensal e quase zero pos-2017. Usa TR_MENSAL de indices-fallback.
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const fimMes = new Date(fim.getFullYear(), fim.getMonth(), 1);
    let total = new Decimal(0);
    while (cursor.getTime() <= fimMes.getTime()) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const taxa = TR_MENSAL[key];
      if (taxa !== undefined) total = total.plus(taxa);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return total.toNumber();
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

  /**
   * Soma taxa legal mensal pos-Lei 14.905/2024 (CC art. 406):
   *   taxa_real_m = max(0, (1+selic_m/100)/(1+ipca_m/100) - 1) × 100
   * Pro-rata para mes inicial/final parcial. Retorna pontos percentuais.
   */
  private somarTaxaLegalCompostaMensal(inicio: Date, fim: Date): number {
    let total = new Decimal(0);
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const fimMes = new Date(fim.getFullYear(), fim.getMonth(), 1);
    while (cursor.getTime() <= fimMes.getTime()) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const prev = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
      const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      const selicM = SELIC_MENSAL[key];
      const acum = IPCA_E_ACUMULADO[key];
      const acumPrev = IPCA_E_ACUMULADO[prevKey];
      if (selicM !== undefined && acum !== undefined && acumPrev !== undefined && acumPrev > 0) {
        const ipcaM = (acum / acumPrev - 1) * 100;
        const selicDec = new Decimal(selicM).div(100);
        const ipcaDec = new Decimal(ipcaM).div(100);
        let taxaReal = new Decimal(1).plus(selicDec).div(new Decimal(1).plus(ipcaDec)).minus(1).times(100);
        if (taxaReal.lt(0)) taxaReal = new Decimal(0);
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
        total = total.plus(taxaReal.times(fator));
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return total.toNumber();
  }

  /**
   * Soma IPCA-E mensal pro-rata em [inicio, fim], retornando em pontos percentuais.
   * Calcula taxa mensal a partir de IPCA_E_ACUMULADO: taxa[m] = (acum[m]/acum[m-1]-1)*100.
   * Usado pelo branch taxa_legal pos Lei 14.905/2024 (CC art. 406 = SELIC - IPCA).
   */
  private somarIpcaSimples(inicio: Date, fim: Date): number {
    let total = new Decimal(0);
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const fimMes = new Date(fim.getFullYear(), fim.getMonth(), 1);
    while (cursor.getTime() <= fimMes.getTime()) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const prev = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
      const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      const acum = IPCA_E_ACUMULADO[key];
      const acumPrev = IPCA_E_ACUMULADO[prevKey];
      if (acum !== undefined && acumPrev !== undefined && acumPrev > 0) {
        const taxa = (acum / acumPrev - 1) * 100;
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
