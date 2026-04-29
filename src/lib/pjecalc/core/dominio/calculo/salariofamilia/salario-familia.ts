/**
 * PJe-Calc v2.15.1 — SalarioFamilia + MaquinaDeCalculoDeSalarioFamilia
 * Porte 1:1 de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia (447 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.MaquinaDeCalculoDeSalarioFamilia (271 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.OcorrenciaDeSalarioFamilia (205 LOC)
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.VariacaoQuantidadeFilho (176 LOC)
 *
 * Art. 65 Lei 8.213/91 — pago por filho menor de 14 anos (ou invalido).
 * Implementa:
 *   - Periodo configuravel (dataInicial, dataFinal).
 *   - VariacaoQuantidadeFilho: array de eventos (dataInicial, dataFinal, qtd)
 *     que sobrescreve a quantFilhosMenores14 default por subperiodos.
 *   - Apuracao mes-a-mes (cada competencia gera 1 OcorrenciaDeSalarioFamilia).
 *   - Calculo da remuneracao mensal: salarios pagos (3 fontes) + soma
 *     diferencas das verbas devidas (com integralizacao se flag).
 *   - TabelaSalarioFamilia (faixas teto/cota por competencia) — cota cai a
 *     zero se remuneracaoMensal > teto da faixa.
 *   - Proporcionalizacao por mes parcial (admissao/demissao no mes).
 *   - Indice acumulado por ocorrencia (correcao monetaria competencia→liquidacao).
 *   - Juros simples na data fim de cada ocorrencia.
 *
 * Mantem export `SalarioFamilia` legado para retrocompat engine v3.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { IModuloLiquidavel } from '../calculo';

const ZERO = new Decimal(0);

/** Java enum TipoSalarioPagoEnum (subset usado em SF). */
export type TipoSalarioPagoSF = 'HISTORICO_SALARIAL' | 'ULTIMA_REMUNERACAO' | 'MAIOR_REMUNERACAO';

/**
 * Java VariacaoQuantidadeFilho — sobrescreve quantFilhosMenores14 num
 * subperiodo (ex: 1 filho ate 2020-06, depois 2 filhos ate liquidacao).
 */
export interface VariacaoQuantidadeFilho {
  dataInicial: Date;
  dataFinal: Date;
  quantidadeFilhos: number;
}

/**
 * Java TabelaSalarioFamilia — uma faixa por competencia. Define o teto
 * salarial e o valor da cota por filho. Se remuneracao > teto → cota = 0.
 */
export interface FaixaTabelaSalarioFamilia {
  /** Competencia 'YYYY-MM' inicio da vigencia. */
  competenciaInicio: string;
  /** Competencia 'YYYY-MM' fim da vigencia (inclusive). */
  competenciaFim: string;
  /** Limite superior da remuneracao mensal para receber cota integral. */
  tetoRemuneracaoMensal: Decimal;
  /** Valor da cota por filho (R$). */
  valorCota: Decimal;
}

/** Java OcorrenciaDeSalarioFamilia — 1 por competencia. */
export interface OcorrenciaDeSalarioFamilia {
  dataInicioOcorrencia: Date;
  dataFimOcorrencia: Date;
  quantidadeFilhos: number;
  valorRemuneracaoMensal: Decimal;
  /** valor da cota × qtdFilhos (apos teto). */
  valorSalarioFamilia: Decimal;
  /** Indice acumulado entre competencia e dataLiquidacao. */
  indiceAcumulado: Decimal;
  taxaDeJuros: Decimal;
}

/** Verba subset para soma de diferencas. */
export interface VerbaSalarioFamiliaInput {
  competencia: string;
  dataInicial: Date;
  dataFinal: Date;
  ativo: boolean;
  diferenca: Decimal;
  diferencaIntegral: Decimal | null;
  integralizar: boolean;
  excluirFeriasGozadas: boolean;
  excluirFaltaJustificada: boolean;
  excluirFaltaNaoJustificada: boolean;
}

export interface HistoricoSalarialInput {
  competencia: string;
  valor: Decimal;
}

/** Input para liquidar(). */
export interface CalculoSalarioFamiliaInput {
  dataAdmissao: Date;
  dataDemissao: Date;
  dataDeLiquidacao: Date;
  /** Tabelas SF por competencia (carregadas de pjecalc_salario_familia). */
  faixasTabela: FaixaTabelaSalarioFamilia[];
  verbas?: VerbaSalarioFamiliaInput[];
  historicosSalariais?: HistoricoSalarialInput[];
  /** Indices acumulados por competencia (YYYY-MM → fator). */
  indicesAcumulados: Record<string, Decimal>;
  /** Taxa de juros simples por competencia (YYYY-MM → %). */
  taxaJurosPorCompetencia?: Record<string, Decimal>;
  obterDiasFerias?: (dataIni: Date, dataFim: Date) => number;
  obterFaltasJustificadas?: (dataIni: Date, dataFim: Date) => number;
  obterFaltasNaoJustificadas?: (dataIni: Date, dataFim: Date) => number;
  valorUltimaRemuneracao?: Decimal | null;
  valorMaiorRemuneracao?: Decimal | null;
}

function fmtComp(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function ymToDateInicio(ym: string): Date {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

function ymToDateFim(ym: string): Date {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0));
}

function eachMonth(start: Date, end: Date): Array<{ inicio: Date; fim: Date; competencia: string }> {
  const out: Array<{ inicio: Date; fim: Date; competencia: string }> = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end) {
    const ym = fmtComp(cursor);
    const inicio = cursor < start ? start : new Date(cursor);
    const fimMes = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    const fim = end < fimMes ? end : fimMes;
    out.push({ inicio: new Date(inicio), fim: new Date(fim), competencia: ym });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

function zerarSeNegativo(v: Decimal): Decimal {
  return v.lt(ZERO) ? ZERO : v;
}

/**
 * Entidade SalarioFamilia — porte 1:1 do Java.
 */
export class SalarioFamilia implements IModuloLiquidavel {
  private apurarSalarioFamilia: boolean = false;
  private quantFilhosMenores14Anos: number = 0;
  private variacaoQuantidadesFilhos: VariacaoQuantidadeFilho[] = [];
  private dataInicial: Date | null = null;
  private dataFinal: Date | null = null;
  private tipoSalarioPago: TipoSalarioPagoSF = 'HISTORICO_SALARIAL';
  private ocorrencias: OcorrenciaDeSalarioFamilia[] = [];
  private comporPrincipal: boolean = true;

  // Maquina LAZY
  private _maquina: MaquinaDeCalculoDeSalarioFamilia | null = null;
  private getMaquina(): MaquinaDeCalculoDeSalarioFamilia {
    if (this._maquina === null) this._maquina = new MaquinaDeCalculoDeSalarioFamilia(this);
    return this._maquina;
  }

  // Getters/Setters Java 1:1
  getApurarSalarioFamilia(): boolean { return this.apurarSalarioFamilia; }
  setApurarSalarioFamilia(v: boolean): void { this.apurarSalarioFamilia = v; }
  getQuantFilhosMenores14Anos(): number { return this.quantFilhosMenores14Anos; }
  setQuantFilhosMenores14Anos(v: number): void { this.quantFilhosMenores14Anos = v; }
  getVariacaoQuantidadesFilhos(): VariacaoQuantidadeFilho[] { return this.variacaoQuantidadesFilhos; }
  setVariacaoQuantidadesFilhos(v: VariacaoQuantidadeFilho[]): void { this.variacaoQuantidadesFilhos = v; }
  getDataInicial(): Date | null { return this.dataInicial; }
  setDataInicial(v: Date | null): void { this.dataInicial = v; }
  getDataFinal(): Date | null { return this.dataFinal; }
  setDataFinal(v: Date | null): void { this.dataFinal = v; }
  getTipoSalarioPago(): TipoSalarioPagoSF { return this.tipoSalarioPago; }
  setTipoSalarioPago(v: TipoSalarioPagoSF): void { this.tipoSalarioPago = v; }
  getOcorrencias(): OcorrenciaDeSalarioFamilia[] { return this.ocorrencias; }
  getComporPrincipal(): boolean { return this.comporPrincipal; }
  setComporPrincipal(v: boolean): void { this.comporPrincipal = v; }

  /**
   * Java SalarioFamilia.encontraQuantidadeDeFilhosNa() — varre variacoes
   * para sobrescrever a quantidade default na competencia consultada.
   */
  encontraQuantidadeDeFilhosNa(competencia: Date): number {
    for (const v of this.variacaoQuantidadesFilhos) {
      if (competencia >= v.dataInicial && competencia <= v.dataFinal) {
        return v.quantidadeFilhos;
      }
    }
    return this.quantFilhosMenores14Anos;
  }

  /** Java SalarioFamilia.getValorTotalDoSalarioFamilia(). */
  getValorTotalDoSalarioFamilia(): Decimal {
    return this.ocorrencias.reduce((acc, o) => acc.plus(o.valorSalarioFamilia), ZERO);
  }

  /** Java SalarioFamilia.getValorTotalCorrigido(). */
  getValorTotalCorrigido(): Decimal {
    return this.ocorrencias.reduce(
      (acc, o) => acc.plus(o.valorSalarioFamilia.times(o.indiceAcumulado)),
      ZERO,
    );
  }

  /** Java SalarioFamilia.getValorTotalDeJuros(). */
  getValorTotalDeJuros(): Decimal {
    return this.ocorrencias.reduce(
      (acc, o) => acc.plus(o.valorSalarioFamilia.times(o.indiceAcumulado).times(o.taxaDeJuros.div(100))),
      ZERO,
    );
  }

  liquidarComDados(input: CalculoSalarioFamiliaInput): void {
    this.getMaquina().liquidar(input);
  }

  liquidar(): void { /* no-op IModuloLiquidavel */ }
}

/** Maquina de calculo — porte 1:1 do Java MaquinaDeCalculoDeSalarioFamilia. */
export class MaquinaDeCalculoDeSalarioFamilia {
  constructor(private readonly sf: SalarioFamilia) {}

  liquidar(input: CalculoSalarioFamiliaInput): void {
    // Java: limparOcorrencias() + se apurar=true → iterar competencias.
    this.sf.getOcorrencias().length = 0;
    if (!this.sf.getApurarSalarioFamilia()) return;
    if (this.sf.getDataInicial() === null || this.sf.getDataFinal() === null) return;

    const ocorrencias = this.sf.getOcorrencias();
    const periodos = eachMonth(this.sf.getDataInicial()!, this.sf.getDataFinal()!);
    for (const p of periodos) {
      const oco: OcorrenciaDeSalarioFamilia = {
        dataInicioOcorrencia: p.inicio,
        dataFimOcorrencia: p.fim,
        quantidadeFilhos: this.sf.encontraQuantidadeDeFilhosNa(p.inicio),
        valorRemuneracaoMensal: ZERO,
        valorSalarioFamilia: ZERO,
        indiceAcumulado: input.indicesAcumulados[p.competencia] ?? new Decimal(1),
        taxaDeJuros: input.taxaJurosPorCompetencia?.[p.competencia] ?? ZERO,
      };
      const valorSalariosPagos = this.calculaValorSalariosPagos(p.competencia, input);
      const somaDiferencas = this.calculaSomaDiferencas(p, input);
      let valorRem = ZERO;
      if (somaDiferencas !== null) valorRem = valorRem.plus(somaDiferencas);
      if (valorSalariosPagos !== null) valorRem = valorRem.plus(valorSalariosPagos);
      oco.valorRemuneracaoMensal = valorRem;
      oco.valorSalarioFamilia = this.encontraValorDoSalarioFamilia(valorRem, oco, input);
      ocorrencias.push(oco);
    }
  }

  /** Java calculaValorSalariosPagosParaLiquidacaoNa(). */
  private calculaValorSalariosPagos(competencia: string, input: CalculoSalarioFamiliaInput): Decimal | null {
    switch (this.sf.getTipoSalarioPago()) {
      case 'ULTIMA_REMUNERACAO':
        return input.valorUltimaRemuneracao ?? null;
      case 'MAIOR_REMUNERACAO':
        return input.valorMaiorRemuneracao ?? null;
      case 'HISTORICO_SALARIAL': {
        const list = (input.historicosSalariais ?? []).filter(h => h.competencia.startsWith(competencia));
        if (list.length === 0) return null;
        return list.reduce((s, h) => s.plus(h.valor), ZERO);
      }
    }
    return null;
  }

  /** Java calculaValorSomaDasDiferencasParaO(periodo). */
  private calculaSomaDiferencas(
    periodo: { inicio: Date; fim: Date; competencia: string },
    input: CalculoSalarioFamiliaInput,
  ): Decimal | null {
    const verbas = (input.verbas ?? []).filter(v => v.ativo && v.competencia.startsWith(periodo.competencia));
    if (verbas.length === 0) return null;
    let total: Decimal | null = null;
    for (const v of verbas) {
      let novaDif = v.diferenca;
      if (v.integralizar) {
        novaDif = v.diferencaIntegral ?? this.integralizar(v, input);
      }
      total = (total ?? ZERO).plus(zerarSeNegativo(novaDif));
    }
    return total;
  }

  /** Java CalculoDoIntegralizar (simplificado). */
  private integralizar(o: VerbaSalarioFamiliaInput, input: CalculoSalarioFamiliaInput): Decimal {
    const totalDias = Math.max(1, Math.ceil((o.dataFinal.getTime() - o.dataInicial.getTime()) / 86400000) + 1);
    let exclu = 0;
    if (o.excluirFeriasGozadas && input.obterDiasFerias) exclu += input.obterDiasFerias(o.dataInicial, o.dataFinal);
    if (totalDias - exclu === 31) exclu = 1;
    if (o.excluirFaltaJustificada && input.obterFaltasJustificadas) exclu += input.obterFaltasJustificadas(o.dataInicial, o.dataFinal);
    if (o.excluirFaltaNaoJustificada && input.obterFaltasNaoJustificadas) exclu += input.obterFaltasNaoJustificadas(o.dataInicial, o.dataFinal);
    const qtdDias = Math.max(0, totalDias - exclu);
    if (qtdDias === 0) return ZERO;
    return o.diferenca.times(totalDias).div(qtdDias);
  }

  /**
   * Java encontraOValorDoSalarioFamiliaParaO() + proporcionalizarValorSeNecessario().
   * Aplica teto da TabelaSalarioFamilia + proporcionaliza em meses parciais
   * (admissao/demissao).
   */
  private encontraValorDoSalarioFamilia(
    valorRemuneracao: Decimal,
    ocorrencia: OcorrenciaDeSalarioFamilia,
    input: CalculoSalarioFamiliaInput,
  ): Decimal {
    const competencia = fmtComp(ocorrencia.dataInicioOcorrencia);
    const tabela = input.faixasTabela.find(
      f => f.competenciaInicio <= competencia && competencia <= f.competenciaFim,
    );
    if (!tabela) return ZERO;
    if (valorRemuneracao.gt(tabela.tetoRemuneracaoMensal)) return ZERO;
    let valor = tabela.valorCota.times(ocorrencia.quantidadeFilhos);
    valor = arredondarValorMonetario(valor);

    // Proporcionalizar mes da admissao
    if (this.sameYearMonth(ocorrencia.dataInicioOcorrencia, input.dataAdmissao)) {
      const fim = new Date(Date.UTC(input.dataAdmissao.getUTCFullYear(), input.dataAdmissao.getUTCMonth() + 1, 0));
      valor = this.proporcionalizar(valor, input.dataAdmissao, fim);
    }
    // Proporcionalizar mes da demissao
    if (this.sameYearMonth(ocorrencia.dataFimOcorrencia, input.dataDemissao)) {
      const inicio = new Date(Date.UTC(input.dataDemissao.getUTCFullYear(), input.dataDemissao.getUTCMonth(), 1));
      valor = this.proporcionalizar(valor, inicio, input.dataDemissao);
    }
    return valor;
  }

  private sameYearMonth(a: Date, b: Date | null | undefined): boolean {
    if (!b) return false;
    return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
  }

  /** Java CalculoDoProporcionalizar — valor × (diasReais / diasMes). */
  private proporcionalizar(valor: Decimal, inicio: Date, fim: Date): Decimal {
    const diasReais = Math.ceil((fim.getTime() - inicio.getTime()) / 86400000) + 1;
    const diasMes = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 0)).getUTCDate();
    return arredondarValorMonetario(valor.times(diasReais).div(diasMes));
  }

  getSalarioFamilia(): SalarioFamilia { return this.sf; }
}

// Re-export interno para conveniencia/teste
export { ymToDateInicio, ymToDateFim };
