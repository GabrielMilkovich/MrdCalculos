/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.SeguroDesemprego;
import java.util.Collection;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioSeguroDesemprego")
public class RepositorioSeguroDesemprego
extends RepositorioBase<SeguroDesemprego> {
    public RepositorioSeguroDesemprego() {
        super(SeguroDesemprego.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public void salvar(SeguroDesemprego entidade) {
        super.salvar(entidade, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((SeguroDesemprego)entity).getItensHistoricoSalarialDeSegudoDesemprego();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((SeguroDesemprego)entity).getItensSalarioDevidoDeSeguroDesemprego();
            }
        });
    }
}

