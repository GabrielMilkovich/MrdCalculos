/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento.ComportamentoDaBaseDoReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento.ComportamentoMediaPelaQuantidade;
import br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento.ComportamentoMediaPeloValor;
import br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento.ComportamentoMediaPeloValorCorrigido;
import br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento.ComportamentoValorMensal;

public enum ComportamentoDoReflexoEnum {
    VALOR_MENSAL("Valor Mensal", "VM"),
    MEDIA_PELA_QUANTIDADE("M\u00e9dia Pela Quantidade", "MQ"),
    MEDIA_PELO_VALOR("M\u00e9dia Pelo Valor Absoluto", "MV"),
    MEDIA_PELO_VALOR_CORRIGIDO("M\u00e9dia Pelo Valor Corrigido", "MC");

    private String nome;
    private String valor;

    private ComportamentoDoReflexoEnum(String nome, String valor) {
        this.nome = nome;
        this.valor = valor;
    }

    public String getNome() {
        return this.nome;
    }

    public String getValor() {
        return this.valor;
    }

    public ComportamentoDaBaseDoReflexo criarProxyDoComportamentoDoReflexo() {
        switch (this) {
            case VALOR_MENSAL: {
                return new ComportamentoValorMensal();
            }
            case MEDIA_PELA_QUANTIDADE: {
                return new ComportamentoMediaPelaQuantidade();
            }
            case MEDIA_PELO_VALOR: {
                return new ComportamentoMediaPeloValor();
            }
            case MEDIA_PELO_VALOR_CORRIGIDO: {
                return new ComportamentoMediaPeloValorCorrigido();
            }
        }
        throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0018, "Comportamento do reflexo '" + this.getNome() + "' n\u00e3o dispon\u00edvel para essa vers\u00e3o"));
    }
}

