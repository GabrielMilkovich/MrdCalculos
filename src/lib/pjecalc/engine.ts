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
  PjeExcecaoSabado,
  PjeFGTSConfig, PjeCSConfig, PjeIRConfig, PjeCorrecaoConfig,
  PjeHonorariosConfig, PjeCustasConfig, PjeSeguroConfig,
  PjePrevidenciaPrivadaConfig, PjePensaoConfig, PjeSalarioFamiliaConfig,
  PjeIndiceRow, PjeINSSFaixaRow, PjeIRFaixaRow,
  PjeOcorrenciaResult, PjeVerbaResult, PjeFGTSResult, PjeCSResult,
  PjeIRResult, PjeSeguroResult, PjeCustaResult, PjeResumo,
  PjeLiquidacaoResult, PjeValidationItem, PjeValidationResult,
  PjePrevidenciaPrivadaResult, PjeSalarioFamiliaResult,
  PjeCombinacaoIndice, PjeCombinacaoJuros,
  PjeSeguroDesempregoDB, PjeSalarioFamiliaDB, PjeSalarioMinimoRow,
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
  private excecoesSabado: PjeExcecaoSabado[];
  private feriadosDB: PjeFeriadoDB[];
  private prevPrivadaConfig: PjePrevidenciaPrivadaConfig;
  private pensaoConfig: PjePensaoConfig;
  private salarioFamiliaConfig: PjeSalarioFamiliaConfig;
  private seguroDesempregoDB: PjeSeguroDesempregoDB[];
  private salarioFamiliaDB: PjeSalarioFamiliaDB[];
  private salarioMinimoDB: PjeSalarioMinimoRow[];
  // Map of verba results by verba_id for reflexa resolution
  private verbaResultsMap: Map<string, PjeVerbaResult> = new Map();
  // Structured warnings collected during calculation
  private calculationWarnings: { code: string; module: string; message: string; competencia?: string }[] = [];
  // Set of already-emitted warning keys to prevent duplicates
  private emittedWarningKeys = new Set<string>();

  /**
   * Track a warning during calculation (deduplicated by code+module+competencia).
   * These warnings are included in the liquidação result.
   */
  private trackWarning(code: string, module: string, message: string, competencia?: string): void {
    const key = `${code}:${module}:${competencia || ''}`;
    if (this.emittedWarningKeys.has(key)) return;
    this.emittedWarningKeys.add(key);
    this.calculationWarnings.push({ code, module, message, competencia });
    console.warn(`[PjeCalcEngine] ${code}: ${message}`);
  }

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
    this.excecoesSabado = excecoesSabado;
    this.feriadosDB = feriadosDB;
    this.prevPrivadaConfig = prevPrivadaConfig;
    this.pensaoConfig = pensaoConfig;
    this.salarioFamiliaConfig = salarioFamiliaConfig;
    this.seguroDesempregoDB = seguroDesempregoDB;
    this.salarioFamiliaDB = salarioFamiliaDB;
    this.salarioMinimoDB = salarioMinimoDB;
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
  
  // Retorna data de demissão projetada (com aviso prévio indenizado, se aplicável)
  private getDataDemissaoEfetiva(): Date {
    const demDate = this.params.data_demissao
      ? new Date(this.params.data_demissao)
      : new Date();
    if (this.params.projetar_aviso_indenizado && this.params.data_demissao) {
      const diasAviso = this.calcularPrazoAviso();
      const projetada = new Date(demDate);
      projetada.setDate(projetada.getDate() + diasAviso);
      return projetada;
    }
    return demDate;
  }

  calcularAvos(competencia: string, caracteristica: string): number {
    const admDate = new Date(this.params.data_admissao);
    const demDate = this.getDataDemissaoEfetiva();
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
  // SÁBADO DIA ÚTIL — with per-date exceptions
  // =====================================================

  /**
   * Check if Saturday is a working day for a specific date.
   * Respects excecoesSabado ranges first, then falls back to global param.
   */
  private isSabadoDiaUtilParaData(date: Date): boolean {
    if (this.excecoesSabado.length > 0) {
      const dateStr = date.toISOString().slice(0, 10);
      for (const exc of this.excecoesSabado) {
        if (dateStr >= exc.data_inicial && dateStr <= exc.data_final) {
          return exc.sabado_dia_util;
        }
      }
    }
    return this.params.sabado_dia_util;
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
      
      // Saturday exception: check if sabado_dia_util is overridden for this specific date
      const sabadoDiaUtil = this.isSabadoDiaUtilParaData(date);
      
      if (isSunday || isFeriado) {
        repousos++;
      } else if (isSaturday && !sabadoDiaUtil) {
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

    // Art. 73 §1° CLT: hora noturna fictícia — cada hora real = 52,5 min
    // Reduz o divisor por 7/8 (= 52.5/60), tornando a hora noturna mais valiosa (fator 8/7)
    if (verba.hora_noturna_ficticia) {
      div = div.times(new Decimal(7).div(8)).toDP(4);
    }

    // Quantidade resolution (with calendario + apurada support)
    let qtd: Decimal;
    if (verba.tipo_quantidade === 'cartao_ponto') {
      qtd = new Decimal(this.getCartaoPontoQuantidade(competencia, verba.quantidade_cartao_colunas) || 0);
    } else if (verba.tipo_quantidade === 'avos') {
      qtd = new Decimal(this.calcularAvos(competencia, verba.caracteristica));
    } else if (verba.tipo_quantidade === 'repousos') {
      qtd = new Decimal(this.calcularQuantidadeCalendario(competencia, 'repousos'));
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