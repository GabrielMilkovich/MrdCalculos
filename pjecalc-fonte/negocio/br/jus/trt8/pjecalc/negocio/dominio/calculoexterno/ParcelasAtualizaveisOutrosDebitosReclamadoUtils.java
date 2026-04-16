/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.OcorrenciaDePagamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeAliquotaDoEmpregadorEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeAliquotaDoSeguradoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeConhecimentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeLiquidacaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCustasUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisUtils;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaInformada;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Constante;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Informada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ParcelasAtualizaveisOutrosDebitosReclamadoUtils
extends ParcelasAtualizaveisUtils {
    private static final String VALOR_DAS_PARCELAS = "Valor das Parcelas";
    private static final String VALOR_DAS_PARCELAS_A_PARTIR_DE_MAR_2009 = "Valor das Parcelas a partir de Mar/2009";
    private static final String VALOR_DAS_PARCELAS_VENCIDAS_ATE_FEV_2009 = "Valor das Parcelas Vencidas at\u00e9 Fev/2009";
    private static final String CONTRIBUICAO_SOCIAL_DEVIDO = "CONTRIBUI\u00c7\u00c3O SOCIAL SALARIOS DEVIDOS";
    private static final String CONTRIBUICAO_SOCIAL_PAGO = "CONTRIBUI\u00c7\u00c3O SOCIAL SALARIOS PAGOS";
    private static final BigDecimal CEM_PORCENTO = new BigDecimal("100");
    private static final BigDecimal UM_SOBRE_ZERO_VIRGULA_UM_PORCENTO = new BigDecimal("1000");

    public static void consistirDados(ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        List<MensagemDeRecurso> erros = ParcelasAtualizaveisOutrosDebitosReclamadoUtils.validarPreenchimentoFormulario(parcelasAtualizaveisOutrosDebitosReclamado);
        ParcelasAtualizaveisOutrosDebitosReclamadoUtils.lancarErros(erros);
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarMultaIndenizTerceiroReclamado().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setMultaIndenizTerceiroReclamado(new ParcelasAtualizaveisMultaIndenizacao());
            parcelasAtualizaveisOutrosDebitosReclamado.setListaMultasIndenizTerceiroReclamado(new ArrayList<ParcelasAtualizaveisMultaIndenizacao>());
        } else {
            for (ParcelasAtualizaveisMultaIndenizacao multa : parcelasAtualizaveisOutrosDebitosReclamado.getListaMultasIndenizTerceiroReclamado()) {
                multa.setTipoCredorDevedor(CredorDevedorMultaEnum.TERCEIRO_RECLAMADO);
                multa.setOutrosDebitosReclamado(parcelasAtualizaveisOutrosDebitosReclamado);
                multa.consistirDados();
            }
        }
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarHonorariosDevReclamado().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setHonorariosDevReclamado(new ParcelasAtualizaveisHonorario());
            parcelasAtualizaveisOutrosDebitosReclamado.setListaHonorariosDevReclamado(new ArrayList<ParcelasAtualizaveisHonorario>());
        } else {
            for (ParcelasAtualizaveisHonorario honorario : parcelasAtualizaveisOutrosDebitosReclamado.getListaHonorariosDevReclamado()) {
                honorario.setOutrosDebitosReclamado(parcelasAtualizaveisOutrosDebitosReclamado);
                honorario.consistirDados();
            }
        }
        ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirDadosContribSocialDevido(parcelasAtualizaveisOutrosDebitosReclamado);
        ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirDadosContribSocialPago(parcelasAtualizaveisOutrosDebitosReclamado);
        ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirDadosContribSocialFgts(parcelasAtualizaveisOutrosDebitosReclamado);
        ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirDadosPrevidenciaPrivada(parcelasAtualizaveisOutrosDebitosReclamado);
        ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirCustasConhecimentoReclamado(parcelasAtualizaveisOutrosDebitosReclamado);
        ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirCustasLiquidacao(parcelasAtualizaveisOutrosDebitosReclamado);
        ParcelasAtualizaveisOutrosDebitosReclamadoUtils.consistirCustasExecucao(parcelasAtualizaveisOutrosDebitosReclamado);
    }

    private static void consistirDadosContribSocialDevido(ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialSegurado().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setValorParcelasAteFev2009ContribSocialSegurado(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorJurosAteFev2009ContribSocialSegurado(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorParcelasAposFev2009ContribSocialSegurado(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorJurosAposFev2009ContribSocialSegurado(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorParcelaContribSocialSegurado(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorJurosContribSocialSegurado(null);
        }
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialPatronal().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setValorParcelasAteFev2009ContribSocialPatronal(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorJurosAteFev2009ContribSocialPatronal(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorParcelasAposFev2009ContribSocialPatronal(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorJurosAposFev2009ContribSocialPatronal(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorParcelaContribSocialPatronal(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorJurosContribSocialPatronal(null);
        }
        if ((parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialSegurado().booleanValue() || parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialPatronal().booleanValue()) && !parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getParametrosDeAtualizacao().getLei11941().booleanValue()) {
            BigDecimal valorTotalContribuicao = BigDecimal.ZERO;
            valorTotalContribuicao = Utils.somar(valorTotalContribuicao, parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelaContribSocialSegurado(), valorTotalContribuicao);
            valorTotalContribuicao = Utils.somar(valorTotalContribuicao, parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelaContribSocialPatronal(), valorTotalContribuicao);
            ParcelasAtualizaveisOutrosDebitosReclamadoUtils.configurarContribSocialDevido(valorTotalContribuicao, parcelasAtualizaveisOutrosDebitosReclamado);
        } else if ((parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialSegurado().booleanValue() || parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialPatronal().booleanValue()) && parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getParametrosDeAtualizacao().getLei11941().booleanValue()) {
            BigDecimal valorTotalContribuicaoAteFev2009 = BigDecimal.ZERO;
            valorTotalContribuicaoAteFev2009 = Utils.somar(valorTotalContribuicaoAteFev2009, parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialSegurado(), valorTotalContribuicaoAteFev2009);
            valorTotalContribuicaoAteFev2009 = Utils.somar(valorTotalContribuicaoAteFev2009, parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialPatronal(), valorTotalContribuicaoAteFev2009);
            BigDecimal valorTotalContribuicaoAposFev2009 = BigDecimal.ZERO;
            valorTotalContribuicaoAposFev2009 = Utils.somar(valorTotalContribuicaoAposFev2009, parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialSegurado(), valorTotalContribuicaoAposFev2009);
            valorTotalContribuicaoAposFev2009 = Utils.somar(valorTotalContribuicaoAposFev2009, parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialPatronal(), valorTotalContribuicaoAposFev2009);
            ParcelasAtualizaveisOutrosDebitosReclamadoUtils.configurarContribSocialDevido(valorTotalContribuicaoAteFev2009, parcelasAtualizaveisOutrosDebitosReclamado);
            VerbaDeCalculo verbaContribSocialDevidoAposFev2009 = ParcelasAtualizaveisOutrosDebitosReclamadoUtils.criarVerbaContribSocialDevido(valorTotalContribuicaoAposFev2009, Boolean.TRUE, parcelasAtualizaveisOutrosDebitosReclamado);
            parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().adicionar(verbaContribSocialDevidoAposFev2009);
        } else {
            ParcelasAtualizaveisOutrosDebitosReclamadoUtils.configurarContribSocialDevido(BigDecimal.ZERO, parcelasAtualizaveisOutrosDebitosReclamado);
        }
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarMultaContribSocialDevidos().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setDataInicialAteFev2009MultaContribSocialDevidos(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setDataInicialAposFev2009MultaContribSocialDevidos(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setDataInicialBaseMultaContribSocialDevidos(null);
        }
    }

    private static List<MensagemDeRecurso> validarPreenchimentoFormulario(ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        String idValorParcela;
        ParametrosDeAtualizacao parametrosDeAtualizacao = parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getParametrosDeAtualizacao();
        ArrayList<MensagemDeRecurso> erros = new ArrayList<MensagemDeRecurso>();
        ParcelasAtualizaveisOutrosDebitosReclamadoUtils.validarPreenchimentoContribuicaoSocialDevidos(parcelasAtualizaveisOutrosDebitosReclamado, parametrosDeAtualizacao, erros);
        ParcelasAtualizaveisOutrosDebitosReclamadoUtils.validarPreenchimentoContribuicaoSocialPagos(parcelasAtualizaveisOutrosDebitosReclamado, parametrosDeAtualizacao, erros);
        if (parcelasAtualizaveisOutrosDebitosReclamado.getMarcarJurosPrevidenciaPrivada().booleanValue() && parcelasAtualizaveisOutrosDebitosReclamado.getValorJurosPrevidenciaPrivada() == null) {
            erros.add(new MensagemDeRecurso("valorJurosPrevidenciaPrivadaOutrosDeb", Mensagens.MSG0003, "Valor dos Juros"));
        }
        if (parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocial10().booleanValue() && parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelaContribSocial10() == null) {
            erros.add(new MensagemDeRecurso("valorParcelaOutrosDebContribSocial10", Mensagens.MSG0003, "Valor da Parcela"));
        }
        if (parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocial05().booleanValue() && parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelaContribSocial05() == null) {
            erros.add(new MensagemDeRecurso("valorParcelaOutrosDebContribSocial05", Mensagens.MSG0003, "Valor da Parcela"));
        }
        if (parcelasAtualizaveisOutrosDebitosReclamado.getMarcarCustasConhecimentoReclamado().booleanValue()) {
            BigDecimal pisoReclamado;
            idValorParcela = "valorParcelaOutrosDebCustasConhecimentoReclamado";
            erros.addAll(ParcelasAtualizaveisCustasUtils.validarPreenchimentoFormulario(parcelasAtualizaveisOutrosDebitosReclamado.getCustasConhecimentoReclamado(), idValorParcela));
            if (parcelasAtualizaveisOutrosDebitosReclamado.getCustasConhecimentoReclamado().getTipoValor() == TipoValorEnum.INFORMADO && parcelasAtualizaveisOutrosDebitosReclamado.getCustasConhecimentoReclamado().getValorParcelaInformado() != null && Utils.naoNulo(pisoReclamado = parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().obterValorParaValidacao(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getDataDeLiquidacao(), parcelasAtualizaveisOutrosDebitosReclamado.getCustasConhecimentoReclamado().getValorParcelaInformado(), 1))) {
                erros.add(new MensagemDeRecurso(idValorParcela, Mensagens.MSG0052, Utils.formatarNumero(pisoReclamado)));
            }
        }
        if (parcelasAtualizaveisOutrosDebitosReclamado.getMarcarCustasLiquidacao().booleanValue()) {
            BigDecimal tetoLiquidacao;
            idValorParcela = "valorParcelaOutrosDebCustasLiquidacao";
            erros.addAll(ParcelasAtualizaveisCustasUtils.validarPreenchimentoFormulario(parcelasAtualizaveisOutrosDebitosReclamado.getCustasLiquidacao(), idValorParcela));
            if (parcelasAtualizaveisOutrosDebitosReclamado.getCustasLiquidacao().getTipoValor() == TipoValorEnum.INFORMADO && parcelasAtualizaveisOutrosDebitosReclamado.getCustasLiquidacao().getValorParcelaInformado() != null && Utils.naoNulo(tetoLiquidacao = parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().obterValorParaValidacao(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getDataDeLiquidacao(), parcelasAtualizaveisOutrosDebitosReclamado.getCustasLiquidacao().getValorParcelaInformado(), 3))) {
                erros.add(new MensagemDeRecurso(idValorParcela, Mensagens.MSG0054, Utils.formatarNumero(tetoLiquidacao)));
            }
        }
        if (parcelasAtualizaveisOutrosDebitosReclamado.getMarcarCustasExecucao().booleanValue()) {
            erros.addAll(ParcelasAtualizaveisCustasUtils.validarPreenchimentoFormulario(parcelasAtualizaveisOutrosDebitosReclamado.getCustasExecucao(), "valorParcelaOutrosDebCustasExecucao"));
        }
        return erros;
    }

    private static void validarPreenchimentoContribuicaoSocialPagos(ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado, ParametrosDeAtualizacao parametrosDeAtualizacao, List<MensagemDeRecurso> erros) {
        if (parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialPagos().booleanValue()) {
            if (parametrosDeAtualizacao.getLei11941Pago().booleanValue()) {
                if (parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialPagos() == null && parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialPagos() == null) {
                    erros.add(new MensagemDeRecurso(Mensagens.MSG0172, "Contribui\u00e7\u00e3o Social Sal\u00e1rios Pagos (pacto)", VALOR_DAS_PARCELAS_VENCIDAS_ATE_FEV_2009, VALOR_DAS_PARCELAS_A_PARTIR_DE_MAR_2009));
                }
            } else if (parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelaContribSocialPagos() == null) {
                erros.add(new MensagemDeRecurso("valorParcelaContribSocialPagosOutrosDeb", Mensagens.MSG0003, VALOR_DAS_PARCELAS));
            }
        }
        if (parcelasAtualizaveisOutrosDebitosReclamado.getMarcarMultaContribSocialPagos().booleanValue()) {
            if (parametrosDeAtualizacao.getLei11941Pago().booleanValue()) {
                if (parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialAteFev2009MultaContribSocialPagos() == null && parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialAposFev2009MultaContribSocialPagos() == null) {
                    erros.add(new MensagemDeRecurso(Mensagens.MSG0172, "Multa sobre Contribui\u00e7\u00e3o Social Sal\u00e1rios Pagos", "Data Inicial das Parcelas Vencidas at\u00e9 Fev/2009", "Data Inicial das Parcelas a partir de Mar/2009"));
                }
            } else if (parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialBaseMultaContribSocialPagos() == null) {
                erros.add(new MensagemDeRecurso("dataInicialBaseMultaContribSocialPagosOutrosDeb", Mensagens.MSG0003, "Data Inicial"));
            }
            if (parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialAposFev2009MultaContribSocialPagos() != null && parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialPagos() == null) {
                erros.add(new MensagemDeRecurso("valorParcelasAposFev2009ContribSocialPagosOutrosDeb", Mensagens.MSG0003, VALOR_DAS_PARCELAS_A_PARTIR_DE_MAR_2009));
            }
            if (parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialAteFev2009MultaContribSocialPagos() != null && parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialPagos() == null) {
                erros.add(new MensagemDeRecurso("valorParcelasAteFev2009ContribSocialPagosOutrosDeb", Mensagens.MSG0003, VALOR_DAS_PARCELAS_VENCIDAS_ATE_FEV_2009));
            }
        }
        if (parametrosDeAtualizacao.getLei11941Pago().booleanValue() && parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialPagos().booleanValue() && Utils.nulos(parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialPagos(), parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialPagos())) {
            erros.add(new MensagemDeRecurso("valorParcelasAteFev2009ContribSocialPagosOutrosDeb", Mensagens.MSG0104, "de parcela de Contribui\u00e7\u00e3o Social Sal\u00e1rios Pagos"));
            erros.add(new MensagemDeRecurso("valorParcelasAposFev2009ContribSocialPagosOutrosDeb", Mensagens.MSG0104, "de parcela de Contribui\u00e7\u00e3o Social Sal\u00e1rios Pagos"));
        }
        if (parametrosDeAtualizacao.getLei11941Pago().booleanValue() && parcelasAtualizaveisOutrosDebitosReclamado.getMarcarMultaContribSocialPagos().booleanValue() && Utils.nulos(parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialAteFev2009MultaContribSocialPagos(), parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialAposFev2009MultaContribSocialPagos())) {
            erros.add(new MensagemDeRecurso("dataInicialAteFev2009MultaContribSocialPagos", Mensagens.MSG0104, "de data inicial para multa de Contribui\u00e7\u00e3o Social Sal\u00e1rios Pagos"));
            erros.add(new MensagemDeRecurso("dataInicialAposFev2009MultaContribSocialPagos", Mensagens.MSG0104, "de data inicial para multa de Contribui\u00e7\u00e3o Social Sal\u00e1rios Pagos"));
        }
    }

    private static void validarPreenchimentoContribuicaoSocialDevidos(ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado, ParametrosDeAtualizacao parametrosDeAtualizacao, List<MensagemDeRecurso> erros) {
        if (parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialSegurado().booleanValue()) {
            if (parametrosDeAtualizacao.getLei11941().booleanValue()) {
                if (parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialSegurado() == null && parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialSegurado() == null) {
                    erros.add(new MensagemDeRecurso(Mensagens.MSG0172, "Contribui\u00e7\u00e3o Social Segurado Sal\u00e1rios Devidos (recolher a previd\u00eancia)", VALOR_DAS_PARCELAS_VENCIDAS_ATE_FEV_2009, VALOR_DAS_PARCELAS_A_PARTIR_DE_MAR_2009));
                }
            } else if (parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelaContribSocialSegurado() == null) {
                erros.add(new MensagemDeRecurso("valorParcelaContribSocialSeguradoOutrosDeb", Mensagens.MSG0003, VALOR_DAS_PARCELAS));
            }
        }
        if (parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialPatronal().booleanValue()) {
            if (parametrosDeAtualizacao.getLei11941().booleanValue()) {
                if (parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialPatronal() == null && parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialPatronal() == null) {
                    erros.add(new MensagemDeRecurso(Mensagens.MSG0172, "Contribui\u00e7\u00e3o Social Patronal Sal\u00e1rios Devidos", VALOR_DAS_PARCELAS_VENCIDAS_ATE_FEV_2009, VALOR_DAS_PARCELAS_A_PARTIR_DE_MAR_2009));
                }
            } else if (parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelaContribSocialPatronal() == null) {
                erros.add(new MensagemDeRecurso("valorParcelaContribSocialPatronalOutrosDeb", Mensagens.MSG0003, VALOR_DAS_PARCELAS));
            }
        }
        if (parcelasAtualizaveisOutrosDebitosReclamado.getMarcarMultaContribSocialDevidos().booleanValue()) {
            if (parametrosDeAtualizacao.getLei11941().booleanValue()) {
                if (parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialAteFev2009MultaContribSocialDevidos() == null && parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialAposFev2009MultaContribSocialDevidos() == null) {
                    erros.add(new MensagemDeRecurso(Mensagens.MSG0172, "Multa sobre Contribui\u00e7\u00e3o Social Sal\u00e1rios Devidos", "Data Inicial das Parcelas Vencidas at\u00e9 Fev/2009", "Data Inicial das Parcelas a partir de Mar/2009"));
                }
            } else if (parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialBaseMultaContribSocialDevidos() == null) {
                erros.add(new MensagemDeRecurso("dataInicialBaseMultaContribSocialDevidosOutrosDeb", Mensagens.MSG0003, "Data Inicial"));
            }
            if (parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialAposFev2009MultaContribSocialDevidos() != null && parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialSegurado() == null && parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialPatronal() == null) {
                erros.add(new MensagemDeRecurso(Mensagens.MSG0172, "Contribui\u00e7\u00e3o Social Sal\u00e1rios Devidos (Segurado ou Patronal)", VALOR_DAS_PARCELAS_A_PARTIR_DE_MAR_2009, VALOR_DAS_PARCELAS_A_PARTIR_DE_MAR_2009));
                erros.add(new MensagemDeRecurso("valorParcelasAposFev2009ContribSocialSeguradoOutrosDeb", Mensagens.MSG0003, VALOR_DAS_PARCELAS_A_PARTIR_DE_MAR_2009));
                erros.add(new MensagemDeRecurso("valorParcelasAposFev2009ContribSocialPatronalOutrosDeb", Mensagens.MSG0003, VALOR_DAS_PARCELAS_A_PARTIR_DE_MAR_2009));
            }
            if (parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialAteFev2009MultaContribSocialDevidos() != null && parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialSegurado() == null && parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialPatronal() == null) {
                erros.add(new MensagemDeRecurso(Mensagens.MSG0172, "Contribui\u00e7\u00e3o Social Sal\u00e1rios Devidos (Segurado ou Patronal)", VALOR_DAS_PARCELAS_VENCIDAS_ATE_FEV_2009, VALOR_DAS_PARCELAS_VENCIDAS_ATE_FEV_2009));
                erros.add(new MensagemDeRecurso("valorParcelasAteFev2009ContribSocialSeguradoOutrosDeb", Mensagens.MSG0003, VALOR_DAS_PARCELAS_VENCIDAS_ATE_FEV_2009));
                erros.add(new MensagemDeRecurso("valorParcelasAteFev2009ContribSocialPatronalOutrosDeb", Mensagens.MSG0003, VALOR_DAS_PARCELAS_VENCIDAS_ATE_FEV_2009));
            }
        }
        if (parametrosDeAtualizacao.getLei11941().booleanValue() && parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialSegurado().booleanValue() && Utils.nulos(parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialSegurado(), parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialSegurado())) {
            erros.add(new MensagemDeRecurso("valorParcelasAteFev2009ContribSocialSeguradoOutrosDeb", Mensagens.MSG0104, "de parcela de Contribui\u00e7\u00e3o Social Segurado"));
            erros.add(new MensagemDeRecurso("valorParcelasAposFev2009ContribSocialSeguradoOutrosDeb", Mensagens.MSG0104, "de parcela de Contribui\u00e7\u00e3o Social Segurado"));
        }
        if (parametrosDeAtualizacao.getLei11941().booleanValue() && parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialPatronal().booleanValue() && Utils.nulos(parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialPatronal(), parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialPatronal())) {
            erros.add(new MensagemDeRecurso("valorParcelasAteFev2009ContribSocialPatronalOutrosDeb", Mensagens.MSG0104, "de parcela de Contribui\u00e7\u00e3o Social Patronal"));
            erros.add(new MensagemDeRecurso("valorParcelasAposFev2009ContribSocialPatronalOutrosDeb", Mensagens.MSG0104, "de parcela de Contribui\u00e7\u00e3o Social Patronal"));
        }
        if (parametrosDeAtualizacao.getLei11941().booleanValue() && parcelasAtualizaveisOutrosDebitosReclamado.getMarcarMultaContribSocialDevidos().booleanValue() && Utils.nulos(parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialAteFev2009MultaContribSocialDevidos(), parcelasAtualizaveisOutrosDebitosReclamado.getDataInicialAposFev2009MultaContribSocialDevidos())) {
            erros.add(new MensagemDeRecurso("dataInicialAteFev2009MultaContribSocialDevidos", Mensagens.MSG0104, "de data inicial para multa de Contribui\u00e7\u00e3o Social Sal\u00e1rios Devidos"));
            erros.add(new MensagemDeRecurso("dataInicialAposFev2009MultaContribSocialDevidos", Mensagens.MSG0104, "de data inicial para multa de Contribui\u00e7\u00e3o Social Sal\u00e1rios Devidos"));
        }
    }

    private static void configurarContribSocialDevido(BigDecimal valorTotalContribuicao, ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        VerbaDeCalculo verbaContribSocialDevido = ParcelasAtualizaveisOutrosDebitosReclamadoUtils.criarVerbaContribSocialDevido(valorTotalContribuicao, Boolean.FALSE, parcelasAtualizaveisOutrosDebitosReclamado);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().adicionar(verbaContribSocialDevido);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setTipoAliquotaSegurado(TipoDeAliquotaDoSeguradoEnum.FIXA);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setAliquotaSeguradoFixa(BigDecimal.ZERO);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setTipoAliquotaEmpregador(TipoDeAliquotaDoEmpregadorEnum.FIXA);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setAliquotaEmpresaFixa(CEM_PORCENTO);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setAliquotaRATFixa(BigDecimal.ZERO);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setAliquotaTerceirosFixa(BigDecimal.ZERO);
    }

    private static VerbaDeCalculo criarVerbaContribSocialDevido(BigDecimal valor, Boolean decimoTerceiro, ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        Informada verba = new Informada(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno());
        verba.setNome(CONTRIBUICAO_SOCIAL_DEVIDO);
        verba.setDescricao(verba.getNome());
        verba.setAssuntoCnj(parcelasAtualizaveisOutrosDebitosReclamado.obterAssuntoCnjParaVerbas());
        verba.setCaracteristica(decimoTerceiro != false ? CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO : CaracteristicaDaVerbaEnum.COMUM);
        verba.setOcorrenciaDePagamento(decimoTerceiro != false ? OcorrenciaDePagamentoEnum.DEZEMBRO : OcorrenciaDePagamentoEnum.MENSAL);
        verba.setIncidenciaIRPF(Boolean.FALSE);
        verba.setIncidenciaINSS(Boolean.TRUE);
        verba.setComporPrincipal(LogicoEnum.NAO);
        verba.setPeriodoInicial(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getDataDeLiquidacao());
        verba.setPeriodoFinal(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getDataDeLiquidacao());
        verba.setExcluirFaltaNaoJustificada(Boolean.FALSE);
        verba.setExcluirFeriasGozadas(Boolean.FALSE);
        verba.setAplicarProporcionalidade(Boolean.FALSE);
        FormulaInformada formulaInformada = new FormulaInformada();
        Constante constante = new Constante();
        constante.setValor(valor);
        formulaInformada.setConstante(constante);
        verba.setFormula(formulaInformada);
        verba.setAtivo(true);
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getParametrosDeAtualizacao().getIndiceTrabalhista(), parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getIndicesAcumulados(), verba.getOcorrenciaDePagamento(), parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getIgnorarTaxaCorrecaoNegativa());
        verba.setTabelaDeCorrecaoMonetariaTrabalhista(tabelaDeCorrecaoMonetariaTrabalhista);
        verba.gerarOcorrencias(false);
        return verba;
    }

    private static void consistirDadosContribSocialPago(ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocialPagos().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setValorParcelasAteFev2009ContribSocialPagos(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorJurosAteFev2009ContribSocialPagos(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorParcelasAposFev2009ContribSocialPagos(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorJurosAposFev2009ContribSocialPagos(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorParcelaContribSocialPagos(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setValorJurosContribSocialPagos(null);
        } else if (!parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getParametrosDeAtualizacao().getLei11941Pago().booleanValue()) {
            BigDecimal valorTotalContribuicao = Utils.naoNulo(parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelaContribSocialPagos()) ? parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelaContribSocialPagos() : BigDecimal.ZERO;
            ParcelasAtualizaveisOutrosDebitosReclamadoUtils.configurarContribSocialPago(valorTotalContribuicao, parcelasAtualizaveisOutrosDebitosReclamado);
            parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().gerarOcorrencias();
            for (OcorrenciaDeInssSobreSalariosPagos ocorrenciaPago : parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().getInssSobreSalariosPagos().getOcorrencias()) {
                if (!ocorrenciaPago.getOcorrenciaDecimoTerceiro().booleanValue()) continue;
                ocorrenciaPago.setValorBase(BigDecimal.ZERO);
                ocorrenciaPago.setTipoValorDaBase(TipoValorEnum.INFORMADO);
            }
        } else {
            BigDecimal valorTotalContribuicaoAteFev2009 = Utils.naoNulo(parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialPagos()) ? parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAteFev2009ContribSocialPagos() : BigDecimal.ZERO;
            BigDecimal valorTotalContribuicaoAposFev2009 = Utils.naoNulo(parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialPagos()) ? parcelasAtualizaveisOutrosDebitosReclamado.getValorParcelasAposFev2009ContribSocialPagos() : BigDecimal.ZERO;
            ParcelasAtualizaveisOutrosDebitosReclamadoUtils.configurarContribSocialPago(valorTotalContribuicaoAteFev2009, parcelasAtualizaveisOutrosDebitosReclamado);
            parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().gerarOcorrencias();
            for (OcorrenciaDeInssSobreSalariosPagos ocorrenciaPago : parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().getInssSobreSalariosPagos().getOcorrencias()) {
                if (!ocorrenciaPago.getOcorrenciaDecimoTerceiro().booleanValue()) continue;
                ocorrenciaPago.setValorBase(valorTotalContribuicaoAposFev2009);
                ocorrenciaPago.setTipoValorDaBase(TipoValorEnum.INFORMADO);
            }
            for (OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDevido : parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().getInssSobreSalariosDevidos().getOcorrencias()) {
                if (!ocorrenciaDevido.getOcorrenciaDecimoTerceiro().booleanValue()) continue;
                ocorrenciaDevido.setValorBase(BigDecimal.ZERO);
                ocorrenciaDevido.setTipoValorDaBase(TipoValorEnum.INFORMADO);
            }
        }
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarMultaContribSocialPagos().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setDataInicialAteFev2009MultaContribSocialPagos(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setDataInicialAposFev2009MultaContribSocialPagos(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setDataInicialBaseMultaContribSocialPagos(null);
        }
    }

    private static void configurarContribSocialPago(BigDecimal valorTotalContribuicao, ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        HistoricoSalarial historicoSalarialContribuicaoSocialPagos = ParcelasAtualizaveisOutrosDebitosReclamadoUtils.criarHistoricoSalarialContribuicaoSocialPagos(valorTotalContribuicao, parcelasAtualizaveisOutrosDebitosReclamado);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getHistoricosSalariais().add(historicoSalarialContribuicaoSocialPagos);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setApurarInssSobreSalariosPagos(Boolean.TRUE);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setTipoAliquotaSegurado(TipoDeAliquotaDoSeguradoEnum.FIXA);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setAliquotaSeguradoFixa(BigDecimal.ZERO);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setTipoAliquotaEmpregador(TipoDeAliquotaDoEmpregadorEnum.FIXA);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setAliquotaEmpresaFixa(CEM_PORCENTO);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setAliquotaRATFixa(BigDecimal.ZERO);
        parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getInss().setAliquotaTerceirosFixa(BigDecimal.ZERO);
    }

    private static HistoricoSalarial criarHistoricoSalarialContribuicaoSocialPagos(BigDecimal valorContribuicao, ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        HistoricoSalarial historicoSalarialContribuicaoSocialPagos = new HistoricoSalarial();
        historicoSalarialContribuicaoSocialPagos.setNome(CONTRIBUICAO_SOCIAL_PAGO);
        historicoSalarialContribuicaoSocialPagos.setIncidenciaFGTS(Boolean.FALSE);
        historicoSalarialContribuicaoSocialPagos.setAplicarProporcionalidadeFGTS(Boolean.FALSE);
        historicoSalarialContribuicaoSocialPagos.setIncidenciaINSS(Boolean.TRUE);
        historicoSalarialContribuicaoSocialPagos.setAplicarProporcionalidadeINSS(Boolean.FALSE);
        historicoSalarialContribuicaoSocialPagos.setValorParaBaseDeCalculo(valorContribuicao);
        historicoSalarialContribuicaoSocialPagos.setCalculo(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno());
        historicoSalarialContribuicaoSocialPagos.setCompetenciaInicial(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getDataDeLiquidacao());
        historicoSalarialContribuicaoSocialPagos.setCompetenciaFinal(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getDataDeLiquidacao());
        historicoSalarialContribuicaoSocialPagos.gerarOcorrencias();
        historicoSalarialContribuicaoSocialPagos.salvar(false);
        return historicoSalarialContribuicaoSocialPagos;
    }

    private static void consistirDadosContribSocialFgts(ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocial10().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setValorParcelaContribSocial10(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setIndiceTrabalhistaContribSocial10(null);
            parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getFgts().setMulta10(Boolean.FALSE);
        } else {
            parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getFgts().setMulta10(Boolean.TRUE);
        }
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarContribSocial05().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setValorParcelaContribSocial05(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setIndiceTrabalhistaContribSocial05(null);
            parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getFgts().setContribuicaoSocial05(Boolean.FALSE);
        } else {
            parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getFgts().setContribuicaoSocial05(Boolean.TRUE);
        }
    }

    private static void consistirCustasConhecimentoReclamado(ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarCustasConhecimentoReclamado().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setCustasConhecimentoReclamado(null);
            parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().setTipoDeCustasDeConhecimentoDoReclamado(TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA);
        } else {
            switch (parcelasAtualizaveisOutrosDebitosReclamado.getCustasConhecimentoReclamado().getTipoValor()) {
                case CALCULADO: {
                    parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().setTipoDeCustasDeConhecimentoDoReclamado(TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO);
                    break;
                }
                case INFORMADO: {
                    parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().setTipoDeCustasDeConhecimentoDoReclamado(TipoDeCustasDeConhecimentoEnum.INFORMADA);
                    parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().setDataVencimentoConhecimentoDoReclamado(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getDataDeLiquidacao());
                    parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().setValorConhecimentoDoReclamado(parcelasAtualizaveisOutrosDebitosReclamado.getCustasConhecimentoReclamado().getValorParcelaInformado());
                    break;
                }
            }
        }
    }

    private static void consistirCustasLiquidacao(ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarCustasLiquidacao().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setCustasLiquidacao(null);
            parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().setTipoDeCustasDeLiquidacao(TipoDeCustasDeLiquidacaoEnum.NAO_SE_APLICA);
        } else {
            switch (parcelasAtualizaveisOutrosDebitosReclamado.getCustasLiquidacao().getTipoValor()) {
                case CALCULADO: {
                    parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().setTipoDeCustasDeLiquidacao(TipoDeCustasDeLiquidacaoEnum.CALCULADA_MEIO_POR_CENTO);
                    break;
                }
                case INFORMADO: {
                    parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().setTipoDeCustasDeLiquidacao(TipoDeCustasDeLiquidacaoEnum.INFORMADA);
                    parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().setDataVencimentoCustasDeLiquidacao(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getDataDeLiquidacao());
                    parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().setValorCustasDeLiquidacao(parcelasAtualizaveisOutrosDebitosReclamado.getCustasLiquidacao().getValorParcelaInformado());
                    break;
                }
            }
        }
    }

    private static void consistirCustasExecucao(ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarCustasExecucao().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setCustasExecucao(null);
        } else {
            Armazenamento custaArmazenamento = new Armazenamento();
            custaArmazenamento.setDataInicioArmazenamento(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getDataDeLiquidacao());
            custaArmazenamento.setDataTerminoArmazenamento(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getDataDeLiquidacao());
            custaArmazenamento.setOrigemRegistro(TipoOrigemRegistroEnum.CALCULO);
            custaArmazenamento.setValorAvaliacaoArmazenamento(Utils.multiplicar(parcelasAtualizaveisOutrosDebitosReclamado.getCustasExecucao().getValorParcelaInformado(), UM_SOBRE_ZERO_VIRGULA_UM_PORCENTO));
            custaArmazenamento.setCustasJudiciais(parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais());
            parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getCustasJudiciais().getArmazenamentos().add(custaArmazenamento);
        }
    }

    private static void consistirDadosPrevidenciaPrivada(ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado) {
        if (!parcelasAtualizaveisOutrosDebitosReclamado.getMarcarJurosPrevidenciaPrivada().booleanValue()) {
            parcelasAtualizaveisOutrosDebitosReclamado.setValorJurosPrevidenciaPrivada(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setIndiceTrabalhistaInformadoPrevidenciaPrivada(null);
            parcelasAtualizaveisOutrosDebitosReclamado.setAplicarJurosPrevidenciaPrivada(null);
            parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getParametrosDeAtualizacao().setJurosDePrevidenciaPrivada(Boolean.FALSE);
        } else {
            parcelasAtualizaveisOutrosDebitosReclamado.getCalculoExterno().getParametrosDeAtualizacao().setJurosDePrevidenciaPrivada(Utils.naoNulo(parcelasAtualizaveisOutrosDebitosReclamado.getAplicarJurosPrevidenciaPrivada()) ? parcelasAtualizaveisOutrosDebitosReclamado.getAplicarJurosPrevidenciaPrivada() : Boolean.FALSE);
        }
    }
}

