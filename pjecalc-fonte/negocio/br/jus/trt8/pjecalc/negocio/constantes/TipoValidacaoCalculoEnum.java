/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.log.Log
 *  org.jboss.seam.log.Logging
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import java.text.Normalizer;
import org.jboss.seam.log.Log;
import org.jboss.seam.log.Logging;

public enum TipoValidacaoCalculoEnum {
    VALIDO("V\u00e1lido", "V"),
    INVALIDO("Inv\u00e1lido", "I");

    private static final Log LOGGER;
    private String nome;
    private String valor;

    private TipoValidacaoCalculoEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public static TipoValidacaoCalculoEnum get(String chave) {
        try {
            chave = chave.trim().toUpperCase();
            chave = Normalizer.normalize(chave, Normalizer.Form.NFD);
            chave = chave.replaceAll("[^\\p{ASCII}]", "");
            for (TipoValidacaoCalculoEnum e : TipoValidacaoCalculoEnum.values()) {
                if (!e.toString().equalsIgnoreCase(chave)) continue;
                return e;
            }
            return null;
        }
        catch (Exception e) {
            LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            return null;
        }
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    static {
        LOGGER = Logging.getLog(TipoValidacaoCalculoEnum.class);
    }
}

