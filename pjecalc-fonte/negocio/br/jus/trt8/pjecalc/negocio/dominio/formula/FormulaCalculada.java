/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.DiscriminatorValue
 *  javax.persistence.Embedded
 *  javax.persistence.Entity
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.formula;

import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.BaseTabelada;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Embedded;
import javax.persistence.Entity;
import org.jboss.seam.annotations.Name;

@Entity
@DiscriminatorValue(value="C")
@Name(value="formulaCalculada")
public class FormulaCalculada
extends FormulaReflexo {
    private static final long serialVersionUID = 2579233820698080992L;
    @Embedded
    private BaseTabelada baseTabelada = new BaseTabelada();

    public BaseTabelada getBaseTabelada() {
        return this.baseTabelada;
    }

    public void setBaseTabelada(BaseTabelada baseTabelada) {
        this.baseTabelada = baseTabelada;
    }
}

