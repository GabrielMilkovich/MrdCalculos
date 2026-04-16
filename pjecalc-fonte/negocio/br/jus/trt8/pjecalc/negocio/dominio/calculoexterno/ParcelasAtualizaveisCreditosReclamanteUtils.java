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
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeBaseDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisUtils;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaInformada;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Constante;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Informada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.util.ArrayList;
import java.util.List;

public class ParcelasAtualizaveisCreditosReclamanteUtils
extends ParcelasAtualizaveisUtils {
    private static final String VALOR_DA_PARCELA = "Valor da Parcela";
    private static final String DESC_VERBAS_TRIBUTAVEIS = "VERBAS TRIBUT\u00c1VEIS";
    private static final String DESC_VERBAS_NAO_TRIBUTAVEIS = "VERBAS N\u00c3O TRIBUT\u00c1VEIS";
    private static final String DESC_FGTS = "FGTS";

    public static void consistirDados(ParcelasAtualizaveisCreditosReclamante parcelasAtualizaveisCreditosReclamante) {
        Fgts fgts;
        List<MensagemDeRecurso> erros = ParcelasAtualizaveisCreditosReclamanteUtils.validarPreenchimentoFormulario(parcelasAtualizaveisCreditosReclamante);
        ParcelasAtualizaveisCreditosReclamanteUtils.lancarErros(erros);
        if (!parcelasAtualizaveisCreditosReclamante.getMarcarMultaIndenizDevReclamado().booleanValue()) {
            parcelasAtualizaveisCreditosReclamante.setMultaIndenizDevReclamado(new ParcelasAtualizaveisMultaIndenizacao());
            parcelasAtualizaveisCreditosReclamante.setListaMultasIndenizDevReclamado(new ArrayList<ParcelasAtualizaveisMultaIndenizacao>());
        } else {
            for (ParcelasAtualizaveisMultaIndenizacao multa : parcelasAtualizaveisCreditosReclamante.getListaMultasIndenizDevReclamado()) {
                multa.setTipoCredorDevedor(CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE);
                multa.setCreditosReclamante(parcelasAtualizaveisCreditosReclamante);
                multa.consistirDados();
            }
        }
        if (!parcelasAtualizaveisCreditosReclamante.getMarcarMultaIndenizDevReclamante().booleanValue()) {
            parcelasAtualizaveisCreditosReclamante.setMultaIndenizDevReclamante(new ParcelasAtualizaveisMultaIndenizacao());
            parcelasAtualizaveisCreditosReclamante.setListaMultasIndenizDevReclamante(new ArrayList<ParcelasAtualizaveisMultaIndenizacao>());
        } else {
            for (ParcelasAtualizaveisMultaIndenizacao multa : parcelasAtualizaveisCreditosReclamante.getListaMultasIndenizDevReclamante()) {
                multa.setTipoCredorDevedor(CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO);
                multa.setCreditosReclamante(parcelasAtualizaveisCreditosReclamante);
                multa.consistirDados();
            }
        }
        if (!parcelasAtualizaveisCreditosReclamante.getMarcarVerbasTributavel().booleanValue()) {
            parcelasAtualizaveisCreditosReclamante.setValorParcelaVerbasTributavel(null);
            parcelasAtualizaveisCreditosReclamante.setValorJurosVerbasTributavel(null);
        } else {
            VerbaDeCalculo verbaTributavel = ParcelasAtualizaveisCreditosReclamanteUtils.criarVerbaTributavel(parcelasAtualizaveisCreditosReclamante);
            parcelasAtualizaveisCreditosReclamante.getCalculoExterno().adicionar(verbaTributavel);
        }
        if (!parcelasAtualizaveisCreditosReclamante.getMarcarVerbasNaoTributavel().booleanValue()) {
            parcelasAtualizaveisCreditosReclamante.setValorParcelaVerbasNaoTributavel(null);
            parcelasAtualizaveisCreditosReclamante.setValorJurosVerbasNaoTributavel(null);
        } else {
            VerbaDeCalculo verbaNaoTributavel = ParcelasAtualizaveisCreditosReclamanteUtils.criarVerbaNaoTributavel(parcelasAtualizaveisCreditosReclamante);
            parcelasAtualizaveisCreditosReclamante.getCalculoExterno().adicionar(verbaNaoTributavel);
        }
        if (!parcelasAtualizaveisCreditosReclamante.getMarcarFgts().booleanValue()) {
            parcelasAtualizaveisCreditosReclamante.setValorParcelaFgts(null);
            parcelasAtualizaveisCreditosReclamante.setValorJurosFgts(null);
        } else {
            HistoricoSalarial historicoSalarial = ParcelasAtualizaveisCreditosReclamanteUtils.criarHistoricoSalarialFgts(parcelasAtualizaveisCreditosReclamante);
            parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getHistoricosSalariais().add(historicoSalarial);
        }
        if (!parcelasAtualizaveisCreditosReclamante.getMarcarMultaFgts().booleanValue()) {
            parcelasAtualizaveisCreditosReclamante.setValorParcelaMultaFgts(null);
            parcelasAtualizaveisCreditosReclamante.setValorJurosMultaFgts(null);
            fgts = parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getFgts();
            fgts.setMulta(false);
            fgts.setTipoDoValorDaMulta(TipoDeBaseDoFgtsEnum.CALCULADA);
            fgts.setValorInformadoDaMulta(null);
            parcelasAtualizaveisCreditosReclamante.getCalculoExterno().setFgts(fgts);
        } else {
            fgts = parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getFgts();
            fgts.setMulta(true);
            fgts.setTipoDoValorDaMulta(TipoDeBaseDoFgtsEnum.INFORMADA);
            fgts.setValorInformadoDaMulta(parcelasAtualizaveisCreditosReclamante.getValorParcelaMultaFgts());
            parcelasAtualizaveisCreditosReclamante.getCalculoExterno().setFgts(fgts);
        }
    }

    private static List<MensagemDeRecurso> validarPreenchimentoFormulario(ParcelasAtualizaveisCreditosReclamante parcelasAtualizaveisCreditosReclamante) {
        ArrayList<MensagemDeRecurso> erros = new ArrayList<MensagemDeRecurso>();
        if (parcelasAtualizaveisCreditosReclamante.getMarcarVerbasTributavel().booleanValue() && parcelasAtualizaveisCreditosReclamante.getValorParcelaVerbasTributavel() == null) {
            erros.add(new MensagemDeRecurso("valorParcelaCredReclamVerbasTributavel", Mensagens.MSG0003, VALOR_DA_PARCELA));
        }
        if (parcelasAtualizaveisCreditosReclamante.getMarcarVerbasNaoTributavel().booleanValue() && parcelasAtualizaveisCreditosReclamante.getValorParcelaVerbasNaoTributavel() == null) {
            erros.add(new MensagemDeRecurso("valorParcelaCredReclamVerbasNaoTributavel", Mensagens.MSG0003, VALOR_DA_PARCELA));
        }
        if (parcelasAtualizaveisCreditosReclamante.getMarcarFgts().booleanValue() && parcelasAtualizaveisCreditosReclamante.getValorParcelaFgts() == null) {
            erros.add(new MensagemDeRecurso("valorParcelaCredReclamFgts", Mensagens.MSG0003, VALOR_DA_PARCELA));
        }
        if (parcelasAtualizaveisCreditosReclamante.getMarcarMultaFgts().booleanValue() && parcelasAtualizaveisCreditosReclamante.getValorParcelaMultaFgts() == null) {
            erros.add(new MensagemDeRecurso("valorParcelaCredReclamMultaFgts", Mensagens.MSG0003, VALOR_DA_PARCELA));
        }
        return erros;
    }

    private static VerbaDeCalculo criarVerbaTributavel(ParcelasAtualizaveisCreditosReclamante parcelasAtualizaveisCreditosReclamante) {
        Informada verba = new Informada(parcelasAtualizaveisCreditosReclamante.getCalculoExterno());
        verba.setNome(DESC_VERBAS_TRIBUTAVEIS);
        verba.setDescricao(verba.getNome());
        verba.setAssuntoCnj(parcelasAtualizaveisCreditosReclamante.obterAssuntoCnjParaVerbas());
        verba.setOcorrenciaDePagamento(OcorrenciaDePagamentoEnum.DESLIGAMENTO);
        verba.setIncidenciaIRPF(Boolean.TRUE);
        verba.setIncidenciaINSS(Boolean.FALSE);
        verba.setComporPrincipal(LogicoEnum.SIM);
        verba.setPeriodoInicial(parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getDataDeLiquidacao());
        verba.setPeriodoFinal(parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getDataDeLiquidacao());
        verba.setExcluirFaltaNaoJustificada(true);
        verba.setExcluirFeriasGozadas(true);
        verba.setAplicarProporcionalidade(false);
        FormulaInformada formulaInformada = new FormulaInformada();
        Constante constante = new Constante();
        constante.setValor(parcelasAtualizaveisCreditosReclamante.getValorParcelaVerbasTributavel());
        formulaInformada.setConstante(constante);
        verba.setFormula(formulaInformada);
        verba.setAtivo(true);
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getParametrosDeAtualizacao().getIndiceTrabalhista(), parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getIndicesAcumulados(), verba.getOcorrenciaDePagamento(), parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getIgnorarTaxaCorrecaoNegativa());
        verba.setTabelaDeCorrecaoMonetariaTrabalhista(tabelaDeCorrecaoMonetariaTrabalhista);
        verba.gerarOcorrencias(false);
        return verba;
    }

    private static VerbaDeCalculo criarVerbaNaoTributavel(ParcelasAtualizaveisCreditosReclamante parcelasAtualizaveisCreditosReclamante) {
        Informada verba = new Informada(parcelasAtualizaveisCreditosReclamante.getCalculoExterno());
        verba.setNome(DESC_VERBAS_NAO_TRIBUTAVEIS);
        verba.setDescricao(verba.getNome());
        verba.setAssuntoCnj(parcelasAtualizaveisCreditosReclamante.obterAssuntoCnjParaVerbas());
        verba.setOcorrenciaDePagamento(OcorrenciaDePagamentoEnum.DESLIGAMENTO);
        verba.setIncidenciaINSS(Boolean.FALSE);
        verba.setComporPrincipal(LogicoEnum.SIM);
        verba.setPeriodoInicial(parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getDataDeLiquidacao());
        verba.setPeriodoFinal(parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getDataDeLiquidacao());
        verba.setAplicarProporcionalidade(false);
        FormulaInformada formulaInformada = new FormulaInformada();
        Constante constante = new Constante();
        constante.setValor(parcelasAtualizaveisCreditosReclamante.getValorParcelaVerbasNaoTributavel());
        formulaInformada.setConstante(constante);
        verba.setFormula(formulaInformada);
        verba.setAtivo(true);
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getParametrosDeAtualizacao().getIndiceTrabalhista(), parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getIndicesAcumulados(), verba.getOcorrenciaDePagamento(), parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getIgnorarTaxaCorrecaoNegativa());
        verba.setTabelaDeCorrecaoMonetariaTrabalhista(tabelaDeCorrecaoMonetariaTrabalhista);
        verba.gerarOcorrencias(false);
        return verba;
    }

    private static HistoricoSalarial criarHistoricoSalarialFgts(ParcelasAtualizaveisCreditosReclamante parcelasAtualizaveisCreditosReclamante) {
        HistoricoSalarial historicoSalarialFgts = new HistoricoSalarial();
        historicoSalarialFgts.setNome(DESC_FGTS);
        historicoSalarialFgts.setIncidenciaFGTS(true);
        historicoSalarialFgts.setValorParaBaseDeCalculo(parcelasAtualizaveisCreditosReclamante.getValorParcelaFgts().divide(Utils.OITO_PORCENTO));
        historicoSalarialFgts.setCalculo(parcelasAtualizaveisCreditosReclamante.getCalculoExterno());
        historicoSalarialFgts.setCompetenciaInicial(parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getDataDeLiquidacao());
        historicoSalarialFgts.setCompetenciaFinal(parcelasAtualizaveisCreditosReclamante.getCalculoExterno().getDataDeLiquidacao());
        historicoSalarialFgts.gerarOcorrencias();
        historicoSalarialFgts.salvar(false);
        return historicoSalarialFgts;
    }
}

