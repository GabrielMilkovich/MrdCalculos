/**
 * PJe-Calc v2.15.1 — HistoricoSalarial
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/historicosalarial/HistoricoSalarial.java (465 linhas)
 *
 * Base salarial por período — define o salário do empregado que serve de base
 * para o cálculo das verbas. Pode ter variação FIXA (mesmo valor todo mês) ou
 * VARIAVEL (valor diferente por competência).
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../base/comum/helper-date';

export type TipoVariacaoDaParcelaEnum = 'FIXO' | 'VARIAVEL';

export interface OcorrenciaDoHistoricoSalarial {
  competencia: Date;
  valor: Decimal;
}

export class HistoricoSalarial {
  private nome: string = '';
  private competenciaInicial: Date | null = null;
  private competenciaFinal: Date | null = null;
  private tipoVariacao: TipoVariacaoDaParcelaEnum = 'VARIAVEL';
  private valorFixo: Decimal | null = null;
  private incidenciaINSS: boolean = true;
  private incidenciaFGTS: boolean = true;
  private ocorrencias: OcorrenciaDoHistoricoSalarial[] = [];

  // ── Getters/Setters ──

  getNome(): string { return this.nome; }
  setNome(v: string): void { this.nome = v; }

  getCompetenciaInicial(): Date | null { return this.competenciaInicial; }
  setCompetenciaInicial(v: Date): void { this.competenciaInicial = v; }

  getCompetenciaFinal(): Date | null { return this.competenciaFinal; }
  setCompetenciaFinal(v: Date): void { this.competenciaFinal = v; }

  getTipoVariacao(): TipoVariacaoDaParcelaEnum { return this.tipoVariacao; }
  setTipoVariacao(v: TipoVariacaoDaParcelaEnum): void { this.tipoVariacao = v; }

  getValorFixo(): Decimal | null { return this.valorFixo; }
  setValorFixo(v: Decimal): void { this.valorFixo = v; }

  getIncidenciaINSS(): boolean { return this.incidenciaINSS; }
  setIncidenciaINSS(v: boolean): void { this.incidenciaINSS = v; }

  getIncidenciaFGTS(): boolean { return this.incidenciaFGTS; }
  setIncidenciaFGTS(v: boolean): void { this.incidenciaFGTS = v; }

  getOcorrencias(): OcorrenciaDoHistoricoSalarial[] { return this.ocorrencias; }
  setOcorrencias(v: OcorrenciaDoHistoricoSalarial[]): void { this.ocorrencias = v; }
  adicionarOcorrencia(o: OcorrenciaDoHistoricoSalarial): void { this.ocorrencias.push(o); }

  /**
   * getValorParaCompetencia — retorna o valor do salário para uma competência:
   * - FIXO: retorna valorFixo
   * - VARIAVEL: busca ocorrência pela competência
   */
  getValorParaCompetencia(competencia: Date): Decimal | null {
    if (this.tipoVariacao === 'FIXO' && this.valorFixo !== null) {
      return this.valorFixo;
    }
    const compStr = `${competencia.getFullYear()}-${String(competencia.getMonth() + 1).padStart(2, '0')}`;
    for (const oc of this.ocorrencias) {
      const ocStr = `${oc.competencia.getFullYear()}-${String(oc.competencia.getMonth() + 1).padStart(2, '0')}`;
      if (ocStr === compStr) return oc.valor;
    }
    return null;
  }
}
