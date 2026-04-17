/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.exceptions;

import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import java.util.ArrayList;
import java.util.List;

public class NegocioException
extends RuntimeException {
    private static final long serialVersionUID = -4411392816296129035L;
    private final List<MensagemDeRecurso> mensagensDeRecurso = new ArrayList<MensagemDeRecurso>();

    public NegocioException(Throwable causa, MensagemDeRecurso mensagemDeRecurso) {
        super(causa);
        if (mensagemDeRecurso != null) {
            this.adicionarMensagemDeRecurso(mensagemDeRecurso);
        }
    }

    public NegocioException(MensagemDeRecurso mensagemDeRecurso) {
        this(null, mensagemDeRecurso);
    }

    public NegocioException() {
        this((MensagemDeRecurso)null);
    }

    public List<MensagemDeRecurso> getMensagensDeRecurso() {
        return this.mensagensDeRecurso;
    }

    public void adicionarMensagemDeRecurso(MensagemDeRecurso mensagemDeRecurso) {
        this.mensagensDeRecurso.add(mensagemDeRecurso);
    }

    public void agregarExcecao(NegocioException ne) {
        for (MensagemDeRecurso mensagem : ne.getMensagensDeRecurso()) {
            this.adicionarMensagemDeRecurso(mensagem);
        }
    }

    public boolean existeMensagensDeRecurso() {
        return !this.mensagensDeRecurso.isEmpty();
    }

    public MensagemDeRecurso obterMensagemDeRecursoParaOCampo(Mensagens mensagem, String campo) {
        for (MensagemDeRecurso msg : this.mensagensDeRecurso) {
            if (!msg.getMensagem().equals(mensagem.name()) || campo == null || !msg.getAtributo().equals(campo)) continue;
            return msg;
        }
        return null;
    }
}

