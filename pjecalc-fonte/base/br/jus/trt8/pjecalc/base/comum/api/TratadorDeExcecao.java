/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum.api;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;

public interface TratadorDeExcecao {
    public void tratarExcecao(RuntimeException var1, EntidadeBase var2);

    public String buscarLegendaDaClasse(String var1);
}

