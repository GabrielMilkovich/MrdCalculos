/**
 * PJe-Calc v2.15.1 — PeriodoDoINSSComOpcaoSimples
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.PeriodoDoINSSComOpcaoSimples
 *
 * Ref Java: pjecalc-fonte/.../calculo/inss/PeriodoDoINSSComOpcaoSimples.java
 *
 * Representa um intervalo em que o empregador optou pelo Simples Nacional.
 * Durante o período, a alíquota empresa + SAT é zerada (recolhimento unificado
 * no Simples). Configurado por Inss.adicionar(PeriodoDoINSSComOpcaoSimples).
 */
import { Periodo } from '../../../base/comum/periodo';
import { Competencia } from '../../../base/comum/competencia';
import { MensagemDeRecurso } from '../../../comum/mensagem-de-recurso';
import { Mensagens } from '../../../comum/mensagens';
import { NegocioException } from '../../../comum/exceptions/negocio-exception';
import type { Inss } from './inss';

export class PeriodoDoINSSComOpcaoSimples {
  private id: number | null = null;
  private versao: number = 0;
  private inss: Inss | null = null;
  private dataInicioSimples: Date | null = null;
  private dataTerminoSimples: Date | null = null;

  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getInss(): Inss | null { return this.inss; }
  setInss(inss: Inss | null): void { this.inss = inss; }

  getDataInicioSimples(): Date | null { return this.dataInicioSimples; }
  setDataInicioSimples(d: Date | null): void { this.dataInicioSimples = d; }

  getDataTerminoSimples(): Date | null { return this.dataTerminoSimples; }
  setDataTerminoSimples(d: Date | null): void { this.dataTerminoSimples = d; }

  /** getPeriodo (Java linha 128) */
  getPeriodo(): Periodo | null {
    if (this.dataInicioSimples && this.dataTerminoSimples) {
      return new Periodo(this.dataInicioSimples, this.dataTerminoSimples);
    }
    return null;
  }

  /** isPeriodoCoincidenteCom (Java linha 135) */
  isPeriodoCoincidenteCom(outro: PeriodoDoINSSComOpcaoSimples): boolean {
    const a = this.getPeriodo();
    const b = outro.getPeriodo();
    if (!a || !b) return false;
    return a.isDatasCoincidentesCom(b);
  }

  /**
   * `validar` — porte 1-a-1 de PeriodoDoINSSComOpcaoSimples.java:140-163.
   *
   * Regras:
   *   1. Datas inicial e final devem estar entre Admissão e
   *      (Demissão ?? DataTérminoCalculo) — senão: MSG0004 em
   *      "dataInicioSimples" e/ou "dataTerminoSimples".
   *   2. Não pode coincidir com outro período Simples do mesmo Inss
   *      (MSG0024 em "dataTerminoSimples") — lança direto, sem acumular.
   *
   * Depende de `Calculo` já ter `dataAdmissao`, `dataDemissao` e
   * `dataTerminoCalculo` populados.
   */
  validar(): PeriodoDoINSSComOpcaoSimples {
    const excecao = new NegocioException();

    if (this.inss == null) return this; // sem INSS linkado, ignora
    const calculo = this.inss.getCalculo();
    if (calculo == null) return this;

    if (this.dataInicioSimples != null && this.dataTerminoSimples != null) {
      const inicial = Competencia.getInstance(this.dataInicioSimples);
      const termino = Competencia.getInstance(this.dataTerminoSimples);
      const limite =
        calculo.getDataDemissao() ?? calculo.getDataTerminoCalculo();
      const admissao = calculo.getDataAdmissao();

      if (admissao != null) {
        if (inicial.isAnteriorA(admissao) || (limite != null && inicial.isApos(limite))) {
          excecao.adicionarMensagemDeRecurso(
            new MensagemDeRecurso('dataInicioSimples', Mensagens.MSG0004, 'Início'),
          );
        }
        if (termino.isAnteriorA(admissao) || (limite != null && termino.isApos(limite))) {
          excecao.adicionarMensagemDeRecurso(
            new MensagemDeRecurso('dataTerminoSimples', Mensagens.MSG0004, 'Fim'),
          );
        }
      }
    }

    if (excecao.existeMensagensDeRecurso()) {
      throw excecao;
    }

    for (const outro of this.inss.getPeriodosComOpcaoSimples()) {
      if (outro === this) continue;
      if (this.isPeriodoCoincidenteCom(outro)) {
        throw new NegocioException(
          new MensagemDeRecurso('dataTerminoSimples', Mensagens.MSG0024),
        );
      }
    }

    return this;
  }
}
