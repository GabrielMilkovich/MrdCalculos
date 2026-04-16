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

@Name(value="primeiraFaixaPrevidenciaria")
@Embeddable
@AttributeOverrides(value={@AttributeOverride(name="valorInicial", column=@Column(name="RVLINICIALFAIXAUM", nullable=false)), @AttributeOverride(name="valorFinal", column=@Column(name="RVLFINALFAIXAUM", nullable=false)), @AttributeOverride(name="aliquota", column=@Column(name="RVLALIQUOTAFAIXAUM", nullable=false))})
public class PrimeiraFaixaPrevidenciaria
extends FaixaPrevidenciaria {
    private static final long serialVersionUID = -9110971792823199843L;
    private static final String DISCRIMINADOR = "1";

    public PrimeiraFaixaPrevidenciaria() {
        this(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    public PrimeiraFaixaPrevidenciaria(BigDecimal valorInicial, BigDecimal valorFinal, BigDecimal aliquota) {
        super(valorInicial, valorFinal, aliquota);
    }

    @Override
    public String getDiscriminador() {
        return DISCRIMINADOR;
    }
}

