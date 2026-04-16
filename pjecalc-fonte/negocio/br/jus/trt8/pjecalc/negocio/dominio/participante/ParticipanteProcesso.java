/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.MappedSuperclass
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 */
package br.jus.trt8.pjecalc.negocio.dominio.participante;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDocumentoFiscalEnum;
import java.io.Serializable;
import javax.persistence.Column;
import javax.persistence.MappedSuperclass;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;

@MappedSuperclass
public abstract class ParticipanteProcesso
implements Serializable {
    private static final long serialVersionUID = 5156042087313061403L;
    @Column
    private String nome;
    @Column
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDocumentoFiscalEnum")})
    private TipoDocumentoFiscalEnum tipoDocumentoFiscal;
    @Column
    private String numeroDocumentoFiscal;

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public TipoDocumentoFiscalEnum getTipoDocumentoFiscal() {
        return this.tipoDocumentoFiscal;
    }

    public void setTipoDocumentoFiscal(TipoDocumentoFiscalEnum tipoDocumentoFiscal) {
        this.tipoDocumentoFiscal = tipoDocumentoFiscal;
    }

    public String getNumeroDocumentoFiscal() {
        return this.numeroDocumentoFiscal;
    }

    public void setNumeroDocumentoFiscal(String numeroDocumentoFiscal) {
        this.numeroDocumentoFiscal = Utils.filtrarSomenteNumeros(numeroDocumentoFiscal);
    }

    public void limparCampos() {
        this.nome = null;
        this.tipoDocumentoFiscal = null;
        this.numeroDocumentoFiscal = null;
    }
}

