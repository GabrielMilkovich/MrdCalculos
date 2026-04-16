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

public enum TipoRegistroCalculoWS {
    CALCULO("C\u00e1lculo", "C"),
    ATUALIZACAO("Atualiza\u00e7\u00e3o", "A");

    private static final Log LOGGER;
    private String nome;
    private String valor;

    private TipoRegistroCalculoWS(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public static TipoRegistroCalculoWS get(String chave) {
        try {
            chave = chave.trim().toUpperCase();
            chave = Normalizer.normalize(chave, Normalizer.Form.NFD);
            chave = chave.replaceAll("[^\\p{ASCII}]", "");
            return TipoRegistroCalculoWS.valueOf(chave);
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
        LOGGER = Logging.getLog(TipoRegistroCalculoWS.class);
    }
}

