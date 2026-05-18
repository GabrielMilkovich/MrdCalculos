/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.integracao.dto.exporta;

import br.jus.trt8.pjecalc.integracao.dto.exporta.TipoHonorarioGPrec;
import java.math.BigDecimal;

public class HonorarioGPrec {
    protected String nome;
    protected String documentoFiscal;
    protected BigDecimal valor;
    protected BigDecimal impostoRenda;
    protected TipoHonorarioGPrec tipo;

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getDocumentoFiscal() {
        return this.documentoFiscal;
    }

    public void setDocumentoFiscal(String documentoFiscal) {
        this.documentoFiscal = documentoFiscal;
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public BigDecimal getImpostoRenda() {
        return this.impostoRenda;
    }

    public void setImpostoRenda(BigDecimal impostoRenda) {
        this.impostoRenda = impostoRenda;
    }

    public TipoHonorarioGPrec getTipo() {
        return this.tipo;
    }

    public void setTipo(TipoHonorarioGPrec tipo) {
        this.tipo = tipo;
    }
}

