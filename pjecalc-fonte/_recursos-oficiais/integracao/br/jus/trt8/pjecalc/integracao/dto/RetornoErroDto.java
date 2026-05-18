/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 */
package br.jus.trt8.pjecalc.integracao.dto;

import java.io.Serializable;
import org.codehaus.jackson.annotate.JsonAutoDetect;

@JsonAutoDetect
public class RetornoErroDto
implements Serializable {
    private static final long serialVersionUID = 1L;
    private String identificadorRequisicao;
    private String codigoErro;
    private String mensagem;

    public String getMensagem() {
        return this.mensagem;
    }

    public void setMensagem(String mensagem) {
        this.mensagem = mensagem;
    }

    public String getCodigoErro() {
        return this.codigoErro;
    }

    public void setCodigoErro(String codigoErro) {
        this.codigoErro = codigoErro;
    }

    public String getIdentificadorRequisicao() {
        return this.identificadorRequisicao;
    }

    public void setIdentificadorRequisicao(String identificadorRequisicao) {
        this.identificadorRequisicao = identificadorRequisicao;
    }

    public String toString() {
        return this.getCodigoErro().concat("::").concat(this.getMensagem());
    }
}

