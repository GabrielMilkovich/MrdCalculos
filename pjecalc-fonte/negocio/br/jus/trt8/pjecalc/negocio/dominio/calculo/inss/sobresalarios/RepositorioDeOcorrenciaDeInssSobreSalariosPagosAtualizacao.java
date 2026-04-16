/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInssAtualizacao;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaDeInssSobreSalariosPagosAtualizacao")
public class RepositorioDeOcorrenciaDeInssSobreSalariosPagosAtualizacao
extends RepositorioDeOcorrenciaDeInssAtualizacao<OcorrenciaDeInssSobreSalariosPagosAtualizacao> {
    public RepositorioDeOcorrenciaDeInssSobreSalariosPagosAtualizacao() {
        super(OcorrenciaDeInssSobreSalariosPagosAtualizacao.class);
    }

    @Override
    public void salvar(OcorrenciaDeInssSobreSalariosPagosAtualizacao ocorrenciaAtualizacao) {
        this.salvar(ocorrenciaAtualizacao, true);
    }

    public List<OcorrenciaDeInssSobreSalariosPagosAtualizacao> getUltimasOcorrenciasNaoAmortizadas(InssSobreSalariosPagos inssSobreSalariosPagos) {
        String countHql = "SELECT count(o) FROM OcorrenciaDeInssSobreSalariosPagosAtualizacao o WHERE o.inssSobreSalariosPagos = :inssSobreSalariosPagos";
        Query countQuery = this.entityManager.createQuery(countHql);
        countQuery.setParameter("inssSobreSalariosPagos", (Object)inssSobreSalariosPagos);
        Long quantidadeDeRegistros = (Long)countQuery.getSingleResult();
        if (quantidadeDeRegistros == 0L) {
            return null;
        }
        String hql = "SELECT o FROM OcorrenciaDeInssSobreSalariosPagosAtualizacao o WHERE o.inssSobreSalariosPagos = :inssSobreSalariosPagos AND o.totalDiferenca > 0 AND o.dataEvento = (SELECT max(o2.dataEvento) FROM OcorrenciaDeInssSobreSalariosPagosAtualizacao o2 WHERE o2.inssSobreSalariosPagos = :inssSobreSalariosPagos) order by o.dataEvento, o.dataOcorrenciaInss, o.dataInicioPeriodo";
        Query query = this.entityManager.createQuery(hql);
        query.setParameter("inssSobreSalariosPagos", (Object)inssSobreSalariosPagos);
        return query.getResultList();
    }
}

