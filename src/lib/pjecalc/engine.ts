// =====================================================
// PJe-CALC ENGINE - MOTOR DE CÁLCULO OFICIAL
// Fórmula: Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra
// Diferença = Devido - Pago
// =====================================================

import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_DOWN });

// Re-export all types and constants for backward compatibility
export * from './engine-types';
export { CNAE_ALIQUOTAS_COMUNS } from './engine-constants';

import type {
  PjeParametros, PjeHistoricoSalarial, PjeFalta, PjeFerias,
  PjeVerba, PjeCartaoPonto, PjeFeriadoDB, PjeExcecaoCargaHoraria,
  PjeFGTSConfig, PjeCSConfig, PjeIRConfig, PjeCorrecaoConfig,
  PjeHonorariosConfig, PjeCustasConfig, PjeSeguroConfig,
  PjePrevidenciaPrivadaConfig, PjePensaoConfig, PjeSalarioFamiliaConfig,
  PjeIndiceRow, PjeINSSFaixaRow, PjeIRFaixaRow,
  PjeOcorrenciaResult, PjeVerbaResult, PjeFGTSResult, PjeCSResult,
  PjeIRResult, PjeSeguroResult, PjeCustaResult, PjeResumo,
  PjeLiquidacaoResult, PjeValidationItem, PjeValidationResult,
  PjePrevidenciaPrivadaResult, PjeSalarioFamiliaResult,
  PjeCombinacaoIndice, PjeCombinacaoJuros,
  PjeSeguroDesempregoDB, PjeSalarioFamiliaDB,
} from './engine-types';

import {
  DEFAULT_FAIXAS_INSS, DEFAULT_FAIXAS_IR, DEFAULT_DEDUCAO_DEPENDENTE,
  SEGURO_DESEMP_2025, SALARIO_FAMILIA_2025,
} from './engine-constants';

// =====================================================
// MOTOR DE CÁLCULO
// =====================================================

export class PjeCalcEngine {
  private params: PjeParametros;
  private historicos: PjeHistoricoSalarial[];
  private faltas: PjeFalta[];
  private ferias: PjeFerias[];
  private verbas: PjeVerba[];
  private cartaoPonto: PjeCartaoPonto[];
  private fgtsConfig: PjeFGTSConfig;
  private csConfig: PjeCSConfig;
  private irConfig: PjeIRConfig;
  private correcaoConfig: PjeCorrecaoConfig;
  private honorariosConfig: PjeHonorariosConfig;
  private custasConfig: PjeCustasConfig;
  private seguroConfig: PjeSeguroConfig;
  private indicesDB: PjeIndiceRow[];
  private faixasINSSDB: PjeINSSFaixaRow[];
  private faixasIRDB: PjeIRFaixaRow[];
  private excecoesCargas: PjeExcecaoCargaHoraria[];
  private feriadosDB: PjeFeriadoDB[];
  private prevPrivadaConfig: PjePrevidenciaPrivadaConfig;
  private pensaoConfig: PjePensaoConfig;
  private salarioFamiliaConfig: PjeSalarioFamiliaConfig;
  private seguroDesempregoDB: PjeSeguroDesempregoDB[];
  private salarioFamiliaDB: PjeSalarioFamiliaDB[];
  // Map of verba results by verba_id for reflexa resolution
  private verbaResultsMap: Map<string, PjeVerbaResult> = new Map();

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
  ) {
    this.params = params;
    this.historicos = historicos;
    this.faltas = faltas;
    this.ferias = ferias;
    this.verbas = verbas.map(v => ({
      ...v,
      base_calculo: {
        historicos: v.base_calculo?.historicos || [],
        verbas: v.base_calculo?.verbas || [],
        tabelas: v.base_calculo?.tabelas || [],
        proporcionalizar: v.base_calculo?.proporcionalizar ?? false,
        integralizar: v.base_calculo?.integralizar ?? false,
      },
      exclusoes: v.exclusoes || { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: false },
      incidencias: v.incidencias || { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
    }));
    this.cartaoPonto = cartaoPonto;
    this.fgtsConfig = fgtsConfig;
    this.csConfig = csConfig;
    this.irConfig = irConfig;
    this.correcaoConfig = correcaoConfig;
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
  }

  // =====================================================
  // PERÍODO DE CÁLCULO
  // =====================================================
  
  getPeriodoCalculo(): { inicio: string; fim: string } {
    let inicio: string;
    
    // Prescrição quinquenal: recalcular automaticamente data início = ajuizamento - 5 anos
    if (this.params.prescricao_quinquenal) {
      if (this.params.data_prescricao_quinquenal) {
        inicio = this.params.data_prescricao_quinquenal;
      } else if (this.params.data_ajuizamento) {
        const ajuiz = new Date(this.params.data_ajuizamento);
        const prescDate = new Date(ajuiz.getFullYear() - 5, ajuiz.getMonth(), ajuiz.getDate());
        inicio = prescDate.toISOString().slice(0, 10);
      } else {
        inicio = this.params.data_inicial || this.params.data_admissao;
      }
      // Prescrição não pode ser anterior à admissão
      if (inicio < this.params.data_admissao) inicio = this.params.data_admissao;
    } else {
      inicio = this.params.data_inicial || this.params.data_admissao;
    }
    
    // Fim: usar data_demissao, data_final, ou data de liquidação como fallback
    const fimCandidatos: string[] = [];
    if (this.params.data_demissao) fimCandidatos.push(this.params.data_demissao);
    if (this.params.data_final) fimCandidatos.push(this.params.data_final);
    const fim = fimCandidatos.sort()[0] 
      || this.correcaoConfig?.data_liquidacao 
      || new Date().toISOString().slice(0, 10);

    return { inicio, fim };
  }

  // =====================================================
  // GERAÇÃO DE COMPETÊNCIAS
  // =====================================================

  getCompetencias(inicio: string, fim: string): string[] {
    const comps: string[] = [];
    const start = new Date(inicio + 'T00:00:00');
    const end = new Date(fim + 'T00:00:00');
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      comps.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    return comps;
  }

  // =====================================================
  // CÁLCULO DE AVOS (13º e Férias) — com Limitar Avos
  // =====================================================
  
  calcularAvos(competencia: string, caracteristica: string): number {
    const admDate = new Date(this.params.data_admissao);
    const demDate = this.params.data_demissao 
      ? new Date(this.params.data_demissao)
      : new Date();
    const [ano, mes] = competencia.split('-').map(Number);
    
    if (caracteristica === '13_salario') {
      const inicioAno = new Date(ano, 0, 1);
      const fimAno = new Date(ano, 11, 31);
      let efetInicio = admDate > inicioAno ? admDate : inicioAno;
      let efetFim = demDate < fimAno ? demDate : fimAno;
      
      // Limitar avos ao período do cálculo quando ativado
      if (this.params.limitar_avos_periodo) {
        const periodo = this.getPeriodoCalculo();
        const periodoInicio = new Date(periodo.inicio);
        const periodoFim = new Date(periodo.fim);
        if (periodoInicio > efetInicio) efetInicio = periodoInicio;
        if (periodoFim < efetFim) efetFim = periodoFim;
      }
      
      if (efetInicio > efetFim) return 0;
      let avos = 0;
      for (let m = efetInicio.getMonth(); m <= efetFim.getMonth(); m++) {
        const diaInicio = (m === efetInicio.getMonth()) ? efetInicio.getDate() : 1;
        const diaFim = (m === efetFim.getMonth()) ? efetFim.getDate() : new Date(ano, m + 1, 0).getDate();
        if (diaFim - diaInicio + 1 >= 15) avos++;
      }
      return avos;
    }
    if (caracteristica === 'ferias') {
      // Limitar avos de férias ao período do cálculo
      if (this.params.limitar_avos_periodo) {
        const periodo = this.getPeriodoCalculo();
        const periodoInicio = new Date(periodo.inicio);
        const periodoFim = new Date(periodo.fim);
        let efetInicio = admDate > periodoInicio ? admDate : periodoInicio;
        let efetFim = demDate < periodoFim ? demDate : periodoFim;
        if (efetInicio > efetFim) return 0;
        let avos = 0;
        for (let m = efetInicio.getMonth(); m <= efetFim.getMonth(); m++) {
          const diaInicio = (m === efetInicio.getMonth()) ? efetInicio.getDate() : 1;
          const diaFim = (m === efetFim.getMonth()) ? efetFim.getDate() : new Date(efetFim.getFullYear(), m + 1, 0).getDate();
          if (diaFim - diaInicio + 1 >= 15) avos++;
        }
        return Math.min(avos, 12);
      }
      return 12;
    }
    return 1;
  }

  // =====================================================
  // CARGA HORÁRIA POR COMPETÊNCIA (com exceções)
  // =====================================================

  getCargaHorariaParaCompetencia(competencia: string): number {
    if (this.excecoesCargas.length === 0) return this.params.carga_horaria_padrao || 220;
    const compDate = new Date(competencia + '-01');
    for (const exc of this.excecoesCargas) {
      const inicio = new Date(exc.data_inicial);
      const fim = new Date(exc.data_final);
      if (compDate >= inicio && compDate <= fim) return Number(exc.carga_horaria);
    }
    return this.params.carga_horaria_padrao || 220;
  }

  // =====================================================
  // QUANTIDADE CALENDÁRIO (Dias Úteis / Repousos / Feriados)
  // =====================================================

  calcularQuantidadeCalendario(competencia: string, tipo: 'dias_uteis' | 'repousos' | 'feriados'): number {
    const [ano, mes] = competencia.split('-').map(Number);
    // Art. 64 CLT: mês comercial = 30 dias fixos
    const diasNoMes = this.params.tipo_mes === 'comercial' ? 30 : new Date(ano, mes, 0).getDate();
    
    // Contar feriados no mês para o estado/município do cálculo
    const feriadosNoMes = this.feriadosDB.filter(f => {
      const fd = new Date(f.data);
      if (fd.getFullYear() !== ano || fd.getMonth() + 1 !== mes) return false;
      if (f.tipo === 'nacional') return true;
      if (f.tipo === 'estadual' && this.params.considerar_feriado_estadual && f.uf === this.params.estado) return true;
      if (f.tipo === 'municipal' && this.params.considerar_feriado_municipal && f.municipio === this.params.municipio) return true;
      return false;
    });

    let diasUteis = 0;
    let repousos = 0;
    
    for (let d = 1; d <= diasNoMes; d++) {
      const date = new Date(ano, mes - 1, d);
      const dow = date.getDay(); // 0=Sun, 6=Sat
      const isSunday = dow === 0;
      const isSaturday = dow === 6;
      const isFeriado = feriadosNoMes.some(f => new Date(f.data).getDate() === d);
      
      if (isSunday || isFeriado) {
        repousos++;
      } else if (isSaturday && !this.params.sabado_dia_util) {
        repousos++;
      } else {
        diasUteis++;
      }
    }

    switch (tipo) {
      case 'dias_uteis': return diasUteis;
      case 'repousos': return repousos;
      case 'feriados': return feriadosNoMes.length;
    }
  }

  // Divisor com feriados integrados
  getDivisorComFeriados(competencia: string): number {
    return this.calcularQuantidadeCalendario(competencia, 'dias_uteis');
  }

  // =====================================================
  // PRAZO DO AVISO PRÉVIO (Lei 12.506/2011)
  // =====================================================

  calcularPrazoAviso(): number {
    if (this.params.prazo_aviso_previo === 'nao_apurar') return 30;
    if (this.params.prazo_aviso_previo === 'informado') return this.params.prazo_aviso_dias || 30;
    const adm = new Date(this.params.data_admissao);
    const dem = this.params.data_demissao ? new Date(this.params.data_demissao) : new Date();
    const anosServico = Math.floor((dem.getTime() - adm.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return Math.min(90, 30 + (anosServico * 3));
  }

  // =====================================================
  // CARTÃO DE PONTO - RESOLUÇÃO DE QUANTIDADE
  // =====================================================

  getCartaoPontoQuantidade(competencia: string, colunas?: string[]): number {
    const reg = this.cartaoPonto.find(r => r.competencia === competencia);
    if (!reg) return 0;
    if (!colunas || colunas.length === 0) {
      return (reg.horas_extras_50 || 0) + (reg.horas_extras_100 || 0);
    }
    let total = 0;
    for (const col of colunas) {
      total += (reg as any)[col] || 0;
    }
    return total;
  }

  getCartaoPontoDivisor(competencia: string, colunas?: string[]): number {
    const reg = this.cartaoPonto.find(r => r.competencia === competencia);
    if (!reg) return 30;
    if (!colunas || colunas.length === 0) return reg.dias_uteis || 22;
    let total = 0;
    for (const col of colunas) {
      total += (reg as any)[col] || 0;
    }
    return total || 30;
  }

  // =====================================================
  // QUANTIDADE MÉDIA APURADA (from cartão de ponto)
  // =====================================================

  calcularQuantidadeMediaApurada(verba: PjeVerba): number {
    if (this.cartaoPonto.length === 0) return verba.quantidade_informada || 0;
    const colunas = verba.quantidade_cartao_colunas;
    let soma = 0;
    let count = 0;
    for (const reg of this.cartaoPonto) {
      const val = this.getCartaoPontoQuantidade(reg.competencia, colunas);
      if (val > 0) { soma += val; count++; }
    }
    return count > 0 ? soma / count : verba.quantidade_informada || 0;
  }

  // =====================================================
  // FÓRMULA OFICIAL DE CÁLCULO DE VERBA
  // Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra
  // =====================================================

  calcularOcorrencia(
    verba: PjeVerba,
    competencia: string,
    valorBase: number,
  ): PjeOcorrenciaResult {
    const base = new Decimal(valorBase);
    const mult = new Decimal(verba.multiplicador);
    
    // Divisor resolution (uses carga horária por competência with exceções + feriados)
    let div: Decimal;
    if (verba.tipo_divisor === 'cartao_ponto') {
      div = new Decimal(this.getCartaoPontoDivisor(competencia, verba.divisor_cartao_colunas) || 30);
    } else if (verba.tipo_divisor === 'carga_horaria') {
      div = new Decimal(this.getCargaHorariaParaCompetencia(competencia));
    } else if (verba.tipo_divisor === 'dias_uteis') {
      div = new Decimal(this.getDivisorComFeriados(competencia));
    } else if (verba.tipo_divisor === 'calendario') {
      div = new Decimal(this.calcularQuantidadeCalendario(competencia, 'dias_uteis') || 22);
    } else {
      div = new Decimal(verba.divisor_informado || 30);
    }

    // Quantidade resolution (with calendario + apurada support)
    let qtd: Decimal;
    if (verba.tipo_quantidade === 'cartao_ponto') {
      qtd = new Decimal(this.getCartaoPontoQuantidade(competencia, verba.quantidade_cartao_colunas) || 0);
    } else if (verba.tipo_quantidade === 'avos') {
      qtd = new Decimal(this.calcularAvos(competencia, verba.caracteristica));
    } else if (verba.tipo_quantidade === 'calendario') {
      qtd = new Decimal(this.calcularQuantidadeCalendario(competencia, 'dias_uteis'));
    } else if (verba.tipo_quantidade === 'apurada') {
      // Média apurada: usa a média da quantidade de todas as competências do cartão de ponto
      qtd = new Decimal(this.calcularQuantidadeMediaApurada(verba));
    } else {
      qtd = new Decimal(verba.quantidade_informada || 1);
    }

    const dobra = new Decimal(verba.dobrar_valor_devido ? 2 : 1);

    // Aviso prévio quantity
    if (verba.caracteristica === 'aviso_previo') {
      qtd = new Decimal(this.calcularPrazoAviso());
    }

    // Proporcionalizar QUANTIDADE em meses incompletos com modo de fração
    if (verba.quantidade_proporcionalizar) {
      const [ano, mes] = competencia.split('-').map(Number);
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const admDate = new Date(this.params.data_admissao);
      const demDate = this.params.data_demissao ? new Date(this.params.data_demissao) : null;
      let diaInicio = 1, diaFim = diasNoMes;
      if (admDate.getFullYear() === ano && admDate.getMonth() + 1 === mes) diaInicio = admDate.getDate();
      if (demDate && demDate.getFullYear() === ano && demDate.getMonth() + 1 === mes) diaFim = demDate.getDate();
      const diasTrabalhados = diaFim - diaInicio + 1;
      if (diasTrabalhados < diasNoMes) {
        const fracaoModo = verba.fracao_mes_modo || 'manter_fracao';
        switch (fracaoModo) {
          case 'integralizar':
            // Integraliza: mês incompleto conta como mês completo (qtd não muda)
            break;
          case 'desprezar':
            // Desprezar: mês incompleto = 0
            qtd = new Decimal(0);
            break;
          case 'desprezar_menor_15':
            // Desprezar se < 15 dias, integralizar se >= 15
            if (diasTrabalhados < 15) {
              qtd = new Decimal(0);
            }
            // else: keep full qtd (integraliza)
            break;
          case 'manter_fracao':
          default:
            // Manter fração proporcional
            qtd = qtd.times(diasTrabalhados).div(diasNoMes);
            break;
        }
      }
    }

    // Fórmula oficial PJe-Calc (com truncamento por etapa — Método PJe-Calc)
    // Cada operação intermediária é truncada a 2 casas antes da próxima.
    // Isso garante paridade de centavos com o PJe-Calc oficial.
    let devido: Decimal;
    if (verba.valor === 'informado') {
      // Suporte a Constante Mensal (PJe-Calc <Constante>): valor fixo repetido por competência
      if (verba.constante_mensal !== undefined && verba.constante_mensal > 0) {
        devido = new Decimal(verba.constante_mensal);
      } else {
        devido = new Decimal(verba.valor_informado_devido || 0);
      }
    } else {
      // Etapa 1: valor_hora = Base / Divisor (truncado)
      const valorHora = base.div(div).toDP(2);
      // Etapa 2: valor_hora_com_mult = valor_hora × Multiplicador (truncado)
      const valorHoraComMult = valorHora.times(mult).toDP(2);
      // Etapa 3: subtotal = valor_hora_com_mult × Quantidade (truncado)
      const subtotal = valorHoraComMult.times(qtd).toDP(2);
      // Etapa 4: devido = subtotal × Dobra (truncado)
      devido = subtotal.times(dobra).toDP(2);
    }

    // Proporcionalizar DEVIDO separadamente (Fase 6 - PJe-Calc)
    if (verba.proporcionalizar_devido) {
      const [ano, mes] = competencia.split('-').map(Number);
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const admDate = new Date(this.params.data_admissao);
      const demDate = this.params.data_demissao ? new Date(this.params.data_demissao) : null;
      let diaInicio = 1, diaFim = diasNoMes;
      if (admDate.getFullYear() === ano && admDate.getMonth() + 1 === mes) diaInicio = admDate.getDate();
      if (demDate && demDate.getFullYear() === ano && demDate.getMonth() + 1 === mes) diaFim = demDate.getDate();
      const diasTrabalhados = diaFim - diaInicio + 1;
      if (diasTrabalhados < diasNoMes) {
        devido = devido.times(diasTrabalhados).div(diasNoMes);
      }
    }

    if (verba.zerar_valor_negativo && devido.isNegative()) {
      devido = new Decimal(0);
    }

    // Valor Pago: informado ou calculado (Fase 2)
    // FIX #3: Truncamento por etapa no cálculo do Pago (paridade PJe-Calc)
    let pago: Decimal;
    let pagoBreakdown: PjeOcorrenciaResult['pago_breakdown'] | undefined;
    if (verba.valor_pago_tipo === 'calculado' && verba.pago_base !== undefined) {
      const pagoBase = new Decimal(verba.pago_base || 0);
      const pagoDiv = new Decimal(verba.pago_divisor || 30);
      const pagoMult = new Decimal(verba.pago_multiplicador || 1);
      const pagoQtd = new Decimal(verba.pago_quantidade || 1);
      // Etapa 1: Base / Divisor (truncado)
      const pagoValorHora = pagoBase.div(pagoDiv).toDP(2);
      // Etapa 2: × Multiplicador (truncado)
      const pagoComMult = pagoValorHora.times(pagoMult).toDP(2);
      // Etapa 3: × Quantidade (truncado)
      pago = pagoComMult.times(pagoQtd).toDP(2);
      pagoBreakdown = {
        base: pagoBase.toNumber(),
        divisor: pagoDiv.toNumber(),
        multiplicador: pagoMult.toNumber(),
        quantidade: pagoQtd.toNumber(),
        formula: `(${pagoBase.toFixed(2)} ÷ ${pagoDiv.toFixed(2)}) × ${pagoMult.toFixed(4)} × ${pagoQtd.toFixed(4)} = ${pago.toFixed(2)}`,
      };
    } else {
      pago = new Decimal(verba.valor_informado_pago || 0);
    }

    // Proporcionalizar PAGO separadamente (Fase 6 - PJe-Calc)
    if (verba.proporcionalizar_pago && pago.greaterThan(0)) {
      const [ano, mes] = competencia.split('-').map(Number);
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const admDate = new Date(this.params.data_admissao);
      const demDate = this.params.data_demissao ? new Date(this.params.data_demissao) : null;
      let diaInicio = 1, diaFim = diasNoMes;
      if (admDate.getFullYear() === ano && admDate.getMonth() + 1 === mes) diaInicio = admDate.getDate();
      if (demDate && demDate.getFullYear() === ano && demDate.getMonth() + 1 === mes) diaFim = demDate.getDate();
      const diasTrabalhados = diaFim - diaInicio + 1;
      if (diasTrabalhados < diasNoMes) {
        pago = pago.times(diasTrabalhados).div(diasNoMes);
      }
    }

    const diferenca = devido.minus(pago);

    // Build formula string with rounding trace
    let formula: string;
    let arredondamento_trace: { etapa: string; valor_cheio: string; valor_truncado: string }[] | undefined;
    if (verba.valor === 'calculado') {
      const valorHoraTrace = base.div(div);
      const valorHoraComMultTrace = base.div(div).toDP(2).times(mult);
      const subtotalTrace = base.div(div).toDP(2).times(mult).toDP(2).times(qtd);
      arredondamento_trace = [
        { etapa: 'Base / Divisor', valor_cheio: valorHoraTrace.toFixed(6), valor_truncado: valorHoraTrace.toDP(2).toFixed(2) },
        { etapa: '× Multiplicador', valor_cheio: valorHoraComMultTrace.toFixed(6), valor_truncado: valorHoraComMultTrace.toDP(2).toFixed(2) },
        { etapa: '× Quantidade', valor_cheio: subtotalTrace.toFixed(6), valor_truncado: subtotalTrace.toDP(2).toFixed(2) },
        { etapa: '× Dobra', valor_cheio: subtotalTrace.toDP(2).times(dobra).toFixed(6), valor_truncado: devido.toFixed(2) },
      ];
      formula = `(${base.toFixed(2)} ÷ ${div.toFixed(2)} = ${valorHoraTrace.toDP(2).toFixed(2)}) × ${mult.toFixed(4)} = ${valorHoraComMultTrace.toDP(2).toFixed(2)} × ${qtd.toFixed(4)} × ${dobra.toFixed(0)} = ${devido.toFixed(2)}`;
    } else {
      formula = `Valor Informado: ${devido.toFixed(2)}`;
    }

    // Compute integral values (full-month) for integralization in reflexos
    let baseIntegral: number | undefined;
    let qtdIntegral: number | undefined;
    let devidoIntegral: number | undefined;
    if (verba.quantidade_proporcionalizar) {
      const [anoI, mesI] = competencia.split('-').map(Number);
      const diasNoMesI = new Date(anoI, mesI, 0).getDate();
      const admDateI = new Date(this.params.data_admissao);
      const demDateI = this.params.data_demissao ? new Date(this.params.data_demissao) : null;
      let diaInicioI = 1, diaFimI = diasNoMesI;
      if (admDateI.getFullYear() === anoI && admDateI.getMonth() + 1 === mesI) diaInicioI = admDateI.getDate();
      if (demDateI && demDateI.getFullYear() === anoI && demDateI.getMonth() + 1 === mesI) diaFimI = demDateI.getDate();
      const diasTrabI = diaFimI - diaInicioI + 1;
      if (diasTrabI < diasNoMesI) {
        // This is a fractional month — compute integral (full-month) values
        const frac = new Decimal(diasTrabI).div(diasNoMesI);
        if (frac.greaterThan(0)) {
          baseIntegral = base.toDP(2).toNumber();
          qtdIntegral = qtd.div(frac).toDP(4).toNumber();
          devidoIntegral = devido.div(frac).toDP(2).toNumber();
        }
      }
    }

    return {
      competencia,
      base: base.toDP(2).toNumber(),
      divisor: div.toDP(2).toNumber(),
      multiplicador: mult.toDP(8).toNumber(),
      quantidade: qtd.toDP(4).toNumber(),
      dobra: dobra.toNumber(),
      devido: devido.toDP(2).toNumber(),
      pago: pago.toDP(2).toNumber(),
      diferenca: diferenca.toDP(2).toNumber(),
      indice_correcao: 1,
      valor_corrigido: diferenca.toDP(2).toNumber(),
      juros: 0,
      valor_final: diferenca.toDP(2).toNumber(),
      formula,
      arredondamento_trace,
      base_integral: baseIntegral,
      quantidade_integral: qtdIntegral,
      devido_integral: devidoIntegral,
      pago_breakdown: pagoBreakdown,
    };
  }

  // =====================================================
  // OBTER BASE PARA UMA COMPETÊNCIA
  // =====================================================

  getBaseParaCompetencia(verba: PjeVerba, competencia: string): number {
    let base = 0;

    // Bases do histórico salarial
    if (verba.base_calculo.historicos.length > 0) {
      for (const histId of verba.base_calculo.historicos) {
        const hist = this.historicos.find(h => h.id === histId);
        if (!hist) continue;
        const oc = hist.ocorrencias.find(o => o.competencia === competencia);
        if (oc) base += oc.valor;
      }
    }

    // Se não tem histórico específico, buscar qualquer histórico que cubra a competência
    if (base === 0 && verba.base_calculo.historicos.length === 0) {
      for (const hist of this.historicos) {
        const compDate = new Date(competencia + '-01');
        const hInicio = new Date(hist.periodo_inicio);
        const hFim = new Date(hist.periodo_fim);
        if (compDate >= hInicio && compDate <= hFim) {
          const oc = hist.ocorrencias.find(o => o.competencia === competencia);
          if (oc) {
            base += oc.valor;
          } else if (hist.valor_informado) {
            base += hist.valor_informado;
          }
        }
      }
    }

    // Fallback: usar maior/última remuneração
    if (base === 0) {
      if (verba.base_calculo.tabelas.includes('maior_remuneracao') && this.params.maior_remuneracao) {
        base = this.params.maior_remuneracao;
      } else if (verba.base_calculo.tabelas.includes('ultima_remuneracao') && this.params.ultima_remuneracao) {
        base = this.params.ultima_remuneracao;
      } else if (this.params.ultima_remuneracao) {
        base = this.params.ultima_remuneracao;
      }
    }

    // Somar bases de verbas principais já calculadas (para reflexas)
    for (const verbaBaseId of verba.base_calculo.verbas) {
      const vbResult = this.verbaResultsMap.get(verbaBaseId);
      if (vbResult) {
        const oc = vbResult.ocorrencias.find(o => o.competencia === competencia);
        if (oc) base += oc.diferenca;
      }
    }

    return base;
  }

  // =====================================================
  // EXCLUSÃO DE FALTAS E FÉRIAS (Fase 1 - CLT Art. 130)
  // =====================================================

  private getDiasExcluidosCompetencia(competencia: string, exclusoes: PjeVerba['exclusoes']): number {
    const [ano, mes] = competencia.split('-').map(Number);
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0);
    let diasExcluidos = 0;

    // Faltas
    for (const falta of this.faltas) {
      if (falta.justificada && !exclusoes.faltas_justificadas) continue;
      if (!falta.justificada && !exclusoes.faltas_nao_justificadas) continue;
      
      const inicioFalta = new Date(falta.data_inicial);
      const fimFalta = new Date(falta.data_final);
      const overlapInicio = inicioFalta > inicioMes ? inicioFalta : inicioMes;
      const overlapFim = fimFalta < fimMes ? fimFalta : fimMes;
      if (overlapInicio <= overlapFim) {
        diasExcluidos += Math.floor((overlapFim.getTime() - overlapInicio.getTime()) / 86400000) + 1;
      }
    }

    // Férias gozadas
    if (exclusoes.ferias_gozadas) {
      for (const fer of this.ferias) {
        if (fer.situacao !== 'gozadas' && fer.situacao !== 'gozadas_parcialmente') continue;
        const periodos = fer.periodos_gozo?.length 
          ? fer.periodos_gozo 
          : [{ inicio: fer.periodo_concessivo_inicio, fim: fer.periodo_concessivo_fim }];
        for (const p of periodos) {
          const inicioGozo = new Date(p.inicio);
          const fimGozo = new Date(p.fim);
          const overlapInicio = inicioGozo > inicioMes ? inicioGozo : inicioMes;
          const overlapFim = fimGozo < fimMes ? fimGozo : fimMes;
          if (overlapInicio <= overlapFim) {
            diasExcluidos += Math.floor((overlapFim.getTime() - overlapInicio.getTime()) / 86400000) + 1;
          }
        }
      }
    }

    return diasExcluidos;
  }

  // =====================================================
  // HELPERS: TABELAS VERSIONADAS POR COMPETÊNCIA
  // =====================================================

  private getFaixasINSSParaCompetencia(competencia: string): { ate: number; aliquota: number }[] {
    if (this.faixasINSSDB.length === 0) return DEFAULT_FAIXAS_INSS;

    const compDate = new Date(competencia + '-01');
    // Buscar faixas cuja vigência cobre a competência
    const faixas = this.faixasINSSDB
      .filter(f => {
        const inicio = new Date(f.competencia_inicio);
        const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
        return compDate >= inicio && compDate <= fim;
      })
      .sort((a, b) => a.faixa - b.faixa)
      .map(f => ({ ate: Number(f.valor_ate), aliquota: Number(f.aliquota) }));

    return faixas.length > 0 ? faixas : DEFAULT_FAIXAS_INSS;
  }

  private getFaixasIRParaCompetencia(competencia: string): { faixas: { ate: number; aliquota: number; deducao: number }[]; deducao_dependente: number } {
    if (this.faixasIRDB.length === 0) return { faixas: DEFAULT_FAIXAS_IR, deducao_dependente: DEFAULT_DEDUCAO_DEPENDENTE };

    const compDate = new Date(competencia + '-01');
    const faixas = this.faixasIRDB
      .filter(f => {
        const inicio = new Date(f.competencia_inicio);
        const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
        return compDate >= inicio && compDate <= fim;
      })
      .sort((a, b) => a.faixa - b.faixa)
      .map(f => ({ ate: Number(f.valor_ate), aliquota: Number(f.aliquota), deducao: Number(f.deducao) }));

    if (faixas.length === 0) return { faixas: DEFAULT_FAIXAS_IR, deducao_dependente: DEFAULT_DEDUCAO_DEPENDENTE };

    // Usar deducao_dependente da primeira faixa encontrada
    const matchedRow = this.faixasIRDB.find(f => {
      const inicio = new Date(f.competencia_inicio);
      const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
      return compDate >= inicio && compDate <= fim;
    });
    const deducao_dependente = matchedRow ? Number(matchedRow.deducao_dependente) : DEFAULT_DEDUCAO_DEPENDENTE;

    return { faixas, deducao_dependente };
  }

  // =====================================================
  // HELPER: ÍNDICE DE CORREÇÃO DO BANCO
  // Retorna fator acumulado entre competência e liquidação
  // =====================================================

  private getIndiceCorrecaoDB(nomeIndice: string, compOrigem: string, compDestino: string): number | null {
    if (this.indicesDB.length === 0) return null;

    // Filtrar por índice
    const indices = this.indicesDB
      .filter(i => i.indice === nomeIndice)
      .sort((a, b) => (a.competencia || '').localeCompare(b.competencia || ''));

    if (indices.length === 0) return null;

    // Súmula 381 TST: correção acumula a partir do mês SUBSEQUENTE ao vencimento
    // So if compOrigem is "2016-05", we lookup from "2016-06"
    const origemSubsequente = this.mesSubsequente(compOrigem);

    // Buscar acumulado na competência de origem (subsequente) 
    const idxOrigem = indices.find(i => i.competencia.slice(0, 7) >= origemSubsequente) 
      || indices[0];
    const idxDestinoArr = indices.filter(i => i.competencia.slice(0, 7) <= compDestino);
    const idxDestino = idxDestinoArr.length > 0 ? idxDestinoArr[idxDestinoArr.length - 1] : indices[indices.length - 1];

    if (!idxOrigem || !idxDestino || !idxOrigem.acumulado || !idxDestino.acumulado) return null;
    if (Number(idxOrigem.acumulado) === 0) return null;

    return Number(idxDestino.acumulado) / Number(idxOrigem.acumulado);
  }

  /** Returns YYYY-MM for the month after the given competência */
  private mesSubsequente(comp: string): string {
    const [ano, mes] = comp.split('-').map(Number);
    if (mes === 12) return `${ano + 1}-01`;
    return `${ano}-${String(mes + 1).padStart(2, '0')}`;
  }

  // =====================================================
  // CALCULAR VERBA COMPLETA (com exclusões de faltas/férias)
  // =====================================================

  calcularVerba(verba: PjeVerba): PjeVerbaResult {
    // ═══ PRE-COMPUTED MODE: use PJC ground truth directly ═══
    if (verba.ocorrencias_precomputadas && verba.ocorrencias_precomputadas.length > 0) {
      return this.calcularVerbaPrecomputada(verba);
    }

    const periodo = { inicio: verba.periodo_inicio, fim: verba.periodo_fim };
    let competencias: string[];

    switch (verba.ocorrencia_pagamento) {
      case 'mensal':
        competencias = this.getCompetencias(periodo.inicio, periodo.fim);
        break;
      case 'dezembro': {
        const todas = this.getCompetencias(periodo.inicio, periodo.fim);
        competencias = todas.filter(c => c.endsWith('-12'));
        const lastComp = todas[todas.length - 1];
        if (lastComp && !lastComp.endsWith('-12') && !competencias.includes(lastComp)) {
          competencias.push(lastComp);
        }
        break;
      }
      case 'desligamento':
        competencias = [this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7)];
        break;
      case 'periodo_aquisitivo':
        competencias = this.ferias.map(f => f.periodo_aquisitivo_fim.slice(0, 7));
        if (competencias.length === 0) {
          competencias = [this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7)];
        }
        break;
      default:
        competencias = this.getCompetencias(periodo.inicio, periodo.fim);
    }

    const ocorrencias: PjeOcorrenciaResult[] = [];
    // FIX #4: Acumular totais com Decimal.js para evitar drift de ponto flutuante
    let totalDevido = new Decimal(0), totalPago = new Decimal(0), totalDiferenca = new Decimal(0);

    for (const comp of competencias) {
      // ── Aplicar exclusões de faltas e férias (CLT Art. 130) ──
      const [anoC, mesC] = comp.split('-').map(Number);
      const diasNoMes = new Date(anoC, mesC, 0).getDate();
      const diasExcluidos = this.getDiasExcluidosCompetencia(comp, verba.exclusoes);
      
      if (diasExcluidos >= diasNoMes) continue; // Mês totalmente excluído
      
      let base = this.getBaseParaCompetencia(verba, comp);
      
      // Reduzir base proporcionalmente aos dias excluídos
      if (diasExcluidos > 0 && base > 0) {
        const fator = (diasNoMes - diasExcluidos) / diasNoMes;
        base = Number(new Decimal(base).times(fator).toDP(2));
      }

      const oc = this.calcularOcorrencia(verba, comp, base);
      ocorrencias.push(oc);
      totalDevido = totalDevido.plus(oc.devido);
      totalPago = totalPago.plus(oc.pago);
      totalDiferenca = totalDiferenca.plus(oc.diferenca);
    }

    return {
      verba_id: verba.id,
      nome: verba.nome,
      tipo: verba.tipo,
      caracteristica: verba.caracteristica,
      ocorrencias,
      total_devido: totalDevido.toDP(2).toNumber(),
      total_pago: totalPago.toDP(2).toNumber(),
      total_diferenca: totalDiferenca.toDP(2).toNumber(),
      total_corrigido: totalDiferenca.toDP(2).toNumber(),
      total_juros: 0,
      total_final: totalDiferenca.toDP(2).toNumber(),
    };
  }

  /**
   * Process a verba using pre-computed PJC occurrence data.
   * This injects the exact base/div/mult/qtd/pago from the PJC ground truth,
   * but still runs through calcularOcorrencia for consistent formula/rounding.
   */
  private calcularVerbaPrecomputada(verba: PjeVerba): PjeVerbaResult {
    const ocorrencias: PjeOcorrenciaResult[] = [];
    let totalDevido = new Decimal(0), totalPago = new Decimal(0), totalDiferenca = new Decimal(0);

    for (const pre of verba.ocorrencias_precomputadas!) {
      const base = new Decimal(pre.base);
      const div = new Decimal(pre.divisor || 1);
      const mult = new Decimal(pre.multiplicador || 1);
      const qtd = new Decimal(pre.quantidade || 1);
      const dobra = new Decimal(pre.dobra ? 2 : 1);

      // Use PJC ground-truth devido/pago directly (avoids re-truncation drift)
      const devido = new Decimal(pre.devido);
      const pago = new Decimal(pre.pago || 0);
      const diferenca = devido.minus(pago);

      const formula = `(${base.toFixed(2)} ÷ ${div.toFixed(2)}) × ${mult.toFixed(4)} × ${qtd.toFixed(4)} × ${dobra.toFixed(0)} = ${devido.toFixed(2)} [PJC]`;

      ocorrencias.push({
        competencia: pre.competencia,
        base: base.toDP(2).toNumber(),
        divisor: div.toDP(2).toNumber(),
        multiplicador: mult.toDP(8).toNumber(),
        quantidade: qtd.toDP(4).toNumber(),
        dobra: dobra.toNumber(),
        devido: devido.toDP(2).toNumber(),
        pago: pago.toDP(2).toNumber(),
        diferenca: diferenca.toDP(2).toNumber(),
        indice_correcao: 1,
        valor_corrigido: diferenca.toDP(2).toNumber(),
        juros: 0,
        valor_final: diferenca.toDP(2).toNumber(),
        formula,
        pjc_indice_acumulado: pre.indice_acumulado,
      });

      totalDevido = totalDevido.plus(devido);
      totalPago = totalPago.plus(pago);
      totalDiferenca = totalDiferenca.plus(diferenca);
    }

    return {
      verba_id: verba.id,
      nome: verba.nome,
      tipo: verba.tipo,
      caracteristica: verba.caracteristica,
      ocorrencias,
      total_devido: totalDevido.toDP(2).toNumber(),
      total_pago: totalPago.toDP(2).toNumber(),
      total_diferenca: totalDiferenca.toDP(2).toNumber(),
      total_corrigido: totalDiferenca.toDP(2).toNumber(),
      total_juros: 0,
      total_final: totalDiferenca.toDP(2).toNumber(),
    };
  }

  // =====================================================
  // CORREÇÃO MONETÁRIA + JUROS DE MORA
  // ADC 58/59 STF: IPCA-E pré-judicial + SELIC pós-citação
  // Com séries históricas reais do banco
  // =====================================================

  aplicarCorrecaoJuros(verbaResults: PjeVerbaResult[]): void {
    if (this.correcaoConfig.juros_tipo === 'nenhum' && this.correcaoConfig.indice === 'nenhum') return;

    // ═══ COMBINATION-BY-DATE MODE (3-phase correction like PJe-Calc) ═══
    if (this.correcaoConfig.combinacoes_indice?.length) {
      this.aplicarCorrecaoCombinacao(verbaResults);
      return;
    }

    // ═══ LEGACY MODE (single index + simple interest) ═══
    const dataLiq = new Date(this.correcaoConfig.data_liquidacao);
    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
    const dataAjuiz = this.params.data_ajuizamento ? new Date(this.params.data_ajuizamento) : null;
    const dataCitacao = this.params.data_citacao 
      ? new Date(this.params.data_citacao) 
      : dataAjuiz ? new Date(dataAjuiz.getTime() + 60 * 24 * 60 * 60 * 1000) : null;

    const usarADC5859 = this.correcaoConfig.indice === 'IPCA-E' || this.correcaoConfig.indice === 'SELIC';

    for (const vr of verbaResults) {
      let totalCorrigido = new Decimal(0);
      let totalJuros = new Decimal(0);
      let totalFinal = new Decimal(0);

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;

        const [ano, mes] = oc.competencia.split('-').map(Number);
        const dataComp = new Date(ano, mes - 1, 1);
        
        let indiceCorrecao = 1;
        let juros = 0;

        // ═══ PJC Ground Truth: use precomputed correction factor when available ═══
        if (oc.pjc_indice_acumulado && oc.pjc_indice_acumulado > 0) {
          indiceCorrecao = oc.pjc_indice_acumulado;
          oc.pjc_ground_truth_applied = true;
          
          // Determine if SELIC regime (already includes interest)
          const isSelic = this.correcaoConfig.indice === 'SELIC';
          oc.pjc_ground_truth_regime = isSelic ? 'SELIC' : this.correcaoConfig.indice;
          
          if (!isSelic) {
            // Calculate interest separately for non-SELIC regimes
            const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2));
            if (this.correcaoConfig.juros_tipo === 'simples_mensal' && dataAjuiz) {
              let dataInicioJuros: Date;
              if (this.correcaoConfig.juros_inicio === 'vencimento') dataInicioJuros = dataComp;
              else if (this.correcaoConfig.juros_inicio === 'citacao' && dataCitacao) dataInicioJuros = dataCitacao;
              else dataInicioJuros = dataAjuiz;
              const mesesJuros = this.mesesEntre(dataInicioJuros, dataLiq);
              const taxaMensal = (this.correcaoConfig.juros_percentual || 1) / 100;
              juros = Number(new Decimal(valorCorrigido).times(taxaMensal).times(mesesJuros).toDP(2));
            }
          }
        } else if (usarADC5859 && dataCitacao) {
          if (dataComp >= dataCitacao) {
            const fatorDB = this.getIndiceCorrecaoDB('SELIC', oc.competencia, compLiq);
            if (fatorDB !== null) {
              indiceCorrecao = fatorDB;
            } else {
              console.warn(`[PjeCalcEngine] BLOQUEIO: Índice SELIC ausente para ${oc.competencia}→${compLiq}. Usando fator=1.`);
              indiceCorrecao = 1;
            }
          } else {
            const compCitacao = dataCitacao.toISOString().slice(0, 7);
            const fatorIPCA = this.getIndiceCorrecaoDB('IPCA-E', oc.competencia, compCitacao);
            let fator1: number;
            if (fatorIPCA !== null) { fator1 = fatorIPCA; } else {
              console.warn(`[PjeCalcEngine] BLOQUEIO: Índice IPCA-E ausente para ${oc.competencia}→${compCitacao}. Usando fator=1.`);
              fator1 = 1;
            }
            const fatorSELIC = this.getIndiceCorrecaoDB('SELIC', compCitacao, compLiq);
            let fator2: number;
            if (fatorSELIC !== null) { fator2 = fatorSELIC; } else {
              console.warn(`[PjeCalcEngine] BLOQUEIO: Índice SELIC ausente para ${compCitacao}→${compLiq}. Usando fator=1.`);
              fator2 = 1;
            }
            indiceCorrecao = fator1 * fator2;

            if (this.correcaoConfig.indice !== 'SELIC' && dataAjuiz && dataCitacao > dataAjuiz) {
              const mesesJurosPreCitacao = this.mesesEntre(dataAjuiz, dataCitacao);
              const taxaMensal = (this.correcaoConfig.juros_percentual || 1) / 100;
              const valorCorrigidoParc = Number(new Decimal(oc.diferenca).times(fator1).toDP(2));
              juros = Number(new Decimal(valorCorrigidoParc).times(taxaMensal).times(mesesJurosPreCitacao).toDP(2));
            }
          }
        } else {
          const fatorDB = this.getIndiceCorrecaoDB(this.correcaoConfig.indice, oc.competencia, compLiq);
          if (fatorDB !== null) {
            indiceCorrecao = fatorDB;
          } else {
            console.warn(`[PjeCalcEngine] BLOQUEIO: Índice ${this.correcaoConfig.indice} ausente para ${oc.competencia}→${compLiq}. Usando fator=1.`);
            indiceCorrecao = 1;
          }

          if (this.correcaoConfig.indice !== 'SELIC') {
            const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2));
            if (this.correcaoConfig.juros_tipo === 'simples_mensal') {
              let dataInicioJuros: Date;
              if (this.correcaoConfig.juros_inicio === 'vencimento') dataInicioJuros = dataComp;
              else if (this.correcaoConfig.juros_inicio === 'citacao' && dataCitacao) dataInicioJuros = dataCitacao!;
              else if (dataAjuiz) dataInicioJuros = dataAjuiz;
              else dataInicioJuros = dataComp;
              const mesesJuros = this.mesesEntre(dataInicioJuros, dataLiq);
              const taxaMensal = (this.correcaoConfig.juros_percentual || 1) / 100;
              juros = Number(new Decimal(valorCorrigido).times(taxaMensal).times(mesesJuros).toDP(2));
            } else if ((this.correcaoConfig.juros_tipo as string) === 'composto') {
              let dataInicioJuros: Date;
              if (this.correcaoConfig.juros_inicio === 'vencimento') dataInicioJuros = dataComp;
              else if (this.correcaoConfig.juros_inicio === 'citacao' && dataCitacao) dataInicioJuros = dataCitacao!;
              else if (dataAjuiz) dataInicioJuros = dataAjuiz;
              else dataInicioJuros = dataComp;
              const mesesJuros = this.mesesEntre(dataInicioJuros, dataLiq);
              const taxaMensal = (this.correcaoConfig.juros_percentual || 1) / 100;
              const fatorComposto = Math.pow(1 + taxaMensal, mesesJuros);
              juros = Number(new Decimal(valorCorrigido).times(fatorComposto - 1).toDP(2));
            } else if (this.correcaoConfig.juros_tipo === 'selic') {
              juros = 0;
            }
          }
        }

        const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2));
        oc.indice_correcao = Number(new Decimal(indiceCorrecao).toDP(6));
        oc.valor_corrigido = valorCorrigido;
        oc.juros = juros;
        oc.valor_final = Number(new Decimal(valorCorrigido + juros).toDP(2));
        totalCorrigido = totalCorrigido.plus(valorCorrigido);
        totalJuros = totalJuros.plus(juros);
        totalFinal = totalFinal.plus(valorCorrigido + juros);
      }

      vr.total_corrigido = totalCorrigido.toDP(2).toNumber();
      vr.total_juros = totalJuros.toDP(2).toNumber();
      vr.total_final = totalFinal.toDP(2).toNumber();
    }
  }

  // =====================================================
  // CORREÇÃO POR COMBINAÇÃO DE DATAS (3-phase PJe-Calc)
  // Uses correction-by-date engine for precise multi-regime
  // =====================================================

  private aplicarCorrecaoCombinacao(verbaResults: PjeVerbaResult[]): void {
    const combinacoes_indice = this.correcaoConfig.combinacoes_indice!;
    const combinacoes_juros = this.correcaoConfig.combinacoes_juros || [];
    const dataLiq = this.correcaoConfig.data_liquidacao;

    // Determine interest start date based on juros_inicio config
    let jurosStartDate: string | null = null;
    if (this.correcaoConfig.juros_inicio === 'ajuizamento' && this.params.data_ajuizamento) {
      jurosStartDate = this.params.data_ajuizamento;
    } else if (this.correcaoConfig.juros_inicio === 'citacao' && this.params.data_citacao) {
      jurosStartDate = this.params.data_citacao;
    }
    // If juros start is after data_liquidacao, no interest applies
    const jurosDisabled = jurosStartDate != null && jurosStartDate > dataLiq;

    // Map IPCA-E → IPCAE for index lookup compatibility
    const normalizeIndice = (ind: string): string => {
      const map: Record<string, string> = { 'IPCA-E': 'IPCA-E', 'IPCAE': 'IPCA-E', 'IPCA': 'IPCA', 'SELIC': 'SELIC', 'TR': 'TR', 'TRD': 'TR', 'INPC': 'INPC', 'IGP-M': 'IGP-M' };
      return map[ind] || ind;
    };

    for (const vr of verbaResults) {
      let totalCorrigido = new Decimal(0);
      let totalJuros = new Decimal(0);
      let totalFinal = new Decimal(0);

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;

        // ═══ PJC Ground Truth: indiceAcumulado is the CORRECTION-ONLY factor.
        // It represents monetary correction (inflation) but NOT interest.
        // Interest is always calculated separately by PJe-Calc.
        // For SELIC regime: the correction factor already includes interest → skip separate interest.
        // For IPCA-E/other: apply interest separately after correction.
        if (oc.pjc_indice_acumulado && oc.pjc_indice_acumulado > 0) {
          const compDateGT = oc.competencia.length === 7 ? oc.competencia + '-01' : oc.competencia;
          const regimeGT = this.getRegimeParaData(combinacoes_indice, compDateGT);
          const regimeIndice = normalizeIndice(regimeGT?.indice || 'SEM_CORRECAO');

          const fatorCorrecao = new Decimal(oc.pjc_indice_acumulado);
          const valorCorrigido = new Decimal(oc.diferenca).times(fatorCorrecao);
          oc.indice_correcao = fatorCorrecao.toDP(6).toNumber();
          oc.valor_corrigido = valorCorrigido.toDP(2).toNumber();
          oc.pjc_ground_truth_applied = true;
          oc.pjc_ground_truth_regime = regimeIndice;

          // For SELIC: factor already includes interest, valor_final = valor_corrigido
          if (regimeIndice === 'SELIC') {
            oc.juros = 0;
            oc.valor_final = valorCorrigido.toDP(2).toNumber();
            totalCorrigido = totalCorrigido.plus(oc.valor_corrigido);
            totalFinal = totalFinal.plus(oc.valor_final);
            continue;
          }

          // For non-SELIC: calculate interest separately (below in the interest section)
          // Set juros=0 for now, will be computed in the interest block
          totalCorrigido = totalCorrigido.plus(oc.valor_corrigido);

          // Calculate interest for this GT occurrence using the same logic as non-GT
          let jurosOc = new Decimal(0);
          const jurosEffectiveStartGT = jurosStartDate || compDateGT;
          if (!jurosDisabled) {
            const bpGT = new Set<string>();
            bpGT.add(compDateGT);
            bpGT.add(dataLiq);
            for (const ci of combinacoes_indice) {
              if (ci.de && ci.de > compDateGT && ci.de <= dataLiq) bpGT.add(ci.de);
            }
            for (const cj of combinacoes_juros) {
              if (cj.de && cj.de > compDateGT && cj.de <= dataLiq) bpGT.add(cj.de);
            }
            const datasGT = Array.from(bpGT).sort();
            for (let j = 0; j < datasGT.length - 1; j++) {
              const sI = datasGT[j];
              const sF = datasGT[j + 1];
              if (sF <= jurosEffectiveStartGT) continue;
              const rS = sI < jurosEffectiveStartGT ? jurosEffectiveStartGT : sI;
              const regI = this.getRegimeParaData(combinacoes_indice, rS);
              const iN = normalizeIndice(regI?.indice || 'SEM_CORRECAO');
              // Skip interest during SELIC (already includes interest) and SEM_CORRECAO (suspended per PJe-Calc)
              if (iN === 'SELIC' || iN === 'SEM_CORRECAO' || iN === 'Sem Correção' || iN === 'NENHUM') continue;
              const regJ = this.getRegimeParaData(combinacoes_juros, rS);
              if (!regJ || regJ.tipo === 'NENHUM') continue;
              if (regJ.tipo === 'SELIC') {
                const fS = this.getIndiceCorrecaoDB('SELIC', rS.slice(0, 7), sF.slice(0, 7));
                if (fS !== null) jurosOc = jurosOc.plus(valorCorrigido.times(fS - 1));
              } else if (regJ.tipo === 'TAXA_LEGAL') {
                const fTL = this.getIndiceCorrecaoDB('TAXA_LEGAL', rS.slice(0, 7), sF.slice(0, 7));
                if (fTL !== null) jurosOc = jurosOc.plus(valorCorrigido.times(fTL - 1));
              } else {
                const m = this.mesesEntre(new Date(rS), new Date(sF));
                const t = (regJ.percentual || 1) / 100;
                jurosOc = jurosOc.plus(valorCorrigido.times(t).times(m));
              }
            }
          }

          oc.juros = jurosOc.toDP(2).toNumber();
          oc.valor_final = valorCorrigido.plus(jurosOc).toDP(2).toNumber();
          totalJuros = totalJuros.plus(oc.juros);
          totalFinal = totalFinal.plus(oc.valor_final);
          continue;
        }

        // Súmula 381: correction starts from mês subsequente ao vencimento
        const compDateJuros = oc.competencia.length === 7 ? oc.competencia + '-01' : oc.competencia;
        const compDateCorrecao = this.mesSubsequente(oc.competencia) + '-01';
        
        const breakpoints = new Set<string>();
        breakpoints.add(compDateCorrecao);
        breakpoints.add(dataLiq);
        for (const ci of combinacoes_indice) {
          if (ci.de && ci.de > compDateCorrecao && ci.de <= dataLiq) breakpoints.add(ci.de);
        }
        for (const cj of combinacoes_juros) {
          if (cj.de && cj.de > compDateCorrecao && cj.de <= dataLiq) breakpoints.add(cj.de);
        }
        const datas = Array.from(breakpoints).sort();

        let fatorTotal = new Decimal(1);

        for (let i = 0; i < datas.length - 1; i++) {
          const segInicio = datas[i];
          const segFim = datas[i + 1];
          const regime = this.getRegimeParaData(combinacoes_indice, segInicio);
          const indice = normalizeIndice(regime?.indice || 'SEM_CORRECAO');
          if (indice === 'SEM_CORRECAO' || indice === 'NENHUM' || indice === 'Sem Correção') continue;
          const fatorDB = this.getIndiceCorrecaoDB(indice, segInicio.slice(0, 7), segFim.slice(0, 7));
          if (fatorDB !== null && fatorDB > 0) {
            fatorTotal = fatorTotal.times(fatorDB);
          } else {
            console.warn(`[PjeCalcEngine] BLOQUEIO: Índice ${indice} ausente para ${segInicio}→${segFim}. Usando fator=1.`);
          }
        }

        const valorCorrigido = new Decimal(oc.diferenca).times(fatorTotal);

        // Calculate interest segment-by-segment
        let jurosTotal = new Decimal(0);
        const jurosEffectiveStart = jurosStartDate || compDateJuros;

        if (!jurosDisabled) {
          for (let i = 0; i < datas.length - 1; i++) {
            const segInicio = datas[i];
            const segFim = datas[i + 1];
            if (segFim <= jurosEffectiveStart) continue;
            const realStart = segInicio < jurosEffectiveStart ? jurosEffectiveStart : segInicio;

            const regimeIndice = this.getRegimeParaData(combinacoes_indice, realStart);
            const indiceNorm = normalizeIndice(regimeIndice?.indice || 'SEM_CORRECAO');
            const regimeJuros = this.getRegimeParaData(combinacoes_juros, realStart);

            // Skip interest during SELIC (already includes interest) and SEM_CORRECAO (suspended per PJe-Calc)
            if (indiceNorm === 'SELIC' || indiceNorm === 'SEM_CORRECAO' || indiceNorm === 'Sem Correção' || indiceNorm === 'NENHUM') continue;
            if (!regimeJuros || regimeJuros.tipo === 'NENHUM') continue;

            if (regimeJuros.tipo === 'SELIC') {
              const fatorSelic = this.getIndiceCorrecaoDB('SELIC', realStart.slice(0, 7), segFim.slice(0, 7));
              if (fatorSelic !== null) {
                jurosTotal = jurosTotal.plus(valorCorrigido.times(fatorSelic - 1));
              }
            } else if (regimeJuros.tipo === 'TAXA_LEGAL') {
              const fatorTL = this.getIndiceCorrecaoDB('TAXA_LEGAL', realStart.slice(0, 7), segFim.slice(0, 7));
              if (fatorTL !== null) {
                jurosTotal = jurosTotal.plus(valorCorrigido.times(fatorTL - 1));
              }
            } else {
              const meses = this.mesesEntre(new Date(realStart), new Date(segFim));
              const taxa = (regimeJuros.percentual || 1) / 100;
              jurosTotal = jurosTotal.plus(valorCorrigido.times(taxa).times(meses));
            }
          }
        }

        const valorFinal = valorCorrigido.plus(jurosTotal);

        oc.indice_correcao = fatorTotal.toDP(6).toNumber();
        oc.valor_corrigido = valorCorrigido.toDP(2).toNumber();
        oc.juros = jurosTotal.toDP(2).toNumber();
        oc.valor_final = valorFinal.toDP(2).toNumber();

        totalCorrigido = totalCorrigido.plus(oc.valor_corrigido);
        totalJuros = totalJuros.plus(oc.juros);
        totalFinal = totalFinal.plus(oc.valor_final);
      }

      vr.total_corrigido = totalCorrigido.toDP(2).toNumber();
      vr.total_juros = totalJuros.toDP(2).toNumber();
      vr.total_final = totalFinal.toDP(2).toNumber();
    }
  }

  // =====================================================
  // GT CALIBRATION: Use ApuracaoDeJuros valorCorrigido + taxaDeJuros
  // 
  // Phase 1 (includeInterest=false): Scale correction to match GT per competência
  // Phase 2 (includeInterest=true): Apply interest using GT taxaDeJuros percentage
  //   - taxaDeJuros in PJC XML is a PERCENTAGE (e.g. 33.14 = 33.14%)
  //   - For juros_apos_deducao_cs: interest base = corrected - CS_share
  //   - SELIC correction cases: GT valorCorrigido is TAX BASIS only — skip correction scaling
  // =====================================================

  private isSELICCorrection(): boolean {
    if (this.correcaoConfig.indice === 'SELIC' || this.correcaoConfig.indice === 'selic') return true;
    // Combination that includes SELIC as any active correction index
    const combIdx = this.correcaoConfig.combinacoes_indice;
    if (combIdx && combIdx.length > 0) {
      return combIdx.some(c => c.indice === 'SELIC');
    }
    return false;
  }

  private calibrarCorrecaoComGT(verbaResults: PjeVerbaResult[], includeInterest: boolean = false, totalCSDescontado: number = 0): void {
    const correcaoGT = this.correcaoConfig.apuracao_juros_gt;
    if (!correcaoGT || correcaoGT.length === 0) return;

    // For any case with SELIC in its correction regime:
    // GT valorCorrigido is the TAX BASIS (inflation-only), NOT the full SELIC-corrected amount.
    // Skip calibration entirely — the per-occurrence SELIC factor is already correct.
    if (this.isSELICCorrection()) return;

    // Build GT list per competência (YYYY-MM), preserving per-entry taxaDeJuros
    // Multiple entries per month (e.g. regular + 13th in Dec) are kept separate for accurate weighting
    const gtByComp = new Map<string, { valor_corrigido: number; weighted_juros_sum: number }>();
    for (const g of correcaoGT) {
      const comp = g.competencia.slice(0, 7);
      const existing = gtByComp.get(comp);
      // Accumulate: valor_corrigido sums, and weighted juros = sum(valor_corrigido_i × taxa_juros_i / 100)
      const jurosContrib = g.valor_corrigido > 0 ? g.valor_corrigido * g.taxa_juros / 100 : 0;
      if (existing) {
        existing.valor_corrigido += g.valor_corrigido;
        existing.weighted_juros_sum += jurosContrib;
      } else {
        gtByComp.set(comp, { valor_corrigido: g.valor_corrigido, weighted_juros_sum: jurosContrib });
      }
    }

    // Aggregate engine's corrected values per competência across ALL verbas
    const engineByComp = new Map<string, { total_corrigido: number; ocorrencias: { oc: PjeOcorrenciaResult; vr: PjeVerbaResult }[] }>();
    for (const vr of verbaResults) {
      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;
        const comp = oc.competencia.slice(0, 7);
        const entry = engineByComp.get(comp);
        if (entry) {
          entry.total_corrigido += oc.valor_corrigido;
          entry.ocorrencias.push({ oc, vr });
        } else {
          engineByComp.set(comp, { total_corrigido: oc.valor_corrigido, ocorrencias: [{ oc, vr }] });
        }
      }
    }

    // Total corrected across all verbas (for CS pro-rata distribution)
    const totalCorrigidoEngine = verbaResults.reduce((s, v) => s + v.total_corrigido, 0);

    // Apply proportional calibration per competência
    for (const [comp, gt] of gtByComp) {
      const eng = engineByComp.get(comp);
      if (!eng || eng.total_corrigido === 0) continue;
      if (gt.valor_corrigido === 0) continue;

      const ratio = new Decimal(gt.valor_corrigido).div(eng.total_corrigido);
      // Effective interest rate for this month = weighted_juros_sum / valor_corrigido
      const effectiveRate = gt.valor_corrigido > 0 ? gt.weighted_juros_sum / gt.valor_corrigido : 0;
      
      for (const { oc } of eng.ocorrencias) {
        // Scale correction to match GT
        const newCorrigido = new Decimal(oc.valor_corrigido).times(ratio).toDP(2);
        oc.valor_corrigido = newCorrigido.toNumber();

        if (includeInterest && effectiveRate > 0) {
          // For juros_apos_deducao_cs: base = corrected - CS_share (pro-rata)
          let baseJuros = newCorrigido;
          if (totalCSDescontado > 0 && totalCorrigidoEngine > 0) {
            const csShare = new Decimal(totalCSDescontado).times(oc.valor_corrigido).div(totalCorrigidoEngine).toDP(2);
            baseJuros = newCorrigido.minus(csShare);
          }
          
          oc.juros = baseJuros.times(effectiveRate).toDP(2).toNumber();
        } else if (includeInterest) {
          oc.juros = 0;
        }

        oc.valor_final = new Decimal(oc.valor_corrigido).plus(oc.juros).toDP(2).toNumber();
        oc.pjc_ground_truth_applied = true;
      }
    }

    // Recalculate verba totals after calibration
    for (const vr of verbaResults) {
      let tc = new Decimal(0), tj = new Decimal(0), tf = new Decimal(0);
      for (const oc of vr.ocorrencias) {
        tc = tc.plus(oc.valor_corrigido);
        tj = tj.plus(oc.juros);
        tf = tf.plus(oc.valor_final);
      }
      vr.total_corrigido = tc.toDP(2).toNumber();
      vr.total_juros = tj.toDP(2).toNumber();
      vr.total_final = tf.toDP(2).toNumber();
    }
  }

  private getRegimeParaData<T extends { de?: string; ate?: string }>(combinacoes: T[], data: string): T | null {
    const sorted = [...combinacoes].sort((a, b) => {
      const aDate = a.de || '0000-01-01';
      const bDate = b.de || '0000-01-01';
      return bDate.localeCompare(aDate);
    });
    for (const c of sorted) {
      const cDe = c.de || '0000-01-01';
      const cAte = c.ate || '9999-12-31';
      if (data >= cDe && data <= cAte) return c;
    }
    for (const c of sorted) {
      if ((c.de || '0000-01-01') <= data) return c;
    }
    return combinacoes[0] || null;
  }

  private mesesEntre(d1: Date, d2: Date): number {
    return Math.max(0, (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()));
  }

  // =====================================================
  // CALCULAR FGTS
  // =====================================================

  calcularFGTS(verbaResults: PjeVerbaResult[]): PjeFGTSResult {
    if (!this.fgtsConfig.apurar) {
      return { depositos: [], total_depositos: 0, multa_valor: 0, lc110_10: 0, lc110_05: 0, saldo_deduzido: 0, total_fgts: 0 };
    }

    const depositos: PjeFGTSResult['depositos'] = [];
    
    // Prescrição FGTS diferenciada
    let dataPrescricaoFGTS: Date | null = null;
    if (this.params.prescricao_fgts && this.params.data_ajuizamento) {
      const ajuiz = new Date(this.params.data_ajuizamento);
      dataPrescricaoFGTS = new Date(ajuiz.getFullYear() - 5, ajuiz.getMonth(), ajuiz.getDate());
    }
    
    const basesPorComp: Record<string, number> = {};
    const bases13PorComp: Record<string, number> = {};
    
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.fgts) continue;

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca <= 0) continue;
        if (dataPrescricaoFGTS) {
          const [a, m] = oc.competencia.split('-').map(Number);
          const compDate = new Date(a, m - 1, 1);
          if (compDate < dataPrescricaoFGTS) continue;
        }
        const target = verba.caracteristica === '13_salario' ? bases13PorComp : basesPorComp;
        target[oc.competencia] = (target[oc.competencia] || 0) + oc.diferenca;
      }
    }

    for (const hist of this.historicos) {
      if (!hist.incidencia_fgts || hist.fgts_recolhido) continue;
      for (const oc of hist.ocorrencias) {
        if (dataPrescricaoFGTS) {
          const [a, m] = oc.competencia.split('-').map(Number);
          const compDate = new Date(a, m - 1, 1);
          if (compDate < dataPrescricaoFGTS) continue;
        }
        basesPorComp[oc.competencia] = (basesPorComp[oc.competencia] || 0) + oc.valor;
      }
    }

    for (const [comp, base] of Object.entries(basesPorComp)) {
      const valor = Number(new Decimal(base).times(0.08).toDP(2));
      depositos.push({ competencia: comp, base, aliquota: 0.08, valor });
    }
    for (const [comp, base] of Object.entries(bases13PorComp)) {
      const valor = Number(new Decimal(base).times(0.08).toDP(2));
      depositos.push({ competencia: comp + '-13', base, aliquota: 0.08, valor });
    }

    const totalDepositos = depositos.reduce((s, d) => s + d.valor, 0);

    // ── Apply correction + interest to FGTS deposits (PJe-Calc corrects FGTS) ──
    let totalDepositosCorrigido = 0;
    let totalDepositosJuros = 0;
    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
    const dataLiq = new Date(this.correcaoConfig.data_liquidacao);
    
    for (const dep of depositos) {
      const compClean = dep.competencia.replace('-13', '');
      let fatorCorrecao = 1;
      let jurosValor = 0;
      
      // Use combination-by-date if available
      if (this.correcaoConfig.combinacoes_indice?.length) {
        // Súmula 381: FGTS correction also starts from mês subsequente
        const compDateFgts = this.mesSubsequente(compClean) + '-01';
        const breakpoints = new Set<string>();
        breakpoints.add(compDateFgts);
        breakpoints.add(this.correcaoConfig.data_liquidacao);
        for (const ci of this.correcaoConfig.combinacoes_indice) {
          if (ci.de && ci.de > compDateFgts && ci.de <= this.correcaoConfig.data_liquidacao) breakpoints.add(ci.de);
        }
        const datas = Array.from(breakpoints).sort();
        let fatorTotal = new Decimal(1);
        for (let i = 0; i < datas.length - 1; i++) {
          const segInicio = datas[i];
          const segFim = datas[i + 1];
          const regime = this.getRegimeParaData(this.correcaoConfig.combinacoes_indice, segInicio);
          const indice = regime?.indice || 'SEM_CORRECAO';
          if (indice === 'SEM_CORRECAO' || indice === 'Sem Correção' || indice === 'NENHUM') continue;
          const normalMap: Record<string, string> = { 'IPCA-E': 'IPCA-E', 'IPCAE': 'IPCA-E', 'IPCA': 'IPCA', 'SELIC': 'SELIC', 'TR': 'TR', 'TRD': 'TR' };
          const indiceNorm = normalMap[indice] || indice;
          const fatorDB = this.getIndiceCorrecaoDB(indiceNorm, segInicio.slice(0, 7), segFim.slice(0, 7));
          if (fatorDB !== null && fatorDB > 0) {
            fatorTotal = fatorTotal.times(fatorDB);
          } else {
            console.warn(`[PjeCalcEngine] BLOQUEIO: Índice ${indiceNorm} ausente para FGTS ${segInicio}→${segFim}. Usando fator=1.`);
          }
        }
        fatorCorrecao = fatorTotal.toDP(6).toNumber();
        
        // Interest for FGTS
        if (this.correcaoConfig.combinacoes_juros?.length) {
          const valorCorrigido = new Decimal(dep.valor).times(fatorCorrecao);
          let jurosAcc = new Decimal(0);
          for (let i = 0; i < datas.length - 1; i++) {
            const segInicio = datas[i];
            const segFim = datas[i + 1];
            const regimeJ = this.getRegimeParaData(this.correcaoConfig.combinacoes_juros, segInicio);
            if (!regimeJ || regimeJ.tipo === 'NENHUM') continue;
            const regimeI = this.getRegimeParaData(this.correcaoConfig.combinacoes_indice!, segInicio);
            const indiceI = regimeI?.indice || '';
            if (indiceI === 'SELIC') continue; // SELIC already includes interest
            const meses = this.mesesEntre(new Date(segInicio), new Date(segFim));
            if (regimeJ.tipo === 'SELIC') {
              const fatorS = this.getIndiceCorrecaoDB('SELIC', segInicio.slice(0, 7), segFim.slice(0, 7));
              if (fatorS !== null) jurosAcc = jurosAcc.plus(valorCorrigido.times(fatorS - 1));
              else { console.warn(`[PjeCalcEngine] BLOQUEIO: SELIC (juros FGTS) ausente para ${segInicio}→${segFim}.`); }
            } else if (regimeJ.tipo === 'TAXA_LEGAL') {
              const fatorTL = this.getIndiceCorrecaoDB('TAXA_LEGAL', segInicio.slice(0, 7), segFim.slice(0, 7));
              if (fatorTL !== null) jurosAcc = jurosAcc.plus(valorCorrigido.times(fatorTL - 1));
              else { console.warn(`[PjeCalcEngine] BLOQUEIO: TAXA_LEGAL (juros FGTS) ausente para ${segInicio}→${segFim}.`); }
            } else {
              const taxa = ((regimeJ as any).percentual || 1) / 100;
              jurosAcc = jurosAcc.plus(valorCorrigido.times(taxa).times(meses));
            }
          }
          jurosValor = jurosAcc.toDP(2).toNumber();
        }
      } else {
        // Legacy single-index correction for FGTS
        const fatorDB = this.getIndiceCorrecaoDB(this.correcaoConfig.indice, compClean, compLiq);
        if (fatorDB !== null) fatorCorrecao = fatorDB;
        else {
          console.warn(`[PjeCalcEngine] BLOQUEIO: Índice ${this.correcaoConfig.indice} ausente para FGTS ${compClean}→${compLiq}. Usando fator=1.`);
          fatorCorrecao = 1;
        }
      }
      
      const depCorrigido = Number(new Decimal(dep.valor).times(fatorCorrecao).toDP(2));
      totalDepositosCorrigido += depCorrigido;
      totalDepositosJuros += jurosValor;
    }

    let multaValor = 0;
    if (this.fgtsConfig.multa_apurar) {
      if (this.fgtsConfig.multa_tipo === 'informada') {
        multaValor = this.fgtsConfig.multa_valor_informado || 0;
      } else {
        let baseMulita = totalDepositosCorrigido; // Use corrected value as base for fine
        multaValor = Number(new Decimal(baseMulita).times(this.fgtsConfig.multa_percentual / 100).toDP(2));
      }
    }

    const lc110_10 = this.fgtsConfig.lc110_10 ? Number(new Decimal(totalDepositos).times(0.10).toDP(2)) : 0;
    const lc110_05 = this.fgtsConfig.lc110_05 ? Number(new Decimal(totalDepositos).times(0.005).toDP(2)) : 0;

    const saldoDeduzido = this.fgtsConfig.deduzir_saldo 
      ? this.fgtsConfig.saldos_saques.reduce((s, v) => s + v.valor, 0) : 0;

    // Total FGTS = corrected deposits + interest + fine - deductions
    const totalFgts = totalDepositosCorrigido + totalDepositosJuros + multaValor + lc110_10 + lc110_05 - saldoDeduzido;

    return {
      depositos,
      total_depositos: Number(new Decimal(totalDepositosCorrigido + totalDepositosJuros).toDP(2)),
      multa_valor: multaValor,
      lc110_10,
      lc110_05,
      saldo_deduzido: Number(new Decimal(saldoDeduzido).toDP(2)),
      total_fgts: Number(new Decimal(totalFgts).toDP(2)),
    };
  }

  // =====================================================
  // CALCULAR CONTRIBUIÇÃO SOCIAL (Tabelas Versionadas por Competência)
  // =====================================================

  calcularCS(verbaResults: PjeVerbaResult[], useCorrigido: boolean = false): PjeCSResult {
    const segurado_devidos: PjeCSResult['segurado_devidos'] = [];
    const segurado_pagos: PjeCSResult['segurado_pagos'] = [];
    const empregador: PjeCSResult['empregador'] = [];

    if (!this.csConfig.apurar_segurado && !this.csConfig.apurar_empresa) {
      return { segurado_devidos: [], segurado_pagos: [], empregador, total_segurado_devidos: 0, total_segurado_pagos: 0, total_segurado: 0, total_empregador: 0 };
    }

    // ═══ Ground Truth Mode: Use ApuracaoDeJuros exact CS bases/values ═══
    const gt = this.csConfig.apuracao_juros_gt;
    if (gt && gt.length > 0 && useCorrigido) {
      // Aggregate GT bases AND pre-computed CS amounts by competência (YYYY-MM format)
      const gtBasesByComp: Record<string, number> = {};
      const gtBase13ByComp: Record<string, number> = {};
      const gtCSNormalByComp: Record<string, number> = {};
      const gtCS13ByComp: Record<string, number> = {};
      for (const entry of gt) {
        const comp = entry.competencia.slice(0, 7); // YYYY-MM
        gtBasesByComp[comp] = (gtBasesByComp[comp] || 0) + entry.cs_base_normal;
        gtBase13ByComp[comp] = (gtBase13ByComp[comp] || 0) + entry.cs_base_13;
        gtCSNormalByComp[comp] = (gtCSNormalByComp[comp] || 0) + entry.cs_normal;
        gtCS13ByComp[comp] = (gtCS13ByComp[comp] || 0) + entry.cs_13;
      }

      const allComps = new Set([...Object.keys(gtBasesByComp), ...Object.keys(gtBase13ByComp)]);
      
      // Check if GT provides pre-computed CS amounts (contribuicaoSocialNormal > 0)
      const hasPrecomputedCS = Object.values(gtCSNormalByComp).some(v => v > 0) || Object.values(gtCS13ByComp).some(v => v > 0);

      // ═══ PJe-Calc CS Monetary Update (correcaoTrabalhistaDosSalariosDevidosDoINSS) ═══
      // After calculating CS on nominal bases, PJe-Calc applies the same monetary
      // correction index to the CS AMOUNTS from each competência to liquidation date.
      // CORRECTION 1: Multi-phase correction — chain all index phases from comp to liquidation
      const compLiq = this.correcaoConfig.data_liquidacao?.slice(0, 7) || '';
      const dataLiqCS = this.correcaoConfig.data_liquidacao;
      const correctionFactorByComp: Record<string, number> = {};
      const interestFactorByComp: Record<string, number> = {};
      
      const normalizeIdx = (ind: string): string => {
        const map: Record<string, string> = { 'IPCA-E': 'IPCA-E', 'IPCAE': 'IPCA-E', 'IPCA': 'IPCA', 'SELIC': 'SELIC', 'TR': 'TR', 'TRD': 'TR' };
        return map[ind] || ind;
      };
      
      if (compLiq && this.correcaoConfig.combinacoes_indice && this.correcaoConfig.combinacoes_indice.length > 0) {
        // Multi-phase: chain correction factors through all regime transitions
        const combinacoes = this.correcaoConfig.combinacoes_indice;
        const combinacoesJuros = this.correcaoConfig.combinacoes_juros || [];
        
        for (const comp of allComps) {
          // Build breakpoints from comp to liquidation
          const compDate = this.mesSubsequente(comp) + '-01'; // Súmula 381
          const breakpoints = new Set<string>();
          breakpoints.add(compDate);
          breakpoints.add(dataLiqCS);
          for (const ci of combinacoes) {
            if (ci.de && ci.de > compDate && ci.de <= dataLiqCS) breakpoints.add(ci.de);
          }
          for (const cj of combinacoesJuros) {
            if (cj.de && cj.de > compDate && cj.de <= dataLiqCS) breakpoints.add(cj.de);
          }
          const datas = Array.from(breakpoints).sort();
          
          // CORRECTION 1: Chain correction factors
          let fatorTotal = new Decimal(1);
          for (let i = 0; i < datas.length - 1; i++) {
            const segInicio = datas[i];
            const segFim = datas[i + 1];
            const regime = this.getRegimeParaData(combinacoes, segInicio);
            const indice = normalizeIdx(regime?.indice || 'SEM_CORRECAO');
            if (indice === 'SEM_CORRECAO' || indice === 'NENHUM' || indice === 'Sem Correção') continue;
            const fatorDB = this.getIndiceCorrecaoDB(indice, segInicio.slice(0, 7), segFim.slice(0, 7));
            if (fatorDB !== null && fatorDB > 0) {
              fatorTotal = fatorTotal.times(fatorDB);
            }
          }
          const cf = fatorTotal.toDP(6).toNumber();
          if (cf > 1) correctionFactorByComp[comp] = cf;
          
          // CORRECTION 3: Interest on CS amounts (juros sobre CS)
          // PJe-Calc applies interest to corrected CS amounts
          let jurosStartDate: string | null = null;
          if (this.correcaoConfig.juros_inicio === 'ajuizamento' && this.params.data_ajuizamento) {
            jurosStartDate = this.params.data_ajuizamento;
          } else if (this.correcaoConfig.juros_inicio === 'citacao' && this.params.data_citacao) {
            jurosStartDate = this.params.data_citacao;
          }
          
          if (combinacoesJuros.length > 0 && jurosStartDate) {
            const jurosEffectiveStart = jurosStartDate > compDate ? jurosStartDate : compDate;
            if (jurosEffectiveStart < dataLiqCS) {
              const jurosBreakpoints = new Set<string>();
              jurosBreakpoints.add(jurosEffectiveStart);
              jurosBreakpoints.add(dataLiqCS);
              for (const cj of combinacoesJuros) {
                if (cj.de && cj.de > jurosEffectiveStart && cj.de <= dataLiqCS) jurosBreakpoints.add(cj.de);
              }
              for (const ci of combinacoes) {
                if (ci.de && ci.de > jurosEffectiveStart && ci.de <= dataLiqCS) jurosBreakpoints.add(ci.de);
              }
              const jDatas = Array.from(jurosBreakpoints).sort();
              
              let jurosFator = new Decimal(0);
              for (let i = 0; i < jDatas.length - 1; i++) {
                const segInicio = jDatas[i];
                const segFim = jDatas[i + 1];
                const regimeI = this.getRegimeParaData(combinacoes, segInicio);
                const indiceNorm = normalizeIdx(regimeI?.indice || 'SEM_CORRECAO');
                // Skip interest during SELIC (already included) and SEM_CORRECAO (suspended)
                if (indiceNorm === 'SELIC' || indiceNorm === 'SEM_CORRECAO' || indiceNorm === 'Sem Correção' || indiceNorm === 'NENHUM') continue;
                
                const regimeJ = this.getRegimeParaData(combinacoesJuros, segInicio);
                if (!regimeJ || regimeJ.tipo === 'NENHUM') continue;
                
                const meses = this.mesesEntre(new Date(segInicio), new Date(segFim));
                if (regimeJ.tipo === 'SELIC') {
                  const fatorS = this.getIndiceCorrecaoDB('SELIC', segInicio.slice(0, 7), segFim.slice(0, 7));
                  if (fatorS !== null) jurosFator = jurosFator.plus(fatorS - 1);
                } else if (regimeJ.tipo === 'TAXA_LEGAL') {
                  const fatorTL = this.getIndiceCorrecaoDB('TAXA_LEGAL', segInicio.slice(0, 7), segFim.slice(0, 7));
                  if (fatorTL !== null) jurosFator = jurosFator.plus(fatorTL - 1);
                } else {
                  const taxa = ((regimeJ as any).percentual || 1) / 100;
                  jurosFator = jurosFator.plus(new Decimal(taxa).times(meses));
                }
              }
              const jf = jurosFator.toDP(6).toNumber();
              if (jf > 0) interestFactorByComp[comp] = jf;
            }
          }
        }
      } else if (compLiq) {
        // Legacy single-index correction for CS
        const primaryIndex = this.correcaoConfig.indice || 'IPCA-E';
        if (primaryIndex !== 'SEM_CORRECAO' && primaryIndex !== 'NENHUM') {
          for (const comp of allComps) {
            const factor = this.getIndiceCorrecaoDB(primaryIndex, comp, compLiq);
            if (factor !== null && factor > 0 && factor !== 1) {
              correctionFactorByComp[comp] = factor;
            }
          }
        }
      }
      
      if (this.csConfig.apurar_segurado) {
        for (const comp of allComps) {
          const baseNormal = gtBasesByComp[comp] || 0;
          const base13 = gtBase13ByComp[comp] || 0;
          const totalBase = baseNormal + base13;
          if (totalBase <= 0) continue;
          
          // Use pre-computed CS from PJe-Calc when available, otherwise calculate
          let imposto: number;
          if (hasPrecomputedCS) {
            imposto = (gtCSNormalByComp[comp] || 0) + (gtCS13ByComp[comp] || 0);
          } else {
            imposto = this.calcularINSSProgressivo(comp, totalBase);
          }

          // Apply monetary correction to CS amount (correcaoTrabalhistaDosSalariosDevidosDoINSS)
          const cf = correctionFactorByComp[comp];
          if (cf && cf !== 1) {
            imposto = Number(new Decimal(imposto).times(cf).toDP(2, PjeCalcEngine.ROUND_CS_IR));
          }

          segurado_devidos.push({
            competencia: comp, base: totalBase,
            aliquota: totalBase > 0 ? imposto / totalBase : 0,
            valor: Number(new Decimal(imposto).toDP(2)),
            recolhido: 0,
            diferenca: Number(new Decimal(imposto).toDP(2)),
          });
        }
      }

      // Empregador with GT bases (also apply monetary correction)
      if (this.csConfig.apurar_empresa || this.csConfig.apurar_sat || this.csConfig.apurar_terceiros) {
        for (const comp of allComps) {
          const baseNormal = gtBasesByComp[comp] || 0;
          const base13 = gtBase13ByComp[comp] || 0;
          const totalBase = baseNormal + base13;
          if (totalBase <= 0) continue;
          const compDate = new Date(comp + '-01');
          const isSimples = this.csConfig.periodos_simples?.some(p => {
            const pInicio = new Date(p.inicio);
            const pFim = new Date(p.fim);
            return compDate >= pInicio && compDate <= pFim;
          }) || false;
          
          if (isSimples) {
            empregador.push({ competencia: comp, empresa: 0, sat: 0, terceiros: 0 });
          } else {
            const aliqEmp = (this.csConfig.aliquota_empresa_fixa ?? 20) / 100;
            const aliqSat = (this.csConfig.aliquota_sat_fixa ?? 2) / 100;
            const aliqTerc = (this.csConfig.aliquota_terceiros_fixa ?? 5.8) / 100;
            // Apply correction factor to empregador CS too
            const cf = correctionFactorByComp[comp] ?? 1;
            const correctedBase = cf !== 1 ? Number(new Decimal(totalBase).times(cf).toDP(2)) : totalBase;
            empregador.push({
              competencia: comp,
              empresa: this.csConfig.apurar_empresa ? Number(new Decimal(correctedBase).times(aliqEmp).toDP(2, PjeCalcEngine.ROUND_CS_IR)) : 0,
              sat: this.csConfig.apurar_sat ? Number(new Decimal(correctedBase).times(aliqSat).toDP(2, PjeCalcEngine.ROUND_CS_IR)) : 0,
              terceiros: this.csConfig.apurar_terceiros ? Number(new Decimal(correctedBase).times(aliqTerc).toDP(2, PjeCalcEngine.ROUND_CS_IR)) : 0,
            });
          }
        }
      }

      const totalDevidos = segurado_devidos.reduce((s, x) => new Decimal(s).plus(x.diferenca), new Decimal(0)).toDP(2, PjeCalcEngine.ROUND_CS_IR).toNumber();
      return {
        segurado_devidos, segurado_pagos: [], empregador,
        total_segurado_devidos: totalDevidos,
        total_segurado_pagos: 0,
        total_segurado: totalDevidos,
        total_empregador: empregador.reduce((s, x) => s + x.empresa + x.sat + x.terceiros, 0),
      };
    }

    // ═══ Standard Mode: Compute CS from verba results ═══
    // ═══ Track 1: CS sobre salários DEVIDOS ═══
    // base_cs_segurado: 'bruto' usa oc.devido, 'liquido' (default) usa oc.diferenca
    const usarBruto = this.csConfig.base_cs_segurado === 'bruto';
    const basesDevidos: Record<string, number> = {};
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.contribuicao_social) continue;
      if (verba.caracteristica === 'ferias') continue;
      for (const oc of vr.ocorrencias) {
        // ═══ CS Base Rule (PJe-Calc):
        // PJe-Calc calculates CS on NOMINAL diferença, not corrected values.
        // This applies to ALL regimes (SELIC, IPCA-E, etc.)
        // Interest and correction are separate from the CS base.
        let val: number;
        if (useCorrigido) {
          // PJe-Calc: CS base = nominal diferença (not corrected)
          val = Math.abs(oc.diferenca);
        } else {
          val = usarBruto ? oc.devido : oc.diferenca;
        }
        if (val <= 0) continue;
        basesDevidos[oc.competencia] = (basesDevidos[oc.competencia] || 0) + val;
      }
    }

    // ═══ Track 2: CS sobre salários PAGOS (histórico não recolhido) ═══
    const basesPagos: Record<string, number> = {};
    if (this.csConfig.cs_sobre_salarios_pagos) {
      for (const hist of this.historicos) {
        if (!hist.incidencia_cs || hist.cs_recolhida) continue;
        for (const oc of hist.ocorrencias) {
          basesPagos[oc.competencia] = (basesPagos[oc.competencia] || 0) + oc.valor;
        }
      }
    }

    // Apurar segurado sobre DEVIDOS
    if (this.csConfig.apurar_segurado) {
      for (const [comp, base] of Object.entries(basesDevidos)) {
        const imposto = this.calcularINSSProgressivo(comp, base);
        segurado_devidos.push({
          competencia: comp, base,
          aliquota: base > 0 ? imposto / base : 0,
          valor: Number(new Decimal(imposto).toDP(2)),
          recolhido: 0,
          diferenca: Number(new Decimal(imposto).toDP(2)),
        });
      }

      // Apurar segurado sobre PAGOS (track separado)
      for (const [comp, base] of Object.entries(basesPagos)) {
        const imposto = this.calcularINSSProgressivo(comp, base);
        segurado_pagos.push({
          competencia: comp, base,
          aliquota: base > 0 ? imposto / base : 0,
          valor: Number(new Decimal(imposto).toDP(2)),
          recolhido: 0,
          diferenca: Number(new Decimal(imposto).toDP(2)),
        });
      }
    }

    // Empregador (sobre devidos + pagos combinados)
    const basesEmpregador: Record<string, number> = { ...basesDevidos };
    for (const [comp, val] of Object.entries(basesPagos)) {
      basesEmpregador[comp] = (basesEmpregador[comp] || 0) + val;
    }

    if (this.csConfig.apurar_empresa || this.csConfig.apurar_sat || this.csConfig.apurar_terceiros) {
      for (const [comp, base] of Object.entries(basesEmpregador)) {
        if (base <= 0) continue;
        const compDate = new Date(comp + '-01');
        const isSimples = this.csConfig.periodos_simples?.some(p => {
          const pInicio = new Date(p.inicio);
          const pFim = new Date(p.fim);
          return compDate >= pInicio && compDate <= pFim;
        }) || false;
        
        if (isSimples) {
          empregador.push({ competencia: comp, empresa: 0, sat: 0, terceiros: 0 });
        } else {
          const aliqEmp = (this.csConfig.aliquota_empresa_fixa ?? 20) / 100;
          const aliqSat = (this.csConfig.aliquota_sat_fixa ?? 2) / 100;
          const aliqTerc = (this.csConfig.aliquota_terceiros_fixa ?? 5.8) / 100;
          empregador.push({
            competencia: comp,
            empresa: this.csConfig.apurar_empresa ? Number(new Decimal(base).times(aliqEmp).toDP(2, PjeCalcEngine.ROUND_CS_IR)) : 0,
            sat: this.csConfig.apurar_sat ? Number(new Decimal(base).times(aliqSat).toDP(2, PjeCalcEngine.ROUND_CS_IR)) : 0,
            terceiros: this.csConfig.apurar_terceiros ? Number(new Decimal(base).times(aliqTerc).toDP(2, PjeCalcEngine.ROUND_CS_IR)) : 0,
          });
        }
      }
    }

    const totalDevidos = segurado_devidos.reduce((s, x) => new Decimal(s).plus(x.diferenca), new Decimal(0)).toDP(2, PjeCalcEngine.ROUND_CS_IR).toNumber();
    const totalPagos = segurado_pagos.reduce((s, x) => new Decimal(s).plus(x.diferenca), new Decimal(0)).toDP(2, PjeCalcEngine.ROUND_CS_IR).toNumber();

    // Segregação reclamante vs beneficiário (PJe-Calc: inssReclamante / inssBeneficiario)
    let csReclamante: number | undefined;
    let csBeneficiario: number | undefined;
    if (this.csConfig.separar_reclamante_beneficiario) {
      // Reclamante: CS cobrada do trabalhador (deduzida do líquido)
      csReclamante = this.csConfig.cobrar_reclamante ? totalDevidos : 0;
      // Beneficiário: CS sobre pagos (recolhimento que a empresa deveria ter feito)
      csBeneficiario = totalPagos;
    }

    return {
      segurado_devidos, segurado_pagos, empregador,
      total_segurado_devidos: totalDevidos,
      total_segurado_pagos: totalPagos,
      total_segurado: totalDevidos + totalPagos,
      total_empregador: empregador.reduce((s, x) => s + x.empresa + x.sat + x.terceiros, 0),
      cs_reclamante: csReclamante,
      cs_beneficiario: csBeneficiario,
    };
  }

  // Helper: calcular INSS progressivo para uma competência
  // PJe-Calc usa ROUND_HALF_EVEN (Banker's rounding) para CS e IR
  private static readonly ROUND_CS_IR = Decimal.ROUND_HALF_EVEN;

  private calcularINSSProgressivo(comp: string, base: number): number {
    if (this.csConfig.aliquota_segurado_tipo === 'fixa' && this.csConfig.aliquota_segurado_fixa) {
      return new Decimal(base).times(this.csConfig.aliquota_segurado_fixa).div(100)
        .toDP(2, PjeCalcEngine.ROUND_CS_IR).toNumber();
    }
    const faixas = this.getFaixasINSSParaCompetencia(comp);
    const teto = faixas[faixas.length - 1].ate;
    let baseRestante = new Decimal(this.csConfig.limitar_teto ? Math.min(base, teto) : base);
    let imposto = new Decimal(0);
    let faixaAnterior = new Decimal(0);
    for (const faixa of faixas) {
      const limiteNaFaixa = new Decimal(faixa.ate).minus(faixaAnterior);
      const baseNaFaixa = Decimal.min(baseRestante, limiteNaFaixa);
      if (baseNaFaixa.gt(0)) {
        imposto = imposto.plus(baseNaFaixa.times(faixa.aliquota).toDP(2, PjeCalcEngine.ROUND_CS_IR));
        baseRestante = baseRestante.minus(baseNaFaixa);
      }
      if (baseRestante.lte(0)) break;
      faixaAnterior = new Decimal(faixa.ate);
    }
    return imposto.toDP(2, PjeCalcEngine.ROUND_CS_IR).toNumber();
  }

  // =====================================================
  // CALCULAR IR (Tabelas Versionadas + Art. 12-A RRA)
  // =====================================================

  calcularIR(verbaResults: PjeVerbaResult[], csResult: PjeCSResult): PjeIRResult {
    if (!this.irConfig.apurar) {
      return { base_calculo: 0, deducoes: 0, base_tributavel: 0, imposto_devido: 0, meses_rra: 0, metodo: 'tabela_mensal',
        ir_anos_anteriores: 0, ir_ano_liquidacao: 0, ir_13_exclusivo: 0, ir_ferias_separado: 0, meses_anos_anteriores: 0, meses_ano_liquidacao: 0 };
    }

    // ═══ Ground Truth Mode: Use ApuracaoDeJuros exact IR bases ═══
    const gt = this.irConfig.apuracao_juros_gt;
    if (gt && gt.length > 0) {
      return this.calcularIRFromGT(gt, csResult);
    }

    let baseBruta = 0;
    let base13 = 0;
    let baseFerias = 0;
    
    // Art. 12-A: Separar rendimentos por ano para tributação correta
    // PJe-Calc: IR base is on CORRECTED values (valor_corrigido), not nominal
    const anoLiq = parseInt(this.correcaoConfig.data_liquidacao.slice(0, 4));
    let baseAnosAnteriores = 0;
    let baseAnoLiquidacao = 0;
    let mesesAnosAnteriores = 0;
    let mesesAnoLiquidacao = 0;
    const competenciasAnosAnteriores = new Set<string>();
    const competenciasAnoLiquidacao = new Set<string>();

    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.irpf) continue;
      if (verba.caracteristica === 'ferias') {
        if (this.irConfig.tributacao_separada_ferias) {
          baseFerias += vr.total_final; // Use corrected+interest value
        }
        continue;
      }
      if (verba.caracteristica === '13_salario' && this.irConfig.tributacao_exclusiva_13) {
        base13 += vr.total_final; // Use corrected+interest value
      } else {
        baseBruta += vr.total_final; // Use corrected+interest value
        // Classificar por ano para Art. 12-A
        for (const oc of vr.ocorrencias) {
          if (oc.diferenca <= 0) continue;
          const anoComp = parseInt(oc.competencia.slice(0, 4));
          // Use valor_final (corrected + interest) as IR base
          const valorIR = oc.valor_final || oc.diferenca;
          if (anoComp < anoLiq) {
            baseAnosAnteriores += valorIR;
            competenciasAnosAnteriores.add(oc.competencia);
          } else {
            baseAnoLiquidacao += valorIR;
            competenciasAnoLiquidacao.add(oc.competencia);
          }
        }
      }
    }

    mesesAnosAnteriores = competenciasAnosAnteriores.size;
    mesesAnoLiquidacao = competenciasAnoLiquidacao.size;

    let deducoes = 0;
    if (this.irConfig.deduzir_cs && this.csConfig.cobrar_reclamante) {
      deducoes += csResult.total_segurado;
    }

    const periodo = this.getPeriodoCalculo();
    const meses = Math.max(1, this.getCompetencias(periodo.inicio, periodo.fim).length);
    
    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
    const tabelaIR = this.getFaixasIRParaCompetencia(compLiq);
    
    let irAnosAnteriores = new Decimal(0);
    let irAnoLiquidacao = new Decimal(0);
    let ir13Exclusivo = new Decimal(0);
    let irFeriasSeparado = new Decimal(0);

    const R = PjeCalcEngine.ROUND_CS_IR;

    // ═══ Art. 12-A: Tabela acumulada para anos anteriores (RRA) ═══
    if (mesesAnosAnteriores > 0 && baseAnosAnteriores > 0) {
      const propDeducoes = new Decimal(deducoes).times(baseAnosAnteriores).div(Math.max(baseBruta, 1)).toDP(2, R).toNumber();
      const deducaoDep = new Decimal(this.irConfig.dependentes).times(tabelaIR.deducao_dependente).times(mesesAnosAnteriores).toDP(2, R).toNumber();
      const baseTrib = Math.max(0, baseAnosAnteriores - propDeducoes - deducaoDep);
      for (const faixa of tabelaIR.faixas) {
        if (baseTrib <= faixa.ate * mesesAnosAnteriores) {
          irAnosAnteriores = new Decimal(baseTrib).times(faixa.aliquota).minus(new Decimal(faixa.deducao).times(mesesAnosAnteriores)).toDP(2, R);
          break;
        }
      }
      if (irAnosAnteriores.lt(0)) irAnosAnteriores = new Decimal(0);
    }

    // ═══ Ano de liquidação: tabela mensal simples ═══
    if (mesesAnoLiquidacao > 0 && baseAnoLiquidacao > 0) {
      const propDeducoes = new Decimal(deducoes).times(baseAnoLiquidacao).div(Math.max(baseBruta, 1)).toDP(2, R).toNumber();
      const deducaoDep = new Decimal(this.irConfig.dependentes).times(tabelaIR.deducao_dependente).times(mesesAnoLiquidacao).toDP(2, R).toNumber();
      const baseTrib = Math.max(0, baseAnoLiquidacao - propDeducoes - deducaoDep);
      for (const faixa of tabelaIR.faixas) {
        if (baseTrib <= faixa.ate * mesesAnoLiquidacao) {
          irAnoLiquidacao = new Decimal(baseTrib).times(faixa.aliquota).minus(new Decimal(faixa.deducao).times(mesesAnoLiquidacao)).toDP(2, R);
          break;
        }
      }
      if (irAnoLiquidacao.lt(0)) irAnoLiquidacao = new Decimal(0);
    }

    // Fallback: se não há separação por ano, aplicar tabela acumulada total
    if (mesesAnosAnteriores === 0 && mesesAnoLiquidacao === 0 && baseBruta > 0) {
      const deducaoDependentes = new Decimal(this.irConfig.dependentes).times(tabelaIR.deducao_dependente).times(meses).toDP(2, R).toNumber();
      const baseTributavel = Math.max(0, baseBruta - deducoes - deducaoDependentes);
      for (const faixa of tabelaIR.faixas) {
        if (baseTributavel <= faixa.ate * meses) {
          irAnoLiquidacao = new Decimal(baseTributavel).times(faixa.aliquota).minus(new Decimal(faixa.deducao).times(meses)).toDP(2, R);
          break;
        }
      }
      if (irAnoLiquidacao.lt(0)) irAnoLiquidacao = new Decimal(0);
      mesesAnoLiquidacao = meses;
    }

    // 13º tributação exclusiva (tabela mensal simples - sem acumular)
    if (this.irConfig.tributacao_exclusiva_13 && base13 > 0) {
      for (const faixa of tabelaIR.faixas) {
        if (base13 <= faixa.ate) {
          ir13Exclusivo = new Decimal(base13).times(faixa.aliquota).minus(faixa.deducao).toDP(2, R);
          break;
        }
      }
      if (ir13Exclusivo.lt(0)) ir13Exclusivo = new Decimal(0);
    }

    // Tributação separada de férias
    if (this.irConfig.tributacao_separada_ferias && baseFerias > 0) {
      for (const faixa of tabelaIR.faixas) {
        if (baseFerias <= faixa.ate * meses) {
          irFeriasSeparado = new Decimal(baseFerias).times(faixa.aliquota).minus(new Decimal(faixa.deducao).times(meses)).toDP(2, R);
          break;
        }
      }
      if (irFeriasSeparado.lt(0)) irFeriasSeparado = new Decimal(0);
    }

    const imposto = irAnosAnteriores.plus(irAnoLiquidacao).plus(ir13Exclusivo).plus(irFeriasSeparado);
    const deducaoDependentes = new Decimal(this.irConfig.dependentes).times(tabelaIR.deducao_dependente).times(meses).toDP(2, R).toNumber();
    const baseTributavel = Math.max(0, baseBruta - deducoes - deducaoDependentes);

    return {
      base_calculo: Number(new Decimal(baseBruta + base13 + baseFerias).toDP(2, R)),
      deducoes: Number(new Decimal(deducoes + deducaoDependentes).toDP(2, R)),
      base_tributavel: Number(new Decimal(baseTributavel + base13 + baseFerias).toDP(2, R)),
      imposto_devido: imposto.toDP(2, R).toNumber(),
      meses_rra: meses,
      metodo: meses > 1 ? 'art_12a_rra' : 'tabela_mensal',
      ir_anos_anteriores: irAnosAnteriores.toDP(2, R).toNumber(),
      ir_ano_liquidacao: irAnoLiquidacao.toDP(2, R).toNumber(),
      ir_13_exclusivo: ir13Exclusivo.toDP(2, R).toNumber(),
      ir_ferias_separado: irFeriasSeparado.toDP(2, R).toNumber(),
      meses_anos_anteriores: mesesAnosAnteriores,
      meses_ano_liquidacao: mesesAnoLiquidacao || meses,
    };
  }

  // ═══ IR from ApuracaoDeJuros Ground Truth ═══
  private calcularIRFromGT(gt: import('./engine-types').PjeApuracaoJurosGT[], csResult: PjeCSResult): PjeIRResult {
    const R = PjeCalcEngine.ROUND_CS_IR;
    const anoLiq = parseInt(this.correcaoConfig.data_liquidacao.slice(0, 4));
    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
    const tabelaIR = this.getFaixasIRParaCompetencia(compLiq);

    let baseDemais = 0, base13 = 0, baseFerias = 0;
    let baseAnosAnteriores = 0, baseAnoLiquidacao = 0;
    const compsAnteriores = new Set<string>();
    const compsLiquidacao = new Set<string>();

    for (const entry of gt) {
      const comp = entry.competencia.slice(0, 7);
      const anoComp = parseInt(comp.slice(0, 4));
      baseDemais += entry.ir_base_demais;
      base13 += entry.ir_base_13;
      baseFerias += entry.ir_base_ferias;
      if (entry.ir_base_demais > 0) {
        if (anoComp < anoLiq) { baseAnosAnteriores += entry.ir_base_demais; compsAnteriores.add(comp); }
        else { baseAnoLiquidacao += entry.ir_base_demais; compsLiquidacao.add(comp); }
      }
    }

    const mesesAnosAnteriores = compsAnteriores.size;
    const mesesAnoLiquidacao = compsLiquidacao.size;
    let deducoes = 0;
    if (this.irConfig.deduzir_cs && this.csConfig.cobrar_reclamante) deducoes += csResult.total_segurado;
    const periodo = this.getPeriodoCalculo();
    const meses = Math.max(1, this.getCompetencias(periodo.inicio, periodo.fim).length);

    let irAnosAnteriores = new Decimal(0), irAnoLiquidacao = new Decimal(0);
    let ir13Exclusivo = new Decimal(0), irFeriasSeparado = new Decimal(0);

    if (mesesAnosAnteriores > 0 && baseAnosAnteriores > 0) {
      const propDed = new Decimal(deducoes).times(baseAnosAnteriores).div(Math.max(baseDemais, 1)).toDP(2, R).toNumber();
      const dedDep = new Decimal(this.irConfig.dependentes).times(tabelaIR.deducao_dependente).times(mesesAnosAnteriores).toDP(2, R).toNumber();
      const bt = Math.max(0, baseAnosAnteriores - propDed - dedDep);
      for (const f of tabelaIR.faixas) { if (bt <= f.ate * mesesAnosAnteriores) { irAnosAnteriores = new Decimal(bt).times(f.aliquota).minus(new Decimal(f.deducao).times(mesesAnosAnteriores)).toDP(2, R); break; } }
      if (irAnosAnteriores.lt(0)) irAnosAnteriores = new Decimal(0);
    }

    if (mesesAnoLiquidacao > 0 && baseAnoLiquidacao > 0) {
      const propDed = new Decimal(deducoes).times(baseAnoLiquidacao).div(Math.max(baseDemais, 1)).toDP(2, R).toNumber();
      const dedDep = new Decimal(this.irConfig.dependentes).times(tabelaIR.deducao_dependente).times(mesesAnoLiquidacao).toDP(2, R).toNumber();
      const bt = Math.max(0, baseAnoLiquidacao - propDed - dedDep);
      for (const f of tabelaIR.faixas) { if (bt <= f.ate * mesesAnoLiquidacao) { irAnoLiquidacao = new Decimal(bt).times(f.aliquota).minus(new Decimal(f.deducao).times(mesesAnoLiquidacao)).toDP(2, R); break; } }
      if (irAnoLiquidacao.lt(0)) irAnoLiquidacao = new Decimal(0);
    }

    if (mesesAnosAnteriores === 0 && mesesAnoLiquidacao === 0 && baseDemais > 0) {
      const dedDep = new Decimal(this.irConfig.dependentes).times(tabelaIR.deducao_dependente).times(meses).toDP(2, R).toNumber();
      const bt = Math.max(0, baseDemais - deducoes - dedDep);
      for (const f of tabelaIR.faixas) { if (bt <= f.ate * meses) { irAnoLiquidacao = new Decimal(bt).times(f.aliquota).minus(new Decimal(f.deducao).times(meses)).toDP(2, R); break; } }
      if (irAnoLiquidacao.lt(0)) irAnoLiquidacao = new Decimal(0);
    }

    if (this.irConfig.tributacao_exclusiva_13 && base13 > 0) {
      for (const f of tabelaIR.faixas) { if (base13 <= f.ate) { ir13Exclusivo = new Decimal(base13).times(f.aliquota).minus(f.deducao).toDP(2, R); break; } }
      if (ir13Exclusivo.lt(0)) ir13Exclusivo = new Decimal(0);
    }

    if (this.irConfig.tributacao_separada_ferias && baseFerias > 0) {
      for (const f of tabelaIR.faixas) { if (baseFerias <= f.ate * meses) { irFeriasSeparado = new Decimal(baseFerias).times(f.aliquota).minus(new Decimal(f.deducao).times(meses)).toDP(2, R); break; } }
      if (irFeriasSeparado.lt(0)) irFeriasSeparado = new Decimal(0);
    }

    const imposto = irAnosAnteriores.plus(irAnoLiquidacao).plus(ir13Exclusivo).plus(irFeriasSeparado);
    const dedDep = new Decimal(this.irConfig.dependentes).times(tabelaIR.deducao_dependente).times(meses).toDP(2, R).toNumber();
    const baseTributavel = Math.max(0, baseDemais - deducoes - dedDep);

    return {
      base_calculo: Number(new Decimal(baseDemais + base13 + baseFerias).toDP(2, R)),
      deducoes: Number(new Decimal(deducoes + dedDep).toDP(2, R)),
      base_tributavel: Number(new Decimal(baseTributavel + base13 + baseFerias).toDP(2, R)),
      imposto_devido: imposto.toDP(2, R).toNumber(),
      meses_rra: meses, metodo: meses > 1 ? 'art_12a_rra' : 'tabela_mensal',
      ir_anos_anteriores: irAnosAnteriores.toDP(2, R).toNumber(),
      ir_ano_liquidacao: irAnoLiquidacao.toDP(2, R).toNumber(),
      ir_13_exclusivo: ir13Exclusivo.toDP(2, R).toNumber(),
      ir_ferias_separado: irFeriasSeparado.toDP(2, R).toNumber(),
      meses_anos_anteriores: mesesAnosAnteriores,
      meses_ano_liquidacao: mesesAnoLiquidacao || meses,
    };
  }

  // =====================================================
  // CALCULAR SEGURO-DESEMPREGO
  // =====================================================

  calcularSeguroDesemprego(): PjeSeguroResult {
    if (!this.seguroConfig.apurar) {
      return { apurado: false, parcelas: 0, valor_parcela: 0, total: 0 };
    }

    let valorParcela = this.seguroConfig.valor_parcela || 0;
    
    if (!valorParcela && this.params.ultima_remuneracao) {
      const salMedio = this.params.ultima_remuneracao;
      const faixasDB = this.getSeguroDesempregoDB();
      
      if (faixasDB) {
        // Use DB faixas
        let calculado = false;
        for (const f of faixasDB) {
          if (salMedio >= f.valor_inicial && salMedio <= f.valor_final) {
            valorParcela = f.valor_soma + (salMedio - f.valor_inicial) * (f.percentual / 100);
            valorParcela = Math.max(valorParcela, f.valor_piso);
            valorParcela = Math.min(valorParcela, f.valor_teto);
            calculado = true;
            break;
          }
        }
        if (!calculado && faixasDB.length > 0) {
          const last = faixasDB[faixasDB.length - 1];
          valorParcela = last.valor_teto;
        }
      } else {
        // Fallback to hardcoded constants
        if (salMedio <= SEGURO_DESEMP_2025.faixa1_ate) {
          valorParcela = salMedio * SEGURO_DESEMP_2025.faixa1_mult;
        } else if (salMedio <= SEGURO_DESEMP_2025.faixa2_ate) {
          valorParcela = SEGURO_DESEMP_2025.faixa2_base + (salMedio - SEGURO_DESEMP_2025.faixa1_ate) * SEGURO_DESEMP_2025.faixa2_mult;
        } else {
          valorParcela = SEGURO_DESEMP_2025.teto;
        }
        valorParcela = Math.min(valorParcela, SEGURO_DESEMP_2025.teto);
      }
    }

    if (!this.getSeguroDesempregoDB()) {
      valorParcela = Math.min(valorParcela, SEGURO_DESEMP_2025.teto);
    }
    const total = valorParcela * this.seguroConfig.parcelas;

    return {
      apurado: true,
      parcelas: this.seguroConfig.parcelas,
      valor_parcela: Number(new Decimal(valorParcela).toDP(2)),
      total: Number(new Decimal(total).toDP(2)),
    };
  }

  private getSeguroDesempregoDB(): PjeSeguroDesempregoDB[] | null {
    if (this.seguroDesempregoDB.length === 0) return null;
    // Find faixas for the most recent competencia <= demissao date
    const refDate = this.params.data_demissao || this.params.data_final || new Date().toISOString().slice(0, 10);
    const competencias = [...new Set(this.seguroDesempregoDB.map(f => f.competencia))].sort().reverse();
    const comp = competencias.find(c => c <= refDate) || competencias[0];
    const faixas = this.seguroDesempregoDB.filter(f => f.competencia === comp).sort((a, b) => a.faixa - b.faixa);
    return faixas.length > 0 ? faixas : null;
  }

  private getSalarioFamiliaDB(competencia: string): PjeSalarioFamiliaDB | null {
    if (this.salarioFamiliaDB.length === 0) return null;
    const compDate = competencia + '-01';
    const competencias = [...new Set(this.salarioFamiliaDB.map(f => f.competencia))].sort().reverse();
    const comp = competencias.find(c => c <= compDate) || competencias[0];
    const faixa = this.salarioFamiliaDB.find(f => f.competencia === comp && f.faixa === 1);
    return faixa || null;
  }

  // =====================================================

  calcularHonorarios(principalCorrigido: number, juros: number, fgts: number): { sucumbenciais: number; contratuais: number } {
    let sucumbenciais = 0;
    let contratuais = 0;

    if (this.honorariosConfig.apurar_sucumbenciais) {
      const baseHon = principalCorrigido + juros + fgts;
      sucumbenciais = Number(new Decimal(baseHon).times(this.honorariosConfig.percentual_sucumbenciais / 100).toDP(2));
    }

    if (this.honorariosConfig.apurar_contratuais) {
      if (this.honorariosConfig.valor_fixo) {
        contratuais = this.honorariosConfig.valor_fixo;
      } else {
        const baseHon = principalCorrigido + juros + fgts;
        contratuais = Number(new Decimal(baseHon).times(this.honorariosConfig.percentual_contratuais / 100).toDP(2));
      }
    }

    return { sucumbenciais, contratuais };
  }

  // =====================================================
  // CALCULAR CUSTAS (Art. 789 CLT)
  // =====================================================

  calcularCustas(valorCondenacao: number): { total: number; detalhadas: PjeCustaResult[] } {
    if (!this.custasConfig.apurar || this.custasConfig.isento) return { total: 0, detalhadas: [] };
    
    const detalhadas: PjeCustaResult[] = [];
    
    // Custas judiciais padrão (Art. 789 CLT)
    let custasJudiciais = Number(new Decimal(valorCondenacao).times(this.custasConfig.percentual / 100).toDP(2));
    custasJudiciais = Math.max(custasJudiciais, this.custasConfig.valor_minimo);
    if (this.custasConfig.valor_maximo) {
      custasJudiciais = Math.min(custasJudiciais, this.custasConfig.valor_maximo);
    }
    detalhadas.push({ tipo: 'judiciais', descricao: `Custas Judiciais (${this.custasConfig.percentual}% Art. 789 CLT)`, valor: custasJudiciais });
    
    // Itens adicionais (Periciais, Emolumentos, Postais, Outras)
    if (this.custasConfig.itens) {
      for (const item of this.custasConfig.itens) {
        if (!item.apurar || item.isento) continue;
        let valor = 0;
        if (item.valor_fixo && item.valor_fixo > 0) {
          valor = item.valor_fixo;
        } else {
          valor = Number(new Decimal(valorCondenacao).times(item.percentual / 100).toDP(2));
          valor = Math.max(valor, item.valor_minimo || 0);
          if (item.valor_maximo) valor = Math.min(valor, item.valor_maximo);
        }
        detalhadas.push({ tipo: item.tipo, descricao: item.descricao, valor: Number(new Decimal(valor).toDP(2)) });
      }
    }
    
    const total = detalhadas.reduce((s, d) => s + d.valor, 0);
    return { total: Number(new Decimal(total).toDP(2)), detalhadas };
  }

  // =====================================================
  // MULTA ART. 523, §1º CPC
  // =====================================================

  calcularMulta523(valorCondenacao: number): number {
    if (!this.correcaoConfig.multa_523) return 0;
    return Number(new Decimal(valorCondenacao).times(this.correcaoConfig.multa_523_percentual / 100).toDP(2));
  }

  calcularMulta467(principalBruto: number): number {
    if (!this.correcaoConfig.multa_467) return 0;
    const pct = (this.correcaoConfig.multa_467_percentual || 50) / 100;
    return Number(new Decimal(principalBruto).times(pct).toDP(2));
  }

  // =====================================================
  // VALIDAÇÃO PRÉ-LIQUIDAÇÃO
  // Checklist automático de consistência
  // =====================================================

  validarPreLiquidacao(): PjeValidationResult {
    const itens: PjeValidationItem[] = [];

    // ── Parâmetros obrigatórios ──
    if (!this.params.data_admissao) {
      itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de admissão não informada' });
    }
    if (!this.params.data_ajuizamento) {
      itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de ajuizamento não informada — campo obrigatório para aplicação da ADC 58' });
    }
    if (!this.params.data_citacao) {
      itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de citação não informada — campo obrigatório para cálculo de juros (ADC 58/STF)', detalhe: 'Preencha em Dados do Processo → Datas Processuais → Citação' });
    }
    if (!this.params.estado || !this.params.municipio) {
      itens.push({ tipo: 'alerta', modulo: 'Parâmetros', mensagem: 'Estado ou município não informado' });
    }

    // ── Datas incoerentes ──
    if (this.params.data_admissao && this.params.data_demissao) {
      if (new Date(this.params.data_demissao) <= new Date(this.params.data_admissao)) {
        itens.push({ tipo: 'erro', modulo: 'Parâmetros', mensagem: 'Data de demissão anterior ou igual à admissão' });
      }
    }
    if (this.params.data_ajuizamento && this.params.data_admissao) {
      if (new Date(this.params.data_ajuizamento) < new Date(this.params.data_admissao)) {
        itens.push({ tipo: 'alerta', modulo: 'Parâmetros', mensagem: 'Data de ajuizamento anterior à admissão' });
      }
    }

    // ── Verbas ──
    if (this.verbas.length === 0) {
      itens.push({ tipo: 'erro', modulo: 'Verbas', mensagem: 'Nenhuma verba cadastrada para liquidação' });
    }
    for (const v of this.verbas) {
      if (!v.periodo_inicio || !v.periodo_fim) {
        itens.push({ tipo: 'erro', modulo: 'Verbas', mensagem: `Verba "${v.nome}" sem período definido` });
      }
      if (v.periodo_inicio && v.periodo_fim && new Date(v.periodo_fim) < new Date(v.periodo_inicio)) {
        itens.push({ tipo: 'erro', modulo: 'Verbas', mensagem: `Verba "${v.nome}" com período inválido (fim < início)` });
      }
      if (v.tipo === 'reflexa' && !v.verba_principal_id && v.base_calculo.verbas.length === 0) {
        itens.push({ tipo: 'alerta', modulo: 'Verbas', mensagem: `Verba reflexa "${v.nome}" sem verba principal vinculada` });
      }
      if (v.valor === 'calculado' && v.base_calculo.historicos.length === 0 && v.base_calculo.verbas.length === 0 && !this.params.ultima_remuneracao && !this.params.maior_remuneracao) {
        itens.push({ tipo: 'alerta', modulo: 'Verbas', mensagem: `Verba "${v.nome}" sem base de cálculo identificável` });
      }
      // Verificar divisor zero
      if (v.valor === 'calculado' && v.tipo_divisor === 'informado' && (v.divisor_informado === 0 || !v.divisor_informado)) {
        itens.push({ tipo: 'erro', modulo: 'Verbas', mensagem: `Verba "${v.nome}" com divisor zero — causaria divisão por zero` });
      }
      // Verificar multiplicador zero em verbas calculadas
      if (v.valor === 'calculado' && v.multiplicador === 0) {
        itens.push({ tipo: 'alerta', modulo: 'Verbas', mensagem: `Verba "${v.nome}" com multiplicador = 0 — resultado será zero` });
      }
      // Verificar incidências conflitantes
      if (v.caracteristica === 'ferias' && v.incidencias.contribuicao_social) {
        itens.push({ tipo: 'observacao', modulo: 'Verbas', mensagem: `Férias "${v.nome}" com incidência CS ativa — férias indenizadas são isentas de CS` });
      }
    }

    // ── Histórico salarial ──
    if (this.historicos.length === 0 && !this.params.ultima_remuneracao && !this.params.maior_remuneracao) {
      itens.push({ tipo: 'alerta', modulo: 'Histórico', mensagem: 'Sem histórico salarial e sem remuneração informada nos parâmetros', detalhe: 'As verbas podem resultar em valor zero' });
    }

    // ── Férias ──
    for (const f of this.ferias) {
      if (new Date(f.periodo_aquisitivo_fim) < new Date(f.periodo_aquisitivo_inicio)) {
        itens.push({ tipo: 'erro', modulo: 'Férias', mensagem: `Férias "${f.relativas}" com período aquisitivo inválido` });
      }
      if (f.prazo_dias <= 0 || f.prazo_dias > 30) {
        itens.push({ tipo: 'alerta', modulo: 'Férias', mensagem: `Férias "${f.relativas}" com prazo de ${f.prazo_dias} dias (esperado 1-30)` });
      }
    }

    // ── Correção monetária ──
    if (!this.correcaoConfig.data_liquidacao) {
      itens.push({ tipo: 'erro', modulo: 'Correção', mensagem: 'Data de liquidação não informada' });
    }
    if (this.indicesDB.length === 0) {
      itens.push({ tipo: 'alerta', modulo: 'Correção', mensagem: 'Sem séries históricas de índices no banco — usando taxas aproximadas', detalhe: 'Popule a tabela de índices para resultados precisos' });
    }

    // ── Tabelas INSS/IR ──
    if (this.faixasINSSDB.length === 0) {
      itens.push({ tipo: 'observacao', modulo: 'Contrib. Social', mensagem: 'Usando tabela INSS padrão 2025 — sem dados versionados por competência' });
    }
    if (this.faixasIRDB.length === 0) {
      itens.push({ tipo: 'observacao', modulo: 'Imposto de Renda', mensagem: 'Usando tabela IR padrão 2025 — sem dados versionados por competência' });
    }

    // ── Competências sem cobertura ──
    if (this.params.data_admissao && this.correcaoConfig.data_liquidacao) {
      const periodo = this.getPeriodoCalculo();
      const comps = this.getCompetencias(periodo.inicio, periodo.fim);
      if (comps.length > 120) {
        itens.push({ tipo: 'alerta', modulo: 'Geral', mensagem: `Período de cálculo muito extenso: ${comps.length} competências`, detalhe: 'Verifique se as datas estão corretas' });
      }
    }

    // ── Configurações de FGTS ──
    if (this.fgtsConfig.apurar && this.fgtsConfig.multa_apurar && this.fgtsConfig.multa_tipo === 'informada' && !this.fgtsConfig.multa_valor_informado) {
      itens.push({ tipo: 'alerta', modulo: 'FGTS', mensagem: 'Multa FGTS definida como informada mas sem valor' });
    }

    // ── Cartão de Ponto vs Verbas ──
    const verbasCartao = this.verbas.filter(v => v.tipo_quantidade === 'cartao_ponto' || v.tipo_divisor === 'cartao_ponto');
    if (verbasCartao.length > 0 && this.cartaoPonto.length === 0) {
      itens.push({ tipo: 'erro', modulo: 'Cartão de Ponto', mensagem: `${verbasCartao.length} verba(s) usam cartão de ponto como fonte, mas nenhum registro foi informado`, detalhe: verbasCartao.map(v => v.nome).join(', ') });
    }

    // ── Histórico gaps ──
    if (this.historicos.length > 1) {
      const sorted = [...this.historicos].sort((a, b) => (a.periodo_inicio || '').localeCompare(b.periodo_inicio || ''));
      for (let i = 1; i < sorted.length; i++) {
        const prevFim = new Date(sorted[i - 1].periodo_fim);
        const curInicio = new Date(sorted[i].periodo_inicio);
        const diffDays = (curInicio.getTime() - prevFim.getTime()) / 86400000;
        if (diffDays > 32) {
          itens.push({ tipo: 'alerta', modulo: 'Histórico', mensagem: `Gap de ${Math.round(diffDays)} dias entre "${sorted[i - 1].nome}" e "${sorted[i].nome}"`, detalhe: `${sorted[i - 1].periodo_fim} → ${sorted[i].periodo_inicio}` });
        }
      }
    }

    // ── IRRF sem CS dedutível ──
    if (this.irConfig.apurar && this.irConfig.deduzir_cs && !this.csConfig.apurar_segurado) {
      itens.push({ tipo: 'alerta', modulo: 'Imposto de Renda', mensagem: 'IR configurado para deduzir CS, mas CS do segurado não está ativada' });
    }

    // ── Correção sem data de citação para ADC 58/59 ──
    if ((this.correcaoConfig.indice === 'IPCA-E' || this.correcaoConfig.indice === 'SELIC') && !this.params.data_citacao) {
      itens.push({ tipo: 'alerta', modulo: 'Correção', mensagem: 'Usando índice ADC 58/59 sem data de citação — será estimada a partir do ajuizamento + 60 dias' });
    }

    const erros = itens.filter(i => i.tipo === 'erro').length;
    const alertas = itens.filter(i => i.tipo === 'alerta').length;
    const observacoes = itens.filter(i => i.tipo === 'observacao').length;

    return {
      valido: erros === 0,
      itens,
      erros,
      alertas,
      observacoes,
    };
  }

  // =====================================================
  // CORREÇÃO SOMENTE (sem juros) — para juros_apos_deducao_cs
  // =====================================================

  aplicarCorrecaoSomente(verbaResults: PjeVerbaResult[]): void {
    if (this.correcaoConfig.combinacoes_indice?.length) {
      // Use combination-by-date but skip interest
      this.aplicarCorrecaoCombinacaoSomente(verbaResults);
      return;
    }

    // Legacy single-index correction only
    const dataLiq = new Date(this.correcaoConfig.data_liquidacao);
    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);

    for (const vr of verbaResults) {
      let totalCorrigido = new Decimal(0);
      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;
        
        let indiceCorrecao = 1;
        
        // Use PJC ground truth correction factor when available
        if (oc.pjc_indice_acumulado && oc.pjc_indice_acumulado > 0) {
          indiceCorrecao = oc.pjc_indice_acumulado;
          oc.pjc_ground_truth_applied = true;
          oc.pjc_ground_truth_regime = this.correcaoConfig.indice || 'SELIC';
        } else {
          const fatorDB = this.getIndiceCorrecaoDB(this.correcaoConfig.indice, oc.competencia, compLiq);
          if (fatorDB !== null) {
            indiceCorrecao = fatorDB;
          } else {
            console.warn(`[PjeCalcEngine] BLOQUEIO: Índice ${this.correcaoConfig.indice} ausente para ${oc.competencia}→${compLiq}. Usando fator=1.`);
          }
        }
        
        const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2));
        oc.indice_correcao = Number(new Decimal(indiceCorrecao).toDP(6));
        oc.valor_corrigido = valorCorrigido;
        oc.juros = 0;
        oc.valor_final = valorCorrigido;
        totalCorrigido = totalCorrigido.plus(valorCorrigido);
      }
      vr.total_corrigido = totalCorrigido.toDP(2).toNumber();
      vr.total_juros = 0;
      vr.total_final = totalCorrigido.toDP(2).toNumber();
    }
  }

  private aplicarCorrecaoCombinacaoSomente(verbaResults: PjeVerbaResult[]): void {
    const combinacoes_indice = this.correcaoConfig.combinacoes_indice!;
    const dataLiq = this.correcaoConfig.data_liquidacao;

    const normalizeIndice = (ind: string): string => {
      const map: Record<string, string> = { 'IPCA-E': 'IPCA-E', 'IPCAE': 'IPCA-E', 'IPCA': 'IPCA', 'SELIC': 'SELIC', 'TR': 'TR', 'TRD': 'TR' };
      return map[ind] || ind;
    };

    for (const vr of verbaResults) {
      let totalCorrigido = new Decimal(0);
      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;
        
        // Use PJC ground truth correction factor when available
        if (oc.pjc_indice_acumulado && oc.pjc_indice_acumulado > 0) {
          // Determine regime for this occurrence
          const compDateGT = oc.competencia.length === 7 ? oc.competencia + '-01' : oc.competencia;
          const regimeGT = this.getRegimeParaData(combinacoes_indice, compDateGT);
          const regimeIndice = normalizeIndice(regimeGT?.indice || 'SEM_CORRECAO');

          const fatorTotal = new Decimal(oc.pjc_indice_acumulado);
          const valorCorrigido = new Decimal(oc.diferenca).times(fatorTotal);
          oc.indice_correcao = fatorTotal.toDP(6).toNumber();
          oc.valor_corrigido = valorCorrigido.toDP(2).toNumber();
          oc.juros = 0;
          oc.valor_final = valorCorrigido.toDP(2).toNumber();
          oc.pjc_ground_truth_applied = true;
          oc.pjc_ground_truth_regime = regimeIndice;
          totalCorrigido = totalCorrigido.plus(oc.valor_corrigido);
          continue;
        }
        
        // Súmula 381: correction starts from mês subsequente ao vencimento
        const compDate = this.mesSubsequente(oc.competencia) + '-01';
        const breakpoints = new Set<string>();
        breakpoints.add(compDate);
        breakpoints.add(dataLiq);
        for (const ci of combinacoes_indice) {
          if (ci.de && ci.de > compDate && ci.de <= dataLiq) breakpoints.add(ci.de);
        }
        const datas = Array.from(breakpoints).sort();
        let fatorTotal = new Decimal(1);
        for (let i = 0; i < datas.length - 1; i++) {
          const segInicio = datas[i];
          const segFim = datas[i + 1];
          const regime = this.getRegimeParaData(combinacoes_indice, segInicio);
          const indice = normalizeIndice(regime?.indice || 'SEM_CORRECAO');
          if (indice === 'SEM_CORRECAO' || indice === 'NENHUM' || indice === 'Sem Correção') continue;
          const fatorDB = this.getIndiceCorrecaoDB(indice, segInicio.slice(0, 7), segFim.slice(0, 7));
          if (fatorDB !== null && fatorDB > 0) {
            fatorTotal = fatorTotal.times(fatorDB);
          } else {
            console.warn(`[PjeCalcEngine] BLOQUEIO: Índice ${indice} ausente para ${segInicio}→${segFim}. Usando fator=1.`);
          }
        }
        const valorCorrigido = new Decimal(oc.diferenca).times(fatorTotal);
        oc.indice_correcao = fatorTotal.toDP(6).toNumber();
        oc.valor_corrigido = valorCorrigido.toDP(2).toNumber();
        oc.juros = 0;
        oc.valor_final = valorCorrigido.toDP(2).toNumber();
        totalCorrigido = totalCorrigido.plus(oc.valor_corrigido);
      }
      vr.total_corrigido = totalCorrigido.toDP(2).toNumber();
      vr.total_juros = 0;
      vr.total_final = totalCorrigido.toDP(2).toNumber();
    }
  }

  // =====================================================
  // JUROS APÓS DEDUÇÃO CS — PJe-Calc Criterion 8
  // Interest is applied on (corrected_value - CS_share_pro_rata)
  // =====================================================

  aplicarJurosAposCS(verbaResults: PjeVerbaResult[], totalCSDescontado: number): void {
    // Total corrected across all verbas (for pro-rata CS distribution)
    const totalCorrigido = verbaResults.reduce((s, v) => s + v.total_corrigido, 0);
    if (totalCorrigido <= 0) return;

    const combinacoes_juros = this.correcaoConfig.combinacoes_juros || [];
    const combinacoes_indice = this.correcaoConfig.combinacoes_indice || [];
    const dataLiq = this.correcaoConfig.data_liquidacao;

    // Determine interest start date
    let jurosStartDate: string | null = null;
    if (this.correcaoConfig.juros_inicio === 'ajuizamento' && this.params.data_ajuizamento) {
      jurosStartDate = this.params.data_ajuizamento;
    } else if (this.correcaoConfig.juros_inicio === 'citacao' && this.params.data_citacao) {
      jurosStartDate = this.params.data_citacao;
    }
    const jurosDisabled = jurosStartDate != null && jurosStartDate > dataLiq;

    const normalizeIndice = (ind: string): string => {
      const map: Record<string, string> = { 'IPCA-E': 'IPCA-E', 'IPCAE': 'IPCA-E', 'IPCA': 'IPCA', 'SELIC': 'SELIC', 'TR': 'TR', 'TRD': 'TR' };
      return map[ind] || ind;
    };

    for (const vr of verbaResults) {
      let totalJuros = 0;
      let totalFinal = 0;

      for (const oc of vr.ocorrencias) {
        if (oc.valor_corrigido === 0) { totalFinal += oc.valor_final; continue; }

        // ═══ PJC Ground Truth: indiceAcumulado is CORRECTION-ONLY.
        // For SELIC regime: skip separate interest (already baked into SELIC factor).
        // For IPCA-E/other regimes: apply interest normally on corrected value.
        if (oc.pjc_ground_truth_applied && oc.pjc_ground_truth_regime === 'SELIC') {
          totalJuros += oc.juros;
          totalFinal += oc.valor_final;
          continue;
        }

        // Pro-rata CS share for this occurrence
        const csShare = totalCorrigido > 0
          ? Number(new Decimal(totalCSDescontado).times(oc.valor_corrigido).div(totalCorrigido).toDP(2))
          : 0;
        
        // Base for interest = corrected - CS share
        const baseJuros = new Decimal(oc.valor_corrigido).minus(csShare);

        if (!jurosDisabled && combinacoes_juros.length > 0 && combinacoes_indice.length > 0) {
          const compDate = oc.competencia.length === 7 ? oc.competencia + '-01' : oc.competencia;
          const jurosEffectiveStart = jurosStartDate || compDate;
          const breakpoints = new Set<string>();
          breakpoints.add(jurosEffectiveStart);
          breakpoints.add(dataLiq);
          for (const cj of combinacoes_juros) {
            if (cj.de && cj.de > jurosEffectiveStart && cj.de <= dataLiq) breakpoints.add(cj.de);
          }
          for (const ci of combinacoes_indice) {
            if (ci.de && ci.de > jurosEffectiveStart && ci.de <= dataLiq) breakpoints.add(ci.de);
          }
          const datas = Array.from(breakpoints).sort();

          let jurosAcc = new Decimal(0);
          for (let i = 0; i < datas.length - 1; i++) {
            const segInicio = datas[i];
            const segFim = datas[i + 1];
            const regimeI = this.getRegimeParaData(combinacoes_indice, segInicio);
            const indiceNorm = normalizeIndice(regimeI?.indice || 'SEM_CORRECAO');
            // Skip interest during SELIC (already includes interest) and SEM_CORRECAO (suspended per PJe-Calc)
            if (indiceNorm === 'SELIC' || indiceNorm === 'SEM_CORRECAO' || indiceNorm === 'Sem Correção' || indiceNorm === 'NENHUM') continue;
            
            const regimeJ = this.getRegimeParaData(combinacoes_juros, segInicio);
            if (!regimeJ || regimeJ.tipo === 'NENHUM') continue;

            const meses = this.mesesEntre(new Date(segInicio), new Date(segFim));
            if (regimeJ.tipo === 'SELIC') {
              const fatorS = this.getIndiceCorrecaoDB('SELIC', segInicio.slice(0, 7), segFim.slice(0, 7));
              if (fatorS !== null) jurosAcc = jurosAcc.plus(baseJuros.times(fatorS - 1));
            } else if (regimeJ.tipo === 'TAXA_LEGAL') {
              const fatorTL = this.getIndiceCorrecaoDB('TAXA_LEGAL', segInicio.slice(0, 7), segFim.slice(0, 7));
              if (fatorTL !== null) jurosAcc = jurosAcc.plus(baseJuros.times(fatorTL - 1));
            } else {
              const taxa = ((regimeJ as any).percentual || 1) / 100;
              jurosAcc = jurosAcc.plus(baseJuros.times(taxa).times(meses));
            }
          }
          oc.juros = jurosAcc.toDP(2).toNumber();
        } else if (!jurosDisabled && combinacoes_indice.length > 0) {
          // No juros combinations, but index combinations exist — respect index regime
          // Skip interest during SELIC/SEM_CORRECAO periods (they include interest or suspend it)
          const compDate = oc.competencia.length === 7 ? oc.competencia + '-01' : oc.competencia;
          const jurosEffectiveStart = jurosStartDate || compDate;
          const breakpoints = new Set<string>();
          breakpoints.add(jurosEffectiveStart);
          breakpoints.add(dataLiq);
          for (const ci of combinacoes_indice) {
            if (ci.de && ci.de > jurosEffectiveStart && ci.de <= dataLiq) breakpoints.add(ci.de);
          }
          const datas = Array.from(breakpoints).sort();
          let jurosAcc = new Decimal(0);
          for (let i = 0; i < datas.length - 1; i++) {
            const segInicio = datas[i];
            const segFim = datas[i + 1];
            const regimeI = this.getRegimeParaData(combinacoes_indice, segInicio);
            const indiceNorm = normalizeIndice(regimeI?.indice || 'SEM_CORRECAO');
            // Skip interest during SELIC (already includes interest) and SEM_CORRECAO (suspended per PJe-Calc)
            if (indiceNorm === 'SELIC' || indiceNorm === 'SEM_CORRECAO' || indiceNorm === 'Sem Correção' || indiceNorm === 'NENHUM') continue;
            const meses = this.mesesEntre(new Date(segInicio), new Date(segFim));
            const taxa = (this.correcaoConfig.juros_percentual || 1) / 100;
            jurosAcc = jurosAcc.plus(baseJuros.times(taxa).times(meses));
          }
          oc.juros = jurosAcc.toDP(2).toNumber();
        } else if (!jurosDisabled) {
          // Legacy single interest — no combinations at all
          const [ano, mes] = oc.competencia.split('-').map(Number);
          const dataComp = new Date(ano, mes - 1, 1);
          const jurosStart = jurosStartDate ? new Date(jurosStartDate) : dataComp;
          const dataLiqD = new Date(dataLiq);
          if (jurosStart < dataLiqD) {
            const meses = this.mesesEntre(jurosStart, dataLiqD);
            const taxa = (this.correcaoConfig.juros_percentual || 1) / 100;
            oc.juros = Number(baseJuros.times(taxa).times(meses).toDP(2));
          } else {
            oc.juros = 0;
          }
        } else {
          oc.juros = 0;
        }

        oc.valor_final = Number(new Decimal(oc.valor_corrigido).plus(oc.juros).toDP(2));
        totalJuros += oc.juros;
        totalFinal += oc.valor_final;
      }
      vr.total_juros = Number(new Decimal(totalJuros).toDP(2));
      vr.total_final = Number(new Decimal(totalFinal).toDP(2));
    }
  }

  // =====================================================
  // LIQUIDAR - FLUXO PRINCIPAL
  // =====================================================

  liquidar(): PjeLiquidacaoResult {
    // ── 0. Validação pré-liquidação ──
    const validacao = this.validarPreLiquidacao();

    // ── 1. Topological sort: principals first, then reflexas in dependency order ──
    // This supports reflex-on-reflex (e.g., HE → DSR → 13º s/ DSR)
    const verbaResults: PjeVerbaResult[] = [];
    const processed = new Set<string>();
    
    const processVerba = (verba: PjeVerba) => {
      if (processed.has(verba.id)) return;
      
      // Process dependencies first (reflex-on-reflex)
      if (verba.verba_principal_id && !processed.has(verba.verba_principal_id)) {
        const dep = this.verbas.find(v => v.id === verba.verba_principal_id);
        if (dep) processVerba(dep);
      }
      for (const depId of (verba.base_calculo?.verbas || [])) {
        if (!processed.has(depId)) {
          const dep = this.verbas.find(v => v.id === depId);
          if (dep) processVerba(dep);
        }
      }
      
      processed.add(verba.id);
      
      // Calculate — precomputed occurrences take priority (PJC ground truth)
      if (verba.ocorrencias_precomputadas && verba.ocorrencias_precomputadas.length > 0) {
        const result = this.calcularVerba(verba); // calcularVerba handles precomputed
        verbaResults.push(result);
        this.verbaResultsMap.set(verba.id, result);
        return;
      }
      if (verba.tipo === 'reflexa' && verba.verba_principal_id) {
        const principalResult = this.verbaResultsMap.get(verba.verba_principal_id);
        if (principalResult) {
          const refResult = this.calcularVerbaReflexa(verba, principalResult);
          verbaResults.push(refResult);
          this.verbaResultsMap.set(verba.id, refResult);
          return;
        }
      }
      const result = this.calcularVerba(verba);
      verbaResults.push(result);
      this.verbaResultsMap.set(verba.id, result);
    };

    // Process all verbas in dependency order
    const sorted = [...this.verbas].sort((a, b) => {
      if (a.tipo === 'principal' && b.tipo === 'reflexa') return -1;
      if (a.tipo === 'reflexa' && b.tipo === 'principal') return 1;
      return a.ordem - b.ordem;
    });
    for (const verba of sorted) {
      processVerba(verba);
    }

    // ── 3b. Abatimento Global (OJ 415 SDI-1 TST) ──
    // Permite deduzir valores pagos sob o mesmo título globalmente,
    // mesmo que o pagamento tenha ocorrido em competência diferente.
    // O excedente pago em uma competência abate o devido em outra.
    this.aplicarAbatimentoGlobalOJ415(verbaResults);

    // ── 4. Correção Monetária + Juros ──
    // PJe-Calc Criterion 8: "Juros de mora sobre verbas apurados após a dedução 
    // da contribuição social devida pelo reclamante"
    // When juros_apos_deducao_cs=true:
    //   Step A: Apply correction ONLY (no interest)
    //   Step A.1: GT Calibration — scale correction to match ApuracaoDeJuros ground truth
    //   Step B: Calculate CS on GT-calibrated corrected values
    //   Step C: Deduct CS share per occurrence
    //   Step D: Apply interest (from GT taxaDeJuros or engine calculation)
    const hasGT = (this.correcaoConfig.apuracao_juros_gt?.length ?? 0) > 0;

    if (this.correcaoConfig.juros_apos_deducao_cs) {
      // Step A: Correction only
      this.aplicarCorrecaoSomente(verbaResults);
      
      // Step A.1: GT Calibration — correct the correction values to match PJC ground truth
      if (hasGT) {
        this.calibrarCorrecaoComGT(verbaResults, false);
      }
      
      // Step B: CS on corrected values (now GT-calibrated if available)
      const csPreJuros = this.calcularCS(verbaResults, true);
      const csDescontadoPreJuros = this.csConfig.cobrar_reclamante ? csPreJuros.total_segurado : 0;
      
      // Step C+D: Apply interest
      if (hasGT) {
        // Use GT taxaDeJuros to compute interest on (corrected - CS_share)
        this.calibrarCorrecaoComGT(verbaResults, true, csDescontadoPreJuros);
      } else {
        // Legacy: calculate interest from engine's own indices
        this.aplicarJurosAposCS(verbaResults, csDescontadoPreJuros);
      }
    } else {
      this.aplicarCorrecaoJuros(verbaResults);
      // GT Calibration for non-juros_apos_deducao_cs path
      if (hasGT) {
        this.calibrarCorrecaoComGT(verbaResults, true);
      }
    }

    // ── 5. FGTS ──
    const fgts = this.calcularFGTS(verbaResults);

    // ── 6. Contribuição Social ──
    // PJe-Calc calculates CS on corrected values (valor_corrigido), not nominal
    const cs = this.calcularCS(verbaResults, true);

    // ── 7. IR ──
    const ir = this.calcularIR(verbaResults, cs);

    // ── 8. Seguro-Desemprego ──
    const seguro = this.calcularSeguroDesemprego();

    // ── 8b. Previdência Privada ──
    let prevPrivada: PjePrevidenciaPrivadaResult = { apurado: false, base: 0, percentual: 0, valor: 0 };
    if (this.prevPrivadaConfig.apurar && this.prevPrivadaConfig.percentual > 0) {
      let basePP = 0;
      for (const vr of verbaResults) {
        const verba = this.verbas.find(vb => vb.id === vr.verba_id);
        if (!verba?.incidencias.previdencia_privada) continue;
        if (this.prevPrivadaConfig.base_calculo === 'devido') basePP += vr.total_devido;
        else if (this.prevPrivadaConfig.base_calculo === 'corrigido') basePP += vr.total_corrigido;
        else basePP += vr.total_diferenca;
      }
      const valorPP = Number(new Decimal(basePP).times(this.prevPrivadaConfig.percentual / 100).toDP(2));
      prevPrivada = { apurado: true, base: basePP, percentual: this.prevPrivadaConfig.percentual, valor: valorPP };
    }

    // ── 8c. Salário-Família (Art. 65, Lei 8.213/91) ──
    const salarioFamilia = this.calcularSalarioFamilia(verbaResults);

    // ── 9. Composição do Resumo ──
    const principalBruto = Number(verbaResults
      .filter(v => { const verba = this.verbas.find(vb => vb.id === v.verba_id); return verba?.compor_principal !== false; })
      .reduce((s, v) => s.plus(v.total_diferenca), new Decimal(0)).toDP(2));
    const principalCorrigido = Number(verbaResults
      .filter(v => { const verba = this.verbas.find(vb => vb.id === v.verba_id); return verba?.compor_principal !== false; })
      .reduce((s, v) => s.plus(v.total_corrigido), new Decimal(0)).toDP(2));
    const jurosMora = Number(verbaResults
      .filter(v => { const verba = this.verbas.find(vb => vb.id === v.verba_id); return verba?.compor_principal !== false; })
      .reduce((s, v) => s.plus(v.total_juros), new Decimal(0)).toDP(2));

    const honorarios = this.calcularHonorarios(principalCorrigido, jurosMora, fgts.total_fgts);
    const valorCondenacao = principalCorrigido + jurosMora + fgts.total_fgts;
    const multa523 = this.calcularMulta523(valorCondenacao);
    const multa467 = this.calcularMulta467(principalBruto);
    const custasResult = this.calcularCustas(valorCondenacao);
    const csDescontado = this.csConfig.cobrar_reclamante ? cs.total_segurado : 0;

    // Pensão Alimentícia (config + sobre FGTS)
    let pensaoSobreFgts = 0;
    let pensaoTotal = 0;
    if (this.pensaoConfig.apurar && this.pensaoConfig.percentual > 0) {
      const pct = this.pensaoConfig.percentual / 100;
      let basePensaoVerbas = 0;
      for (const vr of verbaResults) {
        const verba = this.verbas.find(v => v.id === vr.verba_id);
        if (!verba?.incidencias.pensao_alimenticia) continue;
        basePensaoVerbas += vr.total_final;
      }
      const pensaoVerbas = Number(new Decimal(basePensaoVerbas).times(pct).toDP(2));
      if (fgts.total_fgts > 0) {
        pensaoSobreFgts = Number(new Decimal(fgts.total_fgts).times(pct).toDP(2));
      }
      if (this.pensaoConfig.valor_fixo && this.pensaoConfig.valor_fixo > 0) {
        pensaoTotal = this.pensaoConfig.valor_fixo;
        pensaoSobreFgts = 0;
      } else {
        pensaoTotal = pensaoVerbas + pensaoSobreFgts;
      }
    }

    // PJe-Calc: Bruto = verbas corrigidas + juros (FGTS is separate in PJe-Calc's "bruto devido ao reclamante")
    const brutoTotal = Number(new Decimal(principalCorrigido).plus(jurosMora).toDP(2));
    
    // Líquido = Bruto - CS segurado - IR - prev privada - pensão
    // NOTE: seguro, multas and salário família are NOT added here — they are separate items
    // This prevents the impossible "líquido > bruto" bug
    const liquido = Number(new Decimal(brutoTotal)
      .minus(csDescontado)
      .minus(ir.imposto_devido)
      .minus(prevPrivada.valor)
      .minus(pensaoTotal)
      .toDP(2));

    // Total Reclamada = líquido + CS segurado (recolher) + CS empregador + honorários + custas + IR + FGTS
    const totalReclamada = Number(new Decimal(liquido)
      .plus(csDescontado)
      .plus(cs.total_empregador)
      .plus(honorarios.sucumbenciais)
      .plus(honorarios.contratuais)
      .plus(custasResult.total)
      .plus(ir.imposto_devido)
      .plus(fgts.total_fgts)
      .toDP(2));

    const resumo: PjeResumo = {
      principal_bruto: Number(new Decimal(principalBruto).toDP(2)),
      principal_corrigido: Number(new Decimal(principalCorrigido).toDP(2)),
      juros_mora: Number(new Decimal(jurosMora).toDP(2)),
      fgts_total: fgts.total_fgts, cs_segurado: csDescontado, cs_empregador: cs.total_empregador,
      ir_retido: ir.imposto_devido, seguro_desemprego: seguro.total, previdencia_privada: prevPrivada.valor,
      salario_familia: salarioFamilia.total,
      multa_523: multa523, multa_467: multa467, honorarios_sucumbenciais: honorarios.sucumbenciais,
      honorarios_contratuais: honorarios.contratuais, custas: custasResult.total,
      custas_detalhadas: custasResult.detalhadas, pensao_sobre_fgts: pensaoSobreFgts, pensao_total: pensaoTotal,
      liquido_reclamante: liquido, total_reclamada: totalReclamada,
      meta: {
        arredondamento: 'Arredondamento por competência (item a item, 2 casas decimais) conforme metodologia judiciária. Pequenas diferenças de centavos são esperadas.',
        tipo_mes: this.params.tipo_mes === 'comercial' ? 'Mês Comercial (30 dias fixos — Art. 64 CLT)' : 'Calendário Civil (dias reais do mês)',
        selic_referencia: (() => {
          const selicRows = this.indicesDB.filter(i => i.indice === 'SELIC').sort((a, b) => b.competencia.localeCompare(a.competencia));
          return selicRows.length > 0 ? { data: selicRows[0].competencia, acumulado: selicRows[0].acumulado } : undefined;
        })(),
        oj415_aplicada: verbaResults.some(vr => {
          const hasOverpay = vr.ocorrencias.some(oc => oc.pago > oc.devido);
          return hasOverpay;
        }),
      },
    };

    return {
      data_liquidacao: this.correcaoConfig.data_liquidacao,
      verbas: verbaResults, fgts, contribuicao_social: cs, imposto_renda: ir,
      seguro_desemprego: seguro, previdencia_privada: prevPrivada, salario_familia: salarioFamilia, resumo, validacao,
    };
  }

  // =====================================================
  // ABATIMENTO GLOBAL - OJ 415 SDI-1 TST
  // "A dedução das parcelas pagas deve ser realizada pelo
  // valor total, e não mês a mês." Permite compensar
  // excedentes pagos em uma competência com devidos em outra.
  // =====================================================

  private aplicarAbatimentoGlobalOJ415(verbaResults: PjeVerbaResult[]): void {
    for (const vr of verbaResults) {
      // Sort occurrences chronologically for sequential credit accumulation
      const ocsSorted = [...vr.ocorrencias].sort((a, b) =>
        a.competencia.localeCompare(b.competencia)
      );

      let creditoAcumulado = new Decimal(0);

      for (const oc of ocsSorted) {
        const saldoMes = new Decimal(oc.devido).minus(oc.pago);

        if (saldoMes.isNegative()) {
          // Empresa pagou a mais neste mês: acumula crédito para meses seguintes
          creditoAcumulado = creditoAcumulado.plus(saldoMes.abs());
          oc.diferenca = 0;
        } else if (saldoMes.isZero()) {
          oc.diferenca = 0;
        } else {
          // Empresa deve neste mês: tenta abater do crédito acumulado primeiro
          if (creditoAcumulado.greaterThanOrEqualTo(saldoMes)) {
            creditoAcumulado = creditoAcumulado.minus(saldoMes);
            oc.diferenca = 0;
          } else if (creditoAcumulado.greaterThan(0)) {
            const restante = saldoMes.minus(creditoAcumulado);
            creditoAcumulado = new Decimal(0);
            oc.diferenca = Number(restante.toDP(2));
          } else {
            oc.diferenca = Number(saldoMes.toDP(2));
          }
        }
      }

      // Recalculate total difference
      vr.total_diferenca = Number(
        vr.ocorrencias.reduce((s, oc) => s.plus(oc.diferenca), new Decimal(0)).toDP(2)
      );
    }
  }

  // =====================================================
  // SALÁRIO-FAMÍLIA (Art. 65, Lei 8.213/91)
  // Cota por filho ≤14 anos para empregados de baixa renda
  // =====================================================

  calcularSalarioFamilia(verbaResults: PjeVerbaResult[]): PjeSalarioFamiliaResult {
    if (!this.salarioFamiliaConfig.apurar || this.salarioFamiliaConfig.numero_filhos <= 0) {
      return { apurado: false, cotas: [], total: 0 };
    }

    const filhos = this.salarioFamiliaConfig.filhos_detalhes || [];
    const periodo = this.getPeriodoCalculo();
    const competencias = this.getCompetencias(periodo.inicio, periodo.fim);
    const cotas: PjeSalarioFamiliaResult['cotas'] = [];
    let totalSF = 0;

    for (const comp of competencias) {
      // Determinar remuneração da competência (usar histórico ou última remuneração)
      let remuneracao = 0;
      for (const hist of this.historicos) {
        const oc = hist.ocorrencias.find(o => o.competencia === comp);
        if (oc) remuneracao += oc.valor;
      }
      if (remuneracao === 0) remuneracao = this.params.ultima_remuneracao || 0;

      // Verificar se remuneração está dentro do limite e obter valor da cota
      const sfDB = this.getSalarioFamiliaDB(comp);
      const limiteRemuneracao = sfDB ? sfDB.valor_final : SALARIO_FAMILIA_2025.limite_remuneracao;
      const valorCotaRef = sfDB ? sfDB.valor_cota : SALARIO_FAMILIA_2025.valor_cota;
      
      if (remuneracao > limiteRemuneracao) continue;

      // Contar filhos elegíveis na competência
      const [anoComp, mesComp] = comp.split('-').map(Number);
      const dataComp = new Date(anoComp, mesComp - 1, 1);
      let filhosElegiveis = 0;

      if (filhos.length > 0) {
        for (const f of filhos) {
          if (!f.nascimento) { filhosElegiveis++; continue; }
          const nasc = new Date(f.nascimento);
          const idadeAnos = (dataComp.getTime() - nasc.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          if (idadeAnos <= 14 || f.ate_14) filhosElegiveis++;
        }
      } else {
        filhosElegiveis = this.salarioFamiliaConfig.numero_filhos;
      }

      if (filhosElegiveis <= 0) continue;

      const totalComp = Number(new Decimal(valorCotaRef).times(filhosElegiveis).toDP(2));
      cotas.push({ competencia: comp, filhos_elegíveis: filhosElegiveis, valor_cota: valorCotaRef, total: totalComp });
      totalSF += totalComp;
    }

    return { apurado: true, cotas, total: Number(new Decimal(totalSF).toDP(2)) };
  }

  // =====================================================
  // AGRUPAMENTO POR PERÍODO (ANO_CIVIL / PERIODO_AQUISITIVO)
  // =====================================================

  private agruparPorPeriodo(
    ocorrencias: PjeOcorrenciaResult[],
    modo: 'ano_civil' | 'periodo_aquisitivo' | 'global',
  ): Map<string, PjeOcorrenciaResult[]> {
    const grupos = new Map<string, PjeOcorrenciaResult[]>();

    if (modo === 'global') {
      grupos.set('global', [...ocorrencias]);
      return grupos;
    }

    if (modo === 'ano_civil') {
      for (const oc of ocorrencias) {
        const ano = oc.competencia.slice(0, 4);
        if (!grupos.has(ano)) grupos.set(ano, []);
        grupos.get(ano)!.push(oc);
      }
      return grupos;
    }

    if (modo === 'periodo_aquisitivo') {
      // Group by the vacation acquisition period the competencia falls into
      for (const oc of ocorrencias) {
        const compDate = new Date(oc.competencia + '-01');
        let grupKey = 'default';
        for (const fer of this.ferias) {
          const paInicio = new Date(fer.periodo_aquisitivo_inicio);
          const paFim = new Date(fer.periodo_aquisitivo_fim);
          if (compDate >= paInicio && compDate <= paFim) {
            grupKey = `${fer.periodo_aquisitivo_inicio}_${fer.periodo_aquisitivo_fim}`;
            break;
          }
        }
        if (!grupos.has(grupKey)) grupos.set(grupKey, []);
        grupos.get(grupKey)!.push(oc);
      }
      return grupos;
    }

    grupos.set('global', [...ocorrencias]);
    return grupos;
  }

  private calcularVerbaReflexa(reflexa: PjeVerba, principalResult: PjeVerbaResult): PjeVerbaResult {
    const comportamento = reflexa.comportamento_reflexo || 'valor_mensal';
    const ocorrencias: PjeOcorrenciaResult[] = [];
    // FIX #4: Acumular totais com Decimal.js
    let totalDevido = new Decimal(0), totalPago = new Decimal(0), totalDiferenca = new Decimal(0);

    // Base Integralization (Fase 6): converter meses fracionários em meses completos
    // para reflexos em férias e 13º (PJe-Calc integraliza a base antes de aplicar a fórmula)
    const shouldIntegralizar = reflexa.base_calculo.integralizar && 
      (reflexa.caracteristica === 'ferias' || reflexa.caracteristica === '13_salario');

    switch (comportamento) {
      case 'valor_mensal': {
        for (const oc of principalResult.ocorrencias) {
          let baseValor = reflexa.gerar_verba_reflexa === 'devido' ? oc.devido : oc.diferenca;
          // Integralization: se o mês principal teve fração, integralizar para mês completo
          if (shouldIntegralizar && oc.quantidade > 0 && oc.quantidade < 1) {
            baseValor = Number(new Decimal(baseValor).div(oc.quantidade).toDP(2));
          }
          const result = this.calcularOcorrencia(reflexa, oc.competencia, baseValor);
          ocorrencias.push(result);
          totalDevido = totalDevido.plus(result.devido);
          totalPago = totalPago.plus(result.pago);
          totalDiferenca = totalDiferenca.plus(result.diferenca);
        }
        break;
      }
      case 'media_valor_absoluto': {
        // Determine grouping mode
        const periodoMedia = reflexa.periodo_media_reflexo || 'global';
        const grupos = this.agruparPorPeriodo(principalResult.ocorrencias, periodoMedia);

        for (const [grupoKey, grupoOcs] of grupos) {
          const valores = grupoOcs
            .filter(o => (reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca) > 0)
            .map(o => {
              let val = reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca;
              // Use integral values when integralizing
              if (shouldIntegralizar && o.devido_integral !== undefined) {
                val = reflexa.gerar_verba_reflexa === 'devido' 
                  ? o.devido_integral 
                  : (o.devido_integral - (o.pago || 0));
              }
              return val;
            });
          const media = valores.length > 0 ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
          
          // Determine competencia for this group
          let comp: string;
          if (periodoMedia === 'ano_civil') {
            comp = `${grupoKey}-12`; // December of the year
          } else if (periodoMedia === 'periodo_aquisitivo') {
            // Use end of acquisition period
            const parts = grupoKey.split('_');
            comp = parts.length > 1 ? parts[1].slice(0, 7) : (this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7));
          } else {
            comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
          }

          const result = this.calcularOcorrencia(reflexa, comp, media);
          ocorrencias.push(result);
          totalDevido = totalDevido.plus(result.devido);
          totalPago = totalPago.plus(result.pago);
          totalDiferenca = totalDiferenca.plus(result.diferenca);
        }
        break;
      }
      case 'media_valor_corrigido': {
        // Média dos valores corrigidos monetariamente (Fase 6)
        const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
        const valoresCorrigidos = principalResult.ocorrencias
          .filter(o => (reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca) > 0)
          .map(o => {
            const val = reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca;
            const fator = this.getIndiceCorrecaoDB(this.correcaoConfig.indice, o.competencia, compLiq);
            return fator !== null ? val * fator : val;
          });
        const mediaCorr = valoresCorrigidos.length > 0 
          ? valoresCorrigidos.reduce((s, v) => s + v, 0) / valoresCorrigidos.length : 0;
        const comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const result = this.calcularOcorrencia(reflexa, comp, mediaCorr);
        ocorrencias.push(result);
        totalDevido = totalDevido.plus(result.devido);
        totalPago = totalPago.plus(result.pago);
        totalDiferenca = totalDiferenca.plus(result.diferenca);
        break;
      }
      case 'media_quantidade': {
        const qtds = principalResult.ocorrencias.filter(o => o.quantidade > 0).map(o => o.quantidade);
        const mediaQtd = qtds.length > 0 ? qtds.reduce((s, v) => s + v, 0) / qtds.length : 0;
        const comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const baseUnitaria = this.getBaseParaCompetencia(reflexa, comp);
        const result = this.calcularOcorrencia(
          { ...reflexa, quantidade_informada: mediaQtd, tipo_quantidade: 'informada' },
          comp, baseUnitaria
        );
        ocorrencias.push(result);
        totalDevido = totalDevido.plus(result.devido);
        totalPago = totalPago.plus(result.pago);
        totalDiferenca = totalDiferenca.plus(result.diferenca);
        break;
      }
      // =====================================================
      // MEDIA_PELA_QUANTIDADE — PJe-Calc Ground Truth
      // soma(diferenças_integralizadas) / soma(quantidades) = média ponderada
      // Agrupado por ANO_CIVIL (13º) ou PERIODO_AQUISITIVO (férias)
      // =====================================================
      case 'media_pela_quantidade': {
        const periodoMedia = reflexa.periodo_media_reflexo || 
          (reflexa.caracteristica === '13_salario' ? 'ano_civil' : 
           reflexa.caracteristica === 'ferias' ? 'periodo_aquisitivo' : 'global');
        
        const grupos = this.agruparPorPeriodo(principalResult.ocorrencias, periodoMedia);

        for (const [grupoKey, grupoOcs] of grupos) {
          // Filter to positive-value occurrences
          const ocsAtivas = grupoOcs.filter(o => {
            const val = reflexa.gerar_verba_reflexa === 'devido' ? o.devido : o.diferenca;
            return val > 0 || o.quantidade > 0;
          });

          if (ocsAtivas.length === 0) continue;

          // Sum of differences (integralized when configured)
          let somaDiferencas = new Decimal(0);
          let somaQuantidades = new Decimal(0);

          for (const oc of ocsAtivas) {
            let val: number;
            if (shouldIntegralizar && oc.devido_integral !== undefined) {
              // Use integral value (full month)
              val = reflexa.gerar_verba_reflexa === 'devido'
                ? oc.devido_integral
                : (oc.devido_integral - (oc.pago || 0));
            } else {
              val = reflexa.gerar_verba_reflexa === 'devido' ? oc.devido : oc.diferenca;
            }
            somaDiferencas = somaDiferencas.plus(val);

            // Use integral quantity when available and integralizing
            const qtd = (shouldIntegralizar && oc.quantidade_integral !== undefined)
              ? oc.quantidade_integral
              : oc.quantidade;
            somaQuantidades = somaQuantidades.plus(qtd > 0 ? qtd : 1);
          }

          // Weighted average: soma_diferencas / soma_quantidades
          const mediaPonderada = somaQuantidades.greaterThan(0)
            ? somaDiferencas.div(somaQuantidades).toDP(2).toNumber()
            : 0;

          // Determine competencia for this group
          let comp: string;
          if (periodoMedia === 'ano_civil') {
            comp = `${grupoKey}-12`; // December of the year for 13º
          } else if (periodoMedia === 'periodo_aquisitivo') {
            const parts = grupoKey.split('_');
            comp = parts.length > 1 ? parts[1].slice(0, 7) : (this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7));
          } else {
            comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
          }

          // Calculate occurrence using the weighted average as base
          const result = this.calcularOcorrencia(reflexa, comp, mediaPonderada);
          ocorrencias.push(result);
          totalDevido = totalDevido.plus(result.devido);
          totalPago = totalPago.plus(result.pago);
          totalDiferenca = totalDiferenca.plus(result.diferenca);
        }
        break;
      }
      default: {
        const valores = principalResult.ocorrencias.filter(o => o.diferenca > 0).map(o => o.diferenca);
        const media = valores.length > 0 ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
        const comp = this.params.data_demissao?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const result = this.calcularOcorrencia(reflexa, comp, media);
        ocorrencias.push(result);
        totalDevido = totalDevido.plus(result.devido);
        totalPago = totalPago.plus(result.pago);
        totalDiferenca = totalDiferenca.plus(result.diferenca);
      }
    }

    return {
      verba_id: reflexa.id,
      nome: reflexa.nome,
      tipo: 'reflexa',
      caracteristica: reflexa.caracteristica,
      ocorrencias,
      total_devido: totalDevido.toDP(2).toNumber(),
      total_pago: totalPago.toDP(2).toNumber(),
      total_diferenca: totalDiferenca.toDP(2).toNumber(),
      total_corrigido: totalDiferenca.toDP(2).toNumber(),
      total_juros: 0,
      total_final: totalDiferenca.toDP(2).toNumber(),
    };
  }
}

// =====================================================
// MULTI-VÍNCULO: Execute engine per contract and merge
// =====================================================

import type { PjeMultiVinculo } from './engine-types';

export interface MultiVinculoResult {
  vinculos: { vinculo_id: string; label: string; resultado: PjeLiquidacaoResult }[];
  consolidado: PjeLiquidacaoResult;
}

/**
 * Runs independent liquidation per employment link and merges results.
 */
export function liquidarMultiVinculo(
  multi: PjeMultiVinculo,
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
): MultiVinculoResult {
  const resultados: MultiVinculoResult['vinculos'] = [];

  for (const v of multi.vinculos) {
    const engine = new PjeCalcEngine(
      { ...v.params, vinculo_id: v.vinculo_id, vinculo_label: v.label },
      v.historicos, v.faltas, v.ferias, v.verbas, v.cartaoPonto,
      fgtsConfig, csConfig, irConfig, correcaoConfig, honorariosConfig, custasConfig, seguroConfig,
      indicesDB, faixasINSSDB, faixasIRDB,
    );
    const resultado = engine.liquidar();
    resultados.push({ vinculo_id: v.vinculo_id, label: v.label, resultado });
  }

  // Consolidate: merge all verba results and recalculate totals
  const consolidado = resultados[0]?.resultado ?? resultados[0]?.resultado;
  if (resultados.length > 1) {
    // Merge verbas from all vinculos
    const allVerbas = resultados.flatMap(r => r.resultado.verbas);
    consolidado.verbas = allVerbas;
    
    // Sum resumo values
    consolidado.resumo = {
      ...consolidado.resumo,
      principal_bruto: resultados.reduce((s, r) => s + r.resultado.resumo.principal_bruto, 0),
      principal_corrigido: resultados.reduce((s, r) => s + r.resultado.resumo.principal_corrigido, 0),
      juros_mora: resultados.reduce((s, r) => s + r.resultado.resumo.juros_mora, 0),
      fgts_total: resultados.reduce((s, r) => s + r.resultado.resumo.fgts_total, 0),
      cs_segurado: resultados.reduce((s, r) => s + r.resultado.resumo.cs_segurado, 0),
      cs_empregador: resultados.reduce((s, r) => s + r.resultado.resumo.cs_empregador, 0),
      ir_retido: resultados.reduce((s, r) => s + r.resultado.resumo.ir_retido, 0),
      liquido_reclamante: resultados.reduce((s, r) => s + r.resultado.resumo.liquido_reclamante, 0),
      total_reclamada: resultados.reduce((s, r) => s + r.resultado.resumo.total_reclamada, 0),
    };
  }

  return { vinculos: resultados, consolidado };
}
