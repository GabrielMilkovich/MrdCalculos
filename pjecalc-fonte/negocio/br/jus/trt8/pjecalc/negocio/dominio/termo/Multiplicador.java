/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Embeddable
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import java.math.BigDecimal;
import javax.persistence.Column;
import javax.persistence.Embeddable;

@Embeddable
public class Multiplicador
implements Termo {
    private static final long serialVersionUID = -5566656496999441525L;
    @Column(name="RVLVALOR", precision=19, scale=6)
    private BigDecimal outroValor;

    @Override
    public BigDecimal resolverValor(ParametroDoTermo parametro) {
        return this.outroValor;
    }

    public BigDecimal getOutroValor() {
        return this.outroValor;
    }

    public void setOutroValor(BigDecimal outroValor) {
        this.outroValor = outroValor;
    }

    public String toString() {
        return this.outroValor == null ? "Multiplicador" : Utils.formatarNumero(this.outroValor);
    }

    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.outroValor == null ? 0 : this.outroValor.hashCode());
        return result;
    }

    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        Multiplicador other = (Multiplicador)obj;
        return !(this.outroValor == null ? other.outroValor != null : !this.outroValor.equals(other.outroValor));
    }
}

