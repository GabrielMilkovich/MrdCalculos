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

import br.jus.trt8.pjecalc.integracao.dto.processo.ParteProcessualRepresentanteDto;
import java.io.Serializable;
import java.util.List;
import org.codehaus.jackson.annotate.JsonAutoDetect;
import org.codehaus.jackson.annotate.JsonIgnoreProperties;
import org.codehaus.jackson.map.annotate.JsonSerialize;

@JsonAutoDetect
@JsonIgnoreProperties(ignoreUnknown=true)
@JsonSerialize(include=JsonSerialize.Inclusion.NON_NULL)
public class ParteProcessualDto
implements Serializable {
    private static final long serialVersionUID = 1L;
    private String nome;
    private String documento;
    private String numeroOab;
    private String tipoPessoa;
    private String tipoDocumento;
    private String tipo;
    private String status;
    private List<ParteProcessualRepresentanteDto> representantes;

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getDocumento() {
        return this.documento;
    }

    public void setDocumento(String documento) {
        this.documento = documento;
    }

    public String getTipoDocumento() {
        return this.tipoDocumento;
    }

    public void setTipoDocumento(String tipoDocumento) {
        this.tipoDocumento = tipoDocumento;
    }

    public String getTipo() {
        return this.tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public List<ParteProcessualRepresentanteDto> getRepresentantes() {
        return this.representantes;
    }

    public void setRepresentantes(List<ParteProcessualRepresentanteDto> representantes) {
        this.representantes = representantes;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTipoPessoa() {
        return this.tipoPessoa;
    }

    public void setTipoPessoa(String tipoPessoa) {
        this.tipoPessoa = tipoPessoa;
    }

    public String getNumeroOab() {
        return this.numeroOab;
    }

    public void setNumeroOab(String numeroOab) {
        this.numeroOab = numeroOab;
    }

    public String toString() {
        return this.getTipo() + " -> " + this.getNome() + " [" + this.getTipoDocumento() + ": " + this.getDocumento() + "]";
    }
}

