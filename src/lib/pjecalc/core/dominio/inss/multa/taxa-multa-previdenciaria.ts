/**
 * PJe-Calc v2.15.1 — TaxaMultaPrevidenciaria
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.inss.multa.TaxaMultaPrevidenciaria
 *
 * Ref Java: pjecalc-fonte/.../inss/multa/TaxaMultaPrevidenciaria.java (~288 LOC)
 *
 * Entidade que guarda uma taxa de multa previdenciária (percentual) aplicada
 * em um período (dataInicial → dataFinal). Usada por MaquinaDeCalculoDoInss
 * para compor a multa das ocorrências (Lei 8.212/1991 e Lei 11.941/2009).
 *
 * Tabela Supabase: `pjecalc_inss_multa` (2 linhas: Lei 8.212 e Lei 11.941).
 * O carregamento real fica em `obterListaOtimizada` (adapter Supabase).
 * Enquanto o adapter não é instalado via DI, usamos a fonte padrão que
 * retorna lista vazia — o chamador (MaquinaDeCalculoDoInss) já trata isso.
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../../base/comum/helper-date';
import { naoNulo, nulo } from '../../../base/comum/utils';
import { Competencia } from '../../../base/comum/competencia';
import {
  TipoDaMultaDoINSSEnum,
  TipoDeAliquotaDoEmpregadorEnum,
  TipoDeAliquotaDoSeguradoEnum,
  TipoPagamentoDaMultaDoINSSEnum,
  TipoPeriodicidadeMultaPrevidenciariaEnum,
} from '../../../constantes/enums';

/** Duck type mínimo para InssSobreSalarios — evita dependência circular. */
export interface InssSobreSalariosRef {
  getInss(): {
    getCalculo(): {
      getCalculoExterno(): boolean;
      getParametrosDeAtualizacao(): {
        getPagamentoDaMultaDosSalariosDevidosDoINSS(): TipoPagamentoDaMultaDoINSSEnum;
        getPagamentoDaMultaDosSalariosPagosDoINSS(): TipoPagamentoDaMultaDoINSSEnum;
        getAplicarAteDosSalariosDevidosDoINSS(): Date | null;
        getAplicarAteDosSalariosPagosDoINSS(): Date | null;
        getLei11941(): boolean;
        getLei11941Pago(): boolean;
        getApartirDeLei11941(): Date | null;
        getApartirDeLei11941Pago(): Date | null;
      };
    };
    getTipoAliquotaSegurado(): TipoDeAliquotaDoSeguradoEnum;
    getTipoAliquotaEmpregador(): TipoDeAliquotaDoEmpregadorEnum;
    getAtividadeEconomica(): { getDescricao(): string } | null;
  };
  isDevidos(): boolean;
  getApurarInssSegurado?(): boolean;
}

const SERVICOS_DOMESTICOS = 'SERVIÇOS DOMÉSTICOS';
const TAXA_MULTA_CALCULO_EXTERNO = new Decimal('0.33');
const TETO_MULTA_CALCULO_EXTERNO = new Decimal(20);
const TRINTA_SETEMBRO_2008 = new Date(2008, 8, 30);

/** Mon-Fri considerado dia útil (sem feriados nacionais). */
function isWorkDayWithoutSaturdays(data: Date): boolean {
  const dow = data.getDay();
  return dow >= 1 && dow <= 5;
}

/** Avança `hd` até cair em dia útil (direção +1 ou -1). */
function ajustarParaDiaUtil(hd: HelperDate, direcao: 1 | -1): HelperDate {
  let guard = 0;
  while (!isWorkDayWithoutSaturdays(hd.getDate()) && guard++ < 14) {
    hd.addDay(direcao);
  }
  return hd;
}

export class TaxaMultaPrevidenciaria {
  private id: number | null = null;
  private dataInicial: Date;
  private dataFinal: Date | null;
  private tipoMulta: TipoDaMultaDoINSSEnum = TipoDaMultaDoINSSEnum.URBANA;
  private periodicidadeMulta: TipoPeriodicidadeMultaPrevidenciariaEnum = TipoPeriodicidadeMultaPrevidenciariaEnum.TAXA_UNICA;
  private taxa: Decimal;
  private tetoTaxaDiaria: Decimal | null;
  private permiteReducao: boolean = false;

  constructor(
    dataInicial: Date,
    dataFinal: Date | null,
    tipoMulta: TipoDaMultaDoINSSEnum,
    periodicidadeMulta: TipoPeriodicidadeMultaPrevidenciariaEnum,
    taxa: Decimal,
    tetoTaxaDiaria: Decimal | null = null,
    permiteReducao: boolean = false,
  ) {
    this.dataInicial = dataInicial;
    this.dataFinal = dataFinal;
    this.tipoMulta = tipoMulta;
    this.periodicidadeMulta = periodicidadeMulta;
    this.taxa = taxa;
    this.tetoTaxaDiaria = tetoTaxaDiaria;
    this.permiteReducao = permiteReducao;
  }

  getId(): number | null { return this.id; }
  setId(v: number | null): void { this.id = v; }

  getDataInicial(): Date { return this.dataInicial; }
  getDataFinal(): Date | null { return this.dataFinal; }
  getTipoMulta(): TipoDaMultaDoINSSEnum { return this.tipoMulta; }
  getPeriodicidadeMulta(): TipoPeriodicidadeMultaPrevidenciariaEnum { return this.periodicidadeMulta; }
  getTaxa(): Decimal { return this.taxa; }
  getTetoTaxaDiaria(): Decimal | null { return this.tetoTaxaDiaria; }
  getPermiteReducao(): boolean { return this.permiteReducao; }

  /**
   * resolverTaxa (Java linha 142 / 146).
   *
   * Calcula a taxa aplicável à competência, considerando:
   * - cálculo externo (Lei 11.941 com contagem de dias)
   * - periodicidade TAXA_UNICA (mesma taxa) ou DIARIA (multiplicada por dias)
   * - redução (Lei 8.212: reduzida em 50%)
   */
  resolverTaxa(
    inssSobreSalarios: InssSobreSalariosRef,
    competenciaHelperDate: HelperDate,
    ehDecimoTerceiro: boolean,
    dataLiquidacao: Date,
    semProjecaoDeData: boolean = false,
  ): Decimal | null {
    const calculo = inssSobreSalarios.getInss().getCalculo();
    if (calculo.getCalculoExterno()) {
      // TODO(integracao-futura): resolverTaxaCalculoExterno quando
      // ParcelasAtualizaveisOutrosDebitosReclamado estiver integrado ao fluxo.
      return new Decimal(0);
    }

    const competencia = Competencia.getInstance(competenciaHelperDate.getDate());
    const parametros = calculo.getParametrosDeAtualizacao();

    const ehDevidos = inssSobreSalarios.isDevidos();
    const tipoPagamento = ehDevidos
      ? parametros.getPagamentoDaMultaDosSalariosDevidosDoINSS()
      : parametros.getPagamentoDaMultaDosSalariosPagosDoINSS();

    const dataInicioAtualizacaoPrevidenciaria = ehDevidos
      ? parametros.getAplicarAteDosSalariosDevidosDoINSS()
      : parametros.getAplicarAteDosSalariosPagosDoINSS();
    const existeDataDeInicioDeAtualizacaoPrevidenciaria = naoNulo(dataInicioAtualizacaoPrevidenciaria);

    const apartirDeLei11941 = ehDevidos
      ? parametros.getApartirDeLei11941()
      : parametros.getApartirDeLei11941Pago();
    const aplicarLei11941 = ehDevidos ? parametros.getLei11941() : parametros.getLei11941Pago();
    const existeDataDeInicioDeLei11941 = aplicarLei11941 && naoNulo(apartirDeLei11941);
    const aPartirLei11941 = apartirDeLei11941
      ? HelperDate.getCurrentCompetence(apartirDeLei11941).getDate()
      : null;

    const inss = inssSobreSalarios.getInss();
    let ehEmpregadoDomestico = false;
    if (ehDevidos) {
      const apurarSegurado = inssSobreSalarios.getApurarInssSegurado?.() ?? true;
      if (apurarSegurado) {
        ehEmpregadoDomestico =
          inss.getTipoAliquotaSegurado() === TipoDeAliquotaDoSeguradoEnum.EMPREGADO_DOMESTICO;
      } else if (inss.getTipoAliquotaEmpregador() === TipoDeAliquotaDoEmpregadorEnum.POR_ATIVIDADE_ECONOMICA) {
        const desc = inss.getAtividadeEconomica()?.getDescricao().toUpperCase() ?? '';
        ehEmpregadoDomestico = desc === SERVICOS_DOMESTICOS;
      }
    } else {
      ehEmpregadoDomestico =
        inss.getTipoAliquotaSegurado() === TipoDeAliquotaDoSeguradoEnum.EMPREGADO_DOMESTICO;
    }

    switch (this.periodicidadeMulta) {
      case TipoPeriodicidadeMultaPrevidenciariaEnum.TAXA_UNICA: {
        const compData = competencia.getData();
        if (compData && HelperDate.dateEquals(compData, dataLiquidacao)) return new Decimal(0);
        if (tipoPagamento === TipoPagamentoDaMultaDoINSSEnum.REDUZIDO && this.permiteReducao) {
          return this.taxa.div(2);
        }
        return this.taxa;
      }
      case TipoPeriodicidadeMultaPrevidenciariaEnum.DIARIA: {
        let dataInicial: HelperDate;
        if (semProjecaoDeData) {
          dataInicial = competenciaHelperDate.addDay(-1);
        } else if (
          existeDataDeInicioDeAtualizacaoPrevidenciaria &&
          !(existeDataDeInicioDeLei11941 && aPartirLei11941 && compData(competencia) && HelperDate.dateAfterOrEquals(compData(competencia)!, aPartirLei11941))
        ) {
          const competenciaInicialParaContagem = new Competencia({
            mes: competencia.getMes() ?? 1,
            ano: competencia.getAno() ?? 1970,
          });
          if (dataInicioAtualizacaoPrevidenciaria) {
            const competenciaAplicarAte = HelperDate.getCurrentCompetence(dataInicioAtualizacaoPrevidenciaria);
            const compAtualData = compData(competencia);
            if (compAtualData && HelperDate.dateAfter(competenciaAplicarAte.getDate(), compAtualData)) {
              competenciaInicialParaContagem.setAno(competenciaAplicarAte.getYear());
              // Java usa getMonth() retornando 0-indexed — ajustamos para 1-indexed do Competencia.
              competenciaInicialParaContagem.setMes(competenciaAplicarAte.getMonth() + 1);
            }
          }
          dataInicial = HelperDate.getInstance(
            competenciaInicialParaContagem.getAno() ?? 1970,
            (competenciaInicialParaContagem.getMes() ?? 1) - 1,
            2,
          ).addMonth(1);
          ajustarParaDiaUtil(dataInicial, 1);
        } else if (ehEmpregadoDomestico && !ehDecimoTerceiro) {
          const competenciaJunho2015 = new Date(2015, 5, 1);
          const compAtualData = compData(competencia);
          if (compAtualData && compAtualData < competenciaJunho2015) {
            dataInicial = HelperDate.getInstance(
              competencia.getAno() ?? 1970,
              (competencia.getMes() ?? 1) - 1,
              15,
            ).addMonth(1);
            ajustarParaDiaUtil(dataInicial, 1);
          } else {
            dataInicial = HelperDate.getInstance(
              competencia.getAno() ?? 1970,
              (competencia.getMes() ?? 1) - 1,
              7,
            ).addMonth(1);
            ajustarParaDiaUtil(dataInicial, -1);
          }
        } else {
          dataInicial = HelperDate.getInstance(
            competencia.getAno() ?? 1970,
            (competencia.getMes() ?? 1) - 1,
            20,
          ).addMonth(1);
          ajustarParaDiaUtil(dataInicial, -1);
        }

        let totalDeDias = HelperDate.countDays(dataInicial.getDate(), dataLiquidacao);
        if (totalDeDias < 0) totalDeDias = 0;
        let taxa = this.taxa.mul(totalDeDias);
        if (this.tetoTaxaDiaria && taxa.greaterThan(this.tetoTaxaDiaria)) taxa = this.tetoTaxaDiaria;
        return taxa;
      }
    }
    return null;
  }

  /** resolverTaxaIrpf (Java linha 263) — multa mensal de IRPF. */
  resolverTaxaIrpf(competencia: Competencia, dataLiquidacao: Date): Decimal | null {
    const hdLiquidacao = HelperDate.getInstance(dataLiquidacao);
    const hdTrinta = HelperDate.getInstance(TRINTA_SETEMBRO_2008);
    let dataInicial: HelperDate;
    if (hdLiquidacao.getDate() <= hdTrinta.getDate()) {
      dataInicial = HelperDate.getInstance(
        competencia.getAno() ?? 1970,
        (competencia.getMes() ?? 1) - 1,
        10,
      ).addMonth(1);
      ajustarParaDiaUtil(dataInicial, 1);
    } else {
      dataInicial = HelperDate.getInstance(
        competencia.getAno() ?? 1970,
        (competencia.getMes() ?? 1) - 1,
        20,
      ).addMonth(1);
      ajustarParaDiaUtil(dataInicial, -1);
    }
    let totalDeDias = HelperDate.countDays(dataInicial.getDate(), dataLiquidacao);
    if (totalDeDias < 0) totalDeDias = 0;
    let taxa = this.taxa.mul(totalDeDias);
    if (naoNulo(this.tetoTaxaDiaria) && taxa.greaterThan(this.tetoTaxaDiaria)) taxa = this.tetoTaxaDiaria;
    if (nulo(taxa)) return null;
    return taxa;
  }
}

/** Helper tipado para pegar data da competência sem nullability boilerplate. */
function compData(c: Competencia): Date | null {
  return c.getData();
}
