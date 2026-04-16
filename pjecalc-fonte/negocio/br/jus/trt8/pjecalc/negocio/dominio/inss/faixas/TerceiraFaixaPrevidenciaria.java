/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.AttributeOverride
 *  javax.persistence.AttributeOverrides
 *  javax.persistence.Column
 *  javax.persistence.Embeddable
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss.faixas;

import br.jus.trt8.pjecalc.negocio.dominio.inss.faixas.FaixaPrevidenciaria;
import java.math.BigDecimal;
import javax.persistence.AttributeOverride;
import javax.persistence.AttributeOverrides;
import javax.persistence.Column;
import javax.persistence.Embeddable;
import org.jboss.seam.annotations.Name;

@Name(value="terceiraFaixaPrevidenciaria")
@Embeddable
@AttributeOverrides(value={@AttributeOverride(name="valorInicial", column=@Column(name="RVLINICIALFAIXATRES", nullable=false)), @AttributeOverride(name="valorFinal", column=@Column(name="RVLFINALFAIXATRES", nullable=true)), @AttributeOverride(name="aliquota", column=@Column(name="RVLALIQUOTAFAIXATRES", nullable=false))})
public class TerceiraFaixaPrevidenciaria
extends FaixaPrevidenciaria {
    private static final long serialVersionUID = -9094793542289746256L;
    private static final String DISCRIMINADOR = "3";

    public TerceiraFaixaPrevidenciaria() {
        this(BigDecimal.ZERO, null, BigDecimal.ZERO);
    }

    public TerceiraFaixaPrevidenciaria(BigDecimal valorInicial, BigDecimal valorFinal, BigDecimal aliquota) {
        super(valorInicial, valorFinal, aliquota);
    }

    @Override
    public String getDiscriminador() {
        return DISCRIMINADOR;
    }
}

