/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.custas;

import br.jus.trt8.pjecalc.base.comum.Utils;
import java.math.BigDecimal;
import java.util.Date;

public class CustasFixasWrapper {
    private Date ocorrencia;
    private String tipo;
    private BigDecimal base;
    private Integer quantidade;
    private BigDecimal valor;
    private BigDecimal indiceDeCorrecao;
    private BigDecimal taxaDeJuros;

    public CustasFixasWrapper(Date ocorrencia, String tipo, BigDecimal base, Integer quantidade, BigDecimal valor, BigDecimal indiceDeCorrecao, BigDecimal taxaDeJuros) {
        this.ocorrencia = ocorrencia;
        this.tipo = tipo;
        this.base = base;
        this.quantidade = quantidade;
        this.valor = valor;
        this.indiceDeCorrecao = indiceDeCorrecao;
        this.taxaDeJuros = taxaDeJuros;
    }

    public Date getOcorrencia() {
        return this.ocorrencia;
    }

    public String getTipo() {
        return this.tipo;
    }

    public BigDecimal getBase() {
        return this.base;
    }

    public Integer getQuantidade() {
        return this.quantidade;
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public BigDecimal getIndiceDeCorrecao() {
        return this.indiceDeCorrecao;
    }

    public BigDecimal getValorCorrigido() {
        return Utils.aplicarCorrecaoMonetaria(this.indiceDeCorrecao, this.valor, BigDecimal.ZERO);
    }

    public BigDecimal getJuros() {
        return Utils.aplicarJuros(this.taxaDeJuros, this.getValorCorrigido(), BigDecimal.ZERO);
    }

    public BigDecimal getTotal() {
        return this.getValorCorrigido().add(this.getJuros(), Utils.CONTEXTO_MATEMATICO);
    }
}

