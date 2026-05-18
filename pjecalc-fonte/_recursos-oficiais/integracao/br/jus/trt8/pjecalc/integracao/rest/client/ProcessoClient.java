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
import br.jus.trt8.pjecalc.integracao.dto.processo.NumeroProcessoDto;
import br.jus.trt8.pjecalc.integracao.dto.processo.PartesDto;
import br.jus.trt8.pjecalc.integracao.dto.processo.ProcessoDto;
import br.jus.trt8.pjecalc.integracao.exception.ConsultaProcessoException;
import java.io.Serializable;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ws.rs.core.Response;
import org.jboss.resteasy.client.ClientRequest;
import org.jboss.resteasy.client.ClientResponse;

public class ProcessoClient
implements Serializable {
    private static final long serialVersionUID = 1L;
    private static final Logger LOGGER = Logger.getLogger(ProcessoClient.class.getSimpleName());
    private static final String API = System.getProperty("exporta.pjekz.servico.contexto");

    public static ProcessoDto buscarDadosProcesso(Integer numero, Integer digito, Integer ano, Integer justica, Integer regiao, Integer vara, RetornoTokenDto tokenAutorizacao) throws ConsultaProcessoException {
        return ProcessoClient.buscarDadosProcesso(NumeroProcessoDto.formatar(numero, digito, ano, justica, regiao, vara), tokenAutorizacao);
    }

    public static ProcessoDto buscarDadosProcesso(String numeroProcesso, RetornoTokenDto tokenAutorizacao) throws ConsultaProcessoException {
        ClientResponse<?> response = null;
        response = ProcessoClient.executarChamada("api/processos?numero=" + numeroProcesso, tokenAutorizacao);
        Long idProcesso = (Long)response.getEntity(Long.class);
        response = ProcessoClient.executarChamada("api/processos/id/" + idProcesso, tokenAutorizacao);
        ProcessoDto processo = (ProcessoDto)response.getEntity(ProcessoDto.class);
        response = ProcessoClient.executarChamada("api/processos/id/" + idProcesso + "/partes", tokenAutorizacao);
        PartesDto partes = (PartesDto)response.getEntity(PartesDto.class);
        processo.setPartes(partes);
        return processo;
    }

    private static String getUrlApi() {
        return API + (API.endsWith("/") ? "" : "/");
    }

    private static ClientResponse<?> executarChamada(String api, RetornoTokenDto tokenAutorizacao) throws ConsultaProcessoException {
        ClientRequest request = new ClientRequest(ProcessoClient.getUrlApi() + api);
        request.header("Authorization", (Object)(tokenAutorizacao.getTokenType() + " " + tokenAutorizacao.getAccessToken()));
        request.accept("application/json");
        ClientResponse response = null;
        try {
            response = request.get();
        }
        catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getMessage(), e);
            throw new ConsultaProcessoException("Ocorreu um erro ao obter a resposta do servi\u00e7o de consulta de processo no PJe.");
        }
        if (response.getResponseStatus().getFamily() != Response.Status.Family.SUCCESSFUL) {
            RetornoErroDto retornoErro = (RetornoErroDto)response.getEntity(RetornoErroDto.class);
            if (retornoErro != null && retornoErro.getMensagem() != null && !"".equals(retornoErro.getMensagem().trim())) {
                throw new ConsultaProcessoException(retornoErro.getMensagem());
            }
            throw new ConsultaProcessoException("Ocorreu um erro inesperado ao consultar o processo no PJe. Retorno: " + response.getStatus() + " - " + response.getResponseStatus());
        }
        return response;
    }
}

