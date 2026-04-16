/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  org.apache.commons.lang.StringUtils
 *  org.hibernate.exception.ConstraintViolationException
 *  org.jboss.seam.core.ResourceBundle
 */
package br.jus.trt8.pjecalc.negocio.comum.exceptions;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.annotations.ExcecaoMapeada;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.MapeadaException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import java.lang.reflect.Field;
import java.util.MissingResourceException;
import javax.persistence.Column;
import org.apache.commons.lang.StringUtils;
import org.hibernate.exception.ConstraintViolationException;
import org.jboss.seam.core.ResourceBundle;

@ExcecaoMapeada(mensagem=Mensagens.MSG0006)
public class ViolacaoDeRestricaoException
extends MapeadaException {
    private static final long serialVersionUID = -4257966880407902541L;

    public ViolacaoDeRestricaoException(Throwable causa) {
        super(causa);
    }

    @Override
    public void tratarMensagem(MensagemDeRecurso mensagem, RuntimeException re) {
        for (Field field : mensagem.getEntidade().getClass().getDeclaredFields()) {
            if (!field.isAnnotationPresent(Column.class) || !field.getAnnotation(Column.class).unique()) continue;
            mensagem.setAtributo(field.getName());
            String labelAtributo = this.getNameFromResource(StringUtils.uncapitalize((String)mensagem.getEntidade().getClass().getSimpleName()) + "." + field.getName());
            if (Utils.nulo(labelAtributo)) {
                mensagem.setParametros(new Object[]{StringUtils.capitalize((String)field.getName())});
                break;
            }
            mensagem.setParametros(new Object[]{labelAtributo});
            break;
        }
    }

    @Override
    public boolean casar(RuntimeException re) {
        if (re instanceof ConstraintViolationException) {
            String message = ((ConstraintViolationException)re).getSQLException().getMessage();
            return this.isOracle(message) || this.isH2(message);
        }
        return false;
    }

    private boolean isOracle(String message) {
        return message.startsWith("ORA-00001");
    }

    private boolean isH2(String message) {
        return message.contains("23505");
    }

    private String getNameFromResource(String key) {
        try {
            return ResourceBundle.instance().getString(key);
        }
        catch (MissingResourceException me) {
            return null;
        }
    }
}

