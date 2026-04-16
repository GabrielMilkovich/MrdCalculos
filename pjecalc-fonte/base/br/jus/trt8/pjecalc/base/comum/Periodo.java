/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.lang.builder.EqualsBuilder
 *  org.apache.commons.lang.builder.HashCodeBuilder
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.LogicoFuzzy;
import br.jus.trt8.pjecalc.base.comum.Utils;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;

public class Periodo {
    private Date inicial;
    private Date finall;
    private String labelDataIncial = "Data Inicial";
    private String labelDataFinal = "Data Final";

    public Periodo() {
    }

    public Periodo(Date inicial, Date fim) {
        this();
        this.inicial = inicial;
        this.finall = fim;
    }

    public Periodo(HelperDate inicial, HelperDate fim) {
        this();
        this.inicial = inicial.getDate();
        this.finall = fim.getDate();
    }

    public Date getInicial() {
        return this.inicial;
    }

    public void setInicial(Date inicial) {
        this.inicial = inicial;
    }

    public Date getFinal() {
        return this.finall;
    }

    public String getLabelDataIncial() {
        return this.labelDataIncial;
    }

    public void setLabelDataIncial(String labelDataIncial) {
        this.labelDataIncial = labelDataIncial;
    }

    public String getLabelDataFinal() {
        return this.labelDataFinal;
    }

    public void setLabelDataFinal(String labelDataFinal) {
        this.labelDataFinal = labelDataFinal;
    }

    public void setFinal(Date fim) {
        this.finall = fim;
    }

    public int totalDeDias() {
        if (Utils.naoNulos(this.inicial, this.finall)) {
            return (int)HelperDate.getInstance(this.finall).subtractDays(this.inicial) + 1;
        }
        return 0;
    }

    public boolean isCompleto() {
        return Utils.naoNulos(this.inicial, this.finall);
    }

    public int totalDeDiasUteis(LogicoFuzzy<?> logicoFuzzy) {
        return HelperDate.getInstance(this.inicial).totalWorkDays(HelperDate.getInstance(this.finall), logicoFuzzy);
    }

    public int totalDeDiasNaoUteis(LogicoFuzzy<?> logicoFuzzy) {
        return HelperDate.getInstance(this.inicial).totalNotWorkDays(HelperDate.getInstance(this.finall), logicoFuzzy);
    }

    public int totalDeFeriados() {
        return HelperDate.getInstance(this.inicial).totalHolidays(HelperDate.getInstance(this.finall));
    }

    public int totalDeRepousosEFeriados(LogicoFuzzy<?> logicoFuzzy) {
        return HelperDate.getInstance(this.inicial).totalWeekendOrHolidays(HelperDate.getInstance(this.finall), logicoFuzzy);
    }

    public String formatInicial(String formato) {
        return HelperDate.getInstance(this.getInicial()).format(formato);
    }

    public String formatFinal(String formato) {
        return HelperDate.getInstance(this.getFinal()).format(formato);
    }

    public boolean isDatasDoMesmoMes() {
        return HelperDate.getInstance(this.inicial).getMonth() == HelperDate.getInstance(this.finall).getMonth();
    }

    public HelperDate obterDataFinalHelper() {
        return HelperDate.getInstance(this.getFinal());
    }

    public HelperDate obterDataInicialHelper() {
        return HelperDate.getInstance(this.getInicial());
    }

    public boolean isDataContidaNeste(Periodo periodo) {
        return HelperDate.dateAfterOrEquals(this.getInicial(), periodo.getInicial()) && HelperDate.dateBeforeOrEquals(this.getInicial(), periodo.getFinal()) || HelperDate.dateBeforeOrEquals(this.getFinal(), periodo.getFinal()) && HelperDate.dateAfterOrEquals(this.getFinal(), periodo.getInicial());
    }

    public boolean isPeriodoContemEste(Periodo periodo) {
        return HelperDate.dateAfterOrEquals(periodo.getInicial(), this.getInicial()) && HelperDate.dateBeforeOrEquals(periodo.getFinal(), this.getInicial()) || HelperDate.dateBeforeOrEquals(periodo.getFinal(), this.getFinal()) && HelperDate.dateAfterOrEquals(periodo.getFinal(), this.getInicial());
    }

    public boolean isPeriodoContemTotalmenteEste(Periodo periodo) {
        if (Utils.nulo(periodo.getInicial()) || Utils.nulo(periodo.getFinal())) {
            return false;
        }
        return HelperDate.getInstance(periodo.getInicial()).between(this.getInicial(), this.getFinal()) && HelperDate.getInstance(periodo.getFinal()).between(this.getInicial(), this.getFinal());
    }

    public boolean isDatasCoincidentesCom(Periodo periodo) {
        return this.isDataContidaNeste(periodo) || this.isPeriodoContemEste(periodo);
    }

    public boolean isPeriodoContemEsta(Date data) {
        return HelperDate.dateAfterOrEquals(data, this.inicial) && HelperDate.dateBeforeOrEquals(data, this.finall);
    }

    public int totalDeDiasCoincidentesComEste(Periodo periodo) {
        int totalDeDiasCoincidentes = 0;
        if (this.isDatasCoincidentesCom(periodo)) {
            HelperDate data = HelperDate.getInstance(periodo.getInicial());
            HelperDate dataFinal = HelperDate.getInstance(periodo.getFinal());
            int numeroMaximoDeLoops = this.totalDeDias() > periodo.totalDeDias() ? this.totalDeDias() : periodo.totalDeDias();
            for (int i = 0; i < numeroMaximoDeLoops && data.lessThanOrEqualsTo(dataFinal); ++i) {
                if (this.isPeriodoContemEsta(data.getDate())) {
                    ++totalDeDiasCoincidentes;
                }
                data.addDay(1);
            }
        }
        return totalDeDiasCoincidentes;
    }

    public boolean isMesmoPeriodo(Periodo periodo) {
        return HelperDate.dateEquals(periodo.getInicial(), this.getInicial()) && HelperDate.dateEquals(periodo.getFinal(), this.getFinal());
    }

    public Periodo interseccao(Periodo periodo) {
        if (!Utils.naoNulos(periodo, this.getInicial(), this.getFinal(), periodo.getInicial(), periodo.getFinal())) {
            return null;
        }
        if (HelperDate.dateAfter(periodo.getInicial(), this.getFinal()) || HelperDate.dateAfter(this.getInicial(), periodo.getFinal())) {
            return null;
        }
        Periodo interseccao = new Periodo();
        if (HelperDate.dateBeforeOrEquals(this.getInicial(), periodo.getInicial())) {
            interseccao.setInicial(periodo.getInicial());
        } else {
            interseccao.setInicial(this.getInicial());
        }
        if (HelperDate.dateBeforeOrEquals(this.getFinal(), periodo.getFinal())) {
            interseccao.setFinal(this.getFinal());
        } else {
            interseccao.setFinal(periodo.getFinal());
        }
        return interseccao;
    }

    public List<Periodo> dividirNaData(Date dataDaDivisao) {
        ArrayList<Periodo> divisao = new ArrayList<Periodo>();
        if (HelperDate.dateBeforeOrEquals(this.getFinal(), dataDaDivisao)) {
            divisao.add(this);
        } else if (HelperDate.dateBefore(dataDaDivisao, this.getInicial())) {
            divisao.add(this);
        } else {
            divisao.add(new Periodo(this.getInicial(), dataDaDivisao));
            Date umDiaAposDivisao = HelperDate.getInstance(dataDaDivisao).addDay(1).getDate();
            divisao.add(new Periodo(umDiaAposDivisao, this.getFinal()));
        }
        return divisao;
    }

    public boolean isDataFinalMenorQueInicial() {
        if (Utils.naoNulos(this.getInicial(), this.getFinal())) {
            return this.obterDataFinalHelper().lessThen(this.getInicial());
        }
        return false;
    }

    public boolean isDataMenorQueIncial(Date data) {
        return HelperDate.dateBefore(data, this.inicial);
    }

    public boolean isDataMaiorQueFinal(Date data) {
        return HelperDate.dateAfter(data, this.finall);
    }

    public int hashCode() {
        return new HashCodeBuilder(1, 31).append((Object)this.inicial).append((Object)this.finall).hashCode();
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
        Periodo other = (Periodo)obj;
        return new EqualsBuilder().append((Object)this.inicial, (Object)other.inicial).append((Object)this.finall, (Object)other.finall).isEquals();
    }

    public String toString() {
        if (Utils.nulos(this.inicial, this.finall)) {
            return "";
        }
        return this.formatInicial("dd/MM/yyyy") + " a " + this.formatFinal("dd/MM/yyyy");
    }
}

