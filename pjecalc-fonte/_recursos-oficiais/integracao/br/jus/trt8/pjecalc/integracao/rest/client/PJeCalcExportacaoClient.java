/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.resteasy.client.ClientRequest
 *  org.jboss.resteasy.client.ClientResponse
 */
package br.jus.trt8.pjecalc.integracao.rest.client;

import br.jus.trt8.pjecalc.integracao.dto.RetornoErroDto;
import br.jus.trt8.pjecalc.integracao.dto.autenticacao.RetornoTokenDto;
import br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacao;
import br.jus.trt8.pjecalc.integracao.exception.ExportaException;
import java.net.URL;
import java.net.URLConnection;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ws.rs.core.Cookie;
import javax.ws.rs.core.Response;
import org.jboss.resteasy.client.ClientRequest;
import org.jboss.resteasy.client.ClientResponse;

public class PJeCalcExportacaoClient {
    private static final String API = System.getProperty("exporta.pjekz.servico.contexto");
    private static final Logger LOGGER = Logger.getLogger(PJeCalcExportacaoClient.class.getSimpleName());

    public boolean isServicoAtivo() {
        try {
            URL url = new URL(this.getUrlApi());
            URLConnection conn = url.openConnection();
            return conn.getContentLength() > 0;
        }
        catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getMessage(), e);
            return false;
        }
    }

    private String getUrlApi() {
        return API + (API.endsWith("/") ? "" : "/");
    }

    public void exportarCalculoPJe(PJeCalcImportacao pjecalcImportacao, RetornoTokenDto tokenAutorizacao) throws ExportaException {
        ClientRequest request = new ClientRequest(this.getUrlApi() + "api/calculos");
        request.header("Authorization", (Object)(tokenAutorizacao.getTokenType() + " " + tokenAutorizacao.getAccessToken()));
        Cookie cookie = new Cookie("Xsrf-Token", tokenAutorizacao.getXsrfToken());
        request.cookie(cookie);
        request.header("X-XSRF-TOKEN", (Object)tokenAutorizacao.getXsrfToken());
        request.accept("application/json");
        request.body("application/json", (Object)pjecalcImportacao);
        ClientResponse response = null;
        try {
            response = request.post();
        }
        catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getMessage(), e);
            throw new ExportaException("Ocorreu um erro ao obter a resposta do servi\u00e7o de importa\u00e7\u00e3o do c\u00e1lculo no PJe.");
        }
        if (response.getResponseStatus().getFamily() != Response.Status.Family.SUCCESSFUL) {
            RetornoErroDto retornoErro = (RetornoErroDto)response.getEntity(RetornoErroDto.class);
            if (retornoErro != null && retornoErro.getMensagem() != null && !"".equals(retornoErro.getMensagem().trim())) {
                throw new ExportaException(retornoErro.getMensagem());
            }
            throw new ExportaException("Ocorreu um erro inesperado ao enviar o c\u00e1lculo para o PJe. Retorno: " + response.getStatus() + " - " + response.getResponseStatus());
        }
    }
}

