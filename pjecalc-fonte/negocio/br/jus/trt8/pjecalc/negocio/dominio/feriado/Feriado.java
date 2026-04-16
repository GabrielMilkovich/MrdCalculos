/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.EntityListeners
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.OrderBy
 *  javax.persistence.PrePersist
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.feriado;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.AbrangenciaDoFeriadoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoFeriadoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.estado.Estado;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.ExcecaoDoFeriado;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.RepositorioDeFeriado;
import br.jus.trt8.pjecalc.negocio.dominio.municipio.Municipio;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EntityListeners;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.OrderBy;
import javax.persistence.PrePersist;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@EntityListeners(value={FeriadoListener.class})
@Table(name="TBFERIADO")
@SequenceGenerator(name="SQFERIADO", sequenceName="SQFERIADO", allocationSize=1)
@Name(value="feriado")
public class Feriado
extends EntidadeBase {
    private static final long serialVersionUID = 5790291251094623408L;
    private static final String LABEL_EXCECOES = "Exce\u00e7\u00f5es de Data";
    private static final String LABEL_DATAS_FERIADO = "Datas do ";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQFERIADO")
    @Column(name="IIDFERIADO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="STPFERIADO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoFeriadoEnum")})
    private TipoFeriadoEnum tipo = TipoFeriadoEnum.FERIADO;
    @Column(name="STPABRANGENCIA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="AbrangenciaDoFeriadoEnum")})
    private AbrangenciaDoFeriadoEnum abrangencia = AbrangenciaDoFeriadoEnum.MUNICIPAL;
    @OneToOne
    @JoinColumn(name="SSGESTADO", columnDefinition="CHAR(2)", unique=true)
    @Required(condition="bean.abrangencia.valor != 'F'")
    private Estado estado;
    @OneToOne
    @JoinColumn(name="ICDMUNICIPIO", unique=true)
    @Required(condition="bean.abrangencia.valor == 'M'")
    private Municipio municipio;
    @Column(name="SNMFERIADO", columnDefinition="VARCHAR2(80)", unique=true)
    @Required
    private String nomeFeriado;
    @Column(name="DDTFERIADO")
    @Temporal(value=TemporalType.DATE)
    @Required(condition="bean.movel == false")
    private Date data;
    @Column(name="SDSLEGISLACAO", columnDefinition="VARCHAR2(150)")
    private String descricaoLegislacao;
    @Column(name="DDTINICIOVIGENCIA")
    @Temporal(value=TemporalType.DATE)
    @LimitedTo100Years
    @Required
    private Date inicioVigencia;
    @Column(name="DDTFIMVIGENCIA")
    @Temporal(value=TemporalType.DATE)
    @LimitedTo100Years
    @GreaterOrEqualThan(value="inicioVigencia")
    private Date fimVigencia;
    @Column(name="SFLFERIADOMOVEL", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean movel = Boolean.FALSE;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="feriado")
    @OrderBy(value="data desc")
    private List<ExcecaoDoFeriado> excecoesDoFeriado = new ArrayList<ExcecaoDoFeriado>();
    @Column(name="SUIDFERIADO", unique=true, nullable=false, updatable=false, length=36)
    private String uid;

    public Feriado() {
        super(RepositorioDeFeriado.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public AbrangenciaDoFeriadoEnum getAbrangencia() {
        return this.abrangencia;
    }

    public void setAbrangencia(AbrangenciaDoFeriadoEnum abrangencia) {
        this.abrangencia = abrangencia;
    }

    public Estado getEstado() {
        return this.estado;
    }

    public void setEstado(Estado estado) {
        this.estado = estado;
    }

    public Municipio getMunicipio() {
        return this.municipio;
    }

    public void setMunicipio(Municipio municipio) {
        this.municipio = municipio;
    }

    public String getNomeFeriado() {
        return this.nomeFeriado;
    }

    public void setNomeFeriado(String nomeFeriado) {
        this.nomeFeriado = nomeFeriado;
    }

    public Date getData() {
        return this.data;
    }

    public void setData(Date data) {
        this.data = data;
    }

    public String getDescricaoLegislacao() {
        return this.descricaoLegislacao;
    }

    public void setDescricaoLegislacao(String descricaoLegislacao) {
        this.descricaoLegislacao = descricaoLegislacao;
    }

    public Date getInicioVigencia() {
        return this.inicioVigencia;
    }

    public void setInicioVigencia(Date inicioVigencia) {
        this.inicioVigencia = inicioVigencia;
    }

    public Date getFimVigencia() {
        return this.fimVigencia;
    }

    public void setFimVigencia(Date fimVigencia) {
        this.fimVigencia = fimVigencia;
    }

    public Long getId() {
        return this.id;
    }

    public Boolean getMovel() {
        return this.movel;
    }

    public void setMovel(Boolean movel) {
        this.movel = movel;
    }

    public TipoFeriadoEnum getTipo() {
        return this.tipo;
    }

    public void setTipo(TipoFeriadoEnum tipo) {
        this.tipo = tipo;
    }

    public List<ExcecaoDoFeriado> getExcecoesDoFeriado() {
        if (Utils.nulo(this.excecoesDoFeriado)) {
            this.excecoesDoFeriado = new ArrayList<ExcecaoDoFeriado>();
        }
        Collections.sort(this.excecoesDoFeriado);
        return this.excecoesDoFeriado;
    }

    public void setExcecoesDoFeriado(List<ExcecaoDoFeriado> excecoesDoFeriado) {
        this.excecoesDoFeriado = excecoesDoFeriado;
    }

    public String getLabelDatas() {
        if (this.movel.booleanValue()) {
            return LABEL_DATAS_FERIADO + this.tipo.getNome();
        }
        return LABEL_EXCECOES;
    }

    public void adicionar(ExcecaoDoFeriado entidade) {
        entidade.setFeriado(this);
        entidade.validar();
        if (!this.getExcecoesDoFeriado().isEmpty()) {
            int ano = entidade.getDataHelper().getAno();
            for (ExcecaoDoFeriado excecao : this.getExcecoesDoFeriado()) {
                if (ano != excecao.getDataHelper().getAno()) continue;
                throw new NegocioException(new MensagemDeRecurso("dataFeriado", Mensagens.MSG0060, new Object[0]));
            }
        }
        this.getExcecoesDoFeriado().add(entidade);
    }

    public void removerDeLista(ExcecaoDoFeriado entidade) {
        this.getExcecoesDoFeriado().remove(entidade);
    }

    @Override
    public Feriado validar() {
        GerenciadorDeValidadores.getInstance().validar(Feriado.class, this);
        if (this.movel.booleanValue() && this.getExcecoesDoFeriado().isEmpty()) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0047, this.getLabelDatas()));
        }
        if (!this.getExcecoesDoFeriado().isEmpty()) {
            int indice = this.getExcecoesDoFeriado().size() - 1;
            if (Utils.nulo(this.getFimVigencia()) ? HelperDate.dateBefore(this.getExcecoesDoFeriado().get(indice).getData(), this.getInicioVigencia()) : !new Periodo(this.getInicioVigencia(), this.getFimVigencia()).isPeriodoContemTotalmenteEste(new Periodo(this.getExcecoesDoFeriado().get(indice).getData(), this.getExcecoesDoFeriado().get(0).getData()))) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0062, this.getLabelDatas()));
            }
        }
        return this;
    }

    public void consistirDados() {
        if (AbrangenciaDoFeriadoEnum.FEDERAL == this.abrangencia) {
            this.municipio = null;
            this.estado = null;
        }
        if (this.movel.booleanValue()) {
            this.data = null;
        }
    }

    public static Feriado obterPorUid(String uid) {
        return Feriado.getRepositorio(RepositorioDeFeriado.class).obterPorUid(uid);
    }

    @Override
    public void salvar() {
        this.consistirDados();
        super.salvar();
    }

    public static void remover(Feriado feriado) {
        Feriado.remover(RepositorioDeFeriado.class, feriado, true);
    }

    public static List<Feriado> obterPontosFacultativos(Municipio municipio) {
        return Feriado.getRepositorio(RepositorioDeFeriado.class).obterPontosFacultativos(municipio);
    }

    public boolean isAbrangenciaNacional() {
        return AbrangenciaDoFeriadoEnum.FEDERAL == this.getAbrangencia();
    }

    public boolean isFeriadoBancario() {
        if (TipoFeriadoEnum.BANCARIO == this.getTipo()) {
            this.setAbrangencia(AbrangenciaDoFeriadoEnum.FEDERAL);
            return true;
        }
        return false;
    }

    public boolean isAbrangenciaMunicipal() {
        return AbrangenciaDoFeriadoEnum.MUNICIPAL == this.getAbrangencia();
    }

    public String getUid() {
        return this.uid;
    }

    private String gerarUid() {
        if (this.uid == null) {
            this.uid = UUID.randomUUID().toString();
        }
        return this.uid;
    }

    public static class FeriadoListener {
        @PrePersist
        public void onPrePersist(Feriado feriado) {
            feriado.gerarUid();
        }
    }
}

