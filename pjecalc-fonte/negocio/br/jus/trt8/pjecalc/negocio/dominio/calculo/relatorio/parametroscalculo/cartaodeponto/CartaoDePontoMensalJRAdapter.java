/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.JRException
 *  net.sf.jasperreports.engine.JasperCompileManager
 *  net.sf.jasperreports.engine.JasperReport
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 *  net.sf.jasperreports.engine.design.JasperDesign
 *  org.jboss.seam.annotations.Logger
 *  org.jboss.seam.log.Log
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.negocio.constantes.CartoesDePontoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.cartaodeponto.CartaoDePontoMensalReportDesign;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo.historicosalarial.LinhaCompetenciaValorOcorrenciaVO;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePontoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaDoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.design.JasperDesign;
import org.jboss.seam.annotations.Logger;
import org.jboss.seam.log.Log;

public class CartaoDePontoMensalJRAdapter
extends JRAdapter {
    @Logger
    private Log log;
    private Set<CartaoDePonto> cartoes;
    private List<String> nomesColunas = new ArrayList<String>();
    private Map<Integer, CartaoDePonto> mapaCartoesDePonto = new TreeMap<Integer, CartaoDePonto>();

    public CartaoDePontoMensalJRAdapter() {
    }

    public CartaoDePontoMensalJRAdapter(Set<CartaoDePonto> cartoes) {
        this.cartoes = cartoes;
    }

    public JasperReport getHSJasperReport() {
        CartaoDePontoMensalReportDesign reportDesign = new CartaoDePontoMensalReportDesign();
        JasperDesign design = null;
        JasperReport jr = null;
        try {
            design = reportDesign.getDesign(this.montarTitulosHeader());
            jr = JasperCompileManager.compileReport((JasperDesign)design);
        }
        catch (JRException e) {
            this.log.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
        }
        return jr;
    }

    public JRBeanCollectionDataSource getLinhas() {
        List<LinhaCompetenciaValorOcorrenciaVO> linhas = this.montarLinhas(this.cartoes);
        return new JRBeanCollectionDataSource(linhas);
    }

    private List<String> montarTitulosHeader() {
        this.nomesColunas.add("M\u00eas/Ano");
        TreeMap<Integer, String> mapaApuracaoMensal = new TreeMap<Integer, String>();
        for (CartaoDePonto c : this.cartoes) {
            if (CartoesDePontoEnum.DIFERENCA_HORAS_NOTURNAS.getNome().equals(c.getNome())) continue;
            mapaApuracaoMensal.put(CartoesDePontoEnum.checarOrdemMensal(CartoesDePontoEnum.getFromString(c.getNome())), c.getNome());
            this.mapaCartoesDePonto.put(CartoesDePontoEnum.checarOrdemMensal(CartoesDePontoEnum.getFromString(c.getNome())), c);
        }
        ArrayList<Integer> chaves = new ArrayList<Integer>();
        for (Integer chave : mapaApuracaoMensal.keySet()) {
            chaves.add(chave);
        }
        Collections.sort(chaves);
        if (((Integer)chaves.get(0)).equals(-1)) {
            for (CartaoDePonto c : this.cartoes) {
                this.nomesColunas.add(c.getNome());
                this.cartoes.add(c);
            }
        } else {
            this.cartoes.clear();
            for (Integer chave : chaves) {
                this.nomesColunas.add((String)mapaApuracaoMensal.get(chave));
                this.cartoes.add(this.mapaCartoesDePonto.get(chave));
            }
        }
        return this.nomesColunas;
    }

    private List<LinhaCompetenciaValorOcorrenciaVO> montarLinhas(Set<CartaoDePonto> cartoesDePonto) {
        Calculo calculo = ServicoDeCalculo.getInstancia().obterCalculoAberto();
        Date[] datasLimites = CartaoDePontoUtils.obterDatasLimitesDasOcorrencias(calculo, cartoesDePonto);
        ArrayList<LinhaCompetenciaValorOcorrenciaVO> linhas = new ArrayList<LinhaCompetenciaValorOcorrenciaVO>();
        Object[] valoresLinha = null;
        ArrayList<Object[]> listaLinhas = new ArrayList<Object[]>();
        for (HelperDate helperDate : HelperDate.getCompetenceListForPeriod(datasLimites[0], datasLimites[1])) {
            valoresLinha = new Object[cartoesDePonto.size() + 1];
            valoresLinha[0] = helperDate.format("MM/yyyy");
            listaLinhas.add(valoresLinha);
        }
        int indice = 1;
        for (CartaoDePonto cartao : cartoesDePonto) {
            for (Object[] valores : listaLinhas) {
                this.encontrarValoresNoCartao(cartao, valores, indice);
            }
            ++indice;
        }
        Object var8_11 = null;
        Field competencia = null;
        Field valor = null;
        Class<?> c = null;
        for (int i = 0; i < listaLinhas.size(); ++i) {
            LinhaCompetenciaValorOcorrenciaVO linhaCompetenciaValorOcorrenciaVO = new LinhaCompetenciaValorOcorrenciaVO();
            c = linhaCompetenciaValorOcorrenciaVO.getClass();
            try {
                competencia = c.getDeclaredField("competencia");
                competencia.setAccessible(true);
                competencia.set(linhaCompetenciaValorOcorrenciaVO, ((Object[])listaLinhas.get(i))[0]);
                for (int j = 1; j <= ((Object[])listaLinhas.get(i)).length - 1; ++j) {
                    valor = c.getDeclaredField("valor" + j);
                    valor.setAccessible(true);
                    valor.set(linhaCompetenciaValorOcorrenciaVO, ((Object[])listaLinhas.get(i))[j]);
                }
                linhas.add(linhaCompetenciaValorOcorrenciaVO);
                continue;
            }
            catch (IllegalAccessException | IllegalArgumentException | NoSuchFieldException | SecurityException e) {
                this.log.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            }
        }
        return linhas;
    }

    private void encontrarValoresNoCartao(CartaoDePonto cartao, Object[] valores, int indice) {
        String mesAno = (String)valores[0];
        HelperDate dataComparacao = HelperDate.getInstance();
        dataComparacao.setDay(1);
        dataComparacao.setMonth(Integer.parseInt(mesAno.substring(0, 2)) - 1);
        dataComparacao.setYear(Integer.parseInt(mesAno.substring(3, 7)));
        for (OcorrenciaDoCartaoDePonto ocorrencia : cartao.getOcorrencias()) {
            if (!HelperDate.dateEquals(dataComparacao.getDate(), ocorrencia.getDataOcorrencia())) continue;
            valores[indice] = ocorrencia.getValor();
            break;
        }
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    public Set<CartaoDePonto> getCartoes() {
        return this.cartoes;
    }

    public void setCartoes(Set<CartaoDePonto> cartoes) {
        this.cartoes = cartoes;
    }
}

