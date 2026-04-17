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
package br.jus.trt8.pjecalc.negocio.dominio.irpf.faixas;

import br.jus.trt8.pjecalc.negocio.dominio.irpf.faixas.FaixaFiscal;
import java.math.BigDecimal;
import javax.persistence.AttributeOverride;
import javax.persistence.AttributeOverrides;
import javax.persistence.Column;
import javax.persistence.Embeddable;
import org.jboss.seam.annotations.Name;

@Name(value="primeiraFaixaFiscal")
@Embeddable
@AttributeOverrides(value={@AttributeOverride(name="valorInicial", column=@Column(name="RVLINICIALFAIXAUM", nullable=false)), @AttributeOverride(name="valorFinal", column=@Column(name="RVLFINALFAIXAUM", nullable=false)), @AttributeOverride(name="aliquota", column=@Column(name="RVLALIQUOTAFAIXAUM", nullable=false)), @AttributeOverride(name="deducao", column=@Column(name="RVLDEDUCAOFAIXAUM", nullable=false))})
public class PrimeiraFaixaFiscal
extends FaixaFiscal {
    private static final long serialVersionUID = 8844529503097106118L;
    private static final String DISCRIMINADOR = "1";

    public PrimeiraFaixaFiscal() {
        this(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    public PrimeiraFaixaFiscal(BigDecimal valorInicial, BigDecimal valorFinal, BigDecimal aliquota, BigDecimal deducao) {
        super(valorInicial, valorFinal, aliquota, deducao);
    }

    @Override
    public String getDiscriminador() {
        return DISCRIMINADOR;
    }
}

