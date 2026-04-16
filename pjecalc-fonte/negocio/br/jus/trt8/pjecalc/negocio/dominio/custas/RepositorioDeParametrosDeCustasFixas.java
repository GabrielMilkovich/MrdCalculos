/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.custas;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.custas.ParametrosDeCustasFixas;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeParametrosDeCustasFixas")
public class RepositorioDeParametrosDeCustasFixas
extends RepositorioBase<ParametrosDeCustasFixas> {
    public RepositorioDeParametrosDeCustasFixas() {
        super(ParametrosDeCustasFixas.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public List<ParametrosDeCustasFixas> obterTodos() {
        Query query = this.entityManager.createQuery("from ParametrosDeCustasFixas order by dataInicio desc");
        List lista = query.getResultList();
        return lista;
    }

    public void salvarNovoRegistro(ParametrosDeCustasFixas entidade) {
        ParametrosDeCustasFixas registroAtual = this.obterRegistroAtual();
        if (Utils.naoNulo(registroAtual)) {
            HelperDate dataFim = HelperDate.getInstance(entidade.getDataInicio());
            dataFim.addDay(-1);
            registroAtual.setDataFim(dataFim.getDate());
            registroAtual.salvar();
        }
        entidade.salvar();
    }

    @Override
    protected void remover(ParametrosDeCustasFixas entidade) {
        super.remover(entidade);
        List<ParametrosDeCustasFixas> lista = this.obterTodos();
        if (!lista.isEmpty()) {
            ParametrosDeCustasFixas param = lista.get(0);
            param.setDataFim(null);
            param.salvar();
        }
    }

    private ParametrosDeCustasFixas obterRegistroAtual() {
        return (ParametrosDeCustasFixas)this.obterEntidadeBase("from ParametrosDeCustasFixas where dataFim is null", new Object[0]);
    }

    public ParametrosDeCustasFixas obterRegistroMaisAntigo() {
        return (ParametrosDeCustasFixas)this.obterEntidadeBase("from ParametrosDeCustasFixas where dataInicio =  (select min(dataInicio) from ParametrosDeCustasFixas)", new Object[0]);
    }

    public ParametrosDeCustasFixas obterPorData(Date data) {
        return (ParametrosDeCustasFixas)this.obterEntidadeBase("from ParametrosDeCustasFixas where ( ? between dataInicio and dataFim) or (? >= dataInicio and dataFim is null)", data, data);
    }
}

