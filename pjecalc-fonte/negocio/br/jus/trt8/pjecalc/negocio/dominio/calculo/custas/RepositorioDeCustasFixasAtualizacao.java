/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.custas;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasFixasAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import java.util.Date;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeCustasFixasAtualizacao")
public class RepositorioDeCustasFixasAtualizacao
extends RepositorioBase<CustasFixasAtualizacao> {
    public RepositorioDeCustasFixasAtualizacao() {
        super(CustasFixasAtualizacao.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    protected void remover(CustasFixasAtualizacao entidade) {
        entidade.setVersao(entidade.getVersao() + 1L);
        if (Utils.nulo(entidade.getId())) {
            return;
        }
        super.remover(CustasFixasAtualizacao.obter(entidade.getId()));
    }

    protected CustasFixasAtualizacao obterPor(CustasJudiciais registro, Date dataEvento) {
        return (CustasFixasAtualizacao)this.obterPorCriterio("custasJudiciais = ? and dataEvento = ?", registro, dataEvento);
    }

    public List<CustasFixasAtualizacao> obterPor(CustasJudiciais registro) {
        return this.obterTodosPorCriterio("dataEvento DESC", "custasJudiciais = ?", registro);
    }

    public void removerPor(CustasJudiciais registro) {
        this.entityManager.createQuery("delete from CustasFixasAtualizacao where custasJudiciais = :custasJudiciais").setParameter("custasJudiciais", (Object)registro).executeUpdate();
    }
}

