// =====================================================
// RUBRICAS RESCISÓRIAS - VERBAS DE TÉRMINO DO CONTRATO
// =====================================================

import Decimal from 'decimal.js';
import {
  CalcResultItem,
  toDecimal,
} from '../../types/index';
import { Rubrica } from './RubricaEngine';

// Configuração de precisão
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// =====================================================
// RUBRICA: SALDO DE SALÁRIO
// =====================================================

export class SaldoSalario extends Rubrica {
  codigo = 'SALDO_SAL';
  nome = 'Saldo de Salário';
  categoria = 'rescisao';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const dataDemissao = this.ctx.contrato.data_demissao;
    if (!dataDemissao) return [];
    
    // Interpretação inteligente: se dia=1, último dia trabalhado = último dia mês anterior
    const dia = dataDemissao.getDate();
    let competencia: string;
    let diasParaCalculo: number;
    let explicacao: string;
    
    if (dia === 1) {
      // Data CTPS dia 1 = primeiro dia fora → mês anterior integral
      const mesAnterior = new Date(dataDemissao.getFullYear(), dataDemissao.getMonth() - 1, 1);
      competencia = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;
      diasParaCalculo = 30; // Mês integral Art. 64
      explicacao = `Data CTPS ${dataDemissao.toISOString().split('T')[0]} → mês anterior integral (Art. 64, CLT)`;
    } else {
      const ultimoDiaMes = new Date(dataDemissao.getFullYear(), dataDemissao.getMonth() + 1, 0).getDate();
      competencia = `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`;
      if (dia >= ultimoDiaMes) {
        diasParaCalculo = 30;
        explicacao = `Trabalhou até último dia do mês — mês integral (Art. 64, CLT)`;
      } else {
        diasParaCalculo = dia;
        explicacao = `${dia} dias trabalhados no mês da rescisão`;
      }
    }
    
    const salarioBase = this.getSalarioBase(competencia);
    const salarioDia = salarioBase.div(30);
    
    this.registrarPasso(
      'Interpretação da data de demissão',
      explicacao,
      { data_demissao: dataDemissao.toISOString().split('T')[0], dia_original: dia, dias_calculados: diasParaCalculo },
      toDecimal(diasParaCalculo),
      'Art. 64, CLT'
    );
    
    this.registrarPasso(
      'Cálculo do salário diário',
      'Salário Base ÷ 30 (Art. 64, CLT — mensalista)',
      { salario_base: salarioBase.toNumber(), divisor: 30 },
      salarioDia,
      'Art. 64, CLT'
    );
    
    const saldo = salarioDia.times(diasParaCalculo);
    
    this.registrarPasso(
      `Saldo de salário (${diasParaCalculo} dias${diasParaCalculo === 30 ? ' — mês integral' : ''})`,
      'Salário Diário × Dias Trabalhados',
      { salario_dia: salarioDia.toNumber(), dias: diasParaCalculo },
      saldo,
      'Art. 477, CLT'
    );
    
    const valorFinal = this.arredondar(saldo);
    
    return [this.criarResultItem({
      id: `${this.codigo}-${competencia}`,
      rubrica_codigo: this.codigo,
      rubrica_nome: this.nome,
      competencia,
      periodo_inicio: new Date(dataDemissao.getFullYear(), dataDemissao.getMonth(), 1),
      periodo_fim: dataDemissao,
      base_calculo: salarioDia,
      quantidade: toDecimal(diasParaCalculo),
      valor_bruto: valorFinal,
      memoria: [...this.memorias],
      dependencias: [],
      lineage: this.criarLineage(
        [
          { campo: 'salario_base', valor: salarioBase.toNumber(), tipo: 'money' },
          { campo: 'dias_trabalhados', valor: diasParaCalculo, tipo: 'number' },
          { campo: 'dia_original_ctps', valor: dia, tipo: 'number' },
        ],
        `(${salarioBase} ÷ 30) × ${diasParaCalculo}`,
        valorFinal
      ),
    })];
  }
}

// =====================================================
// RUBRICA: AVISO PRÉVIO INDENIZADO
// =====================================================

export class AvisoPrevio extends Rubrica {
  codigo = 'AVISO_PREVIO';
  nome = 'Aviso Prévio Indenizado';
  categoria = 'rescisao';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const tipoDemissao = this.ctx.contrato.tipo_demissao;
    
    if (!['sem_justa_causa', 'rescisao_indireta'].includes(tipoDemissao)) {
      return [];
    }
    
    const dataAdmissao = this.ctx.contrato.data_admissao;
    const dataDemissao = this.ctx.contrato.data_demissao;
    if (!dataAdmissao || !dataDemissao) return [];
    
    const diffMs = dataDemissao.getTime() - dataAdmissao.getTime();
    const anosServico = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
    
    const diasBase = 30;
    const diasAdicionais = Math.min(anosServico * this.ctx.perfil.parametros.dias_aviso_por_ano, 60);
    let diasAviso = diasBase + diasAdicionais;
    
    const parametros = this.ctx.perfil.parametros;
    const fatorAcordo = 'fator_aviso_acordo' in parametros 
      ? (parametros as unknown as Record<string, number>).fator_aviso_acordo 
      : undefined;
    if (tipoDemissao === 'acordo' && fatorAcordo) {
      diasAviso = Math.ceil(diasAviso * fatorAcordo);
    }
    
    const competencia = `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`;
    const remuneracao = this.getRemuneracaoBase(competencia);
    
    this.registrarPasso(
      'Dias de aviso prévio',
      '30 dias + (Anos de Serviço × 3 dias)',
      { dias_base: diasBase, anos_servico: anosServico, dias_adicionais: diasAdicionais },
      toDecimal(diasAviso),
      'Art. 487, §1º, CLT + Art. 1º, Lei 12.506/11'
    );
    
    const valor = remuneracao.times(diasAviso).div(30);
    
    this.registrarPasso(
      'Valor do aviso prévio',
      'Remuneração × (Dias Aviso ÷ 30)',
      { remuneracao: remuneracao.toNumber(), dias_aviso: diasAviso },
      valor,
      'Art. 487, §1º, CLT'
    );
    
    const valorFinal = this.arredondar(valor);
    
    return [this.criarResultItem({
      id: `${this.codigo}-total`,
      rubrica_codigo: this.codigo,
      rubrica_nome: this.nome,
      competencia,
      base_calculo: remuneracao,
      quantidade: toDecimal(diasAviso),
      fator: toDecimal(diasAviso).div(30),
      valor_bruto: valorFinal,
      memoria: [...this.memorias],
      dependencias: [],
      lineage: this.criarLineage(
        [
          { campo: 'remuneracao', valor: remuneracao.toNumber(), tipo: 'money' },
          { campo: 'anos_servico', valor: anosServico, tipo: 'number' },
          { campo: 'dias_aviso', valor: diasAviso, tipo: 'number' },
        ],
        `${remuneracao} × (${diasAviso} ÷ 30)`,
        valorFinal
      ),
    })];
  }
}

// =====================================================
// RUBRICA: FÉRIAS VENCIDAS + 1/3
// =====================================================

export class FeriasVencidas extends Rubrica {
  codigo = 'FERIAS_VENC';
  nome = 'Férias Vencidas + 1/3';
  categoria = 'rescisao';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const dataAdmissao = this.ctx.contrato.data_admissao;
    const dataDemissao = this.ctx.contrato.data_demissao;
    if (!dataAdmissao || !dataDemissao) return [];
    
    const resultados: CalcResultItem[] = [];
    const competencia = `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`;
    const { valor: remuneracao, usouMedia, mesesMedia } = this.getRemuneracaoFeriasOu13(competencia);
    
    if (usouMedia) {
      this.registrarPasso(
        'Base de cálculo: média variável dos últimos meses',
        `Soma remunerações ÷ ${mesesMedia} meses (Art. 142, §§ 1º-3º, CLT)`,
        { meses_usados: mesesMedia },
        remuneracao,
        'Art. 142, §§ 1º a 3º, CLT'
      );
    }
    
    let periodoInicio = new Date(dataAdmissao);
    let periodoNum = 0;
    
    while (true) {
      const periodoFim = new Date(periodoInicio);
      periodoFim.setFullYear(periodoFim.getFullYear() + 1);
      
      // Art. 146, caput, CLT: na cessação do contrato, são devidas férias
      // de qualquer período aquisitivo COMPLETO, independente do período concessivo.
      // A dobra (Art. 137) só se aplica se o período concessivo também expirou.
      if (periodoFim <= dataDemissao) {
        periodoNum++;
        
        const limiteGozo = new Date(periodoFim);
        limiteGozo.setFullYear(limiteGozo.getFullYear() + 1);
        const emDobro = limiteGozo <= dataDemissao;
        
        const ferias = remuneracao;
        const terco = ferias.div(3);
        const total = emDobro ? ferias.plus(terco).times(2) : ferias.plus(terco);
        
        const descPeriodo = emDobro 
          ? `Férias vencidas EM DOBRO - Período ${periodoNum} (concessivo expirado)`
          : `Férias vencidas - Período ${periodoNum}`;
        
        this.registrarPasso(
          descPeriodo,
          emDobro 
            ? 'Remuneração + 1/3 Constitucional × 2 (dobra Art. 137, CLT)'
            : 'Remuneração + 1/3 Constitucional',
          { remuneracao: remuneracao.toNumber(), terco: terco.toNumber(), em_dobro: emDobro ? 1 : 0 },
          total,
          emDobro ? 'Art. 137, CLT + Art. 7º, XVII, CF/88' : 'Art. 146, caput, CLT + Art. 7º, XVII, CF/88'
        );
        
        const valorFinal = this.arredondar(total);
        
        resultados.push(this.criarResultItem({
          id: `${this.codigo}-${periodoNum}`,
          rubrica_codigo: this.codigo,
          rubrica_nome: `${this.nome} (${periodoNum}º Período)`,
          competencia,
          periodo_inicio: periodoInicio,
          periodo_fim: new Date(periodoFim.getTime() - 1),
          base_calculo: remuneracao,
          quantidade: new Decimal(1),
          fator: new Decimal(4).div(3),
          valor_bruto: valorFinal,
          memoria: [...this.memorias],
          dependencias: [],
          lineage: this.criarLineage(
            [
              { campo: 'remuneracao', valor: remuneracao.toNumber(), tipo: 'money' },
              { campo: 'periodo', valor: periodoNum, tipo: 'number' },
            ],
            `${remuneracao} + (${remuneracao} ÷ 3)`,
            valorFinal
          ),
        }));
        
        this.memorias = [];
        periodoInicio = new Date(periodoFim);
      } else {
        break;
      }
      
      if (periodoNum > 10) break;
    }
    
    return resultados;
  }
}

// =====================================================
// RUBRICA: FÉRIAS PROPORCIONAIS + 1/3
// =====================================================

export class FeriasProporcionais extends Rubrica {
  codigo = 'FERIAS_PROP';
  nome = 'Férias Proporcionais + 1/3';
  categoria = 'rescisao';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const tipoDemissao = this.ctx.contrato.tipo_demissao;
    
    if (tipoDemissao === 'justa_causa') {
      return [];
    }
    
    const dataAdmissao = this.ctx.contrato.data_admissao;
    const dataDemissao = this.ctx.contrato.data_demissao;
    if (!dataAdmissao || !dataDemissao) return [];
    
    let inicioPerAq = new Date(dataAdmissao);
    while (true) {
      const proxAno = new Date(inicioPerAq);
      proxAno.setFullYear(proxAno.getFullYear() + 1);
      if (proxAno > dataDemissao) break;
      inicioPerAq = proxAno;
    }
    
    const diffMs = dataDemissao.getTime() - inicioPerAq.getTime();
    const mesesTrabalhados = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000));
    
    const diasRestantes = Math.floor((diffMs % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
    const avos = mesesTrabalhados + (diasRestantes >= 15 ? 1 : 0);
    
    if (avos === 0) return [];
    
    const competencia = `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`;
    const { valor: remuneracao, usouMedia, mesesMedia } = this.getRemuneracaoFeriasOu13(competencia);
    
    if (usouMedia) {
      this.registrarPasso(
        'Base de cálculo: média variável dos últimos meses',
        `Soma remunerações ÷ ${mesesMedia} meses (Art. 142, §§ 1º-3º, CLT)`,
        { meses_usados: mesesMedia },
        remuneracao,
        'Art. 142, §§ 1º a 3º, CLT'
      );
    }
    
    const feriasBase = remuneracao.times(avos).div(12);
    const terco = feriasBase.div(3);
    const total = feriasBase.plus(terco);
    
    this.registrarPasso(
      'Férias proporcionais base',
      'Remuneração × (Avos ÷ 12)',
      { remuneracao: remuneracao.toNumber(), avos, divisor: 12 },
      feriasBase,
      'Art. 146, parágrafo único, CLT'
    );
    
    this.registrarPasso(
      '1/3 constitucional',
      'Férias Proporcionais ÷ 3',
      { ferias_prop: feriasBase.toNumber() },
      terco,
      'Art. 7º, XVII, CF/88'
    );
    
    const valorFinal = this.arredondar(total);
    
    return [this.criarResultItem({
      id: `${this.codigo}-total`,
      rubrica_codigo: this.codigo,
      rubrica_nome: this.nome,
      competencia,
      periodo_inicio: inicioPerAq,
      periodo_fim: dataDemissao,
      base_calculo: remuneracao,
      quantidade: toDecimal(avos),
      fator: new Decimal(4).div(3).times(avos).div(12),
      valor_bruto: valorFinal,
      memoria: [...this.memorias],
      dependencias: [],
      lineage: this.criarLineage(
        [
          { campo: 'remuneracao', valor: remuneracao.toNumber(), tipo: 'money' },
          { campo: 'avos', valor: avos, tipo: 'number' },
        ],
        `(${remuneracao} × ${avos}/12) + 1/3`,
        valorFinal
      ),
    })];
  }
}

// =====================================================
// RUBRICA: 13º SALÁRIO PROPORCIONAL
// =====================================================

export class DecimoTerceiroProporcional extends Rubrica {
  codigo = 'DECIMO_PROP';
  nome = '13º Salário Proporcional';
  categoria = 'rescisao';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const tipoDemissao = this.ctx.contrato.tipo_demissao;
    
    if (tipoDemissao === 'justa_causa') {
      return [];
    }
    
    const dataAdmissao = this.ctx.contrato.data_admissao;
    const dataDemissao = this.ctx.contrato.data_demissao;
    if (!dataAdmissao || !dataDemissao) return [];
    
    const anoDemissao = dataDemissao.getFullYear();
    let inicioAno = new Date(anoDemissao, 0, 1);
    
    if (dataAdmissao.getFullYear() === anoDemissao) {
      inicioAno = dataAdmissao;
    }
    
    const diffMs = dataDemissao.getTime() - inicioAno.getTime();
    const mesesNoAno = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000));
    
    const diasRestantes = Math.floor((diffMs % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
    const avos = Math.min(mesesNoAno + (diasRestantes >= 15 ? 1 : 0), 12);
    
    if (avos === 0) return [];
    
    const competencia = `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`;
    const { valor: remuneracao, usouMedia, mesesMedia } = this.getRemuneracaoFeriasOu13(competencia);
    
    if (usouMedia) {
      this.registrarPasso(
        'Base de cálculo: média variável dos últimos 12 meses',
        `Soma remunerações ÷ ${mesesMedia} meses (Art. 2º, Decreto 57.155/65)`,
        { meses_usados: mesesMedia },
        remuneracao,
        'Art. 2º, Decreto 57.155/65'
      );
    }
    
    const decimo = remuneracao.times(avos).div(12);
    
    this.registrarPasso(
      '13º salário proporcional',
      'Remuneração × (Avos ÷ 12)',
      { remuneracao: remuneracao.toNumber(), avos, divisor: 12 },
      decimo,
      'Art. 1º, Lei 4.090/62'
    );
    
    const valorFinal = this.arredondar(decimo);
    
    return [this.criarResultItem({
      id: `${this.codigo}-${anoDemissao}`,
      rubrica_codigo: this.codigo,
      rubrica_nome: this.nome,
      competencia: `${anoDemissao}-13`,
      periodo_inicio: inicioAno,
      periodo_fim: dataDemissao,
      base_calculo: remuneracao,
      quantidade: toDecimal(avos),
      fator: toDecimal(avos).div(12),
      valor_bruto: valorFinal,
      memoria: [...this.memorias],
      dependencias: [],
      lineage: this.criarLineage(
        [
          { campo: 'remuneracao', valor: remuneracao.toNumber(), tipo: 'money' },
          { campo: 'avos', valor: avos, tipo: 'number' },
          { campo: 'ano', valor: anoDemissao, tipo: 'number' },
        ],
        `${remuneracao} × ${avos}/12`,
        valorFinal
      ),
    })];
  }
}

// =====================================================
// RUBRICA: FGTS SOBRE VERBAS RESCISÓRIAS (8%)
// Art. 15, Lei 8.036/90
// =====================================================

export class FGTSRescisorio extends Rubrica {
  codigo = 'FGTS_RESC';
  nome = 'FGTS sobre Verbas Rescisórias';
  categoria = 'rescisao';
  dependencias = ['SALDO_SAL', 'AVISO_PREVIO', 'DECIMO_PROP'];
  
  calcular(): CalcResultItem[] {
    const aliquota = this.ctx.perfil.parametros.aliquota_fgts; // 0.08
    
    const saldoSal = this.getResultadoRubrica('SALDO_SAL');
    const aviso = this.getResultadoRubrica('AVISO_PREVIO');
    const decimo = this.getResultadoRubrica('DECIMO_PROP');
    
    const baseCalculo = saldoSal.plus(aviso).plus(decimo);
    if (baseCalculo.isZero()) return [];
    
    const fgts = baseCalculo.times(aliquota);
    
    this.registrarPasso(
      'FGTS sobre verbas rescisórias',
      '(Saldo + Aviso + 13º) × 8%',
      { saldo: saldoSal.toNumber(), aviso: aviso.toNumber(), decimo: decimo.toNumber(), aliquota },
      fgts,
      'Art. 15, Lei 8.036/90'
    );
    
    const valorFinal = this.arredondar(fgts);
    const dataDemissao = this.ctx.contrato.data_demissao;
    const competencia = dataDemissao 
      ? `${dataDemissao.getFullYear()}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`
      : 'rescisao';
    
    return [this.criarResultItem({
      id: `${this.codigo}-total`,
      rubrica_codigo: this.codigo,
      rubrica_nome: this.nome,
      competencia,
      base_calculo: baseCalculo,
      quantidade: new Decimal(1),
      percentual: toDecimal(aliquota),
      valor_bruto: valorFinal,
      memoria: [...this.memorias],
      dependencias: this.dependencias,
      lineage: this.criarLineage(
        [
          { campo: 'saldo_salario', valor: saldoSal.toNumber(), tipo: 'money' },
          { campo: 'aviso_previo', valor: aviso.toNumber(), tipo: 'money' },
          { campo: 'decimo_prop', valor: decimo.toNumber(), tipo: 'money' },
        ],
        `(${saldoSal} + ${aviso} + ${decimo}) × ${aliquota}`,
        valorFinal
      ),
    })];
  }
}

// =====================================================
// EXPORTAR RUBRICAS PARA REGISTRY
// =====================================================

export const RUBRICAS_RESCISAO = {
  SALDO_SAL: SaldoSalario,
  AVISO_PREVIO: AvisoPrevio,
  FERIAS_VENC: FeriasVencidas,
  FERIAS_PROP: FeriasProporcionais,
  DECIMO_PROP: DecimoTerceiroProporcional,
  FGTS_RESC: FGTSRescisorio,
};