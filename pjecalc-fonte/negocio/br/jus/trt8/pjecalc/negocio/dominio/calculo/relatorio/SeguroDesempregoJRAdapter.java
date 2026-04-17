/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorSeguroDesempregoEnum;
import java.math.BigDecimal;
import java.util.Date;

public abstract class SeguroDesempregoJRAdapter
extends JRAdapter {
    public abstract Date getOcorrencia();

    public abstract String getFormula();

    public abstract BigDecimal getSalarioReferencia();

    public abstract BigDecimal getValorParcela();

    public abstract Integer getQuantidadeParcelas();

    public abstract BigDecimal getDevido();

    public abstract BigDecimal getIndice();

    public abstract BigDecimal getValorCorrigido();

    public abstract BigDecimal getJuros();

    public abstract BigDecimal getTotal();

    public abstract TipoValorSeguroDesempregoEnum getTipoValorDoSeguroDesemprego();
}

