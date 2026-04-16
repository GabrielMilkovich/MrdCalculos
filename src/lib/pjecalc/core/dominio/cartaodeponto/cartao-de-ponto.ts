/**
 * PJe-Calc v2.15.1 — CartaoDePonto (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePonto
 *
 * Ref Java: pjecalc-fonte/.../cartaodeponto/CartaoDePonto.java (~235 linhas)
 *
 * Entidade que representa um cartão-ponto (folha de frequência) de um cálculo.
 * Agrega uma lista de `OcorrenciaDoCartaoDePonto` (1 por dia/competência).
 */
import type { Calculo } from '../calculo/calculo';
import type { OcorrenciaDoCartaoDePonto } from './ocorrencia-do-cartao-de-ponto';

export class CartaoDePonto {
  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;
  private nome: string = '';
  private ocorrencias: OcorrenciaDoCartaoDePonto[] = [];

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getNome(): string { return this.nome; }
  setNome(v: string): void { this.nome = v; }

  getOcorrencias(): OcorrenciaDoCartaoDePonto[] { return this.ocorrencias; }
  setOcorrencias(v: OcorrenciaDoCartaoDePonto[]): void { this.ocorrencias = v; }
  adicionarOcorrencia(o: OcorrenciaDoCartaoDePonto): void { this.ocorrencias.push(o); }
}
