/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import java.util.List;

public class ParcelasAtualizaveisUtils {
    protected static void lancarErros(List<MensagemDeRecurso> erros) {
        if (!erros.isEmpty()) {
            NegocioException exception = new NegocioException();
            for (MensagemDeRecurso e : erros) {
                exception.adicionarMensagemDeRecurso(e);
            }
            throw exception;
        }
    }
}

