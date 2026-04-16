/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PensaoAlimenticiaJRAdapter;
import java.math.BigDecimal;
import java.util.Date;

public class PensaoAlimenticiaJRAdapterPadrao
extends PensaoAlimenticiaJRAdapter {
    private PensaoAlimenticia pensaoAlimenticia;

    public PensaoAlimenticiaJRAdapterPadrao() {
    }

    public PensaoAlimenticiaJRAdapterPadrao(Calculo calculo) {
        this.pensaoAlimenticia = calculo.getPensaoAlimenticiaDoCalculo();
        if (this.pensaoAlimenticia == null) {
            this.pensaoAlimenticia = new PensaoAlimenticia(calculo);
        }
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public Date getOcorrencia() {
        return this.pensaoAlimenticia.getCalculo().getDataDeLiquidacao();
    }

    @Override
    public String getFormula() {
        return this.pensaoAlimenticia.getLegendaDaFormula().getLegenda();
    }

    @Override
    public BigDecimal getBase() {
        return this.pensaoAlimenticia.getTotalDasBases();
    }

    @Override
    public BigDecimal getAliquota() {
        return Utils.dividir(this.pensaoAlimenticia.getAliquota(), new BigDecimal("100"));
    }

    @Override
    public BigDecimal getDevido() {
        return this.pensaoAlimenticia.getValorDevido();
    }
}

