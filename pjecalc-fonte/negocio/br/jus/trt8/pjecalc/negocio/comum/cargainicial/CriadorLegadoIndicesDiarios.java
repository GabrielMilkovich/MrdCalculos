/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.comum.cargainicial;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.LogicoFuzzy;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTDiario;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTMensal;
import java.math.BigDecimal;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="criadorLegadoIndicesDiarios")
public class CriadorLegadoIndicesDiarios {
    public void gera() {
        List<IndiceTabelaUnicaJTMensal> indicesMensais = IndiceTabelaUnicaJTMensal.obterTodosSemLimite();
        for (IndiceTabelaUnicaJTMensal mensal : indicesMensais) {
            if (!mensal.getIndicesDiarios().isEmpty()) continue;
            HelperDate diaDoMesDaCompetencia = HelperDate.getInstance(mensal.getCompetencia());
            HelperDate ultimoDiaDoMesDaCompetencia = diaDoMesDaCompetencia.lastDayOfTheMonth();
            double totalDiasUteis = diaDoMesDaCompetencia.totalWorkDaysWithoutFederalHolidaysFilter(ultimoDiaDoMesDaCompetencia, LogicoFuzzy.FALSO);
            BigDecimal valorAcumuladoDiario = this.calcularValorDoIndiceDiario(totalDiasUteis, mensal);
            while (diaDoMesDaCompetencia.lessThanOrEqualsTo(ultimoDiaDoMesDaCompetencia)) {
                if (diaDoMesDaCompetencia.isWorkDayWithoutSaturdaysOrFederalHolidays()) {
                    mensal.getIndicesDiarios().add(new IndiceTabelaUnicaJTDiario(diaDoMesDaCompetencia.getDate(), valorAcumuladoDiario, mensal));
                } else {
                    mensal.getIndicesDiarios().add(new IndiceTabelaUnicaJTDiario(diaDoMesDaCompetencia.getDate(), new BigDecimal("0"), mensal));
                }
                diaDoMesDaCompetencia.addDay(1);
            }
            mensal.salvarSemDiario();
        }
    }

    private BigDecimal calcularValorDoIndiceDiario(double quantidadeDiasUteis, IndiceTabelaUnicaJTMensal mensal) {
        IndiceTabelaUnicaJTMensal filtro = new IndiceTabelaUnicaJTMensal();
        filtro.setCompetenciaParaVerAcumulado(mensal.getCompetencia());
        filtro.setCompetencia(null);
        BigDecimal valorAcumuladoCalculado = null;
        List<IndiceTabelaUnicaJTMensal> lista = IndiceTabelaUnicaJTMensal.obterPorFiltro(filtro);
        valorAcumuladoCalculado = !lista.isEmpty() ? lista.get(lista.indexOf(mensal)).getValorIndice() : mensal.getValorIndice();
        BigDecimal raizEnesimaDoAcumuladoMensal = new BigDecimal(Math.pow(valorAcumuladoCalculado.doubleValue(), 1.0 / quantidadeDiasUteis));
        return raizEnesimaDoAcumuladoMensal.subtract(new BigDecimal(1)).multiply(new BigDecimal(100));
    }
}

