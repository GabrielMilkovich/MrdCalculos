/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 *  org.codehaus.jackson.annotate.JsonProperty
 */
package br.jus.trt8.pjecalc.integracao.dto.autenticacao;

import java.io.Serializable;
import org.codehaus.jackson.annotate.JsonAutoDetect;
import org.codehaus.jackson.annotate.JsonProperty;

@JsonAutoDetect
public class RequisicaoAccessTokenDto
implements Serializable {
    private static final long serialVersionUID = 1L;
    private String grantType;
    private String code;
    private Long idPerfil;

    @JsonProperty(value="grant_type")
    public String getGrantType() {
        return this.grantType;
    }

    public void setGrantType(String grantType) {
        this.grantType = grantType;
    }

    @JsonProperty(value="code")
    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    @JsonProperty(value="id_perfil")
    public Long getIdPerfil() {
        return this.idPerfil;
    }

    public void setIdPerfil(Long idPerfil) {
        this.idPerfil = idPerfil;
    }
}

