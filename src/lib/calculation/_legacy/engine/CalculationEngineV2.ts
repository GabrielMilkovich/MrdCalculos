// =====================================================
// ⚠️  DEPRECATED — MOTOR DE CÁLCULO V2
// Este motor é LEGADO e será removido na próxima fase.
// O motor canônico é PjeCalcEngine em src/lib/pjecalc/engine.ts
// NÃO ADICIONE NOVAS FUNCIONALIDADES AQUI.
// =====================================================

import Decimal from 'decimal.js';
import {
  CalcProfile,
  CalcRule,
  CalcResultItem,
  CalcSnapshot,
  CalcWarning,
  ConsistencyAlert,
  ConsolidatedResult,
  ContractData,
  MonthlyData,
  ValidatedInput,
  toDecimal,
  hashObject,
  getMonthsBetween,
} from '../../types/index';
import {
  ExecutionContext,
  Rubrica,
} from './RubricaEngine';
import { RUBRICAS_REGISTRY, ORDEM_EXECUCAO } from './RubricaRegistry';
import { SituationAnalyzer, AnaliseResult } from './SituationAnalyzer';
import { ReportGenerator, RelatorioCompleto } from './ReportGenerator';

// Configuração de precisão
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

const ENGINE_VERSION = '2.1.0';

// =====================================================
// INTERFACE DO MOTOR
// =====================================================

export interface EngineInput {
  case_id: string;
  contrato: ContractData;
  dadosMensais: MonthlyData[];
  validacoes: ValidatedInput[];
  perfil: CalcProfile;
  regras: CalcRule[];
  user_id: string;
}

export interface EngineOutput {
  snapshot: CalcSnapshot;
  items: CalcResultItem[];
  warnings: CalcWarning[];
  alertas: ConsistencyAlert[];
  analise: AnaliseResult;
  relatorio: RelatorioCompleto;
}

// =====================================================
// MOTOR DE CÁLCULO V2
// =====================================================

export class CalculationEngineV2 {
  private ctx: ExecutionContext;
  private warnings: CalcWarning[] = [];
  private alertas: ConsistencyAlert[] = [];
  private items: CalcResultItem[] = [];
  private analise!: AnaliseResult;
  
  constructor(private input: EngineInput) {
    // [DEPRECATION WARNING — adicionado em consolidação V3 (2026-04-22)]
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
      const stack = new Error().stack?.split('\n').slice(2, 5).join('\n') ?? '';
      console.warn(
        '[DEPRECATED] CalculationEngineV2 (motor legado V2, src/lib/calculation/_legacy/engine/CalculationEngineV2.ts) foi instanciado. ' +
        'Use PjeCalcEngineV3 em @/lib/pjecalc/engine-v3. ' +
        'Este motor será removido após 2026-05-20.\n' +
        'Stack:\n' + stack,
      );
    }

    // Construir contexto
    this.ctx = {
      contrato: input.contrato,
      perfil: input.perfil,
      dadosMensais: new Map(input.dadosMensais.map(d => [d.competencia, d])),
      validacoes: new Map(input.validacoes.map(v => [v.campo, v])),
      resultados: new Map(),
      regras: new Map(input.regras.map(r => [r.codigo, r])),
    };
  }
  
  // =====================================================
  // VALIDAÇÃO DE INPUTS
  // =====================================================
  
  private validarInputs(): void {
    // Validar datas
    if (!this.input.contrato.data_admissao) {
      this.alertas.push({
        tipo: 'data_invalida',
        campo: 'data_admissao',
        descricao: 'Data de admissão não informada',
        severidade: 'critica',
      });
    }
    
    if (!this.input.contrato.data_demissao) {
      this.warnings.push({
        tipo: 'atencao',
        codigo: 'SEM_DATA_DEMISSAO',
        mensagem: 'Data de demissão não informada. Usando data atual.',
      });
    }
    
    // Validar salário
    if (!this.input.contrato.salario_inicial || 
        this.input.contrato.salario_inicial.isZero()) {
      this.alertas.push({
        tipo: 'valor_fora_faixa',
        campo: 'salario_inicial',
        descricao: 'Salário inicial inválido ou não informado',
        severidade: 'critica',
      });
    }
    
    // Verificar lacunas de competência
    const competencias = Array.from(this.ctx.dadosMensais.keys()).sort();
    if (competencias.length > 1) {
      const esperadas = getMonthsBetween(
        new Date(competencias[0] + '-01'),
        new Date(competencias[competencias.length - 1] + '-01')
      );
      
      const faltantes = esperadas.filter(c => !competencias.includes(c));
      if (faltantes.length > 0) {
        this.alertas.push({
          tipo: 'lacuna_competencia',
          campo: 'competencias',
          descricao: `Competências sem dados: ${faltantes.join(', ')}`,
          severidade: 'media',
        });
      }
    }
    
    // Verificar divergências salariais
    const salarioInicial = this.input.contrato.salario_inicial;
    for (const [comp, dados] of this.ctx.dadosMensais) {
      const diff = dados.salario_base.minus(salarioInicial).abs();
      const percentDiff = diff.div(salarioInicial).times(100);
      
      if (percentDiff.greaterThan(50)) {
        this.alertas.push({
          tipo: 'divergencia',
          campo: 'salario_base',
          descricao: `Divergência salarial significativa em ${comp}`,
          valor_encontrado: dados.salario_base.toString(),
          valor_esperado: salarioInicial.toString(),
          severidade: 'alta',
        });
      }
    }
  }
  
  // =====================================================
  // EXECUÇÃO DAS RUBRICAS
  // =====================================================
  
  private executarRubricas(rubricasBloqueadas: Set<string> = new Set()): void {
    const rubricasAtivas = this.input.perfil.rubricas_ativas;
    
    for (const codigo of ORDEM_EXECUCAO) {
      // Verificar se rubrica está bloqueada por situação detectada
      if (rubricasBloqueadas.has(codigo)) {
        continue;
      }
      
      // Verificar se rubrica está ativa no perfil
      if (rubricasAtivas.length > 0 && !rubricasAtivas.includes(codigo)) {
        continue;
      }
      
      const RubricaClass = RUBRICAS_REGISTRY.get(codigo);
      if (!RubricaClass) {
        this.warnings.push({
          tipo: 'atencao',
          codigo: 'RUBRICA_NAO_ENCONTRADA',
          mensagem: `Rubrica ${codigo} não implementada`,
        });
        continue;
      }
      
      try {
        const rubrica = new RubricaClass();
        rubrica.setContext(this.ctx);
        
        const resultados = rubrica.calcular();
        
        // Armazenar no contexto para rubricas dependentes
        this.ctx.resultados.set(codigo, resultados);
        this.items.push(...resultados);
        
      } catch (error) {
        this.warnings.push({
          tipo: 'erro',
          codigo: 'ERRO_CALCULO',
          mensagem: `Erro ao calcular ${codigo}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          rubrica: codigo,
        });
      }
    }
  }
  
  // =====================================================
  // CONSOLIDAÇÃO DE RESULTADOS
  // =====================================================
  
  private consolidarResultados(): ConsolidatedResult {
    const resultado: ConsolidatedResult = {
      total: new Decimal(0),
      por_rubrica: {},
      por_competencia: {},
    };
    
    for (const item of this.items) {
      // Total geral
      resultado.total = resultado.total.plus(item.valor_bruto);
      
      // Por rubrica
      if (!resultado.por_rubrica[item.rubrica_codigo]) {
        resultado.por_rubrica[item.rubrica_codigo] = {
          codigo: item.rubrica_codigo,
          nome: item.rubrica_nome,
          valor: new Decimal(0),
          competencias: {},
        };
      }
      resultado.por_rubrica[item.rubrica_codigo].valor = 
        resultado.por_rubrica[item.rubrica_codigo].valor.plus(item.valor_bruto);
      
      // Por competência
      if (item.competencia) {
        if (!resultado.por_competencia[item.competencia]) {
          resultado.por_competencia[item.competencia] = new Decimal(0);
        }
        resultado.por_competencia[item.competencia] = 
          resultado.por_competencia[item.competencia].plus(item.valor_bruto);
        
        // Competência dentro da rubrica
        resultado.por_rubrica[item.rubrica_codigo].competencias![item.competencia] = 
          item.valor_bruto;
      }
    }
    
    return resultado;
  }
  
  // =====================================================
  // GERAÇÃO DO SNAPSHOT
  // =====================================================
  
  execute(): EngineOutput {
    // 0. Analisar situação do caso
    const analyzer = new SituationAnalyzer(
      this.input.contrato,
      this.ctx.dadosMensais,
      this.ctx.validacoes,
    );
    this.analise = analyzer.analisar();
    
    // Registrar situações como warnings para visibilidade
    for (const sit of this.analise.situacoes) {
      if (sit.severidade === 'critico') {
        this.warnings.push({
          tipo: 'atencao',
          codigo: `SITUACAO_${sit.id}`,
          mensagem: `${sit.titulo}: ${sit.impacto_calculo}`,
          sugestao: sit.ressalva || undefined,
        });
      }
    }
    
    // 1. Validar inputs
    this.validarInputs();
    
    // 2. Verificar alertas críticos
    const alertasCriticos = this.alertas.filter(a => a.severidade === 'critica');
    if (alertasCriticos.length > 0) {
      this.warnings.push({
        tipo: 'erro',
        codigo: 'ALERTAS_CRITICOS',
        mensagem: `Existem ${alertasCriticos.length} alertas críticos que impedem o cálculo`,
        sugestao: 'Corrija os campos obrigatórios antes de executar o cálculo',
      });
    }
    
    // 3. Coletar rubricas bloqueadas pelas situações detectadas
    const rubricasBloqueadas = new Set<string>();
    for (const sit of this.analise.situacoes) {
      for (const bloq of sit.rubricas_bloqueadas) {
        rubricasBloqueadas.add(bloq);
      }
    }
    
    // Registrar bloqueios como warnings
    for (const bloq of rubricasBloqueadas) {
      const sit = this.analise.situacoes.find(s => s.rubricas_bloqueadas.includes(bloq));
      this.warnings.push({
        tipo: 'info',
        codigo: `RUBRICA_BLOQUEADA_${bloq}`,
        mensagem: `Rubrica ${bloq} não calculada: ${sit?.titulo || 'situação detectada'}`,
        sugestao: sit?.ressalva || undefined,
      });
    }
    
    // 4. Executar rubricas (respeitando bloqueios)
    this.executarRubricas(rubricasBloqueadas);
    
    // 5. Consolidar resultados
    const resultadoBruto = this.consolidarResultados();
    
    // 6. Gerar hash do ruleset
    const rulesetHash = hashObject({
      perfil: this.input.perfil.id,
      regras: Array.from(this.ctx.regras.values()).map(r => ({
        codigo: r.codigo,
        versao: r.versao,
      })),
    });
    
    // 7. Montar snapshot
    const snapshot: CalcSnapshot = {
      id: crypto.randomUUID(),
      case_id: this.input.case_id,
      profile_id: this.input.perfil.id,
      versao: 1,
      engine_version: ENGINE_VERSION,
      ruleset_hash: rulesetHash,
      status: 'gerado',
      
      inputs_snapshot: {
        contrato: this.input.contrato,
        dados_mensais: this.input.dadosMensais,
        validacoes: this.input.validacoes,
        perfil: this.input.perfil,
      },
      
      items: this.items,
      resultado_bruto: resultadoBruto,
      total_bruto: resultadoBruto.total,
      
      warnings: this.warnings,
      alertas_consistencia: this.alertas,
      
      created_by: this.input.user_id,
      created_at: new Date(),
    };
    
    // 8. Gerar relatório completo
    const reportGen = new ReportGenerator(snapshot, this.analise, this.input.contrato);
    const relatorio = reportGen.gerar();
    
    return {
      snapshot,
      items: this.items,
      warnings: this.warnings,
      alertas: this.alertas,
      analise: this.analise,
      relatorio,
    };
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

export function createCalculationEngine(input: EngineInput): CalculationEngineV2 {
  return new CalculationEngineV2(input);
}
