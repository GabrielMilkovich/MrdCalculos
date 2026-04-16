/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Criteria
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariocategoria;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.FiltroBase;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.estado.Estado;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.RepositorioDeSalarioCategoria;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.SalarioCategoria;
import java.io.Serializable;
import java.util.List;
import org.hibernate.Criteria;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDoSalarioCategoria")
public class FiltroDoSalarioCategoria
extends FiltroBase<SalarioCategoria>
implements Serializable {
    private static final long serialVersionUID = -7235727704431456701L;
    private String nome;
    private Estado estado;
    private Calculo calculo;

    public FiltroDoSalarioCategoria() {
        super(RepositorioDeSalarioCategoria.class);
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
    }

    @Override
    public List<SalarioCategoria> filtrar() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        if (this.nome != null && !this.nome.equals("")) {
            criterios.adicionarCriterio("and", "nome like ?", "%" + this.nome.toUpperCase() + "%");
        }
        if (this.estado != null && this.estado.getNome() != null) {
            criterios.adicionarCriterio("and", "estado = ?", this.estado);
        }
        if (this.calculo != null && this.calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", this.calculo);
        }
        return ((RepositorioDeSalarioCategoria)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public Estado getEstado() {
        return this.estado;
    }

    public void setEstado(Estado estado) {
        this.estado = estado;
    }
}

