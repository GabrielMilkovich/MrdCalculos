/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.lang.builder.EqualsBuilder
 *  org.apache.commons.lang.builder.HashCodeBuilder
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import java.util.Date;
import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;

public class CompetenciaDeJuros
extends Competencia
implements Comparable<CompetenciaDeJuros> {
    private Date dataInicial;

    public CompetenciaDeJuros(Date competencia, Date dataInicial) {
        super(competencia);
        this.dataInicial = dataInicial;
    }

    public static CompetenciaDeJuros getInstance(Date competencia, Date dataInicial) {
        return new CompetenciaDeJuros(competencia, dataInicial);
    }

    public Date getDataInicial() {
        return this.dataInicial;
    }

    public void setDataInicial(Date dataInicial) {
        this.dataInicial = dataInicial;
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder(1, 31).appendSuper(super.hashCode()).append((Object)this.dataInicial).hashCode();
    }

    @Override
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
        CompetenciaDeJuros other = (CompetenciaDeJuros)obj;
        return new EqualsBuilder().appendSuper(super.equals(obj)).append((Object)this.dataInicial, (Object)other.dataInicial).isEquals();
    }

    @Override
    public int compareTo(CompetenciaDeJuros outraCompetencia) {
        if (HelperDate.dateBefore(this.getData(), outraCompetencia.getData())) {
            return -1;
        }
        if (HelperDate.dateAfter(this.getData(), outraCompetencia.getData())) {
            return 1;
        }
        if (HelperDate.dateBefore(this.dataInicial, outraCompetencia.dataInicial)) {
            return -1;
        }
        if (HelperDate.dateAfter(this.dataInicial, outraCompetencia.dataInicial)) {
            return 1;
        }
        return 0;
    }
}

