/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaJornadaApuracaoCartao;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeOcorrenciaJornadaApuracaoCartao")
public class RepositorioDeOcorrenciaJornadaApuracaoCartao
extends RepositorioBase<OcorrenciaJornadaApuracaoCartao> {
    public RepositorioDeOcorrenciaJornadaApuracaoCartao() {
        super(OcorrenciaJornadaApuracaoCartao.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<OcorrenciaJornadaApuracaoCartao> pesquisar(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(orderBy, clausulaWhere, parametros);
    }

    @Override
    public OcorrenciaJornadaApuracaoCartao obter(Object id) {
        return (OcorrenciaJornadaApuracaoCartao)super.obter(id);
    }
}

