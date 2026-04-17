/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.RotinaDeCalculo;
import java.math.BigDecimal;

public class CalculoDoSalarioEmFerias
extends RotinaDeCalculo {
    private static final String PERIODO = "PERIODO";
    private static final String VALORMES1 = "VALORMES1";
    private static final String VALORMES2 = "VALORMES2";
    private static final String RESULTADO = "RESULTADO";
    private static final BigDecimal TRINTA_DIAS = new BigDecimal("30");

    public CalculoDoSalarioEmFerias(Periodo periodo, BigDecimal valorMes1, BigDecimal valorMes2) {
        this.setEntrada(PERIODO, periodo);
        this.setEntrada(VALORMES1, valorMes1);
        this.setEntrada(VALORMES2, valorMes2);
    }

    @Override
    public void executar() {
        Periodo periodo = this.getEntrada(PERIODO, Periodo.class);
        BigDecimal valorMes1 = this.getEntrada(VALORMES1, BigDecimal.class);
        BigDecimal valorMes2 = this.getEntrada(VALORMES2, BigDecimal.class);
        BigDecimal resultado = BigDecimal.ZERO;
        if (periodo.isDatasDoMesmoMes()) {
            BigDecimal valorParcial = valorMes1.divide(TRINTA_DIAS, Utils.CONTEXTO_MATEMATICO);
            resultado = valorParcial.multiply(new BigDecimal(periodo.totalDeDias()), Utils.CONTEXTO_MATEMATICO);
        } else if (Utils.naoNulo(valorMes1) && valorMes1.compareTo(BigDecimal.ZERO) >= 0) {
            HelperDate dataFinal = HelperDate.getInstance(periodo.getInicial()).lastDayOfTheMonth();
            int totalDias = (int)dataFinal.subtractDays(periodo.getInicial()) + 1;
            BigDecimal valorParcial = valorMes1.divide(TRINTA_DIAS, Utils.CONTEXTO_MATEMATICO);
            resultado = valorParcial.multiply(new BigDecimal(totalDias), Utils.CONTEXTO_MATEMATICO);
            if (Utils.naoNulo(valorMes2) && valorMes2.compareTo(BigDecimal.ZERO) >= 0) {
                totalDias = dataFinal.setDate(periodo.getFinal()).getDay();
                valorParcial = valorMes2.divide(TRINTA_DIAS, Utils.CONTEXTO_MATEMATICO);
                resultado = resultado.add(valorParcial.multiply(new BigDecimal(totalDias), Utils.CONTEXTO_MATEMATICO));
            }
        }
        this.setSaida(RESULTADO, resultado);
    }

    public BigDecimal getResultado() {
        return this.getSaida(RESULTADO, BigDecimal.class);
    }
}

