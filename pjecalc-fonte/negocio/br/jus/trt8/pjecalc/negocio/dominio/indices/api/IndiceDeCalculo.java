/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.api;

import java.math.BigDecimal;
import java.util.Date;

public interface IndiceDeCalculo
extends Comparable<IndiceDeCalculo> {
    public BigDecimal getTaxa();

    public Date getCompetencia();

    public BigDecimal getValorIndice();

    public void setValorAcumulado(BigDecimal var1);

    public BigDecimal getValorAcumulado();

    public IndiceDeCalculo clonar();
}

