/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 *  org.codehaus.jackson.annotate.JsonIgnore
 *  org.codehaus.jackson.annotate.JsonProperty
 */
package br.jus.trt8.pjecalc.integracao.dto.autenticacao;

import java.io.Serializable;
import org.codehaus.jackson.annotate.JsonAutoDetect;
import org.codehaus.jackson.annotate.JsonIgnore;
import org.codehaus.jackson.annotate.JsonProperty;

@JsonAutoDetect
public class RequisicaoAutorizacaoTokenDto
implements Serializable {
    private static final long serialVersionUID = 1L;
    private String clientId;
    private String responseType;
    private Integer instancia;
    private String login;
    private String senha;
    private String certificadoDigital;
    private String assinatura;
    private String conteudoAssinado;

    @JsonIgnore
    public boolean isLoginComCertificado() {
        return this.assinatura != null;
    }

    @JsonProperty(value="client_id")
    public String getClientId() {
        return this.clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    @JsonProperty(value="response_type")
    public String getResponseType() {
        return this.responseType;
    }

    public void setResponseType(String responseType) {
        this.responseType = responseType;
    }

    @JsonProperty(value="instancia")
    public Integer getInstancia() {
        return this.instancia;
    }

    public void setInstancia(Integer instancia) {
        this.instancia = instancia;
    }

    @JsonProperty(value="login")
    public String getLogin() {
        return this.login;
    }

    public void setLogin(String login) {
        this.login = login;
    }

    @JsonProperty(value="senha")
    public String getSenha() {
        return this.senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    @JsonProperty(value="certificadoDigital")
    public String getCertificadoDigital() {
        return this.certificadoDigital;
    }

    public void setCertificadoDigital(String certificadoDigital) {
        this.certificadoDigital = certificadoDigital;
    }

    @JsonProperty(value="assinatura")
    public String getAssinatura() {
        return this.assinatura;
    }

    public void setAssinatura(String assinatura) {
        this.assinatura = assinatura;
    }

    @JsonProperty(value="conteudoAssinado")
    public String getConteudoAssinado() {
        return this.conteudoAssinado;
    }

    public void setConteudoAssinado(String conteudoAssinado) {
        this.conteudoAssinado = conteudoAssinado;
    }
}

