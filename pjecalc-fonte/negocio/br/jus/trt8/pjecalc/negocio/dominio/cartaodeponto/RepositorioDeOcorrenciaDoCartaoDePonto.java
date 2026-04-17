/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaDoCartaoDePonto;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaDoCartaoDePonto")
public class RepositorioDeOcorrenciaDoCartaoDePonto
extends RepositorioBase<OcorrenciaDoCartaoDePonto> {
    public RepositorioDeOcorrenciaDoCartaoDePonto() {
        super(OcorrenciaDoCartaoDePonto.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<OcorrenciaDoCartaoDePonto> obterOcorrenciasPorCompetencia(CartaoDePonto cartaoDePonto, Date competencia) {
        Query query = this.entityManager.createQuery("from OcorrenciaDoCartaoDePonto where cartaodeponto =? and dataOcorrencia = ?");
        query.setParameter(1, (Object)cartaoDePonto);
        query.setParameter(2, (Object)competencia);
        return query.getResultList();
    }

    public List<OcorrenciaDoCartaoDePonto> obterOcorrencias(CartaoDePonto cartaoDePonto) {
        Query query = this.entityManager.createQuery("from OcorrenciaDoCartaoDePonto where cartaoDePonto.id =?");
        query.setParameter(1, (Object)cartaoDePonto.getId());
        return query.getResultList();
    }
}

