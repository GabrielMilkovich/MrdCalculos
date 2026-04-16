/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.JRException
 *  net.sf.jasperreports.engine.JasperCompileManager
 *  net.sf.jasperreports.engine.JasperReport
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 *  net.sf.jasperreports.engine.design.JasperDesign
 *  org.jboss.seam.log.Log
 *  org.jboss.seam.log.Logging
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.historicosalarial;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.historicosalarial.HistoricoSalarialReportDesign;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.historicosalarial.LinhaCompetenciaValorOcorrenciaVO;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Set;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.design.JasperDesign;
import org.jboss.seam.log.Log;
import org.jboss.seam.log.Logging;

public class HistoricoSalarialJRAdapter
extends JRAdapter {
    private static final Log LOGGER = Logging.getLog(HelperDate.class);
    private Set<HistoricoSalarial> historicos;

    public HistoricoSalarialJRAdapter() {
    }

    public HistoricoSalarialJRAdapter(Set<HistoricoSalarial> historicos) {
        this.historicos = historicos;
    }

    public JasperReport getHSJasperReport() {
        HistoricoSalarialReportDesign reportDesign = new HistoricoSalarialReportDesign();
        JasperDesign design = null;
        JasperReport jr = null;
        try {
            design = reportDesign.getDesign(this.montarTitulosHeader());
            jr = JasperCompileManager.compileReport((JasperDesign)design);
        }
        catch (JRException e) {
            LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
        }
        return jr;
    }

    public JRBeanCollectionDataSource getLinhas() {
        List<LinhaCompetenciaValorOcorrenciaVO> linhas = this.montarLinhas(this.historicos);
        return new JRBeanCollectionDataSource(linhas);
    }

    private List<String> montarTitulosHeader() {
        ArrayList<String> nomesColunas = new ArrayList<String>();
        nomesColunas.add("M\u00caS/ANO");
        for (HistoricoSalarial h : this.historicos) {
            nomesColunas.add(h.getNome());
        }
        return nomesColunas;
    }

    private List<LinhaCompetenciaValorOcorrenciaVO> montarLinhas(Set<HistoricoSalarial> historicosSalariais) {
        Date[] datasLimites = this.obterDatasLimitesDasOcorrencias(historicosSalariais);
        ArrayList<LinhaCompetenciaValorOcorrenciaVO> linhas = new ArrayList<LinhaCompetenciaValorOcorrenciaVO>();
        Object[] valoresLinha = null;
        ArrayList<Object[]> listaLinhas = new ArrayList<Object[]>();
        for (HelperDate data : HelperDate.getCompetenceListForPeriod(datasLimites[0], datasLimites[1])) {
            valoresLinha = new Object[historicosSalariais.size() + 1];
            valoresLinha[0] = data.format("MM/yyyy");
            listaLinhas.add(valoresLinha);
        }
        HelperDate dataComparacao = HelperDate.getInstance();
        dataComparacao.setDay(1);
        int indice = 1;
        String mesAno = null;
        for (HistoricoSalarial historico : historicosSalariais) {
            block4: for (Object[] valores : listaLinhas) {
                mesAno = (String)valores[0];
                dataComparacao.setMonth(Integer.parseInt(mesAno.substring(0, 2)) - 1);
                dataComparacao.setYear(Integer.parseInt(mesAno.substring(3, 7)));
                for (OcorrenciaDoHistoricoSalarial ocorrencia : historico.getOcorrencias()) {
                    if (!HelperDate.dateEquals(dataComparacao.getDate(), ocorrencia.getDataOcorrencia())) continue;
                    valores[indice] = ocorrencia.getValor();
                    continue block4;
                }
            }
            ++indice;
        }
        LinhaCompetenciaValorOcorrenciaVO linha = null;
        Field competencia = null;
        Field valor = null;
        Class<?> c = null;
        for (int i = 0; i < listaLinhas.size(); ++i) {
            linha = new LinhaCompetenciaValorOcorrenciaVO();
            c = linha.getClass();
            try {
                competencia = c.getDeclaredField("competencia");
                competencia.setAccessible(true);
                competencia.set(linha, ((Object[])listaLinhas.get(i))[0]);
                for (int j = 1; j <= ((Object[])listaLinhas.get(i)).length - 1; ++j) {
                    valor = c.getDeclaredField("valor" + j);
                    valor.setAccessible(true);
                    valor.set(linha, ((Object[])listaLinhas.get(i))[j]);
                }
                linhas.add(linha);
                continue;
            }
            catch (IllegalAccessException | IllegalArgumentException | NoSuchFieldException | SecurityException e) {
                LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            }
        }
        return linhas;
    }

    private Date[] obterDatasLimitesDasOcorrencias(Set<HistoricoSalarial> historicos) {
        Date menorData = null;
        Date maiorData = null;
        for (HistoricoSalarial hs : historicos) {
            if (hs.getOcorrencias().isEmpty()) continue;
            Collections.sort(hs.getOcorrencias());
            if (!Utils.naoNulo(menorData) && !Utils.naoNulo(maiorData)) {
                menorData = hs.getOcorrencias().get(0).getDataOcorrencia();
                maiorData = hs.getOcorrencias().get(hs.getOcorrencias().size() - 1).getDataOcorrencia();
                continue;
            }
            if (HelperDate.dateBeforeOrEquals(hs.getOcorrencias().get(0).getDataOcorrencia(), menorData)) {
                menorData = hs.getOcorrencias().get(0).getDataOcorrencia();
            }
            if (!HelperDate.dateAfter(hs.getOcorrencias().get(hs.getOcorrencias().size() - 1).getDataOcorrencia(), maiorData)) continue;
            maiorData = hs.getOcorrencias().get(hs.getOcorrencias().size() - 1).getDataOcorrencia();
        }
        return new Date[]{menorData, maiorData};
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    public Set<HistoricoSalarial> getHistoricos() {
        return this.historicos;
    }

    public void setHistoricos(Set<HistoricoSalarial> historicos) {
        this.historicos = historicos;
    }
}

