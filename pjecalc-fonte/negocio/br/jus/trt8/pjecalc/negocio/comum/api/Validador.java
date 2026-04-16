/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.api;

import br.jus.trt8.pjecalc.negocio.comum.validators.calculo.MsgValidador;
import java.util.Set;

public interface Validador {
    public boolean hasMensagens();

    public Set<MsgValidador> getMensagens();

    public MsgValidador info(String var1, String var2, String var3);

    public MsgValidador info(String var1, String var2);

    public MsgValidador info(String var1);

    public MsgValidador alerta(String var1, String var2, String var3);

    public MsgValidador alerta(String var1, String var2);

    public MsgValidador alerta(String var1);

    public MsgValidador erro(String var1, String var2, String var3);

    public MsgValidador erro(String var1, String var2);

    public MsgValidador erro(String var1);

    public int getTotalAlerta();

    public int getTotalErro();
}

