/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import java.util.Date;

public class AtualizacaoUtils {
    public static boolean testarExistenciaJurosAnteriores(Periodo periodo, TipoOrigemRegistroEnum origemRegistro, Calculo calculo, Date dataAPartirDe, Date dataEvento, boolean primeiroProcessamento) {
        Date dataInicialPeriodo = periodo.getInicial();
        Date dataFinalPeriodo = periodo.getFinal();
        switch (origemRegistro) {
            case CALCULO: {
                if (Utils.nulo(dataAPartirDe)) {
                    return true;
                }
                boolean dataAPartirDeAntesDaLiquidacaoCalculoNormal = HelperDate.dateBeforeOrEquals(dataAPartirDe, calculo.getDataDeLiquidacao()) && calculo.isCalculoExterno() == false;
                return dataAPartirDeAntesDaLiquidacaoCalculoNormal || HelperDate.dateBefore(dataAPartirDe, dataInicialPeriodo) && (!HelperDate.dateEquals(dataInicialPeriodo, calculo.getDataDeLiquidacao()) || !primeiroProcessamento);
            }
            case ATUALIZACAO: {
                if (Utils.nulo(dataAPartirDe)) {
                    return !HelperDate.dateEquals(dataFinalPeriodo, dataEvento) && !HelperDate.dateEquals(dataInicialPeriodo, dataEvento);
                }
                return HelperDate.dateBeforeOrEquals(dataAPartirDe, dataInicialPeriodo) && !HelperDate.dateEquals(dataFinalPeriodo, dataEvento);
            }
        }
        return false;
    }

    public static Date testarExistenciaJurosDeAte(Periodo periodo, Date dataInicialParaLiquidacaoMaisUm, TipoOrigemRegistroEnum origemRegistro, Calculo calculo, Date dataAPartirDe, Date dataEvento, boolean primeiroProcessamento) {
        Object dataDe = null;
        Date dataInicialPeriodo = periodo.getInicial();
        Date dataFinalPeriodo = periodo.getFinal();
        dataDe = TipoOrigemRegistroEnum.CALCULO.equals((Object)origemRegistro) ? (Utils.nulo(dataAPartirDe) ? dataInicialParaLiquidacaoMaisUm : (HelperDate.dateBefore(dataAPartirDe, dataInicialPeriodo) && HelperDate.dateEquals(dataInicialPeriodo, calculo.getDataDeLiquidacao()) && primeiroProcessamento ? (HelperDate.dateEquals(dataInicialPeriodo, dataFinalPeriodo) ? null : dataInicialParaLiquidacaoMaisUm) : (HelperDate.dateEquals(dataAPartirDe, dataInicialPeriodo) && HelperDate.dateEquals(dataInicialPeriodo, calculo.getDataDeLiquidacao()) && primeiroProcessamento ? dataInicialParaLiquidacaoMaisUm : (HelperDate.dateBefore(dataAPartirDe, dataInicialPeriodo) && HelperDate.dateEquals(dataInicialPeriodo, calculo.getDataDeLiquidacao()) && !primeiroProcessamento ? dataInicialParaLiquidacaoMaisUm : (HelperDate.dateBefore(dataAPartirDe, dataInicialPeriodo) && !HelperDate.dateEquals(dataInicialPeriodo, calculo.getDataDeLiquidacao()) ? dataInicialParaLiquidacaoMaisUm : (HelperDate.dateBeforeOrEquals(dataAPartirDe, dataFinalPeriodo) ? dataAPartirDe : null)))))) : (Utils.nulo(dataAPartirDe) && HelperDate.dateEquals(dataEvento, dataFinalPeriodo) ? null : (Utils.nulo(dataAPartirDe) && !HelperDate.dateEquals(dataEvento, dataFinalPeriodo) ? dataInicialParaLiquidacaoMaisUm : (HelperDate.dateAfter(dataAPartirDe, dataFinalPeriodo) ? null : (HelperDate.dateEquals(dataEvento, dataFinalPeriodo) || HelperDate.dateAfter(dataAPartirDe, dataInicialPeriodo) ? dataAPartirDe : dataInicialParaLiquidacaoMaisUm))));
        return dataDe;
    }
}

