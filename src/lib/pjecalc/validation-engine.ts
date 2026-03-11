/**
 * =====================================================
 * MOTOR DE VALIDAÇÕES DETERMINÍSTICAS
 * =====================================================
 * 
 * Checks obrigatórios antes de confirmar dados extraídos.
 * 
 * POLICY:
 * - bloqueante=true → calculation MUST NOT proceed
 * - bloqueante=false → calculation proceeds with warning
 * - Every validation has a structured code (E### or W###)
 */

export interface ValidationResult {
  tipo: string;
  code: string;
  campo?: string;
  competencia?: string;
  mensagem: string;
  severidade: 'info' | 'warning' | 'error';
  bloqueante: boolean;
  sugestao?: string;
  modulo?: string;
}

export interface ValidationInput {
  admissao?: string;
  demissao?: string;
  ajuizamento?: string;
  citacao?: string;
  data_liquidacao?: string;
  inicio_calculo?: string;
  fim_calculo?: string;
  rubricas_raw?: { competencia: string; classificacao: string; valor: number; descricao: string }[];
  resumo_mensal?: { competencia: string; total_vencimentos: number }[];
  apuracao_diaria?: { data: string; minutos_trabalhados: number; frequencia_str: string }[];
  ferias?: { aquisitivo_inicio: string; aquisitivo_fim: string; gozo_inicio?: string; gozo_fim?: string }[];
  afastamentos?: { inicio: string; fim: string; motivo: string }[];
  /** Engine-level validation inputs */
  historicos_count?: number;
  historicos_ocorrencias_count?: number;
  verbas_count?: number;
  cartao_ponto_count?: number;
  apuracao_diaria_xml_count?: number;
  indices_db_count?: number;
  faixas_inss_count?: number;
  faixas_ir_count?: number;
  correcao_indice?: string;
  combinacoes_indice_count?: number;
  combinacoes_juros_count?: number;
}

export function validarExtracoes(input: ValidationInput): ValidationResult[] {
  const results: ValidationResult[] = [];

  // ═══ MANDATORY PARAMETERS ═══

  if (!input.admissao) {
    results.push({
      tipo: 'PARAM_ADMISSAO_MISSING', code: 'E004', campo: 'admissao',
      mensagem: 'Data de admissão não informada',
      severidade: 'error', bloqueante: true, modulo: 'params',
    });
  }

  if (!input.ajuizamento) {
    results.push({
      tipo: 'PARAM_AJUIZAMENTO_MISSING', code: 'E005', campo: 'ajuizamento',
      mensagem: 'Data de ajuizamento não informada — necessária para prescrição e regime ADC 58',
      severidade: 'error', bloqueante: true, modulo: 'params',
    });
  }

  if (!input.data_liquidacao) {
    results.push({
      tipo: 'PARAM_LIQUIDACAO_MISSING', code: 'E006', campo: 'data_liquidacao',
      mensagem: 'Data de liquidação não informada — cálculo será não-determinístico',
      severidade: 'error', bloqueante: true, modulo: 'params',
    });
  }

  // ═══ DATE COHERENCE ═══

  if (input.admissao && input.demissao) {
    if (input.admissao >= input.demissao) {
      results.push({
        tipo: 'DATA_INCOERENTE', code: 'E008', campo: 'admissao/demissao',
        mensagem: `Data de admissão (${input.admissao}) não pode ser posterior à demissão (${input.demissao})`,
        severidade: 'error', bloqueante: true, modulo: 'params',
      });
    }
  }

  if (input.admissao && input.inicio_calculo) {
    if (input.inicio_calculo < input.admissao) {
      results.push({
        tipo: 'PERIODO_ANTERIOR_ADMISSAO', code: 'W050', campo: 'inicio_calculo',
        mensagem: `Início do cálculo (${input.inicio_calculo}) é anterior à admissão (${input.admissao})`,
        severidade: 'warning', bloqueante: false, modulo: 'params',
        sugestao: 'Verifique se há projeção de aviso prévio.',
      });
    }
  }

  if (input.demissao && input.fim_calculo) {
    if (input.fim_calculo > input.demissao) {
      results.push({
        tipo: 'PERIODO_POSTERIOR_DEMISSAO', code: 'I010', campo: 'fim_calculo',
        mensagem: `Fim do cálculo (${input.fim_calculo}) é posterior à demissão (${input.demissao}). Pode estar correto com aviso prévio.`,
        severidade: 'info', bloqueante: false, modulo: 'params',
      });
    }
  }

  if (!input.citacao && input.ajuizamento) {
    results.push({
      tipo: 'CITACAO_AUSENTE', code: 'W039', campo: 'citacao',
      mensagem: 'Data de citação não informada — usando ajuizamento como marco para juros ADC 58',
      severidade: 'warning', bloqueante: false, modulo: 'params',
    });
  }

  // ═══ TABLE AVAILABILITY ═══

  if (input.indices_db_count !== undefined && input.indices_db_count === 0 && input.correcao_indice !== 'SEM_CORRECAO') {
    results.push({
      tipo: 'INDICES_MISSING', code: 'E003', campo: 'indices_db',
      mensagem: 'Nenhum índice de correção monetária disponível',
      severidade: 'error', bloqueante: true, modulo: 'correcao',
      sugestao: 'Sincronizar índices oficiais.',
    });
  }

  if (input.faixas_inss_count !== undefined && input.faixas_inss_count === 0) {
    results.push({
      tipo: 'INSS_TABLE_MISSING', code: 'E010',
      mensagem: 'Tabela INSS (faixas progressivas) ausente — usando padrão 2025',
      severidade: 'warning', bloqueante: false, modulo: 'cs',
      sugestao: 'Carregar tabelas históricas de INSS para maior precisão.',
    });
  }

  if (input.faixas_ir_count !== undefined && input.faixas_ir_count === 0) {
    results.push({
      tipo: 'IR_TABLE_MISSING', code: 'E011',
      mensagem: 'Tabela IR (faixas) ausente — usando padrão 2025',
      severidade: 'warning', bloqueante: false, modulo: 'ir',
      sugestao: 'Carregar tabelas históricas de IR para maior precisão.',
    });
  }

  // ═══ DATA INTEGRITY ═══

  if (input.historicos_count !== undefined && input.historicos_count === 0) {
    results.push({
      tipo: 'HISTORICO_VAZIO', code: 'W001',
      mensagem: 'Nenhum histórico salarial encontrado — fallback sintético pode ser acionado',
      severidade: 'warning', bloqueante: false, modulo: 'historico',
    });
  }

  if (input.apuracao_diaria_xml_count !== undefined && input.apuracao_diaria_xml_count > 0 
      && input.cartao_ponto_count !== undefined && input.cartao_ponto_count === 0) {
    results.push({
      tipo: 'APURACAO_SEM_CARTAO', code: 'E021',
      mensagem: `Apuração diária presente no XML (${input.apuracao_diaria_xml_count} dias) mas cartão de ponto vazio no engine`,
      severidade: 'error', bloqueante: true, modulo: 'cartao_ponto',
      sugestao: 'Bug na bridge — apuração diária não convertida para cartão de ponto.',
    });
  }

  // ═══ RUBRICAS / PGTO ═══

  if (input.rubricas_raw && input.rubricas_raw.length > 0) {
    const pgtoByComp = new Map<string, number>();
    for (const r of input.rubricas_raw) {
      if (r.classificacao === 'PGTO') {
        pgtoByComp.set(r.competencia, (pgtoByComp.get(r.competencia) || 0) + r.valor);
      }
    }

    if (input.resumo_mensal) {
      for (const rm of input.resumo_mensal) {
        const pgtoSum = pgtoByComp.get(rm.competencia);
        if (pgtoSum !== undefined) {
          const diff = Math.abs(pgtoSum - rm.total_vencimentos);
          if (diff > 0.02 * rm.total_vencimentos && diff > 1) {
            results.push({
              tipo: 'SOMA_PGTO_DIVERGENTE', code: 'W008', competencia: rm.competencia,
              mensagem: `Soma PGTO (${pgtoSum.toFixed(2)}) diverge do total (${rm.total_vencimentos.toFixed(2)}) em ${rm.competencia}`,
              severidade: 'warning', bloqueante: false, modulo: 'rubricas',
            });
          }
        }
      }
    }

    const negativos = input.rubricas_raw.filter(r => r.classificacao === 'PGTO' && r.valor < 0);
    if (negativos.length > 0) {
      results.push({
        tipo: 'PGTO_NEGATIVO', code: 'W009',
        mensagem: `${negativos.length} rubrica(s) PGTO com valor negativo. Verifique se são estornos.`,
        severidade: 'warning', bloqueante: false, modulo: 'rubricas',
      });
    }
  }

  // ═══ APURAÇÃO DIÁRIA ═══

  if (input.apuracao_diaria && input.apuracao_diaria.length > 0) {
    const negativeDays = input.apuracao_diaria.filter(d => d.minutos_trabalhados < 0);
    if (negativeDays.length > 0) {
      results.push({
        tipo: 'HORAS_NEGATIVAS', code: 'E030',
        mensagem: `${negativeDays.length} dia(s) com horas negativas na apuração diária`,
        severidade: 'error', bloqueante: true, modulo: 'cartao_ponto',
      });
    }

    const datesSet = new Set<string>();
    const duplicates: string[] = [];
    for (const d of input.apuracao_diaria) {
      if (datesSet.has(d.data)) duplicates.push(d.data);
      datesSet.add(d.data);
    }
    if (duplicates.length > 0) {
      results.push({
        tipo: 'DIAS_DUPLICADOS', code: 'E031',
        mensagem: `${duplicates.length} data(s) duplicada(s): ${duplicates.slice(0, 5).join(', ')}`,
        severidade: 'error', bloqueante: true, modulo: 'cartao_ponto',
      });
    }

    if (input.admissao && input.demissao) {
      const sortedDates = [...datesSet].sort();
      const first = sortedDates[0];
      const last = sortedDates[sortedDates.length - 1];
      if (first < input.admissao) {
        results.push({
          tipo: 'PONTO_ANTERIOR_ADMISSAO', code: 'W050',
          mensagem: `Cartão de ponto com datas anteriores à admissão (${first} < ${input.admissao})`,
          severidade: 'warning', bloqueante: false, modulo: 'cartao_ponto',
        });
      }
      if (last > input.demissao) {
        results.push({
          tipo: 'PONTO_POSTERIOR_DEMISSAO', code: 'W051',
          mensagem: `Cartão de ponto com datas posteriores à demissão (${last} > ${input.demissao})`,
          severidade: 'warning', bloqueante: false, modulo: 'cartao_ponto',
        });
      }
    }

    const semIntervalo = input.apuracao_diaria.filter(d =>
      d.frequencia_str && !d.frequencia_str.includes('\n') && d.minutos_trabalhados > 360
    );
    if (semIntervalo.length > 0) {
      results.push({
        tipo: 'PONTO_SEM_INTERVALO', code: 'W052',
        mensagem: `${semIntervalo.length} dia(s) com jornada > 6h sem registro de intervalo`,
        severidade: 'warning', bloqueante: false, modulo: 'cartao_ponto',
        sugestao: 'Se intrajornada estiver habilitada, esses dias precisam de intervalo.',
      });
    }
  }

  // ═══ FÉRIAS ═══

  if (input.ferias && input.ferias.length > 0) {
    for (let i = 0; i < input.ferias.length; i++) {
      const f = input.ferias[i];
      if (f.aquisitivo_inicio >= f.aquisitivo_fim) {
        results.push({
          tipo: 'FERIAS_PERIODO_INVALIDO', code: 'E040', campo: `ferias_${i}`,
          mensagem: `Férias ${i + 1}: período aquisitivo inválido (${f.aquisitivo_inicio} a ${f.aquisitivo_fim})`,
          severidade: 'error', bloqueante: true, modulo: 'ferias',
        });
      }
      if (f.gozo_inicio && input.admissao && f.gozo_inicio < input.admissao) {
        results.push({
          tipo: 'GOZO_ANTERIOR_ADMISSAO', code: 'E041', campo: `ferias_${i}`,
          mensagem: `Férias ${i + 1}: gozo (${f.gozo_inicio}) anterior à admissão`,
          severidade: 'error', bloqueante: true, modulo: 'ferias',
        });
      }
    }
  }

  // ═══ AFASTAMENTOS ═══

  if (input.afastamentos) {
    for (let i = 0; i < input.afastamentos.length; i++) {
      const a = input.afastamentos[i];
      if (a.inicio >= a.fim) {
        results.push({
          tipo: 'AFASTAMENTO_PERIODO_INVALIDO', code: 'E042', campo: `afastamento_${i}`,
          mensagem: `Afastamento ${i + 1}: período inválido (${a.inicio} a ${a.fim})`,
          severidade: 'error', bloqueante: true, modulo: 'faltas',
        });
      }
    }
  }

  return results;
}

/**
 * Verifica se o cálculo pode ser "fechado" (sem pendências críticas)
 */
export function podeFechar(validations: ValidationResult[]): { pode: boolean; bloqueios: ValidationResult[] } {
  const bloqueios = validations.filter(v => v.bloqueante);
  return { pode: bloqueios.length === 0, bloqueios };
}

/**
 * Validates engine readiness before liquidation.
 * Includes SELIC anti-cumulation and base-de-juros consistency checks.
 */
export function validarProntoParaLiquidacao(input: {
  data_admissao?: string;
  data_ajuizamento?: string;
  data_liquidacao?: string;
  data_demissao?: string;
  verbas_count: number;
  indices_count: number;
  correcao_indice: string;
  combinacoes_indice?: { de?: string; ate?: string; indice: string }[];
  combinacoes_juros?: { de?: string; ate?: string; tipo: string }[];
  base_de_juros?: string;
  ignorar_taxa_negativa?: boolean;
  aplicar_juros_pre_judicial?: boolean;
}): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (!input.data_admissao) {
    results.push({
      tipo: 'PARAM_ADMISSAO_MISSING', code: 'E004',
      mensagem: 'Data de admissão ausente — liquidação bloqueada',
      severidade: 'error', bloqueante: true, modulo: 'params',
    });
  }

  if (!input.data_ajuizamento) {
    results.push({
      tipo: 'PARAM_AJUIZAMENTO_MISSING', code: 'E005',
      mensagem: 'Data de ajuizamento ausente — liquidação bloqueada',
      severidade: 'error', bloqueante: true, modulo: 'params',
    });
  }

  if (!input.data_liquidacao) {
    results.push({
      tipo: 'PARAM_LIQUIDACAO_MISSING', code: 'E006',
      mensagem: 'Data de liquidação ausente — liquidação bloqueada',
      severidade: 'error', bloqueante: true, modulo: 'params',
    });
  }

  // E027: Data de liquidação no futuro distante
  if (input.data_liquidacao) {
    const liqYear = parseInt(input.data_liquidacao.slice(0, 4));
    const currentYear = new Date().getFullYear();
    if (liqYear > currentYear + 2) {
      results.push({
        tipo: 'LIQUIDACAO_FUTURO_DISTANTE', code: 'E027',
        mensagem: `Data de liquidação (${input.data_liquidacao}) está ${liqYear - currentYear} anos no futuro`,
        severidade: 'error', bloqueante: true, modulo: 'params',
        sugestao: 'Verificar se a data de liquidação está correta.',
      });
    }
  }

  if (input.verbas_count === 0) {
    results.push({
      tipo: 'VERBAS_VAZIAS', code: 'E007',
      mensagem: 'Nenhuma verba configurada — liquidação bloqueada',
      severidade: 'error', bloqueante: true, modulo: 'verbas',
    });
  }

  if (input.indices_count === 0 && input.correcao_indice !== 'SEM_CORRECAO' && input.correcao_indice !== 'NENHUM') {
    results.push({
      tipo: 'INDICES_MISSING', code: 'E003',
      mensagem: `Nenhum índice de correção disponível (configurado: ${input.correcao_indice})`,
      severidade: 'error', bloqueante: true, modulo: 'correcao',
    });
  }

  // ═══ SELIC ANTI-CUMULATION CHECKS ═══
  if (input.combinacoes_indice && input.combinacoes_juros) {
    for (const ci of input.combinacoes_indice) {
      if (ci.indice !== 'SELIC') continue;
      // Check if any juros regime overlaps with this SELIC correction period
      for (const cj of input.combinacoes_juros) {
        if (cj.tipo === 'NENHUM' || !cj.tipo) continue;
        // Check date overlap
        const ciDe = ci.de || '0000-01-01';
        const ciAte = ci.ate || '9999-12-31';
        const cjDe = cj.de || '0000-01-01';
        const cjAte = cj.ate || '9999-12-31';
        const overlap = ciDe <= cjAte && cjDe <= ciAte;
        if (overlap) {
          results.push({
            tipo: 'SELIC_JUROS_CUMULACAO', code: 'W044',
            mensagem: `SELIC como correção sobrepõe-se com juros ${cj.tipo} — juros serão suprimidos automaticamente nesse segmento (anti bis in idem)`,
            severidade: 'warning', bloqueante: false, modulo: 'juros',
            sugestao: 'Comportamento correto conforme ADC 58/59 STF.',
          });
        }
      }
    }
  }

  // ═══ BASE DE JUROS DIVERGENCE ═══
  if (input.base_de_juros && input.base_de_juros !== 'DIFERENCA') {
    results.push({
      tipo: 'BASE_JUROS_NAO_PADRAO', code: 'W042',
      mensagem: `Base de juros configurada como '${input.base_de_juros}' (padrão é DIFERENCA)`,
      severidade: 'warning', bloqueante: false, modulo: 'juros',
    });
  }

  // ═══ PRE-JUDICIAL INTEREST CHECK ═══
  if (input.aplicar_juros_pre_judicial === false) {
    results.push({
      tipo: 'JUROS_PRE_JUDICIAL_DESABILITADO', code: 'W035',
      mensagem: 'Juros pré-judiciais desabilitados conforme configuração do PJC',
      severidade: 'warning', bloqueante: false, modulo: 'juros',
    });
  }

  return results;
}
