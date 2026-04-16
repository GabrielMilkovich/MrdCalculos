/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.lang.StringUtils
 *  org.jboss.seam.annotations.In
 *  org.jboss.seam.annotations.Logger
 *  org.jboss.seam.log.Log
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Serializable;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.DecimalFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.apache.commons.lang.StringUtils;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Logger;
import org.jboss.seam.log.Log;

public abstract class AbstractServicoDeParsing<T>
implements Serializable {
    private static final long serialVersionUID = 1L;
    @Logger
    protected Log log;
    @In
    protected ServicoDeCalculo servicoDeCalculo;
    protected int numeroDaLinhaNoArquivo = 0;

    protected abstract T construirObjeto(String var1);

    public List<T> criar(byte[] arquivo) {
        ArrayList<T> lista = new ArrayList<T>();
        List<Object> linhasDoArquivo = new ArrayList();
        try {
            linhasDoArquivo = this.carregarTextoArquivo(arquivo);
        }
        catch (IOException e) {
            this.log.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0191, 1));
        }
        if (linhasDoArquivo.isEmpty()) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0191, 0));
        }
        for (int i = 1; i < linhasDoArquivo.size(); ++i) {
            this.numeroDaLinhaNoArquivo = i + 1;
            try {
                String linha = (String)linhasDoArquivo.get(i);
                lista.add(this.construirObjeto(linha));
                continue;
            }
            catch (NegocioException e) {
                throw e;
            }
            catch (Exception e) {
                this.log.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0191, this.numeroDaLinhaNoArquivo));
            }
        }
        return lista;
    }

    protected List<String> carregarTextoArquivo(byte[] arquivo) throws IOException {
        ArrayList<String> linhas = new ArrayList<String>();
        try (BufferedReader br = new BufferedReader(new InputStreamReader((InputStream)new ByteArrayInputStream(arquivo), StandardCharsets.UTF_8));){
            while (br.ready()) {
                linhas.add(this.removerAspas(br.readLine()));
            }
        }
        return linhas;
    }

    protected Date converterParaData(String valor, String pattern) {
        if (StringUtils.isBlank((String)valor)) {
            return null;
        }
        try {
            return new SimpleDateFormat(pattern).parse(valor);
        }
        catch (ParseException e) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0193, pattern, this.numeroDaLinhaNoArquivo));
        }
    }

    protected Boolean converterParaBoolean(String valor) {
        if (StringUtils.isBlank((String)valor)) {
            return null;
        }
        if (valor.equalsIgnoreCase("S")) {
            return true;
        }
        if (valor.equalsIgnoreCase("N")) {
            return false;
        }
        throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0194, this.numeroDaLinhaNoArquivo));
    }

    protected BigDecimal converterParaNumerico(String valor) {
        if (StringUtils.isBlank((String)valor)) {
            return null;
        }
        try {
            return BigDecimal.valueOf(new DecimalFormat("#,##0.00").parse(valor).doubleValue());
        }
        catch (ParseException e) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0195, "9,99", this.numeroDaLinhaNoArquivo));
        }
    }

    protected Competencia converterParaCompetencia(String valor) {
        if (StringUtils.isBlank((String)valor)) {
            return null;
        }
        try {
            return Competencia.getInstance(new SimpleDateFormat("MM/yyyy").parse(valor));
        }
        catch (ParseException e) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0193, "MM/yyyy", this.numeroDaLinhaNoArquivo));
        }
    }

    protected String limitarTamanhoTexto(String valor, int tamanho) {
        if (StringUtils.isBlank((String)valor)) {
            return null;
        }
        return valor.length() > tamanho ? valor.substring(0, tamanho) : valor;
    }

    private String removerAspas(String valor) {
        return valor.replaceAll("\"", "");
    }
}

