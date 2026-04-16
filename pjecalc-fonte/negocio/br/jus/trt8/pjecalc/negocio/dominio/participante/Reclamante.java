/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.AttributeOverride
 *  javax.persistence.AttributeOverrides
 *  javax.persistence.Column
 *  javax.persistence.Embeddable
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.Length
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.participante;

import br.jus.trt8.pjecalc.base.comum.annotations.DocumentoPrevidenciario;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDocumentoPrevidenciarioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.participante.ParticipanteProcesso;
import javax.persistence.AttributeOverride;
import javax.persistence.AttributeOverrides;
import javax.persistence.Column;
import javax.persistence.Embeddable;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.Length;
import org.jboss.seam.annotations.Name;

@Name(value="reclamante")
@Embeddable
@AttributeOverrides(value={@AttributeOverride(name="tipoDocumentoFiscal", column=@Column(name="STPDOCFISCALRECLAMANTE", columnDefinition="CHAR(4)")), @AttributeOverride(name="numeroDocumentoFiscal", column=@Column(name="SNRDOCFISCALRECLAMANTE", columnDefinition="VARCHAR2(14)")), @AttributeOverride(name="nome", column=@Column(name="SNMRECLAMANTE", columnDefinition="VARCHAR2(150)"))})
public class Reclamante
extends ParticipanteProcesso {
    private static final long serialVersionUID = 4050322116846724736L;
    @Column(name="STPDOCPREVIDENCIARIORECLAMANTE", columnDefinition="CHAR(5)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDocumentoPrevidenciarioEnum")})
    private TipoDocumentoPrevidenciarioEnum tipoDocumentoPrevidenciario;
    @Column(name="SNRDOCPREVIDENCIARIORECLAMANTE")
    @Length(max=11)
    @DocumentoPrevidenciario
    private String numeroDocumentoPrevidenciario;

    public Reclamante validar() {
        return this;
    }

    public TipoDocumentoPrevidenciarioEnum getTipoDocumentoPrevidenciario() {
        return this.tipoDocumentoPrevidenciario;
    }

    public void setTipoDocumentoPrevidenciario(TipoDocumentoPrevidenciarioEnum tipoDocumentoPrevidenciario) {
        this.tipoDocumentoPrevidenciario = tipoDocumentoPrevidenciario;
    }

    public String getNumeroDocumentoPrevidenciario() {
        return this.numeroDocumentoPrevidenciario;
    }

    public void setNumeroDocumentoPrevidenciario(String numeroDocumentoPrevidenciario) {
        this.numeroDocumentoPrevidenciario = numeroDocumentoPrevidenciario;
    }

    @Override
    public void limparCampos() {
        super.limparCampos();
        this.tipoDocumentoPrevidenciario = null;
        this.numeroDocumentoPrevidenciario = null;
    }
}

