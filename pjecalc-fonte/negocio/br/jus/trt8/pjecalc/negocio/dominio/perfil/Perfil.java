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
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.perfil;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.comum.validators.Unique;
import br.jus.trt8.pjecalc.negocio.constantes.PapelEnum;
import br.jus.trt8.pjecalc.negocio.dominio.perfil.RepositorioDePerfil;
import br.jus.trt8.pjecalc.negocio.dominio.usuario.Usuario;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Name(value="perfil")
@Entity
@Table(name="TBPERFIL")
@SequenceGenerator(name="SQPERFIL", sequenceName="SQPERFIL", allocationSize=1)
public class Perfil
extends EntidadeBase {
    private static final long serialVersionUID = -7638792393505007513L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPERFIL")
    @Column(name="IIDPERFIL")
    private final Long id = null;
    @Column(name="STPPAPEL", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="PapelEnum")})
    private PapelEnum papel = PapelEnum.CALCULISTA;
    @Column(name="SNMCPF", unique=true)
    @Unique(fields={"cpf"})
    private String cpf;

    public Perfil() {
        super(RepositorioDePerfil.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public static Perfil obterPerfilDoUsuario(Usuario usuario) {
        return Perfil.getRepositorio(RepositorioDePerfil.class).obterPerfilDoUsuario(usuario);
    }

    public static Perfil obterPerfilDoUsuario(String cpf) {
        return Perfil.getRepositorio(RepositorioDePerfil.class).obterPerfilDoUsuario(cpf);
    }

    public static List<Perfil> obterTodos() {
        return Perfil.getRepositorio(RepositorioDePerfil.class).obterTodos();
    }

    public static void remover(Perfil entidade) {
        Perfil.remover(RepositorioDePerfil.class, entidade, true);
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public PapelEnum getPapel() {
        return this.papel;
    }

    public void setPapel(PapelEnum papel) {
        this.papel = papel;
    }

    public String getCpf() {
        return this.cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public int hashCode() {
        return this.getHashCodeBuilder().append((Object)this.cpf).append((Object)this.papel).hashCode();
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
        return this.getEqualsBuilder(obj).append((Object)this.cpf, (Object)((Perfil)obj).cpf).append((Object)this.papel, (Object)((Perfil)obj).papel).isEquals();
    }
}

