/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Criteria
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.FiltroBase;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDePagamento;
import java.io.Serializable;
import java.util.List;
import org.hibernate.Criteria;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDoPagamento")
public class FiltroDoPagamento
extends FiltroBase<Pagamento>
implements Serializable {
    private static final long serialVersionUID = -6747670721085423305L;
    private Calculo calculo;

    public FiltroDoPagamento() {
        super(RepositorioDePagamento.class);
    }

    @Override
    public List<Pagamento> filtrar() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id asc");
        if (this.calculo != null && this.calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", this.calculo);
        }
        criterios.setOrderBy("dataPagamento desc");
        return ((RepositorioDePagamento)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }
}

