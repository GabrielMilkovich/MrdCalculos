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
} from './engine-types';

// Core imports
import {
  Calculo,
  VerbaDeCalculo,
  OcorrenciaDeVerba,
  ParametrosDeAtualizacao,
  CombinacaoDeIndice as CoreCombIndice,
  CombinacaoDeJuros as CoreCombJuros,
  TabelaDeCorrecaoMonetaria,
  Inss,
  Irpf,
  Fgts,
  Honorario,
  CustasJudiciais,
  Multa,
  totalizar,
  arredondarValorMonetario,
  IndiceMonetarioEnum,
  IndicesAcumuladosEnum,
  JurosEnum,
  CaracteristicaDaVerbaEnum,
  OcorrenciaDePagamentoEnum,
  LogicoEnum,
  ValorDaVerbaEnum,
  BaseDeJurosDasVerbasEnum,
  ServicoDeCalculo,
  PrimeiraFaixaPrevidenciaria,
  SegundaFaixaPrevidenciaria,
  TerceiraFaixaPrevidenciaria,
  QuartaFaixaPrevidenciaria,
  type FaixaPrevidenciaria,
} from './core/index';
import { TabelaIrpf } from './core/dominio/irpf/tabela-irpf';

export class PjeCalcEngineV3 {
  private params: PjeParametros;
  private historicos: PjeHistoricoSalarial[];
  private verbas: PjeVerba[];
  private correcaoConfig: PjeCorrecaoConfig;
  private csConfig: PjeCSConfig;
  private irConfig: PjeIRConfig;
  private fgtsConfig: PjeFGTSConfig;
  private honorariosConfig: PjeHonorariosConfig;
  private custasConfig: PjeCustasConfig;
  private indicesDB: PjeIndiceRow[];
  private faixasINSSDB: PjeINSSFaixaRow[];

  constructor(
    params: PjeParametros,
    historicos: PjeHistoricoSalarial[],
    _faltas: PjeFalta[],
    _ferias: PjeFerias[],
    verbas: PjeVerba[],
    _cartaoPonto: PjeCartaoPonto[],
    fgtsConfig: PjeFGTSConfig,
    csConfig: PjeCSConfig,
    irConfig: PjeIRConfig,
    correcaoConfig: PjeCorrecaoConfig,
    honorariosConfig: PjeHonorariosConfig,
    custasConfig: PjeCustasConfig,
    _seguroConfig: PjeSeguroConfig,
    indicesDB: PjeIndiceRow[] = [],
    faixasINSSDB: PjeINSSFaixaRow[] = [],
    _faixasIRDB: PjeIRFaixaRow[] = [],
  ) {
    this.params = params;
    this.historicos = historicos;
    this.verbas = verbas;
    this.correcaoConfig = correcaoConfig;
    this.csConfig = csConfig;
    this.irConfig = irConfig;
    this.fgtsConfig = fgtsConfig;
    this.honorariosConfig = honorariosConfig;
    this.custasConfig = custasConfig;
    this.indicesDB = indicesDB;
    this.faixasINSSDB = faixasINSSDB;
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

    // ── 4. Liquidar correção monetária por SEGMENTOS ──
    // Quando há combinações de índice (ADC 58/59), cada ocorrência precisa
    // ser corrigida com o fator COMPOSTO dos segmentos que ela atravessa:
    //   Ex: IPCA-E(comp→citação) × SELIC(citação→liquidação)
    // A TabelaDeCorrecaoMonetaria do core/ não implementa combinações completas,
    // então calculamos aqui diretamente por ocorrência.
    const dataLiq = new Date(this.correcaoConfig.data_liquidacao);
    const dataAjuiz = new Date(this.params.data_ajuizamento);
    const jurosPercentualMensal = (this.correcaoConfig.juros_percentual ?? 1) / 100;
    const combJuros = this.correcaoConfig.combinacoes_juros ?? [];
    const combIndice = this.correcaoConfig.combinacoes_indice ?? [];

    // Pré-calcula alíquota INSS efetiva REAL (para VERBA_INSS)
    // VERBA_INSS: base = diferença − INSS proporcional. Todos 18 PJC usam isso.
    const baseJurosVerbaInss = (this.correcaoConfig.base_de_juros_das_verbas || '').toUpperCase() === 'VERBA_INSS';
    let taxaINSSEfetiva = 0;
    if (baseJurosVerbaInss && this.csConfig.apurar_segurado && this.csConfig.cobrar_reclamante) {
      // Calcula taxa INSS real: soma nominal de todas verbas com CS / INSS calculado
      let totalBase = 0, totalINSS = 0;
      for (const vc of verbasCore) {
        if (!vc.getIncidenciaINSS()) continue;
        for (const oc of vc.getOcorrenciasAtivas()) {
          const dif = oc.getDiferenca().toNumber();
          if (dif <= 0) continue;
          totalBase += dif;
          // Calcula INSS para esta base com faixas da competência
          const dataIni = oc.getDataInicial();
          if (!dataIni) continue;
          const comp = `${dataIni.getFullYear()}-${String(dataIni.getMonth() + 1).padStart(2, '0')}-01`;
          const faixas = this.faixasINSSDB
            .filter(f => f.competencia_inicio <= comp && (!f.competencia_fim || f.competencia_fim >= comp))
            .sort((a, b) => a.faixa - b.faixa);
          if (faixas.length > 0) {
            const isProgressivo = comp >= '2020-03-01';
            const teto = faixas[faixas.length - 1].valor_ate;
            const baseCapped = Math.min(dif, teto);
            if (isProgressivo) {
              let rest = baseCapped, ant = 0;
              for (const f of faixas) {
                const p = Math.min(rest, f.valor_ate - ant);
                if (p > 0) totalINSS += p * f.aliquota;
                rest -= p; ant = f.valor_ate;
                if (rest <= 0) break;
              }
            } else {
              let aliq = faixas[faixas.length - 1].aliquota;
              for (const f of faixas) { if (baseCapped <= f.valor_ate) { aliq = f.aliquota; break; } }
              totalINSS += baseCapped * aliq;
            }
          }
        }
      }
      taxaINSSEfetiva = totalBase > 0 ? totalINSS / totalBase : 0;
    }

    if (combIndice.length > 0) {
      // Calcula correção segmentada por ocorrência
      for (const vc of verbasCore) {
        for (const oc of vc.getOcorrenciasAtivas()) {
          const dataIni = oc.getDataInicial();
          if (!dataIni) continue;
          if (oc.getDiferenca().isZero()) continue;

          // Súmula 381: correção começa no mês SUBSEQUENTE ao vencimento
          const compOc = `${dataIni.getFullYear()}-${String(dataIni.getMonth() + 1).padStart(2, '0')}`;
          const mesSubsequente = (comp: string) => {
            const [y, m] = comp.split('-').map(Number);
            return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
          };
          const compCorrecaoInicio = mesSubsequente(compOc) + '-01';
          const compLiqStr = this.correcaoConfig.data_liquidacao;

          // Montar breakpoints de índice
          const breakpoints = new Set<string>();
          breakpoints.add(compCorrecaoInicio);
          breakpoints.add(compLiqStr);
          for (const ci of combIndice) {
            if (ci.de && ci.de > compCorrecaoInicio && ci.de <= compLiqStr) breakpoints.add(ci.de);
          }
          const datas = [...breakpoints].sort();

          // Compor fator total multiplicando segmentos
          let fatorTotal = new Decimal(1);
          for (let i = 0; i < datas.length - 1; i++) {
            const segInicio = datas[i].slice(0, 7);
            const segFim = datas[i + 1].slice(0, 7);
            const regime = this.getRegimeParaData(combIndice, datas[i]);
            const indice = (regime?.indice || '').toUpperCase().replace(/-/g, '_');

            if (indice === 'SEM_CORRECAO' || indice === 'NENHUM' || indice === 'SEM CORREÇÃO') {
              // Verificar se juros=SELIC nesta fase (ADC 58/59)
              const regimeJ = this.getRegimeParaData(combJuros, datas[i]);
              if (regimeJ && regimeJ.tipo.toUpperCase() === 'SELIC') {
                // SELIC soma simples como fator unificado (correção+juros)
                const selicTaxas = this.indicesDB
                  .filter(idx => idx.indice === 'SELIC' && idx.competencia.slice(0, 7) >= segInicio && idx.competencia.slice(0, 7) < segFim)
                  .reduce((s, idx) => s + (Number(idx.valor) || 0), 0);
                if (selicTaxas > 0) {
                  // VERBA_INSS: a parte de "juros" da SELIC incide sobre (diferença - INSS)
                  // Fator ajustado: 1 + selicTaxas/100 × (1 - taxaINSS)
                  const reducao = baseJurosVerbaInss ? (1 - taxaINSSEfetiva) : 1;
                  fatorTotal = fatorTotal.times(new Decimal(1).plus(new Decimal(selicTaxas).div(100).times(reducao)));
                }
              }
              // SEM_CORRECAO sem SELIC → fator = 1 (nada a multiplicar)
            } else if (indice === 'SELIC') {
              // SELIC como índice direto → soma simples
              const selicTaxas = this.indicesDB
                .filter(idx => idx.indice === 'SELIC' && idx.competencia.slice(0, 7) >= segInicio && idx.competencia.slice(0, 7) < segFim)
                .reduce((s, idx) => s + (Number(idx.valor) || 0), 0);
              if (selicTaxas > 0) {
                const reducao = baseJurosVerbaInss ? (1 - taxaINSSEfetiva) : 1;
                fatorTotal = fatorTotal.times(new Decimal(1).plus(new Decimal(selicTaxas).div(100).times(reducao)));
              }
            } else {
              // IPCA-E, IPCA, INPC, etc. → WALK mês a mês com ignorarTaxaNegativa
              // PJe-Calc: CalculadorDeIndices.obterTabelaDeIndicesIgnorandoTaxasNegativas
              // Quando um mês tem deflação (taxa < 0), o fator mensal é clampado a 1.
              // Ref: pjecalc-fonte/.../rotinasdecalculo/CalculadorDeIndices.java:118-152
              const ignorarNeg = this.correcaoConfig.ignorar_taxa_negativa ?? true;
              const aliases = ['IPCA-E', 'IPCAE', 'IPCA', 'INPC', 'IGPM', 'TR'];
              const normIndice = regime?.indice?.replace(/-/g, '') || '';
              const searchNames = aliases.filter(a => a.replace(/-/g, '') === normIndice || a === regime?.indice);
              if (searchNames.length === 0) searchNames.push(regime?.indice || 'IPCA-E', 'IPCA-E');

              // Ordena registros por competência no intervalo [segInicio, segFim]
              const inRange = this.indicesDB
                .filter(idx => searchNames.includes(idx.indice) && idx.competencia.slice(0, 7) >= segInicio && idx.competencia.slice(0, 7) <= segFim && idx.acumulado)
                .sort((a, b) => a.competencia.localeCompare(b.competencia));

              if (inRange.length >= 2 && ignorarNeg) {
                // Walk mês a mês com clamp de deflação
                let synthBaseline = inRange[0].acumulado;
                let acum = new Decimal(1);
                for (let k = 1; k < inRange.length; k++) {
                  const cur = inRange[k].acumulado;
                  if (!cur || !synthBaseline || synthBaseline <= 0) continue;
                  const monthly = cur / synthBaseline;
                  if (monthly >= 1) {
                    acum = acum.times(monthly);
                    synthBaseline = cur;
                  }
                  // monthly < 1 = deflação → ignorar, synthBaseline NÃO atualiza
                }
                fatorTotal = fatorTotal.times(acum);
              } else if (inRange.length >= 2) {
                // Ratio simples (sem clamp)
                const first = inRange[0].acumulado;
                const last = inRange[inRange.length - 1].acumulado;
                if (first > 0) fatorTotal = fatorTotal.times(new Decimal(last).div(new Decimal(first)));
              }
            }
          }
          oc.setIndiceAcumulado(fatorTotal);
        }
      }
    } else {
      // Sem combinações — usa calculo.liquidar() padrão
      calculo.liquidar();
    }

    // ── 6. FGTS ──
    const fgtsDepositos: { competencia: string; base: number; aliquota: number; valor: number }[] = [];
    let fgtsTotal = 0;
    let fgtsMulta = 0;
    if (this.fgtsConfig.apurar) {
      const aliqFgts = 0.08;
      const basesPorComp = new Map<string, number>();
      for (const vc of verbasCore) {
        if (!vc.getIncidenciaFGTS()) continue;
        for (const oc of vc.getOcorrenciasAtivas()) {
          const dataIni = oc.getDataInicial();
          if (!dataIni) continue;
          const dif = oc.getDiferenca().toNumber();
          if (dif <= 0) continue;
          const comp = `${dataIni.getFullYear()}-${String(dataIni.getMonth() + 1).padStart(2, '0')}`;
          basesPorComp.set(comp, (basesPorComp.get(comp) ?? 0) + dif);
        }
      }
      let totalDep = 0;
      for (const [comp, base] of basesPorComp) {
        const valor = +(base * aliqFgts).toFixed(2);
        fgtsDepositos.push({ competencia: comp, base: +base.toFixed(2), aliquota: aliqFgts, valor });
        totalDep += valor;
      }
      if (this.fgtsConfig.multa_apurar) {
        fgtsMulta = +(totalDep * (this.fgtsConfig.multa_percentual / 100)).toFixed(2);
      }
      fgtsTotal = +(totalDep + fgtsMulta).toFixed(2);
    }

    // ── 7. INSS ──
    // Port simplificado de MaquinaDeCalculoDoInss.java + Calculo.apurarJurosDasVerbasOperacoes.
    //
    // O Java calcula INSS separando a base por característica da verba:
    //   - cs_base_normal: verbas COMUM + AVISO_PREVIO + FÉRIAS
    //   - cs_base_13:     verbas DECIMO_TERCEIRO_SALARIO
    //   Cada uma tem sua progressão de faixas SEPARADA (ambas com mesmo teto).
    // Ref: Calculo.java:apurarVerbaIncideInssDecimoTerceiro vs apurarVerbaIncideInssAvisoOuComum
    //
    // Isso importa porque o 13º é pago em um único mês (dezembro/rescisão) e tributado
    // PROPRIAMENTE naquela competência, não somado ao salário normal (que também é
    // tributado naquela competência). Se somássemos tudo junto, a base normal + 13º
    // estouraria o teto e o INSS total ficaria subestimado.
    const csSeguradoDevidos: PjeCSResult['segurado_devidos'] = [];
    let totalSegurado = 0;
    let totalEmpregador = 0;
    if (this.csConfig.apurar_segurado || this.csConfig.apurar_empresa) {
      // DUAS bases separadas por competência:
      const basesNormalPorComp = new Map<string, number>();    // comum + aviso + férias
      const bases13PorComp = new Map<string, number>();        // 13º salário
      for (let vi = 0; vi < verbasCore.length; vi++) {
        const vc = verbasCore[vi];
        if (!vc.getIncidenciaINSS()) continue;
        const vUI = this.verbas[vi];
        const is13 = vUI?.caracteristica === '13_salario';
        const targetMap = is13 ? bases13PorComp : basesNormalPorComp;
        for (const oc of vc.getOcorrenciasAtivas()) {
          const dataIni = oc.getDataInicial();
          if (!dataIni) continue;
          const dif = oc.getDiferenca().toNumber();
          if (dif <= 0) continue;
          const comp = `${dataIni.getFullYear()}-${String(dataIni.getMonth() + 1).padStart(2, '0')}`;
          targetMap.set(comp, (targetMap.get(comp) ?? 0) + dif);
        }
      }

      // Helper: calcula INSS segurado sobre uma base numa competência
      const calcularInssSobreBase = (comp: string, base: number): number => {
        if (this.faixasINSSDB.length === 0) return 0;
        const compDate = comp + '-01';
        const faixas = this.faixasINSSDB
          .filter(f => f.competencia_inicio <= compDate && (!f.competencia_fim || f.competencia_fim >= compDate))
          .sort((a, b) => a.faixa - b.faixa);
        if (faixas.length === 0) return 0;

        const isProgressivo = comp >= '2020-03';
        const teto = faixas[faixas.length - 1].valor_ate;
        const baseCapped = Math.min(base, teto);
        let valorSegurado = 0;

        if (isProgressivo) {
          let restante = baseCapped;
          let anterior = 0;
          for (const f of faixas) {
            const largura = f.valor_ate - anterior;
            const parcela = Math.min(restante, largura);
            if (parcela > 0) valorSegurado += +(parcela * f.aliquota).toFixed(2);
            restante -= parcela;
            anterior = f.valor_ate;
            if (restante <= 0) break;
          }
        } else {
          let aliquotaFlat = faixas[faixas.length - 1].aliquota;
          for (const f of faixas) {
            if (baseCapped <= f.valor_ate) {
              aliquotaFlat = f.aliquota;
              break;
            }
          }
          valorSegurado = +(baseCapped * aliquotaFlat).toFixed(2);
        }
        return valorSegurado;
      };

      // Processa base NORMAL por competência
      for (const [comp, base] of basesNormalPorComp) {
        const valorSegurado = calcularInssSobreBase(comp, base);
        const aliqEmpresa = (this.csConfig.aliquota_empresa_fixa ?? 20) / 100;
        const aliqSAT = (this.csConfig.aliquota_sat_fixa ?? 2) / 100;
        const aliqTerc = (this.csConfig.aliquota_terceiros_fixa ?? 5.8) / 100;
        const valorEmpresa = +(base * aliqEmpresa).toFixed(2);
        const valorSAT = +(base * aliqSAT).toFixed(2);
        const valorTerc = +(base * aliqTerc).toFixed(2);
        const aliquotaEfetiva = base > 0 ? valorSegurado / base : 0;
        csSeguradoDevidos.push({ competencia: comp, base: +base.toFixed(2), aliquota: +aliquotaEfetiva.toFixed(4), valor: +valorSegurado.toFixed(2), recolhido: 0, diferenca: +valorSegurado.toFixed(2) });
        totalSegurado += valorSegurado;
        totalEmpregador += valorEmpresa + valorSAT + valorTerc;
      }
      // Processa base 13º por competência SEPARADAMENTE (fatura ao lado da normal)
      for (const [comp, base] of bases13PorComp) {
        const valorSegurado = calcularInssSobreBase(comp, base);
        const aliqEmpresa = (this.csConfig.aliquota_empresa_fixa ?? 20) / 100;
        const aliqSAT = (this.csConfig.aliquota_sat_fixa ?? 2) / 100;
        const aliqTerc = (this.csConfig.aliquota_terceiros_fixa ?? 5.8) / 100;
        const valorEmpresa = +(base * aliqEmpresa).toFixed(2);
        const valorSAT = +(base * aliqSAT).toFixed(2);
        const valorTerc = +(base * aliqTerc).toFixed(2);
        const aliquotaEfetiva = base > 0 ? valorSegurado / base : 0;
        csSeguradoDevidos.push({ competencia: comp + '-13', base: +base.toFixed(2), aliquota: +aliquotaEfetiva.toFixed(4), valor: +valorSegurado.toFixed(2), recolhido: 0, diferenca: +valorSegurado.toFixed(2) });
        totalSegurado += valorSegurado;
        totalEmpregador += valorEmpresa + valorSAT + valorTerc;
      }
    }
    const csDescontado = this.csConfig.cobrar_reclamante ? +totalSegurado.toFixed(2) : 0;

    // ── 8. IRPF — Port simplificado de MaquinaDeCalculoDeIrpf.liquidar() ──
    //
    // Diferenças cruciais vs versão anterior:
    //  - Usa VALOR CORRIGIDO (getDiferencaCorrigida), não diferença bruta.
    //    Ref: MaquinaDeCalculoDeIrpf.java:941 (Utils.arredondarValorMonetario(ocorrencia.getDiferencaCorrigida()))
    //  - Separa 13º do resto (demais verbas) — cada um tem sua tabela RRA.
    //    Ref: MaquinaDeCalculoDeIrpf.java:944-976 (switch por caracteristica)
    //  - Deduz CS proporcionalmente entre 13º e demais verbas.
    //    Ref: MaquinaDeCalculoDeIrpf.java:990-1015
    let irDevido = 0;
    let irMeses = 1;
    if (this.irConfig.apurar) {
      let base13Corrigido = 0;
      let baseFeriasCorrigido = 0;
      let baseDemaisCorrigido = 0;
      const todasComp = new Set<string>();
      for (let vi = 0; vi < verbasCore.length; vi++) {
        const vc = verbasCore[vi];
        if (!vc.getIncidenciaIRPF()) continue;
        const vUI = this.verbas[vi];
        const caract = vUI?.caracteristica;
        for (const oc of vc.getOcorrenciasAtivas()) {
          const corrigido = oc.getDiferencaCorrigida()?.toNumber() ?? oc.getDiferenca().toNumber();
          if (corrigido <= 0) continue;
          if (caract === '13_salario') base13Corrigido += corrigido;
          else if (caract === 'ferias') baseFeriasCorrigido += corrigido;
          else baseDemaisCorrigido += corrigido;
          const d = oc.getDataInicial();
          if (d) todasComp.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      }
      if (todasComp.size > 0) {
        const sorted = [...todasComp].sort();
        const [y1, m1] = sorted[0].split('-').map(Number);
        const [y2, m2] = sorted[sorted.length - 1].split('-').map(Number);
        irMeses = Math.max(1, (y2 - y1) * 12 + (m2 - m1) + 1);
      }

      // Proporção para distribuir dedução de CS entre os grupos:
      const baseTotal = base13Corrigido + baseFeriasCorrigido + baseDemaisCorrigido;
      const propCS13 = baseTotal > 0 ? base13Corrigido / baseTotal : 0;
      const propCSFerias = baseTotal > 0 ? baseFeriasCorrigido / baseTotal : 0;
      const propCSDemais = baseTotal > 0 ? baseDemaisCorrigido / baseTotal : 0;
      const cs13 = this.irConfig.deduzir_cs ? csDescontado * propCS13 : 0;
      const csFerias = this.irConfig.deduzir_cs ? csDescontado * propCSFerias : 0;
      const csDemais = this.irConfig.deduzir_cs ? csDescontado * propCSDemais : 0;
      const dedDependentes = (this.irConfig.dependentes ?? 0) * 189.59 * irMeses;

      // Deduções adicionais do IRPF (BUG-4: campos que UI salva mas engine ignorava)
      const dedAposentado65 = this.irConfig.aposentado_65 ? 1903.98 * irMeses : 0;
      // prev privada e pensão: descontados do bruto se habilitados
      // (valores reais dependem de módulos PrevidenciaPrivada e PensaoAlimenticia)
      // Por ora incorporamos como dedução do IR, com valor 0 se módulo não calculado.
      // Honorários do reclamante como dedução do IR (Art. 27 OJ 305):
      // Nota: honorários sucumbenciais são calculados DEPOIS do IR, então aqui
      // usamos 0. A dedução real requer recálculo iterativo (PJe-Calc faz isso
      // em MaquinaDeCalculoDeIrpf via proporções). Placeholder conservador.
      const dedHonorariosReclamante = 0;

      // Tabela IRPF — delega para TabelaIrpf do core/ (mesmos dados,
      // fonte única — eliminando duplicação hardcoded).
      const tabelaIrpfCore = TabelaIrpf.obterTabelaDa(dataLiq);
      const faixasIR = tabelaIrpfCore.getFaixas().map(f => ({
        ate: f.getValorFinal()?.toNumber() ?? Infinity,
        aliq: f.getAliquota().div(100).toNumber(),
        ded: f.getDeducao()?.toNumber() ?? 0,
      }));
      const calcImpostoRRA = (baseBruta: number, deducoesTotal: number): number => {
        if (baseBruta <= 0) return 0;
        const baseTributavel = Math.max(0, (baseBruta - deducoesTotal) / irMeses);
        for (const f of faixasIR) {
          if (baseTributavel <= f.ate) {
            const impMensal = Math.max(0, baseTributavel * f.aliq - f.ded);
            return +(impMensal * irMeses).toFixed(2);
          }
        }
        return 0;
      };

      // Deduções extras proporcionalizadas
      const dedExtras = dedAposentado65 + dedHonorariosReclamante;

      // IR sobre cada grupo separadamente (método RRA exclusivo)
      const ir13 = calcImpostoRRA(base13Corrigido, cs13 + (dedDependentes + dedExtras) * propCS13);
      const irFerias = calcImpostoRRA(baseFeriasCorrigido, csFerias + (dedDependentes + dedExtras) * propCSFerias);
      const irDemais = calcImpostoRRA(baseDemaisCorrigido, csDemais + (dedDependentes + dedExtras) * propCSDemais);
      const irSeparado = ir13 + irFerias + irDemais;

      // Comparar com método agregado (soma tudo, divide por N_meses, aplica tabela)
      const baseTotalCorrigido = base13Corrigido + baseFeriasCorrigido + baseDemaisCorrigido;
      const dedTotal = (this.irConfig.deduzir_cs ? csDescontado : 0) + dedDependentes + dedExtras;
      const irAgregado = calcImpostoRRA(baseTotalCorrigido, dedTotal);

      irDevido = +Math.min(irSeparado, irAgregado).toFixed(2);
    }

    // ── 9. Converter resultados Core → UI ──
    const verbaResults: PjeVerbaResult[] = verbasCore.map((vc, idx) => {
      const vUI = this.verbas[idx];
      let totalDevido = 0, totalPago = 0, totalDiferenca = 0;
      let totalCorrigido = 0, totalJuros = 0, totalFinal = 0;

      const ocResults: PjeOcorrenciaResult[] = vc.getOcorrenciasAtivas().map(oc => {
        const diferenca = oc.getDiferenca().toNumber();
        const indice = oc.getIndiceAcumulado()?.toNumber() ?? 1;
        const corrigida = oc.getDiferencaCorrigida()?.toNumber() ?? diferenca;
        const valorCorrigido = arredondarValorMonetario(new Decimal(corrigida)).toNumber();
        // Juros respeitando combinações do PJC (TRD_SIMPLES, SELIC, TAXA_LEGAL, etc.)
        // PJe-Calc calcula taxa de juros POR OCORRÊNCIA via TabelaDeJuros.calcularTaxaDeJuros()
        // que percorre a cadeia de PeriodoDeJuros montada a partir das combinações.
        const dataIni = oc.getDataInicial();
        let juros = 0;
        if (dataIni && diferenca !== 0 && this.correcaoConfig.juros_tipo !== 'nenhum') {
          const jurosStart = this.correcaoConfig.juros_inicio === 'citacao' && this.params.data_citacao
            ? new Date(this.params.data_citacao) : dataAjuiz;

          if (combJuros.length > 0) {
            // Usa combinações do PJC — cada segmento tem seu tipo de juros
            juros = this.calcularJurosComCombinacoes(diferenca, jurosStart, dataLiq, combJuros, combIndice);
          } else if (this.correcaoConfig.juros_tipo === 'selic') {
            // SELIC como juros (sem combinação) = 0 separado (já incluído na correção)
            juros = 0;
          } else {
            // Juros simples padrão sem combinação
            const meses = Math.max(0,
              (dataLiq.getFullYear() - jurosStart.getFullYear()) * 12
              + (dataLiq.getMonth() - jurosStart.getMonth()) + 1);
            juros = +(diferenca * jurosPercentualMensal * meses).toFixed(2);
          }
        }
        const valorFinal = +(valorCorrigido + juros).toFixed(2);

        totalDevido += oc.getDevido()?.toNumber() ?? 0;
        totalPago += oc.getPago()?.toNumber() ?? 0;
        totalDiferenca += diferenca;
        totalCorrigido += valorCorrigido;
        totalJuros += juros;
        totalFinal += valorFinal;

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

    // ── 10. Totalização ──
    const principalBruto = verbaResults.reduce((s, v) => s + v.total_diferenca, 0);
    const principalCorrigido = verbaResults.reduce((s, v) => s + v.total_corrigido, 0);
    const jurosMora = verbaResults.reduce((s, v) => s + v.total_juros, 0);
    const brutoTotal = +(principalCorrigido + jurosMora).toFixed(2);
    const liquidoReclamante = +(brutoTotal - csDescontado - irDevido).toFixed(2);

    // Multas (BUG-1: antes hardcoded zero, agora usa correcaoConfig)
    let multa523Valor = 0;
    if (this.correcaoConfig.multa_523) {
      const baseMulta523 = principalCorrigido + jurosMora;
      const perc523 = this.correcaoConfig.multa_523_percentual ?? 10;
      multa523Valor = +(baseMulta523 * perc523 / 100).toFixed(2);
    }
    let multa467Valor = 0;
    if (this.correcaoConfig.multa_467) {
      const perc467 = this.correcaoConfig.multa_467_percentual ?? 50;
      multa467Valor = +(principalCorrigido * perc467 / 100).toFixed(2);
    }

    // Honorários — respeita base_sucumbenciais selecionada no UI.
    let honorariosSucumb = 0;
    if (this.honorariosConfig.apurar_sucumbenciais) {
      if (this.honorariosConfig.valor_fixo && this.honorariosConfig.valor_fixo > 0) {
        honorariosSucumb = +this.honorariosConfig.valor_fixo.toFixed(2);
      } else {
        let baseHon = 0;
        switch (this.honorariosConfig.base_sucumbenciais) {
          case 'causa':
            baseHon = this.params.valor_da_causa ?? (principalCorrigido + jurosMora);
            break;
          case 'proveito':
            baseHon = liquidoReclamante;
            break;
          case 'condenacao':
          default:
            baseHon = principalCorrigido + jurosMora;
            break;
        }
        honorariosSucumb = +(baseHon * (this.honorariosConfig.percentual_sucumbenciais / 100)).toFixed(2);
      }
    }

    // Custas
    let custasValor = 0;
    if (this.custasConfig.apurar) {
      const baseCustas = principalCorrigido + jurosMora + fgtsTotal;
      custasValor = +(baseCustas * (this.custasConfig.percentual / 100)).toFixed(2);
      if (custasValor < this.custasConfig.valor_minimo) custasValor = this.custasConfig.valor_minimo;
    }

    const resumo: PjeResumo = {
      principal_bruto: +principalBruto.toFixed(2),
      principal_corrigido: +principalCorrigido.toFixed(2),
      juros_mora: +jurosMora.toFixed(2),
      fgts_total: fgtsTotal,
      cs_segurado: csDescontado,
      cs_empregador: +totalEmpregador.toFixed(2),
      ir_retido: irDevido,
      seguro_desemprego: 0,
      previdencia_privada: 0,
      salario_familia: 0,
      multa_523: multa523Valor,
      multa_467: multa467Valor,
      honorarios_sucumbenciais: honorariosSucumb,
      honorarios_contratuais: 0,
      custas: custasValor,
      custas_detalhadas: [],
      pensao_sobre_fgts: 0,
      pensao_total: 0,
      contribuicao_sindical: 0,
      abono_pecuniario: 0,
      liquido_reclamante: liquidoReclamante,
      total_reclamada: +(liquidoReclamante + csDescontado + irDevido + +totalEmpregador.toFixed(2) + fgtsTotal + honorariosSucumb + custasValor + multa523Valor + multa467Valor).toFixed(2),
    };

    return {
      data_liquidacao: this.correcaoConfig.data_liquidacao,
      verbas: verbaResults,
      fgts: { depositos: fgtsDepositos, total_depositos: +(fgtsTotal - fgtsMulta).toFixed(2), multa_valor: fgtsMulta, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: fgtsTotal },
      contribuicao_social: { segurado_devidos: csSeguradoDevidos, segurado_pagos: [], empregador: [], total_segurado_devidos: +totalSegurado.toFixed(2), total_segurado_pagos: 0, total_segurado: +totalSegurado.toFixed(2), total_empregador: +totalEmpregador.toFixed(2) },
      imposto_renda: { base_calculo: +principalBruto.toFixed(2), deducoes: 0, base_tributavel: 0, imposto_devido: irDevido, meses_rra: irMeses, metodo: 'art_12a_rra', ir_anos_anteriores: 0, ir_ano_liquidacao: 0, ir_13_exclusivo: 0, ir_ferias_separado: 0, meses_anos_anteriores: 0, meses_ano_liquidacao: 0 },
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

  /**
   * Calcula juros respeitando as combinações de juros do PJC.
   *
   * Port funcional de Calculo.apurarJurosDasVerbasOperacoes (linhas 1894-1950):
   * Para cada segmento (delimitado pelas combinações), aplica a taxa do regime:
   *   - SEM_JUROS/NENHUM: 0
   *   - TRD_SIMPLES: taxa TR diária × dias/mês (~0 pós-2017, TR zerada)
   *   - SELIC: soma simples das taxas mensais SELIC no período (já incluída na correção → 0 separado)
   *   - TAXA_LEGAL: taxa legal diária × dias (sem dados → 0)
   *   - simples_mensal/1%: aliquota × meses fracionados
   *   - Padrão: aliquota × meses
   */
  private calcularJurosComCombinacoes(
    diferenca: number,
    jurosStart: Date,
    dataLiq: Date,
    combJuros: { de?: string; ate?: string; tipo: string; percentual?: number }[],
    combIndice: { de?: string; ate?: string; indice: string }[]
  ): number {
    if (jurosStart >= dataLiq) return 0;

    // Montar breakpoints a partir das combinações
    const breakpoints = new Set<string>();
    breakpoints.add(jurosStart.toISOString().slice(0, 10));
    breakpoints.add(dataLiq.toISOString().slice(0, 10));
    for (const cj of combJuros) {
      if (cj.de && cj.de > jurosStart.toISOString().slice(0, 10) && cj.de <= dataLiq.toISOString().slice(0, 10)) {
        breakpoints.add(cj.de);
      }
    }
    for (const ci of combIndice) {
      if (ci.de && ci.de > jurosStart.toISOString().slice(0, 10) && ci.de <= dataLiq.toISOString().slice(0, 10)) {
        breakpoints.add(ci.de);
      }
    }
    const datas = [...breakpoints].sort();

    let jurosTotal = 0;
    for (let i = 0; i < datas.length - 1; i++) {
      const segInicio = datas[i];
      const segFim = datas[i + 1];

      // Encontrar regime de juros para este segmento
      const regimeJuros = this.getRegimeParaData(combJuros, segInicio);
      const regimeIndice = this.getRegimeParaData(combIndice, segInicio);

      const tipoJuros = (regimeJuros?.tipo || '').toUpperCase();
      const indiceCorrecao = (regimeIndice?.indice || '').toUpperCase();

      // SELIC como índice de correção = já inclui juros → skip
      if (indiceCorrecao === 'SELIC' || indiceCorrecao === 'SELIC_RF') continue;
      // SEM_CORRECAO com SELIC juros = SELIC já aplicada como correção → skip
      if ((indiceCorrecao === 'SEM_CORRECAO' || indiceCorrecao === 'SEM CORREÇÃO') && tipoJuros === 'SELIC') continue;

      // SEM_JUROS ou NENHUM
      if (tipoJuros === 'NENHUM' || tipoJuros === 'SEM_JUROS' || tipoJuros === '') continue;

      // SELIC como juros (não correção): soma simples = já tratado na correção
      if (tipoJuros === 'SELIC') continue;

      // TRD_SIMPLES: TR zerada pós-2017, juros ≈ 0
      if (tipoJuros === 'TRD_SIMPLES' || tipoJuros === 'TRD' || tipoJuros === 'TR') {
        // TR pós-2017 é zero → juros = 0
        // Pré-2017 seria TR mensal × dias, mas sem tabela TR diária → 0
        continue;
      }

      // TAXA_LEGAL: Lei 14.905/2024, sem dados disponíveis → 0
      if (tipoJuros === 'TAXA_LEGAL') continue;

      // TRD_COMPOSTOS, SELIC_BACEN: compostos → skip (raro)
      if (tipoJuros === 'TRD_COMPOSTOS' || tipoJuros === 'SELIC_BACEN') continue;

      // Juros simples (JUROS_UM_PORCENTO, JUROS_PADRAO, FAZENDA_PUBLICA, etc.)
      const d1 = new Date(segInicio);
      const d2 = new Date(segFim);
      const meses = Math.max(0,
        (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()));
      const taxa = (regimeJuros?.percentual ?? 1) / 100;
      jurosTotal += diferenca * taxa * meses;
    }

    return +jurosTotal.toFixed(2);
  }

  private getRegimeParaData<T extends { de?: string; ate?: string }>(combinacoes: T[], data: string): T | null {
    const sorted = [...combinacoes].sort((a, b) => {
      const aDate = a.de || '0000-01-01';
      const bDate = b.de || '0000-01-01';
      return bDate.localeCompare(aDate);
    });
    for (const c of sorted) {
      if ((c.de || '0000-01-01') <= data) return c;
    }
    return combinacoes[0] || null;
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
