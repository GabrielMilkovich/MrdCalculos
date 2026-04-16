/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Criteria
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.valetransporte;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.FiltroBase;
import br.jus.trt8.pjecalc.negocio.dominio.estado.Estado;
import br.jus.trt8.pjecalc.negocio.dominio.municipio.Municipio;
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.RepositorioDeValeTransporte;
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.ValeTransporte;
import java.io.Serializable;
import java.util.List;
import org.hibernate.Criteria;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDeValeTransporte")
public class FiltroDeValeTransporte
extends FiltroBase<ValeTransporte>
implements Serializable {
    private static final long serialVersionUID = -6898072943572926930L;
    private String descricaoLinha;
    private Estado estado;
    private Municipio municipio;

    public FiltroDeValeTransporte() {
        super(RepositorioDeValeTransporte.class);
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
    }

    @Override
    public List<ValeTransporte> filtrar() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("estado asc, municipio asc, descricaoLinha asc");
        if (this.descricaoLinha != null && !this.descricaoLinha.equals("")) {
            criterios.adicionarCriterio("and", "descricaoLinha like ?", "%" + this.descricaoLinha.toUpperCase() + "%");
        }
        if (this.estado != null) {
            criterios.adicionarCriterio("and", "estado = ?", this.estado);
        }
        if (this.municipio != null) {
            criterios.adicionarCriterio("and", "municipio = ?", this.municipio);
        }
        return ((RepositorioDeValeTransporte)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    public String getDescricaoLinha() {
        return this.descricaoLinha;
    }

    public void setDescricaoLinha(String descricaoLinha) {
        this.descricaoLinha = descricaoLinha;
    }

    public Estado getEstado() {
        return this.estado;
    }

    public void setEstado(Estado estado) {
        this.estado = estado;
    }

    public Municipio getMunicipio() {
        return this.municipio;
    }

    public void setMunicipio(Municipio municipio) {
        this.municipio = municipio;
    }
}

