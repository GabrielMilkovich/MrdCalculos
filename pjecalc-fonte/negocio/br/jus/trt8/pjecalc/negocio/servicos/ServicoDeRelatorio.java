/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.JRDataSource
 *  net.sf.jasperreports.engine.JREmptyDataSource
 *  net.sf.jasperreports.engine.JRException
 *  net.sf.jasperreports.engine.JRExporterParameter
 *  net.sf.jasperreports.engine.JasperCompileManager
 *  net.sf.jasperreports.engine.JasperExportManager
 *  net.sf.jasperreports.engine.JasperFillManager
 *  net.sf.jasperreports.engine.JasperPrint
 *  net.sf.jasperreports.engine.JasperReport
 *  net.sf.jasperreports.engine.export.JRHtmlExporter
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.Create
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 *  org.jboss.seam.core.SeamResourceBundle
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.base.comum.AttachmentImpl;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.Attachment;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.InfraException;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.FormatoRelatorioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.RelatorioPagamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeArquivoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoRelatorioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.consolidado.ConsolidadoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.consolidado.PagamentoConsolidadoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.consolidado.RelatorioConsolidadoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio.ConsolidadoPorProcessoAtualizacaoJRAdapterPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio.ConsolidadoPorProcessoJRAdapterPadrao;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.ResourceBundle;
import net.sf.jasperreports.engine.JRDataSource;
import net.sf.jasperreports.engine.JREmptyDataSource;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JRExporterParameter;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.export.JRHtmlExporter;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.Create;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.jboss.seam.core.SeamResourceBundle;

@Name(value="servicoDeRelatorio")
@Scope(value=ScopeType.STATELESS)
@AutoCreate
public class ServicoDeRelatorio
implements Serializable {
    private static final long serialVersionUID = 1L;
    private static final boolean COMPILAR_SEMPRE = true;
    private static final String URI_DO_LOGO = "relatorios/calculo/pjecalc.png";
    private static final String ID_RELATORIO_HISTORICO_SALARIAL = "jr_historico_salarial_1";
    private static final String ID_RELATORIO_CARTAO_PONTO_MENSAL = "jr_cartao_mensal_1";
    private static final String ID_RELATORIO_CARTAO_PONTO_DIARIO = "jr_cartao_diario_1";
    private String versionHash;
    private static final String PADRAO_IDENTIFICACAO_1 = "\\Q-\\E";
    private static final String PADRAO_IDENTIFICACAO_2 = "\\Q.\\E";
    private static final String PADRAO_DATA = "ddMMyyyy";
    private static final String PADRAO_HORA = "HHmmss";

    @Create
    public String getVersionHash() {
        if (Utils.nulo(this.versionHash)) {
            ResourceBundle resourceBundle = SeamResourceBundle.getBundle();
            this.versionHash = String.valueOf(resourceBundle.getString("versao").hashCode());
        }
        return this.versionHash;
    }

    private InputStream getRelatorio(String uri) {
        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        return classLoader.getResourceAsStream(uri);
    }

    private JasperReport getRelatorioCompilado(String id, InputStream in) throws JRException {
        return JasperCompileManager.compileReport((InputStream)in);
    }

    public Attachment gerarRelatorio(TipoRelatorioEnum tipo, Calculo calculo, List<?> sessoes, FormatoRelatorioEnum formatoRelatorio) {
        if (sessoes.isEmpty()) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0015, "pelo menos um relat\u00f3rio"));
        }
        JRAdapter relatorioAdapter = this.getInstanciaRelatorio(tipo, calculo, sessoes);
        InputStream inURI = this.getRelatorio(tipo.getUri());
        InputStream inLogo = this.getRelatorio(URI_DO_LOGO);
        LinkedHashMap<String, InputStream> inSessoes = new LinkedHashMap<String, InputStream>();
        switch (tipo) {
            case CALCULO_CONSOLIDADO: {
                String id;
                InputStream in;
                int numero;
                for (Enum sessaoRelatorio : sessoes) {
                    numero = 1;
                    for (String uri : ((RelatorioConsolidadoEnum)sessaoRelatorio).getUri()) {
                        in = this.getRelatorio(uri);
                        id = "jr_" + sessaoRelatorio.name().toLowerCase() + "_" + numero++;
                        inSessoes.put(id, in);
                    }
                }
                break;
            }
            case PAGAMENTO_CONSOLIDADO: {
                String id;
                InputStream in;
                int numero;
                for (Enum sessaoRelatorio : sessoes) {
                    numero = 1;
                    for (String uri : ((RelatorioPagamentoEnum)sessaoRelatorio).getUri()) {
                        in = this.getRelatorio(uri);
                        id = "jr_" + sessaoRelatorio.name().toLowerCase() + "_" + numero++;
                        inSessoes.put(id, in);
                    }
                }
                break;
            }
            case DEMONSTRATIVO_CALCULO: {
                break;
            }
            case PARAMETROS_CALCULO: {
                break;
            }
        }
        HashMap<String, Object> params = new HashMap<String, Object>();
        params.put(tipo.getId(), relatorioAdapter);
        params.put("logo", inLogo);
        try {
            byte[] data;
            JasperReport jrRelatorioCompilado = this.getRelatorioCompilado(tipo.getId(), inURI);
            for (Map.Entry entry : inSessoes.entrySet()) {
                InputStream in = (InputStream)entry.getValue();
                JasperReport jasperReport = null;
                if (((String)entry.getKey()).equalsIgnoreCase(ID_RELATORIO_HISTORICO_SALARIAL)) {
                    jasperReport = ((ConsolidadoJRAdapterPadrao)relatorioAdapter).getHistoricoSalarial().getHSJasperReport();
                    params.put((String)entry.getKey(), jasperReport);
                    continue;
                }
                if (((String)entry.getKey()).equalsIgnoreCase(ID_RELATORIO_CARTAO_PONTO_MENSAL)) {
                    jasperReport = ((ConsolidadoJRAdapterPadrao)relatorioAdapter).getCartaoDePontoMensal().getHSJasperReport();
                    params.put((String)entry.getKey(), jasperReport);
                    continue;
                }
                if (((String)entry.getKey()).equalsIgnoreCase(ID_RELATORIO_CARTAO_PONTO_DIARIO)) {
                    jasperReport = ((ConsolidadoJRAdapterPadrao)relatorioAdapter).getCartaoDePontoDiario().getHSJasperReport();
                    params.put((String)entry.getKey(), jasperReport);
                    continue;
                }
                jasperReport = this.getRelatorioCompilado((String)entry.getKey(), in);
                params.put((String)entry.getKey(), jasperReport);
            }
            JasperPrint jasperPrint = JasperFillManager.fillReport((JasperReport)jrRelatorioCompilado, params, (JRDataSource)new JREmptyDataSource(1));
            if (FormatoRelatorioEnum.PDF.equals((Object)formatoRelatorio)) {
                data = JasperExportManager.exportReportToPdf((JasperPrint)jasperPrint);
                Object[] objectArray = new Object[5];
                Object object = objectArray[0] = Utils.naoNulo(calculo.getProcesso().getIdentificadorDoProcesso().getIdentificacao()) ? "_PROCESSO_" + calculo.getProcesso().getIdentificacao().replaceAll(PADRAO_IDENTIFICACAO_1, "").replaceAll(PADRAO_IDENTIFICACAO_2, "") : "";
                objectArray[1] = tipo.isOrigemCalculo() ? "CALCULO" : (tipo.isOrigemAtualizacao() ? "ATUALIZACAO" : "");
                objectArray[2] = calculo.getId();
                objectArray[3] = HelperDate.getInstance().format(PADRAO_DATA);
                objectArray[4] = HelperDate.getInstance().format(PADRAO_HORA);
                String nomeRelatorio = String.format("RELATORIO%s_%s_%d_DATA_%s_HORA_%s.pdf", objectArray);
                return new AttachmentImpl(nomeRelatorio, TipoDeArquivoEnum.PDF.getContentType(), data);
            }
            data = this.gerarRelatorioHtml(jasperPrint).getBytes(StandardCharsets.ISO_8859_1);
            Object[] objectArray = new Object[5];
            Object object = objectArray[0] = Utils.naoNulo(calculo.getProcesso().getIdentificadorDoProcesso().getIdentificacao()) ? "_PROCESSO_" + calculo.getProcesso().getIdentificacao().replaceAll(PADRAO_IDENTIFICACAO_1, "").replaceAll(PADRAO_IDENTIFICACAO_2, "") : "";
            objectArray[1] = tipo.isOrigemCalculo() ? "CALCULO" : (tipo.isOrigemAtualizacao() ? "ATUALIZACAO" : "");
            objectArray[2] = calculo.getId();
            objectArray[3] = HelperDate.getInstance().format(PADRAO_DATA);
            objectArray[4] = HelperDate.getInstance().format(PADRAO_HORA);
            String nomeRelatorio = String.format("RELATORIO%s_%s_%d_DATA_%s_HORA_%s.html", objectArray);
            return new AttachmentImpl(nomeRelatorio, TipoDeArquivoEnum.HTML.getContentType(), data);
        }
        catch (JRException e) {
            throw new InfraException(e, new MensagemDeRecurso(Mensagens.MSG0013, new Object[0]));
        }
    }

    public static String obterIdentificacaoRelatorio(List<Calculo> calculos) {
        String idProcesso = ServicoDeRelatorio.obterPrimeiroIdProcesso(calculos);
        if (idProcesso == null) {
            return calculos.get(0).getProcesso().getReclamado().getNumeroDocumentoFiscal().replaceAll(PADRAO_IDENTIFICACAO_1, "").replaceAll(PADRAO_IDENTIFICACAO_2, "");
        }
        for (Calculo calculo : calculos) {
            if (calculo.getProcesso().getIdentificacao() != null && calculo.getProcesso().getIdentificacao().equalsIgnoreCase(idProcesso)) continue;
            return calculos.get(0).getProcesso().getReclamado().getNumeroDocumentoFiscal().replaceAll(PADRAO_IDENTIFICACAO_1, "").replaceAll(PADRAO_IDENTIFICACAO_2, "");
        }
        return idProcesso.replaceAll(PADRAO_IDENTIFICACAO_1, "").replaceAll(PADRAO_IDENTIFICACAO_2, "");
    }

    public static String obterNumeroProcesso(List<Calculo> calculos) {
        String idProcesso = ServicoDeRelatorio.obterPrimeiroIdProcesso(calculos);
        if (idProcesso == null) {
            return "";
        }
        for (Calculo calculo : calculos) {
            if (calculo.getProcesso().getIdentificacao() != null && calculo.getProcesso().getIdentificacao().equalsIgnoreCase(idProcesso)) continue;
            return "";
        }
        return idProcesso;
    }

    private static String obterPrimeiroIdProcesso(List<Calculo> calculos) {
        for (Calculo calculo : calculos) {
            if (calculo.getProcesso().getIdentificacao() == null) continue;
            return calculo.getProcesso().getIdentificacao();
        }
        return null;
    }

    public Attachment gerarRelatorioPorProcesso(List<Calculo> calculos, FormatoRelatorioEnum formatoRelatorio) {
        String identificacaoRelatorio = ServicoDeRelatorio.obterIdentificacaoRelatorio(calculos);
        ConsolidadoPorProcessoJRAdapterPadrao relatorioAdapter = new ConsolidadoPorProcessoJRAdapterPadrao(calculos);
        InputStream inURI = this.getRelatorio("relatorios/processo/consolidado-processo.jrxml");
        InputStream inLogo = this.getRelatorio(URI_DO_LOGO);
        LinkedHashMap<String, InputStream> inSessoes = new LinkedHashMap<String, InputStream>();
        inSessoes.put("jr_resumo_processo_1", this.getRelatorio("relatorios/processo/resumo/calculo-resumo-processo.jrxml"));
        inSessoes.put("jr_resumo_processo_2", this.getRelatorio("relatorios/processo/resumo/ocorrencias-resumo-processo-reclamantes.jrxml"));
        inSessoes.put("jr_resumo_processo_3", this.getRelatorio("relatorios/processo/resumo/ocorrencias-resumo-processo-reclamante.jrxml"));
        inSessoes.put("jr_resumo_processo_4", this.getRelatorio("relatorios/processo/resumo/ocorrencias-resumo-processo-credito-reclamante.jrxml"));
        inSessoes.put("jr_resumo_processo_5", this.getRelatorio("relatorios/processo/resumo/ocorrencias-resumo-processo-debito-reclamante.jrxml"));
        inSessoes.put("jr_resumo_processo_6", this.getRelatorio("relatorios/processo/resumo/ocorrencias-resumo-processo-debito-reclamado.jrxml"));
        inSessoes.put("jr_resumo_processo_7", this.getRelatorio("relatorios/processo/resumo/ocorrencias-resumo-processo-fora-do-principal.jrxml"));
        inSessoes.put("jr_resumo_processo_8", this.getRelatorio("relatorios/processo/resumo/ocorrencias-resumo-processo-custas-debito-reclamado.jrxml"));
        inSessoes.put("jr_resumo_processo_9", this.getRelatorio("relatorios/processo/resumo/ocorrencias-resumo-processo-debito-sem-custas-reclamado.jrxml"));
        inSessoes.put("jr_resumo_processo_10", this.getRelatorio("relatorios/processo/resumo/ocorrencias-resumo-secao-debito-reclamante.jrxml"));
        HashMap<String, Object> params = new HashMap<String, Object>();
        params.put("consolidado-processo", relatorioAdapter);
        params.put("logo", inLogo);
        try {
            byte[] data;
            JasperReport jrRelatorioCompilado = this.getRelatorioCompilado("consolidado-processo", inURI);
            for (Map.Entry entry : inSessoes.entrySet()) {
                InputStream in = (InputStream)entry.getValue();
                JasperReport jasperReport = this.getRelatorioCompilado((String)entry.getKey(), in);
                params.put((String)entry.getKey(), jasperReport);
            }
            JasperPrint jasperPrint = JasperFillManager.fillReport((JasperReport)jrRelatorioCompilado, params, (JRDataSource)new JREmptyDataSource(1));
            if (FormatoRelatorioEnum.PDF.equals((Object)formatoRelatorio)) {
                data = JasperExportManager.exportReportToPdf((JasperPrint)jasperPrint);
                return new AttachmentImpl(String.format("RELATORIO_CONSOLIDADO_PROCESSO_%s_DATA_%s_HORA_%s.pdf", identificacaoRelatorio, HelperDate.getInstance().format(PADRAO_DATA), HelperDate.getInstance().format(PADRAO_HORA)), TipoDeArquivoEnum.PDF.getContentType(), data);
            }
            data = this.gerarRelatorioHtml(jasperPrint).getBytes(StandardCharsets.UTF_8);
            return new AttachmentImpl(String.format("RELATORIO_CONSOLIDADO_PROCESSO_%s_DATA_%s_HORA_%s.html", identificacaoRelatorio, HelperDate.getInstance().format(PADRAO_DATA), HelperDate.getInstance().format(PADRAO_HORA)), TipoDeArquivoEnum.HTML.getContentType(), data);
        }
        catch (JRException e) {
            throw new InfraException(e, new MensagemDeRecurso(Mensagens.MSG0013, new Object[0]));
        }
    }

    public Attachment gerarRelatorioPorProcessoAtualizacao(List<Calculo> calculos, FormatoRelatorioEnum formatoRelatorio) {
        String identificacaoRelatorio = ServicoDeRelatorio.obterIdentificacaoRelatorio(calculos);
        ConsolidadoPorProcessoAtualizacaoJRAdapterPadrao relatorioAdapter = new ConsolidadoPorProcessoAtualizacaoJRAdapterPadrao(calculos);
        InputStream inURI = this.getRelatorio("relatorios/processo-atualizacao/consolidado-processo-atualizacao.jrxml");
        InputStream inLogo = this.getRelatorio(URI_DO_LOGO);
        LinkedHashMap<String, InputStream> inSessoes = new LinkedHashMap<String, InputStream>();
        inSessoes.put("jr_resumo_atualizacao_processo_1", this.getRelatorio("relatorios/processo-atualizacao/resumo/atualizacao-resumo-processo.jrxml"));
        inSessoes.put("jr_resumo_atualizacao_processo_2", this.getRelatorio("relatorios/processo-atualizacao/resumo/ocorrencias-resumo-processo-reclamantes.jrxml"));
        inSessoes.put("jr_resumo_atualizacao_processo_3", this.getRelatorio("relatorios/processo-atualizacao/resumo/resumo.jrxml"));
        inSessoes.put("jr_resumo_atualizacao_processo_4", this.getRelatorio("relatorios/processo-atualizacao/resumo/ocorrencias-resumo-processo-debito-cobrar-reclamante.jrxml"));
        inSessoes.put("jr_resumo_atualizacao_processo_5", this.getRelatorio("relatorios/processo-atualizacao/resumo/ocorrencias-resumo-processo-debito-reclamado.jrxml"));
        HashMap<String, Object> params = new HashMap<String, Object>();
        params.put("consolidado-processo", relatorioAdapter);
        params.put("logo", inLogo);
        try {
            byte[] data;
            JasperReport jrRelatorioCompilado = this.getRelatorioCompilado("consolidado-processo-atualizacao", inURI);
            for (Map.Entry entry : inSessoes.entrySet()) {
                InputStream in = (InputStream)entry.getValue();
                JasperReport jasperReport = this.getRelatorioCompilado((String)entry.getKey(), in);
                params.put((String)entry.getKey(), jasperReport);
            }
            JasperPrint jasperPrint = JasperFillManager.fillReport((JasperReport)jrRelatorioCompilado, params, (JRDataSource)new JREmptyDataSource(1));
            if (FormatoRelatorioEnum.PDF.equals((Object)formatoRelatorio)) {
                data = JasperExportManager.exportReportToPdf((JasperPrint)jasperPrint);
                return new AttachmentImpl(String.format("RELATORIO_CONSOLIDADO_PROCESSO_%s_DATA_%s_HORA_%s.pdf", identificacaoRelatorio, HelperDate.getInstance().format(PADRAO_DATA), HelperDate.getInstance().format(PADRAO_HORA)), TipoDeArquivoEnum.PDF.getContentType(), data);
            }
            data = this.gerarRelatorioHtml(jasperPrint).getBytes(StandardCharsets.UTF_8);
            return new AttachmentImpl(String.format("RELATORIO_CONSOLIDADO_PROCESSO_%s_DATA_%s_HORA_%s.html", identificacaoRelatorio, HelperDate.getInstance().format(PADRAO_DATA), HelperDate.getInstance().format(PADRAO_HORA)), TipoDeArquivoEnum.HTML.getContentType(), data);
        }
        catch (JRException e) {
            throw new InfraException(e, new MensagemDeRecurso(Mensagens.MSG0013, new Object[0]));
        }
    }

    private String gerarRelatorioHtml(JasperPrint jasperPrint) {
        String relatorioHtml = null;
        try {
            JRHtmlExporter exporter = new JRHtmlExporter();
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            exporter.setParameter(JRExporterParameter.JASPER_PRINT, (Object)jasperPrint);
            exporter.setParameter(JRExporterParameter.OUTPUT_STREAM, (Object)outputStream);
            exporter.exportReport();
            relatorioHtml = outputStream.toString();
            relatorioHtml = this.trocarImagemLogoHtmlPorTexto(relatorioHtml);
            relatorioHtml = this.informarPropriedadeTipoPaginaHtml(relatorioHtml);
            relatorioHtml = this.quebrarPaginaHtml(relatorioHtml);
        }
        catch (JRException e) {
            throw new InfraException(e, new MensagemDeRecurso(Mensagens.MSG0013, new Object[0]));
        }
        return relatorioHtml;
    }

    private String trocarImagemLogoHtmlPorTexto(String relatorioHtml) {
        relatorioHtml = relatorioHtml.replace("<img", "<div");
        relatorioHtml = relatorioHtml.replace("src=\"nullpx\"", "");
        relatorioHtml = relatorioHtml.replace("<div src=\"nullimg_0_0_4\" style=\"height: 34px\" alt=\"\"/>", "<span style='font-family: Rockwell Extra Bold,Rockwell Bold,monospace; color: #000000; font-size: 18px; font-weight: bold;'>PJe-Calc</span><br><span style='font-family: Rockwell Extra Bold,Rockwell Bold,monospace; color: #000000; font-size: 8px; font-weight: bold;'>Sistema de C&aacute;lculos Trabalhistas</span>");
        return relatorioHtml;
    }

    private String informarPropriedadeTipoPaginaHtml(String relatorioHtml) {
        relatorioHtml = relatorioHtml.replace("</style>", " @page { size: A4 landscape;} </style>");
        return relatorioHtml;
    }

    private String quebrarPaginaHtml(String relatorioHtml) {
        relatorioHtml = relatorioHtml.replace("</style>", " .pagebreak { clear: both; page-break-before: always; } </style>");
        relatorioHtml = relatorioHtml.replace("<a name=\"JR_PAGE_ANCHOR_0_1\"></a>", "");
        relatorioHtml = relatorioHtml.replace("</a>", "</a> <div class=\"pagebreak\"> </div> ");
        return relatorioHtml;
    }

    public JRAdapter getInstanciaRelatorio(TipoRelatorioEnum tipo, Calculo calculo, List<?> sessoes) {
        switch (tipo) {
            case CALCULO_CONSOLIDADO: {
                return new ConsolidadoJRAdapterPadrao(calculo, sessoes);
            }
            case PAGAMENTO_CONSOLIDADO: {
                return new PagamentoConsolidadoJRAdapterPadrao(calculo, sessoes);
            }
        }
        return null;
    }
}

