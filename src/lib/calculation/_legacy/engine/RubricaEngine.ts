// =====================================================
// ENGINE DE RUBRICAS V3 - CÁLCULO DETERMINÍSTICO AUDITÁVEL
// Memória de Cálculo + Base Legal obrigatória com URLs oficiais
// OJ 394 modulação, Súmula 340, INSS/IRRF, status legal
// =====================================================

import Decimal from 'decimal.js';
import {
  CalcProfile,
  CalcRule,
  CalcResultItem,
  FundamentoLegal,
  MemoriaCalculo,
  CalcLineage,
  LineageInput,
  MonthlyData,
  ContractData,
  ValidatedInput,
  RubricaRisco,
  toDecimal,
  hashObject,
} from '../../types/index';

// =====================================================
// MAPA DE FUNDAMENTOS LEGAIS POR RUBRICA (V3: URLs oficiais obrigatórias)
// =====================================================

export const FUNDAMENTOS_LEGAIS: Record<string, FundamentoLegal[]> = {
  HE50: [
    { dispositivo: 'Art. 59, §1º, CLT', descricao: 'Adicional de no mínimo 50% sobre a hora normal', norma: 'CLT', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm#art59' },
    { dispositivo: 'Art. 7º, XVI, CF/88', descricao: 'Remuneração do serviço extraordinário superior em 50%', norma: 'CF/88', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art7' },
  ],
  HE100: [
    { dispositivo: 'Art. 59, §1º, CLT', descricao: 'Adicional sobre hora extra em domingos e feriados', norma: 'CLT', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm#art59' },
    { dispositivo: 'Súmula 146, TST', descricao: 'Trabalho em domingos e feriados não compensado — pagamento em dobro', norma: 'TST', status: 'vigente', url_oficial: 'https://www.tst.jus.br/sumulas' },
  ],
  HE_COMISSIONISTA: [
    { dispositivo: 'Súmula 340, TST', descricao: 'Comissionista puro: HE = apenas adicional sobre valor-hora das comissões', norma: 'TST', status: 'vigente', url_oficial: 'https://www.tst.jus.br/sumulas' },
    { dispositivo: 'Art. 7º, XVI, CF/88', descricao: 'Remuneração do serviço extraordinário', norma: 'CF/88', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art7' },
  ],
  DSR_HE: [
    { dispositivo: 'Art. 7º, alínea "a", Lei 605/49', descricao: 'Reflexo das horas extras habituais no DSR', norma: 'Lei 605/49', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/leis/l0605.htm' },
    { dispositivo: 'Súmula 172, TST', descricao: 'Horas extras habituais repercutem no cálculo do RSR', norma: 'TST', status: 'vigente', url_oficial: 'https://www.tst.jus.br/sumulas' },
  ],
  DSR_OJ394_PRE: [
    { dispositivo: 'OJ 394, SDI-1, TST (pré-modulação)', descricao: 'Até 19/03/2023: DSR majorado NÃO repercute em férias, 13º, aviso e FGTS', norma: 'TST', status: 'historica', url_oficial: 'https://www.tst.jus.br/web/guest/orientacoes-jurisprudenciais', vigencia_fim: '2023-03-19' },
  ],
  DSR_OJ394_POS: [
    { dispositivo: 'OJ 394, SDI-1, TST (pós-modulação)', descricao: 'A partir de 20/03/2023: DSR majorado repercute em férias, 13º, aviso e FGTS', norma: 'TST', status: 'vigente', url_oficial: 'https://www.tst.jus.br/web/guest/orientacoes-jurisprudenciais', vigencia_inicio: '2023-03-20' },
    { dispositivo: 'IRR-10169-57.2013.5.05.0024', descricao: 'Modulação de efeitos pelo TST Pleno', norma: 'TST', status: 'vigente', url_oficial: 'https://www.tst.jus.br/' },
  ],
  ADIC_NOT: [
    { dispositivo: 'Art. 73, CLT', descricao: 'Adicional noturno de no mínimo 20% sobre a hora diurna', norma: 'CLT', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm#art73' },
    { dispositivo: 'Art. 73, §1º, CLT', descricao: 'Hora noturna reduzida: 52 minutos e 30 segundos', norma: 'CLT', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm#art73' },
  ],
  REFL_FERIAS: [
    { dispositivo: 'Art. 142, CLT', descricao: 'Integração das parcelas habituais na remuneração de férias', norma: 'CLT', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm#art142' },
    { dispositivo: 'Art. 7º, XVII, CF/88', descricao: 'Férias com acréscimo de 1/3', norma: 'CF/88', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art7' },
    // Súmula 151 CANCELADA - NÃO incluída como fundamento
  ],
  REFL_13: [
    { dispositivo: 'Art. 1º, Lei 4.090/62', descricao: '13º salário com base na remuneração integral', norma: 'Lei 4.090/62', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/leis/l4090.htm' },
    { dispositivo: 'Súmula 45, TST', descricao: 'HE habituais integram cálculo do 13º', norma: 'TST', status: 'vigente', url_oficial: 'https://www.tst.jus.br/sumulas' },
  ],
  FGTS: [
    { dispositivo: 'Art. 15, Lei 8.036/90', descricao: 'Depósito mensal de 8% sobre a remuneração', norma: 'Lei 8.036/90', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm' },
  ],
  MULTA_FGTS: [
    { dispositivo: 'Art. 18, §1º, Lei 8.036/90', descricao: 'Multa de 40% na despedida sem justa causa', norma: 'Lei 8.036/90', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm' },
    { dispositivo: 'Art. 484-A, §1º, CLT', descricao: 'Multa de 20% na rescisão por acordo', norma: 'CLT', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm#art484a' },
  ],
  SALDO_SAL: [
    { dispositivo: 'Art. 457, CLT', descricao: 'Salário devido pelos dias trabalhados no mês da rescisão', norma: 'CLT', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm#art457' },
  ],
  AVISO_PREVIO: [
    { dispositivo: 'Art. 487, §1º, CLT', descricao: 'Aviso prévio de no mínimo 30 dias', norma: 'CLT', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm#art487' },
    { dispositivo: 'Art. 1º, Lei 12.506/11', descricao: 'Acréscimo de 3 dias por ano de serviço (máx 60 dias adicionais)', norma: 'Lei 12.506/11', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12506.htm' },
  ],
  FERIAS_VENC: [
    { dispositivo: 'Art. 137, CLT', descricao: 'Férias em dobro quando não concedidas no prazo', norma: 'CLT', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm#art137' },
    { dispositivo: 'Art. 7º, XVII, CF/88', descricao: 'Férias com 1/3 constitucional', norma: 'CF/88', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art7' },
  ],
  FERIAS_PROP: [
    { dispositivo: 'Art. 146, parágrafo único, CLT', descricao: 'Férias proporcionais na rescisão', norma: 'CLT', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm#art146' },
    { dispositivo: 'Súmula 171, TST', descricao: 'Férias proporcionais devidas mesmo com menos de 1 ano', norma: 'TST', status: 'vigente', url_oficial: 'https://www.tst.jus.br/sumulas' },
    { dispositivo: 'Art. 142, §§ 1º a 3º, CLT', descricao: 'Comissionista: férias calculadas pela média dos últimos 12 meses', norma: 'CLT', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm#art142' },
  ],
  DECIMO_PROP: [
    { dispositivo: 'Art. 1º, Lei 4.090/62', descricao: '13º proporcional aos meses trabalhados', norma: 'Lei 4.090/62', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/leis/l4090.htm' },
    { dispositivo: 'Art. 3º, Lei 4.090/62', descricao: 'Fração ≥ 15 dias = mês integral', norma: 'Lei 4.090/62', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/leis/l4090.htm' },
    { dispositivo: 'Art. 2º, Decreto 57.155/65', descricao: 'Comissionista: 13º calculado pela média das comissões dos últimos 12 meses', norma: 'Decreto 57.155/65', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto/1950-1969/d57155.htm' },
  ],
  INSS: [
    { dispositivo: 'EC 103/2019', descricao: 'Alíquotas progressivas de INSS', norma: 'EC 103/2019', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc103.htm' },
    { dispositivo: 'Art. 28, Lei 8.212/91', descricao: 'Base de cálculo da contribuição previdenciária', norma: 'Lei 8.212/91', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm' },
    { dispositivo: 'Art. 28, §9º, "d", Lei 8.212/91', descricao: 'Férias indenizadas isentas de contribuição previdenciária', norma: 'Lei 8.212/91', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm' },
    { dispositivo: 'Art. 214, §6º, Decreto 3.048/99', descricao: '13º salário tributado em separado', norma: 'RPS', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/decreto/d3048.htm' },
  ],
  IRRF: [
    { dispositivo: 'Lei 7.713/88', descricao: 'Imposto de Renda na Fonte sobre rendimentos do trabalho', norma: 'Lei 7.713/88', status: 'vigente', url_oficial: 'https://www.planalto.gov.br/ccivil_03/leis/l7713.htm' },
    { dispositivo: 'RFB - Tabela Progressiva', descricao: 'Faixas e alíquotas vigentes', norma: 'RFB', status: 'vigente', url_oficial: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/irpf-imposto-de-renda-pessoa-fisica' },
  ],
};

// URLs oficiais permitidas (validação)
const URLS_OFICIAIS_PERMITIDAS = [
  'planalto.gov.br',
  'tst.jus.br',
  'stf.jus.br',
  'portal.stf.jus.br',
  'gov.br',
  'bcb.gov.br',
];

export function validarUrlOficial(url: string): boolean {
  return URLS_OFICIAIS_PERMITIDAS.some(domain => url.includes(domain));
}

// =====================================================
// VALIDAÇÃO DE FUNDAMENTOS LEGAIS
// =====================================================

export interface FundamentoValidationResult {
  valido: boolean;
  rubrica_codigo: string;
  erros: string[];
  avisos: string[];
}

export function validarFundamentosRubrica(codigo: string): FundamentoValidationResult {
  const fundamentos = FUNDAMENTOS_LEGAIS[codigo];
  const result: FundamentoValidationResult = { valido: true, rubrica_codigo: codigo, erros: [], avisos: [] };

  if (!fundamentos || fundamentos.length === 0) {
    result.valido = false;
    result.erros.push(`Fundamento legal ausente para a rubrica ${codigo}. Cálculo BLOQUEADO.`);
    return result;
  }

  for (const f of fundamentos) {
    if (!f.url_oficial) {
      result.valido = false;
      result.erros.push(`Fundamento "${f.dispositivo}" sem URL oficial. Cálculo BLOQUEADO.`);
    } else if (!validarUrlOficial(f.url_oficial)) {
      result.valido = false;
      result.erros.push(`URL "${f.url_oficial}" não é fonte oficial permitida para "${f.dispositivo}".`);
    }

    if (f.status === 'cancelada') {
      result.valido = false;
      result.erros.push(`Fundamento "${f.dispositivo}" está CANCELADO/SUPERADO. Não pode ser usado como default.`);
    }

    if (f.status === 'modulada' || f.status === 'controversa') {
      result.avisos.push(`Fundamento "${f.dispositivo}" tem status "${f.status}" — tese selecionada deve ser justificada.`);
    }

    if (f.status === 'historica') {
      result.avisos.push(`Fundamento "${f.dispositivo}" é histórico — aplicável apenas a competências dentro da vigência.`);
    }
  }

  return result;
}

// =====================================================
// GERADOR DE NARRATIVA JURÍDICA
// =====================================================

export function gerarNarrativaRubrica(item: CalcResultItem): string {
  const fundamentos = item.fundamento_legal
    .filter(f => f.status !== 'cancelada')
    .map(f => f.dispositivo)
    .join('; ');

  const memoriaResumo = item.memoria
    .filter(m => m.fundamento_legal)
    .map(m => `${m.descricao}: ${m.formula}`)
    .join('. ');

  const valorStr = `R$ ${item.valor_bruto.toFixed(2)}`;
  const competenciaStr = item.competencia ? ` (competência ${item.competencia})` : '';

  return `${item.rubrica_nome}${competenciaStr}: apurado o valor de ${valorStr}. ${memoriaResumo ? memoriaResumo + '.' : ''} Fundamentação: ${fundamentos || 'NÃO CADASTRADA'}.`;
}

// Configuração de precisão
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Data de modulação da OJ 394
const OJ394_MODULACAO_DATE = new Date('2023-03-20');

// =====================================================
// CONTEXTO DE EXECUÇÃO
// =====================================================

export interface ExecutionContext {
  contrato: ContractData;
  perfil: CalcProfile;
  dadosMensais: Map<string, MonthlyData>;
  validacoes: Map<string, ValidatedInput>;
  resultados: Map<string, CalcResultItem[]>;
  regras: Map<string, CalcRule>;
}

// =====================================================
// RUBRICA BASE (CLASSE ABSTRATA)
// =====================================================

export abstract class Rubrica {
  abstract codigo: string;
  abstract nome: string;
  abstract categoria: string;
  abstract dependencias: string[];
  
  protected ctx!: ExecutionContext;
  protected memorias: MemoriaCalculo[] = [];
  protected passoAtual: number = 0;
  
  setContext(ctx: ExecutionContext): void {
    this.ctx = ctx;
    this.memorias = [];
    this.passoAtual = 0;
  }
  
  protected getFundamentosLegais(): FundamentoLegal[] {
    return FUNDAMENTOS_LEGAIS[this.codigo] ?? [];
  }

  /**
   * Valida que fundamentos legais existem e são válidos.
   * Retorna null se ok, ou string de erro se bloqueado.
   */
  protected validarFundamentos(): string | null {
    const validacao = validarFundamentosRubrica(this.codigo);
    if (!validacao.valido) {
      return validacao.erros.join(' | ');
    }
    return null;
  }
  
  protected registrarPasso(
    descricao: string, formula: string,
    variaveis: Record<string, string | number>,
    resultado: Decimal, fundamento_legal?: string
  ): Decimal {
    this.passoAtual++;
    this.memorias.push({ passo: this.passoAtual, descricao, formula, variaveis, resultado, fundamento_legal });
    return resultado;
  }
  
  protected criarResultItem(item: Omit<CalcResultItem, 'fundamento_legal' | 'narrativa' | 'premissas'>): CalcResultItem {
    const fundamentos = this.getFundamentosLegais();
    const resultItem: CalcResultItem = {
      ...item,
      fundamento_legal: fundamentos,
      premissas: {
        divisor: this.ctx.perfil.parametros.divisor,
        arredondamento: this.ctx.perfil.parametros.arredondamento,
        casas_decimais: this.ctx.perfil.parametros.casas_decimais,
        metodo_dsr: this.ctx.perfil.parametros.metodo_dsr,
        indice_atualizacao: this.ctx.perfil.parametros.indice_atualizacao,
      },
    };
    // Gerar narrativa automaticamente
    resultItem.narrativa = gerarNarrativaRubrica(resultItem);
    return resultItem;
  }
  
  protected getSalarioBase(competencia: string): Decimal {
    const dados = this.ctx.dadosMensais.get(competencia);
    if (dados) return dados.salario_base;
    const compDate = new Date(competencia + '-01');
    for (const hist of this.ctx.contrato.historico_salarial) {
      if (compDate >= hist.data_inicio && compDate <= hist.data_fim) return hist.salario_base;
    }
    return this.ctx.contrato.salario_inicial;
  }
  
  protected getRemuneracaoBase(competencia: string): Decimal {
    const salario = this.getSalarioBase(competencia);
    const dados = this.ctx.dadosMensais.get(competencia);
    if (!dados) return salario;
    let total = salario;
    for (const [, valor] of Object.entries(dados.adicionais)) { total = total.plus(valor); }
    return total;
  }

  /**
   * Calcula a média de remuneração variável dos últimos 12 meses (ou período trabalhado se menor).
   * Art. 142, §§ 1º a 3º, CLT (férias de comissionista)
   * Art. 2º, Decreto 57.155/65 (13º de comissionista)
   * 
   * Retorna null se não há remuneração variável (trabalhador fixo).
   */
  protected getMediaVariavel12Meses(dataRef: Date): { media: Decimal; mesesUsados: number; temVariavel: boolean } {
    const competencias: string[] = [];
    const current = new Date(dataRef.getFullYear(), dataRef.getMonth(), 1);
    
    // Coletar até 12 meses anteriores à data de referência
    for (let i = 0; i < 12; i++) {
      current.setMonth(current.getMonth() - (i === 0 ? 0 : 1));
      const comp = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      
      // Só incluir se estiver dentro do período do contrato
      const compDate = new Date(current);
      if (compDate >= this.ctx.contrato.data_admissao) {
        competencias.push(comp);
      }
      if (i === 0) {
        current.setMonth(current.getMonth() - 1);
        // Reset to collect previous months from here
        continue;
      }
    }

    // Recoletar de forma mais limpa
    const comps: string[] = [];
    const ref = new Date(dataRef.getFullYear(), dataRef.getMonth(), 1);
    for (let i = 0; i < 12; i++) {
      const m = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      if (m < this.ctx.contrato.data_admissao) break;
      comps.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
    }

    if (comps.length === 0) {
      return { media: this.getRemuneracaoBase(`${dataRef.getFullYear()}-${String(dataRef.getMonth() + 1).padStart(2, '0')}`), mesesUsados: 1, temVariavel: false };
    }

    // Verificar se há remuneração variável (comissões, adicionais variáveis, HE habituais)
    let somaTotal = new Decimal(0);
    let temVariavel = false;
    let mesesComDados = 0;

    for (const comp of comps) {
      const dados = this.ctx.dadosMensais.get(comp);
      if (dados) {
        mesesComDados++;
        let remMes = dados.salario_base;
        for (const [, valor] of Object.entries(dados.adicionais)) {
          remMes = remMes.plus(valor);
          if (!valor.isZero()) temVariavel = true;
        }
        // Comissões e HE habituais são variáveis
        if (!dados.horas_extras_50.isZero() || !dados.horas_extras_100.isZero()) {
          temVariavel = true;
        }
        somaTotal = somaTotal.plus(remMes);
      } else {
        // Se não tem dados mensais, usar salário base do histórico
        mesesComDados++;
        somaTotal = somaTotal.plus(this.getSalarioBase(comp));
      }
    }

    const meses = mesesComDados || 1;
    return { media: somaTotal.div(meses), mesesUsados: meses, temVariavel };
  }

  /**
   * Retorna a remuneração para fins de férias e 13º:
   * - Para salário fixo: remuneração da competência
   * - Para comissionista/variável: média dos últimos 12 meses (Art. 142, CLT)
   */
  protected getRemuneracaoFeriasOu13(competencia: string): { valor: Decimal; usouMedia: boolean; mesesMedia: number } {
    const dataRef = new Date(competencia + '-01');
    const { media, mesesUsados, temVariavel } = this.getMediaVariavel12Meses(dataRef);
    
    if (temVariavel) {
      return { valor: media, usouMedia: true, mesesMedia: mesesUsados };
    }
    
    return { valor: this.getRemuneracaoBase(competencia), usouMedia: false, mesesMedia: 0 };
  }
  
  protected getSalarioHora(competencia: string): Decimal {
    return this.getRemuneracaoBase(competencia).div(this.ctx.perfil.parametros.divisor);
  }
  
  protected getResultadoRubrica(codigo: string, competencia?: string): Decimal {
    const resultados = this.ctx.resultados.get(codigo);
    if (!resultados) return new Decimal(0);
    if (competencia) {
      const item = resultados.find(r => r.competencia === competencia);
      return item?.valor_bruto ?? new Decimal(0);
    }
    return resultados.reduce((sum, r) => sum.plus(r.valor_bruto), new Decimal(0));
  }
  
  protected arredondar(valor: Decimal): Decimal {
    const casas = this.ctx.perfil.parametros.casas_decimais;
    switch (this.ctx.perfil.parametros.arredondamento) {
      case 'truncar': return valor.toDecimalPlaces(casas, Decimal.ROUND_DOWN);
      case 'ceiling': return valor.toDecimalPlaces(casas, Decimal.ROUND_UP);
      default: return valor.toDecimalPlaces(casas, Decimal.ROUND_HALF_UP);
    }
  }
  
  protected criarLineage(inputs: LineageInput[], formulaAplicada: string, outputValor: Decimal): CalcLineage {
    const regra = this.ctx.regras.get(this.codigo);
    return {
      rule_codigo: this.codigo, rule_versao: regra?.versao ?? 'v1', inputs,
      parametros: this.ctx.perfil.parametros as unknown as Record<string, string | number>,
      formula_aplicada: formulaAplicada, output_valor: outputValor,
      hash_reproducao: hashObject({ inputs, formulaAplicada, outputValor: outputValor.toString() }),
    };
  }
  
  protected isOJ394Pos(competencia: string): boolean {
    const compDate = new Date(competencia + '-01');
    return compDate >= OJ394_MODULACAO_DATE;
  }
  
  abstract calcular(): CalcResultItem[];
}

// =====================================================
// RUBRICA: HORAS EXTRAS 50%
// =====================================================

export class HorasExtras50 extends Rubrica {
  codigo = 'HE50';
  nome = 'Horas Extras 50%';
  categoria = 'horas_extras';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const bloqueio = this.validarFundamentos();
    if (bloqueio) throw new Error(bloqueio);

    const resultados: CalcResultItem[] = [];
    const adicional = this.ctx.perfil.parametros.adicional_he_50;
    
    for (const [competencia, dados] of this.ctx.dadosMensais) {
      if (dados.horas_extras_50.isZero()) continue;
      
      const salarioHora = this.getSalarioHora(competencia);
      const horas = dados.horas_extras_50;
      const fator = new Decimal(1).plus(adicional);
      
      this.registrarPasso('Salário-hora', 'Remuneração ÷ Divisor',
        { remuneracao: this.getRemuneracaoBase(competencia).toNumber(), divisor: this.ctx.perfil.parametros.divisor },
        salarioHora);
      
      const valor = salarioHora.times(horas).times(fator);
      this.registrarPasso('Horas extras 50%', 'Sal-hora × Qtd × (1 + Adic)',
        { salario_hora: salarioHora.toNumber(), horas: horas.toNumber(), adicional, fator: fator.toNumber() },
        valor, 'Art. 59, §1º, CLT + Art. 7º, XVI, CF/88');
      
      const valorFinal = this.arredondar(valor);
      resultados.push(this.criarResultItem({
        id: `${this.codigo}-${competencia}`, rubrica_codigo: this.codigo, rubrica_nome: this.nome,
        competencia, base_calculo: salarioHora, quantidade: horas, percentual: toDecimal(adicional),
        fator, valor_bruto: valorFinal, memoria: [...this.memorias], dependencias: [],
        lineage: this.criarLineage(
          [{ campo: 'salario_hora', valor: salarioHora.toNumber(), tipo: 'money' },
           { campo: 'horas_extras_50', valor: horas.toNumber(), tipo: 'number' }],
          `${salarioHora} × ${horas} × ${fator}`, valorFinal),
      }));
      this.memorias = []; this.passoAtual = 0;
    }
    return resultados;
  }
}

// =====================================================
// RUBRICA: HORAS EXTRAS 100%
// =====================================================

export class HorasExtras100 extends Rubrica {
  codigo = 'HE100';
  nome = 'Horas Extras 100%';
  categoria = 'horas_extras';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const bloqueio = this.validarFundamentos();
    if (bloqueio) throw new Error(bloqueio);

    const resultados: CalcResultItem[] = [];
    const adicional = this.ctx.perfil.parametros.adicional_he_100;
    
    for (const [competencia, dados] of this.ctx.dadosMensais) {
      if (dados.horas_extras_100.isZero()) continue;
      const salarioHora = this.getSalarioHora(competencia);
      const horas = dados.horas_extras_100;
      const fator = new Decimal(1).plus(adicional);
      
      this.registrarPasso('Salário-hora', 'Remuneração ÷ Divisor',
        { remuneracao: this.getRemuneracaoBase(competencia).toNumber(), divisor: this.ctx.perfil.parametros.divisor },
        salarioHora);
      const valor = salarioHora.times(horas).times(fator);
      this.registrarPasso('Horas extras 100%', 'Sal-hora × Qtd × (1 + Adic)',
        { salario_hora: salarioHora.toNumber(), horas: horas.toNumber(), adicional, fator: fator.toNumber() },
        valor, 'Art. 59, §1º, CLT + Súmula 146, TST');
      
      const valorFinal = this.arredondar(valor);
      resultados.push(this.criarResultItem({
        id: `${this.codigo}-${competencia}`, rubrica_codigo: this.codigo, rubrica_nome: this.nome,
        competencia, base_calculo: salarioHora, quantidade: horas, percentual: toDecimal(adicional),
        fator, valor_bruto: valorFinal, memoria: [...this.memorias], dependencias: [],
        lineage: this.criarLineage(
          [{ campo: 'salario_hora', valor: salarioHora.toNumber(), tipo: 'money' },
           { campo: 'horas_extras_100', valor: horas.toNumber(), tipo: 'number' }],
          `${salarioHora} × ${horas} × ${fator}`, valorFinal),
      }));
      this.memorias = []; this.passoAtual = 0;
    }
    return resultados;
  }
}

// =====================================================
// RUBRICA: DSR SOBRE HE (com modulação OJ 394)
// =====================================================

export class DSRHorasExtras extends Rubrica {
  codigo = 'DSR_HE';
  nome = 'DSR sobre Horas Extras';
  categoria = 'horas_extras';
  dependencias = ['HE50', 'HE100'];
  
  calcular(): CalcResultItem[] {
    const bloqueio = this.validarFundamentos();
    if (bloqueio) throw new Error(bloqueio);

    const resultados: CalcResultItem[] = [];
    const metodo = this.ctx.perfil.parametros.metodo_dsr;
    
    for (const [competencia, dados] of this.ctx.dadosMensais) {
      const he50 = this.getResultadoRubrica('HE50', competencia);
      const he100 = this.getResultadoRubrica('HE100', competencia);
      const totalHE = he50.plus(he100);
      if (totalHE.isZero()) continue;
      
      const isPos = this.isOJ394Pos(competencia);
      const oj394Label = isPos ? 'OJ 394 PÓS (repercute)' : 'OJ 394 PRE (não repercute)';
      
      let dsr: Decimal;
      if (metodo === 'fator_fixo') {
        const fator = new Decimal(this.ctx.perfil.parametros.fator_dsr ?? 1/6);
        dsr = totalHE.times(fator);
        this.registrarPasso(`DSR fator fixo [${oj394Label}]`, 'Total HE × Fator',
          { total_he: totalHE.toNumber(), fator: fator.toNumber(), oj394: oj394Label },
          dsr, 'Lei 605/49 + Súmula 172 TST');
      } else {
        const diasUteis = dados.dias_uteis || 26;
        const diasDSR = dados.dias_dsr || 4;
        dsr = totalHE.div(diasUteis).times(diasDSR);
        this.registrarPasso(`DSR calendário [${oj394Label}]`, '(Total HE ÷ Dias Úteis) × Dias DSR',
          { total_he: totalHE.toNumber(), dias_uteis: diasUteis, dias_dsr: diasDSR, oj394: oj394Label },
          dsr, 'Lei 605/49 + Súmula 172 TST');
      }
      
      const valorFinal = this.arredondar(dsr);
      const fundamentos = [
        ...FUNDAMENTOS_LEGAIS['DSR_HE'],
        ...(isPos ? FUNDAMENTOS_LEGAIS['DSR_OJ394_POS'] : FUNDAMENTOS_LEGAIS['DSR_OJ394_PRE']),
      ];
      
      const item: CalcResultItem = {
        id: `${this.codigo}-${competencia}`, rubrica_codigo: this.codigo,
        rubrica_nome: `${this.nome} [${isPos ? 'OJ394-PÓS' : 'OJ394-PRE'}]`,
        competencia, base_calculo: totalHE, quantidade: new Decimal(1),
        valor_bruto: valorFinal, fundamento_legal: fundamentos,
        memoria: [...this.memorias], dependencias: this.dependencias,
        premissas: {
          metodo_dsr: metodo, oj394_regime: isPos ? 'pos' : 'pre',
          divisor: this.ctx.perfil.parametros.divisor,
        },
        lineage: this.criarLineage(
          [{ campo: 'total_he', valor: totalHE.toNumber(), tipo: 'money' },
           { campo: 'oj394_regime', valor: isPos ? 'pos' : 'pre', tipo: 'string' }],
          `Método ${metodo} [${oj394Label}]: ${valorFinal}`, valorFinal),
      };
      item.narrativa = gerarNarrativaRubrica(item);
      resultados.push(item);
      this.memorias = []; this.passoAtual = 0;
    }
    return resultados;
  }
}

// =====================================================
// RUBRICA: ADICIONAL NOTURNO
// =====================================================

export class AdicionalNoturno extends Rubrica {
  codigo = 'ADIC_NOT';
  nome = 'Adicional Noturno';
  categoria = 'adicionais';
  dependencias: string[] = [];
  
  calcular(): CalcResultItem[] {
    const bloqueio = this.validarFundamentos();
    if (bloqueio) throw new Error(bloqueio);

    const resultados: CalcResultItem[] = [];
    const percentual = this.ctx.perfil.parametros.percentual_noturno;
    const reducao = this.ctx.perfil.parametros.reducao_hora_noturna;
    const fatorReducao = this.ctx.perfil.parametros.fator_reducao_noturna;
    
    for (const [competencia, dados] of this.ctx.dadosMensais) {
      if (dados.horas_noturnas.isZero()) continue;
      const salarioHora = this.getSalarioHora(competencia);
      let horasCalculadas = dados.horas_noturnas;
      
      if (reducao) {
        horasCalculadas = horasCalculadas.div(fatorReducao);
        this.registrarPasso('Hora noturna reduzida (52\'30")', 'Horas ÷ Fator',
          { horas_originais: dados.horas_noturnas.toNumber(), fator_reducao: fatorReducao }, horasCalculadas);
      }
      
      const valor = salarioHora.times(horasCalculadas).times(percentual);
      this.registrarPasso('Adicional noturno', 'Sal-hora × Horas × %',
        { salario_hora: salarioHora.toNumber(), horas: horasCalculadas.toNumber(), percentual },
        valor, 'Art. 73, CLT');
      
      const valorFinal = this.arredondar(valor);
      resultados.push(this.criarResultItem({
        id: `${this.codigo}-${competencia}`, rubrica_codigo: this.codigo, rubrica_nome: this.nome,
        competencia, base_calculo: salarioHora, quantidade: horasCalculadas,
        percentual: toDecimal(percentual), valor_bruto: valorFinal,
        memoria: [...this.memorias], dependencias: [],
        lineage: this.criarLineage(
          [{ campo: 'salario_hora', valor: salarioHora.toNumber(), tipo: 'money' },
           { campo: 'horas_noturnas', valor: dados.horas_noturnas.toNumber(), tipo: 'number' }],
          `${salarioHora} × ${horasCalculadas} × ${percentual}`, valorFinal),
      }));
      this.memorias = []; this.passoAtual = 0;
    }
    return resultados;
  }
}

// =====================================================
// RUBRICA: REFLEXOS EM FÉRIAS (OJ 394 aware)
// =====================================================

export class ReflexoFerias extends Rubrica {
  codigo = 'REFL_FERIAS';
  nome = 'Reflexos em Férias + 1/3';
  categoria = 'reflexos';
  dependencias = ['HE50', 'HE100', 'DSR_HE', 'ADIC_NOT'];
  
  calcular(): CalcResultItem[] {
    const bloqueio = this.validarFundamentos();
    if (bloqueio) throw new Error(bloqueio);

    let totalIntegravel = new Decimal(0);
    let mesesTrabalhados = 0;
    
    for (const [competencia] of this.ctx.dadosMensais) {
      let integravelMes = new Decimal(0);
      for (const dep of ['HE50', 'HE100', 'ADIC_NOT']) {
        integravelMes = integravelMes.plus(this.getResultadoRubrica(dep, competencia));
      }
      const dsrVal = this.getResultadoRubrica('DSR_HE', competencia);
      if (!dsrVal.isZero() && this.isOJ394Pos(competencia)) {
        integravelMes = integravelMes.plus(dsrVal);
      }
      if (integravelMes.greaterThan(0)) { totalIntegravel = totalIntegravel.plus(integravelMes); mesesTrabalhados++; }
    }
    if (mesesTrabalhados === 0) return [];
    
    const media = totalIntegravel.div(mesesTrabalhados);
    this.registrarPasso('Média integrável (OJ 394 aware)', 'Total ÷ Meses',
      { total: totalIntegravel.toNumber(), meses: mesesTrabalhados }, media, 'Art. 142, CLT');
    
    const terco = media.div(3);
    this.registrarPasso('1/3 constitucional', 'Média ÷ 3', { media: media.toNumber() }, terco, 'Art. 7º, XVII, CF/88');
    
    const total = media.plus(terco);
    const valorFinal = this.arredondar(total);
    
    return [this.criarResultItem({
      id: `${this.codigo}-total`, rubrica_codigo: this.codigo, rubrica_nome: this.nome,
      base_calculo: media, quantidade: new Decimal(1), fator: new Decimal(4).div(3),
      valor_bruto: valorFinal, memoria: [...this.memorias], dependencias: this.dependencias,
      lineage: this.criarLineage([{ campo: 'media_integravel', valor: media.toNumber(), tipo: 'money' }],
        `${media} + (${media} ÷ 3) = ${valorFinal}`, valorFinal),
    })];
  }
}

// =====================================================
// RUBRICA: REFLEXOS EM 13º (OJ 394 + Súmula 45)
// =====================================================

export class Reflexo13 extends Rubrica {
  codigo = 'REFL_13';
  nome = 'Reflexos em 13º Salário';
  categoria = 'reflexos';
  dependencias = ['HE50', 'HE100', 'DSR_HE', 'ADIC_NOT'];
  
  calcular(): CalcResultItem[] {
    const bloqueio = this.validarFundamentos();
    if (bloqueio) throw new Error(bloqueio);

    const resultados: CalcResultItem[] = [];
    const porAno = new Map<number, { total: Decimal; meses: number }>();
    
    for (const [competencia] of this.ctx.dadosMensais) {
      const ano = parseInt(competencia.split('-')[0]);
      let integravelMes = new Decimal(0);
      for (const dep of ['HE50', 'HE100', 'ADIC_NOT']) {
        integravelMes = integravelMes.plus(this.getResultadoRubrica(dep, competencia));
      }
      const dsrVal = this.getResultadoRubrica('DSR_HE', competencia);
      if (!dsrVal.isZero() && this.isOJ394Pos(competencia)) {
        integravelMes = integravelMes.plus(dsrVal);
      }
      if (integravelMes.greaterThan(0)) {
        const atual = porAno.get(ano) || { total: new Decimal(0), meses: 0 };
        atual.total = atual.total.plus(integravelMes); atual.meses++;
        porAno.set(ano, atual);
      }
    }
    
    for (const [ano, dados] of porAno) {
      if (dados.meses === 0) continue;
      const media = dados.total.div(dados.meses);
      const avos = Math.min(dados.meses, 12);
      const decimo = media.times(avos).div(12);
      
      this.registrarPasso(`Média integrável ${ano}`, 'Total ÷ Meses',
        { total: dados.total.toNumber(), meses: dados.meses }, media);
      this.registrarPasso(`13º proporcional ${ano}`, 'Média × (Avos ÷ 12)',
        { media: media.toNumber(), avos }, decimo, 'Lei 4.090/62 + Súmula 45 TST');
      
      const valorFinal = this.arredondar(decimo);
      resultados.push(this.criarResultItem({
        id: `${this.codigo}-${ano}`, rubrica_codigo: this.codigo, rubrica_nome: this.nome,
        competencia: `${ano}-13`, base_calculo: media, quantidade: toDecimal(avos),
        fator: new Decimal(avos).div(12), valor_bruto: valorFinal,
        memoria: [...this.memorias], dependencias: this.dependencias,
        lineage: this.criarLineage(
          [{ campo: 'media', valor: media.toNumber(), tipo: 'money' }, { campo: 'avos', valor: avos, tipo: 'number' }],
          `${media} × ${avos}/12`, valorFinal),
      }));
      this.memorias = []; this.passoAtual = 0;
    }
    return resultados;
  }
}

// =====================================================
// RUBRICA: FGTS
// =====================================================

export class FGTS extends Rubrica {
  codigo = 'FGTS';
  nome = 'FGTS Não Depositado';
  categoria = 'reflexos';
  dependencias = ['HE50', 'HE100', 'DSR_HE', 'ADIC_NOT', 'REFL_FERIAS', 'REFL_13'];
  
  calcular(): CalcResultItem[] {
    const bloqueio = this.validarFundamentos();
    if (bloqueio) throw new Error(bloqueio);

    const resultados: CalcResultItem[] = [];
    const aliquota = this.ctx.perfil.parametros.aliquota_fgts;
    
    for (const [competencia, dados] of this.ctx.dadosMensais) {
      let baseCalculo = dados.salario_base;
      for (const dep of ['HE50', 'HE100', 'ADIC_NOT']) {
        baseCalculo = baseCalculo.plus(this.getResultadoRubrica(dep, competencia));
      }
      const dsrVal = this.getResultadoRubrica('DSR_HE', competencia);
      if (!dsrVal.isZero() && this.isOJ394Pos(competencia)) {
        baseCalculo = baseCalculo.plus(dsrVal);
      }
      if (baseCalculo.isZero()) continue;
      
      const fgts = baseCalculo.times(aliquota);
      this.registrarPasso('FGTS mensal', 'Base × 8%',
        { base: baseCalculo.toNumber(), aliquota }, fgts, 'Art. 15, Lei 8.036/90');
      
      const valorFinal = this.arredondar(fgts);
      resultados.push(this.criarResultItem({
        id: `${this.codigo}-${competencia}`, rubrica_codigo: this.codigo, rubrica_nome: this.nome,
        competencia, base_calculo: baseCalculo, quantidade: new Decimal(1),
        percentual: toDecimal(aliquota), valor_bruto: valorFinal,
        memoria: [...this.memorias], dependencias: ['HE50', 'HE100', 'DSR_HE', 'ADIC_NOT'],
        lineage: this.criarLineage([{ campo: 'base_fgts', valor: baseCalculo.toNumber(), tipo: 'money' }],
          `${baseCalculo} × ${aliquota}`, valorFinal),
      }));
      this.memorias = []; this.passoAtual = 0;
    }
    return resultados;
  }
}

// =====================================================
// RUBRICA: MULTA 40% FGTS
// =====================================================

export class MultaFGTS extends Rubrica {
  codigo = 'MULTA_FGTS';
  nome = 'Multa 40% FGTS';
  categoria = 'rescisao';
  dependencias = ['FGTS'];
  
  calcular(): CalcResultItem[] {
    const bloqueio = this.validarFundamentos();
    if (bloqueio) throw new Error(bloqueio);

    const tipoDemissao = this.ctx.contrato.tipo_demissao;
    if (!['sem_justa_causa', 'rescisao_indireta'].includes(tipoDemissao)) return [];
    
    const totalFGTS = this.getResultadoRubrica('FGTS');
    if (totalFGTS.isZero()) return [];
    
    let percentualMulta = this.ctx.perfil.parametros.multa_fgts;
    if (tipoDemissao === 'acordo') percentualMulta = 0.2;
    
    const multa = totalFGTS.times(percentualMulta);
    this.registrarPasso('Multa FGTS', 'Total FGTS × %',
      { total_fgts: totalFGTS.toNumber(), percentual: percentualMulta }, multa, 'Art. 18, §1º, Lei 8.036/90');
    
    const valorFinal = this.arredondar(multa);
    return [this.criarResultItem({
      id: `${this.codigo}-total`, rubrica_codigo: this.codigo, rubrica_nome: this.nome,
      base_calculo: totalFGTS, quantidade: new Decimal(1), percentual: toDecimal(percentualMulta),
      valor_bruto: valorFinal, memoria: [...this.memorias], dependencias: this.dependencias,
      lineage: this.criarLineage(
        [{ campo: 'total_fgts', valor: totalFGTS.toNumber(), tipo: 'money' }],
        `${totalFGTS} × ${percentualMulta}`, valorFinal),
    })];
  }
}

// =====================================================
// RUBRICA: INSS (Progressivo por faixa)
// =====================================================

export class INSSRubrica extends Rubrica {
  codigo = 'INSS';
  nome = 'INSS Desconto';
  categoria = 'tributos';
  dependencias = ['HE50', 'HE100', 'DSR_HE', 'ADIC_NOT', 'SALDO_SAL', 'AVISO_PREVIO', 'DECIMO_PROP'];
  
  // Tabelas progressivas por ano (Portaria MPS/MF)
  private getFaixas(ano: number) {
    if (ano >= 2025) {
      // Portaria MPS/MF nº 6/2025 — Salário mínimo R$ 1.518,00
      return [
        { ate: new Decimal(1518.00), aliquota: new Decimal(0.075) },
        { ate: new Decimal(2793.88), aliquota: new Decimal(0.09) },
        { ate: new Decimal(4190.83), aliquota: new Decimal(0.12) },
        { ate: new Decimal(8157.41), aliquota: new Decimal(0.14) },
      ];
    }
    // 2024 — Salário mínimo R$ 1.412,00
    return [
      { ate: new Decimal(1412.00), aliquota: new Decimal(0.075) },
      { ate: new Decimal(2666.68), aliquota: new Decimal(0.09) },
      { ate: new Decimal(4000.03), aliquota: new Decimal(0.12) },
      { ate: new Decimal(7786.02), aliquota: new Decimal(0.14) },
    ];
  }

  private calcularINSSProgressivo(remuneracao: Decimal, faixas: ReturnType<typeof this.getFaixas>, label: string): Decimal {
    let inssTotal = new Decimal(0);
    let faixaAnterior = new Decimal(0);
    
    for (const faixa of faixas) {
      const baseFaixa = Decimal.min(remuneracao, faixa.ate).minus(faixaAnterior);
      if (baseFaixa.isPositive()) {
        inssTotal = inssTotal.plus(baseFaixa.times(faixa.aliquota));
        this.registrarPasso(`${label} Faixa até R$ ${faixa.ate}`, `R$ ${baseFaixa.toFixed(2)} × ${(faixa.aliquota.toNumber()*100).toFixed(1)}%`,
          { base_faixa: baseFaixa.toNumber(), aliquota: faixa.aliquota.toNumber() },
          baseFaixa.times(faixa.aliquota), 'EC 103/2019');
      }
      faixaAnterior = faixa.ate;
      if (remuneracao.lessThanOrEqualTo(faixa.ate)) break;
    }
    return inssTotal;
  }
  
  calcular(): CalcResultItem[] {
    const bloqueio = this.validarFundamentos();
    if (bloqueio) throw new Error(bloqueio);

    const resultados: CalcResultItem[] = [];
    
    // ── LOOP 1: INSS sobre dadosMensais (contracheques) ──
    for (const [competencia, dados] of this.ctx.dadosMensais) {
      const ano = parseInt(competencia.split('-')[0]);
      const faixas = this.getFaixas(ano);
      
      let remuneracao = dados.salario_base;
      for (const dep of ['HE50', 'HE100', 'DSR_HE', 'ADIC_NOT']) {
        remuneracao = remuneracao.plus(this.getResultadoRubrica(dep, competencia));
      }
      if (remuneracao.isZero()) continue;
      
      const inssTotal = this.calcularINSSProgressivo(remuneracao, faixas, 'INSS');
      
      const valorFinal = this.arredondar(inssTotal);
      resultados.push(this.criarResultItem({
        id: `${this.codigo}-${competencia}`, rubrica_codigo: this.codigo, rubrica_nome: this.nome,
        competencia, base_calculo: remuneracao, quantidade: new Decimal(1),
        valor_bruto: valorFinal, memoria: [...this.memorias], dependencias: this.dependencias,
        lineage: this.criarLineage(
          [{ campo: 'remuneracao', valor: remuneracao.toNumber(), tipo: 'money' }],
          `INSS progressivo sobre ${remuneracao}`, valorFinal),
      }));
      this.memorias = []; this.passoAtual = 0;
    }
    
    // ── LOOP 2: INSS sobre verbas rescisórias tributáveis ──
    // Base legal: Art. 28, Lei 8.212/91
    // Tributáveis: Saldo de Salário, Aviso Prévio Indenizado
    // Isentas: Férias indenizadas + 1/3 (Art. 28, §9º, "d", Lei 8.212/91)
    const dataDemissao = this.ctx.contrato.data_demissao || new Date();
    const anoRescisao = dataDemissao.getFullYear();
    const mesRescisao = `${anoRescisao}-${String(dataDemissao.getMonth() + 1).padStart(2, '0')}`;
    const faixasRescisao = this.getFaixas(anoRescisao);
    
    // Somar verbas rescisórias tributáveis
    let baseRescisoria = new Decimal(0);
    const saldoSal = this.getResultadoRubrica('SALDO_SAL');
    const avisoPrevio = this.getResultadoRubrica('AVISO_PREVIO');
    baseRescisoria = baseRescisoria.plus(saldoSal).plus(avisoPrevio);
    
    if (baseRescisoria.greaterThan(0)) {
      this.registrarPasso('Base INSS rescisória', 'Saldo Salário + Aviso Prévio',
        { saldo_sal: saldoSal.toNumber(), aviso_previo: avisoPrevio.toNumber() },
        baseRescisoria, 'Art. 28, Lei 8.212/91');
      
      const inssRescisao = this.calcularINSSProgressivo(baseRescisoria, faixasRescisao, 'INSS Rescisão');
      
      const valorFinal = this.arredondar(inssRescisao);
      resultados.push(this.criarResultItem({
        id: `${this.codigo}-rescisao`, rubrica_codigo: this.codigo, rubrica_nome: 'INSS s/ Verbas Rescisórias',
        competencia: mesRescisao, base_calculo: baseRescisoria, quantidade: new Decimal(1),
        valor_bruto: valorFinal, memoria: [...this.memorias], dependencias: ['SALDO_SAL', 'AVISO_PREVIO'],
        lineage: this.criarLineage(
          [{ campo: 'base_rescisoria', valor: baseRescisoria.toNumber(), tipo: 'money' }],
          `INSS progressivo rescisório sobre ${baseRescisoria}`, valorFinal),
      }));
      this.memorias = []; this.passoAtual = 0;
    }
    
    // ── ITEM SEPARADO: INSS sobre 13º Proporcional ──
    // Art. 214, §6º, RPS: tributação isolada (tabela própria, não soma com demais verbas)
    const decimo = this.getResultadoRubrica('DECIMO_PROP');
    if (decimo.greaterThan(0)) {
      this.registrarPasso('Base INSS 13º', '13º Proporcional (tributação isolada)',
        { decimo_prop: decimo.toNumber() },
        decimo, 'Art. 214, §6º, Decreto 3.048/99 (RPS)');
      
      const inss13 = this.calcularINSSProgressivo(decimo, faixasRescisao, 'INSS 13º');
      
      const valorFinal = this.arredondar(inss13);
      resultados.push(this.criarResultItem({
        id: `${this.codigo}-13prop`, rubrica_codigo: this.codigo, rubrica_nome: 'INSS s/ 13º Proporcional',
        competencia: `${anoRescisao}-13`, base_calculo: decimo, quantidade: new Decimal(1),
        valor_bruto: valorFinal, memoria: [...this.memorias], dependencias: ['DECIMO_PROP'],
        lineage: this.criarLineage(
          [{ campo: 'decimo_prop', valor: decimo.toNumber(), tipo: 'money' }],
          `INSS isolado sobre 13º ${decimo}`, valorFinal),
      }));
      this.memorias = []; this.passoAtual = 0;
    }
    
    return resultados;
  }
}

// =====================================================
// RUBRICA: IRRF (Progressivo com deduções)
// =====================================================

export class IRRFRubrica extends Rubrica {
  codigo = 'IRRF';
  nome = 'IRRF Desconto';
  categoria = 'tributos';
  dependencias = ['INSS'];
  
  calcular(): CalcResultItem[] {
    const bloqueio = this.validarFundamentos();
    if (bloqueio) throw new Error(bloqueio);

    const resultados: CalcResultItem[] = [];
    const faixas = [
      { ate: new Decimal(2259.20), aliquota: new Decimal(0), deducao: new Decimal(0) },
      { ate: new Decimal(2826.65), aliquota: new Decimal(0.075), deducao: new Decimal(169.44) },
      { ate: new Decimal(3751.05), aliquota: new Decimal(0.15), deducao: new Decimal(381.44) },
      { ate: new Decimal(4664.68), aliquota: new Decimal(0.225), deducao: new Decimal(662.77) },
      { ate: new Decimal(99999999), aliquota: new Decimal(0.275), deducao: new Decimal(896.00) },
    ];
    
    for (const [competencia, dados] of this.ctx.dadosMensais) {
      let remuneracao = dados.salario_base;
      for (const dep of ['HE50', 'HE100', 'DSR_HE', 'ADIC_NOT']) {
        remuneracao = remuneracao.plus(this.getResultadoRubrica(dep, competencia));
      }
      const inss = this.getResultadoRubrica('INSS', competencia);
      const baseIR = remuneracao.minus(inss);
      
      if (baseIR.lessThanOrEqualTo(faixas[0].ate)) continue;
      
      let irrf = new Decimal(0);
      for (const faixa of faixas) {
        if (baseIR.lessThanOrEqualTo(faixa.ate)) {
          irrf = baseIR.times(faixa.aliquota).minus(faixa.deducao);
          this.registrarPasso('IRRF', `Base R$ ${baseIR.toFixed(2)} × ${(faixa.aliquota.toNumber()*100).toFixed(1)}% - R$ ${faixa.deducao.toFixed(2)}`,
            { base_ir: baseIR.toNumber(), aliquota: faixa.aliquota.toNumber(), deducao: faixa.deducao.toNumber() },
            irrf, 'Lei 7.713/88');
          break;
        }
      }
      if (irrf.isNegative()) irrf = new Decimal(0);
      
      const valorFinal = this.arredondar(irrf);
      resultados.push(this.criarResultItem({
        id: `${this.codigo}-${competencia}`, rubrica_codigo: this.codigo, rubrica_nome: this.nome,
        competencia, base_calculo: baseIR, quantidade: new Decimal(1),
        valor_bruto: valorFinal, memoria: [...this.memorias], dependencias: this.dependencias,
        lineage: this.criarLineage(
          [{ campo: 'base_ir', valor: baseIR.toNumber(), tipo: 'money' },
           { campo: 'inss_deduzido', valor: inss.toNumber(), tipo: 'money' }],
          `IRRF sobre ${baseIR} (Rem ${remuneracao} - INSS ${inss})`, valorFinal),
      }));
      this.memorias = []; this.passoAtual = 0;
    }
    return resultados;
  }
}

// Registry and execution order moved to RubricaRegistry.ts to avoid circular deps
export { RUBRICAS_REGISTRY, ORDEM_EXECUCAO } from './RubricaRegistry';
