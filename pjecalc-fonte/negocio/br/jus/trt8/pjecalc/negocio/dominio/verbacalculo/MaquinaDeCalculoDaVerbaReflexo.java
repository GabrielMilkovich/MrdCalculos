/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.negocio.constantes.ModoDeCalculoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import java.math.BigDecimal;

public class MaquinaDeCalculoDaVerbaReflexo
extends MaquinaDeCalculo<Reflexo> {
    private static final long serialVersionUID = -1155173882749492294L;

    public MaquinaDeCalculoDaVerbaReflexo(Reflexo verba) {
        super(verba);
    }

    private FormulaReflexo getFormula() {
        return (FormulaReflexo)((Reflexo)this.getVerba()).getFormula();
    }

    @Override
    protected BigDecimal obterValorDaBase(ParametroDoTermo parametro) {
        if (this.getModo() == ModoDeCalculoEnum.GERACAO_DE_OCORRENCIA) {
            return null;
        }
        return this.getFormula().getBaseVerba().resolverValor(parametro);
    }

    @Override
    protected BigDecimal obterValorDoDivisor(ParametroDoTermo parametro) {
        return this.getFormula().getDivisor().resolverValor(parametro);
    }

    @Override
    protected BigDecimal obterValorDoMultiplicador(ParametroDoTermo parametro) {
        return this.getFormula().getMultiplicador().resolverValor(parametro);
    }

    @Override
    protected BigDecimal obterQuantidade(ParametroDoTermo parametro) {
        return this.getFormula().getQuantidade().resolverValor(parametro);
    }

    @Override
    protected BigDecimal obterValorDevido(ParametroDoTermo parametro) {
        return new BigDecimal("0.0");
    }

    @Override
    protected BigDecimal obterValorPago(ParametroDoTermo parametro) {
        return this.getFormula().getValorPago().resolverValor(parametro);
    }

    @Override
    protected Boolean obterDobra() {
        return this.getFormula().getDobra();
    }
}

