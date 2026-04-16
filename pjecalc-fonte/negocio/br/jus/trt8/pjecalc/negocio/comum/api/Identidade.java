/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  br.jus.trt8.pjecalc.integracao.dto.autenticacao.RetornoTokenDto
 */
package br.jus.trt8.pjecalc.negocio.comum.api;

import br.jus.trt8.pjecalc.integracao.dto.autenticacao.RetornoTokenDto;
import br.jus.trt8.pjecalc.negocio.constantes.AssinadorDigitalEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Setor;

public interface Identidade {
    public String getNomeCompleto();

    public String getCpf();

    public Setor getSetor();

    public AssinadorDigitalEnum getAssinador();

    public RetornoTokenDto getToken();
}

