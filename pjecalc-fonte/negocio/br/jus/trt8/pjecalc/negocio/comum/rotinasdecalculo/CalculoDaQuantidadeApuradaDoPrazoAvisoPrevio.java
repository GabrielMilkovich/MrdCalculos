/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.RotinaDeCalculo;

public class CalculoDaQuantidadeApuradaDoPrazoAvisoPrevio
extends RotinaDeCalculo {
    private static final int TRINTA_DIAS = 30;
    private static final int QUANTIDADE_POR_ANO = 3;
    private static final int MAXIMO_DE_DIAS_PARA_AVISO_PREVIO = 90;
    private static final String PERIODO = "PERIODO";
    private static final String QUANTIDADE = "QUANTIDADE";

    public CalculoDaQuantidadeApuradaDoPrazoAvisoPrevio(Periodo periodo) {
        this.setEntrada(PERIODO, periodo);
    }

    @Override
    public void executar() {
        Periodo periodo = this.getEntrada(PERIODO, Periodo.class);
        int anos = HelperDate.countYears(periodo.getInicial(), periodo.getFinal());
        int quantidade = 30 + anos * 3;
        if (quantidade > 90) {
            quantidade = 90;
        }
        this.setSaida(QUANTIDADE, quantidade);
    }

    public Integer getQuantidade() {
        return this.getSaida(QUANTIDADE, Integer.class);
    }
}

