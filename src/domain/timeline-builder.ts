/**
 * =====================================================
 * TIMELINE BUILDER — Linha do Tempo Mensal
 * =====================================================
 * 
 * Constrói uma visão completa de cada competência do contrato:
 * vínculo, salário, eventos, calendário, CCT, fontes documentais.
 * 
 * Nenhum cálculo descolado do período real.
 */

import type {
  EmploymentContract, ContractEvent, SalaryHistory,
  CalendarInfo, CalendarRule, NormativeRule, EvidenceSource,
  CalculationCompetency, Competencia, DateStr, EvidenceSourceRef,
} from './types';

// =====================================================
// HELPERS
// =====================================================

function parseYearMonth(competencia: Competencia): { year: number; month: number } {
  const [y, m] = competencia.split('-').map(Number);
  return { year: y, month: m };
}

function toCompetencia(year: number, month: number): Competencia {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function dayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay(); // 0=Sun
}

function dateInRange(date: DateStr, start: DateStr, end?: DateStr): boolean {
  return date >= start && (!end || date <= end);
}

// =====================================================
// GENERATE COMPETENCIAS
// =====================================================

export function generateCompetencias(inicio: DateStr, fim: DateStr): Competencia[] {
  const result: Competencia[] = [];
  const startDate = new Date(inicio + 'T00:00:00');
  const endDate = new Date(fim + 'T00:00:00');
  
  let year = startDate.getFullYear();
  let month = startDate.getMonth() + 1;
  
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;
  
  while (year < endYear || (year === endYear && month <= endMonth)) {
    result.push(toCompetencia(year, month));
    month++;
    if (month > 12) { month = 1; year++; }
  }
  
  return result;
}

// =====================================================
// BUILD CALENDAR INFO
// =====================================================

export function buildCalendarInfo(
  competencia: Competencia,
  calendarRules: CalendarRule[],
  sabadoDiaUtil: boolean,
  considerarFeriadoEstadual: boolean,
  considerarFeriadoMunicipal: boolean,
): CalendarInfo {
  const { year, month } = parseYearMonth(competencia);
  const totalDays = daysInMonth(year, month);
  
  // Collect holidays
  const holidays: CalendarInfo['feriados_lista'] = [];
  for (const rule of calendarRules) {
    if (rule.ano !== year) continue;
    for (const f of rule.feriados) {
      const fDate = new Date(f.data + 'T00:00:00');
      if (fDate.getMonth() + 1 !== month) continue;
      if (f.tipo === 'estadual' && !considerarFeriadoEstadual) continue;
      if (f.tipo === 'municipal' && !considerarFeriadoMunicipal) continue;
      holidays.push(f);
    }
  }
  
  const holidayDates = new Set(holidays.map(h => h.data));
  
  let domingos = 0;
  let sabados = 0;
  let diasUteis = 0;
  
  for (let d = 1; d <= totalDays; d++) {
    const dow = dayOfWeek(year, month, d);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isFeriado = holidayDates.has(dateStr);
    
    if (dow === 0) {
      domingos++;
    } else if (dow === 6) {
      sabados++;
      if (sabadoDiaUtil && !isFeriado) diasUteis++;
    } else {
      if (!isFeriado) diasUteis++;
    }
  }
  
  return {
    dias_no_mes: totalDays,
    dias_uteis: diasUteis,
    domingos,
    sabados,
    feriados: holidays.length,
    feriados_lista: holidays,
  };
}

// =====================================================
// RESOLVE SALARY FOR COMPETÊNCIA
// =====================================================

function resolveSalaryForCompetencia(
  histories: SalaryHistory[],
  competencia: Competencia,
): { salario_base: number; variaveis: { rubric_id: string; valor: number }[] } {
  let salario_base = 0;
  const variaveis: { rubric_id: string; valor: number }[] = [];
  
  for (const hist of histories) {
    const record = hist.records.find(r => r.competencia === competencia);
    if (!record) continue;
    
    if (hist.tipo === 'fixo') {
      salario_base = Math.max(salario_base, record.valor);
    } else {
      variaveis.push({ rubric_id: hist.id, valor: record.valor });
    }
  }
  
  // Fallback: use last known fixed salary
  if (salario_base === 0) {
    for (const hist of histories.filter(h => h.tipo === 'fixo')) {
      const sorted = [...hist.records]
        .filter(r => r.competencia <= competencia)
        .sort((a, b) => b.competencia.localeCompare(a.competencia));
      if (sorted.length > 0) {
        salario_base = sorted[0].valor;
        break;
      }
    }
  }
  
  return { salario_base, variaveis };
}

// =====================================================
// RESOLVE CONTRACT EVENTS FOR COMPETÊNCIA
// =====================================================

function resolveEventsForCompetencia(
  events: ContractEvent[],
  competencia: Competencia,
): ContractEvent[] {
  const { year, month } = parseYearMonth(competencia);
  const compStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const compEnd = `${year}-${String(month).padStart(2, '0')}-${daysInMonth(year, month)}`;
  
  return events.filter(e => {
    return e.data_inicio <= compEnd && (!e.data_fim || e.data_fim >= compStart);
  });
}

// =====================================================
// CHECK IF CONTRACT IS ACTIVE
// =====================================================

function isContractActive(
  contract: EmploymentContract,
  competencia: Competencia,
  events: ContractEvent[],
): boolean {
  const { year, month } = parseYearMonth(competencia);
  const compStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const compEnd = `${year}-${String(month).padStart(2, '0')}-${daysInMonth(year, month)}`;
  
  // Check basic contract dates
  if (contract.admissao > compEnd) return false;
  if (contract.demissao && contract.demissao < compStart) return false;
  
  // Check suspensions
  const suspensoes = events.filter(e => 
    e.tipo === 'suspensao' && 
    e.data_inicio <= compStart && 
    (!e.data_fim || e.data_fim >= compEnd)
  );
  
  return suspensoes.length === 0;
}

// =====================================================
// RESOLVE FUNCTION FOR COMPETÊNCIA
// =====================================================

function resolveFuncao(
  contract: EmploymentContract,
  events: ContractEvent[],
  competencia: Competencia,
): string {
  const mudancas = events
    .filter(e => e.tipo === 'mudanca_funcao' && e.data_inicio <= competencia + '-28')
    .sort((a, b) => b.data_inicio.localeCompare(a.data_inicio));
  
  if (mudancas.length > 0 && mudancas[0].detalhes?.['funcao']) {
    return mudancas[0].detalhes['funcao'] as string;
  }
  
  return contract.funcao;
}

// =====================================================
// RESOLVE NORMATIVE RULE FOR COMPETÊNCIA
// =====================================================

function resolveNormativa(
  normatives: NormativeRule[],
  competencia: Competencia,
): NormativeRule | undefined {
  const { year, month } = parseYearMonth(competencia);
  const compDate = `${year}-${String(month).padStart(2, '0')}-15`; // mid-month
  
  return normatives.find(n => 
    dateInRange(compDate, n.vigencia_inicio, n.vigencia_fim)
  );
}

// =====================================================
// RESOLVE EVIDENCE SOURCES FOR COMPETÊNCIA
// =====================================================

function resolveEvidenceSources(
  sources: EvidenceSource[],
  competencia: Competencia,
): EvidenceSourceRef[] {
  const { year, month } = parseYearMonth(competencia);
  const compStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const compEnd = `${year}-${String(month).padStart(2, '0')}-${daysInMonth(year, month)}`;
  
  return sources
    .filter(s => {
      if (!s.periodo_referencia_inicio) return false;
      return s.periodo_referencia_inicio <= compEnd && 
             (!s.periodo_referencia_fim || s.periodo_referencia_fim >= compStart);
    })
    .map(s => ({
      source_id: s.id,
      tipo: s.tipo,
      campo: 'periodo',
      confidence: s.confidence,
    }));
}

// =====================================================
// BUILD TIMELINE — ENTRY POINT
// =====================================================

export interface TimelineBuildParams {
  contract: EmploymentContract;
  calendarRules: CalendarRule[];
  normativeRules: NormativeRule[];
  evidenceSources: EvidenceSource[];
  sabadoDiaUtil: boolean;
  considerarFeriadoEstadual: boolean;
  considerarFeriadoMunicipal: boolean;
  /** Override period (e.g. from judicial title) */
  periodo_inicio?: DateStr;
  periodo_fim?: DateStr;
}

export function buildTimeline(params: TimelineBuildParams): CalculationCompetency[] {
  const {
    contract, calendarRules, normativeRules, evidenceSources,
    sabadoDiaUtil, considerarFeriadoEstadual, considerarFeriadoMunicipal,
  } = params;
  
  const inicio = params.periodo_inicio || contract.admissao;
  const fim = params.periodo_fim || contract.demissao || new Date().toISOString().slice(0, 10);
  
  const competencias = generateCompetencias(inicio, fim);
  const result: CalculationCompetency[] = [];
  
  for (const comp of competencias) {
    const events = resolveEventsForCompetencia(contract.events, comp);
    const vinculoAtivo = isContractActive(contract, comp, events);
    const funcao = resolveFuncao(contract, events, comp);
    const { salario_base, variaveis } = resolveSalaryForCompetencia(contract.salary_histories, comp);
    const calendario = buildCalendarInfo(comp, calendarRules, sabadoDiaUtil, considerarFeriadoEstadual, considerarFeriadoMunicipal);
    const normativa = resolveNormativa(normativeRules, comp);
    const fontes = resolveEvidenceSources(evidenceSources, comp);
    
    result.push({
      competencia: comp,
      vinculo_ativo: vinculoAtivo,
      funcao,
      salario_base,
      rubricas_variaveis: variaveis,
      eventos: events,
      calendario,
      cct_vigente: normativa?.identificador,
      normativa_vigente: normativa,
      fontes,
    });
  }
  
  return result;
}
