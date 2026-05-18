/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 *  org.codehaus.jackson.annotate.JsonIgnoreProperties
 *  org.codehaus.jackson.map.annotate.JsonSerialize
 *  org.codehaus.jackson.map.annotate.JsonSerialize$Inclusion
 */
package br.jus.trt8.pjecalc.integracao.dto.processo;

import br.jus.trt8.pjecalc.integracao.dto.processo.ParteProcessualDto;
import org.codehaus.jackson.annotate.JsonAutoDetect;
import org.codehaus.jackson.annotate.JsonIgnoreProperties;
import org.codehaus.jackson.map.annotate.JsonSerialize;

@JsonAutoDetect
@JsonIgnoreProperties(ignoreUnknown=true)
@JsonSerialize(include=JsonSerialize.Inclusion.NON_NULL)
public class ParteProcessualRepresentanteDto
extends ParteProcessualDto {
    private static final long serialVersionUID = 1L;
    private String cpf;

    public String getCpf() {
        return this.cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    @Override
    public String toString() {
        return super.toString() + " CPF: " + this.getCpf();
    }
}

