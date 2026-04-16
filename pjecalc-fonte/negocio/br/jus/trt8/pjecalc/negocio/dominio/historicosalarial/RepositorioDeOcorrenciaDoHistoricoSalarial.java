/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.historicosalarial;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaDoHistoricoSalarial")
public class RepositorioDeOcorrenciaDoHistoricoSalarial
extends RepositorioBase<OcorrenciaDoHistoricoSalarial> {
    public RepositorioDeOcorrenciaDoHistoricoSalarial() {
        super(OcorrenciaDoHistoricoSalarial.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<OcorrenciaDoHistoricoSalarial> obterOcorrenciasPorCompetencia(HistoricoSalarial historicoSalarial, Date competencia) {
        Query query = this.entityManager.createQuery("from OcorrenciaDoHistoricoSalarial where historicoSalarial =? and dataOcorrencia = ?");
        query.setParameter(1, (Object)historicoSalarial);
        query.setParameter(2, (Object)competencia);
        return query.getResultList();
    }
}

