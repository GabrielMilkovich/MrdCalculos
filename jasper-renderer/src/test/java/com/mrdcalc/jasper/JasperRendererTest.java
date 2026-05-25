package com.mrdcalc.jasper;

import com.mrdcalc.jasper.adapter.DataMapper;
import com.mrdcalc.jasper.adapter.DynamicBean;
import com.mrdcalc.jasper.adapter.Periodo;
import com.mrdcalc.jasper.service.JasperRenderer;
import com.mrdcalc.jasper.service.TemplateLoader;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class JasperRendererTest {

    @BeforeAll
    static void setup() {
        TemplateLoader.getInstance().preloadAll();
    }

    @Test
    void healthCheck() {
        assertTrue(TemplateLoader.getInstance().size() > 100,
                "Should load >100 templates, got " + TemplateLoader.getInstance().size());
    }

    @Test
    void periodoFormatting() {
        Periodo p = new Periodo("2023-01-15", "2023-12-31");
        assertEquals("15/01/2023", p.formatInicial("dd/MM/yyyy"));
        assertEquals("31/12/2023", p.formatFinal("dd/MM/yyyy"));
        assertTrue(p.isCompleto());
    }

    @Test
    void periodoFromBrazilianFormat() {
        Periodo p = new Periodo("01/06/2023", "30/06/2023");
        assertEquals("01/06/2023", p.formatInicial("dd/MM/yyyy"));
        assertEquals("30/06/2023", p.formatFinal("dd/MM/yyyy"));
    }

    @Test
    void dynamicBeanWrapsPeriodsAutomatically() {
        Map<String, Object> data = new HashMap<>();
        data.put("nome", "Test");
        data.put("periodo", Map.of("inicial", "2023-01-01", "fim", "2023-12-31"));

        DynamicBean bean = new DynamicBean(data);
        Object periodo = bean.get("periodo");
        assertInstanceOf(Periodo.class, periodo, "Should auto-wrap to Periodo");
        assertEquals("01/01/2023", ((Periodo) periodo).formatInicial("dd/MM/yyyy"));
    }

    @Test
    void renderSeguroDesemprego() throws Exception {
        JasperRenderer renderer = new JasperRenderer();
        byte[] pdf = renderer.render(
                "calculo/calculo-seguro-desemprego",
                new HashMap<>(),
                "{}"
        );
        assertNotNull(pdf);
        assertTrue(pdf.length > 500, "PDF should be >500 bytes");
        assertEquals('%', (char) pdf[0], "Should start with %PDF");
        assertEquals('P', (char) pdf[1]);
    }

    @Test
    void renderDemonstrativoWithData() throws Exception {
        JasperRenderer renderer = new JasperRenderer();
        String json = "[{\"nome\":\"Horas Extras 50%\","
                + "\"periodo\":{\"inicial\":\"2023-01-01\",\"fim\":\"2023-12-31\"},"
                + "\"incidencia\":\"FGTS + INSS + IR\","
                + "\"formula\":\"S/220*1.5*QTD\","
                + "\"totalDoValorCorrigido\":15000.00,"
                + "\"comentario\":\"Teste\","
                + "\"ocorrencias\":[{\"base\":5000,\"divisor\":220,"
                + "\"multiplicador\":1.5,\"quantidade\":40,\"dobra\":\"\","
                + "\"devido\":13636.36,\"pago\":0,\"diferenca\":13636.36,"
                + "\"indiceAcumulado\":1.0985,\"valorCorrigido\":14979.55,"
                + "\"periodo\":{\"inicial\":\"2023-01-01\",\"fim\":\"2023-01-31\"}}]}]";

        byte[] pdf = renderer.render("calculo/calculo-demonstrativo", new HashMap<>(), json);
        assertNotNull(pdf);
        assertTrue(pdf.length > 1000, "Demonstrativo PDF with data should be >1000 bytes");
    }

    @Test
    void renderFGTS() throws Exception {
        JasperRenderer renderer = new JasperRenderer();
        Map<String, Object> fgts = new HashMap<>();
        fgts.put("totalDepositado", 5000);
        fgts.put("totalSacado", 1000);
        fgts.put("totalDoFgts", 4000);
        fgts.put("totalMultaFgts", 1600);
        fgts.put("totalGeral", 5600);
        fgts.put("fgtsComMulta", true);
        fgts.put("fgtsComMultaDoArtigo467", false);
        fgts.put("fgtsComMultaDaLei110", false);
        fgts.put("ocorrencias", java.util.List.of());
        fgts.put("operacoes", java.util.List.of());
        fgts.put("ocorrenciasComContribuicaoSocial", java.util.List.of());

        Map<String, Object> params = new HashMap<>();
        params.put("fgts", fgts);

        byte[] pdf = renderer.render("calculo/calculo-fgts", params, "{}");
        assertNotNull(pdf);
        assertTrue(pdf.length > 500);
    }

    @Test
    void invalidTemplateReturnsError() {
        JasperRenderer renderer = new JasperRenderer();
        assertThrows(RuntimeException.class, () ->
                renderer.render("nonexistent/template", new HashMap<>(), "{}"));
    }
}
