/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicFazenda;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

public class IndicePrecatorioUtils {
    private static final int ANO_2021 = 2021;

    protected static BigDecimal[] calcularIndiceSELICPeriodo5(Date dataInicio, Date dataFinal) {
        Periodo periodo;
        List<IndiceSelicFazenda> indices;
        Date dataInicioIndice = HelperDate.getInstance(2021, 11, 1).getDate();
        Date dataFinalIndice = HelperDate.getInstance().getDate();
        if (HelperDate.dateBefore(dataFinal, dataInicio) || HelperDate.dateAfter(dataInicio, dataFinalIndice) || HelperDate.dateBefore(dataFinal, dataInicioIndice)) {
            return new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO};
        }
        if (HelperDate.dateAfter(dataInicio, dataInicioIndice)) {
            dataInicioIndice = dataInicio;
        }
        if (HelperDate.dateBefore(dataFinal, dataFinalIndice)) {
            dataFinalIndice = dataFinal;
        }
        BigDecimal indiceMesMudancaInicio = !(indices = IndiceSelicFazenda.obterTabela(periodo = new Periodo(HelperDate.getInstance(dataInicioIndice), HelperDate.getInstance(dataFinalIndice)))).isEmpty() ? Utils.subtrair(indices.get(indices.size() - 1).getValorIndice(), BigDecimal.ONE) : BigDecimal.ZERO;
        boolean existeIndiceMesMudancaFinal = !indices.isEmpty() && HelperDate.dateEquals(HelperDate.getCurrentCompetence(indices.get(0).getCompetencia()).getDate(), HelperDate.getCurrentCompetence(dataFinalIndice).getDate());
        BigDecimal indiceMesMudancaFinal = existeIndiceMesMudancaFinal ? Utils.subtrair(indices.get(0).getValorIndice(), BigDecimal.ONE) : BigDecimal.ZERO;
        BigDecimal indiceMesMudancaParaDescontar = Utils.somar(indiceMesMudancaInicio, indiceMesMudancaFinal);
        BigDecimal indiceAcumuladoSemMesMudanca = !indices.isEmpty() ? Utils.subtrair(Utils.subtrair(indices.get(indices.size() - 1).getValorAcumulado(), BigDecimal.ONE), indiceMesMudancaParaDescontar) : BigDecimal.ZERO;
        long qtdDiasMesInicio = HelperDate.obterQuantidadeDiasNoMes(HelperDate.getInstance(dataInicioIndice));
        long qtdDiasPeriodoInicio = HelperDate.obterQuantidadeDiasNoPeriodo(HelperDate.getInstance(dataInicioIndice), HelperDate.getInstance(dataInicioIndice).lastDayOfTheMonth());
        BigDecimal indiceDiarioMesMudancaInicio = qtdDiasMesInicio == qtdDiasPeriodoInicio ? indiceMesMudancaInicio : Utils.subtrair(IndicePrecatorioUtils.calcularIndiceParcial(Utils.somar(indiceMesMudancaInicio, BigDecimal.ONE), qtdDiasMesInicio, qtdDiasPeriodoInicio), BigDecimal.ONE);
        long qtdDiasMesFinal = HelperDate.obterQuantidadeDiasNoMes(HelperDate.getInstance(dataFinalIndice));
        long qtdDiasPeriodoFinal = HelperDate.obterQuantidadeDiasNoPeriodo(HelperDate.getCurrentCompetence(dataFinalIndice), HelperDate.getInstance(dataFinalIndice));
        BigDecimal indiceDiarioMesMudancaFinal = qtdDiasMesFinal == qtdDiasPeriodoFinal ? indiceMesMudancaFinal : Utils.subtrair(IndicePrecatorioUtils.calcularIndiceParcial(Utils.somar(indiceMesMudancaFinal, BigDecimal.ONE), qtdDiasMesFinal, qtdDiasPeriodoFinal), BigDecimal.ONE);
        return new BigDecimal[]{Utils.somar(indiceAcumuladoSemMesMudanca, indiceDiarioMesMudancaInicio), indiceDiarioMesMudancaFinal};
    }

    protected static BigDecimal calcularParaOPeriodo(List<? extends IndiceBase> indices, Date dataInicioIndice, Date dataFinalIndice, boolean isIndiceDiarioSomenteDiasUteis) {
        BigDecimal indiceMesMudancaInicio = !indices.isEmpty() ? indices.get(indices.size() - 1).getValorIndice() : BigDecimal.ONE;
        boolean existeIndiceMesMudancaFinal = !indices.isEmpty() && HelperDate.dateEquals(HelperDate.getCurrentCompetence(indices.get(0).getCompetencia()).getDate(), HelperDate.getCurrentCompetence(dataFinalIndice).getDate());
        BigDecimal indiceMesMudancaFinal = existeIndiceMesMudancaFinal ? indices.get(0).getValorIndice() : BigDecimal.ONE;
        BigDecimal indiceMesMudancaParaDescontar = Utils.multiplicar(indiceMesMudancaInicio, indiceMesMudancaFinal);
        BigDecimal indiceAcumuladoSemMesMudanca = !indices.isEmpty() ? Utils.dividir(indices.get(indices.size() - 1).getValorAcumulado(), indiceMesMudancaParaDescontar) : BigDecimal.ONE;
        long qtdDiasMesInicio = isIndiceDiarioSomenteDiasUteis ? HelperDate.obterQuantidadeDiasUteisNoMes(HelperDate.getInstance(dataInicioIndice)) : HelperDate.obterQuantidadeDiasNoMes(HelperDate.getInstance(dataInicioIndice));
        long qtdDiasPeriodoInicio = isIndiceDiarioSomenteDiasUteis ? HelperDate.obterQuantidadeDiasUteisNoPeriodo(HelperDate.getInstance(dataInicioIndice), HelperDate.getInstance(dataInicioIndice).lastDayOfTheMonth()) : HelperDate.obterQuantidadeDiasNoPeriodo(HelperDate.getInstance(dataInicioIndice), HelperDate.getInstance(dataInicioIndice).lastDayOfTheMonth());
        BigDecimal indiceDiarioMesMudancaInicio = qtdDiasMesInicio == qtdDiasPeriodoInicio ? indiceMesMudancaInicio : IndicePrecatorioUtils.calcularIndiceParcial(indiceMesMudancaInicio, qtdDiasMesInicio, qtdDiasPeriodoInicio);
        long qtdDiasMesFinal = isIndiceDiarioSomenteDiasUteis ? HelperDate.obterQuantidadeDiasUteisNoMes(HelperDate.getInstance(dataFinalIndice)) : HelperDate.obterQuantidadeDiasNoMes(HelperDate.getInstance(dataFinalIndice));
        long qtdDiasPeriodoFinal = isIndiceDiarioSomenteDiasUteis ? HelperDate.obterQuantidadeDiasUteisNoPeriodo(HelperDate.getCurrentCompetence(dataFinalIndice), HelperDate.getInstance(dataFinalIndice)) : HelperDate.obterQuantidadeDiasNoPeriodo(HelperDate.getCurrentCompetence(dataFinalIndice), HelperDate.getInstance(dataFinalIndice));
        BigDecimal indiceDiarioMesMudancaFinal = qtdDiasMesFinal == qtdDiasPeriodoFinal ? indiceMesMudancaFinal : IndicePrecatorioUtils.calcularIndiceParcial(indiceMesMudancaFinal, qtdDiasMesFinal, qtdDiasPeriodoFinal);
        return Utils.multiplicar(indiceAcumuladoSemMesMudanca, Utils.multiplicar(indiceDiarioMesMudancaFinal, indiceDiarioMesMudancaInicio));
    }

    protected static BigDecimal calcularIndiceParcial(BigDecimal indiceCheio, long qtdDiasTotal, long qtdDiasPeriodo) {
        return BigDecimal.valueOf(Math.pow(Math.pow(indiceCheio.doubleValue(), 1.0 / (double)qtdDiasTotal), qtdDiasPeriodo));
    }
}

