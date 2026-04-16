/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeCalculoDoPrincipalEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DivisorDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OcorrenciaDePagamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeApuracaoPrazoDoAvisoPrevioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeImportadaDoCalendarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorPagoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ComparadorDeExcecoes;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ExcecaoDaCargaHorariaDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ExcecaoDoSabadoDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ItemPontoFacultativo;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.text.SimpleDateFormat;
import java.util.HashSet;
import java.util.Set;

public class AnalisadorAlteracaoCalculo {
    private final Calculo calculo;
    private final Calculo original;
    private boolean alterouDatasPadrao;
    private boolean alteracaoDatasPadraoDevemAlterarFerias;
    private boolean alterouPrescricaoFgts;
    private boolean alterouUltimaRemuneracao;
    private boolean alterouRegimeDeTrabalho;
    private boolean alteracaoDataTerminoCalculoParaDataPosteriorADemissao;

    public AnalisadorAlteracaoCalculo(Calculo calculo, Calculo original) {
        this.calculo = calculo;
        this.original = original;
        this.alteracaoDatasPadraoDevemAlterarFerias = false;
        this.alterouDatasPadrao = this.setAlterouDatasPadrao();
        this.alterouPrescricaoFgts = this.setAlterouPrescricaoFgts();
        this.alterouUltimaRemuneracao = this.setAlterouUltimaRemuneracao();
        this.alterouRegimeDeTrabalho = this.setAlterouRegimeDeTrabalho();
    }

    private boolean setAlterouDatasPadrao() {
        boolean alterouDataTerminoPosteriorADemissao;
        boolean alterou = false;
        if (Utils.naoNulos(this.calculo.getDataAdmissao(), this.original.getDataAdmissao()) && !HelperDate.dateEquals(this.calculo.getDataAdmissao(), this.original.getDataAdmissao())) {
            alterou = true;
            this.alteracaoDatasPadraoDevemAlterarFerias = true;
        }
        if (Utils.naoNulos(this.calculo.getDataAjuizamento(), this.original.getDataAjuizamento()) && !HelperDate.dateEquals(this.calculo.getDataAjuizamento(), this.original.getDataAjuizamento()) && this.calculo.getPrescricaoQuinquenal().booleanValue()) {
            alterou = true;
        }
        if (Utils.nulo(this.calculo.getDataDemissao()) && Utils.naoNulo(this.original.getDataDemissao()) || Utils.naoNulo(this.calculo.getDataDemissao()) && Utils.nulo(this.original.getDataDemissao()) || Utils.naoNulos(this.calculo.getDataDemissao(), this.original.getDataDemissao()) && !HelperDate.dateEquals(this.calculo.getDataDemissao(), this.original.getDataDemissao())) {
            alterou = true;
            this.alteracaoDatasPadraoDevemAlterarFerias = true;
        }
        if (Utils.nulo(this.calculo.getDataInicioCalculo()) && Utils.naoNulo(this.original.getDataInicioCalculo()) || Utils.naoNulo(this.calculo.getDataInicioCalculo()) && Utils.nulo(this.original.getDataInicioCalculo()) || Utils.naoNulos(this.calculo.getDataInicioCalculo(), this.original.getDataInicioCalculo()) && !HelperDate.dateEquals(this.calculo.getDataInicioCalculo(), this.original.getDataInicioCalculo())) {
            alterou = true;
        }
        if (Utils.nulo(this.calculo.getDataTerminoCalculo()) && Utils.naoNulo(this.original.getDataTerminoCalculo()) || Utils.naoNulo(this.calculo.getDataTerminoCalculo()) && Utils.nulo(this.original.getDataTerminoCalculo()) && Utils.nulo(this.calculo.getDataDemissao()) || Utils.naoNulo(this.calculo.getDataTerminoCalculo()) && Utils.nulo(this.original.getDataTerminoCalculo()) && Utils.naoNulo(this.calculo.getDataDemissao()) && HelperDate.dateBefore(this.calculo.getDataTerminoCalculo(), this.calculo.getDataDemissao()) || Utils.naoNulos(this.calculo.getDataTerminoCalculo(), this.original.getDataTerminoCalculo()) && !HelperDate.dateEquals(this.calculo.getDataTerminoCalculo(), this.original.getDataTerminoCalculo()) && Utils.nulo(this.calculo.getDataDemissao()) || Utils.naoNulos(this.calculo.getDataTerminoCalculo(), this.original.getDataTerminoCalculo()) && !HelperDate.dateEquals(this.calculo.getDataTerminoCalculo(), this.original.getDataTerminoCalculo()) && Utils.naoNulo(this.calculo.getDataDemissao()) && HelperDate.dateBefore(this.calculo.getDataTerminoCalculo(), this.calculo.getDataDemissao())) {
            alterou = true;
            if (Utils.nulo(this.calculo.getDataDemissao())) {
                this.alteracaoDatasPadraoDevemAlterarFerias = true;
            }
        }
        boolean inseriuDataTerminoPosteriorADemissao = Utils.naoNulo(this.calculo.getDataTerminoCalculo()) && Utils.nulo(this.original.getDataTerminoCalculo()) && Utils.naoNulo(this.calculo.getDataDemissao()) && HelperDate.dateAfterOrEquals(this.calculo.getDataTerminoCalculo(), this.calculo.getDataDemissao());
        boolean bl = alterouDataTerminoPosteriorADemissao = Utils.naoNulos(this.calculo.getDataTerminoCalculo(), this.original.getDataTerminoCalculo()) && !HelperDate.dateEquals(this.calculo.getDataTerminoCalculo(), this.original.getDataTerminoCalculo()) && Utils.naoNulo(this.calculo.getDataDemissao()) && HelperDate.dateAfterOrEquals(this.calculo.getDataTerminoCalculo(), this.calculo.getDataDemissao());
        if (inseriuDataTerminoPosteriorADemissao || alterouDataTerminoPosteriorADemissao) {
            this.alteracaoDataTerminoCalculoParaDataPosteriorADemissao = true;
        }
        if (this.calculo.getPrescricaoQuinquenal() != this.original.getPrescricaoQuinquenal()) {
            alterou = true;
        }
        return alterou;
    }

    private boolean setAlterouPrescricaoFgts() {
        boolean alterou = false;
        if (!HelperDate.dateEquals(this.calculo.getDataAjuizamento(), this.original.getDataAjuizamento()) && this.calculo.getPrescricaoFgts().booleanValue()) {
            alterou = true;
        }
        if (this.calculo.getPrescricaoFgts() != this.original.getPrescricaoFgts()) {
            alterou = true;
        }
        return alterou;
    }

    private boolean setAlterouUltimaRemuneracao() {
        boolean alterou = false;
        if (!Utils.nulos(this.calculo.getValorUltimaRemuneracao(), this.original.getValorUltimaRemuneracao())) {
            if (Utils.nulo(this.calculo.getValorUltimaRemuneracao()) && Utils.naoNulo(this.original.getValorUltimaRemuneracao()) || Utils.naoNulo(this.calculo.getValorUltimaRemuneracao()) && Utils.nulo(this.original.getValorUltimaRemuneracao())) {
                alterou = true;
            } else if (this.calculo.getValorUltimaRemuneracao().compareTo(this.original.getValorUltimaRemuneracao()) != 0) {
                alterou = true;
            }
        }
        return alterou;
    }

    private boolean setAlterouMaiorRemuneracao() {
        boolean alterou = false;
        if (!Utils.nulos(this.calculo.getValorMaiorRemuneracao(), this.original.getValorMaiorRemuneracao())) {
            if (Utils.nulo(this.calculo.getValorMaiorRemuneracao()) && Utils.naoNulo(this.original.getValorMaiorRemuneracao()) || Utils.naoNulo(this.calculo.getValorMaiorRemuneracao()) && Utils.nulo(this.original.getValorMaiorRemuneracao())) {
                alterou = true;
            } else if (this.calculo.getValorMaiorRemuneracao().compareTo(this.original.getValorMaiorRemuneracao()) != 0) {
                alterou = true;
            }
        }
        return alterou;
    }

    private boolean setAlterouRegimeDeTrabalho() {
        boolean alterou = false;
        if (!this.calculo.getRegimeDoContrato().equals((Object)this.original.getRegimeDoContrato())) {
            alterou = true;
        }
        return alterou;
    }

    private boolean alterouCargaHoraria() {
        boolean alterou = false;
        if (!Utils.nulos(this.calculo.getValorCargaHorariaPadrao(), this.original.getValorCargaHorariaPadrao())) {
            if (Utils.nulo(this.calculo.getValorCargaHorariaPadrao()) && Utils.naoNulo(this.original.getValorCargaHorariaPadrao()) || Utils.naoNulo(this.calculo.getValorCargaHorariaPadrao()) && Utils.nulo(this.original.getValorCargaHorariaPadrao())) {
                alterou = true;
            } else if (this.calculo.getValorCargaHorariaPadrao().compareTo(this.original.getValorCargaHorariaPadrao()) != 0) {
                alterou = true;
            }
        }
        if (!alterou) {
            if (this.calculo.getExcecoesDaCargaHoraria().size() != this.original.getExcecoesDaCargaHoraria().size()) {
                alterou = true;
            } else {
                ComparadorDeExcecoes c;
                HashSet<ComparadorDeExcecoes> atuais = new HashSet<ComparadorDeExcecoes>();
                HashSet<ComparadorDeExcecoes> originais = new HashSet<ComparadorDeExcecoes>();
                SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy");
                for (ExcecaoDaCargaHorariaDoCalculo e : this.calculo.getExcecoesDaCargaHoraria()) {
                    c = new ComparadorDeExcecoes(sdf.format(e.getDataInicioExcecao()), sdf.format(e.getDataTerminoExcecao()), Utils.formatarNumero(e.getValorCargaHoraria(), 2));
                    atuais.add(c);
                }
                for (ExcecaoDaCargaHorariaDoCalculo e : this.original.getExcecoesDaCargaHoraria()) {
                    c = new ComparadorDeExcecoes(sdf.format(e.getDataInicioExcecao()), sdf.format(e.getDataTerminoExcecao()), Utils.formatarNumero(e.getValorCargaHoraria(), 2));
                    originais.add(c);
                }
                if (!atuais.containsAll(originais) || !originais.containsAll(atuais)) {
                    alterou = true;
                }
            }
        }
        return alterou;
    }

    private boolean alterouSabadoDiaUtil() {
        boolean alterou;
        boolean bl = alterou = !this.calculo.getSabadoDiaUtil().equals(this.original.getSabadoDiaUtil());
        if (!alterou) {
            if (this.calculo.getExcecoesDoSabado().size() != this.original.getExcecoesDoSabado().size()) {
                alterou = true;
            } else {
                ComparadorDeExcecoes c;
                HashSet<ComparadorDeExcecoes> atuais = new HashSet<ComparadorDeExcecoes>();
                HashSet<ComparadorDeExcecoes> originais = new HashSet<ComparadorDeExcecoes>();
                SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy");
                for (ExcecaoDoSabadoDoCalculo e : this.calculo.getExcecoesDoSabado()) {
                    c = new ComparadorDeExcecoes(sdf.format(e.getDataInicioExcecaoSabado()), sdf.format(e.getDataTerminoExcecaoSabado()), "");
                    atuais.add(c);
                }
                for (ExcecaoDoSabadoDoCalculo e : this.original.getExcecoesDoSabado()) {
                    c = new ComparadorDeExcecoes(sdf.format(e.getDataInicioExcecaoSabado()), sdf.format(e.getDataTerminoExcecaoSabado()), "");
                    originais.add(c);
                }
                if (!atuais.containsAll(originais) || !originais.containsAll(atuais)) {
                    alterou = true;
                }
            }
        }
        return alterou;
    }

    private boolean alterouPontosFacultativos() {
        boolean alterou = false;
        if (this.calculo.getPontosFacultativos().size() != this.original.getPontosFacultativos().size()) {
            alterou = true;
        } else {
            ComparadorDeExcecoes c;
            HashSet<ComparadorDeExcecoes> atuais = new HashSet<ComparadorDeExcecoes>();
            HashSet<ComparadorDeExcecoes> originais = new HashSet<ComparadorDeExcecoes>();
            for (ItemPontoFacultativo i : this.calculo.getPontosFacultativos()) {
                c = new ComparadorDeExcecoes("", "", i.getNomeFeriado());
                atuais.add(c);
            }
            for (ItemPontoFacultativo i : this.original.getPontosFacultativos()) {
                c = new ComparadorDeExcecoes("", "", i.getNomeFeriado());
                originais.add(c);
            }
            if (!atuais.containsAll(originais) || !originais.containsAll(atuais)) {
                alterou = true;
            }
        }
        return alterou;
    }

    private boolean alterouAvisoInformado() {
        return TipoDeApuracaoPrazoDoAvisoPrevioEnum.APURACAO_INFORMADA.equals((Object)this.calculo.getApuracaoPrazoDoAvisoPrevio()) && TipoDeApuracaoPrazoDoAvisoPrevioEnum.APURACAO_INFORMADA.equals((Object)this.original.getApuracaoPrazoDoAvisoPrevio()) && Utils.naoNulos(this.calculo.getPrazoAvisoInformado(), this.original.getPrazoAvisoInformado()) && this.calculo.getPrazoAvisoInformado().compareTo(this.original.getPrazoAvisoInformado()) != 0;
    }

    public void marcarVerbasParaRegeracaoDeOcorrencia() {
        boolean alterouMaiorRemuneracao = this.setAlterouMaiorRemuneracao();
        boolean alterouPrazoDoAviso = !this.calculo.getApuracaoPrazoDoAvisoPrevio().equals((Object)this.original.getApuracaoPrazoDoAvisoPrevio()) || this.alterouAvisoInformado();
        boolean alterouProjetaAviso = !this.calculo.getProjetaAvisoIndenizado().equals(this.original.getProjetaAvisoIndenizado());
        boolean alterouLimitarAvos = !this.calculo.getLimitarAvosAoPeriodoDoCalculo().equals(this.original.getLimitarAvosAoPeriodoDoCalculo());
        boolean alterouCargaHoraria = this.alterouCargaHoraria();
        boolean alterouSabadoDiaUtil = this.alterouSabadoDiaUtil();
        boolean alterouConsiderarFeriadoEstadual = !this.calculo.getConsideraFeriadoEstadual().equals(this.original.getConsideraFeriadoEstadual());
        boolean alterouConsiderarFeriadoMunicipal = !this.calculo.getConsideraFeriadoMunicipal().equals(this.original.getConsideraFeriadoMunicipal());
        boolean alterouPontosFacultativos = this.alterouPontosFacultativos();
        boolean alterouEstado = !this.calculo.getEstado().equals(this.original.getEstado());
        boolean alterouMunicipio = !this.calculo.getMunicipio().equals(this.original.getMunicipio());
        boolean alterouZerarValorNegativo = !this.calculo.getZeraValorNegativo().equals(this.original.getZeraValorNegativo());
        Set<VerbaDeCalculo> verbas = this.original.getVerbas();
        for (VerbaDeCalculo verbaDeCalculo : verbas) {
            if (verbaDeCalculo.getAtivo().booleanValue()) {
                verbaDeCalculo.checarAvisoPrevio(this.calculo);
                if (alterouZerarValorNegativo) {
                    verbaDeCalculo.setZeraValorNegativo(this.calculo.getZeraValorNegativo());
                }
                if (this.alterouDatasPadrao) {
                    verbaDeCalculo.marcarComoAlterada();
                    verbaDeCalculo.setCalculo(this.calculo);
                    verbaDeCalculo.setPeriodoInicial(verbaDeCalculo.sugerirPeriodoInicial());
                    verbaDeCalculo.setPeriodoFinal(verbaDeCalculo.sugerirPeriodoFinal());
                    continue;
                }
                if (this.alterouRegimeDeTrabalho) {
                    verbaDeCalculo.marcarComoAlterada();
                    continue;
                }
                if (alterouMaiorRemuneracao && TipoValorPagoEnum.CALCULADO.equals((Object)verbaDeCalculo.getFormula().getValorPago().getTipo()) && BaseDeCalculoDoPrincipalEnum.MAIOR_REMUNERACAO.equals((Object)verbaDeCalculo.getFormula().getValorPago().getBaseTabelada())) {
                    verbaDeCalculo.marcarComoAlterada();
                }
                if (alterouPrazoDoAviso) {
                    if (CaracteristicaDaVerbaEnum.AVISO_PREVIO.equals((Object)verbaDeCalculo.getCaracteristica())) {
                        verbaDeCalculo.marcarComoAlterada();
                        continue;
                    }
                    if (this.calculo.getProjetaAvisoIndenizado().booleanValue() && (OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO.equals((Object)verbaDeCalculo.getOcorrenciaDePagamento()) || OcorrenciaDePagamentoEnum.DEZEMBRO.equals((Object)verbaDeCalculo.getOcorrenciaDePagamento()))) {
                        verbaDeCalculo.marcarComoAlterada();
                        continue;
                    }
                }
                if (alterouProjetaAviso && (OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO.equals((Object)verbaDeCalculo.getOcorrenciaDePagamento()) || OcorrenciaDePagamentoEnum.DEZEMBRO.equals((Object)verbaDeCalculo.getOcorrenciaDePagamento()))) {
                    verbaDeCalculo.marcarComoAlterada();
                    continue;
                }
                if (alterouLimitarAvos && (OcorrenciaDePagamentoEnum.PERIODO_AQUISITIVO.equals((Object)verbaDeCalculo.getOcorrenciaDePagamento()) || OcorrenciaDePagamentoEnum.DEZEMBRO.equals((Object)verbaDeCalculo.getOcorrenciaDePagamento()))) {
                    verbaDeCalculo.marcarComoAlterada();
                    continue;
                }
                if (alterouCargaHoraria && verbaDeCalculo.getFormula() instanceof FormulaReflexo && DivisorDeVerbaEnum.CARGA_HORARIA.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getDivisor().getTipo())) {
                    verbaDeCalculo.marcarComoAlterada();
                    continue;
                }
                if (alterouSabadoDiaUtil && verbaDeCalculo.getFormula() instanceof FormulaReflexo) {
                    if (DivisorDeVerbaEnum.DIAS_UTEIS.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getDivisor().getTipo())) {
                        verbaDeCalculo.marcarComoAlterada();
                        continue;
                    }
                    if (TipoDeQuantidadeEnum.IMPORTADA_DO_CALENDARIO.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().getTipo()) && (TipoDeQuantidadeImportadaDoCalendarioEnum.REPOUSOS_FERIADOS.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().getTipoImportadaCalendarioEnum()) || TipoDeQuantidadeImportadaDoCalendarioEnum.REPOUSOS.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().getTipoImportadaCalendarioEnum()) || TipoDeQuantidadeImportadaDoCalendarioEnum.DIAS_UTEIS.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().getTipoImportadaCalendarioEnum()))) {
                        verbaDeCalculo.marcarComoAlterada();
                        continue;
                    }
                }
                if ((alterouConsiderarFeriadoEstadual || alterouConsiderarFeriadoMunicipal || alterouPontosFacultativos) && verbaDeCalculo.getFormula() instanceof FormulaReflexo) {
                    if (DivisorDeVerbaEnum.DIAS_UTEIS.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getDivisor().getTipo())) {
                        verbaDeCalculo.marcarComoAlterada();
                        continue;
                    }
                    if (TipoDeQuantidadeEnum.IMPORTADA_DO_CALENDARIO.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().getTipo()) && (TipoDeQuantidadeImportadaDoCalendarioEnum.REPOUSOS_FERIADOS.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().getTipoImportadaCalendarioEnum()) || TipoDeQuantidadeImportadaDoCalendarioEnum.FERIADOS.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().getTipoImportadaCalendarioEnum()) || TipoDeQuantidadeImportadaDoCalendarioEnum.DIAS_UTEIS.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().getTipoImportadaCalendarioEnum()))) {
                        verbaDeCalculo.marcarComoAlterada();
                        continue;
                    }
                }
                if ((!alterouEstado || !this.calculo.getConsideraFeriadoEstadual().booleanValue()) && (!alterouMunicipio || !this.calculo.getConsideraFeriadoMunicipal().booleanValue()) || !(verbaDeCalculo.getFormula() instanceof FormulaReflexo)) continue;
                if (DivisorDeVerbaEnum.DIAS_UTEIS.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getDivisor().getTipo())) {
                    verbaDeCalculo.marcarComoAlterada();
                    continue;
                }
                if (!TipoDeQuantidadeEnum.IMPORTADA_DO_CALENDARIO.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().getTipo()) || !TipoDeQuantidadeImportadaDoCalendarioEnum.REPOUSOS_FERIADOS.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().getTipoImportadaCalendarioEnum()) && !TipoDeQuantidadeImportadaDoCalendarioEnum.FERIADOS.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().getTipoImportadaCalendarioEnum()) && !TipoDeQuantidadeImportadaDoCalendarioEnum.DIAS_UTEIS.equals((Object)((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().getTipoImportadaCalendarioEnum())) continue;
                verbaDeCalculo.marcarComoAlterada();
                continue;
            }
            verbaDeCalculo.checarAvisoPrevio(this.calculo);
            if (!this.alterouDatasPadrao) continue;
            verbaDeCalculo.setCalculo(this.calculo);
            verbaDeCalculo.setPeriodoInicial(verbaDeCalculo.sugerirPeriodoInicial());
            verbaDeCalculo.setPeriodoFinal(verbaDeCalculo.sugerirPeriodoFinal());
        }
        this.calculo.setVerbas(verbas);
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public Calculo getOriginal() {
        return this.original;
    }

    public boolean isAlterouDatasPadrao() {
        return this.alterouDatasPadrao;
    }

    public boolean isAlteracaoDatasPadraoDevemAlterarFerias() {
        return this.alteracaoDatasPadraoDevemAlterarFerias;
    }

    public boolean isAlterouPrescricaoFgts() {
        return this.alterouPrescricaoFgts;
    }

    public boolean isAlterouUltimaRemuneracao() {
        return this.alterouUltimaRemuneracao;
    }

    public boolean isAlterouRegimeDeTrabalho() {
        return this.alterouRegimeDeTrabalho;
    }

    public boolean isAlteracaoDataTerminoCalculoParaDataPosteriorADemissao() {
        return this.alteracaoDataTerminoCalculoParaDataPosteriorADemissao;
    }

    public void setAlteracaoDataTerminoCalculoParaDataPosteriorADemissao(boolean alteracaoDataTerminoCalculoParaDataPosteriorADemissao) {
        this.alteracaoDataTerminoCalculoParaDataPosteriorADemissao = alteracaoDataTerminoCalculoParaDataPosteriorADemissao;
    }
}

