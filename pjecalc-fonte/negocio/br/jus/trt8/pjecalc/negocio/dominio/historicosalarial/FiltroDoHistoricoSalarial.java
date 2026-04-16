/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Criteria
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.historicosalarial;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.FiltroBase;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.RepositorioDeHistoricoSalarial;
import java.io.Serializable;
import java.util.List;
import org.hibernate.Criteria;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDoHistoricoSalarial")
public class FiltroDoHistoricoSalarial
extends FiltroBase<HistoricoSalarial>
implements Serializable {
    private static final long serialVersionUID = -7235727704431456701L;
    private String nome;
    private Calculo calculo;

    public FiltroDoHistoricoSalarial() {
        super(RepositorioDeHistoricoSalarial.class);
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
    }

    @Override
    public List<HistoricoSalarial> filtrar() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id asc");
        if (this.nome != null && !this.nome.equals("")) {
            criterios.adicionarCriterio("and", "nome like ?", "%" + this.nome.toUpperCase() + "%");
        }
        if (this.calculo != null && this.calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", this.calculo);
        }
        return ((RepositorioDeHistoricoSalarial)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
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

