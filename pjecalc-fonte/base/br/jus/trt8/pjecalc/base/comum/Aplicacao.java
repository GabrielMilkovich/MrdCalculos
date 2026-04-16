/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 *  org.jboss.seam.international.Messages
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.constantes.TipoVersaoEnum;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.jboss.seam.international.Messages;

@Name(value="aplicacao")
@Scope(value=ScopeType.APPLICATION)
@AutoCreate
public class Aplicacao {
    private static final String ENV_TOKEN_SERVICOS = System.getProperty("seguranca.pjecalc.tokenServicos", "");
    private static final String ENV_PJECALC_AMBIENTE = System.getProperty("configuracao.pjecalc.ambiente", "PRD");

    public TipoVersaoEnum getTipoDeVersao() {
        if (((String)Messages.instance().get("tipo.versao")).equals("offline")) {
            return TipoVersaoEnum.OFFLINE;
        }
        return TipoVersaoEnum.ONLINE;
    }

    public String getUrlTrtResponsavelPelasTabelasNacionais() {
        String url = (String)Messages.instance().get("url.trt.root");
        return url + (url.endsWith("/") ? "" : "/");
    }

    public String getUrlPJe() {
        String url = System.getProperty("seguranca.pjekz.servico.contexto");
        String pattern = ".jus.br/";
        return url.substring(0, url.lastIndexOf(pattern) + pattern.length());
    }

    public String getUrlTrtResponsavelPelasTabelasNacionaisERegionais(String regional) {
        String url = (String)Messages.instance().get("url." + regional.toLowerCase());
        return url + (url.endsWith("/") ? "" : "/");
    }

    public boolean isVersaoOnline() {
        return TipoVersaoEnum.ONLINE == this.getTipoDeVersao();
    }

    public boolean isAmbienteProducao() {
        return ENV_PJECALC_AMBIENTE.equals("PRD");
    }

    public boolean isAmbienteDesenvolvimento() {
        return ENV_PJECALC_AMBIENTE.equals("DEV");
    }

    public String getTokenServicos() {
        String token = ENV_TOKEN_SERVICOS;
        if (token.trim().isEmpty()) {
            throw new IllegalArgumentException("Par\u00e2metro n\u00e3o definido: 'seguranca.pjecalc.tokenServicos'");
        }
        return token;
    }

    public String getFormatoRelatorioEnvio() {
        return (String)Messages.instance().get("pje.servico.envio.formatoRelatorio");
    }

    public String getVersaoDoSistema() {
        return (String)Messages.instance().get("versao");
    }
}

