/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorSeguroDesempregoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.SeguroDesempregoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.SeguroDesemprego;
import java.math.BigDecimal;
import java.util.Date;

public class SeguroDesempregoJRAdapterPadrao
extends SeguroDesempregoJRAdapter {
    private SeguroDesemprego seguroDesemprego;

    public SeguroDesempregoJRAdapterPadrao() {
    }

    public SeguroDesempregoJRAdapterPadrao(Calculo calculo) {
        this.seguroDesemprego = calculo.getSeguroDesemprego();
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public Date getOcorrencia() {
        return this.seguroDesemprego.getCalculo().getDataDemissao();
    }

    @Override
    public String getFormula() {
        return this.seguroDesemprego.getLegendaDaFormula().getLegenda();
    }

    @Override
    public BigDecimal getSalarioReferencia() {
        return this.seguroDesemprego.getRemuneracaoMensal();
    }

    @Override
    public BigDecimal getValorParcela() {
        return this.seguroDesemprego.getValorSeguroDesemprego();
    }

    @Override
    public Integer getQuantidadeParcelas() {
        return this.seguroDesemprego.getNumeroDeParcelas();
    }

    @Override
    public BigDecimal getDevido() {
        return this.seguroDesemprego.getValorDevido();
    }

    @Override
    public BigDecimal getIndice() {
        return this.seguroDesemprego.getIndiceDeCorrecao();
    }

    @Override
    public BigDecimal getValorCorrigido() {
        return this.seguroDesemprego.getValorDevidoCorrigido();
    }

    @Override
    public BigDecimal getJuros() {
        return this.seguroDesemprego.getJuros();
    }

    @Override
    public BigDecimal getTotal() {
        return this.seguroDesemprego.getTotal();
    }

    @Override
    public TipoValorSeguroDesempregoEnum getTipoValorDoSeguroDesemprego() {
        return this.seguroDesemprego.getTipoValorDoSeguroDesemprego();
    }
}

