/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.validators.calculo;

import java.io.Serializable;

public abstract class MsgValidador
implements Serializable {
    private static final long serialVersionUID = 4670369814772323671L;
    private String tela;
    private String campo;
    private String descricao;

    public boolean isGlobal() {
        return this.campo == null;
    }

    public abstract boolean isImpeditivo();

    public abstract String getTipo();

    public String getTela() {
        return this.tela;
    }

    public void setTela(String tela) {
        this.tela = tela;
    }

    public String getCampo() {
        return this.campo;
    }

    public void setCampo(String campo) {
        this.campo = campo;
    }

    public String getDescricao() {
        return this.descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public String toString() {
        if (this.isGlobal()) {
            if (this.tela != null) {
                return String.format("%s: [%s] %s", this.getTipo(), this.tela, this.descricao);
            }
            return String.format("%s: %s", this.getTipo(), this.descricao);
        }
        return String.format("%s: [%s] [%s] %s", this.getTipo(), this.tela, this.campo, this.descricao);
    }

    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.campo == null ? 0 : this.campo.hashCode());
        result = 31 * result + (this.descricao == null ? 0 : this.descricao.hashCode());
        result = 31 * result + (this.tela == null ? 0 : this.tela.hashCode());
        return result;
    }

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
        MsgValidador other = (MsgValidador)obj;
        if (this.campo == null ? other.campo != null : !this.campo.equals(other.campo)) {
            return false;
        }
        if (this.descricao == null ? other.descricao != null : !this.descricao.equals(other.descricao)) {
            return false;
        }
        return !(this.tela == null ? other.tela != null : !this.tela.equals(other.tela));
    }
}

