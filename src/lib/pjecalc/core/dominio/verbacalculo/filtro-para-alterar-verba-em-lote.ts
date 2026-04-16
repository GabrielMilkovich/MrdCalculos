/**
 * PJe-Calc v2.15.1 — FiltroParaAlterarVerbaEmLote (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.FiltroParaAlterarVerbaEmLote
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/FiltroParaAlterarVerbaEmLote.java (~134 linhas)
 *
 * Filtro usado na UI para aplicar uma mudança em lote sobre múltiplas verbas
 * (ex: alterar incidência, ativar/desativar, alterar fórmula).
 */
import type { Calculo } from '../calculo/calculo';
import { CaracteristicaDaVerbaEnum, LogicoEnum } from '../../constantes/enums';

export class FiltroParaAlterarVerbaEmLote {
  private calculo: Calculo | null = null;
  private caracteristica: CaracteristicaDaVerbaEnum | null = null;
  private nomes: string[] = [];
  private ativo: boolean | null = null;
  private comporPrincipal: LogicoEnum | null = null;

  private incidenciaINSS: boolean | null = null;
  private incidenciaIRPF: boolean | null = null;
  private incidenciaFGTS: boolean | null = null;

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getCaracteristica(): CaracteristicaDaVerbaEnum | null { return this.caracteristica; }
  setCaracteristica(v: CaracteristicaDaVerbaEnum | null): void { this.caracteristica = v; }

  getNomes(): string[] { return this.nomes; }
  setNomes(v: string[]): void { this.nomes = v; }

  getAtivo(): boolean | null { return this.ativo; }
  setAtivo(v: boolean | null): void { this.ativo = v; }

  getComporPrincipal(): LogicoEnum | null { return this.comporPrincipal; }
  setComporPrincipal(v: LogicoEnum | null): void { this.comporPrincipal = v; }

  getIncidenciaINSS(): boolean | null { return this.incidenciaINSS; }
  setIncidenciaINSS(v: boolean | null): void { this.incidenciaINSS = v; }

  getIncidenciaIRPF(): boolean | null { return this.incidenciaIRPF; }
  setIncidenciaIRPF(v: boolean | null): void { this.incidenciaIRPF = v; }

  getIncidenciaFGTS(): boolean | null { return this.incidenciaFGTS; }
  setIncidenciaFGTS(v: boolean | null): void { this.incidenciaFGTS = v; }
}
