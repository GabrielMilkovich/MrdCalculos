/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.dominio;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class Data
implements Serializable {
    private static final long serialVersionUID = -5273937004993830911L;
    private Date valor;
    private Locale locale = new Locale("pt", "br");
    private SimpleDateFormat formatador = new SimpleDateFormat("dd/MM/yyyy", this.locale);

    public static Data dataComValor(Date valor) {
        return new Data(valor);
    }

    public Data() {
    }

    public Data(Date valor) {
        this();
        this.comValor(valor);
    }

    public Data comValor(Date valor) {
        this.valor = valor;
        return this;
    }

    public boolean isAnteriorA(Date data) {
        return this.valor.before(data);
    }

    public boolean isApos(Date data) {
        return this.valor.after(data);
    }

    public boolean isAnteriorACemAnos() {
        Calendar cemAnosAntes = Calendar.getInstance();
        cemAnosAntes.add(1, -100);
        cemAnosAntes.add(6, 1);
        return this.isAnteriorA(cemAnosAntes.getTime());
    }

    public boolean isPosteriorACemAnos() {
        Calendar cemAnosApos = Calendar.getInstance();
        cemAnosApos.add(1, 100);
        if (this.asCalendar().get(5) == 1) {
            cemAnosApos.set(5, 1);
        }
        cemAnosApos.add(6, -1);
        return this.isApos(cemAnosApos.getTime());
    }

    public boolean isAnteriorOuPosteriosACemAnos() {
        return this.isAnteriorACemAnos() || this.isPosteriorACemAnos();
    }

    public boolean compararIgualdadeEntreMesAno(Date data) {
        return this.asCalendar(data).get(2) == this.getMes() && this.asCalendar(data).get(1) == this.getAno();
    }

    public boolean isDiaEMesMaiorOuIgualQue(Date data) {
        Calendar comparada = this.asCalendar(data);
        Calendar base = this.asCalendar();
        base.set(1, comparada.get(1));
        return HelperDate.dateAfterOrEquals(base.getTime(), comparada.getTime());
    }

    public int getMes() {
        Calendar mes = Calendar.getInstance();
        mes.setTime(this.valor);
        return mes.get(2);
    }

    public int getAno() {
        Calendar ano = Calendar.getInstance();
        ano.setTime(this.valor);
        return ano.get(1);
    }

    public boolean isIgualA(Date data) {
        return this.formatador.format(this.valor).equals(this.formatador.format(data));
    }

    public Calendar asCalendar() {
        Calendar dataParaConverter = Calendar.getInstance();
        dataParaConverter.setTime(this.valor);
        return dataParaConverter;
    }

    public Calendar asCalendar(Date data) {
        Calendar dataParaConverter = Calendar.getInstance();
        dataParaConverter.setTime(data);
        return dataParaConverter;
    }

    public String toString() {
        return this.valor == null ? null : this.valor.toString();
    }
}

