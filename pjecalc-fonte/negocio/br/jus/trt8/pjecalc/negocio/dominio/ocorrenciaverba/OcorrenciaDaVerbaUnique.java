/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.lang.builder.EqualsBuilder
 *  org.apache.commons.lang.builder.HashCodeBuilder
 */
package br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;

public class OcorrenciaDaVerbaUnique {
    private Periodo periodo;
    private Periodo periodoAquisitivo;
    private boolean feriasIndenizadas;
    private boolean feriasComAbono;

    public OcorrenciaDaVerbaUnique() {
    }

    public OcorrenciaDaVerbaUnique(Periodo periodo, Periodo periodoAquisitivo, boolean feriasIndenizadas, Boolean feriasComAbono) {
        this.update(periodo, periodoAquisitivo, feriasIndenizadas, feriasComAbono);
    }

    public OcorrenciaDaVerbaUnique(OcorrenciaDeVerba ocorrencia) {
        this.update(ocorrencia);
    }

    public void update(Periodo periodo, Periodo periodoAquisitivo, boolean feriasIndenizadas, Boolean feriasComAbono) {
        this.periodo = periodo;
        this.periodoAquisitivo = periodoAquisitivo;
        this.feriasIndenizadas = feriasIndenizadas;
        this.feriasComAbono = feriasComAbono;
    }

    public OcorrenciaDaVerbaUnique update(OcorrenciaDeVerba ocorrencia) {
        if (Utils.naoNulos(ocorrencia.getDataInicialPeriodoAquisitivo(), ocorrencia.getDataFinalPeriodoAquisitivo())) {
            this.update(new Periodo(ocorrencia.getDataInicial(), ocorrencia.getDataFinal()), new Periodo(ocorrencia.getDataInicialPeriodoAquisitivo(), ocorrencia.getDataFinalPeriodoAquisitivo()), ocorrencia.isFeriasIndenizadas(), ocorrencia.isFeriasComAbono());
        } else {
            this.update(new Periodo(ocorrencia.getDataInicial(), ocorrencia.getDataFinal()), null, ocorrencia.isFeriasIndenizadas(), ocorrencia.isFeriasComAbono());
        }
        return this;
    }

    public Periodo getPeriodo() {
        return this.periodo;
    }

    public void setPeriodo(Periodo periodo) {
        this.periodo = periodo;
    }

    public Periodo getPeriodoAquisitivo() {
        return this.periodoAquisitivo;
    }

    public void setPeriodoAquisitivo(Periodo periodoAquisitivo) {
        this.periodoAquisitivo = periodoAquisitivo;
    }

    public boolean isFeriasIndenizadas() {
        return this.feriasIndenizadas;
    }

    public void setFeriasIndenizadas(boolean feriasIndenizadas) {
        this.feriasIndenizadas = feriasIndenizadas;
    }

    public boolean getFeriasComAbono() {
        return this.feriasComAbono;
    }

    public void setFeriasComAbono(boolean feriasComAbono) {
        this.feriasComAbono = feriasComAbono;
    }

    public int hashCode() {
        return new HashCodeBuilder(1, 31).append((Object)this.periodo).append((Object)this.periodoAquisitivo).append(this.feriasIndenizadas).append(this.feriasComAbono).hashCode();
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
        OcorrenciaDaVerbaUnique other = (OcorrenciaDaVerbaUnique)obj;
        return new EqualsBuilder().append((Object)this.periodo, (Object)other.periodo).append((Object)this.periodoAquisitivo, (Object)other.periodoAquisitivo).append(this.feriasIndenizadas, other.feriasIndenizadas).append(this.feriasComAbono, other.feriasComAbono).isEquals();
    }
}

