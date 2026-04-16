/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.lang.builder.HashCodeBuilder
 *  org.hibernate.Criteria
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.loginfra;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.FiltroPaginado;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.loginfra.LogInfra;
import br.jus.trt8.pjecalc.negocio.dominio.loginfra.RepositorioDeLogInfra;
import java.io.Serializable;
import java.util.Date;
import java.util.List;
import org.apache.commons.lang.builder.HashCodeBuilder;
import org.hibernate.Criteria;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDeLogInfra")
public class FiltroDeLogInfra
extends FiltroPaginado<LogInfra>
implements Serializable {
    private static final long serialVersionUID = 3412527005226210997L;
    private Long id;
    private Date ocorrencia;
    private String usuario;
    private long pesquisaHash = -1L;
    private int total = 0;

    public FiltroDeLogInfra() {
        super(RepositorioDeLogInfra.class);
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
    }

    @Override
    public List<LogInfra> filtrar(int firstResult) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        if (Utils.naoNulo(this.id)) {
            criterios.adicionarCriterio("and", "id = ?", this.id);
        }
        if (Utils.naoNulo(this.ocorrencia)) {
            criterios.adicionarCriterio("and", "trunc(ocorrencia) = trunc(?)", this.ocorrencia);
        }
        if (Utils.naoVazio(this.usuario)) {
            String cpf = this.usuario.length() > 11 ? this.usuario.toLowerCase().substring(0, 11) : this.usuario.toLowerCase();
            criterios.adicionarCriterio("and", "cpf = ?", cpf);
        }
        return this.pesquisar(criterios, firstResult, criterios.getClausulaWhere().toString());
    }

    @Override
    public List<LogInfra> filtrar() {
        return this.filtrar(0);
    }

    private List<LogInfra> pesquisar(CriteriosDePesquisa criterios, int firstResult, String clausulaWhere) {
        if ((long)(clausulaWhere.hashCode() + this.hashCode()) != this.pesquisaHash) {
            this.total = (int)((RepositorioDeLogInfra)this.getRepositorio()).obterQuantidade(criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
            this.pesquisaHash = clausulaWhere.hashCode() + this.hashCode();
        }
        return ((RepositorioDeLogInfra)this.getRepositorio()).pesquisar(firstResult, 10, criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    @Override
    public int getTotal() {
        return this.total;
    }

    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Date getOcorrencia() {
        return this.ocorrencia;
    }

    public void setOcorrencia(Date ocorrencia) {
        this.ocorrencia = ocorrencia;
    }

    public String getUsuario() {
        return this.usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    @Override
    public void reset() {
        this.pesquisaHash = -1L;
    }

    public int hashCode() {
        return new HashCodeBuilder(1, 31).append((Object)this.id).append((Object)this.ocorrencia).append((Object)this.usuario).hashCode();
    }

    public boolean equals(Object obj) {
        return super.equals(obj);
    }
}

