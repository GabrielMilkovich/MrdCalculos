/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.resteasy.client.ClientRequest
 *  org.jboss.resteasy.client.ClientResponse
 *  org.jboss.resteasy.util.Base64
 */
package br.jus.trt8.pjecalc.integracao.rest.client;

import br.jus.trt8.pjecalc.integracao.dto.RetornoErroDto;
import br.jus.trt8.pjecalc.integracao.dto.autenticacao.PerfilDto;
import br.jus.trt8.pjecalc.integracao.dto.autenticacao.RequisicaoAccessTokenDto;
import br.jus.trt8.pjecalc.integracao.dto.autenticacao.RequisicaoAutorizacaoTokenDto;
import br.jus.trt8.pjecalc.integracao.dto.autenticacao.RetornoTokenDto;
import br.jus.trt8.pjecalc.integracao.dto.autenticacao.TokenTemporarioDto;
import br.jus.trt8.pjecalc.integracao.exception.AutenticacaoException;
import br.jus.trt8.pjecalc.integracao.util.PapelUtil;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ws.rs.core.Response;
import org.jboss.resteasy.client.ClientRequest;
import org.jboss.resteasy.client.ClientResponse;
import org.jboss.resteasy.util.Base64;

public class AuthClient
implements Serializable {
    private static final long serialVersionUID = 1L;
    public static final String REFRESH_TOKEN = "refresh_token";
    public static final String ACCESS_TOKEN = "access_token";
    public static final String ACCESS_TOKEN_FOOTER = "access_token_footer";
    private static final Logger LOGGER = Logger.getLogger(AuthClient.class.getSimpleName());
    private static String API = System.getProperty("seguranca.pjekz.servico.contexto");
    private static String CLIENT_ID = System.getProperty("seguranca.pjekz.clientId");
    private static String CLIENT_SECRET = System.getProperty("seguranca.pjekz.clientSecret");
    private static String[] PAPEIS_PERMITIDOS = PapelUtil.getPapeisPermitidos();
    private Integer instancia;

    public AuthClient(Integer instancia) {
        this.instancia = instancia;
    }

    public RetornoTokenDto autenticar(String certificadoDigital, String assinatura, String conteudoAssinado) throws AutenticacaoException {
        return this.autenticar(null, null, certificadoDigital, assinatura, conteudoAssinado, null);
    }

    public RetornoTokenDto autenticar(String certificadoDigital, String assinatura, String conteudoAssinado, Long idPerfil) throws AutenticacaoException {
        return this.autenticar(null, null, certificadoDigital, assinatura, conteudoAssinado, idPerfil);
    }

    public RetornoTokenDto autenticar(String usuario, String senha, Long idPerfil) throws AutenticacaoException {
        return this.autenticar(usuario, senha, null, null, null, idPerfil);
    }

    public RetornoTokenDto autenticar(String usuario, String senha) throws AutenticacaoException {
        return this.autenticar(usuario, senha, null, null, null, null);
    }

    private Long buscarPerfilPermitido(List<PerfilDto> perfis) throws AutenticacaoException {
        perfis = perfis != null ? perfis : new ArrayList();
        for (PerfilDto p : perfis) {
            for (String papelPermitido : PAPEIS_PERMITIDOS) {
                if (!p.getPapel().trim().equalsIgnoreCase(papelPermitido.trim())) continue;
                return p.getIdPerfil();
            }
        }
        throw new AutenticacaoException("Usu\u00e1rio n\u00e3o autorizado.");
    }

    private RetornoTokenDto autenticar(String usuario, String senha, String certificadoDigital, String assinatura, String conteudoAssinado, Long idPerfil) throws AutenticacaoException {
        AuthClient authClient = new AuthClient(this.instancia);
        TokenTemporarioDto tokenTemporario = authClient.realizarPreAutenticacao(usuario, senha, certificadoDigital, assinatura, conteudoAssinado);
        if (idPerfil == null) {
            idPerfil = this.buscarPerfilPermitido(tokenTemporario.getPerfis());
        } else {
            boolean perfilEncontrado = false;
            for (PerfilDto perfil : tokenTemporario.getPerfis()) {
                if (!perfil.getIdPerfil().equals(idPerfil)) continue;
                perfilEncontrado = true;
                break;
            }
            if (!perfilEncontrado) {
                throw new AutenticacaoException("Perfil solicitado n\u00e3o foi encontrado.");
            }
        }
        RetornoTokenDto tokenDto = authClient.autenticarComPerfil(tokenTemporario.getCode(), idPerfil);
        tokenDto.setPerfis(tokenTemporario.getPerfis());
        return tokenDto;
    }

    private TokenTemporarioDto realizarPreAutenticacao(String usuario, String senha, String certificadoDigital, String assinatura, String conteudoAssinado) throws AutenticacaoException {
        ClientRequest request = new ClientRequest(API + "/api/authorize");
        request.accept("application/json");
        RequisicaoAutorizacaoTokenDto dto = new RequisicaoAutorizacaoTokenDto();
        dto.setClientId(CLIENT_ID);
        dto.setResponseType("code");
        dto.setLogin(usuario);
        dto.setSenha(senha);
        dto.setCertificadoDigital(certificadoDigital);
        dto.setAssinatura(assinatura);
        dto.setConteudoAssinado(conteudoAssinado);
        dto.setInstancia(this.instancia);
        request.body("application/json", (Object)dto);
        ClientResponse response = null;
        try {
            response = request.post();
        }
        catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getMessage(), e);
            throw new AutenticacaoException("Ocorreu um erro ao obter a resposta da autentica\u00e7\u00e3o com o PJe.");
        }
        if (response.getResponseStatus().getFamily() != Response.Status.Family.SUCCESSFUL) {
            RetornoErroDto retornoErro = (RetornoErroDto)response.getEntity(RetornoErroDto.class);
            if (retornoErro != null && retornoErro.getMensagem() != null) {
                throw new AutenticacaoException(retornoErro.getMensagem());
            }
            throw new AutenticacaoException("Ocorreu um erro inesperado ao autenticar. Retorno: " + response.getStatus() + " - " + response.getResponseStatus());
        }
        return (TokenTemporarioDto)response.getEntity(TokenTemporarioDto.class);
    }

    private RetornoTokenDto autenticarComPerfil(String code, Long idPerfil) throws AutenticacaoException {
        ClientRequest request = new ClientRequest(API + "/api/token");
        String base64Authorization = Base64.encodeBytes((byte[])(CLIENT_ID + ":" + CLIENT_SECRET).getBytes(StandardCharsets.UTF_8));
        request.header("Authorization", (Object)("Basic " + base64Authorization));
        request.accept("application/json");
        RequisicaoAccessTokenDto dto = new RequisicaoAccessTokenDto();
        dto.setCode(code);
        dto.setGrantType("authorization_code");
        dto.setIdPerfil(idPerfil);
        request.body("application/json", (Object)dto);
        ClientResponse response = null;
        try {
            response = request.post();
        }
        catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getMessage(), e);
            throw new AutenticacaoException("Ocorreu um erro ao obter a resposta da autentica\u00e7\u00e3o com o PJe.");
        }
        if (response.getResponseStatus().getFamily() != Response.Status.Family.SUCCESSFUL) {
            RetornoErroDto retornoErro = (RetornoErroDto)response.getEntity(RetornoErroDto.class);
            if (retornoErro != null && retornoErro.getMensagem() != null) {
                throw new AutenticacaoException(retornoErro.getMensagem());
            }
            throw new AutenticacaoException("Ocorreu um erro inesperado ao autenticar. Retorno: " + response.getStatus() + " - " + response.getResponseStatus());
        }
        return (RetornoTokenDto)response.getEntity(RetornoTokenDto.class);
    }

    public static boolean validarToken(String accessToken, String cookieAccessToken, String cookieAccessTokenFooter) {
        ClientRequest request = new ClientRequest(API + "/api/token/validate");
        ClientResponse response = null;
        try {
            response = request.cookie(ACCESS_TOKEN, (Object)cookieAccessToken).cookie(ACCESS_TOKEN_FOOTER, (Object)cookieAccessTokenFooter).body("text/plain", (Object)accessToken).post();
        }
        catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getMessage(), e);
            return false;
        }
        return response.getResponseStatus().getFamily() == Response.Status.Family.SUCCESSFUL;
    }

    public static RetornoTokenDto atualizarToken(String refreshToken) throws AutenticacaoException {
        ClientRequest request = new ClientRequest(API + "/api/token/refresh");
        ClientResponse response = null;
        try {
            response = request.accept("application/json").cookie(REFRESH_TOKEN, (Object)refreshToken).get();
        }
        catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getMessage(), e);
            throw new AutenticacaoException("Ocorreu um erro ao obter a resposta da atualiza\u00e7\u00e3o de autentica\u00e7\u00e3o com o PJe.");
        }
        if (response.getResponseStatus().getFamily() != Response.Status.Family.SUCCESSFUL) {
            RetornoErroDto retornoErro = (RetornoErroDto)response.getEntity(RetornoErroDto.class);
            if (retornoErro != null && retornoErro.getMensagem() != null) {
                throw new AutenticacaoException(retornoErro.getMensagem());
            }
            throw new AutenticacaoException("Ocorreu um erro inesperado ao atualizar a autenticidade do usu\u00e1rio. Retorno: " + response.getStatus() + " - " + response.getResponseStatus());
        }
        RetornoTokenDto refreshed = (RetornoTokenDto)response.getEntity(RetornoTokenDto.class);
        refreshed.setRefreshToken(refreshToken);
        return refreshed;
    }

    public static List<PerfilDto> buscarPerfis(String token) throws AutenticacaoException {
        ClientRequest request = new ClientRequest(API + "/api/token/perfis");
        request.header("Authorization", (Object)("Bearer " + token));
        ClientResponse response = null;
        try {
            response = request.accept("application/json").get();
        }
        catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getMessage(), e);
            throw new AutenticacaoException("Ocorreu um erro ao obter a resposta da busca de perfis do usu\u00e1rio logado.");
        }
        if (response.getResponseStatus().getFamily() != Response.Status.Family.SUCCESSFUL) {
            RetornoErroDto retornoErro = (RetornoErroDto)response.getEntity(RetornoErroDto.class);
            if (retornoErro != null && retornoErro.getMensagem() != null) {
                throw new AutenticacaoException(retornoErro.getMensagem());
            }
            throw new AutenticacaoException("Ocorreu um erro inesperado ao buscar os perfis do usu\u00e1rio logado. Retorno: " + response.getStatus() + " - " + response.getResponseStatus());
        }
        ArrayList<PerfilDto> perfis = new ArrayList<PerfilDto>();
        List retorno = (List)response.getEntity(List.class);
        for (LinkedHashMap perfil : retorno) {
            perfis.add(new PerfilDto(perfil));
        }
        return perfis;
    }
}

