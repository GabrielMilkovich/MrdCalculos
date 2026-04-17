/**
 * PJe-Calc v2.15.1 — LegendaDaFormulaDoIrpf
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.LegendaDaFormulaDoIrpf
 *
 * Ref Java: pjecalc-fonte/.../calculo/irpf/LegendaDaFormulaDoIrpf.java (~142 linhas)
 *
 * Monta 4 listas de nomes de verbas agrupadas por regime de tributação:
 *   - basesAnosAnteriores — verbas de competência anterior a 01/01 da liquidação
 *   - basesExclusiva      — 13º quando irpf.considerarTributacaoExclusiva
 *   - basesSeparado       — férias quando irpf.considerarTributacaoEmSeparado
 *   - basesNormal         — demais (AVISO_PREVIO, COMUM, 13º/férias sem flag)
 *
 * getLegenda(tipo) concatena os nomes com " + ".
 */
import { HelperDate } from '../../../base/comum/helper-date';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import type { Irpf } from './irpf';

export const INDICE_ANOS_ANTERIORES = 1;
export const INDICE_SEPARADO = 2;
export const INDICE_EXCLUSIVA = 3;
export const INDICE_NORMAL = 4;

interface VerbaLike {
  getAtivo?(): boolean;
  getIncidenciaIRPF?(): boolean;
  getNome?(): string;
  getCaracteristica?(): string;
  getOcorrenciasAtivas?(): Iterable<OcorrenciaLike>;
}
interface OcorrenciaLike {
  getDataInicial?(): Date | null;
  getDiferencaCorrigida?(): ReturnType<typeof arredondarValorMonetario>;
  getDiferencaCorrigidaParaCalculoDasIncidencias?(): ReturnType<typeof arredondarValorMonetario> | null;
}

export class LegendaDaFormulaDoIrpf {
  private irpf: Irpf;
  private basesAnosAnteriores: string[] = [];
  private basesExclusiva: string[] = [];
  private basesSeparado: string[] = [];
  private basesNormal: string[] = [];

  constructor(irpf: Irpf) {
    this.irpf = irpf;
    this.iniciar();
  }

  private iniciar(): void {
    const calc = this.irpf.getCalculo();
    if (!calc) return;
    const calcExt = calc as unknown as {
      getDataDeLiquidacao?(): Date;
      getVerbas?(): Iterable<VerbaLike>;
    };
    const dataLiq = calcExt.getDataDeLiquidacao?.();
    if (!dataLiq) return;
    const dataLimiteAnosAnteriores = new Date(dataLiq.getFullYear(), 0, 1);

    for (const verba of calcExt.getVerbas?.() ?? []) {
      if (!verba.getAtivo?.()) continue;
      if (!verba.getIncidenciaIRPF?.()) continue;
      for (const oc of verba.getOcorrenciasAtivas?.() ?? []) {
        if (this.identificarTipoBaseCorreta(dataLimiteAnosAnteriores, verba, oc)) break;
      }
    }
  }

  private identificarTipoBaseCorreta(
    dataLimiteAnosAnteriores: Date,
    verba: VerbaLike,
    oc: OcorrenciaLike,
  ): boolean {
    let identificou = false;
    const nome = verba.getNome?.() ?? '';
    const valorOcorrencia = arredondarValorMonetario(oc.getDiferencaCorrigida?.() ?? null);
    const dataInicial = oc.getDataInicial?.();
    if (!this.basesAnosAnteriores.includes(nome) && dataInicial && HelperDate.dateBefore(dataInicial, dataLimiteAnosAnteriores)) {
      const base = oc.getDiferencaCorrigidaParaCalculoDasIncidencias?.() ?? null;
      if (!valorOcorrencia.isZero() && base !== null) {
        this.basesAnosAnteriores.push(nome);
      }
    } else {
      switch (verba.getCaracteristica?.()) {
        case 'DECIMO_TERCEIRO_SALARIO':
          this.tratarCasoDecimoTerceiro(nome);
          break;
        case 'FERIAS':
          this.tratarCasoFerias(nome);
          break;
        case 'AVISO_PREVIO':
        case 'COMUM':
          this.basesNormal.push(nome);
          break;
      }
      identificou = true;
    }
    return identificou;
  }

  private tratarCasoDecimoTerceiro(nome: string): void {
    if (this.irpf.getConsiderarTributacaoExclusiva()) {
      this.basesExclusiva.push(nome);
    } else {
      this.basesNormal.push(nome);
    }
  }

  private tratarCasoFerias(nome: string): void {
    if (this.irpf.getConsiderarTributacaoEmSeparado()) {
      this.basesSeparado.push(nome);
    } else {
      this.basesNormal.push(nome);
    }
  }

  getBasesAnosAnteriores(): string[] { return this.basesAnosAnteriores; }
  getBasesSeparado(): string[] { return this.basesSeparado; }
  getBasesExclusiva(): string[] { return this.basesExclusiva; }
  getBasesNormal(): string[] { return this.basesNormal; }

  /** getLegenda (Java linha 110) — concatena por " + ". */
  getLegenda(tipo: number): string {
    let bases: string[];
    switch (tipo) {
      case INDICE_ANOS_ANTERIORES: bases = this.basesAnosAnteriores; break;
      case INDICE_SEPARADO: bases = this.basesSeparado; break;
      case INDICE_EXCLUSIVA: bases = this.basesExclusiva; break;
      default: bases = this.basesNormal;
    }
    return bases.join(' + ');
  }
}
