/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.RotinaDeCalculo;
import java.math.BigDecimal;

public class CalculoDoIntegralizar
extends RotinaDeCalculo {
    private static final int VINTE_OITO_DIAS = 28;
    private static final int VINTE_NOVE_DIAS = 29;
    private static final int TRINTA_DIAS = 30;
    private static final int TRINTA_UM_DIAS = 31;
    private static final String PERIODO = "PERIODO";
    private static final String VALOR = "VALOR";
    private static final String RESULTADO = "RESULTADO";
    private static final String QTD_EXCLUSOES = "QTD_EXCLUSOES";

    public CalculoDoIntegralizar(Periodo periodo, BigDecimal valor) {
        this.setEntrada(PERIODO, periodo);
        this.setEntrada(VALOR, valor);
        this.setEntrada(QTD_EXCLUSOES, 0);
    }

    public CalculoDoIntegralizar(Periodo periodo, BigDecimal valor, Integer qtdExclusoes) {
        this.setEntrada(PERIODO, periodo);
        this.setEntrada(VALOR, valor);
        this.setEntrada(QTD_EXCLUSOES, qtdExclusoes);
    }

    @Override
    public void executar() {
        BigDecimal valor = this.getEntrada(VALOR, BigDecimal.class);
        Periodo periodo = this.getEntrada(PERIODO, Periodo.class);
        int diasDoPeriodo = periodo.totalDeDias();
        int qtdExclusoes = this.getEntrada(QTD_EXCLUSOES, Integer.class);
        if ((diasDoPeriodo -= qtdExclusoes) < 0) {
            diasDoPeriodo = 0;
        }
        if (diasDoPeriodo > 30) {
            diasDoPeriodo = 30;
        }
        BigDecimal resultado = BigDecimal.ZERO;
        if (Utils.naoNulos(valor, diasDoPeriodo) && diasDoPeriodo > 0) {
            switch (HelperDate.getInstance(periodo.getFinal()).daysInMonth()) {
                case 28: {
                    resultado = valor.multiply(new BigDecimal(28), Utils.CONTEXTO_MATEMATICO).divide(new BigDecimal(diasDoPeriodo), Utils.CONTEXTO_MATEMATICO);
                    break;
                }
                case 29: {
                    resultado = valor.multiply(new BigDecimal(29), Utils.CONTEXTO_MATEMATICO).divide(new BigDecimal(diasDoPeriodo), Utils.CONTEXTO_MATEMATICO);
                    break;
                }
                default: {
                    resultado = valor.multiply(new BigDecimal(30), Utils.CONTEXTO_MATEMATICO).divide(new BigDecimal(diasDoPeriodo), Utils.CONTEXTO_MATEMATICO);
                }
            }
        }
        this.setSaida(RESULTADO, resultado);
    }

    public BigDecimal getResultado() {
        return this.getSaida(RESULTADO, BigDecimal.class);
    }
}

