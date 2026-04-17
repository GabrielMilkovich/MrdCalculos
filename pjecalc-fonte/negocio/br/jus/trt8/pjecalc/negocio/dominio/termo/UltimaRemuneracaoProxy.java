/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import java.math.BigDecimal;

public class UltimaRemuneracaoProxy
implements Termo {
    private static final long serialVersionUID = 996548814284121647L;

    @Override
    public BigDecimal resolverValor(ParametroDoTermo parametro) {
        return parametro.getValorUltimaRemuneracaoDoCalculo();
    }

    public String toString() {
        return Utils.formatarNumero(this.resolverValor(null));
    }
}

