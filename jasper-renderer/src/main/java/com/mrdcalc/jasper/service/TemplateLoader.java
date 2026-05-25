package com.mrdcalc.jasper.service;

import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.xml.JRXmlLoader;
import net.sf.jasperreports.engine.design.JasperDesign;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

public class TemplateLoader {

    private static final Logger log = LoggerFactory.getLogger(TemplateLoader.class);
    private static final TemplateLoader INSTANCE = new TemplateLoader();
    private static final String TEMPLATES_ROOT = "/templates/";

    private final Map<String, JasperReport> cache = new ConcurrentHashMap<>();
    private final Map<String, String> compileErrors = new ConcurrentHashMap<>();

    public static TemplateLoader getInstance() {
        return INSTANCE;
    }

    public int size() {
        return cache.size();
    }

    public Map<String, String> errors() {
        return Collections.unmodifiableMap(compileErrors);
    }

    public void preloadAll() {
        log.info("Pre-carregando templates de {}...", TEMPLATES_ROOT);
        List<String> names = listTemplateNames();
        int ok = 0, fail = 0;
        for (String name : names) {
            try {
                load(name);
                ok++;
            } catch (Exception e) {
                fail++;
                compileErrors.put(name, e.getMessage());
                log.warn("Falha ao compilar {}: {}", name, e.getMessage());
            }
        }
        log.info("Templates: {} carregados, {} falharam de {}", ok, fail, names.size());
    }

    public JasperReport get(String name) {
        JasperReport cached = cache.get(name);
        if (cached != null) return cached;
        try {
            return load(name);
        } catch (Exception e) {
            throw new RuntimeException("Template não encontrado ou inválido: " + name, e);
        }
    }

    public boolean has(String name) {
        return cache.containsKey(name) ||
               getClass().getResourceAsStream(TEMPLATES_ROOT + name + ".jrxml") != null;
    }

    public Set<String> listLoaded() {
        return Collections.unmodifiableSet(cache.keySet());
    }

    private JasperReport load(String name) throws JRException {
        return cache.computeIfAbsent(name, n -> {
            String path = TEMPLATES_ROOT + n + ".jrxml";
            try (InputStream is = getClass().getResourceAsStream(path)) {
                if (is == null) {
                    throw new RuntimeException("Template não existe no classpath: " + path);
                }
                JasperDesign design = JRXmlLoader.load(is);
                JasperReport compiled = JasperCompileManager.compileReport(design);
                log.debug("Compilado: {}", n);
                return compiled;
            } catch (JRException e) {
                throw new RuntimeException("Erro compilando " + n + ": " + e.getMessage(), e);
            } catch (IOException e) {
                throw new RuntimeException("Erro lendo " + n + ": " + e.getMessage(), e);
            }
        });
    }

    private List<String> listTemplateNames() {
        List<String> names = new ArrayList<>();
        try {
            URI uri = getClass().getResource(TEMPLATES_ROOT).toURI();
            Path templatesPath;
            FileSystem fs = null;

            if (uri.getScheme().equals("jar")) {
                fs = FileSystems.newFileSystem(uri, Collections.emptyMap());
                templatesPath = fs.getPath(TEMPLATES_ROOT);
            } else {
                templatesPath = Paths.get(uri);
            }

            try (Stream<Path> walk = Files.walk(templatesPath)) {
                walk.filter(p -> p.toString().endsWith(".jrxml"))
                    .forEach(p -> {
                        String relative = templatesPath.relativize(p).toString();
                        if (relative.startsWith("/")) relative = relative.substring(1);
                        String name = relative.replace(".jrxml", "").replace("\\", "/");
                        names.add(name);
                    });
            }

            if (fs != null) fs.close();
        } catch (Exception e) {
            log.error("Falha ao listar templates: {}", e.getMessage());
            listTemplatesFallback(names);
        }
        Collections.sort(names);
        return names;
    }

    private void listTemplatesFallback(List<String> names) {
        String[] known = {
            "calculo/calculo-demonstrativo",
            "calculo/calculo-demonstrativo-ocorrencias",
            "calculo/calculo-fgts",
            "calculo/calculo-fgts-contribuicao-social",
            "calculo/calculo-fgts-ocorrencias",
            "calculo/calculo-fgts-operacao",
            "calculo/calculo-irpf",
            "calculo/calculo-seguro-desemprego",
            "calculo/calculo",
            "calculo/resumo/calculo-resumo",
            "calculo/consolidado/consolidado"
        };
        for (String n : known) {
            if (getClass().getResourceAsStream(TEMPLATES_ROOT + n + ".jrxml") != null) {
                names.add(n);
            }
        }
    }
}
