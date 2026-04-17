/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.custas;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.AutoJudicial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.custas.ParametrosDeCustasFixas;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeAutoJudicial")
public class RepositorioDeAutoJudicial
extends RepositorioBase<AutoJudicial> {
    public RepositorioDeAutoJudicial() {
        super(AutoJudicial.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<AutoJudicial> obterTodosPor(CustasJudiciais custasJudiciais) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("dataVencimentoAuto asc");
        if (custasJudiciais != null && custasJudiciais.getId() != null) {
            criterios.adicionarCriterio("and", "custasJudiciais = ?", custasJudiciais);
        }
        List<AutoJudicial> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }

    public Set<AutoJudicial> atualizarValoresTransientes(Set<AutoJudicial> autosJudiciais) {
        ParametrosDeCustasFixas parametros = null;
        for (AutoJudicial autoJudicial : autosJudiciais) {
            if (Utils.nulo(parametros)) {
                parametros = ParametrosDeCustasFixas.obterPorData(autoJudicial.getDataVencimentoAuto());
            } else if (!parametros.isDataContidaNaVigencia(autoJudicial.getDataVencimentoAuto())) {
                parametros = ParametrosDeCustasFixas.obterPorData(autoJudicial.getDataVencimentoAuto());
            }
            if (!Utils.naoNulo(parametros)) continue;
            BigDecimal teto = parametros.getValorTetoCustasDeAutos();
            autoJudicial.setValorTetoTransiente(teto);
            BigDecimal valorCusta = Utils.arredondarValorMonetario(autoJudicial.getValorAvaliacaoAuto().multiply(new BigDecimal("0.05"), Utils.CONTEXTO_MATEMATICO));
            if (teto.compareTo(valorCusta) > 0) {
                autoJudicial.setValorCustasAutoTransiente(valorCusta);
                continue;
            }
            autoJudicial.setValorCustasAutoTransiente(teto);
        }
        return autosJudiciais;
    }
}

