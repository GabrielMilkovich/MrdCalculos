/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.AggregateCollection;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.OcorrenciaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.PrevidenciaPrivada;
import java.util.Collection;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDePrevidenciaPrivada")
public class RepositorioDePrevidenciaPrivada
extends RepositorioBase<PrevidenciaPrivada> {
    public RepositorioDePrevidenciaPrivada() {
        super(PrevidenciaPrivada.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public void salvar(PrevidenciaPrivada entidade) {
        super.salvar(entidade, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((PrevidenciaPrivada)entity).getAliquotas();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((PrevidenciaPrivada)entity).getOcorrencias();
            }
        });
    }

    public void removerDeOcorrencias(final PrevidenciaPrivada previdenciaPrivada, List<OcorrenciaDePrevidenciaPrivada> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<PrevidenciaPrivada, OcorrenciaDePrevidenciaPrivada>(){

            @Override
            public PrevidenciaPrivada getOwner() {
                return previdenciaPrivada;
            }

            @Override
            public Collection<OcorrenciaDePrevidenciaPrivada> getCollection(PrevidenciaPrivada attachadOwner) {
                return attachadOwner.getOcorrencias();
            }
        }, filhos, flush);
    }
}

