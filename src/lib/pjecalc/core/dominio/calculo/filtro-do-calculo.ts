/**
 * PJe-Calc v2.15.1 — FiltroDoCalculo (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculo.FiltroDoCalculo
 *
 * Ref Java: pjecalc-fonte/.../calculo/FiltroDoCalculo.java (~313 linhas)
 *
 * Filtro para buscar cálculos no repositório por:
 *   - usuarioCriador, processo, setor, tipoCalculo, datas, validado, ativo
 * Neste port, stub de fachada.
 */
import type { Calculo } from './calculo';
import type { Setor } from './setor';
import { InstanciaSetorEnum, TipoCalculoEnum } from '../../constantes/enums';

export class FiltroDoCalculo {
  private usuarioCriador: string | null = null;
  private numeroProcesso: string | null = null;
  private setor: Setor | null = null;
  private instancia: InstanciaSetorEnum | null = null;
  private tipoCalculo: TipoCalculoEnum | null = null;
  private dataCriacaoInicial: Date | null = null;
  private dataCriacaoFinal: Date | null = null;
  private ativo: boolean | null = null;
  private validado: boolean | null = null;

  getUsuarioCriador(): string | null { return this.usuarioCriador; }
  setUsuarioCriador(v: string | null): void { this.usuarioCriador = v; }

  getNumeroProcesso(): string | null { return this.numeroProcesso; }
  setNumeroProcesso(v: string | null): void { this.numeroProcesso = v; }

  getSetor(): Setor | null { return this.setor; }
  setSetor(v: Setor | null): void { this.setor = v; }

  getInstancia(): InstanciaSetorEnum | null { return this.instancia; }
  setInstancia(v: InstanciaSetorEnum | null): void { this.instancia = v; }

  getTipoCalculo(): TipoCalculoEnum | null { return this.tipoCalculo; }
  setTipoCalculo(v: TipoCalculoEnum | null): void { this.tipoCalculo = v; }

  getDataCriacaoInicial(): Date | null { return this.dataCriacaoInicial; }
  setDataCriacaoInicial(d: Date | null): void { this.dataCriacaoInicial = d; }

  getDataCriacaoFinal(): Date | null { return this.dataCriacaoFinal; }
  setDataCriacaoFinal(d: Date | null): void { this.dataCriacaoFinal = d; }

  getAtivo(): boolean | null { return this.ativo; }
  setAtivo(v: boolean | null): void { this.ativo = v; }

  getValidado(): boolean | null { return this.validado; }
  setValidado(v: boolean | null): void { this.validado = v; }

  filtrar(): Calculo[] {
    return []; // TODO(fase-10/infra): implementar quando RepositorioDeCalculo existir.
  }
}
