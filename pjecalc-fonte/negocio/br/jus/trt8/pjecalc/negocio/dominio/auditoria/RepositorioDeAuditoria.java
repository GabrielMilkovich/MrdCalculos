/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.auditoria;

import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeAcaoDeAuditoriaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.auditoria.Auditoria;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import java.util.List;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeAuditoria")
public class RepositorioDeAuditoria
extends RepositorioBase<Auditoria> {
    public RepositorioDeAuditoria() {
        super(Auditoria.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<Auditoria> pesquisar(int firstResult, int maxResult, String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(firstResult, maxResult, orderBy, clausulaWhere, parametros);
    }

    @Override
    public long obterQuantidade(String clausulaWhere, Object ... parametros) {
        return super.obterQuantidade(clausulaWhere, parametros);
    }

    public Auditoria encontrarUltimoRegistroLiquidacaoDeUm(Calculo calculo, TipoDeAcaoDeAuditoriaEnum tipoAcaoAuditoria) {
        List auditorias = super.obterTodosPorCriterio(0, 1, "dataEvento desc", "tipoAcao = ? and idCalculo = ?", new Object[]{tipoAcaoAuditoria, calculo.getId()});
        if (auditorias != null && !auditorias.isEmpty()) {
            return (Auditoria)auditorias.get(0);
        }
        return null;
    }
}

