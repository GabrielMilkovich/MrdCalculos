/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import java.math.BigDecimal;

public class MaiorRemuneracaoProxy
implements Termo {
    private static final long serialVersionUID = 6020534453701170096L;

    @Override
    public BigDecimal resolverValor(ParametroDoTermo parametro) {
        return parametro.getValorMaiorRemuneracaoDoCalculo();
    }

    public String toString() {
        return Utils.formatarNumero(this.resolverValor(null));
    }
}

