/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.legendas;

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
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

public interface ParametrosDaFormula
extends Serializable {
    public BaseDeCalculoDoPrincipalEnum getBaseTabelada();

    public List<ItemBaseVerba> getBasesCadastradas();

    public Set<Verba> getBasesCadastradasDoGestor();

    public DivisorDeVerbaEnum getTipoDeDivisor();

    public BigDecimal getValorDoDivisor();

    public BigDecimal getValorDoMultiplicador();

    public TipoDeQuantidadeEnum getTipoDeQuantidade();

    public BigDecimal getValorDaQuantidade();

    public Set<HistoricoSalarialDaVerba> getHistoricosSalariaisDaVerba();

    public TipoDeQuantidadeImportadaDoCalendarioEnum getTipoDeQuantidadeImportadaDoCalendario();

    public TipoDeQuantidadeImportadaDoCartaoDePontoEnum getTipoDeQuantidadeImportadadoDoCartaoDePonto();

    public SalarioCategoria getSalarioCategoriaDaVerba();

    public Set<ValeTransporteDaVerba> getValesTransportesDaVerba();
}

