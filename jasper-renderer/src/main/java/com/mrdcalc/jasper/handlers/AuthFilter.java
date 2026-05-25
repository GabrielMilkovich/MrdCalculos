package com.mrdcalc.jasper.handlers;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class AuthFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(AuthFilter.class);
    private static final String API_KEY = System.getenv("API_KEY");
    private static final int RATE_LIMIT_PER_MIN = Integer.parseInt(
            System.getenv().getOrDefault("RATE_LIMIT_PER_MIN", "60"));

    private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpReq = (HttpServletRequest) req;
        HttpServletResponse httpResp = (HttpServletResponse) resp;

        if ("OPTIONS".equalsIgnoreCase(httpReq.getMethod())) {
            httpResp.setStatus(204);
            return;
        }

        String apiKey = httpReq.getHeader("X-API-Key");
        if (API_KEY != null && !API_KEY.isBlank()) {
            if (apiKey == null || !API_KEY.equals(apiKey)) {
                log.warn("Auth failed from {}", httpReq.getRemoteAddr());
                httpResp.setStatus(401);
                httpResp.setContentType("application/json");
                httpResp.getWriter().write("{\"error\":\"API key inválida ou ausente\"}");
                return;
            }
        }

        String key = apiKey != null ? apiKey : httpReq.getRemoteAddr();
        TokenBucket bucket = buckets.computeIfAbsent(key,
                k -> new TokenBucket(RATE_LIMIT_PER_MIN));
        if (!bucket.tryAcquire()) {
            log.warn("Rate limit exceeded for {}", key.substring(0, Math.min(key.length(), 8)));
            httpResp.setStatus(429);
            httpResp.setContentType("application/json");
            httpResp.getWriter().write("{\"error\":\"Rate limit exceeded (max " + RATE_LIMIT_PER_MIN + "/min)\"}");
            return;
        }

        chain.doFilter(req, resp);
    }

    private static class TokenBucket {
        private final int maxTokens;
        private final AtomicLong tokens;
        private volatile long lastRefill;

        TokenBucket(int maxTokens) {
            this.maxTokens = maxTokens;
            this.tokens = new AtomicLong(maxTokens);
            this.lastRefill = System.currentTimeMillis();
        }

        boolean tryAcquire() {
            refill();
            return tokens.getAndUpdate(t -> t > 0 ? t - 1 : 0) > 0;
        }

        private void refill() {
            long now = System.currentTimeMillis();
            long elapsed = now - lastRefill;
            if (elapsed >= 60_000) {
                tokens.set(maxTokens);
                lastRefill = now;
            } else if (elapsed >= 1_000) {
                long toAdd = (elapsed / 1_000) * (maxTokens / 60);
                if (toAdd > 0) {
                    tokens.updateAndGet(t -> Math.min(t + toAdd, maxTokens));
                    lastRefill = now;
                }
            }
        }
    }
}
