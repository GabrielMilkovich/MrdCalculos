/**
 * PJe-Calc v2.15.1 — InssSobreSalariosDevidos
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosDevidos
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/InssSobreSalariosDevidos.java (~299 linhas)
 *
 * Entidade concreta para INSS sobre salários **devidos** (diferenças do
 * processo). Mantém flags `apurarInssSegurado`, `cobrarInssDoReclamante`,
 * `corrigirDescontoReclamante` e coleções de ocorrências (atuais + de
 * atualização).
 *
 * Getters `getCorrecaoXxx/getDataLimiteXxx` delegam para `ParametrosDeAtualizacao`.
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../../../base/comum/helper-date';
import { InssSobreSalarios } from './inss-sobre-salarios';
import type { Inss } from '../inss';
import type { OcorrenciaDeInssSobreSalariosDevidos } from './ocorrencia-de-inss-sobre-salarios-devidos';
import type { OcorrenciaDeInssSobreSalariosDevidosAtualizacao } from './ocorrencia-de-inss-sobre-salarios-devidos-atualizacao';

const ZERO = new Decimal(0);

export class InssSobreSalariosDevidos extends InssSobreSalarios {
  private static readonly DISCRIMINADOR = 'DEVIDOS';

  private id: number | null = null;
  private apurarInssSegurado: boolean = true;
  private cobrarInssDoReclamante: boolean = true;
  private corrigirDescontoReclamante: boolean = false;
  private ocorrencias: Set<OcorrenciaDeInssSobreSalariosDevidos> = new Set();
  private ocorrenciasAtualizacao: Set<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> = new Set();
  /** transient (Java linha 94) */
  private ocorrenciasComValorDaVerba: Set<OcorrenciaDeInssSobreSalariosDevidos> = new Set();

  constructor(inss?: Inss) {
    super();
    if (inss) this.setInss(inss);
  }

  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }

  getApurarInssSegurado(): boolean { return this.apurarInssSegurado; }
  setApurarInssSegurado(v: boolean): void { this.apurarInssSegurado = v; }

  getCobrarInssDoReclamante(): boolean { return this.cobrarInssDoReclamante; }
  setCobrarInssDoReclamante(v: boolean): void { this.cobrarInssDoReclamante = v; }

  getCorrigirDescontoReclamante(): boolean { return this.corrigirDescontoReclamante; }
  setCorrigirDescontoReclamante(v: boolean): void { this.corrigirDescontoReclamante = v; }

  getOcorrencias(): Set<OcorrenciaDeInssSobreSalariosDevidos> { return this.ocorrencias; }
  setOcorrencias(v: Set<OcorrenciaDeInssSobreSalariosDevidos>): void { this.ocorrencias = v; }

  getOcorrenciasAtualizacao(): Set<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> { return this.ocorrenciasAtualizacao; }
  setOcorrenciasAtualizacao(v: Set<OcorrenciaDeInssSobreSalariosDevidosAtualizacao>): void { this.ocorrenciasAtualizacao = v; }

  getDiscriminador(): string { return InssSobreSalariosDevidos.DISCRIMINADOR; }

  /**
   * getOcorrenciasComValorDaVerba (Java linha 169) — filtra ocorrências com
   * valorBaseVerbas > 0 (marca isBaseVazia correspondentemente).
   */
  getOcorrenciasComValorDaVerba(): Set<OcorrenciaDeInssSobreSalariosDevidos> {
    if (this.ocorrenciasComValorDaVerba.size === 0) {
      for (const o of this.ocorrencias) {
        const bv = o.getValorBaseVerbas();
        if (bv !== null && bv.gt(ZERO)) {
          this.ocorrenciasComValorDaVerba.add(o);
          o.setBaseVazia(false);
        } else {
          o.setBaseVazia(true);
        }
      }
    }
    return this.ocorrenciasComValorDaVerba;
  }

  /**
   * buscarOcorrenciaPelaCompetencia (Java linha 183) — busca linear por
   * mês/ano + decimoTerceiro flag.
   */
  buscarOcorrenciaPelaCompetencia(competencia: Date, isDecimoTerceiro: boolean): OcorrenciaDeInssSobreSalariosDevidos | null {
    for (const oc of this.ocorrencias) {
      const ocData = oc.getDataOcorrenciaInss();
      if (!ocData) continue;
      if (!HelperDate.getInstance(ocData).compareMonthAndYear(competencia)) continue;
      if (isDecimoTerceiro) {
        if (!oc.getOcorrenciaDecimoTerceiro()) continue;
        return oc;
      }
      return oc;
    }
    return null;
  }

  /** sugerirDatas (Java linha 214) — propõe datas baseadas no Calculo */
  sugerirDatas(): void {
    const inss = this.getInss();
    const calc = inss?.getCalculo();
    if (!calc) return;
    const calcExt = calc as unknown as {
      getDataAdmissao?: () => Date | null;
      getDataInicioCalculo?: () => Date | null;
      getPrescricaoQuinquenal?: () => boolean;
      getDataDePrescricao?: () => Date | null;
      getDataDemissao?: () => Date | null;
      getDataTerminoCalculo?: () => Date | null;
    };
    const dataAdmissao = calcExt.getDataAdmissao?.() ?? null;
    const dataInicioDoCalculo = calcExt.getDataInicioCalculo?.() ?? null;
    const prescrQuinq = calcExt.getPrescricaoQuinquenal?.() ?? false;
    const dataPrescr = prescrQuinq ? (calcExt.getDataDePrescricao?.() ?? null) : null;

    let maior = dataAdmissao;
    if (dataInicioDoCalculo && maior && dataInicioDoCalculo > maior) maior = dataInicioDoCalculo;
    if (dataPrescr && maior && dataPrescr > maior) maior = dataPrescr;
    if (maior) this.setDataInicioPeriodo(maior);

    const dataDemissao = calcExt.getDataDemissao?.() ?? null;
    const dataFimDoCalculo = calcExt.getDataTerminoCalculo?.() ?? null;
    let dataFinal = dataDemissao;
    if (dataFimDoCalculo && (!dataFinal || dataFimDoCalculo > dataFinal)) dataFinal = dataFimDoCalculo;
    if (dataFinal) this.setDataTerminoPeriodo(dataFinal);
  }

  existemOcorrencias(): boolean { return this.ocorrencias.size > 0; }

  // ── flags de correção via ParametrosDeAtualizacao (ducktype) ──
  private getParams(): unknown {
    return this.getInss()?.getCalculo?.()?.getParametrosDeAtualizacao?.();
  }

  getCorrecaoTrabalhista(): boolean {
    const p = this.getParams() as { getCorrecaoTrabalhistaDosSalariosDevidosDoINSS?: () => boolean } | null;
    return p?.getCorrecaoTrabalhistaDosSalariosDevidosDoINSS?.() ?? false;
  }
  getDataLimiteCorrecaoTrabalhista(): Date | null {
    const p = this.getParams() as { getAplicarAteDosSalariosDevidosDoINSS?: () => Date | null } | null;
    return p?.getAplicarAteDosSalariosDevidosDoINSS?.() ?? null;
  }
  getCorrecao11941(): boolean {
    const p = this.getParams() as { getLei11941?: () => boolean } | null;
    return p?.getLei11941?.() ?? false;
  }
  getDataLimiteCorrecao11941(): Date | null {
    const p = this.getParams() as { getApartirDeLei11941?: () => Date | null } | null;
    return p?.getApartirDeLei11941?.() ?? null;
  }
  getCorrecaoPrevidenciaria(): boolean {
    const p = this.getParams() as { getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS?: () => boolean } | null;
    return p?.getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS?.() ?? false;
  }

  /**
   * getValorTotalInssSeguradoReclamante (Java linha 257) — soma
   * valorDevidoReclamanteCorrigido apenas das ocorrências com base não vazia.
   */
  getValorTotalInssSeguradoReclamante(): Decimal {
    let total = ZERO;
    for (const oc of this.ocorrencias) {
      if (oc.isBaseVazia()) continue;
      if (oc.getValorDevidoSeguradoFinal() === null) continue;
      const valor = oc.getValorDevidoReclamanteCorrigido();
      if (valor !== null) total = total.plus(valor);
    }
    return total;
  }
}
