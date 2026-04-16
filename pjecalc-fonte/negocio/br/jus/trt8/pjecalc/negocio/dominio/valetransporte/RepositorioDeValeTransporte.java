/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.valetransporte;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.ValeTransporte;
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.ValorValeTransporte;
import java.util.Collection;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeValeTransporte")
public class RepositorioDeValeTransporte
extends RepositorioBase<ValeTransporte> {
    public RepositorioDeValeTransporte() {
        super(ValeTransporte.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<ValeTransporte> pesquisar(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(orderBy, clausulaWhere, parametros);
    }

    @Override
    public ValeTransporte obter(Object id) {
        return (ValeTransporte)super.obter(id);
    }

    @Override
    public void salvar(ValeTransporte entidade) {
        if (Utils.naoNulo(entidade.getDataEncerramentoLinha()) && !entidade.getOcorrencias().isEmpty()) {
            entidade.getOcorrencias().get(0).setDataTermino(entidade.getDataEncerramentoLinha());
        }
        super.salvar(entidade, new OneToManyRemover(){

            public Collection<? extends EntidadeBase> getCollection(EntidadeBase entity) {
                return ((ValeTransporte)entity).getOcorrencias();
            }
        });
    }

    public List<ValorValeTransporte> obterValoresPorPeriodo(Periodo periodo, ValeTransporte valeTransporte) {
        Query query = this.entityManager.createQuery("from ValorValeTransporte where valeTransporte = :valeTransporte and (((dataInicio between :ini and :fim ) or (dataTermino between :ini and :fim )) or ((:ini between dataInicio and dataTermino) or (:fim between dataInicio and dataTermino )))");
        query.setParameter("valeTransporte", (Object)valeTransporte);
        query.setParameter("ini", (Object)periodo.getInicial());
        query.setParameter("fim", (Object)periodo.getFinal());
        List lista = query.getResultList();
        if (lista.isEmpty() && Utils.nulo(valeTransporte.getDataEncerramentoLinha())) {
            query = this.entityManager.createQuery("from ValorValeTransporte where valeTransporte = :valeTransporte and dataInicio <= :ini and dataTermino is null order by dataInicio desc");
            query.setParameter("valeTransporte", (Object)valeTransporte);
            query.setParameter("ini", (Object)periodo.getInicial());
            lista = query.getResultList();
        }
        return lista;
    }
}

