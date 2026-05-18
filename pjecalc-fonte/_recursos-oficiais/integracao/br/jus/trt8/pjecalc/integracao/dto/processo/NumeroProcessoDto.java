/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.integracao.dto.processo;

import java.io.Serializable;

public class NumeroProcessoDto
implements Serializable {
    private static final long serialVersionUID = 1L;
    private static final int NUMERO_PROCESSO_INI = 0;
    private static final int NUMERO_PROCESSO_FIM = 7;
    private static final int DIGITO_PROCESSO_INI = 8;
    private static final int DIGITO_PROCESSO_FIM = 10;
    private static final int ANO_PROCESSO_INI = 11;
    private static final int ANO_PROCESSO_FIM = 15;
    private static final int JUSTICA_PROCESSO_INI = 16;
    private static final int JUSTICA_PROCESSO_FIM = 17;
    private static final int REGIAO_PROCESSO_INI = 18;
    private static final int REGIAO_PROCESSO_FIM = 20;
    private static final int VARA_PROCESSO_INI = 21;
    private static final int VARA_PROCESSO_FIM = 25;
    private final Integer numero;
    private final Integer digito;
    private final Integer ano;
    private final Integer justica;
    private final Integer regiao;
    private final Integer vara;

    public NumeroProcessoDto(String numero) {
        this.numero = Integer.valueOf(numero.substring(0, 7));
        this.digito = Integer.valueOf(numero.substring(8, 10));
        this.ano = Integer.valueOf(numero.substring(11, 15));
        this.justica = Integer.valueOf(numero.substring(16, 17));
        this.regiao = Integer.valueOf(numero.substring(18, 20));
        this.vara = Integer.valueOf(numero.substring(21, 25));
    }

    public Integer getNumero() {
        return this.numero;
    }

    public Integer getDigito() {
        return this.digito;
    }

    public Integer getAno() {
        return this.ano;
    }

    public Integer getJustica() {
        return this.justica;
    }

    public Integer getRegiao() {
        return this.regiao;
    }

    public Integer getVara() {
        return this.vara;
    }

    public static String formatar(Integer numero, Integer digito, Integer ano, Integer justica, Integer regiao, Integer vara) {
        return String.format("%07d", numero) + "-" + String.format("%02d", digito) + "." + String.format("%04d", ano) + "." + justica + "." + String.format("%02d", regiao) + "." + String.format("%04d", vara);
    }

    public String toString() {
        return NumeroProcessoDto.formatar(this.numero, this.digito, this.ano, this.justica, this.regiao, this.vara);
    }
}

