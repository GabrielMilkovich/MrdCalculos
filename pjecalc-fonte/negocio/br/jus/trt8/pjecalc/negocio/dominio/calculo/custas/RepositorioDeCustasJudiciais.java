/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.custas;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import java.util.Collection;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeCustasJudiciais")
public class RepositorioDeCustasJudiciais
extends RepositorioBase<CustasJudiciais> {
    public RepositorioDeCustasJudiciais() {
        super(CustasJudiciais.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    protected void remover(CustasJudiciais entidade) {
        entidade.setVersao(entidade.getVersao() + 1L);
        if (Utils.nulo(entidade.getId())) {
            return;
        }
        super.remover(CustasJudiciais.obter(entidade.getId()));
    }

    @Override
    public void salvar(CustasJudiciais entidade) {
        super.salvar(entidade, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((CustasJudiciais)entity).getAutosJudiciais();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((CustasJudiciais)entity).getArmazenamentos();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((CustasJudiciais)entity).getCustasPagasDoReclamado();
            }
        }, new OneToManyRemover(){

            @Override
            public Collection<?> getCollection(EntidadeBase entity) {
                return ((CustasJudiciais)entity).getCustasPagasDoReclamante();
            }
        });
    }
}

