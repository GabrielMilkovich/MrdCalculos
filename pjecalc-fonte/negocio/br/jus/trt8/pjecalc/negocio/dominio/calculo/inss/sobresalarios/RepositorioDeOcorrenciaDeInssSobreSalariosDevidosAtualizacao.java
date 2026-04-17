/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInssAtualizacao;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaDeInssSobreSalariosDevidosAtualizacao")
public class RepositorioDeOcorrenciaDeInssSobreSalariosDevidosAtualizacao
extends RepositorioDeOcorrenciaDeInssAtualizacao<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> {
    public RepositorioDeOcorrenciaDeInssSobreSalariosDevidosAtualizacao() {
        super(OcorrenciaDeInssSobreSalariosDevidosAtualizacao.class);
    }

    @Override
    public void salvar(OcorrenciaDeInssSobreSalariosDevidosAtualizacao ocorrenciaAtualizacao) {
        this.salvar(ocorrenciaAtualizacao, true);
    }

    public List<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> getUltimasOcorrenciasNaoAmortizadas(InssSobreSalariosDevidos inssSobreSalariosDevidos) {
        String countHql = "SELECT count(o) FROM OcorrenciaDeInssSobreSalariosDevidosAtualizacao o WHERE o.inssSobreSalariosDevidos = :inssSobreSalariosDevidos";
        Query countQuery = this.entityManager.createQuery(countHql);
        countQuery.setParameter("inssSobreSalariosDevidos", (Object)inssSobreSalariosDevidos);
        Long quantidadeDeRegistros = (Long)countQuery.getSingleResult();
        if (quantidadeDeRegistros == 0L) {
            return null;
        }
        String hql = "SELECT o FROM OcorrenciaDeInssSobreSalariosDevidosAtualizacao o WHERE o.inssSobreSalariosDevidos = :inssSobreSalariosDevidos AND o.totalDiferenca > 0 AND o.dataEvento = (SELECT max(o2.dataEvento) FROM OcorrenciaDeInssSobreSalariosDevidosAtualizacao o2 WHERE o2.inssSobreSalariosDevidos = :inssSobreSalariosDevidos) order by o.dataEvento, o.dataOcorrenciaInss, o.dataInicioPeriodo";
        Query query = this.entityManager.createQuery(hql);
        query.setParameter("inssSobreSalariosDevidos", (Object)inssSobreSalariosDevidos);
        return query.getResultList();
    }
}

