/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Criteria
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.FiltroBase;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.RepositorioDeCartaoDePonto;
import java.io.Serializable;
import java.util.List;
import org.hibernate.Criteria;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDoCartaoDePonto")
public class FiltroDoCartaoDePonto
extends FiltroBase<CartaoDePonto>
implements Serializable {
    private static final long serialVersionUID = -7235727704431456701L;
    private String nome;
    private Calculo calculo;

    public FiltroDoCartaoDePonto() {
        super(RepositorioDeCartaoDePonto.class);
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
    }

    @Override
    public List<CartaoDePonto> filtrar() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id asc");
        if (this.nome != null && !this.nome.equals("")) {
            criterios.adicionarCriterio("and", "nome like ?", "%" + this.nome.toUpperCase() + "%");
        }
        if (this.calculo != null && this.calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", this.calculo);
        }
        return ((RepositorioDeCartaoDePonto)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
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
}

