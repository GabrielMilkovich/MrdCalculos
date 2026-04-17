/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaInformada;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Informada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculo;
import java.math.BigDecimal;

public class MaquinaDeCalculoDaVerbaInformada
extends MaquinaDeCalculo<Informada> {
    private static final long serialVersionUID = 4417365084452790584L;

    public MaquinaDeCalculoDaVerbaInformada(Informada verba) {
        super(verba);
    }

    @Override
    protected BigDecimal obterValorDaBase(ParametroDoTermo parametro) {
        return null;
    }

    @Override
    protected BigDecimal obterValorDoDivisor(ParametroDoTermo parametro) {
        return null;
    }

    @Override
    protected BigDecimal obterValorDoMultiplicador(ParametroDoTermo parametro) {
        return null;
    }

    @Override
    protected BigDecimal obterQuantidade(ParametroDoTermo parametro) {
        return null;
    }

    @Override
    protected BigDecimal obterValorDevido(ParametroDoTermo parametro) {
        return ((FormulaInformada)((Informada)this.getVerba()).getFormula()).getConstante().resolverValor(parametro);
    }

    @Override
    protected BigDecimal obterValorPago(ParametroDoTermo parametro) {
        return ((Informada)this.getVerba()).getFormula().getValorPago().resolverValor(parametro);
    }

    @Override
    protected Boolean obterDobra() {
        return false;
    }
}

