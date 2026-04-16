/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo;

import br.jus.trt8.pjecalc.base.comum.Constantes;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.RotinaDeCalculo;
import br.jus.trt8.pjecalc.negocio.constantes.RegimeDoContratoEnum;
import java.util.Date;

public class CalculoDoPrazoDeFerias
extends RotinaDeCalculo {
    private static CalculoDoPrazoDeFerias instance;
    private static final String FIM_PERIODO_AQUISITIVO = "FIM_PERIODO_AQUISITIVO";
    private static final String REGIME_CONTRATO = "REGIME_CONTRATO";
    private static final String FALTAS = "FALTAS";
    private static final String RESULTADO = "RESULTADO";

    public static CalculoDoPrazoDeFerias getInstance() {
        if (Utils.nulo(instance)) {
            instance = new CalculoDoPrazoDeFerias();
        }
        return instance;
    }

    public CalculoDoPrazoDeFerias parametros(Date fimPeriodoAquisitivo, RegimeDoContratoEnum regimeDoContrato, Integer faltas) {
        this.setEntrada(FIM_PERIODO_AQUISITIVO, fimPeriodoAquisitivo);
        this.setEntrada(REGIME_CONTRATO, (Object)regimeDoContrato);
        this.setEntrada(FALTAS, faltas);
        return this;
    }

    @Override
    public void executar() {
        Date fimPeriodoAquisitivo = this.getEntrada(FIM_PERIODO_AQUISITIVO, Date.class);
        RegimeDoContratoEnum regimeDoContrato = this.getEntrada(REGIME_CONTRATO, RegimeDoContratoEnum.class);
        Integer faltas = this.getEntrada(FALTAS, Integer.class);
        Integer resultado = 0;
        resultado = regimeDoContrato == RegimeDoContratoEnum.PARCIAL && HelperDate.dateBefore(fimPeriodoAquisitivo, Constantes.DATA_REFORMA_TRABALHISTA) ? (faltas <= 7 ? Integer.valueOf(18) : Integer.valueOf(9)) : (faltas <= 5 ? Integer.valueOf(30) : (faltas <= 14 ? Integer.valueOf(24) : (faltas <= 23 ? Integer.valueOf(18) : (faltas <= 32 ? Integer.valueOf(12) : Integer.valueOf(0)))));
        this.setSaida(RESULTADO, resultado);
    }

    public Integer getResultado() {
        return this.getSaida(RESULTADO, Integer.class);
    }
}

