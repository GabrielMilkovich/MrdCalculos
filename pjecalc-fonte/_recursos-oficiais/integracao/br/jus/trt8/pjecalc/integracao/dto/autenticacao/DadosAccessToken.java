/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.codec.binary.Base64
 *  org.codehaus.jackson.JsonFactory
 *  org.codehaus.jackson.JsonNode
 *  org.codehaus.jackson.map.ObjectMapper
 */
package br.jus.trt8.pjecalc.integracao.dto.autenticacao;

import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.codec.binary.Base64;
import org.codehaus.jackson.JsonFactory;
import org.codehaus.jackson.JsonNode;
import org.codehaus.jackson.map.ObjectMapper;

public class DadosAccessToken
implements Serializable {
    private static final long serialVersionUID = 1L;
    private static final Logger LOGGER = Logger.getLogger(DadosAccessToken.class.getSimpleName());
    private final String nome;
    private final String cpf;
    private final Long idPerfil;
    private final Integer instancia;

    public DadosAccessToken(String tokenCodificado) {
        String nome = null;
        String cpf = null;
        Long idPerfil = null;
        Integer instancia = null;
        try {
            String payloadCodificado = tokenCodificado.split("\\.")[1];
            String payloadDecodificado = new String(Base64.decodeBase64((String)payloadCodificado), StandardCharsets.UTF_8);
            ObjectMapper mapper = new ObjectMapper(new JsonFactory());
            JsonNode tree = mapper.readTree(payloadDecodificado);
            nome = tree.get("nome").getTextValue();
            cpf = tree.get("login").getTextValue();
            idPerfil = tree.get("perfil").getLongValue();
            instancia = tree.get("instancia").getIntValue();
        }
        catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getMessage(), e);
        }
        this.nome = nome;
        this.cpf = cpf;
        this.idPerfil = idPerfil;
        this.instancia = instancia;
    }

    public String getNome() {
        return this.nome;
    }

    public String getCpf() {
        return this.cpf;
    }

    public Long getIdPerfil() {
        return this.idPerfil;
    }

    public Integer getInstancia() {
        return this.instancia;
    }
}

