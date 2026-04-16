/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Criteria
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.FiltroBase;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.RepositorioDeHonorario;
import java.io.Serializable;
import java.util.List;
import org.hibernate.Criteria;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDeHonorario")
public class FiltroDeHonorario
extends FiltroBase<Honorario>
implements Serializable {
    private static final long serialVersionUID = 8598635466103955287L;
    private Calculo calculo;

    public FiltroDeHonorario() {
        super(RepositorioDeHonorario.class);
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
    }

    @Override
    public List<Honorario> filtrar() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        if (this.calculo != null && this.calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", this.calculo);
            criterios.adicionarCriterio("and", "origemRegistro = ?", new Object[]{TipoOrigemRegistroEnum.CALCULO});
        }
        return ((RepositorioDeHonorario)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    public List<Honorario> filtrarAtualizacao() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        if (this.calculo != null && this.calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", this.calculo);
            criterios.adicionarCriterio("and", "origemRegistro = ?", new Object[]{TipoOrigemRegistroEnum.ATUALIZACAO});
        }
        return ((RepositorioDeHonorario)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }
}

