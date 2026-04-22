// =====================================================
// ANALISADOR DE SITUAÇÕES JURÍDICAS
// Detecta automaticamente: tipo de demissão, estabilidades,
// regime de jornada, categoria especial
// Gera alertas, ressalvas e cenários alternativos
// =====================================================

import Decimal from 'decimal.js';
import { ContractData, MonthlyData, ValidatedInput } from '../../types/index';

// =====================================================
// TIPOS
// =====================================================

export type SituacaoTipo = 
  | 'tipo_demissao'
  | 'estabilidade'
  | 'regime_jornada'
  | 'categoria_especial';

export type Severidade = 'info' | 'atencao' | 'critico';

export interface SituacaoDetectada {
  id: string;
  tipo: SituacaoTipo;
  titulo: string;
  descricao: string;
  fundamentacao: string;
  impacto_calculo: string;
  severidade: Severidade;
  rubricas_afetadas: string[];
  rubricas_bloqueadas: string[];
  rubricas_adicionadas: string[];
  ressalva: string;
  cenario_alternativo?: CenarioAlternativo;
}

export interface CenarioAlternativo {
  nome: string;
  descricao: string;
  premissa_divergente: string;
  fundamentacao: string;
}

export interface AnaliseResult {
  situacoes: SituacaoDetectada[];
  resumo_executivo: string;
  nivel_confianca: number; // 0-100
  pendencias: string[];
  ressalvas_gerais: string[];
}

// =====================================================
// ANALISADOR PRINCIPAL
// =====================================================

export class SituationAnalyzer {
  private situacoes: SituacaoDetectada[] = [];
  private pendencias: string[] = [];
  private ressalvas: string[] = [];

  constructor(
    private contrato: ContractData,
    private dadosMensais: Map<string, MonthlyData>,
    private validacoes: Map<string, ValidatedInput>,
  ) {}

  analisar(): AnaliseResult {
    this.situacoes = [];
    this.pendencias = [];
    this.ressalvas = [];

    this.analisarTipoDemissao();
    this.analisarEstabilidades();
    this.analisarRegimeJornada();
    this.analisarCategoriaEspecial();
    this.verificarConsistencia();

    const nivel = this.calcularNivelConfianca();

    return {
      situacoes: this.situacoes,
      resumo_executivo: this.gerarResumoExecutivo(),
      nivel_confianca: nivel,
      pendencias: this.pendencias,
      ressalvas_gerais: this.ressalvas,
    };
  }

  // =====================================================
  // ANÁLISE: TIPO DE DEMISSÃO
  // =====================================================

  private analisarTipoDemissao(): void {
    const tipo = this.contrato.tipo_demissao;

    const configs: Record<string, {
      titulo: string;
      descricao: string;
      fundamentacao: string;
      impacto: string;
      bloqueadas: string[];
      adicionadas: string[];
      ressalva: string;
      cenario?: CenarioAlternativo;
    }> = {
      justa_causa: {
        titulo: 'Dispensa por Justa Causa (Art. 482, CLT)',
        descricao: 'Reclamante foi dispensado por justa causa. Verbas rescisórias limitadas ao saldo de salário, férias vencidas +1/3 e FGTS depositado (sem saque). Não há aviso prévio, 13º proporcional, férias proporcionais nem multa de 40%.',
        fundamentacao: 'Art. 482 e Art. 477, CLT; Súmula 171, TST (férias proporcionais vedadas na justa causa, exceto convenção coletiva)',
        impacto: 'Redução significativa do crédito. Aviso prévio, 13º proporcional, férias proporcionais e multa FGTS 40% NÃO são devidos.',
        bloqueadas: ['AVISO_PREVIO', 'DECIMO_PROP', 'FERIAS_PROP', 'MULTA_FGTS'],
        adicionadas: [],
        ressalva: '⚠️ RESSALVA: Se a justa causa for revertida judicialmente, TODAS as verbas rescisórias passam a ser devidas como se fosse dispensa sem justa causa. O cenário alternativo apresenta esse cálculo.',
        cenario: {
          nome: 'Reversão da Justa Causa',
          descricao: 'Cenário em que o juiz reverte a justa causa para dispensa sem justa causa',
          premissa_divergente: 'tipo_demissao: sem_justa_causa (ao invés de justa_causa)',
          fundamentacao: 'Art. 492 e seguintes, CLT; Art. 477, §8º, CLT',
        },
      },
      sem_justa_causa: {
        titulo: 'Dispensa Sem Justa Causa',
        descricao: 'Reclamante foi dispensado sem justa causa. Todas as verbas rescisórias são devidas: saldo de salário, aviso prévio (proporcional ao tempo de serviço), férias vencidas e proporcionais +1/3, 13º proporcional e multa de 40% do FGTS.',
        fundamentacao: 'Art. 477, CLT; Art. 487, §1º, CLT; Lei 12.506/11; Art. 18, §1º, Lei 8.036/90',
        impacto: 'Cálculo completo com todas as verbas rescisórias.',
        bloqueadas: [],
        adicionadas: ['SALDO_SAL', 'AVISO_PREVIO', 'FERIAS_VENC', 'FERIAS_PROP', 'DECIMO_PROP', 'MULTA_FGTS', 'FGTS_RESC'],
        ressalva: 'Aviso prévio calculado com a proporcionalidade da Lei 12.506/11 (3 dias por ano de serviço, máximo 90 dias no total).',
      },
      pedido_demissao: {
        titulo: 'Pedido de Demissão pelo Empregado',
        descricao: 'Reclamante pediu demissão. São devidos: saldo de salário, 13º proporcional e férias proporcionais +1/3. NÃO há multa de 40% do FGTS nem aviso prévio indenizado pelo empregador.',
        fundamentacao: 'Art. 487, §2º, CLT; Súmula 261, TST (férias proporcionais no pedido de demissão)',
        impacto: 'Sem multa FGTS e sem aviso prévio indenizado. Se o empregado não cumprir o aviso, pode haver desconto.',
        bloqueadas: ['AVISO_PREVIO', 'MULTA_FGTS'],
        adicionadas: ['SALDO_SAL', 'FERIAS_VENC', 'FERIAS_PROP', 'DECIMO_PROP'],
        ressalva: '⚠️ RESSALVA: Se o pedido de demissão foi coagido, pode ser convertido em rescisão indireta (Art. 483, CLT), tornando devidas todas as verbas rescisórias.',
        cenario: {
          nome: 'Conversão para Rescisão Indireta',
          descricao: 'Cenário em que o pedido de demissão é anulado por vício de consentimento',
          premissa_divergente: 'tipo_demissao: rescisao_indireta (ao invés de pedido_demissao)',
          fundamentacao: 'Art. 483, CLT; Art. 9º, CLT (nulidade de atos que visem desvirtuar direitos)',
        },
      },
      rescisao_indireta: {
        titulo: 'Rescisão Indireta (Art. 483, CLT)',
        descricao: 'Rescisão motivada por falta grave do empregador. Equipara-se à dispensa sem justa causa para fins de verbas rescisórias.',
        fundamentacao: 'Art. 483, CLT; equiparação com dispensa sem justa causa',
        impacto: 'Cálculo idêntico à dispensa sem justa causa, incluindo multa de 40% do FGTS.',
        bloqueadas: [],
        adicionadas: ['SALDO_SAL', 'AVISO_PREVIO', 'FERIAS_VENC', 'FERIAS_PROP', 'DECIMO_PROP', 'MULTA_FGTS', 'FGTS_RESC'],
        ressalva: 'A rescisão indireta depende de reconhecimento judicial. Se não reconhecida, equipara-se a pedido de demissão.',
        cenario: {
          nome: 'Não Reconhecimento da Rescisão Indireta',
          descricao: 'Cenário em que o juiz não reconhece a falta grave do empregador',
          premissa_divergente: 'tipo_demissao: pedido_demissao (ao invés de rescisao_indireta)',
          fundamentacao: 'Art. 483, CLT — ônus da prova recai sobre o empregado',
        },
      },
      acordo: {
        titulo: 'Rescisão por Acordo (Art. 484-A, CLT)',
        descricao: 'Rescisão bilateral (Reforma Trabalhista). Aviso prévio e multa FGTS pagos pela metade. Férias e 13º proporcionais integrais.',
        fundamentacao: 'Art. 484-A, CLT (inserido pela Lei 13.467/2017)',
        impacto: 'Aviso prévio indenizado = 50%. Multa FGTS = 20% (ao invés de 40%). Movimentação do FGTS limitada a 80% do saldo.',
        bloqueadas: [],
        adicionadas: ['SALDO_SAL', 'AVISO_PREVIO', 'FERIAS_VENC', 'FERIAS_PROP', 'DECIMO_PROP', 'MULTA_FGTS', 'FGTS_RESC'],
        ressalva: 'O acordo mútuo deve ser genuíno. Se houver coação, pode ser anulado judicialmente.',
      },
    };

    const config = configs[tipo];
    if (!config) {
      this.pendencias.push(`Tipo de demissão "${tipo}" não reconhecido. Cálculo pode estar incompleto.`);
      return;
    }

    this.situacoes.push({
      id: `DEMISSAO_${tipo.toUpperCase()}`,
      tipo: 'tipo_demissao',
      titulo: config.titulo,
      descricao: config.descricao,
      fundamentacao: config.fundamentacao,
      impacto_calculo: config.impacto,
      severidade: tipo === 'justa_causa' ? 'critico' : 'info',
      rubricas_afetadas: [...config.adicionadas, ...config.bloqueadas],
      rubricas_bloqueadas: config.bloqueadas,
      rubricas_adicionadas: config.adicionadas,
      ressalva: config.ressalva,
      cenario_alternativo: config.cenario,
    });
  }

  // =====================================================
  // ANÁLISE: ESTABILIDADES
  // =====================================================

  private analisarEstabilidades(): void {
    const dataDemissao = this.contrato.data_demissao;
    const dataAdmissao = this.contrato.data_admissao;
    
    // Verificar possível estabilidade gestante (precisa de fato confirmado)
    const factoGestante = this.validacoes.get('gestante');
    if (factoGestante && factoGestante.valor === 'sim') {
      const limitEstabilidade = new Date(dataDemissao);
      limitEstabilidade.setMonth(limitEstabilidade.getMonth() + 5); // 5 meses após parto
      
      this.situacoes.push({
        id: 'ESTAB_GESTANTE',
        tipo: 'estabilidade',
        titulo: 'Estabilidade Gestante Identificada',
        descricao: 'Empregada gestante possui estabilidade desde a confirmação da gravidez até 5 meses após o parto (Art. 10, II, "b", ADCT). A dispensa durante este período é nula.',
        fundamentacao: 'Art. 10, II, "b", ADCT; Súmula 244, TST',
        impacto_calculo: 'Se dispensada durante período estabilitário, são devidos salários e demais direitos de todo o período de estabilidade, além de indenização substitutiva.',
        severidade: 'critico',
        rubricas_afetadas: ['SALDO_SAL', 'INDENIZACAO_ESTABILIDADE'],
        rubricas_bloqueadas: [],
        rubricas_adicionadas: ['INDENIZACAO_ESTABILIDADE'],
        ressalva: '⚠️ RESSALVA CRÍTICA: A estabilidade gestante é de natureza constitucional. A empregadora deve comprovar que a dispensa NÃO ocorreu durante o período protegido.',
        cenario_alternativo: {
          nome: 'Sem Estabilidade (Parto Posterior)',
          descricao: 'Cenário em que a gravidez é posterior à dispensa',
          premissa_divergente: 'gestante: não (data da gravidez posterior à demissão)',
          fundamentacao: 'Súmula 244, I, TST',
        },
      });
    }

    // Verificar possível estabilidade por acidente de trabalho
    const factoAcidente = this.validacoes.get('acidente_trabalho');
    if (factoAcidente && factoAcidente.valor === 'sim') {
      this.situacoes.push({
        id: 'ESTAB_ACIDENTE',
        tipo: 'estabilidade',
        titulo: 'Estabilidade Acidentária (12 meses)',
        descricao: 'Empregado acidentado possui garantia de emprego de 12 meses após a cessação do auxílio-doença acidentário (Art. 118, Lei 8.213/91).',
        fundamentacao: 'Art. 118, Lei 8.213/91; Súmula 378, TST',
        impacto_calculo: 'Se dispensado durante o período de estabilidade, são devidos salários e direitos do período restante ou reintegração.',
        severidade: 'critico',
        rubricas_afetadas: ['SALDO_SAL', 'INDENIZACAO_ESTABILIDADE'],
        rubricas_bloqueadas: [],
        rubricas_adicionadas: ['INDENIZACAO_ESTABILIDADE'],
        ressalva: '⚠️ RESSALVA: Exige comprovação de nexo causal e afastamento com CAT (Comunicação de Acidente de Trabalho).',
      });
    }

    // Verificar CIPA
    const factoCipa = this.validacoes.get('membro_cipa');
    if (factoCipa && factoCipa.valor === 'sim') {
      this.situacoes.push({
        id: 'ESTAB_CIPA',
        tipo: 'estabilidade',
        titulo: 'Estabilidade de Cipeiro',
        descricao: 'Membro eleito da CIPA possui estabilidade desde o registro da candidatura até 1 ano após o mandato (Art. 10, II, "a", ADCT).',
        fundamentacao: 'Art. 10, II, "a", ADCT; Art. 165, CLT; Súmula 339, TST',
        impacto_calculo: 'Dispensa arbitrária é nula. Devidos salários do período de estabilidade.',
        severidade: 'critico',
        rubricas_afetadas: ['SALDO_SAL'],
        rubricas_bloqueadas: [],
        rubricas_adicionadas: ['INDENIZACAO_ESTABILIDADE'],
        ressalva: '⚠️ Estabilidade se estende ao suplente (Súmula 339, II, TST).',
      });
    }
  }

  // =====================================================
  // ANÁLISE: REGIME DE JORNADA
  // =====================================================

  private analisarRegimeJornada(): void {
    const jornada = this.contrato.jornada;
    const divisor = jornada.divisor;
    const horasSemanais = jornada.horas_semanais;

    // Jornada 12x36
    if (horasSemanais === 36 && divisor === 180) {
      this.situacoes.push({
        id: 'JORNADA_12X36',
        tipo: 'regime_jornada',
        titulo: 'Jornada 12×36 Detectada',
        descricao: 'Regime de 12 horas de trabalho por 36 horas de descanso. A compensação é presumida, mas horas excedentes à 12ª são extras. Feriados trabalhados são compensados pelo descanso de 36h (Art. 59-A, CLT pós-Reforma).',
        fundamentacao: 'Art. 59-A, CLT (Lei 13.467/2017); Súmula 444, TST',
        impacto_calculo: 'Divisor 180h. Feriados trabalhados NÃO geram pagamento em dobro (Art. 59-A, parágrafo único). Adicional noturno prorrogado após 5h (Súmula 60, TST).',
        severidade: 'atencao',
        rubricas_afetadas: ['HE50', 'HE100', 'ADIC_NOT'],
        rubricas_bloqueadas: [],
        rubricas_adicionadas: [],
        ressalva: '⚠️ RESSALVA: Se a 12x36 for estabelecida apenas por acordo individual (sem CCT/ACT), há controvérsia sobre a validade pré-Reforma. O cenário alternativo calcula como jornada normal.',
        cenario_alternativo: {
          nome: 'Invalidade da 12×36 (Jornada Normal)',
          descricao: 'Cenário em que a compensação 12×36 é considerada inválida',
          premissa_divergente: 'divisor: 220 / horas_semanais: 44',
          fundamentacao: 'Art. 7º, XIII, CF/88 — exigência de negociação coletiva para compensação acima de 8h diárias',
        },
      });
    }

    // Turno ininterrupto de revezamento (6h)
    if (horasSemanais <= 36 && divisor === 180) {
      const factoTurno = this.validacoes.get('turno_revezamento');
      if (factoTurno && factoTurno.valor === 'sim') {
        this.situacoes.push({
          id: 'JORNADA_TURNO_REVEZ',
          tipo: 'regime_jornada',
          titulo: 'Turno Ininterrupto de Revezamento',
          descricao: 'Jornada de 6 horas para trabalhadores em turno ininterrupto de revezamento (Art. 7º, XIV, CF/88). A 7ª e 8ª horas são extras.',
          fundamentacao: 'Art. 7º, XIV, CF/88; Súmula 423, TST (norma coletiva pode fixar até 8h)',
          impacto_calculo: 'Divisor 180h. Horas excedentes à 6ª diária são extras a 50%. Se norma coletiva fixa 8h, a 7ª e 8ª são normais.',
          severidade: 'atencao',
          rubricas_afetadas: ['HE50'],
          rubricas_bloqueadas: [],
          rubricas_adicionadas: [],
          ressalva: 'Verificar se há norma coletiva estendendo a jornada para 8h (Súmula 423, TST).',
        });
      }
    }

    // Tempo parcial
    if (horasSemanais <= 30 && horasSemanais > 0) {
      this.situacoes.push({
        id: 'JORNADA_PARCIAL',
        tipo: 'regime_jornada',
        titulo: 'Contrato de Tempo Parcial Detectado',
        descricao: `Jornada de ${horasSemanais}h semanais indica contrato de trabalho a tempo parcial (Art. 58-A, CLT). Férias proporcionais à jornada.`,
        fundamentacao: 'Art. 58-A, CLT (redação da Lei 13.467/2017)',
        impacto_calculo: `Divisor ${divisor}h. Férias proporcionais conforme jornada. Horas extras limitadas a 6h semanais (se jornada ≤ 26h) ou vedadas (se > 26h até 30h).`,
        severidade: 'atencao',
        rubricas_afetadas: ['FERIAS_PROP', 'FERIAS_VENC', 'HE50'],
        rubricas_bloqueadas: [],
        rubricas_adicionadas: [],
        ressalva: 'Verificar se a jornada efetiva excedeu habitualmente o limite contratual (descaracterização do tempo parcial).',
      });
    }

    // Jornada padrão 44h
    if (horasSemanais === 44 && divisor === 220) {
      this.situacoes.push({
        id: 'JORNADA_PADRAO',
        tipo: 'regime_jornada',
        titulo: 'Jornada Padrão (44h/semana)',
        descricao: 'Jornada contratual padrão de 44 horas semanais, 8 horas diárias. Divisor 220h.',
        fundamentacao: 'Art. 7º, XIII, CF/88; Art. 58, CLT',
        impacto_calculo: 'Divisor 220h. Horas excedentes à 8ª diária ou 44ª semanal são extras.',
        severidade: 'info',
        rubricas_afetadas: [],
        rubricas_bloqueadas: [],
        rubricas_adicionadas: [],
        ressalva: '',
      });
    }
  }

  // =====================================================
  // ANÁLISE: CATEGORIA ESPECIAL
  // =====================================================

  private analisarCategoriaEspecial(): void {
    const funcao = this.contrato.funcao?.toLowerCase() || '';
    
    // Bancário
    if (funcao.includes('bancário') || funcao.includes('bancario') || funcao.includes('caixa')) {
      const ehGerente = funcao.includes('gerente') || funcao.includes('superintendente');
      
      this.situacoes.push({
        id: 'CAT_BANCARIO',
        tipo: 'categoria_especial',
        titulo: ehGerente ? 'Bancário — Cargo de Confiança (Art. 224, §2º)' : 'Bancário — Jornada de 6h (Art. 224, CLT)',
        descricao: ehGerente 
          ? 'Bancário exercente de cargo de confiança (Art. 224, §2º, CLT). Jornada de 8h, sem direito à 7ª e 8ª horas como extras, mas com gratificação de função ≥ 1/3 do salário.'
          : 'Bancário com jornada especial de 6 horas diárias (Art. 224, CLT). Divisor 180h. A 7ª e 8ª horas são extras.',
        fundamentacao: ehGerente
          ? 'Art. 224, §2º, CLT; Súmula 102, TST; Súmula 287, TST'
          : 'Art. 224, CLT; Súmula 124, TST (divisor 180h)',
        impacto_calculo: ehGerente
          ? 'Divisor 220h. Sem 7ª e 8ª horas extras. Verificar se gratificação é ≥ 1/3.'
          : 'Divisor 180h. 7ª e 8ª horas = extras a 50%. Sábado é dia útil não trabalhado.',
        severidade: 'atencao',
        rubricas_afetadas: ['HE50', 'HE100'],
        rubricas_bloqueadas: [],
        rubricas_adicionadas: [],
        ressalva: ehGerente
          ? '⚠️ RESSALVA: Se o cargo de confiança for descaracterizado (Súmula 102, TST), a jornada retroage para 6h e as 7ª/8ª horas passam a ser extras.'
          : '',
        cenario_alternativo: ehGerente ? {
          nome: 'Descaracterização do Cargo de Confiança',
          descricao: 'Cenário em que o juiz não reconhece o cargo de confiança',
          premissa_divergente: 'divisor: 180 / horas_semanais: 30 (6h/dia)',
          fundamentacao: 'Súmula 102, TST — atividades meramente técnicas não configuram cargo de confiança',
        } : undefined,
      });
    }

    // Comissionista
    const temComissao = Array.from(this.dadosMensais.values()).some(d => 
      Object.keys(d.adicionais).some(k => k.toLowerCase().includes('comiss'))
    );
    if (temComissao) {
      this.situacoes.push({
        id: 'CAT_COMISSIONISTA',
        tipo: 'categoria_especial',
        titulo: 'Comissionista Detectado',
        descricao: 'Identificada remuneração por comissões nos dados mensais. Para comissionista PURO, as horas extras correspondem apenas ao adicional (Súmula 340, TST). Para comissionista MISTO, aplica-se a regra normal sobre o salário fixo.',
        fundamentacao: 'Súmula 340, TST; Art. 7º, XVI, CF/88',
        impacto_calculo: 'Férias e 13º calculados pela média dos últimos 12 meses (Art. 142, CLT). Horas extras = apenas adicional se comissionista puro.',
        severidade: 'atencao',
        rubricas_afetadas: ['HE50', 'HE100', 'FERIAS_PROP', 'DECIMO_PROP'],
        rubricas_bloqueadas: [],
        rubricas_adicionadas: [],
        ressalva: 'Verificar se é comissionista puro ou misto. A classificação impacta diretamente o cálculo de horas extras.',
      });
    }
  }

  // =====================================================
  // VERIFICAÇÃO DE CONSISTÊNCIA
  // =====================================================

  private verificarConsistencia(): void {
    // Verificar se dados mensais cobrem todo o período
    const dataAdm = this.contrato.data_admissao;
    const dataDem = this.contrato.data_demissao;
    const mesesDados = this.dadosMensais.size;
    
    if (mesesDados === 0) {
      this.pendencias.push('Nenhum dado mensal (holerites/contracheques) disponível. O cálculo será baseado apenas no salário contratual.');
    }

    // Verificar salário mínimo
    const salario = this.contrato.salario_inicial;
    const anoRef = dataDem.getFullYear();
    const salarioMinimo = anoRef >= 2025 ? new Decimal(1518) : new Decimal(1412);
    
    if (salario.lessThan(salarioMinimo)) {
      this.ressalvas.push(`Salário informado (R$ ${salario.toFixed(2)}) é inferior ao salário mínimo de ${anoRef} (R$ ${salarioMinimo.toFixed(2)}). Verificar se é jornada parcial ou erro de extração.`);
    }

    // Verificar período contratual muito curto
    const diffMeses = (dataDem.getFullYear() - dataAdm.getFullYear()) * 12 + (dataDem.getMonth() - dataAdm.getMonth());
    if (diffMeses < 1) {
      this.ressalvas.push('Período contratual inferior a 1 mês. Verificar se as datas estão corretas.');
    }

    // Verificar se data de demissão é futura
    if (dataDem > new Date()) {
      this.ressalvas.push('Data de demissão é futura. O cálculo será projetado, não definitivo.');
    }
  }

  // =====================================================
  // NÍVEL DE CONFIANÇA
  // =====================================================

  private calcularNivelConfianca(): number {
    let score = 100;

    // Penalizar por pendências
    score -= this.pendencias.length * 15;

    // Penalizar por situações críticas sem cenário alternativo
    const criticas = this.situacoes.filter(s => s.severidade === 'critico');
    score -= criticas.length * 10;

    // Penalizar por falta de dados mensais
    if (this.dadosMensais.size === 0) score -= 20;

    // Penalizar por falta de validações
    if (this.validacoes.size < 3) score -= 10;

    // Bonificar por situações com cenário alternativo (mostra completude)
    const comCenario = this.situacoes.filter(s => s.cenario_alternativo);
    score += comCenario.length * 3;

    return Math.max(0, Math.min(100, score));
  }

  // =====================================================
  // RESUMO EXECUTIVO
  // =====================================================

  private gerarResumoExecutivo(): string {
    const tipo = this.contrato.tipo_demissao;
    const admStr = this.contrato.data_admissao.toLocaleDateString('pt-BR');
    const demStr = this.contrato.data_demissao.toLocaleDateString('pt-BR');
    const salStr = `R$ ${this.contrato.salario_inicial.toFixed(2)}`;
    
    const situacoesTxt = this.situacoes
      .filter(s => s.severidade !== 'info')
      .map(s => `• ${s.titulo}`)
      .join('\n');

    const ressalvasTxt = this.situacoes
      .filter(s => s.ressalva)
      .map(s => s.ressalva)
      .join('\n');

    const cenariosTxt = this.situacoes
      .filter(s => s.cenario_alternativo)
      .map(s => `• ${s.cenario_alternativo!.nome}: ${s.cenario_alternativo!.descricao}`)
      .join('\n');

    let resumo = `RELATÓRIO DE ANÁLISE SITUACIONAL\n\n`;
    resumo += `Contrato: ${admStr} a ${demStr} | Salário base: ${salStr}\n`;
    resumo += `Tipo de rescisão: ${tipo.replace(/_/g, ' ')}\n\n`;
    
    if (situacoesTxt) {
      resumo += `SITUAÇÕES DETECTADAS:\n${situacoesTxt}\n\n`;
    }

    if (this.pendencias.length > 0) {
      resumo += `PENDÊNCIAS:\n${this.pendencias.map(p => `⚠ ${p}`).join('\n')}\n\n`;
    }

    if (ressalvasTxt) {
      resumo += `RESSALVAS:\n${ressalvasTxt}\n\n`;
    }

    if (cenariosTxt) {
      resumo += `CENÁRIOS ALTERNATIVOS DISPONÍVEIS:\n${cenariosTxt}\n`;
    }

    return resumo;
  }
}
