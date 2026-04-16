/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Observer
 *  org.jboss.seam.annotations.Scope
 *  org.jboss.seam.security.Identity
 */
package br.jus.trt8.pjecalc.negocio.dominio.auditoria;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.comum.api.Identidade;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeAcaoDeAuditoriaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.auditoria.RepositorioDeAuditoria;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.io.Serializable;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Observer;
import org.jboss.seam.annotations.Scope;
import org.jboss.seam.security.Identity;

@Entity
@Table(name="TBAUDITORIA")
@SequenceGenerator(name="SQAUDITORIA", sequenceName="SQAUDITORIA", allocationSize=1)
@Name(value="auditoria")
@Scope(value=ScopeType.SESSION)
public class Auditoria
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = -5701011230223001412L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQAUDITORIA")
    @Column(name="IIDAUDITORIA")
    private Long id;
    @Column(name="IIDCALCULO")
    private Long idCalculo;
    @Column(name="SNMCOMPLETOUSUARIO", columnDefinition="VARCHAR2(200)")
    private String nome;
    @Column(name="SNRCPF")
    private String cpf;
    @Column(name="DDTEVENTO", nullable=false)
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date dataEvento;
    @Column(name="STPACAO", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeAcaoDeAuditoriaEnum")})
    private TipoDeAcaoDeAuditoriaEnum tipoAcao;

    public Auditoria() {
        super(RepositorioDeAuditoria.class);
    }

    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getIdCalculo() {
        return this.idCalculo;
    }

    public void setIdCalculo(Long idCalculo) {
        this.idCalculo = idCalculo;
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

    public Date getDataEvento() {
        return this.dataEvento;
    }

    public void setDataEvento(Date dataEvento) {
        this.dataEvento = dataEvento;
    }

    public TipoDeAcaoDeAuditoriaEnum getTipoAcao() {
        return this.tipoAcao;
    }

    public void setTipoAcao(TipoDeAcaoDeAuditoriaEnum tipoAcao) {
        this.tipoAcao = tipoAcao;
    }

    @Override
    protected void salvar() {
        super.salvar();
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Observer(value={"RegistroLiquidacao"})
    public void registroLiquidacao() {
        this.registraAuditoria(TipoDeAcaoDeAuditoriaEnum.LIQUIDACAO);
    }

    @Observer(value={"RegistroLiquidacaoAtualizacao"})
    public void registroLiquidacaoAtualizacao() {
        this.registraAuditoria(TipoDeAcaoDeAuditoriaEnum.LIQUIDACAO_ATUALIZACAO);
    }

    @Observer(value={"RegistroAlteracaoFaltas"})
    public void registroAlteracaoFaltas() {
        this.registraAuditoria(TipoDeAcaoDeAuditoriaEnum.ALTERACAO_FALTAS);
    }

    @Observer(value={"RegistroAlteracaoPensaoAlimenticia"})
    public void registroAlteracaoPensaoAlimenticia() {
        this.registraAuditoria(TipoDeAcaoDeAuditoriaEnum.ALTERACAO_PENSAO_ALIMENTICIA);
    }

    private void registraAuditoria(TipoDeAcaoDeAuditoriaEnum tipo) {
        Identidade identity = (Identidade)Identity.instance();
        Auditoria auditoria = new Auditoria();
        auditoria.setTipoAcao(tipo);
        auditoria.setDataEvento(new Date());
        auditoria.setIdCalculo(ServicoDeCalculo.getInstancia().obterCalculoAberto().getId());
        auditoria.setNome(identity.getNomeCompleto());
        auditoria.setCpf(identity.getCpf());
        auditoria.salvar();
    }

    public static Auditoria encontrarUltimoRegistroLiquidacaoDeUm(Calculo calculo, TipoDeAcaoDeAuditoriaEnum tipoAcaoAuditoria) {
        return Auditoria.getRepositorio(RepositorioDeAuditoria.class).encontrarUltimoRegistroLiquidacaoDeUm(calculo, tipoAcaoAuditoria);
    }
}

