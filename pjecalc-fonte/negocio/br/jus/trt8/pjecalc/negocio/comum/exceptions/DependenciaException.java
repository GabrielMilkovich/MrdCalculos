/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.EntityManager
 *  javax.persistence.Query
 *  org.hibernate.ObjectDeletedException
 *  org.hibernate.exception.ConstraintViolationException
 *  org.jboss.seam.Component
 */
package br.jus.trt8.pjecalc.negocio.comum.exceptions;

import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.TratadorDeExcecaoImpl;
import br.jus.trt8.pjecalc.negocio.comum.annotations.ExcecaoMapeada;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.MapeadaException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import org.hibernate.ObjectDeletedException;
import org.hibernate.exception.ConstraintViolationException;
import org.jboss.seam.Component;

@ExcecaoMapeada(mensagem=Mensagens.MSG0012)
public class DependenciaException
extends MapeadaException {
    private static final String DEFAULT_OWNER = "Calculo";
    private static final long serialVersionUID = -4257966880407902541L;

    public DependenciaException(Throwable causa) {
        super(causa);
    }

    @Override
    public void tratarMensagem(MensagemDeRecurso mensagem, RuntimeException re) {
        String param = this.findOwnerName(((ConstraintViolationException)re).getSQLException().getMessage());
        TratadorDeExcecao tratadorDeExcecao = TratadorDeExcecaoImpl.instance();
        mensagem.setParametros(new Object[]{tratadorDeExcecao.buscarLegendaDaClasse(param)});
    }

    private String extractOracleConstraintName(String msg) {
        Pattern pattern = Pattern.compile("\\((\\w*\\.)?(\\w*)\\)");
        Matcher matcher = pattern.matcher(msg);
        if (matcher.find()) {
            return matcher.group(2);
        }
        return null;
    }

    public static String extractH2ConstraintName(String msg) {
        Pattern pattern = Pattern.compile("\\QREFERENCES PUBLIC.\\E(\\w*)\\(");
        Matcher matcher = pattern.matcher(msg);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private String findOwnerName(String msg) {
        if (this.isH2(msg)) {
            return DependenciaException.extractH2ConstraintName(msg);
        }
        String constraintName = this.extractOracleConstraintName(msg);
        if (constraintName != null) {
            EntityManager entityManager = (EntityManager)Component.getInstance((String)"entityManager");
            try {
                Query query = entityManager.createNativeQuery("select table_name from VW_USER_CONSTRAINTS where constraint_name = ?").setParameter(1, (Object)constraintName);
                Object obj = query.getSingleResult();
                return obj.toString();
            }
            catch (Exception e) {
                return DEFAULT_OWNER;
            }
        }
        return DEFAULT_OWNER;
    }

    @Override
    public boolean casar(RuntimeException re) {
        if (re instanceof ObjectDeletedException) {
            return true;
        }
        if (re instanceof ConstraintViolationException) {
            String message = ((ConstraintViolationException)re).getSQLException().getMessage();
            return this.isOracle(message) || this.isH2(message);
        }
        return false;
    }

    private boolean isOracle(String message) {
        return message.startsWith("ORA-02292");
    }

    private boolean isH2(String message) {
        return message.contains("23503");
    }
}

