/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.mapping.Property
 *  org.hibernate.validator.PropertyConstraint
 *  org.hibernate.validator.Validator
 */
package br.jus.trt8.pjecalc.base.comum.validadores;

import br.jus.trt8.pjecalc.base.comum.annotations.DocumentoFiscal;
import br.jus.trt8.pjecalc.base.constantes.TipoDocumentoFiscal;
import org.hibernate.mapping.Property;
import org.hibernate.validator.PropertyConstraint;
import org.hibernate.validator.Validator;

public class ValidadorDocumentoFiscal
implements Validator<DocumentoFiscal>,
PropertyConstraint {
    private TipoDocumentoFiscal tipoDocumentoFiscal;

    public void initialize(DocumentoFiscal documentoFiscal) {
        this.tipoDocumentoFiscal = documentoFiscal.tipoDocumentoFiscal();
    }

    public boolean isValid(Object arg0) {
        return this.tipoDocumentoFiscal.validar((String)arg0);
    }

    public void apply(Property arg0) {
    }
}

