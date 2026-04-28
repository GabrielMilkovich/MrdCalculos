// =====================================================
// CALCULADORA DE VERBAS RESCISÓRIAS
// =====================================================
// Calcula automaticamente: saldo de salário, aviso prévio,
// férias proporcionais/vencidas, 13º proporcional, FGTS rescisório
// + Audit trail completo (inclusive verbas bloqueadas)

import {
  Calculator,
  CalculatorRules,
  CalcContext,
  CalcResult,
  CalculatorInputs,
  VerbaOutput,
  AuditLine,
  Warning,
  arredondarMoeda,
  parseFactAsNumber,
} from '../../types';
import { FGTS_MOVEMENT_CODES } from '../../cross-validation';

interface RescisaoParams {
  tipo_demissao: 'sem_justa_causa' | 'justa_causa' | 'pedido_demissao' | 'rescisao_indireta' | 'acordo';
  data_admissao: Date;
  data_demissao: Date;
  salario_base: number;
}

function parseData(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

function normalizarTipoDemissao(value: string): RescisaoParams['tipo_demissao'] {
  const normalizado = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (normalizado.includes('sem_justa_causa') ||
      (normalizado.includes('sem') && normalizado.includes('justa')) ||
      normalizado.includes('imotivada')) {
    return 'sem_justa_causa';
  }

  if (normalizado.includes('rescisao_indireta') || normalizado.includes('indireta')) {
    return 'rescisao_indireta';
  }

  if (normalizado.includes('pedido_demissao') || normalizado.includes('pedido')) {
    return 'pedido_demissao';
  }

  if (normalizado.includes('acordo')) {
    return 'acordo';
  }

  if (normalizado.includes('justa')) {
    return 'justa_causa';
  }

  return 'sem_justa_causa';
}

function anosDeServico(admissao: Date, demissao: Date): number {
  const diffMs = demissao.getTime() - admissao.getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

function mesesProporcionais(inicio: Date, fim: Date): number {
  const diffMs = fim.getTime() - inicio.getTime();
  const meses = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000));
  const diasRestantes = Math.floor((diffMs % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
  return meses + (diasRestantes >= 15 ? 1 : 0);
}

/**
 * Interpreta a data de demissão corretamente.
 * Na CTPS, "data de saída" = primeiro dia fora. Último dia trabalhado = dia anterior.
 * Se o dia é 1, considera que o mês anterior é o último mês trabalhado integral.
 */
function interpretarDataDemissao(dataDemissao: Date): { 
  ultimoDiaTrabalhado: Date; 
  competenciaRescisao: string;
  diasNoMesRescisao: number;
  mesIntegral: boolean;
  explicacao: string;
} {
  const dia = dataDemissao.getDate();
  
  if (dia === 1) {
    // Data de saída = dia 1 → último dia trabalhado = último dia do mês anterior
    const mesAnterior = new Date(dataDemissao.getFullYear(), dataDemissao.getMonth() - 1, 1);
    const ultimoDiaMesAnterior = new Date(dataDemissao.getFullYear(), dataDemissao.getMonth(), 0);
    
    return {
      ultimoDiaTrabalhado: ultimoDiaMesAnterior,
      competenciaRescisao: `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`,
      diasNoMesRescisao: 30, // Mês integral (Art. 64, CLT)
      mesIntegral: true,
      explicacao: `Data saída CTPS ${dataDemissao.toISOString().split('T')[0]} → último dia trabalhado: ${ultimoDiaMesAnterior.toISOString().split('T')[0]}. Mês anterior integral (Art. 64, CLT: mensalista = 30 dias).`,
    };
  }
  
  // Dia > 1: trabalhou parcialmente no mês da rescisão
  const ultimoDiaMes = new Date(dataDemissao.getFullYear(), dataDemissao.getMonth() + 1, 0).getDate();
  const diasEfetivos = dia - 1; // Até o dia anterior à saída
  const mesIntegral = diasEfetivos >= ultimoDiaMes;
  const diasCalc = mesIntegral ? 30 : diasEfetivos;
  
  // Se a data é o último dia do mês, é mês integral
  if (dia >= ultimoDiaMes) {
    return {
      ultimoDiaTrabalhado: dataDemissao,
      competenciaRescisao: `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`,
      diasNoMesRescisao: 30,
      mesIntegral: true,
      explicacao: `Trabalhou até ${dataDemissao.toISOString().split('T')[0]} (último dia do mês). Mês integral (Art. 64, CLT).`,
    };
  }
  
  return {
    ultimoDiaTrabalhado: new Date(dataDemissao.getFullYear(), dataDemissao.getMonth(), dia - 1),
    competenciaRescisao: `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`,
    diasNoMesRescisao: diasCalc,
    mesIntegral: false,
    explicacao: `Data saída ${dataDemissao.toISOString().split('T')[0]} → ${diasCalc} dias no mês da rescisão.`,
  };
}

export function createVerbasRescisoriasCalculator(rules: CalculatorRules): Calculator {
  const calculatorId = 'verbas_rescisorias';
  const calculatorNome = 'Verbas Rescisórias';
  const calculatorVersao = rules.versao || '1.1.0';
  
  return {
    id: calculatorId,
    nome: calculatorNome,
    version: calculatorVersao,
    
    execute(ctx: CalcContext, inputs: CalculatorInputs): CalcResult {
      const verbas: VerbaOutput[] = [];
      const auditLines: AuditLine[] = [];
      const warnings: Warning[] = [];
      let lineNum = 1;
      
      // Extrair parâmetros dos fatos
      const rawTipoDemissao = String(
        ctx.facts['tipo_demissao']?.valor ||
        ctx.facts['motivo_demissao']?.valor ||
        inputs.tipo_demissao ||
        'sem_justa_causa'
      );
      let tipoDemissao = normalizarTipoDemissao(rawTipoDemissao);

      // ── OVERRIDE: código FGTS/eSocial prevalece sobre OCR ──
      const fgtsCodeFact = ctx.facts['codigo_afastamento_fgts'] ||
                            ctx.facts['codigo_movimentacao_fgts'] ||
                            ctx.facts['codigo_afastamento'];
      let fgtsInfo: typeof FGTS_MOVEMENT_CODES[string] | null = null;

      if (fgtsCodeFact) {
        const rawCode = String(fgtsCodeFact.valor).trim().toUpperCase();
        const match = rawCode.match(/([A-Z]\d?)\s*$/i) ||
                      rawCode.match(/\d{2}\/\d{2}\/\d{4}-([A-Z]\d?)/i);
        const code = match ? match[1].toUpperCase() : rawCode;
        
        if (FGTS_MOVEMENT_CODES[code]) {
          fgtsInfo = FGTS_MOVEMENT_CODES[code];
          const tipoPeloCodigo = fgtsInfo.tipo_demissao as RescisaoParams['tipo_demissao'];
          
          if (tipoPeloCodigo !== tipoDemissao) {
            warnings.push({
              tipo: 'erro',
              codigo: 'TIPO_DEMISSAO_CORRIGIDO_FGTS',
              mensagem: `Tipo de demissão corrigido de "${tipoDemissao}" para "${tipoPeloCodigo}" com base no código FGTS "${code}" (${fgtsInfo.descricao}). O código oficial prevalece.`,
              sugestao: 'Verifique o extrato FGTS para confirmar.',
            });
          }
          tipoDemissao = tipoPeloCodigo;
        }
      }

      const dataAdmissaoFact = ctx.facts['data_admissao']?.valor || inputs.data_admissao;
      const dataDemissaoFact = ctx.facts['data_demissao']?.valor || inputs.data_demissao;
      const dataAdmissao = parseData(dataAdmissaoFact);
      const dataDemissao = parseData(dataDemissaoFact);
      
      const salarioFact = ctx.facts['salario_mensal'] || ctx.facts['salario_base'];
      const salarioFromFacts = parseFactAsNumber(salarioFact);
      const salarioFromInput = typeof inputs.salario_base === 'number'
        ? inputs.salario_base
        : Number(inputs.salario_base || 0);
      const salarioBase = salarioFromFacts > 0 ? salarioFromFacts : salarioFromInput;
      
      if (!dataAdmissao || !dataDemissao) {
        warnings.push({
          tipo: 'erro',
          codigo: 'DATAS_RESCISAO_FALTANDO',
          mensagem: 'Datas de admissão e/ou demissão não informadas',
          sugestao: 'Informe as datas na aba Premissas → Rescisão Contratual',
        });
        return {
          calculadoraId: calculatorId, calculadoraNome: calculatorNome, versao: calculatorVersao,
          outputs: { total_bruto: 0, total_liquido: 0, verbas: [] }, auditLines, warnings,
        };
      }
      
      if (salarioBase <= 0) {
        warnings.push({
          tipo: 'erro',
          codigo: 'SALARIO_INVALIDO',
          mensagem: 'Salário base não informado ou inválido',
          sugestao: 'Confirme o fato "salario_mensal" ou "salario_base" na validação',
        });
        return {
          calculadoraId: calculatorId, calculadoraNome: calculatorNome, versao: calculatorVersao,
          outputs: { total_bruto: 0, total_liquido: 0, verbas: [] }, auditLines, warnings,
        };
      }

      // ═══ INTERPRETAÇÃO INTELIGENTE DA DATA ═══
      const dateInfo = interpretarDataDemissao(dataDemissao);
      const competencia = dateInfo.competenciaRescisao;

      // Audit: registrar premissas do cálculo
      auditLines.push({
        linha: lineNum++,
        calculadora: calculatorId,
        descricao: '══ PREMISSAS DA RESCISÃO ══',
        formula: `Admissão: ${dataAdmissao.toISOString().split('T')[0]} | Demissão (CTPS): ${dataDemissao.toISOString().split('T')[0]} | Tipo: ${tipoDemissao} | Salário: R$ ${salarioBase.toFixed(2)}`,
        metadata: { 
          data_admissao: dataAdmissao.toISOString().split('T')[0],
          data_demissao: dataDemissao.toISOString().split('T')[0],
          tipo_demissao: tipoDemissao,
          salario_base: salarioBase,
          interpretacao_data: dateInfo.explicacao,
        },
      });

      auditLines.push({
        linha: lineNum++,
        calculadora: calculatorId,
        descricao: `Interpretação da data: ${dateInfo.explicacao}`,
        formula: `Último dia trabalhado: ${dateInfo.ultimoDiaTrabalhado.toISOString().split('T')[0]} | Competência: ${competencia} | Dias: ${dateInfo.diasNoMesRescisao}`,
        metadata: { ...dateInfo },
      });
      
      // ═══ 1. SALDO DE SALÁRIO (sempre calculado) ═══
      const diasParaCalculo = dateInfo.diasNoMesRescisao;
      const salarioDia = salarioBase / 30;
      const saldoSalario = arredondarMoeda(salarioDia * diasParaCalculo);
      
      verbas.push({
        codigo: 'SALDO_SAL',
        descricao: 'Saldo de Salário',
        valor_bruto: saldoSalario,
        competencias: [{ competencia, valor_bruto: saldoSalario }],
      });
      
      auditLines.push({
        linha: lineNum++,
        calculadora: calculatorId,
        competencia,
        descricao: `✅ Saldo de Salário (${diasParaCalculo} dias${dateInfo.mesIntegral ? ' — mês integral Art. 64, CLT' : ''})`,
        formula: `R$ ${salarioBase.toFixed(2)} ÷ 30 × ${diasParaCalculo} = R$ ${saldoSalario.toFixed(2)}`,
        valor_bruto: saldoSalario,
        metadata: { 
          fundamento: 'Art. 457, CLT + Art. 64, CLT',
          salario_dia: arredondarMoeda(salarioDia),
          dias: diasParaCalculo,
          mes_integral: dateInfo.mesIntegral,
        },
      });
      
      // ═══ 2. AVISO PRÉVIO INDENIZADO ═══
      let valorAviso = 0;
      let diasAviso = 0;
      if (['sem_justa_causa', 'rescisao_indireta'].includes(tipoDemissao)) {
        const anos = anosDeServico(dataAdmissao, dataDemissao);
        const diasBase = 30;
        const diasAdicionais = Math.min(anos * 3, 60);
        diasAviso = diasBase + diasAdicionais;
        valorAviso = arredondarMoeda((salarioBase / 30) * diasAviso);
        
        verbas.push({
          codigo: 'AVISO_PREVIO',
          descricao: 'Aviso Prévio Indenizado',
          valor_bruto: valorAviso,
          competencias: [{ competencia, valor_bruto: valorAviso }],
        });
        
        auditLines.push({
          linha: lineNum++,
          calculadora: calculatorId,
          competencia,
          descricao: `✅ Aviso Prévio Indenizado (${diasAviso} dias = 30 + ${anos} anos × 3)`,
          formula: `R$ ${salarioBase.toFixed(2)} ÷ 30 × ${diasAviso} = R$ ${valorAviso.toFixed(2)}`,
          valor_bruto: valorAviso,
          metadata: { fundamento: 'Art. 487, §1º, CLT + Lei 12.506/11', anos_servico: anos, dias_aviso: diasAviso },
        });
      } else if (tipoDemissao === 'acordo') {
        const anos = anosDeServico(dataAdmissao, dataDemissao);
        const diasBase = 30;
        const diasAdicionais = Math.min(anos * 3, 60);
        diasAviso = Math.ceil((diasBase + diasAdicionais) / 2);
        valorAviso = arredondarMoeda((salarioBase / 30) * diasAviso);
        
        verbas.push({
          codigo: 'AVISO_PREVIO_ACORDO',
          descricao: 'Aviso Prévio (50% — Acordo)',
          valor_bruto: valorAviso,
          competencias: [{ competencia, valor_bruto: valorAviso }],
        });
        
        auditLines.push({
          linha: lineNum++,
          calculadora: calculatorId,
          competencia,
          descricao: `✅ Aviso Prévio 50% Acordo (${diasAviso} dias)`,
          formula: `R$ ${salarioBase.toFixed(2)} ÷ 30 × ${diasAviso} = R$ ${valorAviso.toFixed(2)}`,
          valor_bruto: valorAviso,
          metadata: { fundamento: 'Art. 484-A, CLT', dias_aviso: diasAviso },
        });
      } else {
        // Justa causa ou pedido: sem aviso prévio
        auditLines.push({
          linha: lineNum++,
          calculadora: calculatorId,
          descricao: `🚫 Aviso Prévio: NÃO DEVIDO (tipo: ${tipoDemissao})`,
          formula: tipoDemissao === 'justa_causa' 
            ? 'Justa causa → empregado perde direito ao aviso prévio (Art. 482, CLT)'
            : 'Pedido de demissão: aviso prévio é ônus do empregado (Art. 487, CLT)',
          valor_bruto: 0,
          metadata: { fundamento: 'Art. 482/487, CLT', motivo: `Tipo demissão: ${tipoDemissao}` },
        });
      }
      
      // ═══ 3. FÉRIAS VENCIDAS + 1/3 (todos os tipos) ═══
      let periodoInicio = new Date(dataAdmissao);
      let periodoNum = 0;
      let temFeriasVencidas = false;
      
      while (periodoNum < 10) {
        const periodoFim = new Date(periodoInicio);
        periodoFim.setFullYear(periodoFim.getFullYear() + 1);
        
        // Art. 146, caput, CLT: na cessação do contrato, são devidas férias
        // de qualquer período aquisitivo COMPLETO, independente do período concessivo.
        if (periodoFim <= dataDemissao) {
          periodoNum++;
          temFeriasVencidas = true;
          
          // Verificar se o período concessivo também expirou (dobra - Art. 137, CLT)
          const limiteGozo = new Date(periodoFim);
          limiteGozo.setFullYear(limiteGozo.getFullYear() + 1);
          const emDobro = limiteGozo <= dataDemissao;
          
          const valorFerias = salarioBase;
          const terco = valorFerias / 3;
          const totalFerias = emDobro 
            ? arredondarMoeda((valorFerias + terco) * 2)
            : arredondarMoeda(valorFerias + terco);
          
          verbas.push({
            codigo: 'FERIAS_VENC',
            descricao: emDobro 
              ? `Férias Vencidas EM DOBRO + 1/3 (${periodoNum}º período)`
              : `Férias Vencidas + 1/3 (${periodoNum}º período)`,
            valor_bruto: totalFerias,
            competencias: [{ competencia, valor_bruto: totalFerias }],
          });
          
          auditLines.push({
            linha: lineNum++,
            calculadora: calculatorId,
            competencia,
            descricao: emDobro
              ? `✅ Férias Vencidas ${periodoNum}º período EM DOBRO + 1/3 (Art. 137, CLT)`
              : `✅ Férias Vencidas ${periodoNum}º período + 1/3`,
            formula: emDobro
              ? `(R$ ${salarioBase.toFixed(2)} + R$ ${salarioBase.toFixed(2)} ÷ 3) × 2 = R$ ${totalFerias.toFixed(2)}`
              : `R$ ${salarioBase.toFixed(2)} + (R$ ${salarioBase.toFixed(2)} ÷ 3) = R$ ${totalFerias.toFixed(2)}`,
            valor_bruto: totalFerias,
            metadata: { 
              fundamento: emDobro ? 'Art. 137, CLT + Art. 7º, XVII, CF/88' : 'Art. 146, caput, CLT + Art. 7º, XVII, CF/88',
              periodo_inicio: periodoInicio.toISOString().split('T')[0],
              periodo_fim: periodoFim.toISOString().split('T')[0],
              em_dobro: emDobro,
              nota: 'Art. 146, CLT: devida em QUALQUER tipo de demissão, inclusive justa causa',
            },
          });
          
          periodoInicio = periodoFim;
        } else {
          break;
        }
      }
      
      if (!temFeriasVencidas) {
        // Explicar por que não há férias vencidas
        const periodoFim = new Date(dataAdmissao);
        periodoFim.setFullYear(periodoFim.getFullYear() + 1);
        const limiteGozo = new Date(periodoFim);
        limiteGozo.setFullYear(limiteGozo.getFullYear() + 1);
        
        auditLines.push({
          linha: lineNum++,
          calculadora: calculatorId,
          descricao: `ℹ️ Férias Vencidas: NENHUMA`,
          formula: `Período aquisitivo mais antigo venceria em ${limiteGozo.toISOString().split('T')[0]}, posterior à demissão`,
          valor_bruto: 0,
          metadata: { motivo: 'Sem período aquisitivo com gozo expirado antes da demissão' },
        });
      }
      
      // ═══ 4. FÉRIAS PROPORCIONAIS + 1/3 ═══
      if (tipoDemissao !== 'justa_causa') {
        let inicioPerAq = new Date(dataAdmissao);
        while (true) {
          const proxAno = new Date(inicioPerAq);
          proxAno.setFullYear(proxAno.getFullYear() + 1);
          if (proxAno > dataDemissao) break;
          inicioPerAq = proxAno;
        }
        
        const avos = Math.min(mesesProporcionais(inicioPerAq, dataDemissao), 12);
        
        if (avos > 0) {
          const feriasBase = (salarioBase * avos) / 12;
          const terco = feriasBase / 3;
          const totalFerias = arredondarMoeda(feriasBase + terco);
          
          verbas.push({
            codigo: 'FERIAS_PROP',
            descricao: 'Férias Proporcionais + 1/3',
            valor_bruto: totalFerias,
            competencias: [{ competencia, valor_bruto: totalFerias }],
          });
          
          auditLines.push({
            linha: lineNum++,
            calculadora: calculatorId,
            competencia,
            descricao: `✅ Férias Proporcionais (${avos}/12 avos) + 1/3`,
            formula: `(R$ ${salarioBase.toFixed(2)} × ${avos}/12) + 1/3 = R$ ${totalFerias.toFixed(2)}`,
            valor_bruto: totalFerias,
            metadata: { fundamento: 'Art. 146, parágrafo único, CLT + Súmula 171, TST', avos },
          });
        }
      } else {
        auditLines.push({
          linha: lineNum++,
          calculadora: calculatorId,
          descricao: `🚫 Férias Proporcionais: NÃO DEVIDAS (justa causa)`,
          formula: 'Art. 146, CLT c/c Art. 482, CLT — justa causa exclui férias proporcionais',
          valor_bruto: 0,
          metadata: { fundamento: 'Art. 146, CLT', motivo: 'Justa causa' },
        });
      }
      
      // ═══ 5. 13º SALÁRIO PROPORCIONAL ═══
      let valorDecimo = 0;
      if (tipoDemissao !== 'justa_causa') {
        const anoDemo = dataDemissao.getFullYear();
        let inicioAno = new Date(anoDemo, 0, 1);
        
        if (dataAdmissao.getFullYear() === anoDemo) {
          inicioAno = dataAdmissao;
        }
        
        const avos = Math.min(mesesProporcionais(inicioAno, dataDemissao), 12);
        
        if (avos > 0) {
          valorDecimo = arredondarMoeda((salarioBase * avos) / 12);
          
          verbas.push({
            codigo: 'DECIMO_PROP',
            descricao: '13º Salário Proporcional',
            valor_bruto: valorDecimo,
            competencias: [{ competencia: `${anoDemo}-13`, valor_bruto: valorDecimo }],
          });
          
          auditLines.push({
            linha: lineNum++,
            calculadora: calculatorId,
            competencia: `${anoDemo}-13`,
            descricao: `✅ 13º Proporcional (${avos}/12 avos)`,
            formula: `R$ ${salarioBase.toFixed(2)} × ${avos}/12 = R$ ${valorDecimo.toFixed(2)}`,
            valor_bruto: valorDecimo,
            metadata: { fundamento: 'Art. 1º, Lei 4.090/62 + Art. 3º, Lei 4.090/62', avos },
          });
        }
      } else {
        auditLines.push({
          linha: lineNum++,
          calculadora: calculatorId,
          descricao: `🚫 13º Salário Proporcional: NÃO DEVIDO (justa causa)`,
          formula: 'Súmula 157, TST — justa causa exclui 13º proporcional',
          valor_bruto: 0,
          metadata: { fundamento: 'Súmula 157, TST', motivo: 'Justa causa' },
        });
      }
      
      // ═══ 6. FGTS SOBRE VERBAS RESCISÓRIAS (8%) ═══
      // Art. 15, Lei 8.036/90: FGTS incide sobre saldo, aviso prévio e 13º
      const baseFGTSRescisorio = saldoSalario + valorAviso + valorDecimo;
      if (baseFGTSRescisorio > 0) {
        const fgtsRescisorio = arredondarMoeda(baseFGTSRescisorio * 0.08);
        
        verbas.push({
          codigo: 'FGTS_RESCISORIO',
          descricao: 'FGTS sobre Verbas Rescisórias (8%)',
          valor_bruto: fgtsRescisorio,
          competencias: [{ competencia, valor_bruto: fgtsRescisorio }],
        });
        
        auditLines.push({
          linha: lineNum++,
          calculadora: calculatorId,
          competencia,
          descricao: `✅ FGTS sobre Rescisão (8%)`,
          formula: `(Saldo R$ ${saldoSalario.toFixed(2)} + Aviso R$ ${valorAviso.toFixed(2)} + 13º R$ ${valorDecimo.toFixed(2)}) × 8% = R$ ${fgtsRescisorio.toFixed(2)}`,
          valor_bruto: fgtsRescisorio,
          metadata: { 
            fundamento: 'Art. 15, Lei 8.036/90',
            base_calculo: baseFGTSRescisorio,
            composicao: { saldo: saldoSalario, aviso: valorAviso, decimo: valorDecimo },
          },
        });
      }
      
      // ═══ 7. MULTA FGTS (40% ou 20%) ═══
      const totalFGTS = Number(inputs.total_fgts || 0);
      // Soma o saldo depositado + FGTS sobre rescisão
      const baseFGTSMulta = totalFGTS + (baseFGTSRescisorio > 0 ? arredondarMoeda(baseFGTSRescisorio * 0.08) : 0);
      
      if (['sem_justa_causa', 'rescisao_indireta'].includes(tipoDemissao)) {
        if (baseFGTSMulta > 0) {
          const multa = arredondarMoeda(baseFGTSMulta * 0.4);
          verbas.push({
            codigo: 'MULTA_FGTS_40',
            descricao: 'Multa 40% FGTS',
            valor_bruto: multa,
            competencias: [{ competencia, valor_bruto: multa }],
          });
          auditLines.push({
            linha: lineNum++,
            calculadora: calculatorId,
            competencia,
            descricao: `✅ Multa 40% FGTS`,
            formula: `R$ ${baseFGTSMulta.toFixed(2)} × 40% = R$ ${multa.toFixed(2)}`,
            valor_bruto: multa,
            metadata: { fundamento: 'Art. 18, §1º, Lei 8.036/90', base_fgts: baseFGTSMulta },
          });
        } else {
          auditLines.push({
            linha: lineNum++,
            calculadora: calculatorId,
            descricao: `⚠️ Multa 40% FGTS: Base FGTS não informada`,
            formula: 'Sem saldo de FGTS depositado para calcular a multa',
            valor_bruto: 0,
            metadata: { sugestao: 'Informe o fato "saldo_fgts" ou forneça extrato FGTS' },
          });
        }
      } else if (tipoDemissao === 'acordo' && baseFGTSMulta > 0) {
        const multa = arredondarMoeda(baseFGTSMulta * 0.2);
        verbas.push({
          codigo: 'MULTA_FGTS_20',
          descricao: 'Multa 20% FGTS (Acordo)',
          valor_bruto: multa,
          competencias: [{ competencia, valor_bruto: multa }],
        });
        auditLines.push({
          linha: lineNum++,
          calculadora: calculatorId,
          competencia,
          descricao: `✅ Multa 20% FGTS (Acordo Art. 484-A)`,
          formula: `R$ ${baseFGTSMulta.toFixed(2)} × 20% = R$ ${multa.toFixed(2)}`,
          valor_bruto: multa,
          metadata: { fundamento: 'Art. 484-A, §1º, CLT', base_fgts: baseFGTSMulta },
        });
      } else if (tipoDemissao === 'justa_causa') {
        auditLines.push({
          linha: lineNum++,
          calculadora: calculatorId,
          descricao: `🚫 Multa FGTS: NÃO DEVIDA (justa causa)`,
          formula: 'Art. 18, §1º, Lei 8.036/90 — multa somente na dispensa sem justa causa',
          valor_bruto: 0,
          metadata: { fundamento: 'Art. 18, §1º, Lei 8.036/90', motivo: 'Justa causa' },
        });
      }

      // ═══ 8. SIMULAÇÃO: REVERSÃO DA JUSTA CAUSA ═══
      // Para advogado: mostra quanto o reclamante TERIA DIREITO se reverter
      if (tipoDemissao === 'justa_causa') {
        auditLines.push({
          linha: lineNum++,
          calculadora: calculatorId,
          descricao: '══ SIMULAÇÃO: REVERSÃO DA JUSTA CAUSA (Art. 492+, CLT) ══',
          formula: 'Valores estimados caso a Justiça reverta para dispensa imotivada',
          metadata: { tipo: 'simulacao', fundamento: 'Princípio da continuidade da relação de emprego' },
        });

        const anosServ = anosDeServico(dataAdmissao, dataDemissao);
        const diasAvisoSim = 30 + Math.min(anosServ * 3, 60);
        const avisoSim = arredondarMoeda((salarioBase / 30) * diasAvisoSim);

        auditLines.push({
          linha: lineNum++,
          calculadora: calculatorId,
          descricao: `📋 [SIM] Aviso Prévio Indenizado (${diasAvisoSim} dias)`,
          formula: `R$ ${salarioBase.toFixed(2)} ÷ 30 × ${diasAvisoSim} = R$ ${avisoSim.toFixed(2)}`,
          valor_bruto: avisoSim,
          metadata: { tipo: 'simulacao', fundamento: 'Art. 487, §1º, CLT + Lei 12.506/11' },
        });

        // Férias proporcionais simuladas
        let inicioPerAq = new Date(dataAdmissao);
        while (true) {
          const proxAno = new Date(inicioPerAq);
          proxAno.setFullYear(proxAno.getFullYear() + 1);
          if (proxAno > dataDemissao) break;
          inicioPerAq = proxAno;
        }
        // Incluir projeção do aviso prévio
        const dataProjAviso = new Date(dataDemissao);
        dataProjAviso.setDate(dataProjAviso.getDate() + diasAvisoSim);
        const avosFeriasSim = Math.min(mesesProporcionais(inicioPerAq, dataProjAviso), 12);
        if (avosFeriasSim > 0) {
          const feriasBaseSim = (salarioBase * avosFeriasSim) / 12;
          const tercoSim = feriasBaseSim / 3;
          const feriasSim = arredondarMoeda(feriasBaseSim + tercoSim);
          auditLines.push({
            linha: lineNum++,
            calculadora: calculatorId,
            descricao: `📋 [SIM] Férias Proporcionais (${avosFeriasSim}/12 avos + projeção aviso) + 1/3`,
            formula: `(R$ ${salarioBase.toFixed(2)} × ${avosFeriasSim}/12) + 1/3 = R$ ${feriasSim.toFixed(2)}`,
            valor_bruto: feriasSim,
            metadata: { tipo: 'simulacao', fundamento: 'Art. 146, parágrafo único, CLT', avos: avosFeriasSim },
          });
        }

        // 13º simulado (com projeção aviso)
        const anoDemo = dataProjAviso.getFullYear();
        let inicioAnoSim = new Date(anoDemo, 0, 1);
        if (dataAdmissao.getFullYear() === anoDemo) inicioAnoSim = dataAdmissao;
        const avos13Sim = Math.min(mesesProporcionais(inicioAnoSim, dataProjAviso), 12);
        if (avos13Sim > 0) {
          const decimoSim = arredondarMoeda((salarioBase * avos13Sim) / 12);
          auditLines.push({
            linha: lineNum++,
            calculadora: calculatorId,
            descricao: `📋 [SIM] 13º Proporcional (${avos13Sim}/12 avos + projeção aviso)`,
            formula: `R$ ${salarioBase.toFixed(2)} × ${avos13Sim}/12 = R$ ${decimoSim.toFixed(2)}`,
            valor_bruto: decimoSim,
            metadata: { tipo: 'simulacao', fundamento: 'Art. 1º, Lei 4.090/62', avos: avos13Sim },
          });
        }

        // Multa FGTS simulada
        // Usar depósitos dos facts como base
        let saldoFGTSEstimado = 0;
        for (const [chave, fact] of Object.entries(ctx.facts)) {
          if (chave.startsWith('deposito_fgts_')) {
            saldoFGTSEstimado += parseFactAsNumber(fact);
          }
        }
        if (saldoFGTSEstimado > 0) {
          const multaSim = arredondarMoeda(saldoFGTSEstimado * 0.4);
          auditLines.push({
            linha: lineNum++,
            calculadora: calculatorId,
            descricao: `📋 [SIM] Multa 40% FGTS`,
            formula: `R$ ${saldoFGTSEstimado.toFixed(2)} (saldo estimado) × 40% = R$ ${multaSim.toFixed(2)}`,
            valor_bruto: multaSim,
            metadata: { tipo: 'simulacao', fundamento: 'Art. 18, §1º, Lei 8.036/90', saldo_fgts: saldoFGTSEstimado },
          });

          // Total simulado
          const totalSimulado = avisoSim + 
            (avosFeriasSim > 0 ? arredondarMoeda(((salarioBase * avosFeriasSim) / 12) * 4 / 3) : 0) +
            (avos13Sim > 0 ? arredondarMoeda((salarioBase * avos13Sim) / 12) : 0) +
            multaSim +
            saldoSalario;

          auditLines.push({
            linha: lineNum++,
            calculadora: calculatorId,
            descricao: `📋 [SIM] TOTAL ESTIMADO COM REVERSÃO`,
            formula: `Saldo + Aviso + Férias + 13º + Multa FGTS`,
            valor_bruto: arredondarMoeda(totalSimulado),
            metadata: { 
              tipo: 'simulacao',
              nota: 'Valor da causa sugerido para petição inicial (sem correção monetária/juros)',
              diferenca_vs_justa_causa: arredondarMoeda(totalSimulado - saldoSalario),
            },
          });
        }
      }
      
      // ═══ TOTAIS ═══
      const totalBruto = verbas.reduce((acc, v) => acc + v.valor_bruto, 0);
      
      auditLines.push({
        linha: lineNum++,
        calculadora: calculatorId,
        descricao: `══ TOTAL VERBAS RESCISÓRIAS (${tipoDemissao.replace(/_/g, ' ').toUpperCase()}) ══`,
        formula: verbas.map(v => `${v.codigo}: R$ ${v.valor_bruto.toFixed(2)}`).join(' + '),
        valor_bruto: arredondarMoeda(totalBruto),
        metadata: { 
          tipo_demissao: tipoDemissao,
          quantidade_verbas: verbas.length,
        },
      });
      
      return {
        calculadoraId: calculatorId,
        calculadoraNome: calculatorNome,
        versao: calculatorVersao,
        outputs: {
          total_bruto: arredondarMoeda(totalBruto),
          total_liquido: arredondarMoeda(totalBruto),
          verbas,
        },
        auditLines,
        warnings,
      };
    },
  };
}
