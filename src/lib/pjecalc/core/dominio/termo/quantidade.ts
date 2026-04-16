/**
 * Porte parcial de Quantidade.java (367 linhas).
 *
 * STATUS: stub funcional. Implementação completa requer:
 *   - LogicoFuzzy (lógica de "sábado é dia útil" depende de exceções)
 *   - Periodo.totalDeDiasNaoUteis / totalDeDiasUteis / totalDeFeriados / totalDeRepousosEFeriados
 *   - Calculo.obterPeriodosDeFaltasJustificadas / NaoJustificadas / FeriasGozadas
 *   - Calculo.obterFaltasJustificadas / NaoJustificadas / obterDiasFerias
 *   - Calculo.obterQuantidadeAdicionalAvisoPrevio
 *   - Calculo.getProjetaAvisoIndenizado / getLimitarAvosAoPeriodoDoCalculo
 *   - CartaoDePontoDaVerba + OcorrenciaDoCartaoDePonto (módulo cartão de ponto)
 *
 * Todos esses são métodos/classes que não existem ainda no port TS.
 * Esta classe expõe a interface correta mas implementa apenas o caso INFORMADA
 * (mais simples, sem dependências externas).
 *
 * Próximas sessões devem portar as dependências e completar os tipos:
 *   - IMPORTADA_DO_CALENDARIO (REPOUSOS, DIAS_UTEIS, FERIADOS, REPOUSOS_FERIADOS)
 *   - APURADA (avos de aviso prévio)
 *   - AVOS (13º, férias proporcionais — lógica complexa de 60 linhas)
 *   - IMPORTADA_DO_CARTAO
 *
 * Ref: pjecalc-fonte/.../dominio/termo/Quantidade.java:75-273
 */
import Decimal from 'decimal.js';
import type { Termo } from './termo';
import type { ParametroDoTermo } from './parametro-do-termo';
import {
  TipoDeQuantidadeEnum,
  TipoDeQuantidadeImportadaDoCalendarioEnum,
  TipoDeQuantidadeImportadaDoCartaoDePontoEnum,
} from '../../constantes/enums';
import { CalculoDoProporcionalizar } from '../../comum/rotinasdecalculo/calculo-do-proporcionalizar';

export class Quantidade implements Termo {
  private static readonly VENCIMENTO_DEZEMBRO = 20;

  private tipo: TipoDeQuantidadeEnum = TipoDeQuantidadeEnum.INFORMADA;
  private valorInformado: Decimal | null = null;
  private tipoImportadadoDoCartaoDePonto: TipoDeQuantidadeImportadaDoCartaoDePontoEnum | null = null;
  private tipoImportadaCalendarioEnum: TipoDeQuantidadeImportadaDoCalendarioEnum | null = null;
  private aplicarProporcionalidade: boolean = true;

  resolverValor(parametro: ParametroDoTermo): Decimal {
    // INFORMADA — implementado fielmente (Quantidade.java:77-99)
    if (this.tipo === TipoDeQuantidadeEnum.INFORMADA) {
      let valor = this.valorInformado;
      const verba = parametro.getVerbaDeCalculo() as unknown as {
        getExcluirFeriasGozadas?: () => boolean;
        getExcluirFaltaJustificada?: () => boolean;
        getExcluirFaltaNaoJustificada?: () => boolean;
      };
      const calculo = parametro.getCalculo() as unknown as {
        obterDiasFerias?: (p: unknown) => number;
        obterFaltasJustificadas?: (p: unknown) => number;
        obterFaltasNaoJustificadas?: (p: unknown) => number;
      };
      const periodo = parametro.getPeriodo();

      if (valor !== null && this.aplicarProporcionalidade && periodo) {
        let diasParaExcluir = 0;
        if (verba.getExcluirFeriasGozadas?.()) {
          diasParaExcluir += calculo.obterDiasFerias?.(periodo) ?? 0;
        }
        const totalDias = (periodo as { totalDeDias?: () => number }).totalDeDias?.() ?? 30;
        if (totalDias - diasParaExcluir === 31) diasParaExcluir = 1;
        if (verba.getExcluirFaltaJustificada?.()) {
          diasParaExcluir += calculo.obterFaltasJustificadas?.(periodo) ?? 0;
        }
        if (verba.getExcluirFaltaNaoJustificada?.()) {
          diasParaExcluir += calculo.obterFaltasNaoJustificadas?.(periodo) ?? 0;
        }
        parametro.setValorIntegral(valor);
        const calc = new CalculoDoProporcionalizar(periodo as unknown as never, valor, diasParaExcluir);
        calc.executar();
        valor = calc.getResultado();
      }
      return valor ?? new Decimal(0);
    }

    // STUBS para outros tipos — devolvem o valor informado como fallback.
    // TODO: implementar IMPORTADA_DO_CALENDARIO, APURADA, AVOS, IMPORTADA_DO_CARTAO
    // (ver header do arquivo para lista de dependências necessárias).
    return this.valorInformado ?? new Decimal(0);
  }

  getTipo(): TipoDeQuantidadeEnum { return this.tipo; }
  setTipo(t: TipoDeQuantidadeEnum): void { this.tipo = t; }

  getValorInformado(): Decimal | null { return this.valorInformado; }
  setValorInformado(v: Decimal | null): void { this.valorInformado = v; }

  getTipoImportadadoDoCartaoDePonto(): TipoDeQuantidadeImportadaDoCartaoDePontoEnum | null {
    return this.tipoImportadadoDoCartaoDePonto;
  }
  setTipoImportadadoDoCartaoDePonto(t: TipoDeQuantidadeImportadaDoCartaoDePontoEnum | null): void {
    this.tipoImportadadoDoCartaoDePonto = t;
  }

  getTipoImportadaCalendarioEnum(): TipoDeQuantidadeImportadaDoCalendarioEnum | null {
    return this.tipoImportadaCalendarioEnum;
  }
  setTipoImportadaCalendarioEnum(t: TipoDeQuantidadeImportadaDoCalendarioEnum | null): void {
    this.tipoImportadaCalendarioEnum = t;
  }

  getAplicarProporcionalidade(): boolean { return this.aplicarProporcionalidade; }
  setAplicarProporcionalidade(v: boolean): void { this.aplicarProporcionalidade = v; }

  toString(): string {
    if (this.tipo === TipoDeQuantidadeEnum.INFORMADA && this.valorInformado !== null) {
      return this.valorInformado.toString();
    }
    return String(this.tipo);
  }
}
