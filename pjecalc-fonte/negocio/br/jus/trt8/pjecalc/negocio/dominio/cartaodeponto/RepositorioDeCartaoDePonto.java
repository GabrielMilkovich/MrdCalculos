/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.AggregateCollection;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaDoCartaoDePonto;
import java.util.Collection;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeCartaoDePonto")
public class RepositorioDeCartaoDePonto
extends RepositorioBase<CartaoDePonto> {
    public RepositorioDeCartaoDePonto() {
        super(CartaoDePonto.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<CartaoDePonto> pesquisar(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(orderBy, clausulaWhere, parametros);
    }

    @Override
    public CartaoDePonto obter(Object id) {
        return (CartaoDePonto)super.obter(id);
    }

    public CartaoDePonto removerDeOcorrencias(CartaoDePonto cartaoDePonto, OcorrenciaDoCartaoDePonto ocorrencia) {
        OcorrenciaDoCartaoDePonto oc = (OcorrenciaDoCartaoDePonto)this.entityManager.find(OcorrenciaDoCartaoDePonto.class, (Object)ocorrencia.getId());
        if (this.getSession().contains((Object)oc)) {
            this.getSession().delete((Object)oc);
            cartaoDePonto.getOcorrencias().remove(oc);
        }
        return cartaoDePonto;
    }

    public void removerDeOcorrencias(final CartaoDePonto cartaoDePonto, List<OcorrenciaDoCartaoDePonto> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<CartaoDePonto, OcorrenciaDoCartaoDePonto>(){

            @Override
            public CartaoDePonto getOwner() {
                return cartaoDePonto;
            }

            @Override
            public Collection<OcorrenciaDoCartaoDePonto> getCollection(CartaoDePonto attachadOwner) {
                return attachadOwner.getOcorrencias();
            }
        }, filhos, flush);
    }

    public List<CartaoDePonto> obterCartaoDePontoDoCalculo(Calculo calculo) {
        Query query = this.entityManager.createQuery("from CartaoDePonto where calculo.id = ? order by nome ");
        query.setParameter(1, (Object)calculo.getId());
        return query.getResultList();
    }

    public void removerVinculosDeCartaoDasVerbas(CartaoDePonto cdp) {
        Query query = this.entityManager.createQuery("from CartaoDePontoDaVerba where cartaoDePonto.id = ?");
        query.setParameter(1, (Object)cdp.getId());
        for (Object result : query.getResultList()) {
            this.getSession().delete(result);
        }
    }
}

