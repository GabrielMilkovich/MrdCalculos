/**
 * PJe-Calc v2.15.1 — InssSobreSalarios (abstract)
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalarios
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/InssSobreSalarios.java (296 linhas)
 *
 * Classe abstrata que agrega:
 *   - período [dataInicioPeriodo, dataTerminoPeriodo]
 *   - coleção de OcorrenciaDeInss (mensais)
 *   - Totalizador (lazy, via getTotalizador())
 *
 * Subclasses concretas:
 *   InssSobreSalariosDevidos
 *   InssSobreSalariosPagos
 *
 * Responsabilidades abstratas:
 *   - getOcorrencias(): coleção das ocorrências
 *   - getDiscriminador(): string para mensagens de erro
 *   - sugerirDatas(): popula datas default
 *   - existemOcorrencias(): boolean
 *   - getCorrecaoTrabalhista / getCorrecao11941 / getCorrecaoPrevidenciaria
 *   - getDataLimiteCorrecaoTrabalhista / getDataLimiteCorrecao11941
 */
import type Decimal from 'decimal.js';
import type { Inss } from '../inss';
import type { OcorrenciaDeInss } from './ocorrencia-de-inss';
import { TotalizadorInssSobreSalarios } from './totalizador-inss-sobre-salarios';

export abstract class InssSobreSalarios {
  protected inss: Inss | null = null;
  protected versao: number = 0;
  protected dataInicioPeriodo: Date | null = null;
  protected dataTerminoPeriodo: Date | null = null;
  // transient
  protected totalizador: TotalizadorInssSobreSalarios | null = null;

  abstract getOcorrencias(): Set<OcorrenciaDeInss> | OcorrenciaDeInss[];
  abstract getDiscriminador(): string;
  abstract sugerirDatas(): void;
  abstract existemOcorrencias(): boolean;
  abstract getCorrecaoTrabalhista(): boolean;
  abstract getDataLimiteCorrecaoTrabalhista(): Date | null;
  abstract getCorrecao11941(): boolean;
  abstract getDataLimiteCorrecao11941(): Date | null;
  abstract getCorrecaoPrevidenciaria(): boolean;

  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getInss(): Inss | null { return this.inss; }
  setInss(i: Inss | null): void { this.inss = i; }

  getDataInicioPeriodo(): Date | null { return this.dataInicioPeriodo; }
  setDataInicioPeriodo(d: Date | null): void { this.dataInicioPeriodo = d; }

  getDataTerminoPeriodo(): Date | null { return this.dataTerminoPeriodo; }
  setDataTerminoPeriodo(d: Date | null): void { this.dataTerminoPeriodo = d; }

  /** lazy init (Java linha 88) */
  getTotalizador(): TotalizadorInssSobreSalarios {
    if (this.totalizador === null) {
      this.totalizador = new TotalizadorInssSobreSalarios(this);
    }
    return this.totalizador;
  }

  // ── totalizadores proxies (Java linha 232+) ──

  getValorTotalInssSegurado(): Decimal { return this.getTotalizador().getSeguradoReclamadoCorrigido(); }
  getJurosTotalInssSegurado(): Decimal { return this.getTotalizador().getJurosSeguradoReclamadoCorrigido(); }
  getMultaTotalInssSegurado(): Decimal { return this.getTotalizador().getMultaSeguradoReclamadoCorrigido(); }
  getTotalGeralInssSegurado(): Decimal { return this.getTotalizador().getTotalSeguradoReclamadoCorrigido(); }

  getValorTotalInssEmpresa(): Decimal { return this.getTotalizador().getEmpresaFinalCorrigido(); }
  getJurosTotalInssEmpresa(): Decimal { return this.getTotalizador().getJurosEmpresaFinalCorrigido(); }
  getMultaTotalInssEmpresa(): Decimal { return this.getTotalizador().getMultaEmpresaFinalCorrigido(); }
  getTotalGeralInssEmpresa(): Decimal { return this.getTotalizador().getTotalEmpresaFinalCorrigido(); }

  getValorTotalInssSAT(): Decimal { return this.getTotalizador().getSatCorrigido(); }
  getJurosTotalInssSAT(): Decimal { return this.getTotalizador().getJurosSatCorrigido(); }
  getMultaTotalInssSAT(): Decimal { return this.getTotalizador().getMultaSatCorrigido(); }
  getTotalGeralInssSAT(): Decimal { return this.getTotalizador().getTotalSatCorrigido(); }

  getValorTotalInssTerceiros(): Decimal { return this.getTotalizador().getTerceirosCorrigido(); }
  getJurosTotalInssTerceiros(): Decimal { return this.getTotalizador().getJurosTerceirosCorrigido(); }
  getMultaTotalInssTerceiros(): Decimal { return this.getTotalizador().getMultaTerceirosCorrigido(); }
  getTotalGeralInssTerceiros(): Decimal { return this.getTotalizador().getTotalTerceirosCorrigido(); }
}
