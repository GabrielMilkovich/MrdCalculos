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

@Name(value="segundaFaixaFiscal")
@Embeddable
@AttributeOverrides(value={@AttributeOverride(name="valorInicial", column=@Column(name="RVLINICIALFAIXADOIS", nullable=false)), @AttributeOverride(name="valorFinal", column=@Column(name="RVLFINALFAIXADOIS", nullable=false)), @AttributeOverride(name="aliquota", column=@Column(name="RVLALIQUOTAFAIXADOIS", nullable=false)), @AttributeOverride(name="deducao", column=@Column(name="RVLDEDUCAOFAIXADOIS", nullable=false))})
public class SegundaFaixaFiscal
extends FaixaFiscal {
    private static final long serialVersionUID = -3131589619046250966L;
    private static final String DISCRIMINADOR = "2";

    public SegundaFaixaFiscal() {
        this(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    public SegundaFaixaFiscal(BigDecimal valorInicial, BigDecimal valorFinal, BigDecimal aliquota, BigDecimal deducao) {
        super(valorInicial, valorFinal, aliquota, deducao);
    }

    @Override
    public String getDiscriminador() {
        return DISCRIMINADOR;
    }
}

