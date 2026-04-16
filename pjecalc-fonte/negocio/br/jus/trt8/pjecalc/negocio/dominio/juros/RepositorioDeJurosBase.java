/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.juros.JurosBase;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;

public abstract class RepositorioDeJurosBase<T extends JurosBase>
extends RepositorioBase<T> {
    private Class<T> clazz;

    public RepositorioDeJurosBase(Class<T> clazz) {
        super(clazz);
        this.clazz = clazz;
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public List<T> obterTodos() {
        Query query = this.entityManager.createQuery("from " + this.clazz.getSimpleName() + " order by dataInicio desc");
        return query.getResultList();
    }

    public void salvarNovoRegistro(JurosBase juros) {
        JurosBase registroAtual = this.obterRegistroAtual();
        if (Utils.naoNulo(registroAtual)) {
            HelperDate dataFim = HelperDate.getInstance(juros.getDataInicio());
            dataFim.addDay(-1);
            registroAtual.setDataFim(dataFim.getDate());
            registroAtual.salvar();
        }
        juros.salvar();
    }

    @Override
    protected void remover(T entidade) {
        super.remover(entidade);
        List<T> lista = this.obterTodos();
        if (!lista.isEmpty()) {
            JurosBase jurosBase = (JurosBase)lista.get(0);
            jurosBase.setDataFim(null);
            jurosBase.salvar();
        }
    }

    private JurosBase obterRegistroAtual() {
        return (JurosBase)this.obterEntidadeBase("from " + this.clazz.getSimpleName() + " where dataFim is null", new Object[0]);
    }

    public List<? extends JurosBase> obterPeriodoDeJurosBase(Date dataInicio, Date dataFim) {
        return super.obterTodosPorCriterio("dataInicio", "(dataInicio <= ? and dataFim >= ?) or (dataInicio >= ? and dataFim <= ?) or (dataInicio <= ? and dataFim >= ?) or (dataFim is null and dataInicio <= ?)", dataInicio, dataInicio, dataInicio, dataFim, dataFim, dataFim, dataFim);
    }
}

