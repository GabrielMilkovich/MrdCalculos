package com.mrdcalc.jasper;

import com.mrdcalc.jasper.handlers.AuthFilter;
import com.mrdcalc.jasper.handlers.CorsFilter;
import com.mrdcalc.jasper.handlers.HealthHandler;
import com.mrdcalc.jasper.handlers.RenderHandler;
import com.mrdcalc.jasper.service.TemplateLoader;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.FilterHolder;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.servlet.DispatcherType;
import java.util.EnumSet;

public class JasperServer {

    private static final Logger log = LoggerFactory.getLogger(JasperServer.class);
    private static final int PORT = Integer.parseInt(
            System.getenv().getOrDefault("PORT", "8080"));

    public static void main(String[] args) throws Exception {
        log.info("Iniciando MRD Calc Jasper Renderer na porta {}", PORT);

        TemplateLoader loader = TemplateLoader.getInstance();
        loader.preloadAll();

        Server server = new Server(PORT);

        ServletContextHandler ctx = new ServletContextHandler(ServletContextHandler.NO_SESSIONS);
        ctx.setContextPath("/");

        ctx.addFilter(new FilterHolder(new CorsFilter()), "/*",
                EnumSet.of(DispatcherType.REQUEST));
        ctx.addFilter(new FilterHolder(new AuthFilter()), "/render",
                EnumSet.of(DispatcherType.REQUEST));

        ctx.addServlet(new ServletHolder(new HealthHandler(loader)), "/health");
        ctx.addServlet(new ServletHolder(new RenderHandler()), "/render");

        server.setHandler(ctx);
        server.start();
        log.info("Servidor pronto. {} templates carregados. Endpoints: /health, /render", loader.size());
        server.join();
    }
}
