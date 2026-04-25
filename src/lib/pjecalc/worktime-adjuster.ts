/**
 * =====================================================
 * MOTOR DE AJUSTE DE JORNADA POR SENTENÇA
 * =====================================================
 * 
 * Transforma cartões de ponto originais em cartões "ajustados"
 * conforme regras deferidas na sentença, com rastreabilidade por dia.
 * 
 * REGRAS SUPORTADAS:
 * A) add_before_minutes - Acréscimo antes da entrada
 * B) add_after_minutes  - Acréscimo após a saída
 * C) fixed_break_minutes - Intervalo fixado pela sentença
 * D) reduce_break_minutes - Intervalo suprimido em Y minutos
 */

// =====================================================
// TYPES
// =====================================================

export interface WorktimeRule {
  add_before_minutes?: number | null;
  add_after_minutes?: number | null;
  fixed_break_minutes?: number | null;
  reduce_break_minutes?: number | null;
}

export interface SentencaRuleset {
  id: string;
  case_id: string;
  nome: string;
  texto_sentenca?: string | null;
  rules: WorktimeRule;
  date_range_start?: string | null;
  date_range_end?: string | null;
  apply_days?: string[];
  ativo: boolean;
}

export interface DailyRecord {
  id?: string;
  data: string; // YYYY-MM-DD
  entrada_1: string; // HH:MM
  saida_1: string;
  entrada_2?: string;
  saida_2?: string;
  entrada_3?: string;
  saida_3?: string;
  dia_semana?: number; // 0=dom
  observacoes?: string;
}

export interface AdjustedRecord {
  data: string;
  ponto_diario_id?: string;
  original: {
    entrada: string;
    saida: string;
    intervalo_minutos: number;
  };
  adjusted: {
    entrada: string;
    saida: string;
    intervalo_minutos: number;
  };
  horas_trabalhadas_original: number;
  horas_trabalhadas_ajustadas: number;
  extras_diarias: number;
  applied_rules: string[]; // rule IDs
  applied_rules_desc: string[]; // human-readable
  delta_minutos: number;
  flags: string[];
}

export interface AdjustmentResult {
  records: AdjustedRecord[];
  summary: {
    total_dias: number;
    total_dias_ajustados: number;
    total_extras_horas: number;
    total_delta_minutos: number;
    dias_inconsistentes: number;
  };
  inconsistencies: Array<{ data: string; motivo: string }>;
}

// =====================================================
// HELPERS
// =====================================================

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function minutesToTime(m: number): string {
  // Handle negative or cross-midnight
  while (m < 0) m += 1440;
  m = m % 1440;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function calcHorasEntre(h1: string, h2: string): number {
  if (!h1 || !h2) return 0;
  const m1 = timeToMinutes(h1);
  let m2 = timeToMinutes(h2);
  if (m2 < m1) m2 += 1440; // cross midnight
  return (m2 - m1) / 60;
}

function getDiaSemanaCode(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const codes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  return codes[d.getDay()];
}

// =====================================================
// CORE ENGINE
// =====================================================

/**
 * Aplica um conjunto de regras a um único dia de ponto.
 */
function adjustSingleDay(
  record: DailyRecord,
  rulesets: SentencaRuleset[],
  jornadaDiariaHoras: number,
): AdjustedRecord {
  const diaCode = getDiaSemanaCode(record.data);
  const dateObj = new Date(record.data + 'T12:00:00');
  
  // Determine first entry and last exit
  const entrada = record.entrada_1 || '';
  const saida = record.saida_2 || record.saida_1 || '';
  
  // Calculate original break
  let intervaloOriginalMin = 0;
  if (record.saida_1 && record.entrada_2) {
    intervaloOriginalMin = Math.max(0, timeToMinutes(record.entrada_2) - timeToMinutes(record.saida_1));
  }
  
  // Start with original values
  let entradaMin = timeToMinutes(entrada);
  let saidaMin = timeToMinutes(saida);
  if (saidaMin < entradaMin) saidaMin += 1440;
  let intervaloAjustadoMin = intervaloOriginalMin;
  
  const appliedRuleIds: string[] = [];
  const appliedRulesDesc: string[] = [];
  const flags: string[] = [];
  
  // Filter applicable rulesets
  for (const rs of rulesets) {
    if (!rs.ativo) continue;
    
    // Check date range
    if (rs.date_range_start && record.data < rs.date_range_start) continue;
    if (rs.date_range_end && record.data > rs.date_range_end) continue;
    
    // Check applicable days
    if (rs.apply_days && rs.apply_days.length > 0 && !rs.apply_days.includes(diaCode)) continue;
    
    const rules = rs.rules;
    
    // A) Acréscimo antes da entrada
    if (rules.add_before_minutes && rules.add_before_minutes > 0) {
      entradaMin -= rules.add_before_minutes;
      appliedRuleIds.push(rs.id);
      appliedRulesDesc.push(`+${rules.add_before_minutes}min antes entrada (${rs.nome})`);
    }
    
    // B) Acréscimo após saída
    if (rules.add_after_minutes && rules.add_after_minutes > 0) {
      saidaMin += rules.add_after_minutes;
      appliedRuleIds.push(rs.id);
      appliedRulesDesc.push(`+${rules.add_after_minutes}min após saída (${rs.nome})`);
    }
    
    // C/D/E) Intervalo fixado
    if (rules.fixed_break_minutes != null && rules.fixed_break_minutes >= 0) {
      intervaloAjustadoMin = rules.fixed_break_minutes;
      appliedRuleIds.push(rs.id);
      appliedRulesDesc.push(`Intervalo fixado em ${rules.fixed_break_minutes}min (${rs.nome})`);
    }
    
    // F) Redução de intervalo
    if (rules.reduce_break_minutes && rules.reduce_break_minutes > 0) {
      intervaloAjustadoMin = Math.max(intervaloAjustadoMin - rules.reduce_break_minutes, 0);
      appliedRuleIds.push(rs.id);
      appliedRulesDesc.push(`Intervalo reduzido em ${rules.reduce_break_minutes}min (${rs.nome})`);
    }
  }
  
  // Calculate hours
  const horasOriginais = Math.max(0, ((saidaMin - (saidaMin > 1440 ? 0 : 0)) - entradaMin) / 60);
  // Recalculate with original values for comparison
  const origEntMin = timeToMinutes(entrada);
  let origSaiMin = timeToMinutes(saida);
  if (origSaiMin < origEntMin) origSaiMin += 1440;
  const horasOriginalCalc = Math.max(0, (origSaiMin - origEntMin - intervaloOriginalMin) / 60);
  
  const horasAjustadas = Math.max(0, (saidaMin - entradaMin - intervaloAjustadoMin) / 60);
  const extras = Math.max(0, horasAjustadas - jornadaDiariaHoras);
  const deltaMin = Math.round((horasAjustadas - horasOriginalCalc) * 60);
  
  // Consistency checks
  if (intervaloAjustadoMin > (saidaMin - entradaMin)) {
    flags.push('INCONSISTENTE: intervalo > jornada');
  }
  if (saidaMin - entradaMin > 1440) {
    flags.push('INCONSISTENTE: jornada > 24h');
  }
  if (entradaMin < 0) {
    flags.push('AVISO: entrada ajustada cruza meia-noite anterior');
  }
  
  return {
    data: record.data,
    ponto_diario_id: record.id,
    original: {
      entrada,
      saida,
      intervalo_minutos: intervaloOriginalMin,
    },
    adjusted: {
      entrada: minutesToTime(entradaMin),
      saida: minutesToTime(saidaMin % 1440),
      intervalo_minutos: intervaloAjustadoMin,
    },
    horas_trabalhadas_original: Math.round(horasOriginalCalc * 100) / 100,
    horas_trabalhadas_ajustadas: Math.round(horasAjustadas * 100) / 100,
    extras_diarias: Math.round(extras * 100) / 100,
    applied_rules: [...new Set(appliedRuleIds)],
    applied_rules_desc: appliedRulesDesc,
    delta_minutos: deltaMin,
    flags,
  };
}

/**
 * Aplica todas as regras a um conjunto de registros diários.
 */
export function adjustWorktime(
  records: DailyRecord[],
  rulesets: SentencaRuleset[],
  jornadaDiariaHoras: number = 8,
): AdjustmentResult {
  const activeRulesets = rulesets.filter(r => r.ativo);
  const adjustedRecords: AdjustedRecord[] = [];
  const inconsistencies: Array<{ data: string; motivo: string }> = [];
  
  for (const rec of records) {
    if (!rec.entrada_1 && !rec.saida_1) continue; // skip empty days
    
    const adjusted = adjustSingleDay(rec, activeRulesets, jornadaDiariaHoras);
    adjustedRecords.push(adjusted);
    
    for (const flag of adjusted.flags) {
      if (flag.startsWith('INCONSISTENTE')) {
        inconsistencies.push({ data: rec.data, motivo: flag });
      }
    }
  }
  
  return {
    records: adjustedRecords,
    summary: {
      total_dias: records.length,
      total_dias_ajustados: adjustedRecords.filter(r => r.applied_rules.length > 0).length,
      total_extras_horas: Math.round(adjustedRecords.reduce((s, r) => s + r.extras_diarias, 0) * 100) / 100,
      total_delta_minutos: adjustedRecords.reduce((s, r) => s + r.delta_minutos, 0),
      dias_inconsistentes: inconsistencies.length,
    },
    inconsistencies,
  };
}

// =====================================================
// REGEX PARSER (deterministic, fast)
// =====================================================

export interface ParsedRuleset {
  confidence: number;
  rules: WorktimeRule;
  detected_clauses: Array<{
    type: string;
    text_span: string;
    minutes: number;
    confidence: number;
  }>;
  warnings: string[];
}

function parseMinutesFromText(text: string): number | null {
  // "30 minutos", "45 min", "1 hora", "1h30", "meia hora", "uma hora"
  const meiaHora = /meia\s+hora/i;
  if (meiaHora.test(text)) return 30;
  
  const umaHora = /uma?\s+hora/i;
  if (umaHora.test(text)) return 60;
  
  // "1h30", "2h", "1h30min"
  const hm = text.match(/(\d+)\s*h(?:oras?)?\s*(?:e\s*)?(\d+)?\s*(?:min(?:utos?)?)?/i);
  if (hm) return (parseInt(hm[1]) * 60) + (parseInt(hm[2] || '0'));
  
  // "30 minutos", "45 min"
  const minOnly = text.match(/(\d+)\s*(?:minutos?|min)/i);
  if (minOnly) return parseInt(minOnly[1]);
  
  // bare number in context
  const bareNum = text.match(/(\d+)/);
  if (bareNum) return parseInt(bareNum[1]);
  
  return null;
}

/**
 * Extrai regras de jornada do texto da sentença via regex.
 */
export function parseSentencaRegex(texto: string): ParsedRuleset {
  const rules: WorktimeRule = {};
  const clauses: ParsedRuleset['detected_clauses'] = [];
  const warnings: string[] = [];
  let overallConf = 0;
  
  // Pattern: "laborava por mais X após/antes"
  const afterPattern = /(?:laborava|trabalhava|permanecia).*?(?:por\s+)?mais\s+(.+?)\s+(?:após|depois|além)\s+(?:o\s+)?(?:registro|horário|jornada|término)/gi;
  let m = afterPattern.exec(texto);
  if (m) {
    const mins = parseMinutesFromText(m[1]);
    if (mins) {
      rules.add_after_minutes = mins;
      clauses.push({ type: 'add_after', text_span: m[0], minutes: mins, confidence: 0.9 });
    }
  }
  
  const beforePattern = /(?:laborava|trabalhava|permanecia).*?(?:por\s+)?mais\s+(.+?)\s+(?:antes|anterior)\s+(?:ao?\s+)?(?:registro|horário|jornada|início)/gi;
  m = beforePattern.exec(texto);
  if (m) {
    const mins = parseMinutesFromText(m[1]);
    if (mins) {
      rules.add_before_minutes = mins;
      clauses.push({ type: 'add_before', text_span: m[0], minutes: mins, confidence: 0.9 });
    }
  }
  
  // Pattern: "acréscimo de X na entrada e Y na saída"
  const bothPattern = /acréscimo\s+de\s+(.+?)\s+na\s+entrada\s+e\s+(.+?)\s+na\s+saída/gi;
  m = bothPattern.exec(texto);
  if (m) {
    const before = parseMinutesFromText(m[1]);
    const after = parseMinutesFromText(m[2]);
    if (before) { rules.add_before_minutes = before; clauses.push({ type: 'add_before', text_span: m[0], minutes: before, confidence: 0.85 }); }
    if (after) { rules.add_after_minutes = after; clauses.push({ type: 'add_after', text_span: m[0], minutes: after, confidence: 0.85 }); }
  }
  
  // Pattern: "usufruía apenas X minutos de intervalo"
  const fixedBreak1 = /usufru[ií]a\s+apenas\s+(.+?)\s+(?:de\s+)?intervalo/gi;
  m = fixedBreak1.exec(texto);
  if (m) {
    const mins = parseMinutesFromText(m[1]);
    if (mins) {
      rules.fixed_break_minutes = mins;
      clauses.push({ type: 'fixed_break', text_span: m[0], minutes: mins, confidence: 0.9 });
    }
  }
  
  // Pattern: "intervalo intrajornada reduzido para X"
  const fixedBreak2 = /intervalo\s+(?:intrajornada\s+)?(?:reduzido|fixado|de)\s+(?:para|em)\s+(.+?)(?:\.|,|$)/gi;
  m = fixedBreak2.exec(texto);
  if (m && !rules.fixed_break_minutes) {
    const mins = parseMinutesFromText(m[1]);
    if (mins) {
      rules.fixed_break_minutes = mins;
      clauses.push({ type: 'fixed_break', text_span: m[0], minutes: mins, confidence: 0.85 });
    }
  }
  
  // Pattern: "supressão de intervalo de X"
  const suppressBreak = /supress[ãa]o\s+(?:de\s+)?(?:intervalo\s+)?(?:de\s+)?(.+?)(?:\s+minut|\.|,|$)/gi;
  m = suppressBreak.exec(texto);
  if (m) {
    const mins = parseMinutesFromText(m[1]);
    if (mins) {
      rules.reduce_break_minutes = mins;
      clauses.push({ type: 'reduce_break', text_span: m[0], minutes: mins, confidence: 0.85 });
    }
  }
  
  // Validation warnings
  if (rules.add_before_minutes && rules.add_before_minutes > 300) warnings.push(`add_before_minutes (${rules.add_before_minutes}) > 300: valor atípico`);
  if (rules.add_after_minutes && rules.add_after_minutes > 300) warnings.push(`add_after_minutes (${rules.add_after_minutes}) > 300: valor atípico`);
  if (rules.fixed_break_minutes && rules.fixed_break_minutes > 240) warnings.push(`fixed_break_minutes (${rules.fixed_break_minutes}) > 240: valor atípico`);
  if ((rules.add_before_minutes || 0) + (rules.add_after_minutes || 0) > 300) warnings.push('Soma antes+depois > 300min: verificar');
  
  overallConf = clauses.length > 0 ? clauses.reduce((s, c) => s + c.confidence, 0) / clauses.length : 0;
  
  return { confidence: Math.round(overallConf * 100) / 100, rules, detected_clauses: clauses, warnings };
}
