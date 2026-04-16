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
 *  javax.persistence.OneToMany
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  org.apache.commons.lang.builder.HashCodeBuilder
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.security.Identity
 */
package br.jus.trt8.pjecalc.negocio.dominio.usuario;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.api.Identidade;
import br.jus.trt8.pjecalc.negocio.comum.validators.Unique;
import br.jus.trt8.pjecalc.negocio.constantes.InstanciaSetorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Setor;
import br.jus.trt8.pjecalc.negocio.dominio.usuario.CalculoRecenteUsuario;
import br.jus.trt8.pjecalc.negocio.dominio.usuario.RepositorioDeUsuario;
import br.jus.trt8.pjecalc.negocio.dominio.usuario.SetorUsuario;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.apache.commons.lang.builder.HashCodeBuilder;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.security.Identity;

@Name(value="usuario")
@Entity
@Table(name="TBUSUARIO")
@SequenceGenerator(name="SQUSUARIO", sequenceName="SQUSUARIO", allocationSize=1)
public class Usuario
extends EntidadeBase {
    private static final long serialVersionUID = 6721711892689866076L;
    private static final int TAMANHO_MAXIMO_LISTA_CALCULOS_RECENTES = 10;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQUSUARIO")
    @Column(name="IIDUSUARIO")
    private final Long id = null;
    @Column(name="SNMUSUARIO")
    private String nome;
    @Column(name="SNMLOGIN")
    @Unique(fields={"login"})
    private String login;
    @Column(name="SNMSENHA")
    private String senha;
    @Column(name="SFLATIVO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean ativo = true;
    @Column(name="IIDSETOR")
    private Integer idSetor;
    @OneToMany(fetch=FetchType.LAZY, mappedBy="usuario")
    private List<SetorUsuario> setoresUsuario = new ArrayList<SetorUsuario>();
    @Enumerated(value=EnumType.STRING)
    @Column(name="SNRINSTANCIA", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="InstanciaSetorEnum")})
    @NotNull
    private InstanciaSetorEnum instancia;

    public Usuario() {
        super(RepositorioDeUsuario.class);
    }

    public static Usuario obterAtivo(String login) {
        return Usuario.getRepositorio(RepositorioDeUsuario.class).obterUsuarioAtivo(login);
    }

    public static List<Usuario> obterTodos() {
        return Usuario.getRepositorio(RepositorioDeUsuario.class).obterTodos();
    }

    public static void remover(Usuario entidade) {
        Usuario.remover(RepositorioDeUsuario.class, entidade, true);
    }

    public static void registrarCalculoAberto(Long calculo, String nome, String processo, boolean calculoExterno, boolean isVersaoOnline) {
        Identidade identity = (Identidade)Identity.instance();
        Usuario.registrarCalculoRecente(calculo, identity.getCpf(), identity.getSetor(), nome, processo, isVersaoOnline, calculoExterno);
    }

    private static void registrarCalculoRecente(Long calculo, String cpf, Setor setor, String nome, String processo, boolean calculoExterno, boolean isVersaoOnline) {
        List<CalculoRecenteUsuario> calculoMaisRecente = CalculoRecenteUsuario.obterCalculoRecente(calculo, cpf, setor.getInstancia(), setor.getId(), isVersaoOnline);
        List<CalculoRecenteUsuario> listaDeCalculosRecentes = CalculoRecenteUsuario.obterCalculosRecentesDo(cpf, setor, isVersaoOnline);
        boolean calculoExisteNaLista = false;
        for (CalculoRecenteUsuario calculoRecente : calculoMaisRecente) {
            calculoRecente.setDataAcesso(Calendar.getInstance().getTime());
            calculoRecente.setNome(nome);
            calculoRecente.setProcesso(processo);
            calculoRecente.salvar();
            calculoExisteNaLista = true;
        }
        if (!calculoExisteNaLista) {
            if (listaDeCalculosRecentes.size() >= 10) {
                Usuario.removerMaisAntigo(listaDeCalculosRecentes);
            }
            CalculoRecenteUsuario calculoRecente = new CalculoRecenteUsuario(cpf, calculo, Calendar.getInstance().getTime(), nome, processo, setor.getInstancia(), setor.getId(), calculoExterno);
            calculoRecente.salvar();
        }
    }

    private static void removerMaisAntigo(List<CalculoRecenteUsuario> calculosRecentes) {
        CalculoRecenteUsuario calculoRecenteMaisAntigo = null;
        for (CalculoRecenteUsuario calculoRecente : calculosRecentes) {
            if (!Utils.nulo(calculoRecenteMaisAntigo) && !HelperDate.getInstance(calculoRecente.getDataAcesso()).lessThen(calculoRecenteMaisAntigo.getDataAcesso())) continue;
            calculoRecenteMaisAntigo = calculoRecente;
        }
        CalculoRecenteUsuario.remover(calculoRecenteMaisAntigo);
    }

    public Long getId() {
        return this.id;
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getLogin() {
        return this.login;
    }

    public void setLogin(String login) {
        this.login = login;
    }

    public String getSenha() {
        return this.senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    public Boolean getAtivo() {
        return this.ativo;
    }

    public void setAtivo(Boolean ativo) {
        this.ativo = ativo;
    }

    public InstanciaSetorEnum getInstancia() {
        return this.instancia;
    }

    public void setInstancia(InstanciaSetorEnum instancia) {
        this.instancia = instancia;
    }

    public Setor getSetor() {
        return new Setor(this.idSetor, this.instancia);
    }

    public void setSetor(Setor setor) {
        this.idSetor = setor != null ? setor.getId() : null;
    }

    public List<SetorUsuario> getSetoresUsuario() {
        return Utils.naoNulo(this.setoresUsuario) ? this.setoresUsuario : (this.setoresUsuario = new ArrayList<SetorUsuario>());
    }

    public void setSetoresUsuario(List<SetorUsuario> setorUsuario) {
        this.setoresUsuario = setorUsuario;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public void salvar() {
        Usuario.getRepositorio(RepositorioDeUsuario.class).salvar(this);
    }

    public String toString() {
        return super.toString("id", "login");
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder(1, 31).append((Object)this.id).append((Object)this.login).toHashCode();
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        Usuario other = (Usuario)obj;
        if (this.login == null ? other.login != null : !this.login.equals(other.login)) {
            return false;
        }
        return super.equals(obj);
    }
}

