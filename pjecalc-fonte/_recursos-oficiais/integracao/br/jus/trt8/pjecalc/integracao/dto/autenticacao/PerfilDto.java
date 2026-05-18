/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.integracao.dto.autenticacao;

import java.io.Serializable;
import java.util.Map;

public class PerfilDto
implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long idPerfil;
    private String papel;
    private String identificadorPapel;
    private String identificadorPapelLegado;
    private String localizacao;
    private Long idOrgaoJulgador;
    private String orgaoJulgador;
    private Long idOrgaoJulgadorColegiado;
    private String orgaoJulgadorColegiado;
    private String jurisdicao;
    private Integer vara;
    private boolean acessoKz;

    public PerfilDto() {
    }

    public PerfilDto(Map<String, Object> perfil) {
        this.idPerfil = ((Integer)perfil.get("idPerfil")).longValue();
        this.papel = (String)perfil.get("papel");
        this.identificadorPapel = (String)perfil.get("identificadorPapel");
        this.identificadorPapelLegado = (String)perfil.get("identificadorPapelLegado");
        this.localizacao = (String)perfil.get("localizacao");
        this.idOrgaoJulgador = perfil.get("idOrgaoJulgador") != null ? Long.valueOf(((Integer)perfil.get("idOrgaoJulgador")).longValue()) : null;
        this.orgaoJulgador = (String)perfil.get("orgaoJulgador");
        this.jurisdicao = (String)perfil.get("jurisdicao");
        this.vara = (Integer)perfil.get("vara");
        this.acessoKz = (Boolean)perfil.get("acessoKz");
    }

    public Long getIdPerfil() {
        return this.idPerfil;
    }

    public void setIdPerfil(Long idPerfil) {
        this.idPerfil = idPerfil;
    }

    public String getPapel() {
        return this.papel;
    }

    public void setPapel(String papel) {
        this.papel = papel;
    }

    public String getLocalizacao() {
        return this.localizacao;
    }

    public void setLocalizacao(String localizacao) {
        this.localizacao = localizacao;
    }

    public String getOrgaoJulgador() {
        return this.orgaoJulgador;
    }

    public void setOrgaoJulgador(String orgaoJulgador) {
        this.orgaoJulgador = orgaoJulgador;
    }

    public String getOrgaoJulgadorColegiado() {
        return this.orgaoJulgadorColegiado;
    }

    public void setOrgaoJulgadorColegiado(String orgaoJulgadorColegiado) {
        this.orgaoJulgadorColegiado = orgaoJulgadorColegiado;
    }

    public Long getIdOrgaoJulgadorColegiado() {
        return this.idOrgaoJulgadorColegiado;
    }

    public void setIdOrgaoJulgadorColegiado(Long idOrgaoJulgadorColegiado) {
        this.idOrgaoJulgadorColegiado = idOrgaoJulgadorColegiado;
    }

    public String getJurisdicao() {
        return this.jurisdicao;
    }

    public void setJurisdicao(String jurisdicao) {
        this.jurisdicao = jurisdicao;
    }

    public Integer getVara() {
        return this.vara;
    }

    public void setVara(Integer vara) {
        this.vara = vara;
    }

    public boolean isAcessoKz() {
        return this.acessoKz;
    }

    public void setAcessoKz(boolean acessoKz) {
        this.acessoKz = acessoKz;
    }

    public Long getIdOrgaoJulgador() {
        return this.idOrgaoJulgador;
    }

    public void setIdOrgaoJulgador(Long idOrgaoJulgador) {
        this.idOrgaoJulgador = idOrgaoJulgador;
    }

    public String getIdentificadorPapel() {
        return this.identificadorPapel;
    }

    public void setIdentificadorPapel(String identificadorPapel) {
        this.identificadorPapel = identificadorPapel;
    }

    public String getIdentificadorPapelLegado() {
        return this.identificadorPapelLegado;
    }

    public void setIdentificadorPapelLegado(String identificadorPapelLegado) {
        this.identificadorPapelLegado = identificadorPapelLegado;
    }
}

