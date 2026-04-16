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

@Name(value="quintaFaixaFiscal")
@Embeddable
@AttributeOverrides(value={@AttributeOverride(name="valorInicial", column=@Column(name="RVLINICIALFAIXACINCO", nullable=true)), @AttributeOverride(name="valorFinal", column=@Column(name="RVLFINALFAIXACINCO", nullable=true)), @AttributeOverride(name="aliquota", column=@Column(name="RVLALIQUOTAFAIXACINCO", nullable=true)), @AttributeOverride(name="deducao", column=@Column(name="RVLDEDUCAOFAIXACINCO", nullable=true))})
public class QuintaFaixaFiscal
extends FaixaFiscal {
    private static final long serialVersionUID = 4020776252975176578L;
    private static final String DISCRIMINADOR = "5";

    public QuintaFaixaFiscal() {
        this(BigDecimal.ZERO, null, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    public QuintaFaixaFiscal(BigDecimal valorInicial, BigDecimal valorFinal, BigDecimal aliquota, BigDecimal deducao) {
        super(valorInicial, valorFinal, aliquota, deducao);
    }

    @Override
    public String getDiscriminador() {
        return DISCRIMINADOR;
    }
}

