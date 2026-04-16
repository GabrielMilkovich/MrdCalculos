/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Criteria
 *  org.hibernate.criterion.Criterion
 *  org.hibernate.criterion.Order
 *  org.hibernate.criterion.Restrictions
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.FiltroBase;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.RepositorioDeVerbaCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.util.List;
import org.hibernate.Criteria;
import org.hibernate.criterion.Criterion;
import org.hibernate.criterion.Order;
import org.hibernate.criterion.Restrictions;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDeVerbaCalculo")
public class FiltroDeVerbaDeCalculo
extends FiltroBase<VerbaDeCalculo>
implements Serializable {
    private static final long serialVersionUID = -4559957294388016235L;
    private Calculo calculo;

    public FiltroDeVerbaDeCalculo() {
        super(RepositorioDeVerbaCalculo.class);
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
        criteria.add((Criterion)Restrictions.eq((String)"ativo", (Object)true));
        criteria.add((Criterion)Restrictions.eq((String)"calculo.id", (Object)this.calculo.getId()));
        criteria.addOrder(Order.asc((String)"nome"));
    }

    @Override
    public List<VerbaDeCalculo> filtrar() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        criterios.adicionarCriterio("and", "ativo = ?", Boolean.TRUE);
        if (this.calculo != null && this.calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", this.calculo);
        }
        return ((RepositorioDeVerbaCalculo)this.getRepositorio()).obterVerbasAtivasDoCalculo(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }
}

