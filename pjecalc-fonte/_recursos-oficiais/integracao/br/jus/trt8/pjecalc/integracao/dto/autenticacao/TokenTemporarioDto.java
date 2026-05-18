/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.integracao.dto.autenticacao;

import br.jus.trt8.pjecalc.integracao.dto.autenticacao.PerfilDto;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class TokenTemporarioDto
implements Serializable {
    private static final long serialVersionUID = 1L;
    private String code;
    private List<PerfilDto> perfis;

    public TokenTemporarioDto() {
    }

    public TokenTemporarioDto(String code, List<PerfilDto> perfis) {
        this.code = code;
        this.perfis = new ArrayList<PerfilDto>(perfis);
    }

    public List<PerfilDto> getPerfis() {
        return this.perfis;
    }

    public void setPerfis(List<PerfilDto> perfis) {
        this.perfis = perfis;
    }

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}

