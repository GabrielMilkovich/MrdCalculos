/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.GrupoEsferaPrecatorioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.IndicePrecatorioUtils;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipcae.IndiceIPCAE;
import br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.IndicePrecatorioEC1362025;
import br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.IndicePrecatorioEstadual;
import br.jus.trt8.pjecalc.negocio.dominio.indices.precatorios.IndicePrecatorioFederal;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

public class IndicePrecatorioTabelasUtils {
    public static final Date DATA_INICIO_TABELA_IPCAE = HelperDate.getInstance("01/01/1992").getDate();
    public static final Date DATA_INICIO_COMBINACAO_SELIC = HelperDate.getInstance(2021, 11, 1).getDate();
    private static final int DIA_25 = 25;
    private static final int DIA_31 = 31;
    private static final int ANO_2015 = 2015;
    private static final int ANO_2013 = 2013;
    private static final int DIA_10 = 10;
    private static final int DIA_30 = 30;
    private static final int ANO_2009 = 2009;

    protected static BigDecimal calcularIndicePeriodoDaGracaEC1362025(Date dataInicio, Date dataFinal, boolean paraCorrecaoDeJuros) {
        Periodo periodo = new Periodo(dataInicio, dataFinal);
        List<IndicePrecatorioEC1362025> indices = IndicePrecatorioEC1362025.obterTabela(periodo, paraCorrecaoDeJuros, true);
        return IndicePrecatorioUtils.calcularParaOPeriodo(indices, dataInicio, dataFinal, false);
    }

    protected static BigDecimal calcularIndicePeriodoDaGraca(Date dataInicio, Date dataFinal, GrupoEsferaPrecatorioEnum esfera) {
        if (HelperDate.dateAfterOrEquals(dataFinal, DATA_INICIO_TABELA_IPCAE)) {
            Periodo periodoIPCAE;
            BigDecimal indiceTabelaPrecatorio = BigDecimal.ONE;
            BigDecimal indicePeriodoIPCAE = BigDecimal.ONE;
            if (HelperDate.dateAfterOrEquals(dataInicio, DATA_INICIO_TABELA_IPCAE)) {
                periodoIPCAE = new Periodo(dataInicio, dataFinal);
            } else {
                periodoIPCAE = new Periodo(DATA_INICIO_TABELA_IPCAE, dataFinal);
                Periodo periodoTabelaPrecatorio = new Periodo(dataInicio, HelperDate.getInstance(DATA_INICIO_TABELA_IPCAE).addDay(-1).getDate());
                List<IndiceBase> indices = esfera == GrupoEsferaPrecatorioEnum.FEDERAL ? IndicePrecatorioFederal.obterTabela(periodoTabelaPrecatorio) : IndicePrecatorioEstadual.obterTabela(periodoTabelaPrecatorio);
                indiceTabelaPrecatorio = IndicePrecatorioUtils.calcularParaOPeriodo(indices, periodoTabelaPrecatorio.getInicial(), periodoTabelaPrecatorio.getFinal(), false);
            }
            List<IndiceIPCAE> indices = IndiceIPCAE.obterTabela(periodoIPCAE);
            indicePeriodoIPCAE = IndicePrecatorioUtils.calcularParaOPeriodo(indices, periodoIPCAE.getInicial(), periodoIPCAE.getFinal(), false);
            return Utils.multiplicar(indiceTabelaPrecatorio, indicePeriodoIPCAE);
        }
        return IndicePrecatorioTabelasUtils.obterIndiceDaTabela(dataInicio, dataFinal, esfera);
    }

    protected static BigDecimal obterIndiceDaTabela(Date dataInicio, Date dataFinal, GrupoEsferaPrecatorioEnum esfera) {
        boolean dataFinalAposInicioSelic = HelperDate.dateAfterOrEquals(dataFinal, DATA_INICIO_COMBINACAO_SELIC);
        boolean isIndiceDiarioSomenteDiasUteis = IndicePrecatorioTabelasUtils.isIndiceDiarioSomenteDiasUteis(dataFinal, esfera);
        BigDecimal indiceTabelaPrecatorios = BigDecimal.ONE;
        BigDecimal indiceSelic = BigDecimal.ZERO;
        if (HelperDate.dateBefore(dataInicio, DATA_INICIO_COMBINACAO_SELIC)) {
            Periodo periodo = new Periodo(dataInicio, dataFinalAposInicioSelic ? HelperDate.getInstance(DATA_INICIO_COMBINACAO_SELIC).addDay(-1).getDate() : dataFinal);
            List<IndiceBase> indices = esfera == GrupoEsferaPrecatorioEnum.FEDERAL ? IndicePrecatorioFederal.obterTabela(periodo) : IndicePrecatorioEstadual.obterTabela(periodo);
            BigDecimal bigDecimal = indiceTabelaPrecatorios = indices.isEmpty() ? indiceTabelaPrecatorios : IndicePrecatorioUtils.calcularParaOPeriodo(indices, dataInicio, dataFinal, isIndiceDiarioSomenteDiasUteis);
        }
        if (dataFinalAposInicioSelic) {
            Date inicio = HelperDate.dateAfterOrEquals(dataInicio, DATA_INICIO_COMBINACAO_SELIC) ? dataInicio : DATA_INICIO_COMBINACAO_SELIC;
            Periodo periodoSelic = new Periodo(inicio, dataFinal);
            BigDecimal[] indiceSelicParcelas = IndicePrecatorioUtils.calcularIndiceSELICPeriodo5(periodoSelic.getInicial(), periodoSelic.getFinal());
            indiceSelic = Utils.somar(indiceSelicParcelas[0], indiceSelicParcelas[1]);
        }
        return Utils.multiplicar(indiceTabelaPrecatorios, Utils.somar(BigDecimal.ONE, indiceSelic));
    }

    protected static BigDecimal obterIndiceDaTabelaEC1362025(Date dataInicio, Date dataFinal, boolean paraCorrecaoDeJuros) {
        Periodo periodo = new Periodo(dataInicio, dataFinal);
        List<IndicePrecatorioEC1362025> indices = IndicePrecatorioEC1362025.obterTabela(periodo, paraCorrecaoDeJuros, false);
        return IndicePrecatorioUtils.calcularParaOPeriodo(indices, dataInicio, dataFinal, false);
    }

    private static boolean isIndiceDiarioSomenteDiasUteis(Date data, GrupoEsferaPrecatorioEnum esfera) {
        Date trSegundoFinal;
        Date trPrimeiro = HelperDate.getInstance(2009, 5, 30).getDate();
        if (HelperDate.dateBeforeOrEquals(data, trPrimeiro)) {
            return true;
        }
        Date trSegundoInicio = HelperDate.getInstance(2009, 11, 10).getDate();
        Date date = trSegundoFinal = esfera == GrupoEsferaPrecatorioEnum.FEDERAL ? HelperDate.getInstance(2013, 11, 31).getDate() : HelperDate.getInstance(2015, 2, 25).getDate();
        return HelperDate.dateAfterOrEquals(data, trSegundoInicio) && HelperDate.dateBeforeOrEquals(data, trSegundoFinal);
    }
}

