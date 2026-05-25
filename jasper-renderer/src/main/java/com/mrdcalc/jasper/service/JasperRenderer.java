package com.mrdcalc.jasper.service;

import com.mrdcalc.jasper.adapter.DataMapper;
import net.sf.jasperreports.engine.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.util.*;

public class JasperRenderer {

    private static final Logger log = LoggerFactory.getLogger(JasperRenderer.class);

    private final TemplateLoader templateLoader;

    public JasperRenderer() {
        this.templateLoader = TemplateLoader.getInstance();
    }

    public byte[] render(String templateName, Map<String, Object> params, String jsonData)
            throws Exception {
        long t0 = System.currentTimeMillis();

        JasperReport template = templateLoader.get(templateName);
        if (template == null) {
            throw new IllegalArgumentException("Template não encontrado: " + templateName);
        }

        DataMapper.MappedData mapped = DataMapper.map(templateName, params, jsonData);

        injectSubreportParams(mapped.params, template);

        JasperPrint print = JasperFillManager.fillReport(template, mapped.params, mapped.dataSource);

        ByteArrayOutputStream pdfOut = new ByteArrayOutputStream();
        JasperExportManager.exportReportToPdfStream(print, pdfOut);

        long elapsed = System.currentTimeMillis() - t0;
        log.info("template={} elapsed={}ms size={}", templateName, elapsed, pdfOut.size());

        return pdfOut.toByteArray();
    }

    private void injectSubreportParams(Map<String, Object> params, JasperReport report) {
        for (JRParameter p : report.getParameters()) {
            if (p.isSystemDefined()) continue;
            String name = p.getName();
            if (name.startsWith("jr_") && !params.containsKey(name)) {
                String subreportName = guessSubreportName(name);
                if (subreportName != null && templateLoader.has(subreportName)) {
                    try {
                        params.put(name, templateLoader.get(subreportName));
                        log.debug("Injected subreport {} -> {}", name, subreportName);
                    } catch (Exception e) {
                        log.warn("Failed to inject subreport {}: {}", name, e.getMessage());
                    }
                }
            }
        }
    }

    private String guessSubreportName(String paramName) {
        String base = paramName.replaceFirst("^jr_", "")
                               .replaceAll("_\\d+$", "")
                               .replace('_', '-');

        String[] dirs = {
            "", "calculo/", "calculo/resumo/", "calculo/inss/", "calculo/honorario/",
            "calculo/multa/", "calculo/custa/", "calculo/fgts/", "calculo/esocial/",
            "calculo/precatorio/", "calculo/parametros/", "calculo/parametros/dadoscalculo/",
            "calculo/parametros/faltaseferias/", "calculo/consolidado/",
            "atualizacao/", "atualizacao/resumo/", "atualizacao/custa/",
            "atualizacao/precatorio/", "atualizacao/consolidado/",
            "processo/", "processo/resumo/", "processo-atualizacao/",
            "processo-atualizacao/resumo/"
        };

        for (String dir : dirs) {
            String candidate = dir + base;
            if (templateLoader.has(candidate)) return candidate;
        }

        String[] altBases = {
            base.replace("demonstrativo-de-calculo", "calculo-demonstrativo"),
            base.replace("demonstrativo-fgts", "calculo-fgts"),
            base.replace("demonstrativo-inss", "calculo-inss"),
            base.replace("demonstrativo-honorario", "calculo-honorario"),
            base.replace("demonstrativo-multa", "calculo-multa"),
            base.replace("demonstrativo-custas", "calculo-custa"),
            base.replace("demonstrativo-irpf", "calculo-irpf"),
            base.replace("resumo-de-calculo", "calculo-resumo"),
            base.replace("apuracao-de-juros", "calculo-apuracao-juros"),
            "ocorrencias-" + base,
            "calculo-" + base,
        };

        for (String alt : altBases) {
            for (String dir : dirs) {
                String candidate = dir + alt;
                if (templateLoader.has(candidate)) return candidate;
            }
        }

        return null;
    }
}
