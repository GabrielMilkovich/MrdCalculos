/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.FormaAplicacaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;

public class ValidadorParametrosDeAtualizacao {
    private static final String TEXTO_A_PARTIR_LEI = "'A partir de' da Lei n\u00ba 11.941/2009";
    private ParametrosDeAtualizacao parametrosDeAtualizacao;

    public ValidadorParametrosDeAtualizacao(ParametrosDeAtualizacao parametrosDeAtualizacao) {
        this.parametrosDeAtualizacao = parametrosDeAtualizacao;
    }

    public void checarDatas() {
        NegocioException excecao = new NegocioException();
        if (Utils.naoNulo(this.parametrosDeAtualizacao.getAplicarAteDosSalariosPagosDoINSS()) && Utils.naoNulo(this.parametrosDeAtualizacao.getApartirDeLei11941Pago()) && HelperDate.dateBeforeOrEquals(this.parametrosDeAtualizacao.getAplicarAteDosSalariosPagosDoINSS(), this.parametrosDeAtualizacao.getApartirDeLei11941Pago())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("", Mensagens.MSG0007, "o 'Aplicar at\u00e9' da corre\u00e7\u00e3o Trabalhista dos Sal\u00e1rios Pagos", TEXTO_A_PARTIR_LEI));
        }
        if (this.parametrosDeAtualizacao.getLei11941().booleanValue() && Utils.naoNulo(this.parametrosDeAtualizacao.getAplicarAteDosSalariosDevidosDoINSS()) && Utils.naoNulo(this.parametrosDeAtualizacao.getApartirDeLei11941()) && HelperDate.dateBeforeOrEquals(this.parametrosDeAtualizacao.getAplicarAteDosSalariosDevidosDoINSS(), this.parametrosDeAtualizacao.getApartirDeLei11941())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("", Mensagens.MSG0007, "o 'Aplicar at\u00e9' da corre\u00e7\u00e3o Trabalhista dos Sal\u00e1rios Devidos", TEXTO_A_PARTIR_LEI));
        }
        if (Utils.naoNulo(this.parametrosDeAtualizacao.getApartirDeLei11941Pago()) && Utils.naoNulo(this.parametrosDeAtualizacao.getApartirDeLei11941PagoMulta()) && HelperDate.dateBefore(this.parametrosDeAtualizacao.getApartirDeLei11941PagoMulta(), this.parametrosDeAtualizacao.getApartirDeLei11941Pago())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("", Mensagens.MSG0008, "o 'A partir de' do Limitar multa dos Sal\u00e1rios Pagos", TEXTO_A_PARTIR_LEI));
        }
        if (Utils.naoNulo(this.parametrosDeAtualizacao.getApartirDeLei11941()) && Utils.naoNulo(this.parametrosDeAtualizacao.getApartirDeLei11941Multa()) && HelperDate.dateBefore(this.parametrosDeAtualizacao.getApartirDeLei11941Multa(), this.parametrosDeAtualizacao.getApartirDeLei11941())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso("", Mensagens.MSG0008, "o 'A partir de' do Limitar multa dos Sal\u00e1rios Devidos", TEXTO_A_PARTIR_LEI));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
    }

    public void organizarSalariosDevidosEPagos() {
        if (this.parametrosDeAtualizacao.getCorrecaoTrabalhistaDosSalariosDevidosDoINSS().booleanValue() && !this.parametrosDeAtualizacao.getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS().booleanValue()) {
            this.parametrosDeAtualizacao.setAplicarAteDosSalariosDevidosDoINSS(null);
            this.parametrosDeAtualizacao.setSalarioDevidoFormaAplicacao(null);
        } else if (this.parametrosDeAtualizacao.getCorrecaoTrabalhistaDosSalariosDevidosDoINSS().booleanValue() && this.parametrosDeAtualizacao.getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS().booleanValue()) {
            this.parametrosDeAtualizacao.setSalarioDevidoFormaAplicacao(null);
        } else if (!this.parametrosDeAtualizacao.getCorrecaoTrabalhistaDosSalariosDevidosDoINSS().booleanValue() && this.parametrosDeAtualizacao.getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS().booleanValue()) {
            if (this.parametrosDeAtualizacao.getSalarioDevidoFormaAplicacao() != null && this.parametrosDeAtualizacao.getSalarioDevidoFormaAplicacao().equals((Object)FormaAplicacaoEnum.MES_A_MES)) {
                this.parametrosDeAtualizacao.setAplicarAteDosSalariosDevidosDoINSS(null);
            }
        } else if (!this.parametrosDeAtualizacao.getCorrecaoTrabalhistaDosSalariosDevidosDoINSS().booleanValue() && !this.parametrosDeAtualizacao.getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS().booleanValue()) {
            this.parametrosDeAtualizacao.setAplicarAteDosSalariosDevidosDoINSS(null);
            this.parametrosDeAtualizacao.setSalarioDevidoFormaAplicacao(null);
        }
        if (this.parametrosDeAtualizacao.getCorrecaoTrabalhistaDosSalariosPagosDoINSS().booleanValue() && !this.parametrosDeAtualizacao.getCorrecaoPrevidenciariaDosSalariosPagosDoINSS().booleanValue()) {
            this.parametrosDeAtualizacao.setAplicarAteDosSalariosPagosDoINSS(null);
            this.parametrosDeAtualizacao.setSalarioPagoFormaAplicacao(null);
        } else if (this.parametrosDeAtualizacao.getCorrecaoTrabalhistaDosSalariosPagosDoINSS().booleanValue() && this.parametrosDeAtualizacao.getCorrecaoPrevidenciariaDosSalariosPagosDoINSS().booleanValue()) {
            this.parametrosDeAtualizacao.setSalarioPagoFormaAplicacao(null);
        } else if (!this.parametrosDeAtualizacao.getCorrecaoTrabalhistaDosSalariosPagosDoINSS().booleanValue() && this.parametrosDeAtualizacao.getCorrecaoPrevidenciariaDosSalariosPagosDoINSS().booleanValue()) {
            if (this.parametrosDeAtualizacao.getSalarioPagoFormaAplicacao() != null && this.parametrosDeAtualizacao.getSalarioPagoFormaAplicacao().equals((Object)FormaAplicacaoEnum.MES_A_MES)) {
                this.parametrosDeAtualizacao.setAplicarAteDosSalariosPagosDoINSS(null);
            }
        } else if (!this.parametrosDeAtualizacao.getCorrecaoTrabalhistaDosSalariosPagosDoINSS().booleanValue() && !this.parametrosDeAtualizacao.getCorrecaoPrevidenciariaDosSalariosPagosDoINSS().booleanValue()) {
            this.parametrosDeAtualizacao.setAplicarAteDosSalariosPagosDoINSS(null);
            this.parametrosDeAtualizacao.setSalarioPagoFormaAplicacao(null);
        }
    }
}

