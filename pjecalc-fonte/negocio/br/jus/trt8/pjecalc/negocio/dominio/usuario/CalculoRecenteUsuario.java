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
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.usuario;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.InstanciaSetorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Setor;
import br.jus.trt8.pjecalc.negocio.dominio.usuario.RepositorioDeCalculoRecenteUsuario;
import java.util.Date;
import java.util.List;
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
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBCALCULOSRECENTESUSUARIO")
@SequenceGenerator(name="SQCALCULOSRECENTESUSUARIO", sequenceName="SQCALCULOSRECENTESUSUARIO", allocationSize=1)
@Name(value="calculoRecenteUsuario")
public class CalculoRecenteUsuario
extends EntidadeBase {
    private static final long serialVersionUID = -5828100732282039335L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCALCULOSRECENTESUSUARIO")
    @Column(name="IIDCALCULORECENTE")
    private Long id = null;
    @Column(name="SNRCPF")
    private String cpf;
    @Column(name="IIDCALCULO")
    private Long calculo;
    @Column(name="SNMRECLAMANTE")
    private String nome;
    @Column(name="INRPROCESSO")
    private String processo;
    @Column(name="DDTACESSO")
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date dataAcesso;
    @Column(name="STPINSTANCIA", columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="InstanciaSetorEnum")})
    private InstanciaSetorEnum instancia;
    @Column(name="IDUSUSETOR")
    private Integer idSetor;
    @Column(name="SFLCALCULOEXTERNO", columnDefinition="VARCHAR2(1)", nullable=false)
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean calculoExterno = false;

    public static List<CalculoRecenteUsuario> obterCalculosRecentesDo(String cpf, Setor setor, boolean isVersaoOnline) {
        return CalculoRecenteUsuario.getRepositorio(RepositorioDeCalculoRecenteUsuario.class).obterCalculosRecentesDo(cpf, setor, isVersaoOnline);
    }

    public static List<CalculoRecenteUsuario> obterCalculoRecente(Long calculo, String cpf, InstanciaSetorEnum instancia, Integer idSetor, boolean isVersaoOnline) {
        return CalculoRecenteUsuario.getRepositorio(RepositorioDeCalculoRecenteUsuario.class).obterCalculoRecente(calculo, cpf, instancia, idSetor, isVersaoOnline);
    }

    public CalculoRecenteUsuario() {
        super(RepositorioDeCalculoRecenteUsuario.class);
    }

    public CalculoRecenteUsuario(Long id, String cpf, Long calculo, Date dataAcesso, String nome, String processo, InstanciaSetorEnum instancia, Integer idSetor, Boolean calculoExterno) {
        super(RepositorioDeCalculoRecenteUsuario.class);
        this.id = id;
        this.cpf = cpf.length() > 11 ? cpf.substring(0, 11) : cpf;
        this.calculo = calculo;
        this.dataAcesso = dataAcesso;
        this.nome = nome;
        this.processo = processo;
        this.instancia = instancia;
        this.idSetor = idSetor;
        this.calculoExterno = calculoExterno;
    }

    public CalculoRecenteUsuario(String cpf, Long calculo, Date dataAcesso, String nome, String processo, InstanciaSetorEnum instancia, Integer idSetor, Boolean calculoExterno) {
        super(RepositorioDeCalculoRecenteUsuario.class);
        this.cpf = cpf.length() > 11 ? cpf.substring(0, 11) : cpf;
        this.calculo = calculo;
        this.dataAcesso = dataAcesso;
        this.nome = nome;
        this.processo = processo;
        this.instancia = instancia;
        this.idSetor = idSetor;
        this.calculoExterno = calculoExterno;
    }

    public Long getId() {
        return this.id;
    }

    public String getCpf() {
        return this.cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public Long getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Long calculo) {
        this.calculo = calculo;
    }

    public Date getDataAcesso() {
        return this.dataAcesso;
    }

    public void setDataAcesso(Date dataAcesso) {
        this.dataAcesso = dataAcesso;
    }

    public InstanciaSetorEnum getInstancia() {
        return this.instancia;
    }

    public void setInstancia(InstanciaSetorEnum instancia) {
        this.instancia = instancia;
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getProcesso() {
        return this.processo;
    }

    public void setProcesso(String processo) {
        this.processo = processo;
    }

    public Integer getIdSetor() {
        return this.idSetor;
    }

    public void setIdSetor(Integer idSetor) {
        this.idSetor = idSetor;
    }

    public String getDescricao() {
        StringBuilder sb = new StringBuilder();
        sb.append(this.calculo);
        sb.append(" / ");
        sb.append(Utils.naoVazio(this.getProcesso()) ? this.getProcesso() : "Processo N\u00e3o Informado");
        sb.append(" / ");
        sb.append(Utils.naoVazio(this.getNome()) ? this.getNome() : "Reclamante N\u00e3o Informado");
        return sb.toString();
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    protected void salvar() {
        CalculoRecenteUsuario.getRepositorio(RepositorioDeCalculoRecenteUsuario.class).salvar(this);
    }

    protected static void remover(CalculoRecenteUsuario entidade) {
        CalculoRecenteUsuario.remover(RepositorioDeCalculoRecenteUsuario.class, entidade, true);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    public Boolean isCalculoExterno() {
        return this.calculoExterno;
    }

    public void setCalculoExterno(Boolean calculoExterno) {
        this.calculoExterno = calculoExterno;
    }
}

