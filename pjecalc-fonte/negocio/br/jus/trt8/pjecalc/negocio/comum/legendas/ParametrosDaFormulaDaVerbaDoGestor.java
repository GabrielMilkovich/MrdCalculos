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
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.SalarioCategoria;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.ValeTransporteDaVerba;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class ParametrosDaFormulaDaVerbaDoGestor
implements ParametrosDaFormula {
    private static final long serialVersionUID = 3512833035391474180L;
    private Verba verba;
    private Set<HistoricoSalarialDaVerba> historicosSalariaisDaVerba = new LinkedHashSet<HistoricoSalarialDaVerba>();
    private Set<ValeTransporteDaVerba> valesTransportesDaVerba = new LinkedHashSet<ValeTransporteDaVerba>();

    public ParametrosDaFormulaDaVerbaDoGestor(Verba verba) {
        this.verba = verba;
    }

    @Override
    public BaseDeCalculoDoPrincipalEnum getBaseTabelada() {
        return this.verba.getBaseDeCalculoDoPrincipal();
    }

    @Override
    public List<ItemBaseVerba> getBasesCadastradas() {
        return null;
    }

    @Override
    public Set<Verba> getBasesCadastradasDoGestor() {
        return this.verba.getBasesDeCalculoDoReflexo();
    }

    @Override
    public DivisorDeVerbaEnum getTipoDeDivisor() {
        return this.verba.getDivisor();
    }

    @Override
    public BigDecimal getValorDoDivisor() {
        return this.verba.getOutroDivisor();
    }

    @Override
    public BigDecimal getValorDoMultiplicador() {
        return this.verba.getMultiplicador();
    }

    @Override
    public TipoDeQuantidadeEnum getTipoDeQuantidade() {
        if (Utils.naoNulo((Object)this.verba.getTipoDaQuantidade())) {
            switch (this.verba.getTipoDaQuantidade()) {
                case IMPORTADA_DO_CALENDARIO: {
                    if (this.verba.getTipoImportadaCalendario() != null) break;
                    this.verba.setTipoImportadaCalendario(TipoDeQuantidadeImportadaDoCalendarioEnum.REPOUSOS_FERIADOS);
                    break;
                }
            }
        }
        return this.verba.getTipoDaQuantidade();
    }

    @Override
    public BigDecimal getValorDaQuantidade() {
        return this.verba.getValorInformadoDaQuantidade();
    }

    @Override
    public Set<HistoricoSalarialDaVerba> getHistoricosSalariaisDaVerba() {
        return this.historicosSalariaisDaVerba;
    }

    @Override
    public TipoDeQuantidadeImportadaDoCalendarioEnum getTipoDeQuantidadeImportadaDoCalendario() {
        return this.verba.getTipoImportadaCalendario();
    }

    @Override
    public TipoDeQuantidadeImportadaDoCartaoDePontoEnum getTipoDeQuantidadeImportadadoDoCartaoDePonto() {
        return this.verba.getTipoImportadadoDoCartaoDePonto();
    }

    @Override
    public SalarioCategoria getSalarioCategoriaDaVerba() {
        return null;
    }

    @Override
    public Set<ValeTransporteDaVerba> getValesTransportesDaVerba() {
        return this.valesTransportesDaVerba;
    }
}

