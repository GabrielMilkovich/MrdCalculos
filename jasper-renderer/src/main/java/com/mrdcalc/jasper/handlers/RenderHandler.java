package com.mrdcalc.jasper.handlers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mrdcalc.jasper.model.RenderRequest;
import com.mrdcalc.jasper.service.JasperRenderer;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.HashMap;

public class RenderHandler extends HttpServlet {

    private static final Logger log = LoggerFactory.getLogger(RenderHandler.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final JasperRenderer renderer = new JasperRenderer();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            RenderRequest body = mapper.readValue(req.getInputStream(), RenderRequest.class);

            if (body.template == null || body.template.isBlank()) {
                sendError(resp, 400, "campo 'template' é obrigatório");
                return;
            }

            if (body.template.contains("..") || body.template.contains("\\")) {
                sendError(resp, 400, "template inválido: path traversal não permitido");
                return;
            }

            byte[] pdf = renderer.render(
                    body.template,
                    body.params != null ? body.params : new HashMap<>(),
                    body.data
            );

            resp.setStatus(200);
            resp.setContentType("application/pdf");
            resp.setHeader("Content-Disposition",
                    "inline; filename=\"" + sanitizeFilename(body.template) + ".pdf\"");
            resp.setContentLength(pdf.length);
            resp.getOutputStream().write(pdf);

        } catch (IllegalArgumentException e) {
            log.warn("Bad request: {}", e.getMessage());
            sendError(resp, 400, e.getMessage());
        } catch (Exception e) {
            log.error("Render failed", e);
            sendError(resp, 500, e.getMessage());
        }
    }

    private void sendError(HttpServletResponse resp, int status, String message) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json");
        String safe = message != null ? message.replace("\"", "'").replace("\n", " ") : "unknown";
        resp.getWriter().write("{\"error\":\"" + safe + "\"}");
    }

    private String sanitizeFilename(String template) {
        return template.replaceAll("[^a-zA-Z0-9/_-]", "").replace("/", "_");
    }
}
