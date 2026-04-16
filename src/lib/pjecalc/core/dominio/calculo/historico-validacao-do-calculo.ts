/**
 * PJe-Calc v2.15.1 — HistoricoValidacaoDoCalculo (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculo.HistoricoValidacaoDoCalculo
 *
 * Ref Java: pjecalc-fonte/.../calculo/HistoricoValidacaoDoCalculo.java (~165 linhas)
 *
 * Registra eventos de validação do cálculo (quem validou, quando, tipo —
 * cálculo ou atualização). Usado em auditoria.
 */
import { TipoRegistroCalculoWS } from '../../constantes/enums';
import type { Calculo } from './calculo';

export class HistoricoValidacaoDoCalculo {
  private id: number | null = null;
  private calculo: Calculo | null = null;
  private dataAlteracao: Date | null = null;
  private justificativa: string | null = null;
  private tipoValidacaoCalculo: TipoRegistroCalculoWS = TipoRegistroCalculoWS.CALCULO;
  private nome: string | null = null;
  private cpf: string | null = null;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getDataAlteracao(): Date | null { return this.dataAlteracao; }
  setDataAlteracao(d: Date | null): void { this.dataAlteracao = d; }

  getJustificativa(): string | null { return this.justificativa; }
  setJustificativa(v: string | null): void { this.justificativa = v; }

  getTipoValidacaoCalculo(): TipoRegistroCalculoWS { return this.tipoValidacaoCalculo; }
  setTipoValidacaoCalculo(v: TipoRegistroCalculoWS): void { this.tipoValidacaoCalculo = v; }

  getNome(): string | null { return this.nome; }
  setNome(v: string | null): void { this.nome = v; }

  getCpf(): string | null { return this.cpf; }
  setCpf(v: string | null): void { this.cpf = v; }
}
