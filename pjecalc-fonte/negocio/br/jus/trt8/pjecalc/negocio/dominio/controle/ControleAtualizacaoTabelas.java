/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.controle;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.dominio.controle.RepositorioControleAtualizacaoTabelas;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBCONTROLEATUALIZTABELAS")
@Name(value="controleAtualizTabelas")
public class ControleAtualizacaoTabelas
extends EntidadeBase {
    private static final long serialVersionUID = 1L;
    @Id
    @Column(name="SCDHASHCONTROLEATUALIZ", nullable=false, updatable=false)
    private String hash;
    @Column(name="SNMCONTROLEATUALIZ", nullable=false, updatable=false)
    private String nome;
    @Column(name="DDTNOTIFICACAO", nullable=false, updatable=false)
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date dataNotificacao;

    public ControleAtualizacaoTabelas() {
        super(RepositorioControleAtualizacaoTabelas.class);
    }

    public ControleAtualizacaoTabelas(String nome, String hash) {
        this();
        this.hash = hash;
        this.nome = nome;
        this.dataNotificacao = new Date();
    }

    @Override
    public void salvar() {
        ControleAtualizacaoTabelas.getRepositorio(RepositorioControleAtualizacaoTabelas.class).salvar(this);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getHash();
    }

    public String getHash() {
        return this.hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public Date getDataNotificacao() {
        return this.dataNotificacao;
    }

    public void setDataNotificacao(Date dataNotificacao) {
        this.dataNotificacao = dataNotificacao;
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String toString() {
        return "ControleAtualizacaoTabelas [hash=" + this.hash + ", nome=" + this.nome + ", dataNotificacao=" + this.dataNotificacao + "]";
    }

    public static List<ControleAtualizacaoTabelas> listarUltimas(int quantidade) {
        return ControleAtualizacaoTabelas.getRepositorio(RepositorioControleAtualizacaoTabelas.class).listarUltimas(quantidade);
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = super.hashCode();
        result = 31 * result + (this.hash == null ? 0 : this.hash.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!super.equals(obj)) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        ControleAtualizacaoTabelas other = (ControleAtualizacaoTabelas)obj;
        return !(this.hash == null ? other.hash != null : !this.hash.equals(other.hash));
    }
}

