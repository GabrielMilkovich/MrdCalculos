/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Criteria
 *  org.hibernate.criterion.Criterion
 *  org.hibernate.criterion.Restrictions
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.multa;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.FiltroBase;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.RepositorioDeMulta;
import java.io.Serializable;
import java.util.List;
import org.hibernate.Criteria;
import org.hibernate.criterion.Criterion;
import org.hibernate.criterion.Restrictions;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDeMulta")
public class FiltroDeMulta
extends FiltroBase<Multa>
implements Serializable {
    private static final long serialVersionUID = 742668663885800502L;
    private Calculo calculo;

    public FiltroDeMulta() {
        super(RepositorioDeMulta.class);
    }

    @Override
    public List<Multa> filtrar() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        if (this.calculo != null && this.calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", this.calculo);
            criterios.adicionarCriterio("and", "origemRegistro = ?", new Object[]{TipoOrigemRegistroEnum.CALCULO});
        }
        return ((RepositorioDeMulta)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    public List<Multa> filtrarAtualizacao() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        if (this.calculo != null && this.calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", this.calculo);
            criterios.adicionarCriterio("and", "origemRegistro = ?", new Object[]{TipoOrigemRegistroEnum.ATUALIZACAO});
        }
        return ((RepositorioDeMulta)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
        criteria.add((Criterion)Restrictions.eq((String)"calculo", (Object)this.calculo));
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }
}

