/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento;

import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento.ComportamentoMediaPeloValor;
import java.math.BigDecimal;

public class ComportamentoMediaPeloValorCorrigido
extends ComportamentoMediaPeloValor {
    private static final long serialVersionUID = 3814765900817121927L;
    private static final boolean CORRIGIR = Boolean.TRUE;

    @Override
    public BigDecimal resolverValor(ItemBaseVerba item, ParametroDoTermo parametro) {
        return super.resolverValor(item, parametro, CORRIGIR);
    }
}

