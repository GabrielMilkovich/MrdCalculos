/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;

public class MensagemDeRecurso {
    private EntidadeBase entidade;
    private String atributo;
    private Mensagens chave;
    private String mensagem;
    private Object[] parametros;

    public MensagemDeRecurso(EntidadeBase entidade, String atributo, Mensagens chave, Object ... parametros) {
        this.entidade = entidade;
        this.atributo = atributo;
        this.chave = chave;
        this.parametros = parametros;
    }

    public MensagemDeRecurso(String atributo, Mensagens chave, Object ... parametros) {
        this(null, atributo, chave, parametros);
    }

    public MensagemDeRecurso(Mensagens chave, Object ... parametros) {
        this(null, chave, parametros);
    }

    public Mensagens getChave() {
        return this.chave;
    }

    public void setChave(Mensagens chave) {
        this.chave = chave;
    }

    public Object[] getParametros() {
        return this.parametros;
    }

    public void setParametros(Object[] parametros) {
        this.parametros = parametros;
    }

    public String getAtributo() {
        return this.atributo;
    }

    public void setAtributo(String atributo) {
        this.atributo = atributo;
    }

    public EntidadeBase getEntidade() {
        return this.entidade;
    }

    public void setEntidade(EntidadeBase entidade) {
        this.entidade = entidade;
    }

    public String getMensagem() {
        return this.mensagem;
    }

    public void setMensagem(String mensagem) {
        this.mensagem = mensagem;
    }
}

