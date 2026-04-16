/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros.selicirpf;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.juros.selicirpf.JurosSelicIrpf;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeJurosSelicIrpf")
public class RepositorioDeJurosSelicIrpf
extends RepositorioBase<JurosSelicIrpf> {
    public RepositorioDeJurosSelicIrpf() {
        super(JurosSelicIrpf.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    @Override
    public List<JurosSelicIrpf> obterTodos() {
        Query query = this.entityManager.createQuery("from JurosSelicIrpf order by competencia desc");
        List lista = query.getResultList();
        JurosSelicIrpf jurosAnterior = null;
        for (JurosSelicIrpf jurosSelicIrpf : lista) {
            if (Utils.nulo(jurosAnterior)) {
                jurosSelicIrpf.setTaxaAcumulada(jurosSelicIrpf.getTaxa());
            } else {
                jurosSelicIrpf.setTaxaAcumulada(jurosSelicIrpf.getTaxa().add(jurosAnterior.getTaxaAcumulada(), Utils.CONTEXTO_MATEMATICO));
            }
            jurosAnterior = jurosSelicIrpf;
        }
        return lista;
    }

    public List<JurosSelicIrpf> obterTodosPorPeriodo(Date dataInicio, Date dataFim) {
        return super.obterTodosPorCriterio("competencia desc", "competencia>=? and competencia<=?", dataInicio, dataFim);
    }

    public List<JurosSelicIrpf> obterTabelaParaJurosMora(Date dataInicio, Date dataFim) {
        return super.obterTodosPorCriterio("competenciaReferencia", "competenciaReferencia>=? and competenciaReferencia<=?", HelperDate.getCurrentCompetence(dataInicio).getDate(), HelperDate.getCurrentCompetence(dataFim).getDate());
    }

    public List<JurosSelicIrpf> obterTabelaParaCorrecao(Periodo periodo) {
        return super.obterTodosPorCriterio("competenciaReferencia desc", "competenciaReferencia>=? and competenciaReferencia<=?", HelperDate.getCurrentCompetence(periodo.getInicial()).getDate(), periodo.getFinal());
    }
}

