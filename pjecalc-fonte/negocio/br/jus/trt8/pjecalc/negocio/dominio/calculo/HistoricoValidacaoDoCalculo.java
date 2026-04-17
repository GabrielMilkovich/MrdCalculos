/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.EnumType
 *  javax.persistence.Enumerated
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.constantes.TipoRegistroCalculoWS;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.RepositorioDeHistoricoValidacaoDoCalculo;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@SequenceGenerator(name="SQHISTORICOVALIDACAO", sequenceName="SQHISTORICOVALIDACAO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Table(name="TBHISTORICOVALIDACAO")
@Name(value="historicoValidacaoDoCalculo")
public class HistoricoValidacaoDoCalculo
extends EntidadeBase {
    private static final long serialVersionUID = 7476784919570066692L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQHISTORICOVALIDACAO")
    @Column(name="IIDHISTORICOVALIDACAO")
    private final Long id = null;
    @Column(name="DDTEVENTO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataAlteracao;
    @Column(name="SDSJUSTIFICATIVA", columnDefinition="VARCHAR2(255)")
    private String justificativa;
    @Enumerated(value=EnumType.STRING)
    @Column(name="STPOPERACAO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoRegistroCalculoWS")})
    @NotNull
    private TipoRegistroCalculoWS tipoValidacaoCalculo;
    @Column(name="SNMCOMPLETOUSUARIO", columnDefinition="VARCHAR2(200)")
    private String nome;
    @Column(name="SNRCPF")
    private String cpf;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;

    public HistoricoValidacaoDoCalculo() {
        super(RepositorioDeHistoricoValidacaoDoCalculo.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getCpf() {
        return this.cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public Date getDataAlteracao() {
        return this.dataAlteracao;
    }

    public void setDataAlteracao(Date dataAlteracao) {
        this.dataAlteracao = dataAlteracao;
    }

    public String getJustificativa() {
        return this.justificativa;
    }

    public void setJustificativa(String justificativa) {
        this.justificativa = justificativa;
    }

    public TipoRegistroCalculoWS getTipoValidacaoCalculo() {
        return this.tipoValidacaoCalculo;
    }

    public void setTipoValidacaoCalculo(TipoRegistroCalculoWS tipoValidacaoCalculo) {
        this.tipoValidacaoCalculo = tipoValidacaoCalculo;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public void salvar() {
        this.validar();
        super.salvar();
    }

    public static void remover(HistoricoValidacaoDoCalculo historicoValidacaoDoCalculo) {
        HistoricoValidacaoDoCalculo.remover(RepositorioDeHistoricoValidacaoDoCalculo.class, historicoValidacaoDoCalculo, Boolean.TRUE);
    }

    public static HistoricoValidacaoDoCalculo obter(Object id) {
        return (HistoricoValidacaoDoCalculo)HistoricoValidacaoDoCalculo.obter(RepositorioDeHistoricoValidacaoDoCalculo.class, id);
    }

    public static List<HistoricoValidacaoDoCalculo> obterHistoricosDoCalculo(Calculo calculo) {
        return HistoricoValidacaoDoCalculo.getRepositorio(RepositorioDeHistoricoValidacaoDoCalculo.class).obterHistoricosDaValidacaoCalculo(calculo);
    }
}

