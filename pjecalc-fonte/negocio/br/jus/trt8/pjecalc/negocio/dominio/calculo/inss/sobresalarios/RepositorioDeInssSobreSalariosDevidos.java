/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.api.AggregateCollection;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeInssSobreSalarios;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeInssSobreSalariosDevidos")
public class RepositorioDeInssSobreSalariosDevidos
extends RepositorioDeInssSobreSalarios<InssSobreSalariosDevidos> {
    public RepositorioDeInssSobreSalariosDevidos() {
        super(InssSobreSalariosDevidos.class);
    }

    public void removerDeOcorrencias(final InssSobreSalariosDevidos inssSobreSalariosDevidos, List<OcorrenciaDeInssSobreSalariosDevidos> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<InssSobreSalariosDevidos, OcorrenciaDeInssSobreSalariosDevidos>(){

            @Override
            public InssSobreSalariosDevidos getOwner() {
                return inssSobreSalariosDevidos;
            }

            @Override
            public Collection<OcorrenciaDeInssSobreSalariosDevidos> getCollection(InssSobreSalariosDevidos attachadOwner) {
                return attachadOwner.getOcorrencias();
            }
        }, filhos, flush);
    }

    public void removerDeOcorrenciasAtualizacao(InssSobreSalariosDevidos inssSobreSalariosDevidos) {
        Query query = this.entityManager.createQuery("delete from OcorrenciaDeInssSobreSalariosDevidosAtualizacao o where o.inssSobreSalariosDevidos = :inssSobreSalariosDevidos");
        query.setParameter("inssSobreSalariosDevidos", (Object)inssSobreSalariosDevidos);
        query.executeUpdate();
    }

    public List<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> obterOcorrenciasAtualizacaoNaoAmortizadasPor(InssSobreSalariosDevidos inssSobreSalariosDevidos, Date dataEvento) {
        String hql = "select o from OcorrenciaDeInssSobreSalariosDevidosAtualizacao o where o.inssSobreSalariosDevidos = :inssSobreSalariosDevidos and o.dataEvento = :dataEvento and o.pago < o.total order by o.dataOcorrenciaInss, o.ocorrenciaDecimoTerceiro";
        Query query = this.entityManager.createQuery(hql);
        query.setParameter("inssSobreSalariosDevidos", (Object)inssSobreSalariosDevidos);
        query.setParameter("dataEvento", (Object)dataEvento);
        return query.getResultList();
    }

    public List<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> obterOcorrenciasAtualizacaoTodasPor(InssSobreSalariosDevidos inssSobreSalariosDevidos, Date dataEvento) {
        String hql = "select o from OcorrenciaDeInssSobreSalariosDevidosAtualizacao o where o.inssSobreSalariosDevidos = :inssSobreSalariosDevidos and o.dataEvento = :dataEvento order by o.dataOcorrenciaInss, o.ocorrenciaDecimoTerceiro";
        Query query = this.entityManager.createQuery(hql);
        query.setParameter("inssSobreSalariosDevidos", (Object)inssSobreSalariosDevidos);
        query.setParameter("dataEvento", (Object)dataEvento);
        return query.getResultList();
    }
}

