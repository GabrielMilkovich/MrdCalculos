/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.api.AggregateCollection;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeInssSobreSalarios;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeInssSobreSalariosPagos")
public class RepositorioDeInssSobreSalariosPagos
extends RepositorioDeInssSobreSalarios<InssSobreSalariosPagos> {
    public RepositorioDeInssSobreSalariosPagos() {
        super(InssSobreSalariosPagos.class);
    }

    public void removerDeOcorrencias(final InssSobreSalariosPagos inssSobreSalariosPagos, List<OcorrenciaDeInssSobreSalariosPagos> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<InssSobreSalariosPagos, OcorrenciaDeInssSobreSalariosPagos>(){

            @Override
            public InssSobreSalariosPagos getOwner() {
                return inssSobreSalariosPagos;
            }

            @Override
            public Collection<OcorrenciaDeInssSobreSalariosPagos> getCollection(InssSobreSalariosPagos attachadOwner) {
                return attachadOwner.getOcorrencias();
            }
        }, filhos, flush);
    }

    public void removerDeOcorrenciasAtualizacao(InssSobreSalariosPagos inssSobreSalariosPagos) {
        Query query = this.entityManager.createQuery("delete from OcorrenciaDeInssSobreSalariosPagosAtualizacao o where o.inssSobreSalariosPagos = :inssSobreSalariosPagos");
        query.setParameter("inssSobreSalariosPagos", (Object)inssSobreSalariosPagos);
        query.executeUpdate();
    }

    public List<OcorrenciaDeInssSobreSalariosPagosAtualizacao> obterOcorrenciasAtualizacaoNaoAmortizadasPor(InssSobreSalariosPagos inssSobreSalariosPagos, Date dataEvento) {
        String hql = "select o from OcorrenciaDeInssSobreSalariosPagosAtualizacao o where o.inssSobreSalariosPagos = :inssSobreSalariosPagos and o.dataEvento = :dataEvento and o.pago < o.total order by o.dataOcorrenciaInss, o.ocorrenciaDecimoTerceiro";
        Query query = this.entityManager.createQuery(hql);
        query.setParameter("inssSobreSalariosPagos", (Object)inssSobreSalariosPagos);
        query.setParameter("dataEvento", (Object)dataEvento);
        return query.getResultList();
    }

    public List<OcorrenciaDeInssSobreSalariosPagosAtualizacao> obterOcorrenciasAtualizacaoTodasPor(InssSobreSalariosPagos inssSobreSalariosPagos, Date dataEvento) {
        String hql = "select o from OcorrenciaDeInssSobreSalariosPagosAtualizacao o where o.inssSobreSalariosPagos = :inssSobreSalariosPagos and o.dataEvento = :dataEvento order by o.dataOcorrenciaInss, o.ocorrenciaDecimoTerceiro";
        Query query = this.entityManager.createQuery(hql);
        query.setParameter("inssSobreSalariosPagos", (Object)inssSobreSalariosPagos);
        query.setParameter("dataEvento", (Object)dataEvento);
        return query.getResultList();
    }
}

