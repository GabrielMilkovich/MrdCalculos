/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

class ComparadorDeListas {
    private String nome;
    private String proporcao;

    public ComparadorDeListas(String nome, String proporcao) {
        this.nome = nome;
        this.proporcao = proporcao;
    }

    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.nome == null ? 0 : this.nome.hashCode());
        result = 31 * result + (this.proporcao == null ? 0 : this.proporcao.hashCode());
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
        ComparadorDeListas other = (ComparadorDeListas)obj;
        if (this.nome == null ? other.nome != null : !this.nome.equals(other.nome)) {
            return false;
        }
        return !(this.proporcao == null ? other.proporcao != null : !this.proporcao.equals(other.proporcao));
    }
}

