/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.AggregateCollection;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpf;
import java.util.Collection;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeIrpf")
public class RepositorioDeIrpf
extends RepositorioBase<Irpf> {
    public RepositorioDeIrpf() {
        super(Irpf.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public void removerDeOcorrencias(final Irpf irpf, List<OcorrenciaDeIrpf> filhos, boolean flush) {
        this.removerDe(new AggregateCollection<Irpf, OcorrenciaDeIrpf>(){

            @Override
            public Irpf getOwner() {
                return irpf;
            }

            @Override
            public Collection<OcorrenciaDeIrpf> getCollection(Irpf attachadOwner) {
                return attachadOwner.getOcorrencias();
            }
        }, filhos, flush);
    }
}

