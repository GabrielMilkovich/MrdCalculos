/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  groovy.lang.Binding
 *  groovy.lang.GroovyShell
 *  org.apache.commons.io.IOUtils
 *  org.apache.commons.lang.StringEscapeUtils
 *  org.jboss.seam.core.ResourceBundle
 *  org.jboss.seam.log.Log
 *  org.jboss.seam.log.Logging
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.RepositorioBase;
import groovy.lang.Binding;
import groovy.lang.GroovyShell;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.StringWriter;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.MathContext;
import java.math.RoundingMode;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.MissingResourceException;
import java.util.TimeZone;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.GZIPOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringEscapeUtils;
import org.jboss.seam.core.ResourceBundle;
import org.jboss.seam.log.Log;
import org.jboss.seam.log.Logging;

public class Utils {
    private static final Log LOGGER = Logging.getLog(Utils.class);
    private static boolean ambienteDeTeste = false;
    private static Map<Class<?>, RepositorioBase<?>> repositorios = new HashMap();
    public static final MathContext CONTEXTO_MATEMATICO = new MathContext(38);
    public static final BigDecimal CEM = new BigDecimal("100");
    public static final BigDecimal CINQUENTA_POR_CENTO = new BigDecimal("0.5");
    public static final BigDecimal VALOR_TRES = new BigDecimal("3");
    public static final BigDecimal VALOR_DOIS = new BigDecimal("2");
    public static final BigDecimal OITO_PORCENTO = new BigDecimal("0.08");
    public static final int DUAS_CASAS_DECIMAIS = 2;
    public static final int QUATRO_CASAS_DECIMAIS = 4;
    public static final int SEIS_CASAS_DECIMAIS = 6;
    public static final int NOVE_CASAS_DECIMAIS = 9;
    public static final Integer VALOR_HORA_MAXIMO = 23;
    public static final Integer VALOR_HORA_MINIMO = 0;
    public static final Integer VALOR_MINUTO_MAXIMO = 59;
    public static final Integer VALOR_MINUTO_MINIMO = 0;
    private static final String FORMATO_HORA = "HH:mm";
    private static DecimalFormat numberFormat = null;
    public static final Locale LOCAL = new Locale("pt", "BR");

    public static String objetoParaString(Object objeto, String ... atributos) {
        Class<?> classe = objeto.getClass();
        StringBuilder sb = new StringBuilder(classe.getSimpleName() + " [");
        for (String atributo : atributos) {
            try {
                Method method = classe.getMethod("get" + atributo.substring(0, 1).toUpperCase() + atributo.substring(1), new Class[0]);
                Object valor = method.invoke(objeto, new Object[0]);
                sb.append(atributo + ":" + valor + ", ");
            }
            catch (Exception e) {
                LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            }
        }
        if (atributos.length > 0) {
            sb.delete(sb.length() - 2, sb.length());
        }
        sb.append(']');
        return sb.toString();
    }

    public static BigDecimal aplicarCorrecaoMonetaria(BigDecimal indiceAcumulado, BigDecimal valor, BigDecimal valorDefault) {
        BigDecimal valorCalculado = Utils.aplicarCorrecaoMonetaria(indiceAcumulado, valor);
        return Utils.naoNulo(valorCalculado) ? valorCalculado : valorDefault;
    }

    public static BigDecimal aplicarCorrecaoMonetaria(BigDecimal indiceAcumulado, BigDecimal valor) {
        if (Utils.nulo(indiceAcumulado) || Utils.nulo(valor)) {
            return valor;
        }
        if (indiceAcumulado.signum() == -1) {
            return Utils.arredondarValorMonetario(valor.divide(indiceAcumulado.negate(), CONTEXTO_MATEMATICO));
        }
        return Utils.arredondarValorMonetario(indiceAcumulado.multiply(valor, CONTEXTO_MATEMATICO));
    }

    public static BigDecimal aplicarJuros(BigDecimal taxaDeJuros, BigDecimal valor, BigDecimal valorDefault) {
        return Utils.aplicarTaxa(taxaDeJuros, valor, valorDefault);
    }

    public static BigDecimal aplicarJuros(BigDecimal taxaDeJuros, BigDecimal valor) {
        return Utils.aplicarTaxa(taxaDeJuros, valor);
    }

    public static BigDecimal aplicarMulta(BigDecimal taxaDeMulta, BigDecimal valor, BigDecimal valorDefault) {
        return Utils.aplicarTaxa(taxaDeMulta, valor, valorDefault);
    }

    public static BigDecimal aplicarMulta(BigDecimal taxaDeMulta, BigDecimal valor) {
        return Utils.aplicarTaxa(taxaDeMulta, valor);
    }

    public static BigDecimal aplicarTaxa(BigDecimal taxa, BigDecimal valor, BigDecimal valorDefault) {
        BigDecimal valorCalculado = Utils.aplicarTaxa(taxa, valor);
        return Utils.naoNulo(valorCalculado) ? valorCalculado : valorDefault;
    }

    public static BigDecimal aplicarTaxa(BigDecimal taxa, BigDecimal valor) {
        if (Utils.nulo(taxa) || Utils.nulo(valor)) {
            return null;
        }
        return valor.multiply(Utils.obterPercentualPara(taxa), CONTEXTO_MATEMATICO);
    }

    public static BigDecimal aplicarTeto(BigDecimal teto, BigDecimal valor) {
        if (Utils.naoNulos(teto, valor) && valor.compareTo(teto) > 0) {
            return teto;
        }
        return valor;
    }

    public static BigDecimal aplicarPiso(BigDecimal piso, BigDecimal valor) {
        if (Utils.naoNulos(piso, valor) && valor.compareTo(BigDecimal.ZERO) != 0 && valor.compareTo(piso) < 0) {
            return piso;
        }
        return valor;
    }

    public static BigDecimal arredondarValorRegraIRPF(BigDecimal numero) {
        String sNumero = numero.setScale(4, RoundingMode.HALF_EVEN).toString();
        String[] partes = sNumero.split("[.]");
        String parteInteira = partes[0];
        String decimalTruncado = partes[1].substring(0, 3);
        String segundoETerceiroAlgarismoDecimal = decimalTruncado.substring(1, 3);
        if (new BigDecimal(segundoETerceiroAlgarismoDecimal).compareTo(new BigDecimal("54")) <= 0) {
            return new BigDecimal(parteInteira + "." + decimalTruncado.substring(0, 1));
        }
        if (Integer.valueOf(decimalTruncado).compareTo(Integer.valueOf("955")) >= 0) {
            return new BigDecimal(parteInteira).add(BigDecimal.ONE);
        }
        return new BigDecimal(parteInteira + "." + (Integer.valueOf(decimalTruncado.substring(0, 1)) + 1));
    }

    public static BigDecimal arredondarValorMonetario(BigDecimal valor) {
        return Utils.arredondarValor(valor, 2);
    }

    public static BigDecimal arredondarValor(BigDecimal valor, int escala) {
        if (Utils.nulo(valor)) {
            return valor;
        }
        return valor.setScale(escala, RoundingMode.HALF_EVEN);
    }

    public static BigDecimal obterPercentualPara(BigDecimal valor) {
        if (Utils.nulo(valor)) {
            return valor;
        }
        return valor.divide(CEM, CONTEXTO_MATEMATICO);
    }

    public static void iniciarTeste() {
        ambienteDeTeste = true;
    }

    public static boolean isAmbienteDeTeste() {
        return ambienteDeTeste;
    }

    public static void adicionarRepositorioParaTeste(Class<? extends RepositorioBase<?>> clazz, RepositorioBase<?> repositorio) {
        repositorios.put(clazz, repositorio);
    }

    public static void adicionarRepositorioParaTeste(RepositorioBase<?> repositorio) {
        repositorios.put(repositorio.getClass(), repositorio);
    }

    public static RepositorioBase<?> obterRepositorioParTeste(Class<? extends RepositorioBase<?>> classeDoRepositorio) {
        return repositorios.get(classeDoRepositorio);
    }

    public static boolean falsoSeNulo(Boolean valor) {
        return Utils.naoNulo(valor) ? valor : false;
    }

    public static boolean nulo(Object arg) {
        return arg == null;
    }

    public static boolean nuloOuBranco(String arg) {
        return Utils.nulo(arg) || "".equals(arg);
    }

    public static boolean nulos(Object ... args) {
        for (Object t : args) {
            if (t == null) continue;
            return false;
        }
        return true;
    }

    public static boolean naoNulo(Object arg) {
        return arg != null;
    }

    public static boolean naoNulos(Object ... args) {
        for (Object t : args) {
            if (t != null) continue;
            return false;
        }
        return true;
    }

    public static boolean naoVazio(String arg) {
        return Utils.naoNulo(arg) && !"".equals(arg);
    }

    public static Boolean isNaoVazios(String ... args) {
        for (String s : args) {
            if (s != null && !"".equals(s)) continue;
            return false;
        }
        return true;
    }

    public static Boolean isVazio(String arg) {
        return Utils.nulo(arg) || "".equals(arg);
    }

    public static String substituirPontoPorVirgula(String valor) {
        StringBuilder valorInformado = new StringBuilder(new StringBuilder(valor).reverse().toString().replaceFirst("[.]", ","));
        return new StringBuilder(valorInformado.reverse()).toString();
    }

    public static String formatarValorPercentual(BigDecimal numero) {
        if (numero == null) {
            return "-";
        }
        return Utils.getDecimalFormatPadrao().format(numero) + " %";
    }

    public static String formatarValor(BigDecimal numero) {
        if (numero == null) {
            return "-";
        }
        return Utils.getDecimalFormatPadrao().format(numero);
    }

    public static String formatarNumero(BigDecimal numero) {
        if (numero == null) {
            return "";
        }
        return Utils.getDecimalFormatPadrao().format(numero);
    }

    public static String formatarValor(BigDecimal numero, int numeroCasasDecimais) {
        if (numero == null) {
            return "-";
        }
        return Utils.getDecimalFormatComDecimaisDinamicos(numeroCasasDecimais).format(numero);
    }

    public static String formatarNumero(BigDecimal numero, int numeroCasasDecimais) {
        if (numero == null) {
            return "";
        }
        return Utils.getDecimalFormatComDecimaisDinamicos(numeroCasasDecimais).format(numero);
    }

    public static DecimalFormat getDecimalFormatPadrao() {
        if (numberFormat == null) {
            DecimalFormat nFormat = new DecimalFormat("#,###,##0.00; (#,###,##0.00)", new DecimalFormatSymbols(LOCAL));
            nFormat.setParseBigDecimal(true);
            nFormat.setDecimalSeparatorAlwaysShown(true);
            nFormat.setMinimumFractionDigits(2);
            nFormat.setMaximumFractionDigits(2);
            numberFormat = nFormat;
        }
        return numberFormat;
    }

    public static DecimalFormat getDecimalFormatComDecimaisDinamicos(int numeroDeCasasDecimais) {
        DecimalFormat numberFormat = new DecimalFormat(Utils.getMascara(numeroDeCasasDecimais), new DecimalFormatSymbols(LOCAL));
        numberFormat.setParseBigDecimal(true);
        if (numeroDeCasasDecimais > 0) {
            numberFormat.setDecimalSeparatorAlwaysShown(true);
            numberFormat.setMinimumFractionDigits(numeroDeCasasDecimais);
            numberFormat.setMaximumFractionDigits(numeroDeCasasDecimais);
        }
        return numberFormat;
    }

    private static String getMascara(int numeroDeCasasDecimais) {
        StringBuilder sb = new StringBuilder("#,##0");
        if (numeroDeCasasDecimais > 0) {
            sb.append('.');
            for (int i = 0; i < numeroDeCasasDecimais; ++i) {
                sb.append('0');
            }
        }
        return sb.toString();
    }

    public static void alterarId(Class<? extends EntidadeBase> clazz, Object objeto, Long id) {
        if (id == null) {
            return;
        }
        try {
            Field fieldId = clazz.getDeclaredField("id");
            fieldId.setAccessible(true);
            fieldId.set(objeto, id);
        }
        catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static Date formatarData(String data) {
        Date dataFormatada;
        SimpleDateFormat format = new SimpleDateFormat("dd/MM/yyyy");
        try {
            dataFormatada = format.parse(data);
        }
        catch (ParseException e) {
            throw new RuntimeException(e);
        }
        return dataFormatada;
    }

    public static String formatarData(Date data) {
        SimpleDateFormat format = new SimpleDateFormat("dd/MM/yyyy");
        return format.format(data);
    }

    public static String formatarCompetencia(Date data) {
        SimpleDateFormat format = new SimpleDateFormat("MM/yyyy");
        return format.format(data);
    }

    public static Object parseScript(String script) {
        Binding binding = new Binding();
        GroovyShell shell = new GroovyShell(binding);
        return shell.evaluate(script);
    }

    public static String resourceAsString(Object reference, String path) throws IOException {
        int c;
        InputStream in = reference.getClass().getClassLoader().getResourceAsStream(path);
        StringWriter writer = new StringWriter();
        while ((c = in.read()) != -1) {
            writer.append((char)c);
        }
        return writer.getBuffer().toString();
    }

    public static String formatarNomeDeAtributo(String entidade, String atributo) {
        return new StringBuilder(entidade).append(".").append(atributo).replace(0, 1, entidade.substring(0, 1).toLowerCase()).toString();
    }

    public static Object getPropertyByReflection(Object object, String name) {
        return Utils.getPropertyByReflection(object.getClass(), object, name);
    }

    public static Object getPropertyByReflection(Class<?> clazz, Object object, String name) {
        try {
            Field field = clazz.getDeclaredField(name);
            field.setAccessible(true);
            return field.get(object);
        }
        catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static void setPropertyByReflection(Object object, String name, Object value) {
        Utils.setPropertyByReflection(object.getClass(), object, name, value);
    }

    public static void setPropertyByReflection(Class<?> clazz, Object object, String name, Object value) {
        try {
            Field field = clazz.getDeclaredField(name);
            field.setAccessible(true);
            field.set(object, value);
        }
        catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static BigDecimal multiplicar(BigDecimal multiplicando, BigDecimal multiplicador) {
        if (Utils.naoNulos(multiplicando, multiplicador)) {
            return multiplicando.multiply(multiplicador, CONTEXTO_MATEMATICO);
        }
        return null;
    }

    public static BigDecimal multiplicar(BigDecimal multiplicando, BigDecimal multiplicador, BigDecimal valorPadrao) {
        BigDecimal resultado = Utils.multiplicar(multiplicando, multiplicador);
        return Utils.naoNulo(resultado) ? resultado : valorPadrao;
    }

    public static BigDecimal dividir(BigDecimal dividendo, BigDecimal divisor) {
        if (Utils.naoNulos(dividendo, divisor)) {
            return dividendo.divide(divisor, CONTEXTO_MATEMATICO);
        }
        return null;
    }

    public static BigDecimal dividir(BigDecimal dividendo, BigDecimal divisor, BigDecimal valorPadrao) {
        BigDecimal resultado = Utils.dividir(dividendo, divisor);
        return Utils.naoNulo(resultado) ? resultado : valorPadrao;
    }

    public static Object seNulo(Object valor, Object def) {
        return Utils.naoNulo(valor) ? valor : def;
    }

    public static BigDecimal somar(BigDecimal parcela1, BigDecimal parcela2) {
        if (Utils.naoNulos(parcela1, parcela2)) {
            return parcela1.add(parcela2, CONTEXTO_MATEMATICO);
        }
        return null;
    }

    public static BigDecimal somar(BigDecimal parcela1, BigDecimal parcela2, BigDecimal valorPadrao) {
        BigDecimal resultado = Utils.somar(parcela1, parcela2);
        return Utils.naoNulo(resultado) ? resultado : valorPadrao;
    }

    public static BigDecimal subtrair(BigDecimal minuendo, BigDecimal subtraendo) {
        if (Utils.naoNulos(minuendo, subtraendo)) {
            return minuendo.subtract(subtraendo, CONTEXTO_MATEMATICO);
        }
        return null;
    }

    public static BigDecimal subtrair(BigDecimal minuendo, BigDecimal subtraendo, BigDecimal valorPadrao) {
        BigDecimal resultado = Utils.subtrair(minuendo, subtraendo);
        return Utils.naoNulo(resultado) ? resultado : valorPadrao;
    }

    public static BigDecimal zerarSeNegativo(BigDecimal valor) {
        if (Utils.nulo(valor)) {
            return null;
        }
        if (valor.signum() == -1) {
            return BigDecimal.ZERO;
        }
        return valor;
    }

    public static BigDecimal zerarSeNulo(BigDecimal valor) {
        if (Utils.nulo(valor)) {
            return BigDecimal.ZERO;
        }
        return valor;
    }

    public static BigDecimal retirarAbono(BigDecimal fatorAbono, BigDecimal base) {
        return base.divide(fatorAbono, CONTEXTO_MATEMATICO);
    }

    public static String obterNomeDeInstancia(Class<?> clazz) {
        StringBuilder className = new StringBuilder(clazz.getSimpleName());
        className.replace(0, 1, className.substring(0, 1).toLowerCase());
        return className.toString();
    }

    public static String obterLegendaDoRecurso(String key) {
        return Utils.obterLegendaDoRecurso(key, String.format("{%s}", key));
    }

    public static String obterLegendaDoRecurso(String key, String def) {
        try {
            return ResourceBundle.instance().getString(key);
        }
        catch (MissingResourceException e) {
            LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            return def;
        }
    }

    public static boolean verificarExpressaoRegular(String regex, String texto) {
        if (Utils.nuloOuBranco(regex) || Utils.nuloOuBranco(texto)) {
            return false;
        }
        Pattern padrao = Pattern.compile(regex);
        Matcher matcher = padrao.matcher(texto);
        return matcher.find();
    }

    public static String retirarCaracteres(String texto, CharSequence ... caracteres) {
        if (Utils.naoNulo(caracteres) && caracteres.length > 0) {
            for (CharSequence charSequence : caracteres) {
                texto = texto.replace(charSequence.toString(), "");
            }
        }
        return texto.trim();
    }

    public static byte[] compactarParaZip(String nomeArqEntrada, byte[] arqEntrada) throws IOException {
        ByteArrayOutputStream saida = new ByteArrayOutputStream();
        ZipOutputStream zos = new ZipOutputStream(saida);
        try {
            ZipEntry entry = new ZipEntry(nomeArqEntrada);
            zos.putNextEntry(entry);
            IOUtils.write((byte[])arqEntrada, (OutputStream)zos);
        }
        catch (IOException e) {
            LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            throw e;
        }
        finally {
            zos.flush();
            saida.flush();
            IOUtils.closeQuietly((OutputStream)zos);
            IOUtils.closeQuietly((OutputStream)saida);
        }
        return saida.toByteArray();
    }

    public static byte[] compactarParaGZIP(byte[] bytes) throws IOException {
        ByteArrayOutputStream obj = new ByteArrayOutputStream();
        GZIPOutputStream gzip = new GZIPOutputStream(obj);
        gzip.write(bytes);
        gzip.flush();
        obj.flush();
        gzip.close();
        obj.close();
        return obj.toByteArray();
    }

    /*
     * Exception decompiling
     */
    public static byte[] descompactarGZIP(byte[] bytes) throws IOException {
        /*
         * This method has failed to decompile.  When submitting a bug report, please provide this stack trace, and (if you hold appropriate legal rights) the relevant class file.
         * 
         * org.benf.cfr.reader.util.ConfusedCFRException: Started 2 blocks at once
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.Op04StructuredStatement.getStartingBlocks(Op04StructuredStatement.java:412)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.Op04StructuredStatement.buildNestedBlocks(Op04StructuredStatement.java:487)
         *     at org.benf.cfr.reader.bytecode.analysis.opgraph.Op03SimpleStatement.createInitialStructuredBlock(Op03SimpleStatement.java:736)
         *     at org.benf.cfr.reader.bytecode.CodeAnalyser.getAnalysisInner(CodeAnalyser.java:850)
         *     at org.benf.cfr.reader.bytecode.CodeAnalyser.getAnalysisOrWrapFail(CodeAnalyser.java:278)
         *     at org.benf.cfr.reader.bytecode.CodeAnalyser.getAnalysis(CodeAnalyser.java:201)
         *     at org.benf.cfr.reader.entities.attributes.AttributeCode.analyse(AttributeCode.java:94)
         *     at org.benf.cfr.reader.entities.Method.analyse(Method.java:531)
         *     at org.benf.cfr.reader.entities.ClassFile.analyseMid(ClassFile.java:1055)
         *     at org.benf.cfr.reader.entities.ClassFile.analyseTop(ClassFile.java:942)
         *     at org.benf.cfr.reader.Driver.doJarVersionTypes(Driver.java:257)
         *     at org.benf.cfr.reader.Driver.doJar(Driver.java:139)
         *     at org.benf.cfr.reader.CfrDriverImpl.analyse(CfrDriverImpl.java:76)
         *     at org.benf.cfr.reader.Main.main(Main.java:54)
         */
        throw new IllegalStateException("Decompilation failed");
    }

    public static byte[] unzip(byte[] zipUploadFile) {
        try {
            int buffer = 2048;
            ByteArrayInputStream bis = new ByteArrayInputStream(zipUploadFile);
            ZipInputStream zis = new ZipInputStream(bis);
            ByteArrayOutputStream dest = new ByteArrayOutputStream();
            while (zis.getNextEntry() != null) {
                int count;
                byte[] data = new byte[2048];
                while ((count = zis.read(data, 0, buffer)) != -1) {
                    dest.write(data, 0, count);
                }
                dest.flush();
                dest.close();
            }
            byte[] arquivoDescompactado = dest.toByteArray();
            zis.close();
            bis.close();
            return arquivoDescompactado;
        }
        catch (IOException e) {
            LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            return null;
        }
    }

    public static String calcularHashMD5(String codigo) {
        String hash = "";
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            md.update(codigo.getBytes(), 0, codigo.length());
            BigInteger i = new BigInteger(1, md.digest());
            hash = String.format("%1$032X", i);
        }
        catch (NoSuchAlgorithmException e) {
            LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            hash = "";
        }
        return hash;
    }

    public static String replaceLast(String string, String substring, String replacement) {
        int index = string.lastIndexOf(substring);
        if (index == -1) {
            return string;
        }
        return string.substring(0, index) + replacement + string.substring(index + substring.length());
    }

    public static StringBuilder replaceLast(StringBuilder string, String substring, String replacement) {
        int index = string.lastIndexOf(substring);
        if (index == -1) {
            return string;
        }
        return new StringBuilder(string.substring(0, index) + replacement + string.substring(index + substring.length()));
    }

    public static String getHoras(String horario) {
        String[] tempo = horario.split(":");
        return tempo[0] + ":00";
    }

    public static String getMinutos(String horario) {
        String[] tempo = horario.split(":");
        return "00:" + tempo[1];
    }

    public static String getHoraSeValida(String hora) {
        return Utils.naoNulo(hora) && hora.length() == FORMATO_HORA.length() ? hora : null;
    }

    public static String converterMilisEmHoraMinuto(Long milis) {
        SimpleDateFormat sdf = new SimpleDateFormat(FORMATO_HORA);
        sdf.setTimeZone(TimeZone.getTimeZone("GMT-0"));
        return sdf.format(new Date(milis));
    }

    public static String converterMilisEmHoraMinuto(BigDecimal milis) {
        return Utils.converterMilisEmHoraMinuto(milis.longValue());
    }

    public static BigDecimal converterHoraMinutoEmMilis(String hora) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm");
        String dataBase = "1970-01-01 ";
        String horaBase = "00:00";
        Long saidaMillisBase = null;
        Long saidaMillis = null;
        try {
            saidaMillisBase = sdf.parse(dataBase + horaBase).getTime();
            if (hora != null) {
                saidaMillis = sdf.parse(dataBase + hora).getTime();
                saidaMillis = saidaMillis - saidaMillisBase;
            }
        }
        catch (ParseException e) {
            LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
        }
        if (saidaMillis == null) {
            return null;
        }
        return new BigDecimal(saidaMillis);
    }

    public static boolean isHoraValida(String hora) {
        return Utils.isHoraValida(hora, true);
    }

    public static String substituirCaracteresInvalidos(String html) {
        String escaped = StringEscapeUtils.escapeHtml((String)html);
        escaped = escaped.replaceAll("&ndash;", "&dash;").replaceAll("&mdash;", "&dash;").replaceAll("&ldquo;", "&quot;").replaceAll("&rdquo;", "&quot;");
        return StringEscapeUtils.unescapeHtml((String)escaped);
    }

    public static boolean isHoraValida(String hora, boolean limitarHora) {
        boolean valida = true;
        String[] componentesDaHora = hora.split(":");
        if (componentesDaHora.length != VALOR_DOIS.intValue()) {
            valida = false;
        } else if (Utils.naoVazio(componentesDaHora[0])) {
            boolean minutoInvalido;
            Integer horas = -1;
            Integer minutos = -1;
            try {
                horas = Integer.valueOf(componentesDaHora[0]);
                minutos = Integer.valueOf(componentesDaHora[1]);
            }
            catch (NumberFormatException nfe) {
                valida = false;
            }
            boolean horaInvalida = horas < 0 || limitarHora && horas > VALOR_HORA_MAXIMO;
            boolean bl = minutoInvalido = minutos < 0 || minutos > VALOR_MINUTO_MAXIMO;
            if (valida && (horaInvalida || minutoInvalido)) {
                valida = false;
            }
        }
        return valida;
    }

    public static String filtrarSomenteNumeros(String texto) {
        if (texto != null) {
            return texto.replaceAll("\\D+", "");
        }
        return texto;
    }
}

