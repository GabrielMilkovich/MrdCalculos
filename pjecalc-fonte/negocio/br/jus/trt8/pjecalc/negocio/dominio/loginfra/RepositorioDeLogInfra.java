/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.loginfra;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.loginfra.LogInfra;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeLogInfra")
public class RepositorioDeLogInfra
extends RepositorioBase<LogInfra> {
    public RepositorioDeLogInfra() {
        super(LogInfra.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<LogInfra> pesquisar(int firstResult, int maxResult, String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(firstResult, maxResult, orderBy, clausulaWhere, parametros);
    }

    @Override
    public long obterQuantidade(String clausulaWhere, Object ... parametros) {
        return super.obterQuantidade(clausulaWhere, parametros);
    }
}

