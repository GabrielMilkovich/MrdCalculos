/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import java.io.Serializable;
import java.math.BigDecimal;

public interface Termo
extends Serializable {
    public BigDecimal resolverValor(ParametroDoTermo var1);
}

