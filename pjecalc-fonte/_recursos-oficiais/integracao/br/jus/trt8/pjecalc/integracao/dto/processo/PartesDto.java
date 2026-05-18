/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 *  org.codehaus.jackson.annotate.JsonAutoDetect$Visibility
 *  org.codehaus.jackson.annotate.JsonIgnoreProperties
 *  org.codehaus.jackson.annotate.JsonProperty
 *  org.codehaus.jackson.map.annotate.JsonSerialize
 *  org.codehaus.jackson.map.annotate.JsonSerialize$Inclusion
 */
package br.jus.trt8.pjecalc.integracao.dto.processo;

import br.jus.trt8.pjecalc.integracao.dto.processo.ParteProcessualDto;
import java.io.Serializable;
import java.util.List;
import org.codehaus.jackson.annotate.JsonAutoDetect;
import org.codehaus.jackson.annotate.JsonIgnoreProperties;
import org.codehaus.jackson.annotate.JsonProperty;
import org.codehaus.jackson.map.annotate.JsonSerialize;

@JsonAutoDetect(fieldVisibility=JsonAutoDetect.Visibility.ANY)
@JsonIgnoreProperties(ignoreUnknown=true)
@JsonSerialize(include=JsonSerialize.Inclusion.NON_NULL)
public class PartesDto
implements Serializable {
    private static final long serialVersionUID = 1L;
    @JsonProperty(value="ATIVO")
    private List<ParteProcessualDto> reclamantes;
    @JsonProperty(value="PASSIVO")
    private List<ParteProcessualDto> reclamados;

    public List<ParteProcessualDto> getReclamantes() {
        return this.reclamantes;
    }

    public void setReclamantes(List<ParteProcessualDto> reclamantes) {
        this.reclamantes = reclamantes;
    }

    public List<ParteProcessualDto> getReclamados() {
        return this.reclamados;
    }

    public void setReclamados(List<ParteProcessualDto> reclamados) {
        this.reclamados = reclamados;
    }
}

