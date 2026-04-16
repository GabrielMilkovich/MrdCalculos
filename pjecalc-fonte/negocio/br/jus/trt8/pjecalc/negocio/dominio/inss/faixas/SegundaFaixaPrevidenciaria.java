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

@Name(value="segundaFaixaPrevidenciaria")
@Embeddable
@AttributeOverrides(value={@AttributeOverride(name="valorInicial", column=@Column(name="RVLINICIALFAIXADOIS", nullable=false)), @AttributeOverride(name="valorFinal", column=@Column(name="RVLFINALFAIXADOIS", nullable=false)), @AttributeOverride(name="aliquota", column=@Column(name="RVLALIQUOTAFAIXADOIS", nullable=false))})
public class SegundaFaixaPrevidenciaria
extends FaixaPrevidenciaria {
    private static final long serialVersionUID = -8460355015971168321L;
    private static final String DISCRIMINADOR = "2";

    public SegundaFaixaPrevidenciaria() {
        this(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    public SegundaFaixaPrevidenciaria(BigDecimal valorInicial, BigDecimal valorFinal, BigDecimal aliquota) {
        super(valorInicial, valorFinal, aliquota);
    }

    @Override
    public String getDiscriminador() {
        return DISCRIMINADOR;
    }
}

