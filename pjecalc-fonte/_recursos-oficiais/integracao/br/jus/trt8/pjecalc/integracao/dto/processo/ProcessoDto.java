/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 *  org.codehaus.jackson.annotate.JsonIgnoreProperties
 *  org.codehaus.jackson.map.annotate.JsonSerialize
 *  org.codehaus.jackson.map.annotate.JsonSerialize$Inclusion
 *  org.jboss.resteasy.annotations.providers.NoJackson
 */
package br.jus.trt8.pjecalc.integracao.dto.processo;

import br.jus.trt8.pjecalc.integracao.dto.processo.NumeroProcessoDto;
import br.jus.trt8.pjecalc.integracao.dto.processo.PartesDto;
import java.io.Serializable;
import org.codehaus.jackson.annotate.JsonAutoDetect;
import org.codehaus.jackson.annotate.JsonIgnoreProperties;
import org.codehaus.jackson.map.annotate.JsonSerialize;
import org.jboss.resteasy.annotations.providers.NoJackson;

@JsonAutoDetect
@JsonIgnoreProperties(ignoreUnknown=true)
@JsonSerialize(include=JsonSerialize.Inclusion.NON_NULL)
public class ProcessoDto
implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String numero;
    private Integer instancia;
    private String valorDaCausa;
    private String autuadoEm;
    private PartesDto partes;
    @NoJackson
    private NumeroProcessoDto numeroProcesso;

    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNumero() {
        return this.numero;
    }

    public void setNumero(String numero) {
        this.numero = numero;
    }

    public Integer getInstancia() {
        return this.instancia;
    }

    public void setInstancia(Integer instancia) {
        this.instancia = instancia;
    }

    public PartesDto getPartes() {
        return this.partes;
    }

    public void setPartes(PartesDto partes) {
        this.partes = partes;
    }

    public NumeroProcessoDto getNumeroProcesso() {
        if (this.numeroProcesso == null) {
            this.numeroProcesso = new NumeroProcessoDto(this.numero);
        }
        return this.numeroProcesso;
    }

    public String getValorDaCausa() {
        return this.valorDaCausa;
    }

    public void setValorDaCausa(String valorDaCausa) {
        this.valorDaCausa = valorDaCausa;
    }

    public String getAutuadoEm() {
        return this.autuadoEm;
    }

    public void setAutuadoEm(String autuadoEm) {
        this.autuadoEm = autuadoEm;
    }
}

