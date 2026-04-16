/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import java.math.BigDecimal;
import java.util.Date;

public abstract class PensaoAlimenticiaJRAdapter
extends JRAdapter {
    public abstract Date getOcorrencia();

    public abstract String getFormula();

    public abstract BigDecimal getBase();

    public abstract BigDecimal getAliquota();

    public abstract BigDecimal getDevido();
}

