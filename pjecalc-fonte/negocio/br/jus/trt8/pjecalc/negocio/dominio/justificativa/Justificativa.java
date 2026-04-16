/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  groovy.util.Eval
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.justificativa;

import br.jus.trt8.pjecalc.base.comum.Utils;
import groovy.util.Eval;
import org.jboss.seam.annotations.Name;

@Name(value="justificativa")
public class Justificativa {
    private String regra;
    private String texto;
    private String textoReal;
    private Integer numero;

    public String getRegra() {
        return this.regra;
    }

    public void setRegra(String regra) {
        this.regra = regra;
    }

    public String getTexto() {
        return this.texto;
    }

    public void setTexto(String texto) {
        this.texto = texto;
    }

    private String extractObjectName(Object object) {
        String className = object.getClass().getSimpleName();
        return className.substring(0, 1).toLowerCase() + className.substring(1);
    }

    public boolean isJustificar(Object object) {
        this.textoReal = null;
        return (Boolean)Eval.me((String)this.extractObjectName(object), (Object)object, (String)this.getRegra());
    }

    public String getTextoReal(Object object) {
        if (Utils.nulo(this.textoReal)) {
            this.textoReal = Eval.me((String)this.extractObjectName(object), (Object)object, (String)String.format("\"%s\"", this.getTexto())).toString();
        }
        return this.textoReal;
    }

    public Integer getNumero() {
        return this.numero;
    }

    public void setNumero(Integer numero) {
        this.numero = numero;
    }
}

