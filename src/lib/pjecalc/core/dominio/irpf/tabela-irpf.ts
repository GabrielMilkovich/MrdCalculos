/**
 * PJe-Calc v2.15.1 — TabelaIrpf
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.irpf.TabelaIrpf
 *
 * Ref Java: pjecalc-fonte/.../irpf/TabelaIrpf.java (~291 LOC)
 *
 * Tabela de Imposto de Renda Pessoa Física com 3-5 faixas progressivas.
 * No Java é carregada via JPA (`RepositorioDeTabelaIrpf.obterParaA(data)`);
 * em TS, carregamos de tabela hardcoded (mesmos dados que o engine-v3 usa)
 * e expomos via `obterTabelaDa(data)`.
 *
 * Fonte: Instrução Normativa RFB 1500/2014 + atualizações.
 */
import Decimal from 'decimal.js';
import { naoNulo } from '../../base/comum/utils';
import {
  FaixaFiscal,
  PrimeiraFaixaFiscal,
  SegundaFaixaFiscal,
  TerceiraFaixaFiscal,
  QuartaFaixaFiscal,
  QuintaFaixaFiscal,
} from './faixas/faixa-fiscal';

export class TabelaIrpf {
  private id: number | null = null;
  private competencia: Date;
  private valorDeducaoPorDependente: Decimal = new Decimal(0);
  private valorDeducaoParaAposentadoMaiorQue65Anos: Decimal = new Decimal(0);
  private primeiraFaixaFiscal: PrimeiraFaixaFiscal = new PrimeiraFaixaFiscal();
  private segundaFaixaFiscal: SegundaFaixaFiscal = new SegundaFaixaFiscal();
  private terceiraFaixaFiscal: TerceiraFaixaFiscal = new TerceiraFaixaFiscal();
  private quartaFaixaFiscal: QuartaFaixaFiscal | null = null;
  private quintaFaixaFiscal: QuintaFaixaFiscal | null = null;

  constructor(competencia: Date = new Date()) {
    this.competencia = competencia;
  }

  getId(): number | null { return this.id; }

  getCompetencia(): Date { return this.competencia; }
  setCompetencia(c: Date): void { this.competencia = c; }

  getValorDeducaoPorDependente(): Decimal { return this.valorDeducaoPorDependente; }
  setValorDeducaoPorDependente(v: Decimal): void { this.valorDeducaoPorDependente = v; }

  getValorDeducaoParaAposentadoMaiorQue65Anos(): Decimal { return this.valorDeducaoParaAposentadoMaiorQue65Anos; }
  setValorDeducaoParaAposentadoMaiorQue65Anos(v: Decimal): void { this.valorDeducaoParaAposentadoMaiorQue65Anos = v; }

  getPrimeiraFaixaFiscal(): PrimeiraFaixaFiscal { return this.primeiraFaixaFiscal; }
  setPrimeiraFaixaFiscal(f: PrimeiraFaixaFiscal): void { this.primeiraFaixaFiscal = f; }

  getSegundaFaixaFiscal(): SegundaFaixaFiscal { return this.segundaFaixaFiscal; }
  setSegundaFaixaFiscal(f: SegundaFaixaFiscal): void { this.segundaFaixaFiscal = f; }

  getTerceiraFaixaFiscal(): TerceiraFaixaFiscal { return this.terceiraFaixaFiscal; }
  setTerceiraFaixaFiscal(f: TerceiraFaixaFiscal): void { this.terceiraFaixaFiscal = f; }

  getQuartaFaixaFiscal(): QuartaFaixaFiscal | null { return this.quartaFaixaFiscal; }
  setQuartaFaixaFiscal(f: QuartaFaixaFiscal | null): void { this.quartaFaixaFiscal = f; }

  getQuintaFaixaFiscal(): QuintaFaixaFiscal | null { return this.quintaFaixaFiscal; }
  setQuintaFaixaFiscal(f: QuintaFaixaFiscal | null): void { this.quintaFaixaFiscal = f; }

  /** obterFaixaParaValor (Java linha 135) — lookup progressivo. */
  obterFaixaParaValor(valor: Decimal): FaixaFiscal {
    if (!this.primeiraFaixaFiscal.getValorFinal() || valor.lessThanOrEqualTo(this.primeiraFaixaFiscal.getValorFinal())) {
      return this.primeiraFaixaFiscal;
    }
    if (!this.segundaFaixaFiscal.getValorFinal() || valor.lessThanOrEqualTo(this.segundaFaixaFiscal.getValorFinal())) {
      return this.segundaFaixaFiscal;
    }
    if (!this.terceiraFaixaFiscal.getValorFinal() || valor.lessThanOrEqualTo(this.terceiraFaixaFiscal.getValorFinal())) {
      return this.terceiraFaixaFiscal;
    }
    if (this.quartaFaixaFiscal && (!this.quartaFaixaFiscal.getValorFinal() || valor.lessThanOrEqualTo(this.quartaFaixaFiscal.getValorFinal()))) {
      return this.quartaFaixaFiscal;
    }
    return this.quintaFaixaFiscal ?? this.terceiraFaixaFiscal;
  }

  /** obterFaixaParaValor com multiplicador de competencias (Java linha 151). */
  obterFaixaParaValorComCompetencias(valor: Decimal, numCompetencias: Decimal): FaixaFiscal {
    const p = this.primeiraFaixaFiscal;
    if (!p.getValorFinal() || valor.lessThanOrEqualTo(p.getValorFinal().times(numCompetencias))) return p;
    const s = this.segundaFaixaFiscal;
    if (!s.getValorFinal() || valor.lessThanOrEqualTo(s.getValorFinal().times(numCompetencias))) return s;
    const t = this.terceiraFaixaFiscal;
    if (!t.getValorFinal() || valor.lessThanOrEqualTo(t.getValorFinal().times(numCompetencias))) return t;
    const q = this.quartaFaixaFiscal;
    if (q && (!q.getValorFinal() || valor.lessThanOrEqualTo(q.getValorFinal().times(numCompetencias)))) return q;
    return this.quintaFaixaFiscal ?? t;
  }

  getFaixas(): FaixaFiscal[] {
    const faixas: FaixaFiscal[] = [this.primeiraFaixaFiscal, this.segundaFaixaFiscal, this.terceiraFaixaFiscal];
    if (naoNulo(this.quartaFaixaFiscal)) faixas.push(this.quartaFaixaFiscal!);
    if (naoNulo(this.quintaFaixaFiscal)) faixas.push(this.quintaFaixaFiscal!);
    return faixas;
  }

  // ────────── obterTabelaDa — factory estática ──────────

  /**
   * obterTabelaDa(data) — Java linha 171.
   * No Java faz JPA query; aqui usa tabela hardcoded (mesmos dados que engine-v3).
   * Percorre vigências decrescentes até encontrar uma que cubra a data.
   */
  static obterTabelaDa(data: Date): TabelaIrpf {
    const isoDate = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-01`;
    const vigencia = TABELAS_IRPF_VIGENTES.find(t => t.de <= isoDate)
      ?? TABELAS_IRPF_VIGENTES[TABELAS_IRPF_VIGENTES.length - 1];
    return vigencia.tabela;
  }
}

// ────────── Dados hardcoded (fonte: RFB / engine-v3) ──────────

interface FaixaRaw { ate: number | null; aliq: number; ded: number }

function buildTabela(competencia: Date, faixas: FaixaRaw[], deducaoDependente: number, deducao65: number): TabelaIrpf {
  const tabela = new TabelaIrpf(competencia);
  tabela.setValorDeducaoPorDependente(new Decimal(deducaoDependente));
  tabela.setValorDeducaoParaAposentadoMaiorQue65Anos(new Decimal(deducao65));

  const mk = (Clz: new (...a: unknown[]) => FaixaFiscal, raw: FaixaRaw, prev: FaixaRaw | null): FaixaFiscal => {
    const f = new (Clz as new () => FaixaFiscal)();
    f.setValorInicial(prev ? new Decimal(prev.ate!).plus('0.01') : new Decimal(0));
    f.setValorFinal(raw.ate !== null ? new Decimal(raw.ate) : null);
    f.setAliquota(new Decimal(raw.aliq));
    f.setDeducao(new Decimal(raw.ded));
    return f;
  };

  tabela.setPrimeiraFaixaFiscal(mk(PrimeiraFaixaFiscal, faixas[0], null) as PrimeiraFaixaFiscal);
  tabela.setSegundaFaixaFiscal(mk(SegundaFaixaFiscal, faixas[1], faixas[0]) as SegundaFaixaFiscal);
  tabela.setTerceiraFaixaFiscal(mk(TerceiraFaixaFiscal, faixas[2], faixas[1]) as TerceiraFaixaFiscal);
  if (faixas.length > 3) tabela.setQuartaFaixaFiscal(mk(QuartaFaixaFiscal, faixas[3], faixas[2]) as QuartaFaixaFiscal);
  if (faixas.length > 4) tabela.setQuintaFaixaFiscal(mk(QuintaFaixaFiscal, faixas[4], faixas[3]) as QuintaFaixaFiscal);
  return tabela;
}

/** Vigências em ordem decrescente (de mais recente para mais antiga). */
const TABELAS_IRPF_VIGENTES: { de: string; tabela: TabelaIrpf }[] = [
  // 2024-02 em diante (atual 2025/2026) — Lei 14.848/2024
  {
    de: '2024-02-01',
    tabela: buildTabela(new Date(2024, 1, 1), [
      { ate: 2259.20, aliq: 0, ded: 0 },
      { ate: 2826.65, aliq: 7.5, ded: 169.44 },
      { ate: 3751.05, aliq: 15, ded: 381.44 },
      { ate: 4664.68, aliq: 22.5, ded: 662.77 },
      { ate: null, aliq: 27.5, ded: 896.00 },
    ], 189.59, 1903.98),
  },
  // 2023-05 a 2024-01 — Lei 14.663/2023
  {
    de: '2023-05-01',
    tabela: buildTabela(new Date(2023, 4, 1), [
      { ate: 2112.00, aliq: 0, ded: 0 },
      { ate: 2826.65, aliq: 7.5, ded: 158.40 },
      { ate: 3751.05, aliq: 15, ded: 370.40 },
      { ate: 4664.68, aliq: 22.5, ded: 651.73 },
      { ate: null, aliq: 27.5, ded: 884.96 },
    ], 189.59, 1903.98),
  },
  // 2015-04 a 2023-04 — MP 670/2015
  {
    de: '2015-04-01',
    tabela: buildTabela(new Date(2015, 3, 1), [
      { ate: 1903.98, aliq: 0, ded: 0 },
      { ate: 2826.65, aliq: 7.5, ded: 142.80 },
      { ate: 3751.05, aliq: 15, ded: 354.80 },
      { ate: 4664.68, aliq: 22.5, ded: 636.13 },
      { ate: null, aliq: 27.5, ded: 869.36 },
    ], 189.59, 1903.98),
  },
  // 2014 e anteriores (fallback)
  {
    de: '2000-01-01',
    tabela: buildTabela(new Date(2000, 0, 1), [
      { ate: 1787.77, aliq: 0, ded: 0 },
      { ate: 2679.29, aliq: 7.5, ded: 134.08 },
      { ate: 3572.43, aliq: 15, ded: 335.03 },
      { ate: 4463.81, aliq: 22.5, ded: 602.96 },
      { ate: null, aliq: 27.5, ded: 826.15 },
    ], 179.71, 1787.77),
  },
];
