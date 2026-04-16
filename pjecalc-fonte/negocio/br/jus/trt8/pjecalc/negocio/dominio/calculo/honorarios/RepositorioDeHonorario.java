/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDoPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.util.List;
import javax.persistence.Query;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeHonorario")
public class RepositorioDeHonorario
extends RepositorioBase<Honorario> {
    private static final String CAMPO_ORIGEM = "origem";
    private static final String CAMPO_CALCULO = "calculo";

    public RepositorioDeHonorario() {
        super(Honorario.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<Honorario> pesquisar(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(orderBy, clausulaWhere, parametros);
    }

    public List<Honorario> obterTodosPor(Calculo calculo) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id");
        if (calculo != null && calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", calculo);
        }
        List<Honorario> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }

    public List<Honorario> obterTodosParaAtualizacao(Calculo calculo) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        if (calculo != null && calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", calculo);
            criterios.adicionarCriterio("and", "origemRegistro = ?", new Object[]{TipoOrigemRegistroEnum.ATUALIZACAO});
        }
        List<Honorario> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }

    public List<Honorario> obterTodosParaCalculo(Calculo calculo) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        if (calculo != null && calculo.getId() != null) {
            criterios.adicionarCriterio("and", "calculo = ?", calculo);
            criterios.adicionarCriterio("and", "origemRegistro = ?", new Object[]{TipoOrigemRegistroEnum.CALCULO});
        }
        List<Honorario> lista = this.obterTodosPorCriterio(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
        return lista;
    }

    private List<HonorarioDaAtualizacao> obterTodosHonorariosDaAtualizacaoDo(Honorario honorario) {
        Query query = this.entityManager.createQuery("from HonorarioDaAtualizacao where honorario.id = ?");
        query.setParameter(1, (Object)honorario.getId());
        return query.getResultList();
    }

    public void removerHonorariosDaAtualizacao(Honorario honorario) {
        for (HonorarioDaAtualizacao honorarioDaAtualizacao : this.obterTodosHonorariosDaAtualizacaoDo(honorario)) {
            this.getSession().delete((Object)honorarioDaAtualizacao);
        }
    }

    public void removerVerbasNaoCompoemPrincipalAPartirDaVerba(VerbaDeCalculo verbaDeCalculo) {
        Query query = this.entityManager.createQuery("DELETE FROM HonorarioVerbaDeCalculo WHERE verbaDeCalculo = :verbaDeCalculo");
        query.setParameter("verbaDeCalculo", (Object)verbaDeCalculo);
        query.executeUpdate();
    }

    public void removerVerbasNaoCompoemPrincipalAPartirDoHonorario(Honorario honorario) {
        Query query = this.entityManager.createQuery("DELETE FROM HonorarioVerbaDeCalculo WHERE honorario = :honorario");
        query.setParameter("honorario", (Object)honorario);
        query.executeUpdate();
    }

    public void removerHonorariosDoCalculo(Calculo calculo) {
        String q1 = "DELETE FROM HonorarioDaAtualizacao ha WHERE ha.honorario.id IN (SELECT h.id FROM Honorario h WHERE h.calculo = :calculo AND h.origemRegistro = :origem)";
        String q2 = "DELETE FROM HonorarioDoPagamento hp WHERE hp.honorario.id IN (SELECT h.id FROM Honorario h WHERE h.calculo = :calculo AND h.origemRegistro = :origem)";
        String q3 = "UPDATE ParcelasAtualizaveisHonorario pah SET pah.honorario.id = null WHERE pah.honorario.id IN (SELECT h.id FROM Honorario h WHERE h.calculo = :calculo AND h.origemRegistro = :origem)";
        String q4 = "DELETE FROM Honorario h WHERE h.calculo = :calculo AND h.origemRegistro = :origem";
        this.entityManager.createQuery(q1).setParameter(CAMPO_CALCULO, (Object)calculo).setParameter(CAMPO_ORIGEM, (Object)TipoOrigemRegistroEnum.CALCULO).executeUpdate();
        this.entityManager.createQuery(q2).setParameter(CAMPO_CALCULO, (Object)calculo).setParameter(CAMPO_ORIGEM, (Object)TipoOrigemRegistroEnum.CALCULO).executeUpdate();
        this.entityManager.createQuery(q3).setParameter(CAMPO_CALCULO, (Object)calculo).setParameter(CAMPO_ORIGEM, (Object)TipoOrigemRegistroEnum.CALCULO).executeUpdate();
        this.entityManager.createQuery(q4).setParameter(CAMPO_CALCULO, (Object)calculo).setParameter(CAMPO_ORIGEM, (Object)TipoOrigemRegistroEnum.CALCULO).executeUpdate();
    }

    @Override
    public void salvar(List<Honorario> honorarios) {
        for (Honorario honorario : honorarios) {
            this.salvar(honorario);
        }
    }

    public List<HonorarioDoPagamento> obterPagamentosDo(Honorario honorario) {
        Query query = this.entityManager.createQuery("from HonorarioDoPagamento where honorario.id = ?");
        query.setParameter(1, (Object)honorario.getId());
        return query.getResultList();
    }
}

