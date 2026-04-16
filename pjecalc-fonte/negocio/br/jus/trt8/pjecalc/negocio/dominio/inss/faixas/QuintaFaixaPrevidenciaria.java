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

@Name(value="quintaFaixaPrevidenciaria")
@Embeddable
@AttributeOverrides(value={@AttributeOverride(name="valorInicial", column=@Column(name="RVLINICIALFAIXACINCO", nullable=true)), @AttributeOverride(name="valorFinal", column=@Column(name="RVLFINALFAIXACINCO", nullable=true)), @AttributeOverride(name="aliquota", column=@Column(name="RVLALIQUOTAFAIXACINCO", nullable=true))})
public class QuintaFaixaPrevidenciaria
extends FaixaPrevidenciaria {
    private static final long serialVersionUID = -333923749860407685L;
    private static final String DISCRIMINADOR = "5";

    public QuintaFaixaPrevidenciaria() {
        this(BigDecimal.ZERO, null, BigDecimal.ZERO);
    }

    public QuintaFaixaPrevidenciaria(BigDecimal valorInicial, BigDecimal valorFinal, BigDecimal aliquota) {
        super(valorInicial, valorFinal, aliquota);
    }

    @Override
    public String getDiscriminador() {
        return DISCRIMINADOR;
    }
}

