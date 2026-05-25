package com.mrdcalc.jasper.handlers;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Set;

public class CorsFilter implements Filter {

    private static final Set<String> ALLOWED_SUFFIXES = Set.of(
            "mrdcalc.com.br",
            "mrdcalc.vercel.app"
    );

    private static final String EXTRA_ORIGIN = System.getenv().getOrDefault(
            "CORS_EXTRA_ORIGIN", "");

    @Override
    public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpReq = (HttpServletRequest) req;
        HttpServletResponse httpResp = (HttpServletResponse) resp;

        String origin = httpReq.getHeader("Origin");

        if (origin != null && isAllowed(origin)) {
            httpResp.setHeader("Access-Control-Allow-Origin", origin);
            httpResp.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
            httpResp.setHeader("Access-Control-Allow-Headers",
                    "Content-Type, X-API-Key, Authorization");
            httpResp.setHeader("Access-Control-Max-Age", "86400");
        }

        if ("OPTIONS".equalsIgnoreCase(httpReq.getMethod())) {
            httpResp.setStatus(204);
            return;
        }

        chain.doFilter(req, resp);
    }

    private boolean isAllowed(String origin) {
        for (String suffix : ALLOWED_SUFFIXES) {
            if (origin.endsWith(suffix)) return true;
        }
        if (!EXTRA_ORIGIN.isBlank() && origin.equals(EXTRA_ORIGIN)) return true;
        if (origin.startsWith("http://localhost:")) return true;
        return false;
    }
}
