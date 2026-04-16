/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.historicosalarial;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.AggregateCollection;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVinculoDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba;
import java.util.Collection;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeHistoricoSalarial")
public class RepositorioDeHistoricoSalarial
extends RepositorioBase<HistoricoSalarial> {
    public RepositorioDeHistoricoSalarial() {
        super(HistoricoSalarial.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<HistoricoSalarial> pesquisar(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(orderBy, clausulaWhere, parametros);
    }

    @Override
    public HistoricoSalarial obter(Object id) {
        return (HistoricoSalarial)super.obter(id);
    }

    public HistoricoSalarial removerDeOcorrencias(HistoricoSalarial historicoSalarial, OcorrenciaDoHistoricoSalarial ocorrencia) {
        OcorrenciaDoHistoricoSalarial oc = (OcorrenciaDoHistoricoSalarial)this.entityManager.find(OcorrenciaDoHistoricoSalarial.class, (Object)ocorrencia.getId());
        if (this.getSession().contains((Object)oc)) {
            this.getSession().delete((Object)oc);
            historicoSalarial.getOcorrencias().remove(oc);
        }
        return historicoSalarial;
    }

    public void removerDeOcorrencias(final HistoricoSalarial historicoSalarial, List<OcorrenciaDoHistoricoSalarial> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<HistoricoSalarial, OcorrenciaDoHistoricoSalarial>(){

            @Override
            public HistoricoSalarial getOwner() {
                return historicoSalarial;
            }

            @Override
            public Collection<OcorrenciaDoHistoricoSalarial> getCollection(HistoricoSalarial attachadOwner) {
                return attachadOwner.getOcorrencias();
            }
        }, filhos, flush);
    }

    public List<HistoricoSalarialDaVerba> obterHistoricosDaVerba(HistoricoSalarial historicoSalarial) {
        Query query = this.entityManager.createQuery("from HistoricoSalarialDaVerba where historicoSalarial.id = ? and tipoVinculoHistorico = ?");
        query.setParameter(1, (Object)historicoSalarial.getId());
        query.setParameter(2, (Object)TipoVinculoDeVerbaEnum.VALOR_PAGO);
        return query.getResultList();
    }

    public List<HistoricoSalarial> obterHistoricosDoCalculo(Calculo calculo) {
        Query query = this.entityManager.createQuery("from HistoricoSalarial where calculo.id = ? order by nome ");
        query.setParameter(1, (Object)calculo.getId());
        return query.getResultList();
    }
}

