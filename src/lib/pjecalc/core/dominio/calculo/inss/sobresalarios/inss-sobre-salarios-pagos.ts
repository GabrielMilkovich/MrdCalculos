/**
 * PJe-Calc v2.15.1 — InssSobreSalariosPagos
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosPagos
 *
 * Ref Java: pjecalc-fonte/.../sobresalarios/InssSobreSalariosPagos.java (~243 linhas)
 *
 * Entidade concreta para INSS sobre salários **pagos** (contribuição já
 * recolhida antes do processo). Coleções de ocorrências e de atualização;
 * flags de correção delegam a `ParametrosDeAtualizacao` (variantes "Pago").
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../../../base/comum/helper-date';
import { TipoValorEnum } from '../../../../constantes/enums';
import { InssSobreSalarios } from './inss-sobre-salarios';
import type { Inss } from '../inss';
import type { OcorrenciaDeInssSobreSalariosPagos } from './ocorrencia-de-inss-sobre-salarios-pagos';
import type { OcorrenciaDeInssSobreSalariosPagosAtualizacao } from './ocorrencia-de-inss-sobre-salarios-pagos-atualizacao';

const ZERO = new Decimal(0);

export class InssSobreSalariosPagos extends InssSobreSalarios {
  private static readonly DISCRIMINADOR = 'PAGOS';

  private id: number | null = null;
  private ocorrencias: Set<OcorrenciaDeInssSobreSalariosPagos> = new Set();
  private ocorrenciasAtualizacao: Set<OcorrenciaDeInssSobreSalariosPagosAtualizacao> = new Set();
  /** transient (Java linha 83) */
  private ocorrenciasParaRelatorioSalariosPagos: Set<OcorrenciaDeInssSobreSalariosPagos> = new Set();

  constructor(inss?: Inss) {
    super();
    if (inss) this.setInss(inss);
  }

  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }

  getOcorrencias(): Set<OcorrenciaDeInssSobreSalariosPagos> { return this.ocorrencias; }
  setOcorrencias(v: Set<OcorrenciaDeInssSobreSalariosPagos>): void { this.ocorrencias = v; }

  getOcorrenciasAtualizacao(): Set<OcorrenciaDeInssSobreSalariosPagosAtualizacao> { return this.ocorrenciasAtualizacao; }
  setOcorrenciasAtualizacao(v: Set<OcorrenciaDeInssSobreSalariosPagosAtualizacao>): void { this.ocorrenciasAtualizacao = v; }

  getDiscriminador(): string { return InssSobreSalariosPagos.DISCRIMINADOR; }

  /** buscarOcorrenciaPelaCompetencia (Java linha 114) */
  buscarOcorrenciaPelaCompetencia(competencia: Date, isDecimoTerceiro: boolean): OcorrenciaDeInssSobreSalariosPagos | null {
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

  /**
   * getOcorrenciasParaRelatorioSalariosPagos (Java linha 135) — inclui
   * ocorrência se qualquer campo INFORMADO OU se valorBase > 0. Marca
   * isBaseVazia correspondentemente.
   */
  getOcorrenciasParaRelatorioSalariosPagos(): Set<OcorrenciaDeInssSobreSalariosPagos> {
    if (this.ocorrenciasParaRelatorioSalariosPagos.size === 0) {
      for (const o of this.ocorrencias) {
        if (
          o.getTipoValorDaBase() === TipoValorEnum.INFORMADO ||
          o.getTipoValorDoRecolhidoSegurado() === TipoValorEnum.INFORMADO ||
          o.getTipoValorDoRecolhidoEmpresa() === TipoValorEnum.INFORMADO ||
          o.getTipoValorDoRecolhidoSAT() === TipoValorEnum.INFORMADO ||
          o.getTipoValorDoRecolhidoTerceiros() === TipoValorEnum.INFORMADO
        ) {
          this.ocorrenciasParaRelatorioSalariosPagos.add(o);
          o.setBaseVazia(false);
          continue;
        }
        const valorBase = o.getValorBase();
        if (valorBase && !valorBase.equals(ZERO)) {
          this.ocorrenciasParaRelatorioSalariosPagos.add(o);
          o.setBaseVazia(false);
        } else {
          o.setBaseVazia(true);
        }
      }
    }
    return this.ocorrenciasParaRelatorioSalariosPagos;
  }

  /** sugerirDatas (Java linha 184) — data admissão → demissão ou término do cálculo */
  sugerirDatas(): void {
    const inss = this.getInss();
    const calc = inss?.getCalculo();
    if (!calc) return;
    const calcExt = calc as unknown as {
      getDataAdmissao?: () => Date | null;
      getDataDemissao?: () => Date | null;
      getDataTerminoCalculo?: () => Date | null;
    };
    const ini = calcExt.getDataAdmissao?.();
    if (ini) this.setDataInicioPeriodo(ini);
    const dem = calcExt.getDataDemissao?.() ?? null;
    const term = calcExt.getDataTerminoCalculo?.() ?? null;
    this.setDataTerminoPeriodo(dem ?? term);
  }

  existemOcorrencias(): boolean { return this.ocorrencias.size > 0; }

  private getParams(): unknown {
    return this.getInss()?.getCalculo?.()?.getParametrosDeAtualizacao?.();
  }

  getCorrecaoTrabalhista(): boolean {
    const p = this.getParams() as { getCorrecaoTrabalhistaDosSalariosPagosDoINSS?: () => boolean } | null;
    return p?.getCorrecaoTrabalhistaDosSalariosPagosDoINSS?.() ?? false;
  }
  getDataLimiteCorrecaoTrabalhista(): Date | null {
    const p = this.getParams() as { getAplicarAteDosSalariosPagosDoINSS?: () => Date | null } | null;
    return p?.getAplicarAteDosSalariosPagosDoINSS?.() ?? null;
  }
  getCorrecao11941(): boolean {
    const p = this.getParams() as { getLei11941Pago?: () => boolean } | null;
    return p?.getLei11941Pago?.() ?? false;
  }
  getDataLimiteCorrecao11941(): Date | null {
    const p = this.getParams() as { getApartirDeLei11941Pago?: () => Date | null } | null;
    return p?.getApartirDeLei11941Pago?.() ?? null;
  }
  getCorrecaoPrevidenciaria(): boolean {
    const p = this.getParams() as { getCorrecaoPrevidenciariaDosSalariosPagosDoINSS?: () => boolean } | null;
    return p?.getCorrecaoPrevidenciariaDosSalariosPagosDoINSS?.() ?? false;
  }
}
