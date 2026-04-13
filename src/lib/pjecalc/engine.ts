// =====================================================
// PJe-CALC ENGINE - MOTOR DE CÁLCULO OFICIAL
// Fórmula: Devido = (Base × Multiplicador / Divisor) × Quantidade × Dobra
// Diferença = Devido - Pago
// =====================================================

import Decimal from 'decimal.js';
import { getReformaRules, REFORMA_DATE } from './reforma-trabalhista';
import { getFPASByCodigo } from './terceiros-contributions';
import { IPCA_E_ACUMULADO, SELIC_ACUMULADO, TR_ACUMULADO } from './indices-fallback';

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
  HISTORICO_FAIXAS_INSS, HISTORICO_FAIXAS_IR, HISTORICO_SALARIO_MINIMO,
  getFeriadosNacionaisDoAno,
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
  private _feriadosFallbackWarned = false;
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
      || this.correcaoConfig?.data_liquidacao;
    if (!fim) {
      throw new Error('E_DATA_OBRIGATORIA: data_demissao, data_final ou data_liquidacao é obrigatória para determinar o período de cálculo');
    }

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
    if (!this.params.data_demissao) {
      // Fallback to data_final or data_liquidacao — NEVER use current date
      const fallback = this.params.data_final || this.correcaoConfig?.data_liquidacao;
      if (!fallback) {
        throw new Error('E_DATA_OBRIGATORIA: data_demissao é obrigatória para cálculo de avos (13º/férias)');
      }
      this.trackWarning('W_DEMISSAO_FALLBACK', 'avos', `data_demissao ausente — usando ${fallback} como fallback`);
      return new Date(fallback);
    }
    const demDate = new Date(this.params.data_demissao);
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
        const efetInicio = admDate > periodoInicio ? admDate : periodoInicio;
        const efetFim = demDate < periodoFim ? demDate : periodoFim;
        if (efetInicio > efetFim) return 0;
        let avos = 0;
        // Iterar mês a mês com cursor (suporta períodos que cruzam anos civis)
        const cursor = new Date(efetInicio.getFullYear(), efetInicio.getMonth(), 1);
        const fimRef = new Date(efetFim.getFullYear(), efetFim.getMonth(), 1);
        while (cursor <= fimRef) {
          const isInicio = cursor.getFullYear() === efetInicio.getFullYear() && cursor.getMonth() === efetInicio.getMonth();
          const isFim = cursor.getFullYear() === efetFim.getFullYear() && cursor.getMonth() === efetFim.getMonth();
          const diaInicio = isInicio ? efetInicio.getDate() : 1;
          const diaFim = isFim ? efetFim.getDate() : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
          if (diaFim - diaInicio + 1 >= 15) avos++;
          cursor.setMonth(cursor.getMonth() + 1);
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
    let feriadosNoMes = this.feriadosDB.filter(f => {
      const fd = new Date(f.data);
      if (fd.getFullYear() !== ano || fd.getMonth() + 1 !== mes) return false;
      if (f.tipo === 'nacional') return true;
      if (f.tipo === 'estadual' && this.params.considerar_feriado_estadual && f.uf === this.params.estado) return true;
      if (f.tipo === 'municipal' && this.params.considerar_feriado_municipal && f.municipio === this.params.municipio) return true;
      return false;
    });

    // Fallback: feriados nacionais hardcoded quando banco vazio
    if (this.feriadosDB.length === 0) {
      if (!this._feriadosFallbackWarned) {
        this.trackWarning('W_FERIADOS_FALLBACK', 'calendario',
          'Banco de feriados vazio — usando apenas feriados nacionais fixos (sem feriados estaduais/municipais).');
        this._feriadosFallbackWarned = true;
      }
      const nacionais = getFeriadosNacionaisDoAno(ano);
      feriadosNoMes = nacionais
        .filter(d => { const [, m] = d.split('-').map(Number); return m === mes; })
        .map(d => ({ data: d, tipo: 'nacional' as const, uf: '', municipio: '', nome: '' }));
    }

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
    const demStr = this.params.data_demissao || this.params.data_final || this.correcaoConfig?.data_liquidacao;
    if (!demStr) {
      throw new Error('E_DATA_OBRIGATORIA: data_demissao é obrigatória para calcular prazo do aviso prévio');
    }
    const dem = new Date(demStr);
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
    } else if (verba.tipo_divisor === 'carga_horaria' || verba.tipo_divisor === 'jornada') {
      // 'jornada' é alias de 'carga_horaria' — ambos usam a carga horária vigente na competência
      div = new Decimal(this.getCargaHorariaParaCompetencia(competencia));
    } else if (verba.tipo_divisor === 'dias_uteis') {
      div = new Decimal(this.getDivisorComFeriados(competencia));
    } else if (verba.tipo_divisor === 'calendario') {
      div = new Decimal(this.calcularQuantidadeCalendario(competencia, 'dias_uteis') || 22);
    } else if (verba.tipo_divisor === 'mensal') {
      // Mês comercial CLT = 30
      div = new Decimal(30);
    } else if (verba.tipo_divisor === 'diario') {
      // Dias reais do mês (calendário civil)
      const [anoDiv, mesDiv] = competencia.split('-').map(Number);
      div = new Decimal(new Date(anoDiv, mesDiv, 0).getDate());
    } else if (verba.tipo_divisor === 'hora') {
      // Valor já está expresso em horas — divisor unitário
      div = new Decimal(1);
    } else if (verba.tipo_divisor === 'minuto') {
      // Converte minutos em horas: 1/60
      div = new Decimal(1).div(60).toDP(4);
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
    if (verba.tipo_quantidade === 'cartao_ponto' || verba.tipo_quantidade === 'cartao_horas') {
      // 'cartao_horas' é alias de 'cartao_ponto' — soma as colunas de horas do cartão
      qtd = new Decimal(this.getCartaoPontoQuantidade(competencia, verba.quantidade_cartao_colunas) || 0);
    } else if (verba.tipo_quantidade === 'cartao_dias') {
      // Dias trabalhados da competência segundo o cartão de ponto
      const regCartao = this.cartaoPonto.find(r => r.competencia === competencia);
      qtd = new Decimal(regCartao?.dias_trabalhados ?? (verba.quantidade_informada || 0));
    } else if (verba.tipo_quantidade === 'avos') {
      qtd = new Decimal(this.calcularAvos(competencia, verba.caracteristica));
    } else if (verba.tipo_quantidade === 'repousos') {
      qtd = new Decimal(this.calcularQuantidadeCalendario(competencia, 'repousos'));
    } else if (verba.tipo_quantidade === 'calendario') {
      qtd = new Decimal(this.calcularQuantidadeCalendario(competencia, 'dias_uteis'));
    } else if (verba.tipo_quantidade === 'apurada' || verba.tipo_quantidade === 'media_apurada') {
      // Média apurada: usa a média da quantidade de todas as competências do cartão de ponto
      // 'media_apurada' é alias de 'apurada'
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
      // Súmula 340 TST: comissionista puro — HE = apenas adicional
      // Ex: mult=1.5 → efetivo=0.5 (apenas o adicional de 50%, não a hora cheia)
      const multEfetivo = verba.sumula_340_comissionista ? mult.minus(1) : mult;
      // PJe-Calc: trunca (ROUND_DOWN) em cada etapa intermediária
      // Java BigDecimal.setScale(2, ROUND_DOWN) em cada multiply
      const valorHora = base.div(div).toDP(2, Decimal.ROUND_DOWN);
      const valorHoraComMult = valorHora.times(multEfetivo).toDP(2, Decimal.ROUND_DOWN);
      const subtotal = valorHoraComMult.times(qtd).toDP(2, Decimal.ROUND_DOWN);
      devido = subtotal.times(dobra).toDP(2, Decimal.ROUND_DOWN);
    }

    // Proporcionalizar DEVIDO separadamente (Fase 6 - PJe-Calc)
    // GUARD: Se quantidade já foi proporcionalizada para este mês, NÃO aplicar dupla redução
    // (PJe-Calc aplica proporcionalização uma única vez — quantidade OU devido, nunca ambos)
    let jaProporcionalizouQtd = false;
    if (verba.quantidade_proporcionalizar) {
      const [anoQ, mesQ] = competencia.split('-').map(Number);
      const diasNoMesQ = new Date(anoQ, mesQ, 0).getDate();
      const admDateQ = new Date(this.params.data_admissao);
      const demDateQ = this.params.data_demissao ? new Date(this.params.data_demissao) : null;
      let diaInicioQ = 1, diaFimQ = diasNoMesQ;
      if (admDateQ.getFullYear() === anoQ && admDateQ.getMonth() + 1 === mesQ) diaInicioQ = admDateQ.getDate();
      if (demDateQ && demDateQ.getFullYear() === anoQ && demDateQ.getMonth() + 1 === mesQ) diaFimQ = demDateQ.getDate();
      if ((diaFimQ - diaInicioQ + 1) < diasNoMesQ) jaProporcionalizouQtd = true;
    }

    if (verba.proporcionalizar_devido && !jaProporcionalizouQtd) {
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
    // Applies to BOTH quantidade_proporcionalizar AND proporcionalizar_devido paths
    let baseIntegral: number | undefined;
    let qtdIntegral: number | undefined;
    let devidoIntegral: number | undefined;
    if (verba.quantidade_proporcionalizar || (verba.proporcionalizar_devido && !jaProporcionalizouQtd)) {
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
          qtdIntegral = verba.quantidade_proporcionalizar ? qtd.div(frac).toDP(4).toNumber() : qtd.toDP(4).toNumber();
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
    // PJe-Calc: when multiple historicos cover the same competencia, use the MOST RECENT one
    if (verba.base_calculo.historicos.length > 0) {
      const matchingHistoricos: { periodo_inicio: string; valor: number }[] = [];
      for (const histId of verba.base_calculo.historicos) {
        const hist = this.historicos.find(h => h.id === histId);
        if (!hist) continue;
        const oc = hist.ocorrencias.find(o => o.competencia === competencia);
        if (oc) matchingHistoricos.push({ periodo_inicio: hist.periodo_inicio, valor: oc.valor });
      }
      if (matchingHistoricos.length > 0) {
        // Use the most recent historico (latest periodo_inicio), not sum
        matchingHistoricos.sort((a, b) => b.periodo_inicio.localeCompare(a.periodo_inicio));
        base = matchingHistoricos[0].valor;
      }
    }

    // Se não tem histórico específico, buscar qualquer histórico que cubra a competência
    if (base === 0 && verba.base_calculo.historicos.length === 0) {
      const matchingHistoricos: { periodo_inicio: string; valor: number }[] = [];
      for (const hist of this.historicos) {
        const compDate = new Date(competencia + '-01');
        const hInicio = new Date(hist.periodo_inicio);
        const hFim = new Date(hist.periodo_fim);
        if (compDate >= hInicio && compDate <= hFim) {
          const oc = hist.ocorrencias.find(o => o.competencia === competencia);
          if (oc) {
            matchingHistoricos.push({ periodo_inicio: hist.periodo_inicio, valor: oc.valor });
          } else if (hist.valor_informado) {
            matchingHistoricos.push({ periodo_inicio: hist.periodo_inicio, valor: hist.valor_informado });
          }
        }
      }
      if (matchingHistoricos.length > 0) {
        // Use the most recent historico (latest periodo_inicio), not sum
        matchingHistoricos.sort((a, b) => b.periodo_inicio.localeCompare(a.periodo_inicio));
        base = matchingHistoricos[0].valor;
      }
    }

    // Base: salário mínimo (insalubridade — art. 192 CLT)
    if (verba.base_calculo.tabelas.includes('salario_minimo')) {
      return this.getSalarioMinimoParaCompetencia(competencia);
    }

    // Fallback: usar maior/última remuneração
    if (base === 0) {
      if (verba.base_calculo.tabelas.includes('maior_remuneracao') && this.params.maior_remuneracao) {
        base = this.params.maior_remuneracao;
      } else if (verba.base_calculo.tabelas.includes('ultima_remuneracao') && this.params.ultima_remuneracao) {
        base = this.params.ultima_remuneracao;
      } else if (this.params.ultima_remuneracao) {
        // Last-resort fallback: log warning so the caller knows the base was guessed
        this.trackWarning('W060', 'verbas', `Verba "${verba.nome}" (${competencia}): base zero após histórico — usando ultima_remuneracao como fallback (R$ ${this.params.ultima_remuneracao.toFixed(2)}). Verifique histórico salarial.`, competencia);
        base = this.params.ultima_remuneracao;
      }
    }

    // Somar bases de verbas principais já calculadas (para reflexas)
    // Respeitar gerar_verba_reflexa: 'devido' → base = oc.devido; 'diferenca' → base = oc.diferenca
    const useDevido = verba.gerar_verba_reflexa === 'devido';
    for (const verbaBaseId of verba.base_calculo.verbas) {
      const vbResult = this.verbaResultsMap.get(verbaBaseId);
      if (vbResult) {
        const oc = vbResult.ocorrencias.find(o => o.competencia === competencia);
        if (oc) base += useDevido ? oc.devido : oc.diferenca;
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

  /**
   * Busca a melhor chave em um Record<string, T> para a competência dada.
   * Tenta primeiro 'YYYY-MM' (mais específico), depois chaves 'YYYY-MM' ≤ comp
   * dentro do mesmo ano (para splits como 2020-01/2020-03), e finalmente 'YYYY'.
   */
  private static findBestHistKey<T>(table: Record<string, T>, competencia: string): T | undefined {
    const comp = competencia.slice(0, 7); // YYYY-MM
    const ano = competencia.slice(0, 4);  // YYYY
    // 1) Exact YYYY-MM match
    if (table[comp]) return table[comp];
    // 2) Find the latest YYYY-MM key ≤ comp within the same year
    const keysForYear = Object.keys(table)
      .filter(k => k.startsWith(ano + '-') && k <= comp)
      .sort();
    if (keysForYear.length > 0) return table[keysForYear[keysForYear.length - 1]];
    // 3) Fallback to YYYY key
    if (table[ano]) return table[ano];
    return undefined;
  }

  private getFaixasINSSParaCompetencia(competencia: string): { ate: number; aliquota: number }[] {
    if (this.faixasINSSDB.length === 0) {
      // FIX: Quando banco sem seed, tentar tabela histórica com lookup YYYY-MM → YYYY
      const hist = PjeCalcEngine.findBestHistKey(HISTORICO_FAIXAS_INSS, competencia);
      if (hist && competencia < '2025-01') {
        this.trackWarning('W062', 'inss', `Faixas INSS para ${competencia} não encontradas no banco. Usando tabela histórica hardcoded — precisão aproximada.`);
        return hist;
      }
      // AUDIT: Track fallback to DEFAULT_FAIXAS_INSS
      if (competencia < '2025-01') {
        this.trackWarning('W062', 'inss', `Faixas INSS para ${competencia} não encontradas no banco nem no histórico hardcoded. Usando tabela 2025 como fallback — VALORES PODEM DIVERGIR DO PJE-CALC.`);
      } else {
        this.trackWarning('W032', 'cs', `INSS: Usando tabela padrão 2025 para ${competencia} — sem dados versionados disponíveis`);
      }
      return DEFAULT_FAIXAS_INSS;
    }

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

    if (faixas.length === 0) {
      // FIX: Tentar tabela histórica hardcoded (YYYY-MM → YYYY) antes de cair no DEFAULT 2025
      const hist = PjeCalcEngine.findBestHistKey(HISTORICO_FAIXAS_INSS, competencia);
      if (hist && competencia < '2025-01') {
        this.trackWarning('W062', 'inss', `Faixas INSS para ${competencia} ausentes no banco. Usando tabela histórica hardcoded.`);
        return hist;
      }
      // AUDIT: Track fallback for specific competência
      if (competencia < '2025-01') {
        this.trackWarning('W062', 'inss', `Faixas INSS para ${competencia} não encontradas no banco nem no histórico hardcoded. Usando tabela 2025 como fallback — VALORES PODEM DIVERGIR DO PJE-CALC.`);
      } else {
        this.trackWarning('W032', 'cs', `INSS: Sem faixas para ${competencia} — usando padrão 2025`);
      }
      return DEFAULT_FAIXAS_INSS;
    }
    return faixas;
  }

  private getFaixasIRParaCompetencia(competencia: string): { faixas: { ate: number; aliquota: number; deducao: number }[]; deducao_dependente: number } {
    if (this.faixasIRDB.length === 0) {
      // FIX: Quando banco sem seed, tentar tabela histórica com lookup YYYY-MM → YYYY
      const hist = PjeCalcEngine.findBestHistKey(HISTORICO_FAIXAS_IR, competencia);
      if (hist && competencia < '2025-01') {
        this.trackWarning('W061', 'ir', `Faixas IR para ${competencia} não encontradas no banco. Usando tabela histórica hardcoded — precisão aproximada.`);
        return { faixas: hist.faixas, deducao_dependente: hist.deducao_dependente };
      }
      // AUDIT: Track fallback to DEFAULT_FAIXAS_IR
      if (competencia < '2025-01') {
        this.trackWarning('W061', 'ir', `Faixas IR para ${competencia} não encontradas no banco nem no histórico hardcoded. Usando tabela 2025 como fallback — VALORES PODEM DIVERGIR DO PJE-CALC.`);
      } else {
        this.trackWarning('W033', 'ir', `IR: Usando tabela padrão 2025 para ${competencia} — sem dados versionados disponíveis`);
      }
      return { faixas: DEFAULT_FAIXAS_IR, deducao_dependente: DEFAULT_DEDUCAO_DEPENDENTE };
    }

    const compDate = new Date(competencia + '-01');
    const faixas = this.faixasIRDB
      .filter(f => {
        const inicio = new Date(f.competencia_inicio);
        const fim = f.competencia_fim ? new Date(f.competencia_fim) : new Date('2099-12-31');
        return compDate >= inicio && compDate <= fim;
      })
      .sort((a, b) => a.faixa - b.faixa)
      .map(f => ({ ate: Number(f.valor_ate), aliquota: Number(f.aliquota), deducao: Number(f.deducao) }));

    if (faixas.length === 0) {
      // FIX: Tentar tabela histórica hardcoded (YYYY-MM → YYYY) antes de cair no DEFAULT 2025
      const hist = PjeCalcEngine.findBestHistKey(HISTORICO_FAIXAS_IR, competencia);
      if (hist && competencia < '2025-01') {
        this.trackWarning('W061', 'ir', `Faixas IR para ${competencia} ausentes no banco. Usando tabela histórica hardcoded.`);
        return { faixas: hist.faixas, deducao_dependente: hist.deducao_dependente };
      }
      // AUDIT: Track fallback for specific competência
      if (competencia < '2025-01') {
        this.trackWarning('W061', 'ir', `Faixas IR para ${competencia} não encontradas no banco nem no histórico hardcoded. Usando tabela 2025 como fallback — VALORES PODEM DIVERGIR DO PJE-CALC.`);
      } else {
        this.trackWarning('W033', 'ir', `IR: Sem faixas para ${competencia} — usando padrão 2025`);
      }
      return { faixas: DEFAULT_FAIXAS_IR, deducao_dependente: DEFAULT_DEDUCAO_DEPENDENTE };
    }

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

  /**
   * PJe-Calc: acumular_indices_correcao — 'mensal' | 'anual' | 'periodo'
   *
   * All three modes produce the same result when using accumulated indices from the DB,
   * because the formula `acumulado[dest] / acumulado[origin]` inherently computes the
   * full-period ratio. In PJe-Calc's internal representation:
   *  - 'mensal': multiply month-by-month factors (equivalent to acumulado ratio)
   *  - 'anual': use December indices per year (equivalent when series is continuous)
   *  - 'periodo': single ratio from start to end (the formula below)
   *
   * The config field is persisted via correcaoConfig.acumular_indices_correcao and
   * defaults to 'mensal' when absent.
   */
  /**
   * Retorna o fator de correção acumulado entre compOrigem e compDestino.
   *
   * **CONTRATO DE CHAMADA (Súmula 381 TST):** Este método aplica internamente
   * o shift para o mês subsequente: `origemSubsequente = mesSubsequente(compOrigem)`.
   *
   * - **Callers em MODO LEGADO** (oc.competencia direto): passam a competência raw
   *   e o shift é aplicado automaticamente.
   * - **Callers em MODO COMBINAÇÃO** (segmentos): passam `mesAnterior(segInicio)`
   *   para que `mesSubsequente(mesAnterior(segInicio)) = segInicio`, cancelando o
   *   double-shift. Esse padrão é intencional e testado.
   *
   * NÃO alterar este contrato sem atualizar TODOS os callers.
   */
  private getIndiceCorrecaoDB(nomeIndice: string, compOrigem: string, compDestino: string): number | null {
    if (this.indicesDB.length === 0) {
      // Try fallback hardcoded indices
      return this.getIndiceFallback(nomeIndice, compOrigem, compDestino);
    }

    // Filtrar por índice — check both normalized name and common aliases
    const aliases: Record<string, string[]> = {
      'IPCA-E': ['IPCA-E', 'IPCAE', 'IPCA_E', 'IPCA'],
      'IGP-M': ['IGP-M', 'IGPM', 'IGP_M'],
      'IGP-DI': ['IGP-DI', 'IGPDI', 'IGP_DI'],
      'IPC-FIPE': ['IPC-FIPE', 'IPCFIPE'],
    };
    const searchNames = aliases[nomeIndice] || [nomeIndice];
    const indices = this.indicesDB
      .filter(i => searchNames.includes(i.indice))
      .sort((a, b) => (a.competencia || '').localeCompare(b.competencia || ''));

    if (indices.length === 0) {
      // Try fallback hardcoded indices
      return this.getIndiceFallback(nomeIndice, compOrigem, compDestino);
    }

    // Súmula 381 TST: correção acumula a partir do mês SUBSEQUENTE ao vencimento.
    // Usar acumulado do mês ANTERIOR à origem como denominador, para que o mês
    // subsequente (origemSubsequente) seja incluído no fator resultante.
    // Ex: compOrigem='2016-05' → origemSubsequente='2016-06'
    //     idxOrigem = entrada de maio (acumulado[maio])
    //     resultado = acumulado[destino] / acumulado[maio] = inclui junho ✓
    const origemSubsequente = this.mesSubsequente(compOrigem);

    // Buscar a última entrada com competência ANTERIOR à origem subsequente
    const idxOrigem = [...indices].filter(i => i.competencia.slice(0, 7) < origemSubsequente).pop()
      || indices[0];
    const idxDestinoArr = indices.filter(i => i.competencia.slice(0, 7) <= compDestino);
    const idxDestino = idxDestinoArr.length > 0 ? idxDestinoArr[idxDestinoArr.length - 1] : indices[indices.length - 1];

    if (!idxOrigem || !idxDestino || !idxOrigem.acumulado || !idxDestino.acumulado) return null;
    if (Number(idxOrigem.acumulado) === 0) return null;

    // PJC ignorarTaxaNegativa: when enabled, walk month-by-month and clamp
    // monthly factors < 1 (deflation) to 1. PJe-Calc default behavior — protege
    // o reclamante contra meses de IPCA-E negativo (ex: jul/2017, ago/2017).
    if (this.correcaoConfig.ignorar_taxa_negativa) {
      return this.getIndiceClampedFromAcumulado(indices, idxOrigem, origemSubsequente, idxDestino.competencia.slice(0, 7));
    }

    return new Decimal(String(idxDestino.acumulado)).div(new Decimal(String(idxOrigem.acumulado))).toDP(10).toNumber();
  }

  /**
   * Acumula o índice mês a mês entre `origemSubsequente` e `compDestino`,
   * derivando o fator mensal a partir do delta dos `acumulado` consecutivos.
   * Quando o fator mensal for < 1 (deflação), trata como 1 (não aplica a queda)
   * E não atualiza o baseline — assim a recuperação não compensa indevidamente
   * a queda ignorada. Implementa "ignorarTaxaNegativa" do PJe-Calc.
   */
  private getIndiceClampedFromAcumulado(
    indices: PjeIndiceRow[],
    idxOrigem: PjeIndiceRow,
    origemSubsequente: string,
    compDestino: string,
  ): number {
    const inRange = indices.filter(i => {
      const c = i.competencia.slice(0, 7);
      return c >= origemSubsequente && c <= compDestino;
    });
    if (inRange.length === 0) return 1;

    // synthBaseline mantém o "último acumulado válido" — não é alterado em meses
    // deflacionários. Isso garante que a recuperação posterior calcule o fator
    // mensal contra o pico anterior, não contra o vale da deflação.
    let synthBaseline = Number(idxOrigem.acumulado);
    if (!synthBaseline || synthBaseline <= 0) return 1;
    let acumulado = new Decimal(1);
    for (const idx of inRange) {
      const cur = Number(idx.acumulado);
      if (!cur || cur <= 0) continue;
      const monthly = new Decimal(String(cur)).div(new Decimal(String(synthBaseline))).toNumber();
      if (monthly >= 1) {
        acumulado = acumulado.times(monthly);
        synthBaseline = cur;
      }
      // monthly < 1 → ignorar mês deflacionário, synthBaseline NÃO atualiza
    }
    return acumulado.toNumber();
  }

  /** Returns YYYY-MM for the month after the given competência */
  private mesSubsequente(comp: string): string {
    const [ano, mes] = comp.split('-').map(Number);
    if (mes === 12) return `${ano + 1}-01`;
    return `${ano}-${String(mes + 1).padStart(2, '0')}`;
  }

  /** Returns YYYY-MM for the month before the given competência */
  private mesAnterior(comp: string): string {
    const [ano, mes] = comp.split('-').map(Number);
    if (mes === 1) return `${ano - 1}-12`;
    return `${ano}-${String(mes - 1).padStart(2, '0')}`;
  }

  /**
   * Fallback: use hardcoded accumulated indices when DB has no data for the given index.
   * Applies the same Súmula 381 logic as getIndiceCorrecaoDB (origin = month before subsequente).
   */
  private getIndiceFallback(nomeIndice: string, compOrigem: string, compDestino: string): number | null {
    const fallbackMap: Record<string, Record<string, number>> = {
      'IPCAE': IPCA_E_ACUMULADO,
      'IPCA-E': IPCA_E_ACUMULADO,
      'IPCA': IPCA_E_ACUMULADO,
      'SELIC': SELIC_ACUMULADO,
      'TR': TR_ACUMULADO,
      'TRD': TR_ACUMULADO,
    };
    const fallback = fallbackMap[nomeIndice];
    if (!fallback) return null;

    // Súmula 381: use the month before the subsequente as origin denominator
    // This means we use compOrigem itself (the month *before* origemSubsequente)
    const origemKey = compOrigem.slice(0, 7);
    const destinoKey = compDestino.slice(0, 7);
    const acumOrigem = fallback[origemKey];
    const acumDestino = fallback[destinoKey];

    if (acumOrigem && acumDestino && acumOrigem !== 0) {
      this.trackWarning(
        'W070',
        'correcao',
        `Usando índice ${nomeIndice} do fallback hardcoded (não do banco). Valores podem ter precisão limitada.`,
        compOrigem,
      );
      return new Decimal(String(acumDestino)).div(new Decimal(String(acumOrigem))).toDP(10).toNumber();
    }
    return null;
  }

  // =====================================================
  // SALÁRIO MÍNIMO POR COMPETÊNCIA
  // Usado como base para insalubridade (art. 192 CLT)
  // =====================================================

  getSalarioMinimoParaCompetencia(comp: string): number {
    const compDate = comp.slice(0, 7);
    // 1. Banco de dados (fonte primária)
    if (this.salarioMinimoDB.length > 0) {
      const candidatos = this.salarioMinimoDB
        .filter(r => r.competencia.slice(0, 7) <= compDate)
        .sort((a, b) => b.competencia.localeCompare(a.competencia));
      if (candidatos.length > 0) return Number(candidatos[0].valor);
    }
    // 2. Tabela hardcoded (fallback 2009–2025)
    const candidatos = HISTORICO_SALARIO_MINIMO
      .filter(r => r.vigencia <= compDate)
      .sort((a, b) => b.vigencia.localeCompare(a.vigencia));
    if (candidatos.length > 0) return candidatos[0].valor;
    // 3. Último recurso: params ou valor fixo 2025
    return this.params.salario_minimo ?? 1518.00;
  }

  // =====================================================
  // CALCULAR VERBA COMPLETA (com exclusões de faltas/férias)
  // =====================================================

  calcularVerba(verba: PjeVerba): PjeVerbaResult {
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
      case 'desligamento': {
        const desligComp = this.params.data_demissao?.slice(0, 7)
          || this.params.data_final?.slice(0, 7)
          || this.correcaoConfig?.data_liquidacao?.slice(0, 7);
        if (!desligComp) {
          throw new Error('E_DATA_OBRIGATORIA: data_demissao é obrigatória para verba de desligamento');
        }
        competencias = [desligComp];
        break;
      }
      case 'periodo_aquisitivo':
        competencias = this.ferias.map(f => f.periodo_aquisitivo_fim.slice(0, 7));
        if (competencias.length === 0) {
          const paqComp = this.params.data_demissao?.slice(0, 7)
            || this.params.data_final?.slice(0, 7)
            || this.correcaoConfig?.data_liquidacao?.slice(0, 7);
          if (!paqComp) {
            throw new Error('E_DATA_OBRIGATORIA: data_demissao é obrigatória para verba de período aquisitivo sem férias cadastradas');
          }
          competencias = [paqComp];
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
    const usarADC5859 = this.correcaoConfig.indice === 'IPCA-E' || this.correcaoConfig.indice === 'SELIC';
    let dataCitacao: Date | null;
    if (this.params.data_citacao) {
      dataCitacao = new Date(this.params.data_citacao);
    } else {
      // No modo independente, data_citacao nunca é estimada — zero tolerância para heurísticas.
      // O erro é reportado em validarPreLiquidacao(); aqui setamos null para que o código
      // downstream pule o caminho ADC/juros sem fallback silencioso.
      dataCitacao = null;
    }

    for (const vr of verbaResults) {
      let totalCorrigido = new Decimal(0);
      let totalJuros = new Decimal(0);
      let totalFinal = new Decimal(0);

      // Súmula 439 TST: lookup original verba for sumula_439_tst flag
      const verbaOriginal = this.verbas.find(v => v.id === vr.verba_id);

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;

        const [ano, mes] = oc.competencia.split('-').map(Number);
        const dataComp = new Date(ano, mes - 1, 1);

        let indiceCorrecao = 1;
        let juros = 0;

        if (usarADC5859 && dataCitacao) {
          if (dataComp >= dataCitacao) {
            const fatorDB = this.getIndiceCorrecaoDB('SELIC', oc.competencia, compLiq);
            if (fatorDB !== null) {
              indiceCorrecao = fatorDB;
            } else {
              this.trackWarning('W040', 'correcao_monetaria', `Índice SELIC ausente para ${oc.competencia}→${compLiq}. Usando fator=1 (PERDA DE PRECISÃO).`, oc.competencia);
              indiceCorrecao = 1;
            }
          } else {
            const compCitacao = dataCitacao.toISOString().slice(0, 7);
            const fatorIPCA = this.getIndiceCorrecaoDB('IPCA-E', oc.competencia, compCitacao);
            let fator1: number;
            if (fatorIPCA !== null) { fator1 = fatorIPCA; } else {
              this.trackWarning('W041', 'correcao_monetaria', `Índice IPCA-E ausente para ${oc.competencia}→${compCitacao}. Usando fator=1 (PERDA DE PRECISÃO).`, oc.competencia);
              fator1 = 1;
            }
            const fatorSELIC = this.getIndiceCorrecaoDB('SELIC', compCitacao, compLiq);
            let fator2: number;
            if (fatorSELIC !== null) { fator2 = fatorSELIC; } else {
              this.trackWarning('W042', 'correcao_monetaria', `Índice SELIC ausente para ${compCitacao}→${compLiq}. Usando fator=1 (PERDA DE PRECISÃO).`, oc.competencia);
              fator2 = 1;
            }
            indiceCorrecao = fator1 * fator2;

            if (this.correcaoConfig.indice !== 'SELIC' && dataAjuiz && dataCitacao > dataAjuiz) {
              // PJe-Calc: meses de juros contados de forma inclusiva (mês inicial conta)
              const mesesJurosPreCitacao = this.mesesEntreInclusivo(dataAjuiz, dataCitacao);
              const taxaMensal = (this.correcaoConfig.juros_percentual ?? 1) / 100;
              const valorCorrigidoParc = Number(new Decimal(oc.diferenca).times(fator1).toDP(2, Decimal.ROUND_HALF_EVEN));
              juros = Number(new Decimal(valorCorrigidoParc).times(taxaMensal).times(mesesJurosPreCitacao).toDP(2, Decimal.ROUND_HALF_EVEN));
            }
          }
        } else {
          const fatorDB = this.getIndiceCorrecaoDB(this.correcaoConfig.indice, oc.competencia, compLiq);
          if (fatorDB !== null) {
            indiceCorrecao = fatorDB;
          } else {
            this.trackWarning('W043', 'correcao_monetaria', `Índice ${this.correcaoConfig.indice} ausente para ${oc.competencia}→${compLiq}. Usando fator=1 (PERDA DE PRECISÃO).`, oc.competencia);
            indiceCorrecao = 1;
          }

          if (this.correcaoConfig.indice !== 'SELIC') {
            const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2, Decimal.ROUND_HALF_EVEN));
            // FIX CICLO-9 #1: base de juros conforme PJe-Calc (default = DIFERENCA)
            const baseJurosLegacy: number = (() => {
              const cfg = this.correcaoConfig.base_de_juros_das_verbas;
              if (cfg === 'CORRIGIDO') return valorCorrigido;
              if (cfg === 'DEVIDO') return oc.devido;
              return oc.diferenca;
            })();
            if (this.correcaoConfig.juros_tipo === 'simples_mensal') {
              let dataInicioJuros: Date;
              if (this.correcaoConfig.juros_inicio === 'vencimento') dataInicioJuros = dataComp;
              else if (this.correcaoConfig.juros_inicio === 'citacao' && dataCitacao) dataInicioJuros = dataCitacao!;
              else if (dataAjuiz) dataInicioJuros = dataAjuiz;
              else dataInicioJuros = dataComp;
              // Súmula 439 TST: danos morais — juros desde o ajuizamento
              if (verbaOriginal?.sumula_439_tst && this.params.data_ajuizamento) {
                dataInicioJuros = new Date(this.params.data_ajuizamento);
              }
              // PJe-Calc: meses de juros contados de forma inclusiva (mês inicial conta)
              const mesesJuros = this.mesesEntreInclusivo(dataInicioJuros, dataLiq);
              const taxaMensal = (this.correcaoConfig.juros_percentual ?? 1) / 100;
              juros = Number(new Decimal(baseJurosLegacy).times(taxaMensal).times(mesesJuros).toDP(2, Decimal.ROUND_HALF_EVEN));
            } else if ((this.correcaoConfig.juros_tipo as string) === 'composto') {
              let dataInicioJuros: Date;
              if (this.correcaoConfig.juros_inicio === 'vencimento') dataInicioJuros = dataComp;
              else if (this.correcaoConfig.juros_inicio === 'citacao' && dataCitacao) dataInicioJuros = dataCitacao!;
              else if (dataAjuiz) dataInicioJuros = dataAjuiz;
              else dataInicioJuros = dataComp;
              // Súmula 439 TST: danos morais — juros desde o ajuizamento
              if (verbaOriginal?.sumula_439_tst && this.params.data_ajuizamento) {
                dataInicioJuros = new Date(this.params.data_ajuizamento);
              }
              // PJe-Calc: meses de juros contados de forma inclusiva (mês inicial conta)
              const mesesJuros = this.mesesEntreInclusivo(dataInicioJuros, dataLiq);
              const taxaMensal = (this.correcaoConfig.juros_percentual ?? 1) / 100;
              // Usar Decimal.js em vez de Math.pow para precisão em juros compostos
              const fatorComposto = new Decimal(1).plus(taxaMensal).pow(mesesJuros);
              juros = Number(new Decimal(baseJurosLegacy).times(fatorComposto.minus(1)).toDP(2, Decimal.ROUND_HALF_EVEN));
            } else if (this.correcaoConfig.juros_tipo === 'selic') {
              juros = 0;
            }
          }
        }

        const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2, Decimal.ROUND_HALF_EVEN));
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
    const normalizeIndice = (ind: string) => this.normalizeIndice(ind);

    for (const vr of verbaResults) {
      let totalCorrigido = new Decimal(0);
      let totalJuros = new Decimal(0);
      let totalFinal = new Decimal(0);

      // Súmula 439 TST: lookup original verba for sumula_439_tst flag
      const verbaOriginalComb = this.verbas.find(v => v.id === vr.verba_id);
      // Súmula 439 TST: override interest start to ajuizamento for dano moral verbas
      let effectiveJurosStart = jurosStartDate;
      if (verbaOriginalComb?.sumula_439_tst && this.params.data_ajuizamento) {
        effectiveJurosStart = this.params.data_ajuizamento;
      }

      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;

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
          // Passar mesAnterior(segInicio) pois getIndiceCorrecaoDB já aplica o shift
          // de Súmula 381 internamente (mesSubsequente), e segInicio já é o mês correto
          // de início do segmento — sem mesAnterior haveria double-shift.
          const fatorDB = this.getIndiceCorrecaoDB(indice, this.mesAnterior(segInicio.slice(0, 7)), segFim.slice(0, 7));
          if (fatorDB !== null && fatorDB > 0) {
            fatorTotal = fatorTotal.times(fatorDB);
          } else {
            this.trackWarning('W044', 'correcao_monetaria', `Índice ${indice} ausente para ${segInicio}→${segFim} (combinação). Usando fator=1 (PERDA DE PRECISÃO).`, segInicio.slice(0, 7));
          }
        }

        const valorCorrigido = new Decimal(oc.diferenca).times(fatorTotal);

        // FIX CICLO-9 #1: Resolver base de juros conforme PJe-Calc (baseDeJurosDasVerbas).
        // PJe-Calc default = 'DIFERENCA': juros incidem sobre o valor nominal da diferença,
        // NÃO sobre o valor corrigido.
        const baseJuros: Decimal = (() => {
          const cfg = this.correcaoConfig.base_de_juros_das_verbas;
          if (cfg === 'CORRIGIDO') return valorCorrigido;
          if (cfg === 'DEVIDO') return new Decimal(oc.devido);
          return new Decimal(oc.diferenca); // 'DIFERENCA' = default PJe-Calc
        })();

        // Calculate interest segment-by-segment
        let jurosTotal = new Decimal(0);
        const jurosEffectiveStart = effectiveJurosStart || compDateJuros;

        if (!jurosDisabled) {
          for (let i = 0; i < datas.length - 1; i++) {
            const segInicio = datas[i];
            const segFim = datas[i + 1];
            if (segFim <= jurosEffectiveStart) continue;
            const realStart = segInicio < jurosEffectiveStart ? jurosEffectiveStart : segInicio;

            const regimeIndice = this.getRegimeParaData(combinacoes_indice, realStart);
            const indiceNorm = normalizeIndice(regimeIndice?.indice || 'SEM_CORRECAO');
            const regimeJuros = this.getRegimeParaData(combinacoes_juros, realStart);

            // Skip interest during SELIC index regime (already includes interest)
            if (indiceNorm === 'SELIC') continue;
            // SEM_CORRECAO: skip juros UNLESS juros regime is SELIC (ADC 58/59)
            if (indiceNorm === 'SEM_CORRECAO' || indiceNorm === 'Sem Correção' || indiceNorm === 'NENHUM') {
              const regJCheck = this.getRegimeParaData(combinacoes_juros, realStart);
              if (!regJCheck || regJCheck.tipo !== 'SELIC') continue;
            }
            if (!regimeJuros || regimeJuros.tipo === 'NENHUM') continue;

            if (regimeJuros.tipo === 'SELIC') {
              // PJe-Calc uses SIMPLE SUM of monthly SELIC rates, not compound ratio.
              // Sum monthly 'valor' (% rate) from start to end, then apply as simple interest.
              const startComp = realStart.slice(0, 7);
              const endComp = segFim.slice(0, 7);
              const selicMonthly = this.indicesDB
                .filter(i => (i.indice === 'SELIC' || i.indice === 'selic') && i.competencia.slice(0, 7) >= startComp && i.competencia.slice(0, 7) < endComp)
                .reduce((sum, i) => sum + (i.valor || 0), 0);
              if (selicMonthly > 0) {
                jurosTotal = jurosTotal.plus(baseJuros.times(selicMonthly / 100));
              } else {
                this.trackWarning('W_SELIC_MENSAL_AUSENTE', 'juros',
                  `SELIC: taxas mensais ausentes para ${startComp}→${endComp}. Usando ratio acumulado como fallback.`, startComp);
                const fatorSelic = this.getIndiceCorrecaoDB('SELIC', this.mesAnterior(startComp), endComp);
                if (fatorSelic !== null) {
                  jurosTotal = jurosTotal.plus(baseJuros.times(fatorSelic - 1));
                }
              }
            } else if (regimeJuros.tipo === 'TAXA_LEGAL') {
              const fatorTL = this.getIndiceCorrecaoDB('TAXA_LEGAL', this.mesAnterior(realStart.slice(0, 7)), segFim.slice(0, 7));
              if (fatorTL !== null) {
                jurosTotal = jurosTotal.plus(valorCorrigido.times(fatorTL - 1));
              }
            } else if (regimeJuros.tipo === 'TRD_SIMPLES' || regimeJuros.tipo === 'TR' || regimeJuros.tipo === 'TRD') {
              // TRD Juros Simples (PJe-Calc): usa a Taxa Referencial Diária
              // como juros simples. Lógica: juros = valor_corrigido × (fator_TR - 1).
              // Pós-2017 a TR é praticamente nula (Lei 12.703/2012 → TR=0 a partir de
              // set/2017), então o juros tende a zero — propositalmente. Esta é a
              // diferença entre TR como ÍNDICE de correção e TRD como TABELA de juros.
              const fatorTR = this.getIndiceCorrecaoDB('TR', this.mesAnterior(realStart.slice(0, 7)), segFim.slice(0, 7));
              if (fatorTR !== null && fatorTR > 1) {
                jurosTotal = jurosTotal.plus(baseJuros.times(fatorTR - 1));
              }
            } else {
              const meses = this.mesesEntreInclusivo(new Date(realStart), new Date(segFim));
              const taxa = (regimeJuros.percentual ?? 1) / 100;
              jurosTotal = jurosTotal.plus(baseJuros.times(taxa).times(meses));
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

  /**
   * PJe-Calc counts interest months INCLUSIVE of the start month.
   * Jan→Mar exclusive = 2, inclusive = 3. Use this for interest period counting
   * where the start month itself accrues interest.
   */
  private mesesEntreInclusivo(d1: Date, d2: Date): number {
    const exclusive = this.mesesEntre(d1, d2);
    return exclusive + 1; // Always at least 1 month (same-month = 1)
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

    // LC 150/2015: Empregado doméstico — 8% FGTS + 3.2% indenização compensatória mensal
    // (substitui a multa de 40% na rescisão)
    const isDomestico = this.csConfig.aliquota_segurado_tipo === 'domestico';

    // Lei 10.097/2000: menor aprendiz recolhe 2% de FGTS, não 8%
    const aliqFGTS = this.verbas.some(v => v.tipo_fgts === 'aprendiz') ? 0.02 : 0.08;

    for (const [comp, base] of Object.entries(basesPorComp)) {
      const valor = Number(new Decimal(base).times(aliqFGTS).toDP(2));
      depositos.push({ competencia: comp, base, aliquota: aliqFGTS, valor });
      if (isDomestico) {
        // LC 150/2015, Art. 22: 3.2% indenização compensatória depositada mensalmente
        const indenComp = Number(new Decimal(base).times(0.032).toDP(2));
        depositos.push({ competencia: comp + '-inden', base, aliquota: 0.032, valor: indenComp });
      }
    }
    for (const [comp, base] of Object.entries(bases13PorComp)) {
      const valor = Number(new Decimal(base).times(aliqFGTS).toDP(2));
      depositos.push({ competencia: comp + '-13', base, aliquota: aliqFGTS, valor });
      if (isDomestico) {
        const indenComp = Number(new Decimal(base).times(0.032).toDP(2));
        depositos.push({ competencia: comp + '-13-inden', base, aliquota: 0.032, valor: indenComp });
      }
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
          const indiceNorm = this.normalizeIndice(indice);
          // FIX CICLO-9 #2: mesAnterior cancela double-shift Súmula 381 (contrato documentado)
          const fatorDB = this.getIndiceCorrecaoDB(indiceNorm, this.mesAnterior(segInicio.slice(0, 7)), segFim.slice(0, 7));
          if (fatorDB !== null && fatorDB > 0) {
            fatorTotal = fatorTotal.times(fatorDB);
          } else {
            this.trackWarning('W045', 'fgts', `Índice ${indiceNorm} ausente para FGTS ${segInicio}→${segFim}. Usando fator=1 (PERDA DE PRECISÃO).`, segInicio.slice(0, 7));
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
            const meses = this.mesesEntreInclusivo(new Date(segInicio), new Date(segFim));
            if (regimeJ.tipo === 'SELIC') {
              const fatorS = this.getIndiceCorrecaoDB('SELIC', this.mesAnterior(segInicio.slice(0, 7)), segFim.slice(0, 7));
              if (fatorS !== null) jurosAcc = jurosAcc.plus(valorCorrigido.times(fatorS - 1));
              else { this.trackWarning('W046', 'fgts', `SELIC (juros FGTS) ausente para ${segInicio}→${segFim}.`, segInicio.slice(0, 7)); }
            } else if (regimeJ.tipo === 'TAXA_LEGAL') {
              const fatorTL = this.getIndiceCorrecaoDB('TAXA_LEGAL', this.mesAnterior(segInicio.slice(0, 7)), segFim.slice(0, 7));
              if (fatorTL !== null) jurosAcc = jurosAcc.plus(valorCorrigido.times(fatorTL - 1));
              else { this.trackWarning('W047', 'fgts', `TAXA_LEGAL (juros FGTS) ausente para ${segInicio}→${segFim}.`, segInicio.slice(0, 7)); }
            } else {
              const taxa = ((regimeJ as any).percentual ?? 1) / 100;
              jurosAcc = jurosAcc.plus(valorCorrigido.times(taxa).times(meses));
            }
          }
          jurosValor = jurosAcc.toDP(2).toNumber();
        }
      } else {
        // FGTS: corrigido por TR + 3% a.a. (Lei 8.036/90, art. 13)
        // Usa índice TR_FGTS do banco (TR mensal + 0.2466%/mês compound)
        // Fallback: 3% a.a. simples (0.25%/mês) se TR_FGTS não disponível
        const fatorDB = this.getIndiceCorrecaoDB('TR_FGTS', compClean, compLiq);
        if (fatorDB !== null) {
          fatorCorrecao = fatorDB;
        } else {
          // Fallback: apenas 3% a.a. (sem TR) para manter resultado mínimo correto
          const [aDepos, mDepos] = compClean.split('-').map(Number);
          const [aLiq, mLiq] = compLiq.split('-').map(Number);
          const meses = (aLiq - aDepos) * 12 + (mLiq - mDepos);
          if (meses > 0) {
            fatorCorrecao = Math.pow(1.002466, meses); // 3% a.a. compound
          }
          this.trackWarning('W048', 'fgts', `TR_FGTS ausente para FGTS ${compClean}→${compLiq}. Usando 3% a.a. compound como fallback.`, compClean);
        }
      }
      
      const depCorrigido = Number(new Decimal(dep.valor).times(fatorCorrecao).toDP(2));
      totalDepositosCorrigido += depCorrigido;
      totalDepositosJuros += jurosValor;
    }

    // Compute saldo first — needed for multa_base variants
    const saldoDeduzido = this.fgtsConfig.deduzir_saldo
      ? this.fgtsConfig.saldos_saques.reduce((s, v) => s + v.valor, 0) : 0;

    let multaValor = 0;
    if (this.fgtsConfig.multa_apurar) {
      if (this.fgtsConfig.multa_tipo === 'informada') {
        multaValor = this.fgtsConfig.multa_valor_informado || 0;
      } else {
        // Lei 8.036/90 art. 18 §1°: multa sobre "montante de todos os depósitos
        // realizados na conta vinculada" — jurisprudência e PJe-Calc interpretam
        // como saldo CORRIGIDO (depósitos + rendimentos TR+3%a.a.).
        let baseMulta = totalDepositosCorrigido; // 'devido' (default PJe-Calc)
        if (totalDepositosCorrigido === 0 && totalDepositos > 0) {
          // Fallback: se correção não disponível (sem índices), usar nominal com warning
          baseMulta = totalDepositos;
          this.trackWarning('W_FGTS_MULTA_SEM_CORRECAO', 'fgts',
            'Multa FGTS calculada sobre depósitos nominais (sem correção TR+3%a.a. disponível).');
        }
        if (this.fgtsConfig.multa_base === 'saldo_saque') {
          baseMulta = saldoDeduzido;
        } else if (this.fgtsConfig.multa_base === 'devido_menos_saldo') {
          baseMulta = Math.max(0, totalDepositosCorrigido - saldoDeduzido);
        } else if (this.fgtsConfig.multa_base === 'devido_mais_saldo') {
          baseMulta = totalDepositosCorrigido + saldoDeduzido;
        } else if (this.fgtsConfig.multa_base === 'nominal') {
          // Modo explícito para TRTs com entendimento divergente
          baseMulta = totalDepositos;
        }
        multaValor = Number(new Decimal(baseMulta).times(this.fgtsConfig.multa_percentual / 100).toDP(2));
      }
    }

    // LC 110/2001: contribuição social incide sobre saldo CORRIGIDO do FGTS (não nominal)
    // LC 110/2001: contribuições com guard de vigência
    // Art. 1° (10%): extinta pela LC 142/2013 a partir de jun/2013
    // Art. 2° (0.5%): extinta pela Portaria MTE 3.665/2023 a partir de abr/2024
    const compLiqLC110 = this.correcaoConfig.data_liquidacao.slice(0, 7);
    let lc110_10 = 0;
    if (this.fgtsConfig.lc110_10) {
      if (compLiqLC110 >= '2013-06') {
        this.trackWarning('W_LC110_EXTINTA', 'fgts', 'LC 110/2001 Art. 1° (10%) extinta pela LC 142/2013 a partir de jun/2013. Contribuição zerada.');
      } else {
        lc110_10 = Number(new Decimal(totalDepositosCorrigido).times(0.10).toDP(2));
      }
    }
    let lc110_05 = 0;
    if (this.fgtsConfig.lc110_05) {
      if (compLiqLC110 >= '2024-04') {
        this.trackWarning('W_LC110_EXTINTA', 'fgts', 'LC 110/2001 Art. 2° (0.5%) extinta pela Portaria MTE 3.665/2023 a partir de abr/2024. Contribuição zerada.');
      } else {
        lc110_05 = Number(new Decimal(totalDepositosCorrigido).times(0.005).toDP(2));
      }
    }

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

    // ═══ Compute CS from verba results ═══
    // ═══ Track 1: CS sobre salários DEVIDOS ═══
    // base_cs_segurado: 'bruto' usa oc.devido, 'liquido' (default) usa oc.diferenca
    const usarBruto = this.csConfig.base_cs_segurado === 'bruto';
    // "Com Correção Trabalhista": quando marcado na tela CS do PJe-Calc, INSS
    // incide sobre base corrigida monetariamente em vez do valor nominal.
    const comCorrecaoTrabalhista = this.csConfig.com_correcao_trabalhista === true;
    const basesDevidos: Record<string, number> = {};
    const bases13Devidos: Record<string, number> = {};
    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.contribuicao_social) continue;
      // Férias indenizadas já têm contribuicao_social:false na incidência (INC_FERIAS_INDENIZADAS)
      // Férias gozadas com contribuicao_social:true devem incidir INSS (Decreto 3.048/99 art. 214)
      const is13 = verba.caracteristica === '13_salario';
      for (const oc of vr.ocorrencias) {
        // ═══ CS Base Rule (PJe-Calc):
        // Por padrão, PJe-Calc calculates CS on NOMINAL diferença, not corrected values.
        // Quando "Com Correção Trabalhista" está marcado na tela de CS, a base passa a
        // ser corrigida pelo índice monetário antes de aplicar as faixas INSS.
        let val: number;
        if (useCorrigido) {
          val = Math.abs(oc.diferenca);
        } else {
          val = usarBruto ? oc.devido : oc.diferenca;
        }
        if (val <= 0) continue;
        if (comCorrecaoTrabalhista) {
          const fator = oc.indice_correcao ?? 1;
          if (fator > 1) {
            val = Number(new Decimal(val).times(fator).toDP(2));
          }
        }
        // PJe-Calc: INSS on 13º uses a SEPARATE basis with its own teto
        const target = is13 ? bases13Devidos : basesDevidos;
        target[oc.competencia] = (target[oc.competencia] || 0) + val;
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
      // Collect all competencias from both normal and 13º
      const allDevidosComps = Array.from(new Set([...Object.keys(basesDevidos), ...Object.keys(bases13Devidos)]));
      for (const comp of allDevidosComps) {
        const baseNormal = basesDevidos[comp] || 0;
        const base13Val = bases13Devidos[comp] || 0;
        const totalBase = baseNormal + base13Val;
        if (totalBase <= 0) continue;
        // PJe-Calc: calculate INSS separately for normal and 13º (each with own teto)
        const impostoNormal = baseNormal > 0 ? this.calcularINSSProgressivo(comp, baseNormal) : 0;
        const imposto13 = base13Val > 0 ? this.calcularINSSProgressivo(comp, base13Val) : 0;
        const imposto = impostoNormal + imposto13;
        segurado_devidos.push({
          competencia: comp, base: totalBase,
          aliquota: totalBase > 0 ? imposto / totalBase : 0,
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

    // Empregador (sobre devidos + 13º + pagos combinados).
    // Para o empregador, 13º integra a mesma base patronal (20%+SAT+terceiros)
    // que os salários normais — não há teto separado no patronal. Sem incluir
    // bases13Devidos aqui, o INSS patronal subestima o total após o bridge
    // passar a classificar as verbas de 13º como caracteristica='13_salario'.
    const basesEmpregador: Record<string, number> = { ...basesDevidos };
    for (const [comp, val] of Object.entries(bases13Devidos)) {
      basesEmpregador[comp] = (basesEmpregador[comp] || 0) + val;
    }
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
          // LC 150/2015: Empregado doméstico — alíquota patronal de 8% (não 20%)
          const isDomesticoCS = this.csConfig.aliquota_segurado_tipo === 'domestico';
          const aliqEmp = isDomesticoCS ? 0.08 : (this.csConfig.aliquota_empresa_fixa ?? 20) / 100;
          const aliqSat = (this.csConfig.aliquota_sat_fixa ?? 2) / 100;
          // FPAS-based terceiros: use real rate by FPAS code when available
          const fpasStd = this.csConfig.fpas_code ? getFPASByCodigo(this.csConfig.fpas_code) : undefined;
          const aliqTerc = fpasStd ? fpasStd.entidades.reduce((s, e) => s + e.aliquota, 0) / 100 : (this.csConfig.aliquota_terceiros_fixa ?? 5.8) / 100;
          empregador.push({
            competencia: comp,
            empresa: this.csConfig.apurar_empresa ? Number(new Decimal(base).times(aliqEmp).toDP(2, PjeCalcEngine.ROUND_CS_IR)) : 0,
            sat: this.csConfig.apurar_sat ? Number(new Decimal(base).times(aliqSat).toDP(2, PjeCalcEngine.ROUND_CS_IR)) : 0,
            // LC 150/2015: doméstico não recolhe terceiros
            terceiros: (this.csConfig.apurar_terceiros && !isDomesticoCS) ? Number(new Decimal(base).times(aliqTerc).toDP(2, PjeCalcEngine.ROUND_CS_IR)) : 0,
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
  private static readonly ROUND_CS_IR = Decimal.ROUND_HALF_EVEN; // Java BigDecimal padrão (PJe-Calc)

  /** Mapa de aliases de índice — centralizado para evitar cópias inline (4 métodos usavam). */
  private static readonly INDICE_ALIASES: Record<string, string> = {
    'IPCA-E': 'IPCA-E', 'IPCAE': 'IPCA-E', 'IPCA': 'IPCA',
    'SELIC': 'SELIC', 'SELIC_SIMPLES': 'SELIC', 'SELIC_COMPOSTA': 'SELIC', 'SELIC_RF': 'SELIC',
    'TR': 'TR', 'TRD': 'TR',
    'INPC': 'INPC', 'IGP-M': 'IGP-M', 'IGP-DI': 'IGP-DI', 'IPC-FIPE': 'IPC-FIPE', 'IPC': 'IPC',
    'IPCA-E_TR': 'IPCA-E', 'TUACDT': 'FACDT',
    'DEVEDOR_FP': 'SELIC', 'REPETICAO_INDEBITO': 'SELIC',
    'TABELA_JT_MENSAL': 'INPC', 'TABELA_JT_DIARIA': 'INPC',
  };

  private normalizeIndice(ind: string): string {
    return PjeCalcEngine.INDICE_ALIASES[ind] || ind;
  }

  // INSS pré-EC 103/2019: alíquota única aplicada sobre o salário total
  // (o salário cai numa das 3 faixas e toda a base é tributada nessa alíquota)
  private calcularINSSAliquotaUnica(comp: string, base: number): number {
    const faixas = this.getFaixasINSSParaCompetencia(comp);
    if (!faixas || faixas.length === 0) return 0;

    const baseD = new Decimal(base);

    for (const faixa of faixas) {
      if (baseD.lte(faixa.ate)) {
        return baseD
          .times(faixa.aliquota)
          .toDP(2, PjeCalcEngine.ROUND_CS_IR)
          .toNumber();
      }
    }

    // Base excede todas as faixas: teto = last faixa.ate, alíquota = last faixa.aliquota
    const ultima = faixas[faixas.length - 1];
    const baseCapped = new Decimal(ultima.ate);
    return baseCapped
      .times(ultima.aliquota)
      .toDP(2, PjeCalcEngine.ROUND_CS_IR)
      .toNumber();
  }

  private calcularINSSProgressivo(comp: string, base: number): number {
    if (this.csConfig.aliquota_segurado_tipo === 'fixa' && this.csConfig.aliquota_segurado_fixa) {
      return new Decimal(base).times(this.csConfig.aliquota_segurado_fixa).div(100)
        .toDP(2, PjeCalcEngine.ROUND_CS_IR).toNumber();
    }
    // EC 103/2019: sistema progressivo a partir de 01/03/2020
    // Antes disso: alíquota única (flat-rate) conforme Portarias MF anuais
    if (comp < '2020-03') {
      return this.calcularINSSAliquotaUnica(comp, base);
    }
    const faixas = this.getFaixasINSSParaCompetencia(comp);
    const teto = faixas[faixas.length - 1].ate;
    // Teto previdenciário é limite constitucional (art. 201 §2° CF/88).
    // Exceção: alíquota fixa informada pelo usuário opera sobre base arbitrária.
    const aplicarTeto = this.csConfig.aliquota_segurado_tipo !== 'fixa';
    if (!aplicarTeto && base > teto) {
      this.trackWarning('W_INSS_SEM_TETO', 'inss', `INSS calculado sem teto (alíquota fixa configurada). Base ${base.toFixed(2)} > teto ${teto.toFixed(2)}.`);
    }
    let baseRestante = new Decimal(aplicarTeto ? Math.min(base, teto) : base);
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

    let baseBruta = 0;
    let base13 = 0;
    let baseFerias = 0;
    const base13PorAno: Record<number, number> = {};
    const todasCompetencias = new Set<string>();
    const competenciasFerias = new Set<string>();

    const irUsarValorFinal = this.irConfig.incidir_sobre_juros === true;

    for (const vr of verbaResults) {
      const verba = this.verbas.find(v => v.id === vr.verba_id);
      if (!verba?.incidencias.irpf) continue;
      const vrBaseIR = irUsarValorFinal ? vr.total_final : vr.total_diferenca;
      if (verba.caracteristica === 'ferias') {
        if (this.irConfig.tributacao_separada_ferias) {
          baseFerias += vrBaseIR;
          for (const oc of vr.ocorrencias) {
            if (oc.diferenca > 0) competenciasFerias.add(oc.competencia);
          }
        } else {
          baseBruta += vrBaseIR;
          for (const oc of vr.ocorrencias) {
            if (oc.diferenca > 0) todasCompetencias.add(oc.competencia);
          }
        }
        continue;
      }
      if (verba.caracteristica === '13_salario' && this.irConfig.tributacao_exclusiva_13) {
        base13 += vrBaseIR;
        const anoLiq = parseInt(this.correcaoConfig.data_liquidacao.slice(0, 4));
        if (vr.ocorrencias.length === 0) {
          base13PorAno[anoLiq] = (base13PorAno[anoLiq] || 0) + vrBaseIR;
        } else {
          for (const oc of vr.ocorrencias) {
            if (oc.diferenca <= 0) continue;
            const anoComp = parseInt(oc.competencia.slice(0, 4));
            const valorIR = irUsarValorFinal ? (oc.valor_final || oc.diferenca) : oc.diferenca;
            base13PorAno[anoComp] = (base13PorAno[anoComp] || 0) + valorIR;
          }
        }
      } else {
        baseBruta += vrBaseIR;
        for (const oc of vr.ocorrencias) {
          if (oc.diferenca > 0) todasCompetencias.add(oc.competencia);
        }
      }
    }

    // Abono pecuniário: tributável (STJ RE 592.079), isento INSS (art. 28 §9°'d' Lei 8.212)
    const abonoPecuniarioIR = this.calcularAbonoPecuniario();
    if (abonoPecuniarioIR > 0) {
      baseBruta += abonoPecuniarioIR;
    }

    // Art. 12-A Lei 7.713/88: NM = total de meses do período (first→last competência)
    let mesesTotal = 1;
    if (todasCompetencias.size > 0) {
      const sorted = [...todasCompetencias].sort();
      mesesTotal = Math.max(1, this.getCompetencias(sorted[0], sorted[sorted.length - 1]).length);
    }

    let deducoes = 0;
    if (this.irConfig.deduzir_cs && this.csConfig.cobrar_reclamante) {
      deducoes += csResult.total_segurado;
    }

    // Honorários contratuais devidos pelo reclamante — deduzem da base do IR
    // (Lei 13.467/2017 Art. 791-A CLT: honorários contratuais são ônus do
    // reclamante e, quando pagos, reduzem o rendimento tributável).
    // Honorários sucumbenciais NÃO deduzem — estes são pagos pelo reclamado
    // ao advogado do reclamante, não oneram o trabalhador.
    if (this.irConfig.deduzir_honorarios && this.honorariosConfig.apurar_contratuais) {
      const principalCorrigidoIR = Number(
        verbaResults
          .filter(v => {
            const verba = this.verbas.find(vb => vb.id === v.verba_id);
            return verba?.compor_principal !== false;
          })
          .reduce((s, v) => s.plus(v.total_corrigido), new Decimal(0))
          .toDP(2),
      );
      const jurosMoraIR = Number(
        verbaResults
          .filter(v => {
            const verba = this.verbas.find(vb => vb.id === v.verba_id);
            return verba?.compor_principal !== false;
          })
          .reduce((s, v) => s.plus(v.total_juros), new Decimal(0))
          .toDP(2),
      );
      let contratuaisIR: number;
      if (this.honorariosConfig.valor_fixo !== undefined) {
        contratuaisIR = this.honorariosConfig.valor_fixo;
      } else {
        const baseHonIR = principalCorrigidoIR + jurosMoraIR;
        contratuaisIR = Number(
          new Decimal(baseHonIR)
            .times(this.honorariosConfig.percentual_contratuais / 100)
            .toDP(2),
        );
      }
      deducoes += contratuaisIR;
    }

    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
    const tabelaIR = this.getFaixasIRParaCompetencia(compLiq);

    // Art. 4° §2° Lei 7.713/88: aposentados com 65+ anos têm dedução adicional
    if (this.irConfig.aposentado_65 && tabelaIR.faixas.length > 0) {
      deducoes += tabelaIR.faixas[0].ate * mesesTotal;
    }

    let irTotal = new Decimal(0);
    let ir13Exclusivo = new Decimal(0);
    let irFeriasSeparado = new Decimal(0);

    const R = PjeCalcEngine.ROUND_CS_IR;

    // ═══ Art. 12-A Lei 7.713/88: RRA — aplicação ÚNICA com NM total ═══
    // Divide-se o rendimento total pelo NM, aplica-se a alíquota sobre essa
    // fração, e multiplica-se pelo NM. Sem split por ano anterior vs liquidação.
    if (baseBruta > 0) {
      const deducaoDep = new Decimal(this.irConfig.dependentes).times(tabelaIR.deducao_dependente).times(mesesTotal).toDP(2, R).toNumber();
      const baseTrib = Math.max(0, baseBruta - deducoes - deducaoDep);
      for (const faixa of tabelaIR.faixas) {
        if (baseTrib <= faixa.ate * mesesTotal) {
          irTotal = new Decimal(baseTrib).times(faixa.aliquota).minus(new Decimal(faixa.deducao).times(mesesTotal)).toDP(2, R);
          break;
        }
      }
      if (irTotal.lt(0)) irTotal = new Decimal(0);
    }

    // 13º tributação exclusiva (tabela mensal, APLICADA POR ANO)
    // IN RFB 1500/2014 Art. 14 c/c Lei 7.713/88 Art. 26 §1º:
    // o 13º de cada ano é tributado separadamente, como rendimento único mensal.
    // Para reclamações com 13º de múltiplos anos, somar os impostos calculados
    // por ano — NÃO aplicar a tabela sobre o somatório total (que cairia na
    // faixa máxima).
    if (this.irConfig.tributacao_exclusiva_13 && base13 > 0) {
      let ir13Acumulado = new Decimal(0);
      const anos13 = Object.keys(base13PorAno)
        .map(Number)
        .filter(ano => (base13PorAno[ano] || 0) > 0)
        .sort();
      // Fallback: se nenhum ano foi coletado (vr.ocorrencias vazio), cair no
      // comportamento antigo usando o total base13 em um único pagamento
      const anosParaTributar = anos13.length > 0 ? anos13 : [anoLiq];
      if (anos13.length === 0) {
        base13PorAno[anoLiq] = base13;
      }
      for (const ano of anosParaTributar) {
        const baseAno = base13PorAno[ano] || 0;
        if (baseAno <= 0) continue;
        let ir13Ano = new Decimal(0);
        for (const faixa of tabelaIR.faixas) {
          if (baseAno <= faixa.ate) {
            ir13Ano = new Decimal(baseAno).times(faixa.aliquota).minus(faixa.deducao);
            break;
          }
        }
        if (ir13Ano.lt(0)) ir13Ano = new Decimal(0);
        ir13Acumulado = ir13Acumulado.plus(ir13Ano);
      }
      ir13Exclusivo = ir13Acumulado.toDP(2, R);
      if (ir13Exclusivo.lt(0)) ir13Exclusivo = new Decimal(0);
    }

    // Tributação separada de férias (PJe-Calc: usa meses de férias, não global)
    if (this.irConfig.tributacao_separada_ferias && baseFerias > 0) {
      const mesesFerias = Math.max(1, competenciasFerias.size);
      for (const faixa of tabelaIR.faixas) {
        if (baseFerias <= faixa.ate * mesesFerias) {
          irFeriasSeparado = new Decimal(baseFerias).times(faixa.aliquota).minus(new Decimal(faixa.deducao).times(mesesFerias)).toDP(2, R);
          break;
        }
      }
      if (irFeriasSeparado.lt(0)) irFeriasSeparado = new Decimal(0);
    }

    const imposto = irTotal.plus(ir13Exclusivo).plus(irFeriasSeparado);
    const deducaoDep = new Decimal(this.irConfig.dependentes).times(tabelaIR.deducao_dependente).times(mesesTotal).toDP(2, R).toNumber();
    const baseTributavel = Math.max(0, baseBruta - deducoes - deducaoDep);

    return {
      base_calculo: Number(new Decimal(baseBruta + base13 + baseFerias).toDP(2, R)),
      deducoes: Number(new Decimal(deducoes + deducaoDep).toDP(2, R)),
      base_tributavel: Number(new Decimal(baseTributavel + base13 + baseFerias).toDP(2, R)),
      imposto_devido: imposto.toDP(2, R).toNumber(),
      meses_rra: mesesTotal,
      metodo: mesesTotal > 1 ? 'art_12a_rra' : 'tabela_mensal',
      ir_anos_anteriores: 0,
      ir_ano_liquidacao: irTotal.toDP(2, R).toNumber(),
      ir_13_exclusivo: ir13Exclusivo.toDP(2, R).toNumber(),
      ir_ferias_separado: irFeriasSeparado.toDP(2, R).toNumber(),
      meses_anos_anteriores: 0,
      meses_ano_liquidacao: mesesTotal,
    };
  }

  // =====================================================
  // CALCULAR CONTRIBUIÇÃO SINDICAL (art. 578-579 CLT)
  // 1 dia de salário, descontado em março de cada ano.
  // Pré-Nov/2017 (reforma): obrigatória.
  // Pós-Nov/2017: facultativa (requer autorização expressa).
  // =====================================================

  calcularContribuicaoSindical(verbaResults: PjeVerbaResult[]): number {
    if (!this.csConfig.contribuicao_sindical) return 0;

    const periodoInicio = this.params.data_inicial || this.params.data_admissao;
    const periodoFim = this.params.data_final || this.params.data_demissao ||
      this.correcaoConfig.data_liquidacao;

    // Lei 13.467/2017 (Reforma Trabalhista): a partir de 11/11/2017, contribuição
    // sindical é facultativa — só incide se o empregado autorizou expressamente.
    // Pré-reforma: obrigatória para todos os anos com março no período.
    // Pós-reforma: somente se csConfig.contribuicao_sindical_pos2017 === true.
    const REFORMA_DATE = '2017-11'; // A partir de novembro de 2017

    // Cada ano em que o empregado trabalhou em março gera 1 desconto
    // Valor = salário do mês de março / 30 (1 dia)
    let total = 0;
    const anoInicio = new Date(periodoInicio).getFullYear();
    const anoFim = new Date(periodoFim).getFullYear();

    for (let ano = anoInicio; ano <= anoFim; ano++) {
      const compMarco = `${ano}-03`;
      // Verificar se marco está no período de cálculo
      if (compMarco < periodoInicio.slice(0, 7) || compMarco > periodoFim.slice(0, 7)) continue;

      // Pós-reforma (março 2018+): apenas se autorizado expressamente
      if (compMarco >= '2018-03') {
        if (!(this.csConfig as unknown as Record<string, unknown>).contribuicao_sindical_pos2017) continue;
      }
      // Pré-reforma aplicável até março 2017 (Lei vigente antes de nov/2017)
      // Março 2017 ainda era obrigatória; nov/2017 tornou facultativa
      void REFORMA_DATE; // suppress unused warning

      // Salário em março: buscar no histórico
      let salarioMarco = 0;
      for (const hist of this.historicos) {
        const oc = hist.ocorrencias.find(o => o.competencia.startsWith(compMarco));
        if (oc) { salarioMarco += oc.valor; }
        else if (hist.valor_informado && compMarco >= hist.periodo_inicio.slice(0, 7) && compMarco <= hist.periodo_fim.slice(0, 7)) {
          salarioMarco += hist.valor_informado;
        }
      }
      if (salarioMarco <= 0 && this.params.ultima_remuneracao) {
        salarioMarco = this.params.ultima_remuneracao;
      }
      if (salarioMarco > 0) {
        // 1 dia de salário = salário / 30
        total += Number(new Decimal(salarioMarco).div(30).toDP(2));
      }
    }

    return Number(new Decimal(total).toDP(2));
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
    const refDate = this.params.data_demissao || this.params.data_final || this.correcaoConfig?.data_liquidacao;
    if (!refDate) {
      this.trackWarning('W_SEGURO_SEM_DATA', 'seguro_desemprego', 'data_demissao ausente para lookup de faixas seguro-desemprego — usando primeira competência disponível');
      const competencias = [...new Set(this.seguroDesempregoDB.map(f => f.competencia))].sort().reverse();
      const faixas = this.seguroDesempregoDB.filter(f => f.competencia === competencias[0]).sort((a, b) => a.faixa - b.faixa);
      return faixas.length > 0 ? faixas : null;
    }
    const competencias = [...new Set(this.seguroDesempregoDB.map(f => f.competencia))].sort().reverse();
    const comp = competencias.find(c => c <= refDate) || competencias[0];
    const faixas = this.seguroDesempregoDB.filter(f => f.competencia === comp).sort((a, b) => a.faixa - b.faixa);
    return faixas.length > 0 ? faixas : null;
  }

  private getSalarioFamiliaDB(competencia: string, remuneracao?: number): PjeSalarioFamiliaDB | null {
    if (this.salarioFamiliaDB.length === 0) return null;
    const compDate = competencia + '-01';
    const competencias = [...new Set(this.salarioFamiliaDB.map(f => f.competencia))].sort().reverse();
    const comp = competencias.find(c => c <= compDate) || competencias[0];
    const faixas = this.salarioFamiliaDB
      .filter(f => f.competencia === comp)
      .sort((a, b) => a.faixa - b.faixa);
    if (faixas.length === 0) return null;
    if (remuneracao === undefined) return faixas[0]; // fallback: return first faixa
    // Find the faixa that matches the remuneracao
    for (const f of faixas) {
      if (remuneracao >= f.valor_inicial && remuneracao <= f.valor_final) return f;
    }
    return null; // salary exceeds all faixas — not eligible
  }

  // =====================================================

  calcularHonorarios(principalCorrigido: number, juros: number, fgts: number): { sucumbenciais: number; contratuais: number } {
    let sucumbenciais = 0;
    let contratuais = 0;

    if (this.honorariosConfig.apurar_sucumbenciais) {
      // PJe-Calc: honorários base does NOT include FGTS
      const baseHon = principalCorrigido + juros;
      sucumbenciais = Number(new Decimal(baseHon).times(this.honorariosConfig.percentual_sucumbenciais / 100).toDP(2));
    }

    if (this.honorariosConfig.apurar_contratuais) {
      if (this.honorariosConfig.valor_fixo) {
        contratuais = this.honorariosConfig.valor_fixo;
      } else {
        // PJe-Calc: honorários base does NOT include FGTS
        const baseHon = principalCorrigido + juros;
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
    // Fazenda Pública: multa Art. 523 CPC não se aplica (execução por precatório/RPV — Art. 100 CF/88)
    if (this.correcaoConfig.ente_publico) return 0;
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
      const isADC = this.correcaoConfig.indice === 'IPCA-E' || this.correcaoConfig.indice === 'SELIC';
      const isCombinacoesADC = (this.correcaoConfig as unknown as { combinacoes_indice?: Array<{ indice: string }> })
        .combinacoes_indice?.some(c => c.indice === 'SELIC' || c.indice === 'IPCA-E') ?? false;
      const jurosFromCitacao = this.correcaoConfig.juros_inicio === 'citacao';
      // Independent mode — data_citacao is ALWAYS required, no heuristics allowed.
      const reason = isADC || isCombinacoesADC
        ? 'Modo independente com ADC 58/59 exige data de citação. Preencha em Dados do Processo > Datas Processuais.'
        : jurosFromCitacao
          ? 'juros_inicio=citacao exige data_citacao para base correta dos juros. Preencha em Dados do Processo > Datas Processuais.'
          : 'data_citacao é obrigatória no modo independente para garantir determinismo. Preencha em Dados do Processo > Datas Processuais.';
      itens.push({
        tipo: 'erro', modulo: 'Parâmetros',
        mensagem: `E_CITACAO_OBRIGATORIA: ${reason}`,
        detalhe: 'No modo independente não há estimativa de data_citacao. Informe a data real do mandado de citação.',
      });
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
    // Prescrição bienal: reclamação trabalhista presceve 2 anos após rescisão (art. 7° XXIX CF/88)
    if (this.params.data_ajuizamento && this.params.data_demissao) {
      const dem = new Date(this.params.data_demissao);
      const ajuiz = new Date(this.params.data_ajuizamento);
      const limite = new Date(dem.getFullYear() + 2, dem.getMonth(), dem.getDate());
      if (ajuiz > limite) {
        itens.push({ tipo: 'alerta', modulo: 'Parâmetros', mensagem: `Possível prescrição bienal: ajuizamento (${this.params.data_ajuizamento}) ocorre mais de 2 anos após a rescisão (${this.params.data_demissao}) — art. 7° XXIX CF/88` });
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
      if (v.tipo === 'reflexa') {
        if (!v.verba_principal_id && v.base_calculo.verbas.length === 0) {
          itens.push({ tipo: 'alerta', modulo: 'Verbas', mensagem: `Verba reflexa "${v.nome}" sem verba principal vinculada — será calculada como principal.` });
        }
        if (v.verba_principal_id && !this.verbas.some(vb => vb.id === v.verba_principal_id)) {
          itens.push({ tipo: 'erro', modulo: 'Verbas', mensagem: `Verba reflexa "${v.nome}": verba_principal_id="${v.verba_principal_id}" não encontrada. O reflexo será calculado incorretamente.` });
        }
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
        itens.push({ tipo: 'observacao', modulo: 'Verbas', mensagem: `Férias "${v.nome}" com CS ativa — verifique: férias indenizadas são isentas (Decreto 3.048/99 §9°IV); férias gozadas incidem INSS` });
      }
      if (v.caracteristica === 'ferias' && v.tipo_quantidade === 'avos' && v.ocorrencia_pagamento === 'mensal') {
        itens.push({ tipo: 'alerta', modulo: 'Verbas', mensagem: `Verba "${v.nome}": tipo_quantidade=avos com ocorrencia_pagamento=mensal para férias pode gerar super-contagem (12 avos repetidos por competência). Recomendado: ocorrencia_pagamento=periodo_aquisitivo.` });
      }
    }

    // ── Histórico salarial ──
    if (this.historicos.length === 0 && !this.params.ultima_remuneracao && !this.params.maior_remuneracao) {
      itens.push({ tipo: 'erro', modulo: 'Histórico', mensagem: 'Sem histórico salarial e sem remuneração informada — cálculo bloqueado. Cadastre pelo menos um histórico salarial ou informe Última/Maior Remuneração nos parâmetros.', detalhe: 'Sem base salarial, todas as verbas resultarão em R$ 0,00.' });
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

    // Validar que os índices de correção necessários existem ANTES de rodar o cálculo.
    // Índices ausentes usam fator=1 silenciosamente, produzindo resultados incorretos.
    if (this.indicesDB.length > 0 && this.correcaoConfig.data_liquidacao && this.params.data_admissao) {
      const requiredIndices: string[] = [];
      if (this.correcaoConfig.combinacoes_indice?.length) {
        for (const c of this.correcaoConfig.combinacoes_indice) {
          if (c.indice && c.indice !== 'SEM_CORRECAO' && c.indice !== 'Sem Correção' && c.indice !== 'NENHUM') {
            if (!requiredIndices.includes(c.indice)) requiredIndices.push(c.indice);
          }
        }
      } else if (this.correcaoConfig.indice && this.correcaoConfig.indice !== 'nenhum') {
        requiredIndices.push(this.correcaoConfig.indice);
      }
      for (const indice of requiredIndices) {
        const available = this.indicesDB.filter(i => i.indice === indice);
        if (available.length === 0) {
          itens.push({
            tipo: 'erro', modulo: 'Correção',
            mensagem: `E_INDICE_AUSENTE: Índice "${indice}" necessário para correção monetária não encontrado no banco de dados. Todos os valores serão tratados como fator=1 (SEM CORREÇÃO), produzindo resultados incorretos.`,
            detalhe: 'Popule a tabela de índices com a série histórica completa antes de liquidar.',
          });
        }
      }
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

    // ── Validações adicionais PJe-Calc ──

    // Verificar se data de liquidação é posterior ao ajuizamento
    if (this.correcaoConfig.data_liquidacao && this.params.data_ajuizamento) {
      if (this.correcaoConfig.data_liquidacao < this.params.data_ajuizamento) {
        itens.push({ tipo: 'alerta', modulo: 'Correção', mensagem: 'Data de liquidação é anterior ao ajuizamento — verifique as datas' });
      }
    }

    // Verificar verbas com mesma competência duplicada
    const verbaComps = new Map<string, Set<string>>();
    for (const v of this.verbas) {
      if (v.tipo !== 'principal') continue;
      if (!verbaComps.has(v.nome)) verbaComps.set(v.nome, new Set());
      const periodo = this.getPeriodoCalculo();
      const comps = this.getCompetencias(v.periodo_inicio, v.periodo_fim);
      for (const c of comps) {
        if (verbaComps.get(v.nome)!.has(c)) {
          itens.push({ tipo: 'alerta', modulo: 'Verbas', mensagem: `Verba "${v.nome}" com competência duplicada: ${c}` });
          break;
        }
        verbaComps.get(v.nome)!.add(c);
      }
    }

    // Verificar se FGTS está ativado para verbas com incidência FGTS
    const verbasFGTS = this.verbas.filter(v => v.incidencias.fgts);
    if (verbasFGTS.length > 0 && !this.fgtsConfig.apurar) {
      itens.push({ tipo: 'observacao', modulo: 'FGTS', mensagem: `${verbasFGTS.length} verba(s) com incidência FGTS, mas módulo FGTS não ativado` });
    }

    // Verificar 13° salário sem reflexo de férias
    const tem13 = this.verbas.some(v => v.caracteristica === '13_salario');
    const temFerias = this.verbas.some(v => v.caracteristica === 'ferias');
    if (tem13 && !temFerias) {
      itens.push({ tipo: 'observacao', modulo: 'Verbas', mensagem: '13° salário configurado sem verba de férias + 1/3 — verifique se é intencional' });
    }

    // Verificar Art. 130 CLT — férias com faltas
    for (const f of this.ferias) {
      if (f.prazo_dias < 30 && f.prazo_dias > 0) {
        itens.push({ tipo: 'observacao', modulo: 'Férias', mensagem: `Férias "${f.relativas}" com prazo reduzido (${f.prazo_dias}d) — Art. 130 CLT`, detalhe: 'Prazo reduzido por faltas injustificadas no período aquisitivo' });
      }
    }

    // Verificar Súmula 381 TST — correção a partir do mês subsequente
    if (this.correcaoConfig.indice !== 'nenhum' && this.correcaoConfig.epoca === 'mensal') {
      itens.push({ tipo: 'observacao', modulo: 'Correção', mensagem: 'Súmula 381 TST: correção monetária incide a partir do mês subsequente ao da prestação de serviços' });
    }

    // OJ 394 SDI-1 TST — informational note when active
    if (this.correcaoConfig.oj_394_juros_pos_ir) {
      itens.push({
        tipo: 'observacao', modulo: 'Correção',
        mensagem: 'OJ 394 SDI-1 TST: juros de mora serão recalculados sobre a base pós-IR (após dedução proporcional do imposto de renda).',
        detalhe: 'OJ 394 determina que os juros de mora incidem sobre o valor da condenação já deduzido o IR. O recálculo é aplicado após a apuração do IR no método liquidar().',
      });
    }

    // ── Fazenda Pública ──
    if (this.correcaoConfig.ente_publico) {
      // Interest must be SELIC only for public entities
      if (this.correcaoConfig.juros_tipo === 'simples_mensal' && (this.correcaoConfig.juros_percentual ?? 1) > 0) {
        itens.push({
          tipo: 'alerta', modulo: 'Correção',
          mensagem: 'Fazenda Pública: juros devem ser limitados à taxa SELIC (EC 113/2021, Art. 3°). Juros simples de 1% a.m. não se aplicam contra ente público.',
          detalhe: 'Recomenda-se utilizar índice SELIC que já engloba correção + juros.',
        });
      }
      // Multa 523 does not apply
      if (this.correcaoConfig.multa_523) {
        itens.push({
          tipo: 'alerta', modulo: 'Execução',
          mensagem: 'Fazenda Pública: Multa Art. 523 §1° CPC não se aplica — execução contra ente público é por precatório/RPV (Art. 100 CF/88). Multa será zerada automaticamente.',
        });
      }
      itens.push({
        tipo: 'observacao', modulo: 'Execução',
        mensagem: 'Fazenda Pública: classificação Precatório vs RPV será apurada com base no valor total da condenação (Art. 100 §3° CF/88).',
        detalhe: 'RPV: até 60 SM (Federal), 40 SM (Estadual) ou 30 SM (Municipal). Utilize classificarPrecatorioRPV() no resultado.',
      });
    }

    // ── Prescrição Intercorrente (Art. 11-A CLT, Lei 13.467/2017) ──
    // Em fase de execução: se mais de 2 anos se passaram desde o último ato executório,
    // há risco de prescrição intercorrente.
    if (this.params.data_ajuizamento && this.correcaoConfig.data_liquidacao) {
      const ajuiz = new Date(this.params.data_ajuizamento);
      const liq = new Date(this.correcaoConfig.data_liquidacao);
      const demissao = this.params.data_demissao ? new Date(this.params.data_demissao) : null;
      // Heuristic: if liquidação is more than 4 years after ajuizamento, case is likely in execution phase
      const anosDesdeAjuizamento = (liq.getTime() - ajuiz.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (anosDesdeAjuizamento > 4) {
        itens.push({
          tipo: 'alerta', modulo: 'Prescrição',
          mensagem: `Art. 11-A CLT (Reforma Trabalhista): verificar prescrição intercorrente — liquidação ocorre ${anosDesdeAjuizamento.toFixed(1)} anos após o ajuizamento. Se houve inércia superior a 2 anos na fase de execução, o crédito pode estar prescrito.`,
          detalhe: 'A prescrição intercorrente (Art. 11-A CLT, incluído pela Lei 13.467/2017) se aplica na fase de execução quando o exequente permanece inerte por mais de 2 anos. O prazo é contado a partir da intimação para cumprimento da obrigação.',
        });
      }
    }

    // ── Reforma Trabalhista (Lei 13.467/2017) ──
    if (this.params.data_admissao && this.correcaoConfig.data_liquidacao) {
      const periodo = this.getPeriodoCalculo();
      if (periodo.inicio < REFORMA_DATE && periodo.fim >= REFORMA_DATE) {
        itens.push({
          tipo: 'alerta', modulo: 'Reforma Trabalhista',
          mensagem: 'O período de cálculo abrange a Reforma Trabalhista (Lei 13.467/2017, vigência 11/11/2017). Verbas como intervalo intrajornada podem ter natureza jurídica diferente antes e depois da Reforma.',
          detalhe: 'Verifique se as incidências das verbas estão configuradas corretamente para cada período.',
        });

        // Check for intrajornada verbas specifically
        const verbasIntrajornada = this.verbas.filter(v => (v.caracteristica as string) === 'intrajornada');
        for (const v of verbasIntrajornada) {
          const rulesInicio = getReformaRules(v.periodo_inicio);
          const rulesFim = getReformaRules(v.periodo_fim);
          if (rulesInicio.intervalo_natureza !== rulesFim.intervalo_natureza) {
            itens.push({
              tipo: 'alerta', modulo: 'Reforma Trabalhista',
              mensagem: `Verba "${v.nome}" (intrajornada) abrange período pré e pós-Reforma: natureza remuneratória (com reflexos) até 10/11/2017 e indenizatória (sem reflexos) a partir de 11/11/2017 (Art. 71 §4° CLT).`,
              detalhe: 'Considere dividir a verba em dois períodos com incidências distintas para cada natureza jurídica.',
            });
          }
        }
      }
    }

    // ── Seguro-Desemprego: parcelas vs. tempo de serviço (Lei 7.998/90 art. 4°) ──
    if (this.seguroConfig.apurar && this.params.data_admissao) {
      const refDem = this.params.data_demissao || this.params.data_final || this.correcaoConfig?.data_liquidacao;
      if (refDem) {
        const adm = new Date(this.params.data_admissao);
        const dem = new Date(refDem);
        const mesesServico = (dem.getFullYear() - adm.getFullYear()) * 12 + (dem.getMonth() - adm.getMonth());
        const parcelasMaximas = mesesServico >= 24 ? 5 : mesesServico >= 12 ? 4 : 3;
        if (this.seguroConfig.parcelas > parcelasMaximas) {
          itens.push({
            tipo: 'alerta', modulo: 'Seguro-Desemprego',
            mensagem: `Seguro-desemprego: ${this.seguroConfig.parcelas} parcelas informadas, mas o tempo de serviço (${mesesServico} meses) autoriza no máximo ${parcelasMaximas} parcelas (Lei 7.998/90 art. 4°). Verifique se há vínculos anteriores que ampliam o direito.`,
          });
        }
      }
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
      this.aplicarCorrecaoCombinacaoSomente(verbaResults);
      return;
    }

    // Legacy single-index correction only
    const compLiq = this.correcaoConfig.data_liquidacao.slice(0, 7);
    const usarADC = this.correcaoConfig.indice === 'IPCA-E' || this.correcaoConfig.indice === 'SELIC';
    let dataCitacaoSomente: Date | null = null;
    if (this.params.data_citacao) {
      dataCitacaoSomente = new Date(this.params.data_citacao);
    } else {
      // Sem fallback no modo independente.
      dataCitacaoSomente = null;
    }

    for (const vr of verbaResults) {
      let totalCorrigido = new Decimal(0);
      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;

        let indiceCorrecao = 1;

        if (usarADC && dataCitacaoSomente) {
          // ADC 58/59 split: in juros_apos_deducao_cs mode, "correction only" = IPCA-E up to citação.
          // SELIC (citação → liquidação) is the interest portion → applied later by aplicarJurosAposCS.
          const [ano, mes] = oc.competencia.split('-').map(Number);
          const dataComp = new Date(ano, mes - 1, 1);
          const compCitacao = dataCitacaoSomente.toISOString().slice(0, 7);

          if (dataComp >= dataCitacaoSomente) {
            // POST-citação: correction base = nominal (SELIC from comp→liq is 100% interest)
            indiceCorrecao = 1;
          } else {
            // PRE-citação: correction = IPCA-E(comp → citação)
            const fatorIPCA = this.getIndiceCorrecaoDB('IPCA-E', oc.competencia, compCitacao);
            if (fatorIPCA !== null) {
              indiceCorrecao = fatorIPCA;
            } else {
              this.trackWarning('W049', 'correcao_monetaria', `IPCA-E ausente para ${oc.competencia}→${compCitacao} (ADC correção-only). Usando fator=1.`, oc.competencia);
              indiceCorrecao = 1;
            }
          }
        } else {
          const fatorDB = this.getIndiceCorrecaoDB(this.correcaoConfig.indice, oc.competencia, compLiq);
          if (fatorDB !== null) {
            indiceCorrecao = fatorDB;
          } else {
            this.trackWarning('W049', 'correcao_monetaria', `Índice ${this.correcaoConfig.indice} ausente para ${oc.competencia}→${compLiq} (correção-only). Usando fator=1.`, oc.competencia);
          }
        }

        const valorCorrigido = Number(new Decimal(oc.diferenca).times(indiceCorrecao).toDP(2, Decimal.ROUND_HALF_EVEN));
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

    const normalizeIndice = (ind: string) => this.normalizeIndice(ind);

    for (const vr of verbaResults) {
      let totalCorrigido = new Decimal(0);
      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;
        
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
          // In juros_apos_deducao_cs mode:
          // - SEM_CORRECAO with SELIC juros (ADC 58/59): apply SELIC as correction factor here
          //   (it replaces BOTH correction and interest — no separate juros needed)
          // - Pure SEM_CORRECAO without SELIC: skip
          // - SELIC as direct index: skip (handled in juros phase)
          if (indice === 'SEM_CORRECAO' || indice === 'NENHUM' || indice === 'Sem Correção') {
            // Check if juros regime is SELIC → apply SELIC as correction (ADC 58/59)
            const regJ = this.getRegimeParaData(this.correcaoConfig.combinacoes_juros || [], segInicio);
            if (regJ && regJ.tipo === 'SELIC') {
              // SELIC replaces both correction and interest for this segment
              const selicSum = this.indicesDB
                .filter(idx => (idx.indice === 'SELIC' || idx.indice === 'selic') && idx.competencia.slice(0, 7) >= segInicio.slice(0, 7) && idx.competencia.slice(0, 7) < segFim.slice(0, 7))
                .reduce((s, idx) => s + (idx.valor || 0), 0);
              if (selicSum > 0) {
                fatorTotal = fatorTotal.times(new Decimal(1).plus(new Decimal(selicSum).div(100)));
              }
            }
            continue;
          }
          if (indice === 'SELIC') continue;
          const fatorDB = this.getIndiceCorrecaoDB(indice, this.mesAnterior(segInicio.slice(0, 7)), segFim.slice(0, 7));
          if (fatorDB !== null && fatorDB > 0) {
            fatorTotal = fatorTotal.times(fatorDB);
          } else {
            this.trackWarning('W050', 'correcao_monetaria', `Índice ${indice} ausente para ${segInicio}→${segFim} (correção-only combinação). Usando fator=1.`, segInicio.slice(0, 7));
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

    // Combinations are populated (either from PJC or auto-built ADC 58/59)

    // Determine interest start date
    let jurosStartDate: string | null = null;
    if (this.correcaoConfig.juros_inicio === 'ajuizamento' && this.params.data_ajuizamento) {
      jurosStartDate = this.params.data_ajuizamento;
    } else if (this.correcaoConfig.juros_inicio === 'citacao' && this.params.data_citacao) {
      jurosStartDate = this.params.data_citacao;
    }
    const jurosDisabled = jurosStartDate != null && jurosStartDate > dataLiq;

    const normalizeIndice = (ind: string) => this.normalizeIndice(ind);

    // ADC 58/59 regime: check if any combination uses IPCA-E or SELIC
    const combIndices = this.correcaoConfig.combinacoes_indice || [];
    const combJuros = this.correcaoConfig.combinacoes_juros || [];
    const usarADCJuros = this.correcaoConfig.indice === 'IPCA-E' || this.correcaoConfig.indice === 'SELIC'
      || this.correcaoConfig.indice === 'COMBINACAO'
      || combIndices.some(c => c.indice === 'SELIC' || c.indice === 'IPCA-E' || c.indice === 'IPCAE')
      || combJuros.some(c => c.tipo === 'SELIC');

    for (const vr of verbaResults) {
      let totalJuros = 0;
      let totalFinal = 0;

      // Súmula 439 TST: lookup original verba for sumula_439_tst flag
      const verbaOriginalAposCS = this.verbas.find(v => v.id === vr.verba_id);
      // Súmula 439 TST: override interest start to ajuizamento for dano moral verbas
      let effectiveJurosStartAposCS = jurosStartDate;
      if (verbaOriginalAposCS?.sumula_439_tst && this.params.data_ajuizamento) {
        effectiveJurosStartAposCS = this.params.data_ajuizamento;
      }

      // PJe-Calc excludes FÉRIAS, 13° SALÁRIO and AVISO PRÉVIO from interest in ADC 58/59 regime.
      const excluirJuros = usarADCJuros &&
        (vr.caracteristica === 'ferias' || vr.caracteristica === '13_salario' || vr.caracteristica === 'aviso_previo');
      if (excluirJuros) {
        for (const oc of vr.ocorrencias) { oc.juros = 0; oc.valor_final = oc.valor_corrigido; }
        vr.total_juros = 0;
        vr.total_final = vr.total_corrigido;
        continue;
      }

      for (const oc of vr.ocorrencias) {
        if (oc.valor_corrigido === 0) { totalFinal += oc.valor_final; continue; }

        // Pro-rata CS share for this occurrence
        const csShare = totalCorrigido > 0
          ? Number(new Decimal(totalCSDescontado).times(oc.valor_corrigido).div(totalCorrigido).toDP(2))
          : 0;

        // FIX CICLO-9 #1: base de juros conforme PJe-Calc (default = DIFERENCA)
        const baseJurosRaw: Decimal = (() => {
          const cfg = this.correcaoConfig.base_de_juros_das_verbas;
          if (cfg === 'CORRIGIDO') return new Decimal(oc.valor_corrigido);
          if (cfg === 'DEVIDO') return new Decimal(oc.devido);
          return new Decimal(oc.diferenca);
        })();
        const baseJuros = baseJurosRaw.minus(csShare);

        if (!jurosDisabled && combinacoes_juros.length > 0 && combinacoes_indice.length > 0) {
          const compDate = oc.competencia.length === 7 ? oc.competencia + '-01' : oc.competencia;
          const jurosEffectiveStart = effectiveJurosStartAposCS || compDate;
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
            // SEM_CORRECAO/NENHUM = suspended period → no interest.
            // SELIC: when juros_apos_deducao_cs=true, SELIC IS the interest (correction phase already ran via aplicarCorrecaoCombinacaoSomente).
            //        when juros_apos_deducao_cs=false, SELIC already includes interest in the correction factor → skip to avoid double-counting.
            // SEM_CORRECAO: skip juros UNLESS juros regime is SELIC (ADC 58/59 post-ajuizamento)
            {
              const regJCheck2 = this.getRegimeParaData(this.correcaoConfig.combinacoes_juros || [], segInicio);
              if (indiceNorm === 'SEM_CORRECAO' || indiceNorm === 'Sem Correção' || indiceNorm === 'NENHUM') {
                // SEM_CORRECAO: SELIC was already applied as correction — skip ALL juros
                continue;
              }
            }
            // SELIC = correction + interest (ADC 58/59) — NEVER add separate juros
            if (indiceNorm === 'SELIC') continue;

            const regimeJ = this.getRegimeParaData(combinacoes_juros, segInicio);
            if (!regimeJ || regimeJ.tipo === 'NENHUM') continue;

            const meses = this.mesesEntreInclusivo(new Date(segInicio), new Date(segFim));
            if (regimeJ.tipo === 'SELIC') {
              // PJe-Calc uses SIMPLE SUM of monthly SELIC rates
              const startC = segInicio.slice(0, 7);
              const endC = segFim.slice(0, 7);
              const selicSum = this.indicesDB
                .filter(idx => (idx.indice === 'SELIC' || idx.indice === 'selic') && idx.competencia.slice(0, 7) >= startC && idx.competencia.slice(0, 7) < endC)
                .reduce((s, idx) => s + (idx.valor || 0), 0);
              if (selicSum > 0) {
                jurosAcc = jurosAcc.plus(baseJuros.times(selicSum / 100));
              } else {
                this.trackWarning('W_SELIC_MENSAL_AUSENTE', 'juros',
                  `SELIC: taxas mensais ausentes para ${startC}→${endC}. Usando ratio acumulado.`, startC);
                const fatorS = this.getIndiceCorrecaoDB('SELIC', this.mesAnterior(startC), endC);
                if (fatorS !== null) jurosAcc = jurosAcc.plus(baseJuros.times(fatorS - 1));
              }
            } else if (regimeJ.tipo === 'TAXA_LEGAL') {
              const fatorTL = this.getIndiceCorrecaoDB('TAXA_LEGAL', this.mesAnterior(segInicio.slice(0, 7)), segFim.slice(0, 7));
              if (fatorTL !== null) jurosAcc = jurosAcc.plus(baseJuros.times(fatorTL - 1));
            } else if (regimeJ.tipo === 'TRD_SIMPLES' || regimeJ.tipo === 'TR' || regimeJ.tipo === 'TRD') {
              // TRD Juros Simples — usa série TR (zerada pós-2017 por Lei 12.703/2012)
              const fatorTR = this.getIndiceCorrecaoDB('TR', this.mesAnterior(segInicio.slice(0, 7)), segFim.slice(0, 7));
              if (fatorTR !== null && fatorTR > 1) {
                jurosAcc = jurosAcc.plus(baseJuros.times(fatorTR - 1));
              }
            } else {
              const taxa = ((regimeJ as any).percentual ?? 1) / 100;
              jurosAcc = jurosAcc.plus(baseJuros.times(taxa).times(meses));
            }
          }
          oc.juros = jurosAcc.toDP(2).toNumber();
        } else if (!jurosDisabled && combinacoes_indice.length > 0) {
          // No juros combinations, but index combinations exist — respect index regime
          // Skip interest during SELIC/SEM_CORRECAO periods (they include interest or suspend it)
          const compDate = oc.competencia.length === 7 ? oc.competencia + '-01' : oc.competencia;
          const jurosEffectiveStart = effectiveJurosStartAposCS || compDate;
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
            // SEM_CORRECAO/NENHUM = suspended period → no interest.
            // SELIC: when juros_apos_deducao_cs=true, SELIC IS the interest (correction phase already ran).
            //        when juros_apos_deducao_cs=false, SELIC already includes interest → skip.
            // SEM_CORRECAO: skip juros UNLESS juros regime is SELIC (ADC 58/59 post-ajuizamento)
            {
              const regJCheck2 = this.getRegimeParaData(this.correcaoConfig.combinacoes_juros || [], segInicio);
              if (indiceNorm === 'SEM_CORRECAO' || indiceNorm === 'Sem Correção' || indiceNorm === 'NENHUM') {
                // SEM_CORRECAO: SELIC was already applied as correction — skip ALL juros
                continue;
              }
            }
            // SELIC = correction + interest (ADC 58/59) — NEVER add separate juros
            if (indiceNorm === 'SELIC') continue;
            // PJe-Calc counts interest months inclusive of start month
            const meses = this.mesesEntreInclusivo(new Date(segInicio), new Date(segFim));
            const taxa = (this.correcaoConfig.juros_percentual ?? 1) / 100;
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
            const usarADC = this.correcaoConfig.indice === 'IPCA-E' || this.correcaoConfig.indice === 'SELIC'
              || this.correcaoConfig.indice === 'COMBINACAO'
              || (this.correcaoConfig.combinacoes_indice || []).some(c => c.indice === 'SELIC' || c.indice === 'IPCA-E' || c.indice === 'IPCAE');
            if (usarADC && this.correcaoConfig.juros_apos_deducao_cs && this.params.data_citacao) {
              // ADC 58/59: interest = SELIC simple sum (dataCitacao → dataLiquidacao)
              // PJe-Calc uses SIMPLE SUM of monthly SELIC rates, not compound ratio.
              const compCitacao = this.params.data_citacao.slice(0, 7);
              const compLiqD = dataLiq.slice(0, 7);
              const selicMonthlySum = this.indicesDB
                .filter(idx => (idx.indice === 'SELIC' || idx.indice === 'selic') && idx.competencia.slice(0, 7) >= compCitacao && idx.competencia.slice(0, 7) < compLiqD)
                .reduce((s, idx) => s + (idx.valor || 0), 0);
              if (selicMonthlySum > 0) {
                oc.juros = Number(baseJuros.times(selicMonthlySum / 100).toDP(2, Decimal.ROUND_HALF_EVEN));
              } else {
                // Fallback: compound ratio if monthly values unavailable
                const fatorSELIC = this.getIndiceCorrecaoDB('SELIC', compCitacao, compLiqD);
                if (fatorSELIC !== null) {
                  oc.juros = Number(baseJuros.times(fatorSELIC - 1).toDP(2, Decimal.ROUND_HALF_EVEN));
                } else {
                  this.trackWarning('W049', 'juros', `SELIC ausente para ${compCitacao}→${compLiqD} (juros ADC 58/59 legacy). Usando 0.`, oc.competencia);
                  oc.juros = 0;
                }
              }
            } else {
              // PJe-Calc: meses de juros contados de forma inclusiva (mês inicial conta)
              const meses = this.mesesEntreInclusivo(jurosStart, dataLiqD);
              const taxa = (this.correcaoConfig.juros_percentual ?? 1) / 100;
              oc.juros = Number(baseJuros.times(taxa).times(meses).toDP(2, Decimal.ROUND_HALF_EVEN));
            }
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
    const auditTrail: Array<{ step: number; module: string; description: string; competencia?: string; resultado?: number; rubrica?: string }> = [];
    let stepCounter = 0;
    const audit = (module: string, description: string, extra?: { competencia?: string; resultado?: number; rubrica?: string }) => {
      auditTrail.push({ step: ++stepCounter, module, description, ...extra });
    };

    // ── 0. Modo de cálculo ──
    audit('mode', `Modo de cálculo: ${this.params.modo_calculo ?? 'independent'}`);

    // ── 0b. Validação pré-liquidação ──
    const validacao = this.validarPreLiquidacao();
    audit('validacao', `Pré-validação: ${validacao.valido ? 'OK' : validacao.itens.length + ' issues'}`);

    // GARGALO-1: Block calculation when validation has blocking errors (tipo === 'erro')
    const blockingErrors = validacao.itens.filter(i => i.tipo === 'erro');
    if (blockingErrors.length > 0) {
      const errorMsgs = blockingErrors.map(e => e.mensagem).join('; ');
      throw new Error(`Cálculo bloqueado por ${blockingErrors.length} erro(s) de validação: ${errorMsgs}`);
    }

    // ── 1. Topological sort: principals first, then reflexas in dependency order ──
    // This supports reflex-on-reflex (e.g., HE → DSR → 13º s/ DSR)
    const verbaResults: PjeVerbaResult[] = [];
    const processed = new Set<string>();
    // Detectar dependências circulares entre verbas
    const processing = new Set<string>();

    const processVerba = (verba: PjeVerba) => {
      if (processed.has(verba.id)) return;

      // Se a verba já está na pilha de processamento, há dependência circular — ignorar
      if (processing.has(verba.id)) {
        this.trackWarning('W070', 'verbas', `Dependência circular detectada na verba "${verba.nome}" (id=${verba.id}). Ignorando para evitar loop infinito.`);
        return;
      }
      processing.add(verba.id);

      // Process dependencies first (reflex-on-reflex)
      if (verba.verba_principal_id && !processed.has(verba.verba_principal_id)) {
        const dep = this.verbas.find(v => v.id === verba.verba_principal_id);
        if (dep) {
          processVerba(dep);
        } else {
          this.trackWarning('W_REFLEXA_PRINCIPAL_INVALIDA', 'verbas',
            `Verba "${verba.nome}": verba_principal_id="${verba.verba_principal_id}" não existe. Calculando como principal.`);
        }
      }
      for (const depId of (verba.base_calculo?.verbas || [])) {
        if (!processed.has(depId)) {
          const dep = this.verbas.find(v => v.id === depId);
          if (dep) processVerba(dep);
        }
      }

      processed.add(verba.id);
      processing.delete(verba.id);

      if (verba.tipo === 'reflexa' && verba.verba_principal_id) {
        const principalResult = this.verbaResultsMap.get(verba.verba_principal_id);
        if (principalResult) {
          const refResult = this.calcularVerbaReflexa(verba, principalResult);
          verbaResults.push(refResult);
          this.verbaResultsMap.set(verba.id, refResult);
          audit('verba_reflexa', `Reflexo "${verba.nome}" sobre "${principalResult.nome}": total=${refResult.total_diferenca.toFixed(2)}`, { rubrica: verba.nome, resultado: refResult.total_diferenca });
          return;
        }
      }
      const result = this.calcularVerba(verba);
      verbaResults.push(result);
      this.verbaResultsMap.set(verba.id, result);
      audit('verba', `Verba "${verba.nome}": ${result.ocorrencias.length} oc, total=${result.total_diferenca.toFixed(2)}`, { rubrica: verba.nome, resultado: result.total_diferenca });
    };

    // ── Reforma Trabalhista auto-switching (Lei 13.467/2017) ──
    // For intrajornada verbas with periods spanning the Reforma date,
    // auto-adjust incidences: remuneratória (pre) vs indenizatória (post).
    for (const verba of this.verbas) {
      if ((verba.caracteristica as string) === 'intrajornada' && verba.periodo_fim >= '2017-11') {
        const rules = getReformaRules(verba.periodo_inicio || this.params.data_admissao);
        if (rules.intervalo_natureza === 'indenizatoria') {
          // Post-Reforma: intervalo intrajornada é indenizatório — sem reflexos em 13º/férias
          verba.incidencias = { ...verba.incidencias, fgts: false, contribuicao_social: false };
          audit('reforma', `Verba "${verba.nome}": natureza ajustada para indenizatória (pós-Reforma Art. 71 §4° CLT)`);
        }
      }
    }

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
    //   Step B: Calculate CS on corrected values
    //   Step C: Deduct CS share per occurrence
    //   Step D: Apply interest

    let csPreComputed: PjeCSResult | null = null;
    if (this.correcaoConfig.juros_apos_deducao_cs) {
      this.aplicarCorrecaoSomente(verbaResults);
      audit('correcao', 'Correção monetária aplicada (sem juros)');

      csPreComputed = this.calcularCS(verbaResults, true);
      const csDescontadoPreJuros = this.csConfig.cobrar_reclamante ? csPreComputed.total_segurado : 0;
      audit('cs', `CS pré-juros: segurado=${csPreComputed.total_segurado.toFixed(2)}, empregador=${csPreComputed.total_empregador.toFixed(2)}`);

      this.aplicarJurosAposCS(verbaResults, csDescontadoPreJuros);
      audit('juros', 'Juros aplicados após dedução CS');
    } else {
      this.aplicarCorrecaoJuros(verbaResults);
      audit('correcao_juros', 'Correção + juros aplicados');
    }

    // ── 5. FGTS ──
    const fgts = this.calcularFGTS(verbaResults);
    audit('fgts', `FGTS: depósitos=${fgts.total_depositos.toFixed(2)}, multa=${fgts.multa_valor.toFixed(2)}`);

    // ── 6. Contribuição Social ──
    let cs = csPreComputed || this.calcularCS(verbaResults, true);
    audit('cs_final', `CS final: segurado=${cs.total_segurado.toFixed(2)}, empregador=${cs.total_empregador.toFixed(2)}`);

    // INSS monetary update: PJe-Calc treats INSS as a federal tax updated by SELIC
    // from each competência's vencimento to liquidação. The exact methodology produces
    // values that don't match simple SELIC compound or simple sum precisely.
    // INSS calculated independently — no GT scaling in independent mode

    // ── 7. IR ──
    let ir = this.calcularIR(verbaResults, cs);
    audit('ir', `IR: base=${ir.base_calculo.toFixed(2)}, imposto=${ir.imposto_devido.toFixed(2)}`);

    // ── 7b. OJ 394 SDI-1 TST: Recalculate juros on post-IR base ──
    if (this.correcaoConfig.oj_394_juros_pos_ir && ir.imposto_devido > 0) {
      const totalFinal = verbaResults.reduce((s, v) => s + v.total_final, 0);
      for (const vr of verbaResults) {
        for (const oc of vr.ocorrencias) {
          if (oc.valor_final > 0 && totalFinal > 0) {
            const propIR = (oc.valor_final / totalFinal) * ir.imposto_devido;
            const basePostIR = Math.max(0, oc.valor_corrigido - propIR);
            // Recalculate juros on reduced base
            if (oc.juros > 0 && oc.valor_corrigido > 0) {
              const ratio = basePostIR / oc.valor_corrigido;
              oc.juros = Number(new Decimal(oc.juros).times(ratio).toDP(2));
              oc.valor_final = Number(new Decimal(oc.valor_corrigido).plus(oc.juros).toDP(2));
            }
          }
        }
        // Recalculate verba totals
        vr.total_juros = vr.ocorrencias.reduce((s, o) => s + o.juros, 0);
        vr.total_final = vr.ocorrencias.reduce((s, o) => s + o.valor_final, 0);
      }
      audit('oj_394', 'OJ 394 SDI-1 TST: Juros recalculados sobre base pós-IR');
    }

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

    // ── 8e. Abono Pecuniário (Art. 143 CLT) ──
    // Sujeito a IR mas não a INSS — adicionado ao bruto antes do cálculo de IR
    const abonoPecuniario = this.calcularAbonoPecuniario();

    // ── 8d. Contribuição Sindical (art. 578-579 CLT) ──
    const contribuicaoSindical = this.calcularContribuicaoSindical(verbaResults);

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

    const jurosMoraAjustado = jurosMora;

    const honorarios = this.calcularHonorarios(principalCorrigido, jurosMoraAjustado, fgts.total_fgts);
    const valorCondenacao = principalCorrigido + jurosMoraAjustado + fgts.total_fgts;
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

    // PJe-Calc: Bruto = verbas corrigidas + juros + abono pecuniário (FGTS is separate in PJe-Calc's "bruto devido ao reclamante")
    const brutoTotal = Number(new Decimal(principalCorrigido).plus(jurosMoraAjustado).plus(abonoPecuniario).toDP(2));
    
    // Líquido = Bruto + salário família - CS segurado - IR - prev privada - pensão - contrib. sindical
    // Salário família adiciona ao líquido: é crédito do empregado (Art. 65 Lei 8.213/91)
    // Seguro desemprego é benefício governamental separado (não compõe o líquido judicial)
    const liquido = Number(new Decimal(brutoTotal)
      .plus(salarioFamilia.total)
      .minus(csDescontado)
      .minus(ir.imposto_devido)
      .minus(prevPrivada.valor)
      .minus(pensaoTotal)
      .minus(contribuicaoSindical)
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
      juros_mora: Number(new Decimal(jurosMoraAjustado).toDP(2)),
      fgts_total: fgts.total_fgts, cs_segurado: csDescontado, cs_empregador: cs.total_empregador,
      ir_retido: ir.imposto_devido, seguro_desemprego: seguro.total, previdencia_privada: prevPrivada.valor,
      salario_familia: salarioFamilia.total,
      multa_523: multa523, multa_467: multa467, honorarios_sucumbenciais: honorarios.sucumbenciais,
      honorarios_contratuais: honorarios.contratuais, custas: custasResult.total,
      custas_detalhadas: custasResult.detalhadas, pensao_sobre_fgts: pensaoSobreFgts, pensao_total: pensaoTotal,
      contribuicao_sindical: contribuicaoSindical,
      abono_pecuniario: abonoPecuniario,
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

    audit('resumo', `Bruto=${resumo.principal_corrigido.toFixed(2)}, Juros=${resumo.juros_mora.toFixed(2)}, Líquido=${resumo.liquido_reclamante.toFixed(2)}, Total_Reclamada=${resumo.total_reclamada.toFixed(2)}`);

    // ── Build memória de cálculo (audit trail line by line) ──
    // Distribuir INSS e IR proporcionalmente por linha para auditabilidade
    const totalBaseINSS = verbaResults
      .filter(vr => this.verbas.find(v => v.id === vr.verba_id)?.incidencias.contribuicao_social)
      .reduce((s, vr) => s + vr.total_diferenca, 0);
    const totalBaseIR = verbaResults
      .filter(vr => this.verbas.find(v => v.id === vr.verba_id)?.incidencias.irpf)
      .reduce((s, vr) => s + vr.total_diferenca, 0);
    const inssTotal = cs.total_segurado;
    const irTotal = ir.imposto_devido;

    const memoriaLinhas: import('./engine-types').LinhaMemoriaCalculo[] = [];
    for (const vr of verbaResults) {
      const verbaDaLinha = this.verbas.find(v => v.id === vr.verba_id);
      for (const oc of vr.ocorrencias) {
        if (oc.diferenca === 0) continue;
        const inssLinha = (verbaDaLinha?.incidencias.contribuicao_social && totalBaseINSS > 0 && inssTotal > 0)
          ? Number(new Decimal(inssTotal).times(oc.diferenca).div(totalBaseINSS).toDP(2))
          : 0;
        const irLinha = (verbaDaLinha?.incidencias.irpf && totalBaseIR > 0 && irTotal > 0)
          ? Number(new Decimal(irTotal).times(oc.diferenca).div(totalBaseIR).toDP(2))
          : 0;
        memoriaLinhas.push({
          verba_id: vr.verba_id,
          verba_nome: vr.nome,
          competencia: oc.competencia.slice(0, 7),
          base: oc.base,
          divisor: oc.divisor ?? 0,
          multiplicador: oc.multiplicador ?? 1,
          quantidade: oc.quantidade ?? 0,
          dobra: oc.dobra ?? 1,
          devido: oc.devido,
          pago: oc.pago,
          diferenca: oc.diferenca,
          indice_correcao: this.correcaoConfig.indice || 'N/A',
          fator_correcao: oc.indice_correcao ?? 1,
          valor_corrigido: oc.valor_corrigido,
          data_inicio_juros: this.params.data_ajuizamento || '',
          dias_juros: 0,
          taxa_juros: oc.valor_corrigido > 0 && oc.juros > 0 ? Number(new Decimal(oc.juros).div(oc.valor_corrigido).times(100).toDP(2)) : 0,
          valor_juros: oc.juros,
          valor_final: oc.valor_final,
          inss_segurado: inssLinha,
          ir_retido: irLinha,
          regime_correcao: 'engine',
          era_temporal: '',
        });
      }
    }

    const memoriaCalculo: import('./engine-types').MemoriaCalculo = {
      processo: this.params.case_id,
      data_liquidacao: this.correcaoConfig.data_liquidacao,
      data_geracao: new Date().toISOString().slice(0, 10),
      reclamante: '',
      reclamado: '',
      data_admissao: this.params.data_admissao,
      data_demissao: this.params.data_demissao || '',
      linhas: memoriaLinhas,
      totais: {
        valor_principal: resumo.principal_bruto,
        correcao_monetaria: Number(
          verbaResults.reduce((s, vr) => s.plus(vr.total_corrigido).minus(vr.total_diferenca), new Decimal(0)).toDP(2)
        ),
        juros_moratorios: resumo.juros_mora,
        total_bruto: Number(new Decimal(resumo.principal_corrigido).plus(resumo.juros_mora).toDP(2)),
        inss_segurado: resumo.cs_segurado,
        inss_empregador: resumo.cs_empregador,
        ir_retido: resumo.ir_retido,
        fgts_devido: resumo.fgts_total,
        multa_fgts: 0,
        custas: resumo.custas,
        honorarios: resumo.honorarios_sucumbenciais + resumo.honorarios_contratuais,
        liquido_exequente: resumo.liquido_reclamante,
      },
      indices_status: {
        ultimo_mes_disponivel: '',
        meses_de_atraso: 0,
        desatualizado: false,
      },
      warnings: this.calculationWarnings.map(w =>
        `[${w.code}]${w.competencia ? ` ${w.competencia}` : ''} ${w.message}`
      ),
    };

    return {
      data_liquidacao: this.correcaoConfig.data_liquidacao,
      verbas: verbaResults, fgts, contribuicao_social: cs, imposto_renda: ir,
      seguro_desemprego: seguro, previdencia_privada: prevPrivada, salario_familia: salarioFamilia, resumo, validacao,
      audit_trail: auditTrail,
      calculation_warnings: this.calculationWarnings.length > 0 ? [...this.calculationWarnings] : undefined,
      memoria_calculo: memoriaCalculo,
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
      // getSalarioFamiliaDB(comp, remuneracao) retorna a faixa correta ou null se inelegível
      const sfDB = this.getSalarioFamiliaDB(comp, remuneracao);
      if (!sfDB) {
        // Se sem DB, verificar contra fallback hardcoded (faixa 1 apenas)
        if (remuneracao > SALARIO_FAMILIA_2025.limite_remuneracao) continue;
      }
      const valorCotaRef = sfDB ? sfDB.valor_cota : SALARIO_FAMILIA_2025.valor_cota;

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
  // ABONO PECUNIÁRIO (Art. 143 CLT)
  // =====================================================

  /**
   * Calcula o abono pecuniário das férias (Art. 143 CLT).
   * O empregado pode converter 1/3 dos dias de férias em valor em dinheiro.
   * Fórmula: abono = salário × (abono_dias / 30)
   * Incidências: IR = sim; INSS = não; FGTS = não (idêntico ao PJe-Calc)
   */
  calcularAbonoPecuniario(): number {
    let total = 0;
    for (const f of this.ferias) {
      if (!f.abono) continue;
      // PJe-Calc: abono pecuniário (Art. 143 CLT) is only separately computed for
      // indenizadas/não-gozadas férias. For gozadas férias, the employer already paid
      // the abono; any underpayment difference is captured via the férias verba.
      // Adding abono separately for gozadas would double-count with verbas.
      if (f.situacao === 'gozadas' || f.situacao === 'gozadas_parcialmente') continue;
      const abonoDias = f.abono_dias ?? Math.floor(f.prazo_dias / 3);
      if (abonoDias <= 0) continue;

      // Determinar competência de referência = fim do período aquisitivo
      const compRef = f.periodo_aquisitivo_fim.slice(0, 7);

      // Obter salário base na competência de referência
      let salarioBase = 0;
      for (const hist of this.historicos) {
        const oc = hist.ocorrencias.find(o => o.competencia === compRef);
        if (oc) salarioBase += oc.valor;
      }
      if (salarioBase === 0) salarioBase = this.params.ultima_remuneracao || 0;

      // Valor do abono = salário × (abono_dias / 30)
      const valorAbono = Number(new Decimal(salarioBase).times(abonoDias).div(30).toDP(2));
      total += valorAbono;
    }
    return Number(new Decimal(total).toDP(2));
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

  /**
   * Deterministic competencia for reflexa verba — NEVER uses new Date().
   * Falls back through data_demissao → data_final → data_liquidacao.
   */
  private getCompetenciaDesligamento(): string {
    const d = this.params.data_demissao || this.params.data_final || this.correcaoConfig?.data_liquidacao;
    if (!d) {
      throw new Error('E_DATA_OBRIGATORIA: data_demissao é obrigatória para determinar competência de verba reflexa');
    }
    return d.slice(0, 7);
  }

  private calcularVerbaReflexa(reflexa: PjeVerba, principalResult: PjeVerbaResult): PjeVerbaResult {
    const comportamento = reflexa.comportamento_reflexo || 'valor_mensal';
    const ocorrencias: PjeOcorrenciaResult[] = [];
    // FIX #4: Acumular totais com Decimal.js
    let totalDevido = new Decimal(0), totalPago = new Decimal(0), totalDiferenca = new Decimal(0);

    // Base Integralization (Fase 6): converter meses fracionários em meses completos
    // PJe-Calc integraliza a base antes de aplicar a fórmula de reflexo quando configurado.
    // Aplica-se a qualquer reflexa com integralizar=true (férias, 13º, DSR, etc.)
    const shouldIntegralizar = reflexa.base_calculo.integralizar;

    switch (comportamento) {
      case 'valor_mensal': {
        for (const oc of principalResult.ocorrencias) {
          let baseValor: number;
          if (shouldIntegralizar && oc.devido_integral !== undefined) {
            // devido_integral = valor do mês completo pré-calculado em calcularOcorrencia
            const pagoIntegral = (oc.devido_integral > 0 && oc.devido > 0)
              ? Number(new Decimal(oc.pago).times(oc.devido_integral).div(oc.devido).toDP(2))
              : oc.pago;
            baseValor = reflexa.gerar_verba_reflexa === 'devido'
              ? oc.devido_integral
              : Math.max(0, oc.devido_integral - pagoIntegral);
          } else {
            baseValor = reflexa.gerar_verba_reflexa === 'devido' ? oc.devido : oc.diferenca;
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
          const media = valores.length > 0 ? valores.reduce((s, v) => new Decimal(s).plus(v), new Decimal(0)).div(valores.length).toDP(2).toNumber() : 0;

          // Determine competencia for this group
          let comp: string;
          if (periodoMedia === 'ano_civil') {
            comp = `${grupoKey}-12`; // December of the year
          } else if (periodoMedia === 'periodo_aquisitivo') {
            // Use end of acquisition period
            const parts = grupoKey.split('_');
            comp = parts.length > 1 ? parts[1].slice(0, 7) : (this.getCompetenciaDesligamento());
          } else {
            comp = this.getCompetenciaDesligamento();
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
        const comp = this.getCompetenciaDesligamento();
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
        const comp = this.getCompetenciaDesligamento();
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
            comp = parts.length > 1 ? parts[1].slice(0, 7) : (this.getCompetenciaDesligamento());
          } else {
            comp = this.getCompetenciaDesligamento();
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
        const media = valores.length > 0 ? valores.reduce((s, v) => new Decimal(s).plus(v), new Decimal(0)).div(valores.length).toDP(2).toNumber() : 0;
        const comp = this.getCompetenciaDesligamento();
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
  if (resultados.length === 0) {
    throw new Error('liquidarMultiVinculo: nenhum vínculo fornecido');
  }
  const consolidado = { ...resultados[0].resultado };
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
      abono_pecuniario: resultados.reduce((s, r) => s + (r.resultado.resumo.abono_pecuniario ?? 0), 0),
      liquido_reclamante: resultados.reduce((s, r) => s + r.resultado.resumo.liquido_reclamante, 0),
      total_reclamada: resultados.reduce((s, r) => s + r.resultado.resumo.total_reclamada, 0),
    };

    // Merge validações from all vinculos
    const allItens = resultados.flatMap(r =>
      (r.resultado.validacao?.itens || []).map(it => ({ ...it, mensagem: `[${r.label}] ${it.mensagem}` }))
    );
    if (allItens.length > 0) {
      consolidado.validacao = {
        valido: allItens.every(i => i.tipo !== 'erro'),
        itens: allItens,
        erros: allItens.filter(i => i.tipo === 'erro').length,
        alertas: allItens.filter(i => i.tipo === 'alerta').length,
        observacoes: allItens.filter(i => i.tipo === 'observacao').length,
      };
    }

    // Merge calculation_warnings from all vinculos
    const allWarnings = resultados.flatMap(r =>
      (r.resultado.calculation_warnings || []).map(w => ({ ...w, module: `[${r.label}] ${w.module}` }))
    );
    if (allWarnings.length > 0) {
      consolidado.calculation_warnings = allWarnings;
    }
  }

  // Warning: INSS e IR calculados separadamente por vínculo, sem consolidação
  if (resultados.length > 1) {
    if (!consolidado.calculation_warnings) consolidado.calculation_warnings = [];
    consolidado.calculation_warnings.unshift({
      code: 'W_MULTIVINCULO_CONSOLIDACAO',
      module: 'multi_vinculo',
      message: 'Múltiplos vínculos: INSS e IR foram apurados separadamente por vínculo. '
        + 'O teto previdenciário (art. 33 §2° Decreto 3.048/99) e a base acumulada de IR '
        + 'podem precisar de ajuste manual quando o total dos vínculos simultâneos '
        + 'ultrapassa os limites individuais.',
    });
  }

  return { vinculos: resultados, consolidado };
}
