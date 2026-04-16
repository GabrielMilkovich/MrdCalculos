/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.scan.proc;

import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.InfraException;
import br.jus.trt8.pjecalc.negocio.comum.scan.ScanProcessorEngine;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaClass;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaEnum;
import br.jus.trt8.pjecalc.negocio.comum.scan.meta.MetaField;
import br.jus.trt8.pjecalc.negocio.comum.scan.proc.ScanProcessor;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import java.io.File;
import java.io.FileWriter;
import java.io.Writer;

public class POJOScanProcessor
implements ScanProcessor {
    private File sourceDir;

    public POJOScanProcessor(File sourceDir) {
        this.sourceDir = sourceDir;
    }

    private String firstUpper(String name) {
        return name.substring(0, 1).toUpperCase() + name.substring(1, name.length());
    }

    @Override
    public void process() throws Exception {
    }

    @Override
    public void scanClass(MetaClass myClass) throws Exception {
        StringBuilder str = new StringBuilder();
        str.append(String.format("package %s;\n", myClass.getPackageName()));
        str.append("import java.math.*;\n");
        str.append("import java.util.*;\n");
        str.append("import br.jus.trt8.pjecalc.negocio.constantes.*;\n");
        for (String imp : myClass.getImports()) {
            str.append(String.format("import %s.*;\n", imp));
        }
        str.append("public class " + myClass.getName() + " {\n");
        for (MetaField field : myClass.getFields()) {
            str.append(String.format("\tprivate %s %s;\n", field.getStringType(), field.getName()));
        }
        str.append(String.format("\tpublic %s() {\n", myClass.getName()));
        str.append("\t}\n");
        for (MetaField field : myClass.getFields()) {
            str.append(String.format("\tpublic %s get%s() {\n", field.getStringType(), this.firstUpper(field.getName())));
            str.append(String.format("\t\treturn %s;\n", field.getName()));
            str.append("\t}\n");
            str.append(String.format("\tpublic void set%s(%s %s) {\n", this.firstUpper(field.getName()), field.getStringType(), field.getName()));
            str.append(String.format("\t\tthis.%s = %s;\n", field.getName(), field.getName()));
            str.append("\t}\n");
        }
        str.append('}');
        File dir = new File(this.sourceDir, myClass.getPackageNameDir());
        if (!dir.exists()) {
            dir.mkdirs();
        }
        FileWriter writer = new FileWriter(new File(dir, myClass.getName() + ".java"));
        ((Writer)writer).append(str.toString());
        ((Writer)writer).close();
    }

    @Override
    public void scanEnum(MetaEnum myEnum) throws Exception {
        StringBuilder str = new StringBuilder();
        str.append(String.format("package %s;\n", myEnum.getPackageName()));
        str.append("public enum " + myEnum.getName() + " {\n");
        for (String value : myEnum.getValues()) {
            str.append(String.format("\t%s,\n", value));
        }
        str.replace(str.length() - 2, str.length() - 1, ";");
        str.append("public String getNome(){\n");
        str.append("\treturn null;\n");
        str.append("}\n");
        str.append("public String getValor(){\n");
        str.append("\treturn null;\n");
        str.append("}\n");
        str.append('}');
        File dir = new File(this.sourceDir, myEnum.getPackageNameDir());
        if (!dir.exists()) {
            dir.mkdir();
        }
        FileWriter writer = new FileWriter(new File(dir, myEnum.getName() + ".java"));
        ((Writer)writer).append(str.toString());
        ((Writer)writer).close();
    }

    public static void gerarPOJOs() {
        File srcDir = new File("..\\src");
        POJOScanProcessor generator = new POJOScanProcessor(srcDir);
        ScanProcessorEngine engine = new ScanProcessorEngine(generator);
        try {
            engine.process();
        }
        catch (Exception e) {
            throw new InfraException(e, new MensagemDeRecurso(Mensagens.MSG0013, new Object[0]));
        }
    }
}

