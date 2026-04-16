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
  OcorrenciaDePagamentoEnum,
} from '../../constantes/enums';
import { CalculoDoProporcionalizar } from '../../comum/rotinasdecalculo/calculo-do-proporcionalizar';
import { HelperDate } from '../../base/comum/helper-date';
import { Periodo } from '../../base/comum/periodo';
import { LogicoFuzzy } from '../../base/comum/logico-fuzzy';

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

    // IMPORTADA_DO_CALENDARIO — Quantidade.java:100-191
    if (this.tipo === TipoDeQuantidadeEnum.IMPORTADA_DO_CALENDARIO) {
      const periodo = parametro.getPeriodo();
      if (!periodo) return new Decimal(0);
      const calculo = parametro.getCalculo() as unknown as {
        getSabadoDiaUtilComExcecao?: () => { isValido(d: Date): boolean } | null;
        obterPeriodosDeFaltasJustificadas?: (p: unknown) => Periodo[];
        obterPeriodosDeFaltasNaoJustificadas?: (p: unknown) => Periodo[];
        obterPeriodosDeFeriasGozadas?: (p: unknown) => Periodo[];
      };
      const verba = parametro.getVerbaDeCalculo() as unknown as {
        getExcluirFaltaJustificada?: () => boolean;
        getExcluirFaltaNaoJustificada?: () => boolean;
        getExcluirFeriasGozadas?: () => boolean;
      };
      const sabadoDiaUtil = calculo.getSabadoDiaUtilComExcecao?.() ?? LogicoFuzzy.FALSO;
      const per = periodo as unknown as Periodo;

      // Seleciona método de totalização conforme o tipo importado
      const totalizar = (p: Periodo): number => {
        switch (this.tipoImportadaCalendarioEnum) {
          case TipoDeQuantidadeImportadaDoCalendarioEnum.REPOUSOS:
            return p.totalDeDiasNaoUteis(sabadoDiaUtil);
          case TipoDeQuantidadeImportadaDoCalendarioEnum.DIAS_UTEIS:
            return p.totalDeDiasUteis(sabadoDiaUtil);
          case TipoDeQuantidadeImportadaDoCalendarioEnum.FERIADOS:
            return p.totalDeFeriados();
          case TipoDeQuantidadeImportadaDoCalendarioEnum.REPOUSOS_FERIADOS:
            return p.totalDeRepousosEFeriados(sabadoDiaUtil);
          default:
            return 0;
        }
      };

      let qtdDias = totalizar(per);
      if (verba.getExcluirFaltaJustificada?.()) {
        for (const pf of calculo.obterPeriodosDeFaltasJustificadas?.(per) ?? []) {
          qtdDias -= totalizar(pf);
        }
      }
      if (verba.getExcluirFaltaNaoJustificada?.()) {
        for (const pf of calculo.obterPeriodosDeFaltasNaoJustificadas?.(per) ?? []) {
          qtdDias -= totalizar(pf);
        }
      }
      if (verba.getExcluirFeriasGozadas?.()) {
        for (const pf of calculo.obterPeriodosDeFeriasGozadas?.(per) ?? []) {
          qtdDias -= totalizar(pf);
        }
      }
      return new Decimal(Math.max(0, qtdDias));
    }

    // APURADA — Quantidade.java:193-195 (avos adicional de aviso prévio)
    if (this.tipo === TipoDeQuantidadeEnum.APURADA) {
      const calculo = parametro.getCalculo() as unknown as {
        obterQuantidadeAdicionalAvisoPrevio?: () => number;
      };
      return new Decimal(calculo.obterQuantidadeAdicionalAvisoPrevio?.() ?? 0);
    }

    // AVOS — Quantidade.java:196-261 (cálculo de avos 13º anual ou férias proporcional)
    if (this.tipo === TipoDeQuantidadeEnum.AVOS) {
      let avos = 0;
      const verba = parametro.getVerbaDeCalculo() as unknown as {
        getOcorrenciaDePagamento?: () => OcorrenciaDePagamentoEnum;
        getPeriodoInicial?: () => Date | null;
      };
      const calculo = parametro.getCalculo() as unknown as {
        getLimitarAvosAoPeriodoDoCalculo?: () => boolean;
        getDataAdmissao?: () => Date | null;
        getDataDemissao?: () => Date | null;
        getProjetaAvisoIndenizado?: () => boolean;
        obterQuantidadeAdicionalAvisoPrevio?: () => number;
        obterFaltasNaoJustificadas?: (p: unknown) => number;
      };
      const periodo = parametro.getPeriodo();
      const periodoAquisitivo = parametro.getPeriodoAquisitivo();
      const ocorrenciaPag = verba.getOcorrenciaDePagamento?.();

      if (ocorrenciaPag === OcorrenciaDePagamentoEnum.DEZEMBRO && periodo) {
        // Quantidade.java:198-232 — 13º salário
        const ano = HelperDate.getInstance(periodo.getInicial())!.getYear();
        let dataInicial = HelperDate.getInstance(new Date(ano, 0, 1))!;
        const limitarAvos = calculo.getLimitarAvosAoPeriodoDoCalculo?.() ?? false;
        const admissao = calculo.getDataAdmissao?.();

        if (limitarAvos) {
          const verbaPeriodoIni = verba.getPeriodoInicial?.();
          if (verbaPeriodoIni && HelperDate.dateAfter(verbaPeriodoIni, dataInicial.getDate())) {
            const primeiroDiaMes = HelperDate.getInstance(verbaPeriodoIni)!.setDay(1).getDate();
            if (admissao && HelperDate.dateAfter(admissao, primeiroDiaMes)) {
              dataInicial = HelperDate.getInstance(admissao)!;
            } else {
              dataInicial = HelperDate.getInstance(primeiroDiaMes)!;
            }
          }
        } else if (admissao && HelperDate.dateAfter(admissao, dataInicial.getDate())) {
          dataInicial = HelperDate.getInstance(admissao)!;
        }

        let dataFinal = HelperDate.getInstance(new Date(ano, 11, 31))!;
        const dataDemissaoRaw = calculo.getDataDemissao?.();
        if (dataDemissaoRaw) {
          let dataDemissao = HelperDate.getInstance(dataDemissaoRaw)!;
          if (calculo.getProjetaAvisoIndenizado?.()) {
            dataDemissao = dataDemissao.addDay(calculo.obterQuantidadeAdicionalAvisoPrevio?.() ?? 0);
          }
          if (HelperDate.dateAfter(dataFinal.getDate(), dataDemissao.getDate())) {
            dataFinal = dataDemissao;
          } else if (HelperDate.dateEquals(periodo.getFinal(), dataDemissaoRaw)) {
            dataFinal = dataDemissao;
            // Regra da Dezembro > 20: volta ao início do ano
            if (HelperDate.getInstance(dataDemissaoRaw)!.getMonth() === 11
                && HelperDate.getInstance(dataDemissaoRaw)!.getDay() > Quantidade.VENCIMENTO_DEZEMBRO) {
              dataInicial = dataFinal.clone();
              dataInicial.setDay(1);
              dataInicial.setMonth(0);
            }
          }
        }

        const periodos = HelperDate.breakInMonths(dataInicial.getDate(), dataFinal.getDate());
        for (const p of periodos) {
          const ini = HelperDate.getInstance(p.getInicial())!.getDay();
          const fim = HelperDate.getInstance(p.getFinal())!.getDay();
          let quantidadeDias = fim - ini + 1;
          quantidadeDias -= calculo.obterFaltasNaoJustificadas?.(p) ?? 0;
          if (quantidadeDias < 15) continue;
          avos++;
        }
      }

      if (ocorrenciaPag === OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO && periodoAquisitivo) {
        // Quantidade.java:233-259 — férias (avos do período aquisitivo)
        let auxiliarDeAvo = 1;
        let dataAuxiliarDeFimDoAvo = HelperDate.getInstance(periodoAquisitivo.getInicial())!
          .addMonth(auxiliarDeAvo).addDay(-1);
        const verbaPeriodoIni = verba.getPeriodoInicial?.();
        const dataDeCorte = verbaPeriodoIni ? HelperDate.getInstance(verbaPeriodoIni)!.addYear(-1).getDate() : null;
        const limitarAvos = calculo.getLimitarAvosAoPeriodoDoCalculo?.() ?? false;

        while (HelperDate.dateAfter(periodoAquisitivo.getFinal(), dataAuxiliarDeFimDoAvo.getDate())) {
          if (limitarAvos) {
            if (dataDeCorte && HelperDate.dateBeforeOrEquals(dataDeCorte, dataAuxiliarDeFimDoAvo.getDate())) {
              avos++;
            }
          } else {
            avos++;
          }
          auxiliarDeAvo++;
          dataAuxiliarDeFimDoAvo = HelperDate.getInstance(periodoAquisitivo.getInicial())!
            .addMonth(auxiliarDeAvo).addDay(-1);
        }

        const dataAuxiliarDeInicioDoAvo = HelperDate.getInstance(periodoAquisitivo.getInicial())!
          .addMonth(auxiliarDeAvo - 1);
        if (limitarAvos) {
          if (dataDeCorte && HelperDate.dateBeforeOrEquals(dataDeCorte, periodoAquisitivo.getFinal())) {
            const quantidadeDias = HelperDate.getInstance(periodoAquisitivo.getFinal())!
              .subtractDays(dataAuxiliarDeInicioDoAvo.getDate()) + 1;
            if (quantidadeDias >= 15) avos++;
          }
        } else {
          const quantidadeDias = HelperDate.getInstance(periodoAquisitivo.getFinal())!
            .subtractDays(dataAuxiliarDeInicioDoAvo.getDate()) + 1;
          if (quantidadeDias >= 15) avos++;
        }
      }

      return new Decimal(avos);
    }

    // IMPORTADA_DO_CARTAO — Quantidade.java:262-271
    // TODO: requer CartaoDePontoDaVerba + OcorrenciaDoCartaoDePonto. Stub = 0.
    if (this.tipo === TipoDeQuantidadeEnum.IMPORTADA_DO_CARTAO) {
      return new Decimal(0);
    }

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
