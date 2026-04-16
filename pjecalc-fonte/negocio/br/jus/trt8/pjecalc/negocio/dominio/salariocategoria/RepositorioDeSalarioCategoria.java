/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariocategoria;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.OcorrenciaDeSalarioCategoria;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.SalarioCategoria;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeSalarioCategoria")
public class RepositorioDeSalarioCategoria
extends RepositorioBase<SalarioCategoria> {
    public RepositorioDeSalarioCategoria() {
        super(SalarioCategoria.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<SalarioCategoria> pesquisar(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(orderBy, clausulaWhere, parametros);
    }

    @Override
    public SalarioCategoria obter(Object id) {
        return (SalarioCategoria)super.obter(id);
    }

    @Override
    public void salvar(SalarioCategoria entidade) {
        super.salvar(entidade, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((SalarioCategoria)entity).getOcorrencias();
            }
        });
    }

    public SalarioCategoria removerDeOcorrencias(SalarioCategoria salarioCategoria, OcorrenciaDeSalarioCategoria ocorrencia) {
        OcorrenciaDeSalarioCategoria oc = (OcorrenciaDeSalarioCategoria)this.entityManager.find(OcorrenciaDeSalarioCategoria.class, (Object)ocorrencia.getId());
        if (this.getSession().contains((Object)oc)) {
            this.getSession().delete((Object)oc);
            salarioCategoria.getOcorrencias().remove(oc);
        }
        return salarioCategoria;
    }

    public List<SalarioCategoria> obterSalarioCategoria(Calculo calculo) {
        Query query = this.entityManager.createQuery("from SalarioCategoria where calculo.id = ? order by nome ");
        query.setParameter(1, (Object)calculo.getId());
        return query.getResultList();
    }

    public List<OcorrenciaDeSalarioCategoria> obterOcorrenciasDoPeriodo(SalarioCategoria categoria, Date dataInicial, Date dataFinal) {
        Query query = this.entityManager.createQuery("from OcorrenciaDeSalarioCategoria  where salarioCategoria = ? and dataOcorrencia between ? and ? order by dataOcorrencia");
        query.setParameter(1, (Object)categoria);
        query.setParameter(2, (Object)HelperDate.getCurrentCompetence(dataInicial).getDate());
        query.setParameter(3, (Object)HelperDate.getCurrentCompetence(dataFinal).getDate());
        List list = query.getResultList();
        return list;
    }
}

