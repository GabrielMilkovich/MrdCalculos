/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.multa;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.MultaDoPagamento;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeMulta")
public class RepositorioDeMulta
extends RepositorioBase<Multa> {
    private static final String CLAUSULA_WHERE_CALCULO = "calculo = ?";
    private static final String CAMPO_ORIGEM = "origem";
    private static final String CAMPO_CALCULO = "calculo";

    public RepositorioDeMulta() {
        super(Multa.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<Multa> pesquisar(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(orderBy, clausulaWhere, parametros);
    }

    public List<Multa> obterTodosPor(Calculo calculo) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id");
        if (calculo != null && calculo.getId() != null) {
            criterios.adicionarCriterio("and", CLAUSULA_WHERE_CALCULO, calculo);
        }
        List<Multa> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }

    public List<Multa> obterTodosParaAtualizacao(Calculo calculo) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        if (calculo != null && calculo.getId() != null) {
            criterios.adicionarCriterio("and", CLAUSULA_WHERE_CALCULO, calculo);
            criterios.adicionarCriterio("and", "origemRegistro = ?", new Object[]{TipoOrigemRegistroEnum.ATUALIZACAO});
        }
        List<Multa> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }

    public List<Multa> obterTodosParaCalculo(Calculo calculo) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        if (calculo != null && calculo.getId() != null) {
            criterios.adicionarCriterio("and", CLAUSULA_WHERE_CALCULO, calculo);
            criterios.adicionarCriterio("and", "origemRegistro = ?", new Object[]{TipoOrigemRegistroEnum.CALCULO});
        }
        List<Multa> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }

    private List<MultaDaAtualizacao> obterTodasMultasDaAtualizacaoDa(Multa multa) {
        Query query = this.entityManager.createQuery("from MultaDaAtualizacao where multa.id = ?");
        query.setParameter(1, (Object)multa.getId());
        return query.getResultList();
    }

    public void removerMultasDaAtualizacao(Multa multa) {
        for (MultaDaAtualizacao multaDaAtualizacao : this.obterTodasMultasDaAtualizacaoDa(multa)) {
            this.getSession().delete((Object)multaDaAtualizacao);
        }
    }

    public void removerMultasDoCalculo(Calculo calculo) {
        String q1 = "DELETE FROM MultaDaAtualizacao ma WHERE ma.multa.id IN (SELECT m.id FROM Multa m WHERE m.calculo = :calculo AND m.origemRegistro = :origem)";
        String q2 = "DELETE FROM MultaDoPagamento mp WHERE mp.multa.id IN (SELECT m.id FROM Multa m WHERE m.calculo = :calculo AND m.origemRegistro = :origem)";
        String q3 = "UPDATE ParcelasAtualizaveisMultaIndenizacao pam SET pam.multa.id = null WHERE pam.multa.id IN (SELECT m.id FROM Multa m WHERE m.calculo = :calculo AND m.origemRegistro = :origem)";
        String q4 = "DELETE FROM Multa m WHERE m.calculo = :calculo AND m.origemRegistro = :origem";
        this.entityManager.createQuery(q1).setParameter(CAMPO_CALCULO, (Object)calculo).setParameter(CAMPO_ORIGEM, (Object)TipoOrigemRegistroEnum.CALCULO).executeUpdate();
        this.entityManager.createQuery(q2).setParameter(CAMPO_CALCULO, (Object)calculo).setParameter(CAMPO_ORIGEM, (Object)TipoOrigemRegistroEnum.CALCULO).executeUpdate();
        this.entityManager.createQuery(q3).setParameter(CAMPO_CALCULO, (Object)calculo).setParameter(CAMPO_ORIGEM, (Object)TipoOrigemRegistroEnum.CALCULO).executeUpdate();
        this.entityManager.createQuery(q4).setParameter(CAMPO_CALCULO, (Object)calculo).setParameter(CAMPO_ORIGEM, (Object)TipoOrigemRegistroEnum.CALCULO).executeUpdate();
    }

    public List<MultaDoPagamento> obterPagamentosDa(Multa multa) {
        Query query = this.entityManager.createQuery("from MultaDoPagamento where multa.id = ?");
        query.setParameter(1, (Object)multa.getId());
        return query.getResultList();
    }
}

