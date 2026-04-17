/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  br.jus.cnj.certificado.ZipUtilities
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.DadosGPrec
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.HonorarioGPrec
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacao
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacaoHonorario
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacaoMulta
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.TipoHonorarioGPrec
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.TipoRegistroCalculoEnum
 *  org.apache.commons.lang.StringUtils
 *  org.jboss.resteasy.util.Base64
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.In
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.cnj.certificado.ZipUtilities;
import br.jus.trt8.pjecalc.base.comum.Aplicacao;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.Attachment;
import br.jus.trt8.pjecalc.integracao.dto.exporta.DadosGPrec;
import br.jus.trt8.pjecalc.integracao.dto.exporta.HonorarioGPrec;
import br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacao;
import br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacaoHonorario;
import br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacaoMulta;
import br.jus.trt8.pjecalc.integracao.dto.exporta.TipoHonorarioGPrec;
import br.jus.trt8.pjecalc.integracao.dto.exporta.TipoRegistroCalculoEnum;
import br.jus.trt8.pjecalc.negocio.comum.Exportador;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.FormatoRelatorioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.RelatorioPagamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDevedorDoHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoRelatorioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.AbstractResumoPrecatorioJrAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapterPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoJRAdapterPagamentoPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPrecatorioJRAdapterPagamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPrecatorioJRAdapterPagamentoPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ResumoPrecatorioJrAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.consolidado.RelatorioConsolidadoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.participante.Reclamado;
import br.jus.trt8.pjecalc.negocio.dominio.participante.Reclamante;
import br.jus.trt8.pjecalc.negocio.dominio.processo.Processo;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeRelatorio;
import java.io.IOException;
import java.io.Serializable;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Set;
import org.apache.commons.lang.StringUtils;
import org.jboss.resteasy.util.Base64;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Name(value="servicoDeEnvioPJe")
@Scope(value=ScopeType.SESSION)
@AutoCreate
public class ServicoDeEnvioPJe
implements Serializable {
    private static final long serialVersionUID = 1573112638060421464L;
    @In
    private ServicoDeCalculo servicoDeCalculo;
    @In
    private Aplicacao aplicacao;
    @In
    private ServicoDeRelatorio servicoDeRelatorio;
    private static final Logger LOGGER = LoggerFactory.getLogger(ServicoDeEnvioPJe.class);
    private static final String CHAVE_INSS_SALARIOS_PAGOS = "CONTRIBUI\u00c7\u00c3O SOCIAL SOBRE SAL\u00c1RIOS PAGOS";
    private static final String CHAVE_INSS_SALARIOS_DEVIDOS = "CONTRIBUI\u00c7\u00c3O SOCIAL SOBRE SAL\u00c1RIOS DEVIDOS";
    private static final String HONORARIOS_LIQUIDOS_PARA = "HONOR\u00c1RIOS L\u00cdQUIDOS PARA ";
    private static final String SOBRE_HONORARIOS_PARA = " SOBRE HONOR\u00c1RIOS PARA ";

    public PJeCalcImportacao consolidarDadosParaExportacao() {
        try {
            Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
            if (!calculo.isLiquidado() || calculo.isAlteradoParaLiquidacao()) {
                return null;
            }
            Atualizacao atualizacao = calculo.getAtualizacao();
            if (Utils.nulo(atualizacao) || !atualizacao.isLiquidado() || atualizacao.isAlteradoParaLiquidacao()) {
                return this.consolidarExportacaoCalculo(calculo, Boolean.TRUE);
            }
            return this.consolidarExportacaoAtualizacao(calculo, atualizacao);
        }
        catch (Exception e) {
            LOGGER.error(e.getMessage(), (Throwable)e);
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0159, new Object[0]));
        }
    }

    private PJeCalcImportacao consolidarExportacaoCalculo(Calculo calculo, boolean considerarGPrec) {
        ResumoJRAdapterPadrao resumoJRAdapter = new ResumoJRAdapterPadrao(calculo);
        PJeCalcImportacao pjeCalcImportacao = new PJeCalcImportacao();
        pjeCalcImportacao.setTipoRegistroCalculo(TipoRegistroCalculoEnum.CALCULO);
        pjeCalcImportacao.setIdPJeCalc(calculo.getId());
        pjeCalcImportacao.setHashPJeCalc(calculo.getHashCodeLiquidacao());
        pjeCalcImportacao.setDataLiquidacao(calculo.getDataDeLiquidacao());
        this.setDadosProcesso(pjeCalcImportacao, calculo.getProcesso());
        this.setDadosContribuicaoSocial(pjeCalcImportacao, resumoJRAdapter);
        this.setDadosCustasJudiciais(pjeCalcImportacao, resumoJRAdapter);
        this.setDadosMultas(pjeCalcImportacao, resumoJRAdapter);
        this.setDadosHonorarios(pjeCalcImportacao, resumoJRAdapter);
        this.setOutrosDados(pjeCalcImportacao, resumoJRAdapter);
        if (considerarGPrec) {
            this.setDadosPrecatorio(pjeCalcImportacao, new ResumoPrecatorioJrAdapterPadrao(calculo));
        }
        return pjeCalcImportacao;
    }

    private PJeCalcImportacao consolidarExportacaoAtualizacao(Calculo calculo, Atualizacao atualizacao) {
        PJeCalcImportacao pjeCalcImportacao = new PJeCalcImportacao();
        pjeCalcImportacao.setIdPJeCalc(calculo.getId());
        pjeCalcImportacao.setHashPJeCalc(atualizacao.getHashCodeLiquidacao());
        pjeCalcImportacao.setTipoRegistroCalculo(TipoRegistroCalculoEnum.ATUALIZACAO);
        pjeCalcImportacao.setDataLiquidacao(atualizacao.getDataDeLiquidacao());
        this.setDadosProcesso(pjeCalcImportacao, calculo.getProcesso());
        ResumoJRAdapterPadrao resumoJRAdapter = new ResumoJRAdapterPadrao(calculo);
        if (calculo.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
            ResumoPrecatorioJRAdapterPagamentoPadrao resumoPrecatorioJRAdapterPagamento = new ResumoPrecatorioJRAdapterPagamentoPadrao(calculo);
            this.setDadosContribuicaoSocialAtualizacaoPrecatorio(pjeCalcImportacao, resumoPrecatorioJRAdapterPagamento);
            this.setDadosCustasJudiciaisAtualizacaoPrecatorio(pjeCalcImportacao, resumoPrecatorioJRAdapterPagamento);
            this.setDadosHonorariosAtualizacaoPrecatorio(pjeCalcImportacao, resumoPrecatorioJRAdapterPagamento);
            this.setOutrosDadosAtualizacaoPrecatorio(pjeCalcImportacao, resumoPrecatorioJRAdapterPagamento);
        } else {
            ResumoJRAdapterPagamentoPadrao resumoJRAdapterPagamento = new ResumoJRAdapterPagamentoPadrao(calculo);
            this.setDadosContribuicaoSocialAtualizacao(pjeCalcImportacao, resumoJRAdapterPagamento, resumoJRAdapter);
            this.setDadosCustasJudiciaisAtualizacao(pjeCalcImportacao, resumoJRAdapterPagamento);
            this.setDadosMultasAtualizacao(pjeCalcImportacao, resumoJRAdapterPagamento);
            this.setDadosHonorariosAtualizacao(pjeCalcImportacao, resumoJRAdapterPagamento);
            this.setOutrosDadosAtualizacao(pjeCalcImportacao, resumoJRAdapterPagamento);
        }
        return pjeCalcImportacao;
    }

    public PJeCalcImportacao consolidarDadosParaEnvio(boolean enviarRelatorioResumoPrecatorioAoPJe) {
        try {
            Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
            if (Utils.nulo(calculo.getIdentificacaoDoProcesso())) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0158, new Object[0]));
            }
            if (calculo.isLiquidado()) {
                if (calculo.isAlteradoParaLiquidacao()) {
                    throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0161, new Object[0]));
                }
            } else {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0160, new Object[0]));
            }
            PJeCalcImportacao pjeCalcImportacao = this.consolidarExportacaoCalculo(calculo, Boolean.FALSE);
            ArrayList<RelatorioConsolidadoEnum> sessoes = new ArrayList<RelatorioConsolidadoEnum>();
            for (RelatorioConsolidadoEnum rel : RelatorioConsolidadoEnum.getRelatoriosConsolidado()) {
                if (!rel.isSelecionado(calculo)) continue;
                sessoes.add(rel);
            }
            if (!enviarRelatorioResumoPrecatorioAoPJe) {
                sessoes.remove((Object)RelatorioConsolidadoEnum.RESUMO_PRECATORIO);
            }
            FormatoRelatorioEnum formatoRelatorio = FormatoRelatorioEnum.valueOf(this.aplicacao.getFormatoRelatorioEnvio());
            Attachment relatorio = this.servicoDeRelatorio.gerarRelatorio(TipoRelatorioEnum.CALCULO_CONSOLIDADO, calculo, sessoes, formatoRelatorio);
            this.definirArquivos(calculo, pjeCalcImportacao, formatoRelatorio, relatorio);
            return pjeCalcImportacao;
        }
        catch (NegocioException e) {
            throw e;
        }
        catch (Exception e) {
            LOGGER.error(e.getMessage(), (Throwable)e);
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0159, new Object[0]));
        }
    }

    public PJeCalcImportacao consolidarDadosParaEnvioAtualizacao() {
        try {
            Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
            if (Utils.nulo(calculo.getIdentificacaoDoProcesso())) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0158, new Object[0]));
            }
            Atualizacao atualizacao = calculo.getAtualizacao();
            if (Utils.naoNulo(atualizacao) && atualizacao.isLiquidado()) {
                if (atualizacao.isAlteradoParaLiquidacao()) {
                    throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0162, new Object[0]));
                }
            } else {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0163, new Object[0]));
            }
            PJeCalcImportacao pjeCalcImportacao = this.consolidarExportacaoAtualizacao(calculo, atualizacao);
            ArrayList<RelatorioPagamentoEnum> sessoes = new ArrayList<RelatorioPagamentoEnum>();
            for (RelatorioPagamentoEnum rel : RelatorioPagamentoEnum.getRelatoriosPagamento()) {
                if (!rel.isSelecionado(calculo)) continue;
                sessoes.add(rel);
            }
            FormatoRelatorioEnum formatoRelatorio = FormatoRelatorioEnum.valueOf(this.aplicacao.getFormatoRelatorioEnvio());
            Attachment relatorio = this.servicoDeRelatorio.gerarRelatorio(TipoRelatorioEnum.PAGAMENTO_CONSOLIDADO, calculo, sessoes, formatoRelatorio);
            this.definirArquivos(calculo, pjeCalcImportacao, formatoRelatorio, relatorio);
            return pjeCalcImportacao;
        }
        catch (NegocioException e) {
            throw e;
        }
        catch (Exception e) {
            LOGGER.error(e.getMessage(), (Throwable)e);
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0159, new Object[0]));
        }
    }

    private void definirArquivos(Calculo calculo, PJeCalcImportacao pjeCalcImportacao, FormatoRelatorioEnum formatoRelatorio, Attachment relatorio) throws IOException {
        if (formatoRelatorio.equals((Object)FormatoRelatorioEnum.HTML)) {
            String relatorioHtml = new String(relatorio.getData(), StandardCharsets.UTF_8);
            relatorioHtml = Utils.substituirCaracteresInvalidos(relatorioHtml);
            pjeCalcImportacao.setRelatorioHtmlCompactado(ZipUtilities.compress((String)relatorioHtml, (Charset)StandardCharsets.UTF_8));
        } else {
            String relatorioPdfBase64 = Base64.encodeBytes((byte[])relatorio.getData());
            pjeCalcImportacao.setRelatorioPDFbase64(relatorioPdfBase64);
        }
        byte[] bytesArqPjc = Exportador.exportar(calculo, "cTmp").getData();
        pjeCalcImportacao.setCalculoExportadoPjcCompactado(Utils.compactarParaGZIP(bytesArqPjc));
    }

    private BigDecimal getValorItemResumo(String chave, Collection<ResumoJRAdapter.ItemResumo> itens) {
        for (ResumoJRAdapter.ItemResumo item : itens) {
            if (!item.getLabel().equalsIgnoreCase(chave) && !StringUtils.containsIgnoreCase((String)item.getLabel(), (String)chave)) continue;
            return item.getValor();
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal getValorItemResumoAtualizacao(String chave, Collection<ResumoJRAdapterPagamento.ItemResumo> itens) {
        for (ResumoJRAdapterPagamento.ItemResumo item : itens) {
            if (!item.getLabel().equalsIgnoreCase(chave) && !StringUtils.containsIgnoreCase((String)item.getLabel(), (String)chave)) continue;
            return item.getValor();
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal getValorItemResumoPrecatorio(String chave, Collection<AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio> itens) {
        for (AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio item : itens) {
            if (!item.getLabel().equalsIgnoreCase(chave) && !StringUtils.containsIgnoreCase((String)item.getLabel(), (String)chave)) continue;
            return item.getValor();
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal getValorItemResumoPrecatorioAtualizacao(String chave, Collection<ResumoPrecatorioJRAdapterPagamento.ItemResumo> itens) {
        for (ResumoPrecatorioJRAdapterPagamento.ItemResumo item : itens) {
            if (!item.getLabel().equalsIgnoreCase(chave) && !StringUtils.containsIgnoreCase((String)item.getLabel(), (String)chave)) continue;
            return item.getValor();
        }
        return BigDecimal.ZERO;
    }

    private void setDadosProcesso(PJeCalcImportacao pjeCalcImportacao, Processo processo) {
        pjeCalcImportacao.setNumProcesso(processo.getNumeroProcesso());
        pjeCalcImportacao.setDvProcesso(processo.getDigitoProcesso());
        pjeCalcImportacao.setAnoProcesso(processo.getAnoProcesso());
        pjeCalcImportacao.setOrgaoJustica(processo.getJustica());
        pjeCalcImportacao.setRegional(processo.getRegiao());
        pjeCalcImportacao.setOrigemProcesso(processo.getVaraProcesso());
        Reclamante reclamante = processo.getReclamante();
        Reclamado reclamado = processo.getReclamado();
        if (Utils.naoNulo(reclamante)) {
            pjeCalcImportacao.setNomeReclamante(reclamante.getNome());
            if (Utils.nulo((Object)reclamante.getTipoDocumentoFiscal()) || Utils.nulo(reclamante.getNumeroDocumentoFiscal())) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0168, new Object[0]));
            }
            pjeCalcImportacao.setDocumentoFiscalReclamante(reclamante.getTipoDocumentoFiscal().getFormatado(reclamante.getNumeroDocumentoFiscal()));
        }
        if (Utils.naoNulo(reclamado)) {
            pjeCalcImportacao.setNomeReclamado(reclamado.getNome());
            if (Utils.nulo((Object)reclamado.getTipoDocumentoFiscal()) || Utils.nulo(reclamado.getNumeroDocumentoFiscal())) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0169, new Object[0]));
            }
            pjeCalcImportacao.setDocumentoFiscalReclamado(reclamado.getTipoDocumentoFiscal().getFormatado(reclamado.getNumeroDocumentoFiscal()));
        }
    }

    private void setDadosContribuicaoSocial(PJeCalcImportacao pjeCalcImportacao, ResumoJRAdapter resumoJRAdapter) {
        Collection debitosDoReclamado = resumoJRAdapter.getOcorrenciasDebitoReclamado().getData();
        Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
        BigDecimal totalGeralInssSegurado = BigDecimal.ZERO;
        if (!calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty()) {
            totalGeralInssSegurado = calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado() != false ? calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSegurado() : BigDecimal.ZERO;
        }
        BigDecimal inssSalariosDevidos = this.getValorItemResumo(CHAVE_INSS_SALARIOS_DEVIDOS, debitosDoReclamado);
        BigDecimal inssSalariosPagos = this.getValorItemResumo(CHAVE_INSS_SALARIOS_PAGOS, debitosDoReclamado);
        BigDecimal inssDezPorcento = this.getValorItemResumo("CONTRIBUI\u00c7\u00c3O SOCIAL 10%", debitosDoReclamado);
        BigDecimal inssMeioPorcento = this.getValorItemResumo("CONTRIBUI\u00c7\u00c3O SOCIAL 0,5%", debitosDoReclamado);
        pjeCalcImportacao.setInssReclamante(totalGeralInssSegurado);
        pjeCalcImportacao.setInssReclamado(inssSalariosDevidos.add(inssSalariosPagos).subtract(totalGeralInssSegurado));
        pjeCalcImportacao.setContribuicaoSocialDezPorCento(inssDezPorcento);
        pjeCalcImportacao.setContribuicaoSocialMeioPorCento(inssMeioPorcento);
    }

    private void setDadosContribuicaoSocialAtualizacao(PJeCalcImportacao pjeCalcImportacao, ResumoJRAdapterPagamento resumoJRAdapterPagamento, ResumoJRAdapter resumoJRAdapter) {
        Collection debitosDoReclamadoCalculo = resumoJRAdapter.getOcorrenciasDebitoReclamado().getData();
        BigDecimal inssSalariosDevidosCalculo = this.getValorItemResumo(CHAVE_INSS_SALARIOS_DEVIDOS, debitosDoReclamadoCalculo);
        BigDecimal inssSalariosPagosCalculo = this.getValorItemResumo(CHAVE_INSS_SALARIOS_PAGOS, debitosDoReclamadoCalculo);
        if (Utils.nulo(inssSalariosDevidosCalculo)) {
            inssSalariosDevidosCalculo = BigDecimal.ZERO;
        }
        if (Utils.nulo(inssSalariosPagosCalculo)) {
            inssSalariosPagosCalculo = BigDecimal.ZERO;
        }
        BigDecimal somaDevidosMaisPagos = inssSalariosDevidosCalculo.add(inssSalariosPagosCalculo);
        Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
        BigDecimal totalCalculoInssSegurado = BigDecimal.ZERO;
        if (!calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty()) {
            totalCalculoInssSegurado = calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado() != false ? calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSegurado() : BigDecimal.ZERO;
        }
        BigDecimal proporcao = BigDecimal.ZERO;
        if (somaDevidosMaisPagos.compareTo(BigDecimal.ZERO) != 0) {
            proporcao = totalCalculoInssSegurado.divide(somaDevidosMaisPagos, MathContext.DECIMAL32);
        }
        Collection debitosDoReclamadoAtualizacao = resumoJRAdapterPagamento.getOcorrenciasDebitoReclamado().getData();
        BigDecimal inssSalariosDevidos = this.getValorItemResumoAtualizacao(CHAVE_INSS_SALARIOS_DEVIDOS, debitosDoReclamadoAtualizacao);
        BigDecimal inssSalariosPagos = this.getValorItemResumoAtualizacao(CHAVE_INSS_SALARIOS_PAGOS, debitosDoReclamadoAtualizacao);
        if (Utils.nulo(inssSalariosDevidos)) {
            inssSalariosDevidos = BigDecimal.ZERO;
        }
        if (Utils.nulo(inssSalariosPagos)) {
            inssSalariosPagos = BigDecimal.ZERO;
        }
        BigDecimal somaDevidosMaisPagosAtualizacao = inssSalariosDevidos.add(inssSalariosPagos);
        BigDecimal totalAtualizacaoInssSegurado = somaDevidosMaisPagosAtualizacao.multiply(proporcao, MathContext.DECIMAL32).setScale(2, RoundingMode.HALF_EVEN);
        pjeCalcImportacao.setInssReclamante(totalAtualizacaoInssSegurado);
        pjeCalcImportacao.setInssReclamado(somaDevidosMaisPagosAtualizacao.subtract(totalAtualizacaoInssSegurado));
        BigDecimal inssDezPorcento = this.getValorItemResumoAtualizacao("CONTRIBUI\u00c7\u00c3O SOCIAL 10%", debitosDoReclamadoAtualizacao);
        BigDecimal inssMeioPorcento = this.getValorItemResumoAtualizacao("CONTRIBUI\u00c7\u00c3O SOCIAL 0,5%", debitosDoReclamadoAtualizacao);
        pjeCalcImportacao.setContribuicaoSocialDezPorCento(inssDezPorcento);
        pjeCalcImportacao.setContribuicaoSocialMeioPorCento(inssMeioPorcento);
    }

    private void setDadosCustasJudiciais(PJeCalcImportacao pjeCalcImportacao, ResumoJRAdapter resumoJRAdapter) {
        Collection custasDebitoDoReclamado = resumoJRAdapter.getOcorrenciasCustasDebitoReclamado().getData();
        custasDebitoDoReclamado.addAll(resumoJRAdapter.getOcorrenciasDebitoCobrarReclamante().getData());
        BigDecimal devidasPeloReclamante = this.getValorItemResumo("CUSTAS JUDICIAIS DEVIDAS PELO RECLAMANTE", custasDebitoDoReclamado);
        BigDecimal devidasPeloReclamado = this.getValorItemResumo("CUSTAS JUDICIAIS DEVIDAS PELO RECLAMADO", custasDebitoDoReclamado);
        pjeCalcImportacao.setCustasReclamante(devidasPeloReclamante);
        pjeCalcImportacao.setCustasReclamado(devidasPeloReclamado);
        custasDebitoDoReclamado.removeAll(resumoJRAdapter.getOcorrenciasDebitoCobrarReclamante().getData());
    }

    private void setDadosCustasJudiciaisAtualizacao(PJeCalcImportacao pjeCalcImportacao, ResumoJRAdapterPagamento resumoJRAdapterPagamento) {
        Collection custasDebitoDoReclamado = resumoJRAdapterPagamento.getOcorrenciasDebitoReclamado().getData();
        custasDebitoDoReclamado.addAll(resumoJRAdapterPagamento.getOcorrenciasDebitoCobrarReclamante().getData());
        BigDecimal devidasPeloReclamante = this.getValorItemResumoAtualizacao("CUSTAS JUDICIAIS DEVIDAS PELO RECLAMANTE", custasDebitoDoReclamado);
        BigDecimal devidasPeloReclamado = this.getValorItemResumoAtualizacao("CUSTAS JUDICIAIS DEVIDAS PELO RECLAMADO", custasDebitoDoReclamado);
        pjeCalcImportacao.setCustasReclamante(devidasPeloReclamante);
        pjeCalcImportacao.setCustasReclamado(devidasPeloReclamado);
        custasDebitoDoReclamado.removeAll(resumoJRAdapterPagamento.getOcorrenciasDebitoCobrarReclamante().getData());
    }

    private void setDadosMultas(PJeCalcImportacao pjeCalcImportacao, ResumoJRAdapter resumoJRAdapter) {
        Collection debitosDoReclamado = resumoJRAdapter.getOcorrenciasDebitoReclamado().getData();
        debitosDoReclamado.addAll(resumoJRAdapter.getOcorrenciasDebitoCobrarReclamante().getData());
        ArrayList<PJeCalcImportacaoMulta> multas = new ArrayList<PJeCalcImportacaoMulta>();
        Calculo calculoAberto = this.servicoDeCalculo.obterCalculoAberto();
        Set<Multa> multasDoCalculo = calculoAberto.getMultasDoCalculo();
        String chave = "MULTAS / INDENIZA\u00c7\u00d5ES DEVIDAS PARA ";
        for (ResumoJRAdapter.ItemResumo item : debitosDoReclamado) {
            if (!item.getLabel().equalsIgnoreCase(chave) && !StringUtils.containsIgnoreCase((String)item.getLabel(), (String)chave)) continue;
            PJeCalcImportacaoMulta multa = new PJeCalcImportacaoMulta();
            multa.setDescricao(item.getLabel());
            multa.setValor(item.getValor());
            String credor = item.getLabel().substring(chave.length());
            multa.setNomeCredor(credor);
            multa.setDocumentoFiscalCredor(null);
            for (Multa m : multasDoCalculo) {
                this.setOutrosDadosPjeCalcImportacaoMulta(multa, m, credor, calculoAberto);
            }
            multas.add(multa);
            pjeCalcImportacao.getMultas().add(multa);
        }
        debitosDoReclamado.removeAll(resumoJRAdapter.getOcorrenciasDebitoCobrarReclamante().getData());
    }

    private void setDadosMultasAtualizacao(PJeCalcImportacao pjeCalcImportacao, ResumoJRAdapterPagamento resumoJRAdapterPagamento) {
        Collection debitosDoReclamado = resumoJRAdapterPagamento.getOcorrenciasDebitoReclamado().getData();
        debitosDoReclamado.addAll(resumoJRAdapterPagamento.getOcorrenciasDebitoCobrarReclamante().getData());
        ArrayList<PJeCalcImportacaoMulta> multas = new ArrayList<PJeCalcImportacaoMulta>();
        Calculo calculoAberto = this.servicoDeCalculo.obterCalculoAberto();
        Set<Multa> setMultas = calculoAberto.getMultas();
        String chave = "MULTAS / INDENIZA\u00c7\u00d5ES DEVIDAS PARA ";
        for (ResumoJRAdapterPagamento.ItemResumo item : debitosDoReclamado) {
            if (!item.getLabel().equalsIgnoreCase(chave) && !StringUtils.containsIgnoreCase((String)item.getLabel(), (String)chave)) continue;
            PJeCalcImportacaoMulta multa = new PJeCalcImportacaoMulta();
            multa.setDescricao(item.getLabel());
            multa.setValor(item.getValor());
            String credor = item.getLabel().substring(chave.length());
            multa.setNomeCredor(credor);
            multa.setDocumentoFiscalCredor(null);
            for (Multa m : setMultas) {
                this.setOutrosDadosPjeCalcImportacaoMulta(multa, m, credor, calculoAberto);
            }
            multas.add(multa);
            pjeCalcImportacao.getMultas().add(multa);
        }
        debitosDoReclamado.removeAll(resumoJRAdapterPagamento.getOcorrenciasDebitoCobrarReclamante().getData());
    }

    private void setOutrosDadosPjeCalcImportacaoMulta(PJeCalcImportacaoMulta multa, Multa m, String credor, Calculo calculoAberto) {
        CredorDevedorMultaEnum tipoCredorDevedor = m.getTipoCredorDevedor();
        if (Utils.naoNulo(m.getNomeTerceiro()) && m.getNomeTerceiro().equalsIgnoreCase(credor)) {
            multa.setIdMultaPJeCalc(m.getId());
            if (tipoCredorDevedor.equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE)) {
                Reclamante reclamante = calculoAberto.getProcesso().getReclamante();
                multa.setNomeDevedor(Utils.naoNulo(reclamante) ? reclamante.getNome() : null);
                multa.setDocumentoFiscalDevedor(Utils.naoNulos(reclamante, reclamante.getNumeroDocumentoFiscal()) ? reclamante.getTipoDocumentoFiscal().getFormatado(reclamante.getNumeroDocumentoFiscal()) : null);
            } else if (tipoCredorDevedor.equals((Object)CredorDevedorMultaEnum.TERCEIRO_RECLAMADO)) {
                Reclamado reclamado = calculoAberto.getProcesso().getReclamado();
                multa.setNomeDevedor(Utils.naoNulo(reclamado) ? reclamado.getNome() : null);
                multa.setDocumentoFiscalDevedor(Utils.naoNulos(reclamado, reclamado.getNumeroDocumentoFiscal()) ? reclamado.getTipoDocumentoFiscal().getFormatado(reclamado.getNumeroDocumentoFiscal()) : null);
            }
        }
    }

    private void setDadosHonorarios(PJeCalcImportacao pjeCalcImportacao, ResumoJRAdapter resumoJRAdapter) {
        Collection debitosDoReclamado = resumoJRAdapter.getOcorrenciasDebitoReclamado().getData();
        debitosDoReclamado.addAll(resumoJRAdapter.getOcorrenciasDebitoCobrarReclamante().getData());
        ArrayList<PJeCalcImportacaoHonorario> honorarios = new ArrayList<PJeCalcImportacaoHonorario>();
        Calculo calculoAberto = this.servicoDeCalculo.obterCalculoAberto();
        Set<Honorario> honorariosDoCalculo = calculoAberto.getHonorariosDoCalculo();
        String chave = HONORARIOS_LIQUIDOS_PARA;
        for (ResumoJRAdapter.ItemResumo item : debitosDoReclamado) {
            if (!item.getLabel().equalsIgnoreCase(chave) && !StringUtils.containsIgnoreCase((String)item.getLabel(), (String)chave)) continue;
            PJeCalcImportacaoHonorario honorario = new PJeCalcImportacaoHonorario();
            String credor = item.getLabel().substring(chave.length());
            honorario.setDescricao(item.getLabel());
            honorario.setValor(item.getValor());
            String chave2 = SOBRE_HONORARIOS_PARA + credor;
            for (ResumoJRAdapter.ItemResumo item2 : debitosDoReclamado) {
                this.setOutrosDadosPJeCalcImportacaoHonorario(item2.getLabel(), item2.getValor(), chave2, honorario, credor, honorariosDoCalculo, calculoAberto);
            }
            honorarios.add(honorario);
            pjeCalcImportacao.getHonorarios().add(honorario);
        }
        debitosDoReclamado.removeAll(resumoJRAdapter.getOcorrenciasDebitoCobrarReclamante().getData());
    }

    private void setDadosHonorariosAtualizacao(PJeCalcImportacao pjeCalcImportacao, ResumoJRAdapterPagamento resumoJRAdapterPagamento) {
        Collection debitosDoReclamado = resumoJRAdapterPagamento.getOcorrenciasDebitoReclamado().getData();
        debitosDoReclamado.addAll(resumoJRAdapterPagamento.getOcorrenciasDebitoCobrarReclamante().getData());
        ArrayList<PJeCalcImportacaoHonorario> honorarios = new ArrayList<PJeCalcImportacaoHonorario>();
        Calculo calculoAberto = this.servicoDeCalculo.obterCalculoAberto();
        Set<Honorario> setHonorarios = calculoAberto.getHonorarios();
        String chave = HONORARIOS_LIQUIDOS_PARA;
        for (ResumoJRAdapterPagamento.ItemResumo item : debitosDoReclamado) {
            if (!item.getLabel().equalsIgnoreCase(chave) && !StringUtils.containsIgnoreCase((String)item.getLabel(), (String)chave)) continue;
            PJeCalcImportacaoHonorario honorario = new PJeCalcImportacaoHonorario();
            String credor = item.getLabel().substring(chave.length());
            honorario.setDescricao(item.getLabel());
            honorario.setValor(item.getValor());
            String chave2 = SOBRE_HONORARIOS_PARA + credor;
            for (ResumoJRAdapterPagamento.ItemResumo item2 : debitosDoReclamado) {
                this.setOutrosDadosPJeCalcImportacaoHonorario(item2.getLabel(), item2.getValor(), chave2, honorario, credor, setHonorarios, calculoAberto);
            }
            honorarios.add(honorario);
            pjeCalcImportacao.getHonorarios().add(honorario);
        }
        debitosDoReclamado.removeAll(resumoJRAdapterPagamento.getOcorrenciasDebitoCobrarReclamante().getData());
    }

    private void setOutrosDadosPJeCalcImportacaoHonorario(String itemLabel, BigDecimal itemValor, String chave2, PJeCalcImportacaoHonorario honorario, String credor, Set<Honorario> honorariosDoCalculo, Calculo calculoAberto) {
        boolean isIRPJ;
        boolean isIRPF = itemLabel.equalsIgnoreCase("IRPF" + chave2) || StringUtils.containsIgnoreCase((String)itemLabel, (String)("IRPF" + chave2));
        boolean isIRRF = itemLabel.equalsIgnoreCase("IRRF" + chave2) || StringUtils.containsIgnoreCase((String)itemLabel, (String)("IRRF" + chave2));
        boolean bl = isIRPJ = itemLabel.equalsIgnoreCase("IRPJ" + chave2) || StringUtils.containsIgnoreCase((String)itemLabel, (String)("IRPJ" + chave2));
        if (isIRPF || isIRRF || isIRPJ) {
            honorario.setIrpfHonorario(itemValor);
            for (Honorario h : honorariosDoCalculo) {
                TipoDeDevedorDoHonorarioEnum tipoDeDevedor;
                if (!h.getNomeCredor().equalsIgnoreCase(credor)) continue;
                honorario.setIdHonorarioPJeCalc(h.getId());
                honorario.setNomeCredor(h.getNomeCredor());
                if (Utils.naoNulos(new Object[]{h.getTipoDocumentoFiscalCredor(), h.getNumeroDocumentoFiscalCredor()})) {
                    honorario.setDocumentoFiscalCredor(h.getTipoDocumentoFiscalCredor().getFormatado(h.getNumeroDocumentoFiscalCredor()));
                }
                if ((tipoDeDevedor = h.getTipoDeDevedor()).equals((Object)TipoDeDevedorDoHonorarioEnum.RECLAMANTE)) {
                    Reclamante reclamante = calculoAberto.getProcesso().getReclamante();
                    honorario.setNomeDevedor(Utils.naoNulo(reclamante) ? reclamante.getNome() : null);
                    honorario.setDocumentoFiscalDevedor(Utils.naoNulos(reclamante, reclamante.getNumeroDocumentoFiscal()) ? reclamante.getTipoDocumentoFiscal().getFormatado(reclamante.getNumeroDocumentoFiscal()) : null);
                    continue;
                }
                if (!tipoDeDevedor.equals((Object)TipoDeDevedorDoHonorarioEnum.RECLAMADO)) continue;
                Reclamado reclamado = calculoAberto.getProcesso().getReclamado();
                honorario.setNomeDevedor(Utils.naoNulo(reclamado) ? reclamado.getNome() : null);
                honorario.setDocumentoFiscalDevedor(Utils.naoNulos(reclamado, reclamado.getNumeroDocumentoFiscal()) ? reclamado.getTipoDocumentoFiscal().getFormatado(reclamado.getNumeroDocumentoFiscal()) : null);
            }
        }
    }

    private void setOutrosDados(PJeCalcImportacao pjeCalcImportacao, ResumoJRAdapter resumoJRAdapter) {
        Collection debitosDoReclamado = resumoJRAdapter.getOcorrenciasDebitoReclamado().getData();
        BigDecimal pensaoAlimenticia = this.getValorItemResumo("PENS\u00c3O ALIMENT\u00cdCIA", debitosDoReclamado);
        BigDecimal previdenciaPrivada = this.getValorItemResumo("PREVID\u00caNCIA PRIVADA", debitosDoReclamado);
        BigDecimal depositoFgts = this.getValorItemResumo("DEP\u00d3SITO FGTS", debitosDoReclamado);
        BigDecimal irpf = this.getValorItemResumo("IRPF DEVIDO", debitosDoReclamado);
        BigDecimal liquidoDevidoReclamante = this.getValorItemResumo("L\u00cdQUIDO DEVIDO AO RECLAMANTE", debitosDoReclamado);
        pjeCalcImportacao.setDebitoReclamantePensaoAlimenticia(pensaoAlimenticia);
        pjeCalcImportacao.setDebitoReclamantePrevidenciaPrivada(previdenciaPrivada);
        pjeCalcImportacao.setFgtsDepositoContaVinculada(depositoFgts);
        pjeCalcImportacao.setImpostoDeRenda(irpf);
        pjeCalcImportacao.setPagoPrincipal(liquidoDevidoReclamante);
    }

    private void setDadosPrecatorio(PJeCalcImportacao pjeCalcImportacao, ResumoPrecatorioJrAdapterPadrao resumoPrecatorioJRAdapter) {
        Collection valoresPrecatorio = resumoPrecatorioJRAdapter.getOcorrenciasValorRequisitadoUm().getData();
        Collection valoresHonorariosReclamante = resumoPrecatorioJRAdapter.getOcorrenciasValorRequisitadoDois().getData();
        Collection valoresHonorariosReclamado = resumoPrecatorioJRAdapter.getOcorrenciasOutrosDebitosReclamada().getData();
        Calculo calculoAberto = this.servicoDeCalculo.obterCalculoAberto();
        Processo processo = calculoAberto.getProcesso();
        Reclamante reclamante = Utils.naoNulo(processo) ? calculoAberto.getProcesso().getReclamante() : null;
        Date dataCalculo = calculoAberto.getDataDeLiquidacao();
        String nomeBeneficiario = reclamante != null ? reclamante.getNome() : "";
        String documentoFiscalBeneficiario = reclamante != null ? reclamante.getTipoDocumentoFiscal().getFormatado(reclamante.getNumeroDocumentoFiscal()) : "";
        BigDecimal exequenteLiquido = this.getValorItemResumoPrecatorio("Exeq. L\u00edquido", valoresPrecatorio);
        BigDecimal inssBeneficiario = this.getValorItemResumoPrecatorio("INSS Benefici\u00e1rio", valoresPrecatorio);
        BigDecimal inssExecutado = this.getValorItemResumoPrecatorio("INSS Executado", valoresPrecatorio);
        BigDecimal impostoRenda = this.getValorItemResumoPrecatorio("IR", valoresPrecatorio);
        BigDecimal depositoFgts = this.getValorItemResumoPrecatorio("Dep\u00f3sito FGTS", valoresPrecatorio);
        BigDecimal custasJudiciais = this.getValorItemResumoPrecatorio("Custas Judiciais", valoresPrecatorio);
        List<HonorarioGPrec> honorariosReclamante = this.encontrarDadosHonorariosGPrec(valoresHonorariosReclamante, calculoAberto);
        List<HonorarioGPrec> honorariosReclamado = this.encontrarDadosHonorariosGPrec(valoresHonorariosReclamado, calculoAberto);
        DadosGPrec dadosGPrec = new DadosGPrec();
        dadosGPrec.setDataCalculo(dataCalculo);
        dadosGPrec.setNomeBeneficiario(nomeBeneficiario);
        dadosGPrec.setDocumentoFiscalBeneficiario(documentoFiscalBeneficiario);
        dadosGPrec.setExequenteLiquido(exequenteLiquido);
        dadosGPrec.setInssBeneficiario(inssBeneficiario);
        dadosGPrec.setInssExecutado(inssExecutado);
        dadosGPrec.setImpostoRenda(impostoRenda);
        dadosGPrec.setDepositoFgts(depositoFgts);
        dadosGPrec.setCustasJudiciais(custasJudiciais);
        dadosGPrec.setHonorariosReclamante(honorariosReclamante);
        dadosGPrec.setHonorariosReclamado(honorariosReclamado);
        pjeCalcImportacao.setDadosGPrec(dadosGPrec);
    }

    private List<HonorarioGPrec> encontrarDadosHonorariosGPrec(Collection<AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio> valoresHonorarios, Calculo calculo) {
        ArrayList<HonorarioGPrec> honorarios = new ArrayList<HonorarioGPrec>();
        Set<Honorario> honorariosDoCalculo = calculo.getHonorariosDoCalculo();
        String chave = HONORARIOS_LIQUIDOS_PARA;
        for (AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio item : valoresHonorarios) {
            if (!item.getLabel().equalsIgnoreCase(chave) && !StringUtils.containsIgnoreCase((String)item.getLabel(), (String)chave)) continue;
            HonorarioGPrec honorario = new HonorarioGPrec();
            String nome = item.getLabel().substring(chave.length());
            honorario.setNome(nome);
            honorario.setValor(item.getValor());
            String chave2 = SOBRE_HONORARIOS_PARA + nome;
            for (AbstractResumoPrecatorioJrAdapter.ItemResumoPrecatorio item2 : valoresHonorarios) {
                this.completarInformacoesHonorarioGPrec(item2.getLabel(), item2.getValor(), chave2, honorario, nome, honorariosDoCalculo);
            }
            honorarios.add(honorario);
        }
        return honorarios;
    }

    private void completarInformacoesHonorarioGPrec(String itemLabel, BigDecimal itemValor, String chave2, HonorarioGPrec honorario, String nome, Set<Honorario> honorariosDoCalculo) {
        boolean isIRPJ;
        boolean isIRPF = itemLabel.equalsIgnoreCase("IRPF" + chave2) || StringUtils.containsIgnoreCase((String)itemLabel, (String)("IRPF" + chave2));
        boolean isIRRF = itemLabel.equalsIgnoreCase("IRRF" + chave2) || StringUtils.containsIgnoreCase((String)itemLabel, (String)("IRRF" + chave2));
        boolean bl = isIRPJ = itemLabel.equalsIgnoreCase("IRPJ" + chave2) || StringUtils.containsIgnoreCase((String)itemLabel, (String)("IRPJ" + chave2));
        if (isIRPF || isIRRF || isIRPJ) {
            honorario.setImpostoRenda(itemValor);
            block4: for (Honorario h : honorariosDoCalculo) {
                if (!h.getNomeCredor().equalsIgnoreCase(nome)) continue;
                if (Utils.naoNulos(new Object[]{h.getTipoDocumentoFiscalCredor(), h.getNumeroDocumentoFiscalCredor()})) {
                    honorario.setDocumentoFiscal(h.getTipoDocumentoFiscalCredor().getFormatado(h.getNumeroDocumentoFiscalCredor()));
                }
                switch (h.getTipoHonorario()) {
                    case ADVOCATICIOS: {
                        honorario.setTipo(TipoHonorarioGPrec.ADV);
                        continue block4;
                    }
                    case PERICIAIS_CONTADOR: 
                    case PERICIAIS_DOCUMENTOSCOPIO: 
                    case PERICIAIS_ENGENHEIRO: 
                    case PERICIAIS_INTERPRETE: 
                    case PERICIAIS_MEDICO: 
                    case PERICIAIS_OUTROS: {
                        honorario.setTipo(TipoHonorarioGPrec.PER);
                        continue block4;
                    }
                }
                honorario.setTipo(TipoHonorarioGPrec.OUT);
            }
        }
    }

    private void setOutrosDadosAtualizacao(PJeCalcImportacao pjeCalcImportacao, ResumoJRAdapterPagamento resumoJRAdapterPagamento) {
        Collection debitosDoReclamado = resumoJRAdapterPagamento.getOcorrenciasDebitoReclamado().getData();
        BigDecimal pensaoAlimenticia = this.getValorItemResumoAtualizacao("PENS\u00c3O ALIMENT\u00cdCIA", debitosDoReclamado);
        BigDecimal previdenciaPrivada = this.getValorItemResumoAtualizacao("PREVID\u00caNCIA PRIVADA", debitosDoReclamado);
        BigDecimal depositoFgts = this.getValorItemResumoAtualizacao("DEP\u00d3SITO FGTS", debitosDoReclamado);
        BigDecimal irpf = this.getValorItemResumoAtualizacao("IRPF DEVIDO", debitosDoReclamado);
        BigDecimal liquidoDevidoReclamante = this.getValorItemResumoAtualizacao("L\u00cdQUIDO DEVIDO AO RECLAMANTE", debitosDoReclamado);
        pjeCalcImportacao.setDebitoReclamantePensaoAlimenticia(pensaoAlimenticia);
        pjeCalcImportacao.setDebitoReclamantePrevidenciaPrivada(previdenciaPrivada);
        pjeCalcImportacao.setFgtsDepositoContaVinculada(depositoFgts);
        pjeCalcImportacao.setImpostoDeRenda(irpf);
        pjeCalcImportacao.setPagoPrincipal(liquidoDevidoReclamante);
    }

    private void setDadosContribuicaoSocialAtualizacaoPrecatorio(PJeCalcImportacao pjeCalcImportacao, ResumoPrecatorioJRAdapterPagamento resumoPrecatorioJRAdapterPagamento) {
        boolean existeInssSeguradoSalariosDevidos;
        Collection debitosDoReclamadoAtualizacao = resumoPrecatorioJRAdapterPagamento.getOcorrenciasDebitoReclamado().getData();
        pjeCalcImportacao.setInssReclamante(BigDecimal.ZERO);
        pjeCalcImportacao.setInssReclamado(BigDecimal.ZERO);
        pjeCalcImportacao.setContribuicaoSocialDezPorCento(BigDecimal.ZERO);
        pjeCalcImportacao.setContribuicaoSocialMeioPorCento(BigDecimal.ZERO);
        Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
        List<DebitosDoReclamante> resultado = DebitosDoReclamante.obterUltimoRegistro(calculo.getAtualizacao());
        boolean existeDebitosDoReclamante = resultado != null && resultado.size() > 0;
        boolean bl = existeInssSeguradoSalariosDevidos = calculo.getInss() != null && calculo.getInss().getInssSobreSalariosDevidos() != null && calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante() != null && calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante().compareTo(BigDecimal.ZERO) > 0;
        if (existeDebitosDoReclamante && existeInssSeguradoSalariosDevidos) {
            BigDecimal proporcaoJurosInssSegurado = Utils.dividir(calculo.getInss().getInssSobreSalariosDevidos().getJurosTotalInssSegurado(), calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante());
            BigDecimal proporcaoMultaInssSegurado = Utils.dividir(calculo.getInss().getInssSobreSalariosDevidos().getMultaTotalInssSegurado(), calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante());
            if (resultado.size() > 0) {
                DebitosDoReclamante debitosDoReclamante = resultado.get(0);
                BigDecimal jurosInssSeguradoProporcional = Utils.multiplicar(debitosDoReclamante.getDiferencaInssPrecatorio(), proporcaoJurosInssSegurado);
                BigDecimal multaInssSeguradoProporcional = Utils.multiplicar(debitosDoReclamante.getDiferencaInssPrecatorio(), proporcaoMultaInssSegurado);
                BigDecimal jurosMaisMulta = Utils.somar(jurosInssSeguradoProporcional, multaInssSeguradoProporcional);
                BigDecimal inssBeneficiario = Utils.somar(this.getValorItemResumoPrecatorioAtualizacao("INSS BENEFICI\u00c1RIO", debitosDoReclamadoAtualizacao), jurosMaisMulta);
                BigDecimal inssExecutadoDevidos = Utils.subtrair(this.getValorItemResumoPrecatorioAtualizacao("INSS EXECUTADO - SAL\u00c1RIOS DEVIDOS", debitosDoReclamadoAtualizacao), jurosMaisMulta);
                BigDecimal inssPacto = this.getValorItemResumoPrecatorioAtualizacao("INSS EXECUTADO - SAL\u00c1RIOS PAGOS", debitosDoReclamadoAtualizacao);
                pjeCalcImportacao.setInssReclamante(Utils.arredondarValorMonetario(inssBeneficiario));
                pjeCalcImportacao.setInssReclamado(Utils.arredondarValorMonetario(Utils.somar(inssExecutadoDevidos, inssPacto)));
            }
        }
    }

    private void setDadosCustasJudiciaisAtualizacaoPrecatorio(PJeCalcImportacao pjeCalcImportacao, ResumoPrecatorioJRAdapterPagamento resumoPrecatorioJRAdapterPagamento) {
        Collection custasDebitoDoReclamado = resumoPrecatorioJRAdapterPagamento.getOcorrenciasDebitoReclamado().getData();
        custasDebitoDoReclamado.addAll(resumoPrecatorioJRAdapterPagamento.getOcorrenciasDebitoCobrarReclamante().getData());
        BigDecimal devidasPeloReclamante = this.getValorItemResumoPrecatorioAtualizacao("CUSTAS JUDICIAIS - EXEQUENTE", custasDebitoDoReclamado);
        BigDecimal devidasPeloReclamado = this.getValorItemResumoPrecatorioAtualizacao("CUSTAS JUDICIAIS - EXECUTADO", custasDebitoDoReclamado);
        pjeCalcImportacao.setCustasReclamante(devidasPeloReclamante);
        pjeCalcImportacao.setCustasReclamado(devidasPeloReclamado);
        custasDebitoDoReclamado.removeAll(resumoPrecatorioJRAdapterPagamento.getOcorrenciasDebitoCobrarReclamante().getData());
    }

    private void setDadosHonorariosAtualizacaoPrecatorio(PJeCalcImportacao pjeCalcImportacao, ResumoPrecatorioJRAdapterPagamento resumoPrecatorioJRAdapterPagamento) {
        Collection debitosDoReclamado = resumoPrecatorioJRAdapterPagamento.getOcorrenciasDebitoReclamado().getData();
        debitosDoReclamado.addAll(resumoPrecatorioJRAdapterPagamento.getOcorrenciasDebitoCobrarReclamante().getData());
        Calculo calculoAberto = this.servicoDeCalculo.obterCalculoAberto();
        Set<Honorario> setHonorarios = calculoAberto.getHonorarios();
        String chave = HONORARIOS_LIQUIDOS_PARA;
        for (ResumoPrecatorioJRAdapterPagamento.ItemResumo item : debitosDoReclamado) {
            if (!item.getLabel().equalsIgnoreCase(chave) && !StringUtils.containsIgnoreCase((String)item.getLabel(), (String)chave)) continue;
            PJeCalcImportacaoHonorario honorario = new PJeCalcImportacaoHonorario();
            String credor = item.getLabel().substring(chave.length());
            honorario.setDescricao(item.getLabel());
            honorario.setValor(item.getValor());
            String chave2 = SOBRE_HONORARIOS_PARA + credor;
            for (ResumoPrecatorioJRAdapterPagamento.ItemResumo item2 : debitosDoReclamado) {
                this.setOutrosDadosPJeCalcImportacaoHonorario(item2.getLabel(), item2.getValor(), chave2, honorario, credor, setHonorarios, calculoAberto);
            }
            pjeCalcImportacao.getHonorarios().add(honorario);
        }
        debitosDoReclamado.removeAll(resumoPrecatorioJRAdapterPagamento.getOcorrenciasDebitoCobrarReclamante().getData());
    }

    private void setOutrosDadosAtualizacaoPrecatorio(PJeCalcImportacao pjeCalcImportacao, ResumoPrecatorioJRAdapterPagamento resumoPrecatorioJRAdapterPagamento) {
        Collection debitosDoReclamado = resumoPrecatorioJRAdapterPagamento.getOcorrenciasDebitoReclamado().getData();
        BigDecimal depositoFgts = this.getValorItemResumoPrecatorioAtualizacao("DEP\u00d3SITO FGTS", debitosDoReclamado);
        BigDecimal irpf = this.getValorItemResumoPrecatorioAtualizacao("IMPOSTO DE RENDA", debitosDoReclamado);
        BigDecimal liquidoDevidoReclamante = this.getValorItemResumoPrecatorioAtualizacao("L\u00cdQUIDO DEVIDO AO RECLAMANTE", debitosDoReclamado);
        pjeCalcImportacao.setDebitoReclamantePensaoAlimenticia(BigDecimal.ZERO);
        pjeCalcImportacao.setDebitoReclamantePrevidenciaPrivada(BigDecimal.ZERO);
        pjeCalcImportacao.setFgtsDepositoContaVinculada(depositoFgts);
        pjeCalcImportacao.setImpostoDeRenda(irpf);
        pjeCalcImportacao.setPagoPrincipal(liquidoDevidoReclamante);
    }
}

