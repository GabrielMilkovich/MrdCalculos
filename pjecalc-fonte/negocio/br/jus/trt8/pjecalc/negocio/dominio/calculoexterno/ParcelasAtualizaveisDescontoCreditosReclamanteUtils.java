/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.OcorrenciaDePagamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeConhecimentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOrigemRegistroEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.AliquotaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCustasUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisUtils;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaInformada;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Constante;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Informada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ParcelasAtualizaveisDescontoCreditosReclamanteUtils
extends ParcelasAtualizaveisUtils {
    private static final String PREVIDENCIA_PRIVADA = "PREVID\u00caNCIA PRIVADA";

    public static void consistirDados(ParcelasAtualizaveisDescontoCreditosReclamante parcelasAtualizaveisDescontoCreditosReclamante) {
        List<MensagemDeRecurso> erros = ParcelasAtualizaveisDescontoCreditosReclamanteUtils.validarPreenchimentoFormulario(parcelasAtualizaveisDescontoCreditosReclamante);
        ParcelasAtualizaveisDescontoCreditosReclamanteUtils.lancarErros(erros);
        if (!parcelasAtualizaveisDescontoCreditosReclamante.getMarcarMultaIndenizTerceiroReclamante().booleanValue()) {
            parcelasAtualizaveisDescontoCreditosReclamante.setMultaIndenizTerceiroReclamante(new ParcelasAtualizaveisMultaIndenizacao());
            parcelasAtualizaveisDescontoCreditosReclamante.setListaMultasIndenizTerceiroReclamante(new ArrayList<ParcelasAtualizaveisMultaIndenizacao>());
        } else {
            for (ParcelasAtualizaveisMultaIndenizacao multa : parcelasAtualizaveisDescontoCreditosReclamante.getListaMultasIndenizTerceiroReclamante()) {
                multa.setTipoCredorDevedor(CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE);
                multa.setDescontoCreditosReclamante(parcelasAtualizaveisDescontoCreditosReclamante);
                multa.consistirDados();
            }
        }
        if (!parcelasAtualizaveisDescontoCreditosReclamante.getMarcarHonorariosDevReclamante().booleanValue()) {
            parcelasAtualizaveisDescontoCreditosReclamante.setHonorariosDevReclamante(new ParcelasAtualizaveisHonorario());
            parcelasAtualizaveisDescontoCreditosReclamante.setListaHonorariosDevReclamante(new ArrayList<ParcelasAtualizaveisHonorario>());
        } else {
            for (ParcelasAtualizaveisHonorario honorario : parcelasAtualizaveisDescontoCreditosReclamante.getListaHonorariosDevReclamante()) {
                honorario.setDescontoCreditosReclamante(parcelasAtualizaveisDescontoCreditosReclamante);
                honorario.consistirDados();
            }
        }
        if (!parcelasAtualizaveisDescontoCreditosReclamante.getMarcarContribSocialSegurado().booleanValue()) {
            parcelasAtualizaveisDescontoCreditosReclamante.setValorParcelaContribSocialSegurado(null);
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getInss().getInssSobreSalariosDevidos().setCorrigirDescontoReclamante(Boolean.TRUE);
        } else {
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getInss().getInssSobreSalariosDevidos().setCorrigirDescontoReclamante(parcelasAtualizaveisDescontoCreditosReclamante.getCorrigirDescontoReclamante());
        }
        ParcelasAtualizaveisDescontoCreditosReclamanteUtils.consistirPrevidenciaPrivada(parcelasAtualizaveisDescontoCreditosReclamante);
        ParcelasAtualizaveisDescontoCreditosReclamanteUtils.consistirPensaoAlimenticia(parcelasAtualizaveisDescontoCreditosReclamante);
        ParcelasAtualizaveisDescontoCreditosReclamanteUtils.consistirCustasConhecimentoReclamante(parcelasAtualizaveisDescontoCreditosReclamante);
    }

    private static List<MensagemDeRecurso> validarPreenchimentoFormulario(ParcelasAtualizaveisDescontoCreditosReclamante parcelasAtualizaveisDescontoCreditosReclamante) {
        ArrayList<MensagemDeRecurso> erros = new ArrayList<MensagemDeRecurso>();
        if (parcelasAtualizaveisDescontoCreditosReclamante.getMarcarContribSocialSegurado().booleanValue() && parcelasAtualizaveisDescontoCreditosReclamante.getValorParcelaContribSocialSegurado() == null) {
            erros.add(new MensagemDeRecurso("valorParcelaDescCredReclamContribSocialSegurado", Mensagens.MSG0003, "Valor da Parcela"));
        }
        if (parcelasAtualizaveisDescontoCreditosReclamante.getMarcarPrevidenciaPrivada().booleanValue() && parcelasAtualizaveisDescontoCreditosReclamante.getValorParcelaPrevidenciaPrivada() == null) {
            erros.add(new MensagemDeRecurso("valorParcelaDescCredReclamPrevidenciaPrivada", Mensagens.MSG0003, "Valor da Parcela"));
        }
        if (parcelasAtualizaveisDescontoCreditosReclamante.getMarcarPensaoAlimenticia().booleanValue()) {
            if (parcelasAtualizaveisDescontoCreditosReclamante.getAliquotaPensaoAlimenticia() == null) {
                erros.add(new MensagemDeRecurso("aliquotaPensaoAlimenticia", Mensagens.MSG0003, "Al\u00edquota"));
            }
            if (!(parcelasAtualizaveisDescontoCreditosReclamante.getIncidirSobrePrincipalTributavelPensaoAlimenticia().booleanValue() || parcelasAtualizaveisDescontoCreditosReclamante.getIncidirSobrePrincipalNaoTributavelPensaoAlimenticia().booleanValue() || parcelasAtualizaveisDescontoCreditosReclamante.getIncidirSobreFgtsPensaoAlimenticia().booleanValue())) {
                erros.add(new MensagemDeRecurso(Mensagens.MSG0171, new Object[0]));
            } else {
                if (parcelasAtualizaveisDescontoCreditosReclamante.getIncidirSobrePrincipalTributavelPensaoAlimenticia().booleanValue() && parcelasAtualizaveisDescontoCreditosReclamante.getPercPrincipalTributavelPensaoAlimenticia() == null) {
                    erros.add(new MensagemDeRecurso("percPrincipalTribPensaoAliment", Mensagens.MSG0003, "Percentual Principal Tribut\u00e1vel"));
                }
                if (parcelasAtualizaveisDescontoCreditosReclamante.getIncidirSobrePrincipalNaoTributavelPensaoAlimenticia().booleanValue() && parcelasAtualizaveisDescontoCreditosReclamante.getPercPrincipalNaoTributavelPensaoAlimenticia() == null) {
                    erros.add(new MensagemDeRecurso("percPrincipalNaoTribPensaoAliment", Mensagens.MSG0003, "Percentual Principal N\u00e3o Tribut\u00e1vel"));
                }
            }
        }
        if (parcelasAtualizaveisDescontoCreditosReclamante.getMarcarCustasConhecimentoReclamante().booleanValue()) {
            BigDecimal pisoReclamante;
            String idValorParcela = "valorParcelaDescCredReclamCustasDevReclamante";
            erros.addAll(ParcelasAtualizaveisCustasUtils.validarPreenchimentoFormulario(parcelasAtualizaveisDescontoCreditosReclamante.getCustasConhecimentoReclamante(), idValorParcela));
            if (parcelasAtualizaveisDescontoCreditosReclamante.getCustasConhecimentoReclamante().getTipoValor() == TipoValorEnum.INFORMADO && parcelasAtualizaveisDescontoCreditosReclamante.getCustasConhecimentoReclamante().getValorParcelaInformado() != null && Utils.naoNulo(pisoReclamante = parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getCustasJudiciais().obterValorParaValidacao(parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getDataDeLiquidacao(), parcelasAtualizaveisDescontoCreditosReclamante.getCustasConhecimentoReclamante().getValorParcelaInformado(), 2))) {
                erros.add(new MensagemDeRecurso(idValorParcela, Mensagens.MSG0052, Utils.formatarNumero(pisoReclamante)));
            }
        }
        return erros;
    }

    private static void consistirPensaoAlimenticia(ParcelasAtualizaveisDescontoCreditosReclamante parcelasAtualizaveisDescontoCreditosReclamante) {
        if (!parcelasAtualizaveisDescontoCreditosReclamante.getMarcarPensaoAlimenticia().booleanValue()) {
            parcelasAtualizaveisDescontoCreditosReclamante.setAliquotaPensaoAlimenticia(null);
            parcelasAtualizaveisDescontoCreditosReclamante.setAplicarJurosPensaoAlimenticia(false);
            parcelasAtualizaveisDescontoCreditosReclamante.setPercPrincipalTributavelPensaoAlimenticia(null);
            parcelasAtualizaveisDescontoCreditosReclamante.setPercPrincipalNaoTributavelPensaoAlimenticia(null);
            parcelasAtualizaveisDescontoCreditosReclamante.setIncidirSobrePrincipalTributavelPensaoAlimenticia(false);
            parcelasAtualizaveisDescontoCreditosReclamante.setIncidirSobrePrincipalNaoTributavelPensaoAlimenticia(false);
            parcelasAtualizaveisDescontoCreditosReclamante.setIncidirSobreFgtsPensaoAlimenticia(false);
            parcelasAtualizaveisDescontoCreditosReclamante.setIncidirSobreMultaPensaoAlimenticia(false);
            if (TipoOrigemRegistroEnum.CALCULO.equals((Object)parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPensaoAlimenticia().getOrigemRegistro())) {
                parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPensaoAlimenticia().setApurarPensaoAlimenticia(Boolean.FALSE);
            }
        } else {
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPensaoAlimenticia().setApurarPensaoAlimenticia(Boolean.TRUE);
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPensaoAlimenticia().setAliquota(parcelasAtualizaveisDescontoCreditosReclamante.getAliquotaPensaoAlimenticia());
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPensaoAlimenticia().setOrigemRegistro(TipoOrigemRegistroEnum.CALCULO);
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPensaoAlimenticia().setIncidirSobreJuros(parcelasAtualizaveisDescontoCreditosReclamante.getAplicarJurosPensaoAlimenticia());
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPensaoAlimenticia().setIncidirSobrePrincipalTributavel(parcelasAtualizaveisDescontoCreditosReclamante.getIncidirSobrePrincipalTributavelPensaoAlimenticia());
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPensaoAlimenticia().setIncidirSobrePrincipalNaoTributavel(parcelasAtualizaveisDescontoCreditosReclamante.getIncidirSobrePrincipalNaoTributavelPensaoAlimenticia());
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPensaoAlimenticia().setPercPrincipalTributavel(parcelasAtualizaveisDescontoCreditosReclamante.getPercPrincipalTributavelPensaoAlimenticia());
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPensaoAlimenticia().setPercPrincipalNaoTributavel(parcelasAtualizaveisDescontoCreditosReclamante.getPercPrincipalNaoTributavelPensaoAlimenticia());
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getFgts().setIncidenciaPensaoAlimenticia(parcelasAtualizaveisDescontoCreditosReclamante.getIncidirSobreFgtsPensaoAlimenticia());
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getFgts().setIncidenciaPensaoAlimenticiaSobreMulta(parcelasAtualizaveisDescontoCreditosReclamante.getIncidirSobreMultaPensaoAlimenticia());
        }
    }

    private static void consistirCustasConhecimentoReclamante(ParcelasAtualizaveisDescontoCreditosReclamante parcelasAtualizaveisDescontoCreditosReclamante) {
        if (!parcelasAtualizaveisDescontoCreditosReclamante.getMarcarCustasConhecimentoReclamante().booleanValue()) {
            parcelasAtualizaveisDescontoCreditosReclamante.setCustasConhecimentoReclamante(null);
        } else {
            switch (parcelasAtualizaveisDescontoCreditosReclamante.getCustasConhecimentoReclamante().getTipoValor()) {
                case CALCULADO: {
                    parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getCustasJudiciais().setTipoDeCustasDeConhecimentoDoReclamante(TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO);
                    break;
                }
                case INFORMADO: {
                    parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getCustasJudiciais().setTipoDeCustasDeConhecimentoDoReclamante(TipoDeCustasDeConhecimentoEnum.INFORMADA);
                    parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getCustasJudiciais().setDataVencimentoConhecimentoDoReclamante(parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getDataDeLiquidacao());
                    parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getCustasJudiciais().setTipoCobrancaReclamante(TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO);
                    parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getCustasJudiciais().setValorDeConhecimentoDoReclamante(parcelasAtualizaveisDescontoCreditosReclamante.getCustasConhecimentoReclamante().getValorParcelaInformado());
                    break;
                }
            }
        }
    }

    private static void consistirPrevidenciaPrivada(ParcelasAtualizaveisDescontoCreditosReclamante parcelasAtualizaveisDescontoCreditosReclamante) {
        if (!parcelasAtualizaveisDescontoCreditosReclamante.getMarcarPrevidenciaPrivada().booleanValue()) {
            ParcelasAtualizaveisOutrosDebitosReclamado parcelasAtualizaveisOutrosDebitosReclamado = parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getParcelasAtualizaveisOutrosDebitosReclamado();
            if (parcelasAtualizaveisOutrosDebitosReclamado != null && parcelasAtualizaveisOutrosDebitosReclamado.getMarcarJurosPrevidenciaPrivada().booleanValue()) {
                parcelasAtualizaveisDescontoCreditosReclamante.setValorParcelaPrevidenciaPrivada(BigDecimal.ZERO);
                parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPrevidenciaPrivada().setApurarPrevidenciaPrivada(Boolean.TRUE);
            } else {
                parcelasAtualizaveisDescontoCreditosReclamante.setValorParcelaPrevidenciaPrivada(null);
                parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPrevidenciaPrivada().setApurarPrevidenciaPrivada(Boolean.FALSE);
            }
            parcelasAtualizaveisDescontoCreditosReclamante.setIndiceTrabalhistaPrevidenciaPrivada(null);
        } else {
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPrevidenciaPrivada().setApurarPrevidenciaPrivada(Boolean.TRUE);
            AliquotaDePrevidenciaPrivada aliquota = new AliquotaDePrevidenciaPrivada(parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPrevidenciaPrivada());
            aliquota.setDataInicioPeriodo(parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getDataDeLiquidacao());
            aliquota.setDataTerminoPeriodo(parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getDataDeLiquidacao());
            aliquota.setAliquota(BigDecimal.ONE);
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getPrevidenciaPrivada().adicionar(aliquota);
            Informada verba = new Informada(parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno());
            verba.setNome(PREVIDENCIA_PRIVADA);
            verba.setDescricao(verba.getNome());
            verba.setAssuntoCnj(parcelasAtualizaveisDescontoCreditosReclamante.obterAssuntoCnjParaVerbas());
            verba.setOcorrenciaDePagamento(OcorrenciaDePagamentoEnum.MENSAL);
            verba.setIncidenciaIRPF(Boolean.FALSE);
            verba.setIncidenciaINSS(Boolean.FALSE);
            verba.setIncidenciaPrevidenciaPrivada(Boolean.TRUE);
            verba.setComporPrincipal(LogicoEnum.NAO);
            verba.setPeriodoInicial(parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getDataDeLiquidacao());
            verba.setPeriodoFinal(parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getDataDeLiquidacao());
            verba.setExcluirFaltaNaoJustificada(Boolean.FALSE);
            verba.setExcluirFeriasGozadas(Boolean.FALSE);
            verba.setAplicarProporcionalidade(Boolean.FALSE);
            FormulaInformada formulaInformada = new FormulaInformada();
            Constante constante = new Constante();
            constante.setValor(BigDecimal.ONE);
            formulaInformada.setConstante(constante);
            verba.setFormula(formulaInformada);
            verba.setAtivo(Boolean.TRUE);
            TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getParametrosDeAtualizacao().getIndiceTrabalhista(), parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getIndicesAcumulados(), verba.getOcorrenciaDePagamento(), parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().getIgnorarTaxaCorrecaoNegativa());
            verba.setTabelaDeCorrecaoMonetariaTrabalhista(tabelaDeCorrecaoMonetariaTrabalhista);
            verba.gerarOcorrencias(false);
            parcelasAtualizaveisDescontoCreditosReclamante.getCalculoExterno().adicionar(verba);
        }
    }
}

