/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.ModoDeCalculoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaCalculada;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Calculada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculo;
import java.math.BigDecimal;

public class MaquinaDeCalculoDaVerbaCalculada
extends MaquinaDeCalculo<Calculada> {
    private static final long serialVersionUID = -6604486596057730361L;

    public MaquinaDeCalculoDaVerbaCalculada(Calculada verba) {
        super(verba);
    }

    private FormulaCalculada getFormula() {
        return (FormulaCalculada)((Calculada)this.getVerba()).getFormula();
    }

    @Override
    protected BigDecimal obterValorDaBase(ParametroDoTermo parametro) {
        if (this.getModo() == ModoDeCalculoEnum.GERACAO_DE_OCORRENCIA) {
            return null;
        }
        BigDecimal totalDaBaseTabelada = null;
        if (Utils.naoNulo(this.getFormula().getBaseTabelada())) {
            totalDaBaseTabelada = this.getFormula().getBaseTabelada().resolverValor(parametro);
        }
        BigDecimal totalDaBaseVerba = this.getFormula().getBaseVerba().resolverValor(parametro);
        if (Utils.naoNulos(totalDaBaseVerba, totalDaBaseTabelada)) {
            return totalDaBaseVerba.add(totalDaBaseTabelada, Utils.CONTEXTO_MATEMATICO);
        }
        if (Utils.naoNulo(totalDaBaseVerba)) {
            return totalDaBaseVerba;
        }
        if (Utils.naoNulo(totalDaBaseTabelada)) {
            return totalDaBaseTabelada;
        }
        return null;
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

