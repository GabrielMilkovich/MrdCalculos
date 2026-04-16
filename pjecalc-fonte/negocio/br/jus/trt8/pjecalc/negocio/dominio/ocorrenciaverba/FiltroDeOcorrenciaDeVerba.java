/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Criteria
 *  org.hibernate.criterion.Criterion
 *  org.hibernate.criterion.Restrictions
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba;

import br.jus.trt8.pjecalc.base.comum.FiltroBase;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.RepositorioDeOcorrenciaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import org.hibernate.Criteria;
import org.hibernate.criterion.Criterion;
import org.hibernate.criterion.Restrictions;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDeOcorrenciaVerba")
public class FiltroDeOcorrenciaDeVerba
extends FiltroBase<OcorrenciaDeVerba>
implements Serializable {
    private static final long serialVersionUID = -4559957294388016235L;
    private VerbaDeCalculo verbaDeCalculo;
    private boolean ativo;

    public FiltroDeOcorrenciaDeVerba() {
        super(RepositorioDeOcorrenciaVerba.class);
    }

    public VerbaDeCalculo getVerbaDeCalculo() {
        return this.verbaDeCalculo;
    }

    public void setVerbaDeCalculo(VerbaDeCalculo verbaDeCalculo) {
        this.verbaDeCalculo = verbaDeCalculo;
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
        criteria.add((Criterion)Restrictions.eq((String)"ativo", (Object)this.ativo));
        criteria.add((Criterion)Restrictions.eq((String)"verbaDeCalculo.id", (Object)this.verbaDeCalculo.getId()));
    }

    public FiltroDeOcorrenciaDeVerba comVerba(VerbaDeCalculo verbaDeCalculo) {
        this.verbaDeCalculo = verbaDeCalculo;
        return this;
    }

    public FiltroDeOcorrenciaDeVerba comAtivo(boolean ativo) {
        this.ativo = ativo;
        return this;
    }
}

