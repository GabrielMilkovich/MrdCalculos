/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.EntityManager
 *  javax.persistence.PersistenceException
 *  javax.persistence.Query
 *  org.apache.commons.lang.StringUtils
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.In
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.base.comum.Aplicacao;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.Feriado;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.SalarioCategoria;
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.ValeTransporte;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Serializable;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import org.apache.commons.lang.StringUtils;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Name(value="servicoDeSincronizacaoDeTabelas")
@Scope(value=ScopeType.STATELESS)
@AutoCreate
public class ServicoDeSincronizacaoDeTabelas
implements Serializable {
    private static final long serialVersionUID = 6961115062657989899L;
    private static final Logger LOGGER = LoggerFactory.getLogger(ServicoDeSincronizacaoDeTabelas.class);
    @In
    protected EntityManager entityManager;
    @In
    private Aplicacao aplicacao;
    private String tabela;
    private String[] colunas;
    private String[] valores;
    private String script;
    private int tam;
    private int pos;
    private char delim;
    private Map<String, StringBuilder> linhasParaInserirPorTabela = new HashMap<String, StringBuilder>();
    private Map<Long, Long> mapaEntreIdsDeFeriados;
    private static final String ER_INICIO_TABELA = "<\\w+>$";
    private static final String ER_FIM_TABELA = "</\\w+>$";
    private static final String TIPO_NACIONAL = "NACIONAL";
    private static final String TIPO_OFFLINE = "OFFLINE";
    private static final String ARQUIVO_INVALIDO = "INVALIDO";

    private void iniciarLeituraDeScript(String script) {
        this.script = script;
        this.tam = script.length();
        this.pos = 0;
    }

    private String proximoGrupoDoScript(char fim) {
        StringBuilder str = new StringBuilder();
        int balan = 0;
        int balanAspasSimples = 0;
        while (this.pos < this.tam) {
            this.delim = this.script.charAt(this.pos++);
            if (this.delim == fim) {
                if (balan == 0 && balanAspasSimples % 2 == 0) break;
                if (this.delim == ')') {
                    --balan;
                } else if (this.delim == '\'') {
                    ++balanAspasSimples;
                }
            } else if (this.delim == '(') {
                ++balan;
            } else if (this.delim == ')') {
                --balan;
            } else if (this.delim == '\'') {
                ++balanAspasSimples;
            }
            str.append(this.delim);
        }
        return str.toString();
    }

    protected void lerLinhaDoScript(String linhaScript) {
        this.iniciarLeituraDeScript(linhaScript);
        this.tabela = this.proximoGrupoDoScript('(').trim();
        this.colunas = this.proximoGrupoDoScript(')').split("\\,");
        this.proximoGrupoDoScript('(');
        String valoresTemp = this.proximoGrupoDoScript(')');
        this.iniciarLeituraDeScript(valoresTemp);
        this.valores = new String[this.colunas.length];
        for (int i = 0; i < this.valores.length; ++i) {
            this.valores[i] = this.proximoGrupoDoScript(',');
        }
    }

    protected String montarScriptInsert(String linhaScript) {
        this.lerLinhaDoScript(linhaScript);
        StringBuilder str = new StringBuilder("INSERT INTO ").append(this.tabela).append(" (");
        for (String coluna : this.colunas) {
            str.append(coluna).append(',');
        }
        str.deleteCharAt(str.length() - 1).append(")").append(" VALUES (");
        for (String valor : this.valores) {
            if (this.aplicacao != null && !this.aplicacao.isVersaoOnline()) {
                str.append(this.formatarValorSeData(valor)).append(',');
                continue;
            }
            str.append(valor).append(',');
        }
        str.deleteCharAt(str.length() - 1).append(')');
        return str.toString();
    }

    private String formatarValorSeData(String valor) {
        if (valor.toLowerCase().startsWith("to_date")) {
            StringBuilder sb = new StringBuilder();
            String data = valor.substring(9, 25);
            sb.append("PARSEDATETIME ('");
            sb.append(data);
            sb.append("','MM/dd/yyyy HH:mm', 'en')");
            return sb.toString();
        }
        return valor;
    }

    protected String montarScriptInsertDoFeriado(String linhaScript) {
        int i;
        this.lerLinhaDoScript(linhaScript);
        StringBuilder str = new StringBuilder("INSERT INTO ").append(this.tabela).append(" (");
        for (i = 0; i < this.colunas.length; ++i) {
            str.append(this.colunas[i]).append(',');
        }
        str.deleteCharAt(str.length() - 1).append(")").append(" VALUES (SQFERIADO.NEXTVAL,");
        for (i = 1; i < this.valores.length; ++i) {
            if (!this.aplicacao.isVersaoOnline()) {
                str.append(this.formatarValorSeData(this.valores[i])).append(',');
                continue;
            }
            str.append(this.valores[i]).append(',');
        }
        str.deleteCharAt(str.length() - 1).append(')');
        return str.toString();
    }

    protected String montarScriptInsertDaExcecaoDoFeriado(String linhaScript) {
        int i;
        this.lerLinhaDoScript(linhaScript);
        StringBuilder str = new StringBuilder("INSERT INTO ").append(this.tabela).append(" (");
        for (i = 0; i < this.colunas.length; ++i) {
            str.append(this.colunas[i]).append(',');
        }
        str.deleteCharAt(str.length() - 1).append(")").append(" VALUES (SQEXCECAOFERIADO.NEXTVAL,");
        for (i = 1; i < this.valores.length; ++i) {
            if (this.colunas[i].equals("IIDFERIADO")) {
                Long id = this.mapaEntreIdsDeFeriados.get(Long.valueOf(this.valores[i]));
                if (id == null) {
                    return null;
                }
                str.append(id).append(',');
                continue;
            }
            if (!this.aplicacao.isVersaoOnline()) {
                str.append(this.formatarValorSeData(this.valores[i])).append(',');
                continue;
            }
            str.append(this.valores[i]).append(',');
        }
        str.deleteCharAt(str.length() - 1).append(')');
        return str.toString();
    }

    protected String montarScriptUpdateDoFeriado(String linhaScript, Long idDoRegistro) {
        this.lerLinhaDoScript(linhaScript);
        StringBuilder str = new StringBuilder("UPDATE ").append(this.tabela).append(" SET ");
        for (int i = 1; i < this.colunas.length; ++i) {
            if (!this.aplicacao.isVersaoOnline()) {
                str.append(this.colunas[i]).append('=').append(this.formatarValorSeData(this.valores[i])).append(',');
                continue;
            }
            str.append(this.colunas[i]).append('=').append(this.valores[i]).append(',');
        }
        str.deleteCharAt(str.length() - 1).append(" WHERE ").append(this.colunas[0]).append('=').append(idDoRegistro);
        this.mapaEntreIdsDeFeriados.put(Long.valueOf(this.valores[0]), idDoRegistro);
        return str.toString();
    }

    protected String montarScriptUpdate(String linhaScript) {
        this.lerLinhaDoScript(linhaScript);
        StringBuilder str = new StringBuilder("UPDATE ").append(this.tabela).append(" SET ");
        for (int i = 1; i < this.colunas.length; ++i) {
            if (!this.aplicacao.isVersaoOnline()) {
                str.append(this.colunas[i]).append('=').append(this.formatarValorSeData(this.valores[i])).append(',');
                continue;
            }
            str.append(this.colunas[i]).append('=').append(this.valores[i]).append(',');
        }
        str.deleteCharAt(str.length() - 1).append(" WHERE ").append(this.colunas[0]).append('=').append(this.valores[0]);
        return str.toString();
    }

    protected String obterComandoSQL(String tabela) {
        Query query = this.entityManager.createNativeQuery("select GERA_SCRIPT_INSERCAO(:tabela) FROM DUAL");
        query.setParameter("tabela", (Object)tabela);
        return (String)query.getSingleResult();
    }

    protected List<?> obterRegistros(String comandoSQL) {
        Query query = this.entityManager.createNativeQuery(comandoSQL);
        return query.getResultList();
    }

    protected List<ValeTransporte> obterValesTransporte() {
        Query query = this.entityManager.createNativeQuery("SELECT * FROM TBVALETRANSPORTE", ValeTransporte.class);
        return query.getResultList();
    }

    protected List<SalarioCategoria> obterSalariosCategorias() {
        Query query = this.entityManager.createNativeQuery("SELECT * FROM TBSALARIOCATEGORIA", SalarioCategoria.class);
        return query.getResultList();
    }

    protected List<Feriado> obterFeriados(boolean isOffline) {
        Query query = isOffline ? this.entityManager.createNativeQuery("SELECT * FROM TBFERIADO", Feriado.class) : this.entityManager.createNativeQuery("SELECT * FROM TBFERIADO WHERE STPABRANGENCIA = 'F'", Feriado.class);
        return query.getResultList();
    }

    private boolean podeDeletarFeriado(Feriado feriado) {
        return this.obterRegistros("SELECT * FROM TBPONTOFACULTATIVOCALCULO WHERE IIDFERIADO = " + feriado.getId()).isEmpty();
    }

    private boolean podeDeletarVale(ValeTransporte vale) {
        return this.obterRegistros("SELECT * FROM TBVALETRANSPORTEVERBA WHERE IIDVALETRANSPORTE = " + vale.getId()).isEmpty();
    }

    private boolean podeDeletarSalarioCategoria(SalarioCategoria salarioCategoria) {
        return this.obterRegistros("SELECT * FROM TBVERBACALCULO WHERE IIDSALARIOCATEGORIAVALORDEVIDO = " + salarioCategoria.getId() + " OR IIDSALARIOCATEGORIAVALORPAGO = " + salarioCategoria.getId()).isEmpty();
    }

    private String obtemUidDoFeriado(String linhaScript, boolean isOffline) {
        String uid = null;
        this.lerLinhaDoScript(linhaScript);
        for (int i = 0; i < this.colunas.length; ++i) {
            if (this.colunas[i] != null && this.colunas[i].equals("STPABRANGENCIA") && !isOffline && !this.valores[i].substring(1, this.valores[i].length() - 1).equals("F")) {
                return null;
            }
            if (this.colunas[i] == null || !this.colunas[i].equals("SUIDFERIADO")) continue;
            uid = this.valores[i].substring(1, this.valores[i].length() - 1);
        }
        return uid;
    }

    private String obtemIdDoVale(String linhaScript) {
        String id = null;
        this.lerLinhaDoScript(linhaScript);
        for (int i = 0; i < this.colunas.length; ++i) {
            if (this.colunas[i] == null || !this.colunas[i].equals("IIDVALETRANSPORTE")) continue;
            id = this.valores[i].substring(0, this.valores[i].length());
        }
        return id;
    }

    private String obtemIdDoSalarioCategoria(String linhaScript) {
        String id = null;
        this.lerLinhaDoScript(linhaScript);
        for (int i = 0; i < this.colunas.length; ++i) {
            if (this.colunas[i] == null || !this.colunas[i].equals("IIDSALARIOCATEGORIA")) continue;
            id = this.valores[i].substring(0, this.valores[i].length());
        }
        return id;
    }

    private Feriado registroDeFeriadoParaAtualizar(String uidFeriado, List<Feriado> feriadosParaAtualizacao) {
        for (Feriado feriado : feriadosParaAtualizacao) {
            if (!feriado.getUid().equals(uidFeriado)) continue;
            return feriado;
        }
        return null;
    }

    private ValeTransporte registroDeValeParaAtualizar(String idVale, List<ValeTransporte> valesParaAtualizacao) {
        for (ValeTransporte vale : valesParaAtualizacao) {
            if (vale.getId().compareTo(Long.valueOf(idVale)) != 0) continue;
            return vale;
        }
        return null;
    }

    private SalarioCategoria getRegistroDeSalarioCategoriaParaAtualizar(String idSalarioCategoria, List<SalarioCategoria> salariosParaAtualizacao) {
        for (SalarioCategoria salarioCategoria : salariosParaAtualizacao) {
            if (salarioCategoria.getId().compareTo(Long.valueOf(idSalarioCategoria)) != 0) continue;
            return salarioCategoria;
        }
        return null;
    }

    private Long encontraIdInserido(String uidFeriado) {
        Query query = this.entityManager.createNativeQuery("SELECT IIDFERIADO FROM TBFERIADO WHERE SUIDFERIADO = :id");
        query.setParameter("id", (Object)uidFeriado);
        Object obj = query.getSingleResult();
        if (obj instanceof BigInteger) {
            return ((BigInteger)obj).longValue();
        }
        return ((BigDecimal)query.getSingleResult()).longValue();
    }

    private Long encontraIdOriginal(String linhaScript) {
        this.lerLinhaDoScript(linhaScript);
        return Long.valueOf(this.valores[0]);
    }

    protected void insereOuAtualizaFeriados(String comandoSQL, List<Feriado> feriadosParaAtualizacao, boolean isOffline) {
        String[] comandosSQL;
        for (String comando : comandosSQL = comandoSQL.split(";")) {
            String uidFeriado;
            if (comando.equals("\n") || (uidFeriado = this.obtemUidDoFeriado(comando, isOffline)) == null) continue;
            Feriado feriadoParaAtualizar = this.registroDeFeriadoParaAtualizar(uidFeriado, feriadosParaAtualizacao);
            if (feriadoParaAtualizar != null) {
                this.executaSQL(this.montarScriptUpdateDoFeriado(comando, feriadoParaAtualizar.getId()));
                continue;
            }
            this.executaSQL(this.montarScriptInsertDoFeriado(comando));
            this.mapaEntreIdsDeFeriados.put(this.encontraIdOriginal(comando), this.encontraIdInserido(uidFeriado));
        }
    }

    protected void insereOuAtualizaVales(String comandoSQL, List<ValeTransporte> valesParaAtualizacao) {
        String[] comandosSQL;
        for (String comando : comandosSQL = comandoSQL.split(";")) {
            String idVale;
            if (comando.equals("\n") || (idVale = this.obtemIdDoVale(comando)) == null) continue;
            ValeTransporte valeParaAtualizar = this.registroDeValeParaAtualizar(idVale, valesParaAtualizacao);
            if (valeParaAtualizar != null) {
                this.executaSQL(this.montarScriptUpdate(comando));
                continue;
            }
            this.executaSQL(this.montarScriptInsert(comando));
        }
    }

    protected void insereOuAtualizaSalariosCategorias(String comandoSQL, List<SalarioCategoria> salariosParaAtualizacao) {
        String[] comandosSQL;
        for (String comando : comandosSQL = comandoSQL.split(";")) {
            String idSalarioCategoria;
            if (comando.equals("\n") || (idSalarioCategoria = this.obtemIdDoSalarioCategoria(comando)) == null) continue;
            SalarioCategoria salarioParaAtualizar = this.getRegistroDeSalarioCategoriaParaAtualizar(idSalarioCategoria, salariosParaAtualizacao);
            if (salarioParaAtualizar != null) {
                this.executaSQL(this.montarScriptUpdate(comando));
                continue;
            }
            this.executaSQL(this.montarScriptInsert(comando));
        }
    }

    private void insereExcecoesFeriados(String comandoSQL) {
        String[] comandosSQL;
        for (String comando : comandosSQL = comandoSQL.split(";")) {
            String scriptInsertExcecaoFeriado;
            if (comando.equals("\n") || (scriptInsertExcecaoFeriado = this.montarScriptInsertDaExcecaoDoFeriado(comando)) == null) continue;
            this.executaSQL(scriptInsertExcecaoFeriado);
        }
    }

    protected void executaSQLs(String comandoSQL) {
        String[] comandosSQL;
        for (String comando : comandosSQL = comandoSQL.split(";")) {
            if (comando.equals("\n") || !Utils.naoNulo(comandoSQL) || !Utils.naoVazio(comandoSQL)) continue;
            comando = this.montarComandoSQL(comando);
        }
    }

    private String montarComandoSQL(String comando) {
        boolean sucesso = false;
        while (!sucesso) {
            try {
                this.executaSQL(this.montarScriptInsert(comando));
                sucesso = true;
            }
            catch (PersistenceException e) {
                boolean contemErroNivel3;
                LOGGER.error(e.getMessage(), (Throwable)e);
                String erroEsperado = "ORA-00904";
                if (!this.aplicacao.isVersaoOnline()) {
                    erroEsperado = "42122";
                }
                boolean contemErroNivel1 = e.getMessage().contains(erroEsperado);
                boolean contemErroNivel2 = e.getCause() != null && e.getCause().getMessage().contains(erroEsperado);
                boolean bl = contemErroNivel3 = e.getCause().getCause() != null && e.getCause().getCause().getMessage().contains(erroEsperado);
                if (!contemErroNivel1 && !contemErroNivel2 && !contemErroNivel3) continue;
                comando = this.gerarNovoComandoRemovendoColunaInvalida(comando, e.getCause().getCause().getMessage());
            }
        }
        return comando;
    }

    private String gerarNovoComandoRemovendoColunaInvalida(String comando, String erro) {
        String[] splitted = comando.split("\\) \\(");
        String comandoColunas = splitted[0] + ")";
        String comandoValores = "(" + splitted[1];
        String coluna = null;
        int posicaoParametro = 0;
        Pattern pattern = Pattern.compile("(?<=([\"']))(?:(?=(\\\\?))\\2.)*?(?=\\1)");
        Matcher matcher = pattern.matcher(erro);
        if (matcher.find()) {
            coluna = matcher.group();
            String[] params = comandoColunas.split(",");
            String colPattern1 = "," + coluna + ",";
            String colPattern2 = "(" + coluna + ",";
            String colPattern3 = "," + coluna + ")";
            for (int i = 0; i < params.length; ++i) {
                if (i == 0) {
                    int n = i;
                    params[n] = params[n] + ",";
                } else {
                    params[i] = i == params.length - 1 ? "," + params[i] : "," + params[i] + ",";
                }
                if (!params[i].contains(colPattern1) && !params[i].contains(colPattern2) && !params[i].contains(colPattern3)) continue;
                posicaoParametro = i;
                break;
            }
            comandoColunas = comandoColunas.replace(colPattern1, ",");
            comandoColunas = comandoColunas.replace(colPattern2, "(");
            comandoColunas = comandoColunas.replace(colPattern3, ")");
        }
        String[] valoresSplitted = comandoValores.substring(1, comandoValores.length() - 1).split(",(?![^()]*\\))");
        StringBuilder comandoFinal = new StringBuilder();
        for (int i = 0; i < valoresSplitted.length; ++i) {
            if (i == posicaoParametro) continue;
            if (i > 0) {
                comandoFinal.append(',');
            }
            comandoFinal.append(valoresSplitted[i]);
        }
        return comandoColunas + " (" + comandoFinal.toString() + ")";
    }

    protected void executaSQL(String comandoSQL) {
        Query query = this.entityManager.createNativeQuery(comandoSQL);
        query.executeUpdate();
    }

    private void configuraPontoComoSeparadorDeCasasDecimais() {
        this.executaSQL("ALTER SESSION SET NLS_NUMERIC_CHARACTERS = '.,'");
        this.executaSQL("COMMIT");
    }

    public byte[] gerarArquivoDeSincronizacaoNacional(String versao) {
        return this.gerarArquivoDeSincronizacao(false, versao);
    }

    public byte[] gerarArquivoDeSincronizacaoOffline(String versao) {
        return this.gerarArquivoDeSincronizacao(true, versao);
    }

    private byte[] gerarArquivoDeSincronizacao(boolean isOffline, String versao) {
        this.configuraPontoComoSeparadorDeCasasDecimais();
        StringBuilder str = new StringBuilder();
        str.append(isOffline ? "OFFLINE\n" : "NACIONAL\n");
        for (TabelasParaGeracao tabelasParaGeracao : TabelasParaGeracao.values()) {
            if (StringUtils.isBlank((String)versao) && (tabelasParaGeracao == TabelasParaGeracao.TBSELICDIARIA || tabelasParaGeracao == TabelasParaGeracao.TBSELICFAZENDA || tabelasParaGeracao == TabelasParaGeracao.TBTUACDT)) continue;
            this.trataTabelaParaGeracao(str, tabelasParaGeracao.toString());
        }
        if (isOffline) {
            for (Enum enum_ : TabelasParaGeracaoOffline.values()) {
                this.trataTabelaParaGeracao(str, enum_.toString());
            }
        }
        return str.toString().getBytes(Charset.forName("ISO-8859-1"));
    }

    private void trataTabelaParaGeracao(StringBuilder str, String tabela) {
        String comandoSQL = this.obterComandoSQL(tabela);
        List<?> registros = this.obterRegistros(comandoSQL.substring(0, comandoSQL.length() - 1));
        str.append("<" + tabela + ">\n");
        for (Object object : registros) {
            str.append(object.toString() + "\n");
        }
        str.append("</" + tabela + ">\n");
    }

    public void importarArquivoDeSincronizacao(byte[] dados) throws Exception {
        ByteArrayInputStream in;
        BufferedReader reader;
        String tipoImportacao;
        if (this.aplicacao.isVersaoOnline()) {
            this.configuraPontoComoSeparadorDeCasasDecimais();
        }
        if (!TIPO_NACIONAL.equals(tipoImportacao = (reader = new BufferedReader(new InputStreamReader((InputStream)(in = new ByteArrayInputStream(dados)), Charset.forName("ISO-8859-1")))).readLine()) && !TIPO_OFFLINE.equals(tipoImportacao)) {
            throw new Exception(ARQUIVO_INVALIDO);
        }
        this.popularMapaDeLinhasParaInserirPorTabela(reader);
        for (TabelasParaGeracao tabela : TabelasParaGeracao.values()) {
            if (this.ehCasoEspecial(tabela.toString())) continue;
            this.processaTabelaNormal(tabela.toString());
        }
        this.processaTabelasUnicas();
        this.processaTabelasDeVerbas();
        this.processaTabelasDeFeriados(TIPO_OFFLINE.equals(tipoImportacao));
        if (TIPO_OFFLINE.equals(tipoImportacao)) {
            this.processaTabelasSalarioCategoria();
            this.processaTabelaDeValeTransporte();
        }
        reader.close();
        ((InputStream)in).close();
    }

    public BigDecimal calcularHashDasTabelasNacionais() {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append("\t(SELECT max(IIDSALARIOMINIMO) FROM TBSALARIOMINIMONACIONAL) || ");
        sql.append("\t(SELECT count(IIDEXCECAOFERIADO) FROM TBEXCECAOFERIADO WHERE IIDFERIADO IN (SELECT IIDFERIADO FROM TBFERIADO WHERE STPABRANGENCIA = 'F')) || ");
        sql.append("\t(SELECT count(IIDFERIADO) FROM TBFERIADO WHERE STPABRANGENCIA = 'F') || ");
        sql.append("\t(SELECT max(IIDINDICEIGPM) FROM TBIGPM) || ");
        sql.append("\t(SELECT max(IIDINDICEINPC) FROM TBINPC) || ");
        sql.append("\t(SELECT max(IIDINDICEIPC) FROM TBIPC) || ");
        sql.append("\t(SELECT max(IIDINDICEIPCA) FROM TBIPCA) || ");
        sql.append("\t(SELECT max(IIDINDICEIPCAE) FROM TBIPCAE) || ");
        sql.append("\t(SELECT max(IIDINDICEIPCAETR) FROM TBIPCAETR) || ");
        sql.append("\t(SELECT max(IIDINDICETR) FROM TBTR) || ");
        sql.append("\t(SELECT max(IIDINDICEJAM) FROM TBJAM) || ");
        sql.append("\t(SELECT max(IIDJUROSFAZENDAPUBLICA) FROM TBJUROSFAZENDAPUBLICA) || ");
        sql.append("\t(SELECT max(IIDJUROSPADRAO) FROM TBJUROSPADRAO) || ");
        sql.append("\t(SELECT max(IIDJUROSSELICINSS) FROM TBJUROSSELICINSS) || ");
        sql.append("\t(SELECT max(IIDJUROSSELICIRPF) FROM TBJUROSSELICIRPF) || ");
        sql.append("\t(SELECT max(IIDJUROSTAXALEGAL) FROM TBJUROSTAXALEGAL) || ");
        sql.append("\t(SELECT max(IIDPARAMETROCUSTAS) FROM TBPARAMETROCUSTAS) || ");
        sql.append("\t(SELECT max(IIDSALARIOMINIMO) FROM TBSALARIOMINIMONACIONAL) || ");
        sql.append("\t(SELECT max(IIDSELICDIARIA) FROM TBSELICDIARIA) || ");
        sql.append("\t(SELECT max(IIDINDICESELICFAZENDA) FROM TBSELICFAZENDA) || ");
        sql.append("\t(SELECT max(IIDTUACDT) FROM TBTUACDT) || ");
        sql.append("\t(SELECT max(IIDREGISTROIMPOSTORENDA) FROM TBTABELAIMPOSTORENDA) || ");
        sql.append("\t(SELECT max(IIDREGISTROEMPREGADODOMESTICO) FROM TBTABELAINSSEMPREGADODOMESTICO) || ");
        sql.append("\t(SELECT max(IIDREGISTROSEGURADOEMPREGADO) FROM TBTABELAINSSSEGURADOEMPREGADO) || ");
        sql.append("\t(SELECT max(IIDREGISTROSALARIOFAMILIA) FROM TBTABELASALARIOFAMILIA) || ");
        sql.append("\t(SELECT max(IIDREGISTROSEGURODESEMPREGO) FROM TBTABELASEGURODESEMPREGO) || ");
        sql.append("\t(SELECT max(IIDINDICEUNICOJTDIARIO) FROM TBTABELAUNICAJTDIARIA) || ");
        sql.append("\t(SELECT max(IIDINDICEUNICOJTMENSAL) FROM TBTABELAUNICAJTMENSAL) || ");
        sql.append("\t(SELECT max(IIDTAXAMULTA) FROM TBTAXAMULTAINSS) || ");
        sql.append("\t(SELECT max(IIDVERBA) FROM TBVERBA) ");
        sql.append("FROM dual");
        Query query = this.entityManager.createNativeQuery(sql.toString());
        Object resultado = query.getSingleResult();
        return resultado == null ? BigDecimal.ZERO : new BigDecimal(resultado.toString());
    }

    public BigDecimal calcularHashDasTabelasNacionaisERegionais() {
        BigDecimal hashNacional = this.calcularHashDasTabelasNacionais();
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append("\t(SELECT count(IIDSALARIOCATEGORIA) FROM TBSALARIOCATEGORIA) || ");
        sql.append("\t(SELECT count(IIDOCORRENCIASALARIOCATEGORIA) FROM TBOCORRENCIASALARIOCATEGORIA) || ");
        sql.append("\t(SELECT count(IIDVALETRANSPORTE) FROM TBVALETRANSPORTE) || ");
        sql.append("\t(SELECT count(IIDOCORRENCIAVALETRANSPORTE) FROM TBOCORRENCIAVALETRANSPORTE) ");
        sql.append("FROM dual");
        Query query = this.entityManager.createNativeQuery(sql.toString());
        BigDecimal hashRegional = new BigDecimal(query.getSingleResult().toString());
        return hashNacional.add(hashRegional);
    }

    private void processaTabelaDeValeTransporte() {
        List<ValeTransporte> valesTransporte = this.obterValesTransporte();
        ArrayList<ValeTransporte> valesParaAtualizacao = new ArrayList<ValeTransporte>();
        for (ValeTransporte vale : valesTransporte) {
            this.executaSQL("DELETE FROM TBOCORRENCIAVALETRANSPORTE WHERE IIDVALETRANSPORTE = " + vale.getId());
            if (this.podeDeletarVale(vale)) {
                this.executaSQL("DELETE FROM TBVALETRANSPORTE WHERE IIDVALETRANSPORTE = " + vale.getId());
                continue;
            }
            valesParaAtualizacao.add(vale);
        }
        StringBuilder sb = this.linhasParaInserirPorTabela.get("TBVALETRANSPORTE");
        this.insereOuAtualizaVales(sb.toString(), valesParaAtualizacao);
        sb = this.linhasParaInserirPorTabela.get("TBOCORRENCIAVALETRANSPORTE");
        this.executaSQLs(sb.toString());
    }

    private void processaTabelasUnicas() {
        this.executaSQL("DELETE FROM TBTABELAUNICAJTDIARIA");
        this.executaSQL("DELETE FROM TBTABELAUNICAJTMENSAL");
        StringBuilder sb = this.linhasParaInserirPorTabela.get("TBTABELAUNICAJTMENSAL");
        this.executaSQLs(sb.toString());
        sb = this.linhasParaInserirPorTabela.get("TBTABELAUNICAJTDIARIA");
        this.executaSQLs(sb.toString());
    }

    private void processaTabelasSalarioCategoria() {
        List<SalarioCategoria> salariosCategorias = this.obterSalariosCategorias();
        ArrayList<SalarioCategoria> salariosParaAtualizacao = new ArrayList<SalarioCategoria>();
        for (SalarioCategoria salarioCategoria : salariosCategorias) {
            this.executaSQL("DELETE FROM TBOCORRENCIASALARIOCATEGORIA WHERE IIDSALARIOCATEGORIA = " + salarioCategoria.getId());
            if (this.podeDeletarSalarioCategoria(salarioCategoria)) {
                this.executaSQL("DELETE FROM TBSALARIOCATEGORIA WHERE IIDSALARIOCATEGORIA = " + salarioCategoria.getId());
                continue;
            }
            salariosParaAtualizacao.add(salarioCategoria);
        }
        StringBuilder sb = this.linhasParaInserirPorTabela.get("TBSALARIOCATEGORIA");
        this.insereOuAtualizaSalariosCategorias(sb.toString(), salariosParaAtualizacao);
        sb = this.linhasParaInserirPorTabela.get("TBOCORRENCIASALARIOCATEGORIA");
        this.executaSQLs(sb.toString());
    }

    private void processaTabelasDeFeriados(boolean isOffline) {
        List<Feriado> feriados = this.obterFeriados(isOffline);
        ArrayList<Feriado> feriadosParaAtualizacao = new ArrayList<Feriado>();
        for (Feriado feriado : feriados) {
            this.executaSQL("DELETE FROM TBEXCECAOFERIADO WHERE IIDFERIADO = " + feriado.getId());
            if (this.podeDeletarFeriado(feriado)) {
                this.executaSQL("DELETE FROM TBFERIADO WHERE IIDFERIADO = " + feriado.getId());
                continue;
            }
            feriadosParaAtualizacao.add(feriado);
        }
        this.mapaEntreIdsDeFeriados = new HashMap<Long, Long>();
        StringBuilder sb = this.linhasParaInserirPorTabela.get("TBFERIADO");
        this.insereOuAtualizaFeriados(sb.toString(), feriadosParaAtualizacao, isOffline);
        sb = this.linhasParaInserirPorTabela.get("TBEXCECAOFERIADO");
        this.insereExcecoesFeriados(sb.toString());
    }

    private void processaTabelasDeVerbas() {
        this.executaSQL("DELETE FROM TBVERBABASE");
        this.executaSQL("DELETE FROM TBVERBA");
        StringBuilder sb = this.linhasParaInserirPorTabela.get("TBVERBA");
        this.executaSQLs(sb.toString());
        sb = this.linhasParaInserirPorTabela.get("TBVERBABASE");
        this.executaSQLs(sb.toString());
    }

    private void processaTabelaNormal(String tabela) {
        try {
            this.executaSQL("DELETE FROM " + tabela);
            StringBuilder sb = this.linhasParaInserirPorTabela.get(tabela);
            if (Utils.naoNulo(sb)) {
                this.executaSQLs(sb.toString());
            }
        }
        catch (PersistenceException e) {
            LOGGER.warn("Erro ao remover os dados da tabela " + tabela);
            LOGGER.warn(e.getMessage(), (Throwable)e);
        }
    }

    private boolean ehCasoEspecial(String tabela) {
        List<String> tabelasEspeciais = Arrays.asList("TBEXCECAOFERIADO", "TBFERIADO", "TBTABELAUNICAJTMENSAL", "TBTABELAUNICAJTDIARIA", "TBSALARIOCATEGORIA", "TBOCORRENCIASALARIOCATEGORIA", "TBVALETRANSPORTE", "TBOCORRENCIAVALETRANSPORTE", "TBVERBABASE", "TBVERBA");
        return tabelasEspeciais.contains(tabela);
    }

    private void popularMapaDeLinhasParaInserirPorTabela(BufferedReader reader) throws Exception {
        String linha;
        StringBuilder sbAuxiliar = null;
        while ((linha = reader.readLine()) != null) {
            if (linha.matches(ER_INICIO_TABELA)) {
                String tabela = linha.replaceAll("<|>", "");
                sbAuxiliar = new StringBuilder();
                this.linhasParaInserirPorTabela.put(tabela, sbAuxiliar);
                continue;
            }
            if (linha.matches(ER_FIM_TABELA) || sbAuxiliar == null) continue;
            sbAuxiliar.append(linha + "\n");
        }
    }

    private static enum TabelasParaGeracaoOffline {
        TBSALARIOCATEGORIA,
        TBOCORRENCIASALARIOCATEGORIA,
        TBVALETRANSPORTE,
        TBOCORRENCIAVALETRANSPORTE;

    }

    private static enum TabelasParaGeracao {
        TBEXCECAOFERIADO,
        TBFERIADO,
        TBIGPM,
        TBINPC,
        TBIPC,
        TBIPCA,
        TBIPCAE,
        TBIPCAETR,
        TBTR,
        TBJAM,
        TBJUROSFAZENDAPUBLICA,
        TBJUROSPADRAO,
        TBJUROSSELICINSS,
        TBJUROSSELICIRPF,
        TBJUROSTAXALEGAL,
        TBPARAMETROCUSTAS,
        TBSALARIOMINIMONACIONAL,
        TBSELICDIARIA,
        TBSELICFAZENDA,
        TBTABELAIMPOSTORENDA,
        TBTABELAINSSEMPREGADODOMESTICO,
        TBTABELAINSSSEGURADOEMPREGADO,
        TBTABELASALARIOFAMILIA,
        TBTABELASEGURODESEMPREGO,
        TBTABELAUNICAJTDIARIA,
        TBTABELAUNICAJTMENSAL,
        TBTUACDT,
        TBTAXAMULTAINSS,
        TBVERBA,
        TBVERBABASE;

    }
}

