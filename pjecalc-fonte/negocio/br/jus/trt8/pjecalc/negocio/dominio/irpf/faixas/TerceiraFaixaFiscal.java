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

@Name(value="terceiraFaixaFiscal")
@Embeddable
@AttributeOverrides(value={@AttributeOverride(name="valorInicial", column=@Column(name="RVLINICIALFAIXATRES", nullable=false)), @AttributeOverride(name="valorFinal", column=@Column(name="RVLFINALFAIXATRES", nullable=true)), @AttributeOverride(name="aliquota", column=@Column(name="RVLALIQUOTAFAIXATRES", nullable=false)), @AttributeOverride(name="deducao", column=@Column(name="RVLDEDUCAOFAIXATRES", nullable=false))})
public class TerceiraFaixaFiscal
extends FaixaFiscal {
    private static final long serialVersionUID = -5836909410279830839L;
    private static final String DISCRIMINADOR = "3";

    public TerceiraFaixaFiscal() {
        this(BigDecimal.ZERO, null, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    public TerceiraFaixaFiscal(BigDecimal valorInicial, BigDecimal valorFinal, BigDecimal aliquota, BigDecimal deducao) {
        super(valorInicial, valorFinal, aliquota, deducao);
    }

    @Override
    public String getDiscriminador() {
        return DISCRIMINADOR;
    }
}

