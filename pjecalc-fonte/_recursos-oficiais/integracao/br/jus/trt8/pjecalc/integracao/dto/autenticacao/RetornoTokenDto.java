/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.codehaus.jackson.annotate.JsonProperty
 *  org.jboss.resteasy.annotations.providers.NoJackson
 */
package br.jus.trt8.pjecalc.integracao.dto.autenticacao;

import br.jus.trt8.pjecalc.integracao.dto.autenticacao.PerfilDto;
import java.io.Serializable;
import java.util.List;
import org.codehaus.jackson.annotate.JsonProperty;
import org.jboss.resteasy.annotations.providers.NoJackson;

public class RetornoTokenDto
implements Serializable {
    private static final long serialVersionUID = 1L;
    private String accessToken;
    private String refreshToken;
    private String tokenType = "Bearer";
    private int tempoExpiracaoSegundos;
    private String xsrfToken;
    private List<PerfilDto> perfis;

    public RetornoTokenDto() {
    }

    public RetornoTokenDto(String accessToken, String refreshToken, int tempoExpiracaoSegundos) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tempoExpiracaoSegundos = tempoExpiracaoSegundos;
    }

    public RetornoTokenDto(String accessToken, int tempoExpiracaoSegundos) {
        this(accessToken, null, tempoExpiracaoSegundos);
    }

    public String getAccessToken() {
        return this.accessToken;
    }

    @JsonProperty(value="access_token")
    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getRefreshToken() {
        return this.refreshToken;
    }

    @JsonProperty(value="refresh_token")
    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public String getTokenType() {
        return this.tokenType;
    }

    @JsonProperty(value="token_type")
    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public int getTempoExpiracaoSegundos() {
        return this.tempoExpiracaoSegundos;
    }

    @JsonProperty(value="expires_in")
    public void setTempoExpiracaoSegundos(int tempoExpiracaoSegundos) {
        this.tempoExpiracaoSegundos = tempoExpiracaoSegundos;
    }

    public String getXsrfToken() {
        return this.xsrfToken;
    }

    @JsonProperty(value="xsrf_token")
    public void setXsrfToken(String xsrfToken) {
        this.xsrfToken = xsrfToken;
    }

    @NoJackson
    public void setPerfis(List<PerfilDto> perfis) {
        this.perfis = perfis;
    }

    public List<PerfilDto> getPerfis() {
        return this.perfis;
    }
}

