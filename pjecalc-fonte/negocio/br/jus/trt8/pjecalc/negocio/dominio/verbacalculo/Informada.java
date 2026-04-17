/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.DiscriminatorValue
 *  javax.persistence.Entity
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.negocio.constantes.ValorDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaInformada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculoDaVerbaInformada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Principal;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;
import org.jboss.seam.annotations.Name;

@Entity
@DiscriminatorValue(value="I")
@Name(value="verbaInformada")
public class Informada
extends Principal {
    private static final long serialVersionUID = 5922354741834392713L;

    public Informada() {
        this.formula = new FormulaInformada();
        this.formula.setVerbaDeCalculo(this);
        this.maquinaDeCalculo = new MaquinaDeCalculoDaVerbaInformada(this);
    }

    public Informada(Calculo calculo) {
        this();
        this.setCalculo(calculo);
    }

    @Override
    public ValorDaVerbaEnum getTipoValor() {
        return ValorDaVerbaEnum.INFORMADO;
    }

    @Override
    public boolean isInformada() {
        return true;
    }

    @Override
    public VerbaDeCalculo validar() {
        this.getHistoricosDaVerbaDoValorDevido().clear();
        this.getValesTransportesDoValorDevido().clear();
        this.consistirValorPago();
        return super.validar();
    }

    private void consistirValorPago() {
        if (this.getFormula().getValorPago().isInformado()) {
            this.getHistoricosDaVerbaDoValorPago().clear();
            this.getValesTransportesDoValorPago().clear();
            this.setSalarioCategoriaValorPago(null);
        }
    }
}

