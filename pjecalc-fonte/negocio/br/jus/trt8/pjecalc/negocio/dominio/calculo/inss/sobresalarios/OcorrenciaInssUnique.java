/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInss;

public class OcorrenciaInssUnique {
    private Competencia competencia;
    private boolean decimoTerceiro;

    public OcorrenciaInssUnique() {
    }

    public OcorrenciaInssUnique(OcorrenciaDeInss ocorrencia) {
        this();
        this.update(ocorrencia);
    }

    public OcorrenciaInssUnique(Competencia competencia, boolean decimoTerceiro) {
        this();
        this.competencia = competencia;
        this.decimoTerceiro = decimoTerceiro;
    }

    public void update(Competencia competencia, boolean decimoTerceiro) {
        this.competencia = competencia;
        this.decimoTerceiro = decimoTerceiro;
    }

    public OcorrenciaInssUnique update(OcorrenciaDeInss ocorrencia) {
        this.update(Competencia.getInstance(ocorrencia.getDataOcorrenciaInss()), ocorrencia.getOcorrenciaDecimoTerceiro());
        return this;
    }

    public Competencia getCompetencia() {
        return this.competencia;
    }

    public void setCompetencia(Competencia competencia) {
        this.competencia = competencia;
    }

    public boolean getDecimoTerceiro() {
        return this.decimoTerceiro;
    }

    public void setDecimoTerceiro(boolean decimoTerceiro) {
        this.decimoTerceiro = decimoTerceiro;
    }

    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.competencia == null ? 0 : this.competencia.hashCode());
        result = 31 * result + (this.decimoTerceiro ? 1231 : 1237);
        return result;
    }

    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        OcorrenciaInssUnique other = (OcorrenciaInssUnique)obj;
        if (this.competencia == null ? other.competencia != null : !this.competencia.equals(other.competencia)) {
            return false;
        }
        return this.decimoTerceiro == other.decimoTerceiro;
    }
}

