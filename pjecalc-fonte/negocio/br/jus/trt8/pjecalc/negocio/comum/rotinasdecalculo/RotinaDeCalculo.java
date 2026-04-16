/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo;

import java.util.HashMap;
import java.util.Map;

public abstract class RotinaDeCalculo {
    private Map<String, Object> entrada = new HashMap<String, Object>();
    private Map<String, Object> saida = new HashMap<String, Object>();

    protected <T> T getEntrada(String chave, Class<T> clazz) {
        return (T)this.entrada.get(chave);
    }

    protected <T> T getSaida(String chave, Class<T> clazz) {
        return (T)this.saida.get(chave);
    }

    protected void setEntrada(String chave, Object valor) {
        this.entrada.put(chave, valor);
    }

    protected void setSaida(String chave, Object valor) {
        this.saida.put(chave, valor);
    }

    public abstract void executar();
}

