/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.lang.builder.EqualsBuilder
 *  org.apache.commons.lang.builder.HashCodeBuilder
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

import br.jus.trt8.pjecalc.negocio.constantes.InstanciaSetorEnum;
import java.io.Serializable;
import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;

public class Setor
implements Serializable {
    private static final long serialVersionUID = 347001817935457304L;
    private Integer id;
    private InstanciaSetorEnum instancia;

    public Setor() {
    }

    public Setor(Integer id, InstanciaSetorEnum instancia) {
        this.id = id;
        this.instancia = instancia;
    }

    public Integer getId() {
        return this.id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public InstanciaSetorEnum getInstancia() {
        return this.instancia;
    }

    public void setInstancia(InstanciaSetorEnum instancia) {
        this.instancia = instancia;
    }

    public int hashCode() {
        return new HashCodeBuilder(1, 31).append((Object)this.id).append((Object)this.instancia).hashCode();
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
        Setor other = (Setor)obj;
        return new EqualsBuilder().append((Object)this.id, (Object)other.id).append((Object)this.instancia, (Object)other.instancia).isEquals();
    }
}

