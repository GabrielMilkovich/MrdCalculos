/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.validator.ValidatorClass
 */
package br.jus.trt8.pjecalc.base.comum.annotations;

import br.jus.trt8.pjecalc.base.comum.validadores.ValidadorDocumentoPrevidenciario;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.hibernate.validator.ValidatorClass;

@Retention(value=RetentionPolicy.RUNTIME)
@Target(value={ElementType.FIELD})
@ValidatorClass(value=ValidadorDocumentoPrevidenciario.class)
@Documented
public @interface DocumentoPrevidenciario {
    public String message() default "Documento Inv\u00e1lido";
}

