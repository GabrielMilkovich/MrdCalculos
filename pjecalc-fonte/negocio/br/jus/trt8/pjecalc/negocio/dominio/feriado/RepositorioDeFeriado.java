/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Query
 *  org.jboss.seam.annotations.In
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.feriado;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.OneToManyRemover;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.constantes.AbrangenciaDoFeriadoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoFeriadoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ItemPontoFacultativo;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.Feriado;
import br.jus.trt8.pjecalc.negocio.dominio.municipio.Municipio;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.util.Collection;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.persistence.Query;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;

@Name(value="repositorioDeFeriado")
public class RepositorioDeFeriado
extends RepositorioBase<Feriado>
implements br.jus.trt8.pjecalc.base.comum.Feriado {
    private Calculo calculo;
    private Map<Integer, Object> parametros;
    private StringBuilder sql;
    private Query query;
    private int chave;
    @In
    private ServicoDeCalculo servicoDeCalculo;

    public RepositorioDeFeriado() {
        super(Feriado.class);
    }

    @Override
    public TratadorDeExcecao obterTratadorDeExcecao() {
        return TratadorDeExcecaoImpl.instance();
    }

    public List<Feriado> pesquisar(String orderBy, String clausulaWhere, Object ... parametros) {
        return super.obterTodosPorCriterio(orderBy, clausulaWhere, parametros);
    }

    @Override
    public Feriado obter(Object id) {
        return (Feriado)super.obter(id);
    }

    @Override
    public void salvar(Feriado entidade) {
        super.salvar(entidade, new OneToManyRemover(){

            public Collection<? extends EntidadeBase> getCollection(EntidadeBase entity) {
                return ((Feriado)entity).getExcecoesDoFeriado();
            }
        });
    }

    public List<Feriado> obterPontosFacultativos(Municipio municipio) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("nomeFeriado desc");
        criterios.adicionarCriterio("and", "tipo = ?", new Object[]{TipoFeriadoEnum.PONTO_FACULTATIVO});
        if (municipio != null) {
            criterios.adicionarCriterio("and", "( municipio = ? or municipio = null )", municipio);
        }
        if (municipio != null && municipio.getEstado() != null) {
            criterios.adicionarCriterio("and", " (estado = ? or estado = null )", municipio.getEstado());
        }
        return this.pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    public Feriado obterPorUid(String uid) {
        return (Feriado)super.obterEntidadeBase("from Feriado f where f.uid = ?", uid);
    }

    @Override
    public boolean buscarFeriado(Date data) {
        this.calculo = this.servicoDeCalculo.obterCalculoAberto();
        if (Utils.nulo(this.calculo)) {
            return false;
        }
        this.chave = 1;
        this.parametros = new LinkedHashMap<Integer, Object>();
        this.sql = new StringBuilder("select f.nomeFeriado from Feriado f where ");
        this.sql.append(" (( f.abrangencia in (?");
        this.parametros.put(this.chave++, (Object)AbrangenciaDoFeriadoEnum.FEDERAL);
        if (this.calculo.getConsideraFeriadoEstadual().booleanValue()) {
            this.sql.append(",?");
            this.parametros.put(this.chave++, (Object)AbrangenciaDoFeriadoEnum.ESTADUAL);
        }
        if (this.calculo.getConsideraFeriadoMunicipal().booleanValue()) {
            this.sql.append(",?");
            this.parametros.put(this.chave++, (Object)AbrangenciaDoFeriadoEnum.MUNICIPAL);
        }
        this.sql.append(") and (f.estado is null or f.estado = ?)");
        this.parametros.put(this.chave++, this.calculo.getEstado());
        this.sql.append(" and (f.municipio is null or f.municipio = ?)");
        this.parametros.put(this.chave++, this.calculo.getMunicipio());
        this.sql.append(" and f.tipo = 'F')");
        if (!this.calculo.getPontosFacultativos().isEmpty()) {
            this.sql.append(" or (f.tipo = 'P' and f.id in (");
            for (ItemPontoFacultativo ponto : this.calculo.getPontosFacultativos()) {
                this.sql.append("?,");
                this.parametros.put(this.chave++, ponto.getPontoFacultativo().getId());
            }
            this.sql.deleteCharAt(this.sql.length() - 1);
            this.sql.append(")))");
        } else {
            this.sql.append(')');
        }
        this.montarQueryParaData(data, this.chave, this.parametros, this.sql);
        this.query = this.entityManager.createQuery(this.sql.toString());
        for (Integer indice : this.parametros.keySet()) {
            this.query.setParameter(indice.intValue(), this.parametros.get(indice));
        }
        return !this.query.getResultList().isEmpty();
    }

    @Override
    public boolean buscarFeriadoFederal(Date data) {
        this.chave = 1;
        this.parametros = new LinkedHashMap<Integer, Object>();
        this.sql = new StringBuilder("select f.nomeFeriado from Feriado f where ");
        this.sql.append(" f.abrangencia in (?) ");
        this.parametros.put(this.chave++, (Object)AbrangenciaDoFeriadoEnum.FEDERAL);
        this.montarQueryParaData(data, this.chave, this.parametros, this.sql);
        this.query = this.entityManager.createQuery(this.sql.toString());
        for (Integer indice : this.parametros.keySet()) {
            this.query.setParameter(indice.intValue(), this.parametros.get(indice));
        }
        return !this.query.getResultList().isEmpty();
    }

    private void montarQueryParaData(Date data, Integer chv, Map<Integer, Object> params, StringBuilder sqls) {
        sqls.append(" and ((f.movel = 'S' and exists (select e.id from ExcecaoDoFeriado e WHERE e.feriado.id = f.id and e.data = ?)) ");
        Integer n = chv;
        Integer n2 = chv = Integer.valueOf(chv + 1);
        params.put(n, data);
        sqls.append(" or (f.movel = 'N' and day(f.data) = day(?) and month(f.data) = month(?) and not exists (select e.id from ExcecaoDoFeriado e WHERE e.feriado.id = f.id and e.data = ?))) ");
        n = chv;
        n2 = chv = Integer.valueOf(chv + 1);
        params.put(n, data);
        n = chv;
        n2 = chv = Integer.valueOf(chv + 1);
        params.put(n, data);
        n = chv;
        n2 = chv = Integer.valueOf(chv + 1);
        params.put(n, data);
        sqls.append(" and f.inicioVigencia <= ? and (f.fimVigencia is null or f.fimVigencia >= ?)))");
        n = chv;
        n2 = chv = Integer.valueOf(chv + 1);
        params.put(n, data);
        n = chv;
        n2 = chv = Integer.valueOf(chv + 1);
        params.put(n, data);
    }
}

