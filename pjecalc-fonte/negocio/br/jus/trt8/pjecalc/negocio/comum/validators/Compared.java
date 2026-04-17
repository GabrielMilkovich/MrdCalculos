/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.validator.ValidatorClass
 */
package br.jus.trt8.pjecalc.negocio.comum.validators;

import br.jus.trt8.pjecalc.negocio.comum.validators.ComparedValidator;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.hibernate.validator.ValidatorClass;

@Target(value={ElementType.FIELD})
@Retention(value=RetentionPolicy.RUNTIME)
@ValidatorClass(value=ComparedValidator.class)
@Documented
public @interface Compared {
    public byte[] groups() default {};

    public String condition() default "";

    public String with();

    public boolean not() default false;

    public int result();

    public String message() default "{MSG0004}";
}

