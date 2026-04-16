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

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.ValorDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.formula.Formula;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Constante;
import java.math.BigDecimal;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Embedded;
import javax.persistence.Entity;
import org.jboss.seam.annotations.Name;

@Entity
@DiscriminatorValue(value="I")
@Name(value="formulaInformada")
public class FormulaInformada
extends Formula {
    private static final long serialVersionUID = 2867980022986209366L;
    @Embedded
    private Constante constante = new Constante();

    public Constante getConstante() {
        if (this.constante == null) {
            this.constante = new Constante();
        }
        return this.constante;
    }

    public void setConstante(Constante constante) {
        this.constante = constante;
    }

    public BigDecimal getValorDevidoInformado() {
        return Utils.nulo(this.constante) ? null : this.constante.getValor();
    }

    private BigDecimal getValorPagoInformado() {
        if (Utils.naoNulo(this.getValorPago()) && this.getValorPago().isInformado()) {
            return this.getValorPago().getValorInformado();
        }
        return null;
    }

    private FormulaInformada consistirValorInformado() {
        if (Utils.nulo(this.getValorDevidoInformado())) {
            throw new NegocioException(new MensagemDeRecurso("valorInformadoDoDevido", Mensagens.MSG0003, "Devido"));
        }
        if (Utils.naoNulo(this.getValorPagoInformado()) && BigDecimal.ZERO.compareTo(this.getValorDevidoInformado()) == 0 && BigDecimal.ZERO.compareTo(this.getValorPagoInformado()) <= 0) {
            return this;
        }
        if (BigDecimal.ZERO.compareTo(this.getValorDevidoInformado()) >= 0) {
            throw new NegocioException(new MensagemDeRecurso("valorInformadoDoDevido", Mensagens.MSG0004, "Devido"));
        }
        return this;
    }

    @Override
    public FormulaInformada consistir() {
        if (!this.getVerbaDeCalculo().isOrigemExpressa()) {
            this.consistirValorInformado();
        }
        super.consistir();
        return this;
    }

    public String toString() {
        return ValorDaVerbaEnum.INFORMADO.getNome();
    }
}

