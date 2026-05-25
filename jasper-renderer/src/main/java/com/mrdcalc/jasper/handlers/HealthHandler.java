package com.mrdcalc.jasper.handlers;

import com.mrdcalc.jasper.service.TemplateLoader;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

public class HealthHandler extends HttpServlet {

    private final TemplateLoader loader;

    public HealthHandler(TemplateLoader loader) {
        this.loader = loader;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setStatus(200);
        resp.setContentType("application/json");
        resp.getWriter().write(String.format(
                "{\"status\":\"ok\",\"templates\":%d,\"errors\":%d}",
                loader.size(), loader.errors().size()));
    }
}
