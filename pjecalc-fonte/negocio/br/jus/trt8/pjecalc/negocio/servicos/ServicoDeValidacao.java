/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.In
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.negocio.comum.api.Validador;
import br.jus.trt8.pjecalc.negocio.comum.validators.calculo.Alerta;
import br.jus.trt8.pjecalc.negocio.comum.validators.calculo.Erro;
import br.jus.trt8.pjecalc.negocio.comum.validators.calculo.Informacao;
import br.jus.trt8.pjecalc.negocio.comum.validators.calculo.MsgValidador;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDrools;
import java.io.Serializable;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Set;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Name(value="servicoDeValidacao")
@Scope(value=ScopeType.SESSION)
@AutoCreate
public class ServicoDeValidacao
implements Serializable,
Validador {
    private static final long serialVersionUID = 3861800888008617163L;
    @In
    private ServicoDeCalculo servicoDeCalculo;
    @In
    private ServicoDrools servicoDrools;
    private Set<MsgValidador> mensagens = new HashSet<MsgValidador>();

    public void validar() {
        Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
        this.mensagens.clear();
        LinkedHashMap<String, Object> globais = new LinkedHashMap<String, Object>();
        globais.put("validador", this);
        this.servicoDrools.executarStatefull(calculo, globais, "pjecalc.validacao");
    }

    @Override
    public boolean hasMensagens() {
        return !this.mensagens.isEmpty();
    }

    @Override
    public Set<MsgValidador> getMensagens() {
        return this.mensagens;
    }

    private <M extends MsgValidador> MsgValidador registraMensagem(String tela, String campo, String descricao, Class<M> clazz) {
        MsgValidador msg = null;
        try {
            msg = (MsgValidador)clazz.newInstance();
            msg.setTela(tela);
            msg.setCampo(campo);
            msg.setDescricao(descricao);
            this.mensagens.add(msg);
        }
        catch (Exception e) {
            e.printStackTrace();
        }
        return msg;
    }

    @Override
    public MsgValidador info(String tela, String campo, String descricao) {
        MsgValidador msg = this.registraMensagem(tela, campo, descricao, Informacao.class);
        return msg;
    }

    @Override
    public MsgValidador info(String tela, String descricao) {
        return this.info(tela, null, descricao);
    }

    @Override
    public MsgValidador info(String descricao) {
        return this.info(null, descricao);
    }

    @Override
    public MsgValidador alerta(String tela, String campo, String descricao) {
        MsgValidador msg = this.registraMensagem(tela, campo, descricao, Alerta.class);
        return msg;
    }

    @Override
    public MsgValidador alerta(String tela, String descricao) {
        return this.alerta(tela, null, descricao);
    }

    @Override
    public MsgValidador alerta(String descricao) {
        return this.alerta(null, descricao);
    }

    @Override
    public MsgValidador erro(String tela, String campo, String descricao) {
        MsgValidador msg = this.registraMensagem(tela, campo, descricao, Erro.class);
        return msg;
    }

    @Override
    public MsgValidador erro(String tela, String descricao) {
        return this.erro(tela, null, descricao);
    }

    @Override
    public MsgValidador erro(String descricao) {
        return this.erro(null, descricao);
    }

    @Override
    public int getTotalAlerta() {
        int total = 0;
        for (MsgValidador msg : this.mensagens) {
            if (!(msg instanceof Alerta)) continue;
            ++total;
        }
        return total;
    }

    @Override
    public int getTotalErro() {
        int total = 0;
        for (MsgValidador msg : this.mensagens) {
            if (!(msg instanceof Erro)) continue;
            ++total;
        }
        return total;
    }
}

