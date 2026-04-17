/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.lang.builder.EqualsBuilder
 *  org.apache.commons.lang.builder.HashCodeBuilder
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import java.util.Date;
import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;

public class Competencia {
    private Integer mes;
    private Integer ano;

    public Competencia() {
    }

    public Competencia(Integer mes, Integer ano) {
        this.update(mes, ano);
    }

    public Competencia(Date data) {
        this.update(data);
    }

    public void update(Integer mes, Integer ano) {
        this.mes = mes;
        this.ano = ano;
    }

    public void update(Date data) {
        if (Utils.naoNulo(data)) {
            HelperDate helperDate = HelperDate.getInstance(data);
            this.setMes(helperDate.getMonth());
            this.setAno(helperDate.getYear());
        }
    }

    public static Competencia getInstance(Integer mes, Integer ano) {
        return new Competencia(mes, ano);
    }

    public static Competencia getInstance(Date data) {
        return new Competencia(data);
    }

    public HelperDate getHelperDate() {
        if (Utils.naoNulos(this.mes, this.ano)) {
            return HelperDate.getInstance(this.ano, this.mes, 1);
        }
        return null;
    }

    public Date getData() {
        HelperDate helperDate = this.getHelperDate();
        if (Utils.naoNulo(helperDate)) {
            return helperDate.getDate();
        }
        return null;
    }

    public Periodo criarPeriodoDaCompetencia() {
        HelperDate data = this.getHelperDate();
        return new Periodo(data.getDate(), data.lastDayOfTheMonth().getDate());
    }

    public Integer getMes() {
        return this.mes;
    }

    public Integer getAno() {
        return this.ano;
    }

    public void setMes(Integer mes) {
        this.mes = mes;
    }

    public void setAno(Integer ano) {
        this.ano = ano;
    }

    public boolean isAnteriorA(Date competenciaDaData) {
        return this.getHelperDate().lessThen(HelperDate.getCurrentCompetence(competenciaDaData));
    }

    public boolean isApos(Date competenciaDaData) {
        return this.getHelperDate().greaterThen(HelperDate.getCurrentCompetence(competenciaDaData));
    }

    public int hashCode() {
        return new HashCodeBuilder(1, 31).append((Object)this.ano).append((Object)this.mes).hashCode();
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
        Competencia other = (Competencia)obj;
        return new EqualsBuilder().append((Object)this.ano, (Object)other.ano).append((Object)this.mes, (Object)other.mes).isEquals();
    }
}

