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
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.RepositorioDeApuracaoCartaoDePonto;
import java.io.Serializable;
import java.util.List;
import org.hibernate.Criteria;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDaApuracaoCartaoDePonto")
public class FiltroDaApuracaoCartaoDePonto
extends FiltroBase<ApuracaoCartaoDePonto>
implements Serializable {
    private static final long serialVersionUID = -7235727704431456701L;
    private Calculo calculo;

    public FiltroDaApuracaoCartaoDePonto() {
        super(RepositorioDeApuracaoCartaoDePonto.class);
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
    }

    @Override
    public List<ApuracaoCartaoDePonto> filtrar() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("dataInicial asc");
        if (this.calculo != null && this.calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", this.calculo);
        }
        return ((RepositorioDeApuracaoCartaoDePonto)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }
}

