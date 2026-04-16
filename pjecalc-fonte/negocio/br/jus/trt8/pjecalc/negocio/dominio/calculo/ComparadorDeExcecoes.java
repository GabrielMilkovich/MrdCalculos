/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

class ComparadorDeExcecoes {
    private String dataInicio;
    private String dataFim;
    private String valor;

    public ComparadorDeExcecoes(String dataInicio, String dataFim, String valor) {
        this.dataInicio = dataInicio;
        this.dataFim = dataFim;
        this.valor = valor;
    }

    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.dataFim == null ? 0 : this.dataFim.hashCode());
        result = 31 * result + (this.dataInicio == null ? 0 : this.dataInicio.hashCode());
        result = 31 * result + (this.valor == null ? 0 : this.valor.hashCode());
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
        ComparadorDeExcecoes other = (ComparadorDeExcecoes)obj;
        if (this.dataFim == null ? other.dataFim != null : !this.dataFim.equals(other.dataFim)) {
            return false;
        }
        if (this.dataInicio == null ? other.dataInicio != null : !this.dataInicio.equals(other.dataInicio)) {
            return false;
        }
        return !(this.valor == null ? other.valor != null : !this.valor.equals(other.valor));
    }
}

