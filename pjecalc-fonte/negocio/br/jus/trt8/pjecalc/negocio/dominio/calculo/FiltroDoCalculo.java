/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.lang.StringUtils
 *  org.apache.commons.lang.builder.HashCodeBuilder
 *  org.hibernate.Criteria
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.security.Identity
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.FiltroPaginado;
import br.jus.trt8.pjecalc.negocio.comum.api.Identidade;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCalculoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.RepositorioDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Setor;
import java.io.Serializable;
import java.util.List;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang.builder.HashCodeBuilder;
import org.hibernate.Criteria;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.security.Identity;

@Name(value="filtroDoCalculo")
public class FiltroDoCalculo
extends FiltroPaginado<Calculo>
implements Serializable {
    private static final long serialVersionUID = -6747670721085423305L;
    private TipoCalculoEnum tipoCalculo;
    private Integer numeroProcesso;
    private Integer digitoProcesso;
    private Integer anoProcesso;
    private Integer justica;
    private Integer regiao;
    private Integer varaProcesso;
    private String reclamante;
    private String reclamado;
    private String numeroDocumentoFiscalReclamado;
    private Long numeroCalculo;
    private Setor setor;
    private Boolean meuSetor;
    private long pesquisaHash = -1L;
    private int total = 0;

    public FiltroDoCalculo() {
        super(RepositorioDeCalculo.class);
    }

    private List<Calculo> pesquisar(CriteriosDePesquisa criterios, int firstResult, String clausulaWhere, Object ... parametros) {
        if ((long)(clausulaWhere.hashCode() + this.hashCode()) != this.pesquisaHash) {
            this.total = (int)((RepositorioDeCalculo)this.getRepositorio()).obterQuantidade(criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
            this.pesquisaHash = clausulaWhere.hashCode() + this.hashCode();
        }
        return ((RepositorioDeCalculo)this.getRepositorio()).pesquisar(firstResult, 10, criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
    }

    public List<Calculo> filtrarAcessibilidade(int firstResult) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        if (this.tipoCalculo != null) {
            criterios.adicionarCriterio("or", "tipoCalculo = ?", new Object[]{this.tipoCalculo});
        }
        if (this.numeroProcesso != null) {
            criterios.adicionarCriterio("and", "processo.identificador.numero = ?", this.numeroProcesso);
        }
        if (this.digitoProcesso != null) {
            criterios.adicionarCriterio("and", "processo.identificador.digito = ?", this.digitoProcesso);
        }
        if (this.anoProcesso != null) {
            criterios.adicionarCriterio("and", "processo.identificador.ano = ?", this.anoProcesso);
        }
        if (this.justica != null) {
            criterios.adicionarCriterio("and", "processo.identificador.justica = ?", this.justica);
        }
        if (this.regiao != null) {
            criterios.adicionarCriterio("and", "processo.identificador.regiao = ?", this.regiao);
        }
        if (this.varaProcesso != null) {
            criterios.adicionarCriterio("and", "processo.identificador.vara = ?", this.varaProcesso);
        }
        if (this.reclamante != null && !this.reclamante.equals("")) {
            criterios.adicionarCriterio("or", "processo.reclamante.nome like ?", "%" + this.reclamante + "%");
        }
        if (this.reclamado != null && !this.reclamado.equals("")) {
            criterios.adicionarCriterio("or", "processo.reclamado.nome like ?", "%" + this.reclamado + "%");
        }
        if (this.numeroCalculo != null) {
            criterios.adicionarCriterio("and", "id = ?", this.numeroCalculo);
        }
        criterios.adicionarCriterio("and", "ativo = ?", true);
        return this.pesquisar(criterios, firstResult, criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    @Override
    public List<Calculo> filtrar(int firstResult) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id desc");
        criterios.adicionarCriterio("and", "ativo = ?", true);
        if (this.tipoCalculo != null) {
            criterios.adicionarCriterio("and", "tipoCalculo = ?", new Object[]{this.tipoCalculo});
        }
        if (this.numeroProcesso != null) {
            criterios.adicionarCriterio("and", "processo.identificador.numero = ?", this.numeroProcesso);
        }
        if (this.digitoProcesso != null) {
            criterios.adicionarCriterio("and", "processo.identificador.digito = ?", this.digitoProcesso);
        }
        if (this.anoProcesso != null) {
            criterios.adicionarCriterio("and", "processo.identificador.ano = ?", this.anoProcesso);
        }
        if (this.justica != null) {
            criterios.adicionarCriterio("and", "processo.identificador.justica = ?", this.justica);
        }
        if (this.regiao != null) {
            criterios.adicionarCriterio("and", "processo.identificador.regiao = ?", this.regiao);
        }
        if (this.varaProcesso != null) {
            criterios.adicionarCriterio("and", "processo.identificador.vara = ?", this.varaProcesso);
        }
        if (this.reclamante != null && !this.reclamante.equals("")) {
            criterios.adicionarCriterio("and", "processo.reclamante.nome like ?", "%" + this.reclamante.toUpperCase() + "%");
        }
        if (this.reclamado != null && !this.reclamado.equals("")) {
            criterios.adicionarCriterio("and", "processo.reclamado.nome like ?", "%" + this.reclamado.toUpperCase() + "%");
        }
        if (this.numeroCalculo != null) {
            criterios.adicionarCriterio("and", "id = ?", this.numeroCalculo);
        }
        if (this.meuSetor != null && this.meuSetor.booleanValue()) {
            Identidade identidade = (Identidade)Identity.instance();
            criterios.adicionarCriterio("and", "idSetor = ?", identidade.getSetor().getId());
            criterios.adicionarCriterio("and", "instancia = ?", new Object[]{identidade.getSetor().getInstancia()});
        }
        return this.pesquisar(criterios, firstResult, criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    @Override
    public List<Calculo> filtrar() {
        return this.filtrar(0);
    }

    public List<Calculo> filtrarParaRelatorioPorProcesso(boolean isVersaoOnline) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id asc");
        this.definirCriteriosQuandoVersaoOnline(isVersaoOnline, criterios);
        criterios.adicionarCriterio("and", "ativo = ?", true);
        if (this.numeroProcesso != null) {
            criterios.adicionarCriterio("and", "processo.identificador.numero = ?", this.numeroProcesso);
        }
        if (this.digitoProcesso != null) {
            criterios.adicionarCriterio("and", "processo.identificador.digito = ?", this.digitoProcesso);
        }
        if (this.anoProcesso != null) {
            criterios.adicionarCriterio("and", "processo.identificador.ano = ?", this.anoProcesso);
        }
        if (this.justica != null) {
            criterios.adicionarCriterio("and", "processo.identificador.justica = ?", this.justica);
        }
        if (this.regiao != null) {
            criterios.adicionarCriterio("and", "processo.identificador.regiao = ?", this.regiao);
        }
        if (this.varaProcesso != null) {
            criterios.adicionarCriterio("and", "processo.identificador.vara = ?", this.varaProcesso);
        }
        return ((RepositorioDeCalculo)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    public List<Calculo> filtrarParaRelatorioPorReclamado(boolean isVersaoOnline) {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("id asc");
        this.definirCriteriosQuandoVersaoOnline(isVersaoOnline, criterios);
        criterios.adicionarCriterio("and", "ativo = ?", true);
        if (StringUtils.isNotBlank((String)this.numeroDocumentoFiscalReclamado)) {
            criterios.adicionarCriterio("and", "processo.reclamado.numeroDocumentoFiscal = ?", this.numeroDocumentoFiscalReclamado);
        }
        return ((RepositorioDeCalculo)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
    }

    private void definirCriteriosQuandoVersaoOnline(boolean isVersaoOnline, CriteriosDePesquisa criterios) {
        if (isVersaoOnline) {
            Identidade identidade = (Identidade)Identity.instance();
            criterios.adicionarCriterio("and", "idSetor = ?", identidade.getSetor().getId());
            criterios.adicionarCriterio("and", "instancia = ?", new Object[]{identidade.getSetor().getInstancia()});
        }
    }

    public TipoCalculoEnum getTipoCalculo() {
        return this.tipoCalculo;
    }

    public void setTipoCalculo(TipoCalculoEnum tipoCalculo) {
        this.tipoCalculo = tipoCalculo;
    }

    public Integer getNumeroProcesso() {
        return this.numeroProcesso;
    }

    public void setNumeroProcesso(Integer numeroProcesso) {
        this.numeroProcesso = numeroProcesso;
    }

    public Integer getDigitoProcesso() {
        return this.digitoProcesso;
    }

    public void setDigitoProcesso(Integer digitoProcesso) {
        this.digitoProcesso = digitoProcesso;
    }

    public Integer getAnoProcesso() {
        return this.anoProcesso;
    }

    public void setAnoProcesso(Integer anoProcesso) {
        this.anoProcesso = anoProcesso;
    }

    public Integer getJustica() {
        return this.justica;
    }

    public void setJustica(Integer justica) {
        this.justica = justica;
    }

    public Integer getRegiao() {
        return this.regiao;
    }

    public void setRegiao(Integer regiao) {
        this.regiao = regiao;
    }

    public Integer getVaraProcesso() {
        return this.varaProcesso;
    }

    public void setVaraProcesso(Integer varaProcesso) {
        this.varaProcesso = varaProcesso;
    }

    public String getReclamante() {
        return this.reclamante;
    }

    public void setReclamante(String reclamante) {
        this.reclamante = reclamante;
    }

    public String getReclamado() {
        return this.reclamado;
    }

    public void setReclamado(String reclamado) {
        this.reclamado = reclamado;
    }

    public Long getNumeroCalculo() {
        return this.numeroCalculo;
    }

    public void setNumeroCalculo(Long numeroCalculo) {
        this.numeroCalculo = numeroCalculo;
    }

    @Override
    public int getTotal() {
        return this.total;
    }

    public Setor getSetor() {
        return this.setor;
    }

    public void setSetor(Setor setor) {
        this.setor = setor;
    }

    public Boolean getMeuSetor() {
        return this.meuSetor;
    }

    public void setMeuSetor(Boolean meuSetor) {
        this.meuSetor = meuSetor;
    }

    @Override
    public void reset() {
        this.pesquisaHash = -1L;
    }

    public int hashCode() {
        return new HashCodeBuilder(1, 31).append((Object)this.tipoCalculo).append((Object)this.numeroProcesso).append((Object)this.digitoProcesso).append((Object)this.anoProcesso).append((Object)this.justica).append((Object)this.regiao).append((Object)this.varaProcesso).append((Object)this.reclamante).append((Object)this.reclamado).append((Object)this.numeroCalculo).append((Object)this.meuSetor).hashCode();
    }

    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    public String getNumeroDocumentoFiscalReclamado() {
        return this.numeroDocumentoFiscalReclamado;
    }

    public void setNumeroDocumentoFiscalReclamado(String numeroDocumentoFiscalReclamado) {
        this.numeroDocumentoFiscalReclamado = numeroDocumentoFiscalReclamado;
    }
}

