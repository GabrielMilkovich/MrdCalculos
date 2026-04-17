/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.AttributeOverride
 *  javax.persistence.AttributeOverrides
 *  javax.persistence.Column
 *  javax.persistence.Embeddable
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.participante;

import br.jus.trt8.pjecalc.negocio.dominio.participante.ParticipanteProcesso;
import javax.persistence.AttributeOverride;
import javax.persistence.AttributeOverrides;
import javax.persistence.Column;
import javax.persistence.Embeddable;
import org.jboss.seam.annotations.Name;

@Name(value="reclamado")
@Embeddable
@AttributeOverrides(value={@AttributeOverride(name="nome", column=@Column(name="SNMRECLAMADO", columnDefinition="VARCHAR2(150)")), @AttributeOverride(name="tipoDocumentoFiscal", column=@Column(name="STPDOCFISCALRECLAMADO", columnDefinition="CHAR(4)")), @AttributeOverride(name="numeroDocumentoFiscal", column=@Column(name="SNRDOCFISCALRECLAMADO", columnDefinition="VARCHAR2(14)"))})
public class Reclamado
extends ParticipanteProcesso {
    private static final long serialVersionUID = -3476429114458990976L;
}

