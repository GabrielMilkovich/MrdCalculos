/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.legendas;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.legendas.ParametrosDaFormula;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeCalculoDoPrincipalEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DivisorDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeImportadaDoCalendarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeImportadaDoCartaoDePontoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaCalculada;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.SalarioCategoria;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.ValeTransporteDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class ParametrosDaFormulaDaVerbaDoCalculo
implements ParametrosDaFormula {
    private static final long serialVersionUID = 8808041794979854668L;
    private VerbaDeCalculo verba;

    public ParametrosDaFormulaDaVerbaDoCalculo(VerbaDeCalculo verba) {
        this.verba = verba;
    }

    @Override
    public BaseDeCalculoDoPrincipalEnum getBaseTabelada() {
        if (this.verba.getFormula() instanceof FormulaCalculada && Utils.naoNulo(this.verba.getFormula(FormulaCalculada.class).getBaseTabelada())) {
            return this.verba.getFormula(FormulaCalculada.class).getBaseTabelada().getTipo();
        }
        return null;
    }

    @Override
    public List<ItemBaseVerba> getBasesCadastradas() {
        if (this.verba.getFormula() instanceof FormulaReflexo) {
            return this.verba.getFormula(FormulaReflexo.class).getBaseVerba().getItens();
        }
        return null;
    }

    @Override
    public Set<Verba> getBasesCadastradasDoGestor() {
        return null;
    }

    @Override
    public DivisorDeVerbaEnum getTipoDeDivisor() {
        if (this.verba.getFormula() instanceof FormulaReflexo && !this.verba.existemOcorrenciasComDivisorAlterado()) {
            return this.verba.getFormula(FormulaReflexo.class).getDivisor().getTipo();
        }
        return null;
    }

    @Override
    public BigDecimal getValorDoDivisor() {
        if (this.verba.getFormula() instanceof FormulaReflexo) {
            return this.verba.getFormula(FormulaReflexo.class).getDivisor().getOutroValor();
        }
        return null;
    }

    @Override
    public BigDecimal getValorDoMultiplicador() {
        if (this.verba.getFormula() instanceof FormulaReflexo && !this.verba.existemOcorrenciasComMultiplicadorAlterado()) {
            return this.verba.getFormula(FormulaReflexo.class).getMultiplicador().getOutroValor();
        }
        return null;
    }

    @Override
    public TipoDeQuantidadeEnum getTipoDeQuantidade() {
        if (this.verba.getFormula() instanceof FormulaReflexo && !this.verba.existemOcorrenciasComQuantidadeAlterado()) {
            return this.verba.getFormula(FormulaReflexo.class).getQuantidade().getTipo();
        }
        return null;
    }

    @Override
    public BigDecimal getValorDaQuantidade() {
        if (this.verba.getFormula() instanceof FormulaReflexo) {
            return this.verba.getFormula(FormulaReflexo.class).getQuantidade().getValorInformado();
        }
        return null;
    }

    @Override
    public Set<HistoricoSalarialDaVerba> getHistoricosSalariaisDaVerba() {
        return new LinkedHashSet<HistoricoSalarialDaVerba>(this.verba.getHistoricosDaVerbaDoValorDevido());
    }

    @Override
    public TipoDeQuantidadeImportadaDoCalendarioEnum getTipoDeQuantidadeImportadaDoCalendario() {
        if (this.verba.getFormula() instanceof FormulaReflexo) {
            return this.verba.getFormula(FormulaReflexo.class).getQuantidade().getTipoImportadaCalendarioEnum();
        }
        return null;
    }

    @Override
    public TipoDeQuantidadeImportadaDoCartaoDePontoEnum getTipoDeQuantidadeImportadadoDoCartaoDePonto() {
        if (this.verba.getFormula() instanceof FormulaReflexo) {
            return this.verba.getFormula(FormulaReflexo.class).getQuantidade().getTipoImportadadoDoCartaoDePonto();
        }
        return null;
    }

    @Override
    public SalarioCategoria getSalarioCategoriaDaVerba() {
        return this.verba.getSalarioCategoriaValorDevido();
    }

    @Override
    public Set<ValeTransporteDaVerba> getValesTransportesDaVerba() {
        return new LinkedHashSet<ValeTransporteDaVerba>(this.verba.getValesTransportesDoValorDevido());
    }
}

