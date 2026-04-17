/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.Component
 *  org.jboss.seam.log.Log
 *  org.jboss.seam.log.Logging
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.Feriado;
import br.jus.trt8.pjecalc.base.comum.LogicoFuzzy;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.HelperDateFilter;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.List;
import javax.xml.datatype.DatatypeConfigurationException;
import javax.xml.datatype.DatatypeFactory;
import javax.xml.datatype.XMLGregorianCalendar;
import org.jboss.seam.Component;
import org.jboss.seam.log.Log;
import org.jboss.seam.log.Logging;

public class HelperDate {
    private static final Log LOGGER = Logging.getLog(HelperDate.class);
    public static final String TIME_ZONE_ID = "GMT-03:00";
    public static final String FORMATO_DATA_DDMMYYYY = "dd/MM/yyyy";
    public static final String FORMATO_COMPETENCIA = "MM/yyyy";
    private static final int MILLISECONDS_IN_DAY = 86400000;
    public static final int JANUARY = 0;
    public static final int FEBRUARY = 1;
    public static final int MARCH = 2;
    public static final int APRIL = 3;
    public static final int MAY = 4;
    public static final int JUNE = 5;
    public static final int JULY = 6;
    public static final int AUGUST = 7;
    public static final int SEPTEMBER = 8;
    public static final int OCTOBER = 9;
    public static final int NOVEMBER = 10;
    public static final int DECEMBER = 11;
    private Calendar calendar = Calendar.getInstance();

    private HelperDate() {
    }

    private HelperDate(int year, int month, int day) {
        this();
        this.calendar.clear();
        this.setDay(day);
        this.setMonth(month);
        this.setYear(year);
    }

    private HelperDate(Date date) {
        this();
        this.calendar.setTime(date);
    }

    public static HelperDate getInstance() {
        return new HelperDate();
    }

    public static HelperDate getInstance(int year, int month, int day) {
        return new HelperDate(year, month, day);
    }

    public static HelperDate getInstance(Date date) {
        if (date == null) {
            return null;
        }
        return new HelperDate(date);
    }

    public static HelperDate getInstance(String value) {
        SimpleDateFormat frm = new SimpleDateFormat(FORMATO_DATA_DDMMYYYY);
        try {
            return HelperDate.getInstance(frm.parse(value));
        }
        catch (ParseException e) {
            LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            return null;
        }
    }

    public HelperDate update(int year, int month, int day) {
        this.setDay(day);
        this.setMonth(month);
        this.setYear(year);
        return this;
    }

    public HelperDate update(String value) {
        SimpleDateFormat frm = new SimpleDateFormat(FORMATO_DATA_DDMMYYYY);
        try {
            this.setDate(frm.parse(value));
        }
        catch (ParseException e) {
            LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
        }
        return this;
    }

    public Calendar getCalendar() {
        return this.calendar;
    }

    public int getDay() {
        return this.calendar.get(5);
    }

    public int getMonth() {
        return this.calendar.get(2);
    }

    public int getYear() {
        return this.calendar.get(1);
    }

    public Date getDate() {
        return this.calendar.getTime();
    }

    public HelperDate setDay(int day) {
        this.calendar.set(5, day);
        return this;
    }

    public HelperDate setDate(Date date) {
        this.calendar.setTime(date);
        return this;
    }

    public HelperDate setDate(HelperDate date) {
        return this.setDate(date.getDate());
    }

    public HelperDate setMonth(int month) {
        this.calendar.set(2, month);
        return this;
    }

    public HelperDate setYear(int year) {
        this.calendar.set(1, year);
        return this;
    }

    public int daysInMonth() {
        return this.calendar.getActualMaximum(5);
    }

    public long subtractDays(Date date) {
        return this.subtractDays(new HelperDate(date));
    }

    public long subtractDays(HelperDate date) {
        return (this.calendar.getTimeInMillis() - date.getCalendar().getTimeInMillis()) / 86400000L;
    }

    public long subtractMonths(Date date) {
        return this.subtractMonths(new HelperDate(date));
    }

    public long subtractMonths(HelperDate date) {
        return (long)((this.getYear() - date.getYear()) * 12) + (long)(this.getMonth() - date.getMonth()) + (long)(this.getDay() >= date.getDay() ? 0 : -1);
    }

    public HelperDate clone() {
        return HelperDate.getInstance(this.getDate());
    }

    public HelperDate addYear(int amount) {
        this.calendar.add(1, amount);
        return this;
    }

    public HelperDate addMonth(int amount) {
        this.calendar.add(2, amount);
        return this;
    }

    public HelperDate addDay(int amount) {
        this.calendar.add(5, amount);
        return this;
    }

    public boolean match(int year, int month, int day) {
        return this.getYear() == year && this.getMonth() == month && this.getDay() == day;
    }

    public HelperDate lastDayOfTheMonth() {
        int lastDay = this.calendar.getActualMaximum(5);
        return HelperDate.getInstance(this.getYear(), this.getMonth(), lastDay);
    }

    public boolean lessThen(Date date) {
        return this.lessThen(HelperDate.getInstance(date));
    }

    public boolean lessThen(HelperDate date) {
        return this.calendar.getTimeInMillis() < date.getCalendar().getTimeInMillis();
    }

    public boolean lessThanOrEqualsTo(Date date) {
        return this.lessThanOrEqualsTo(HelperDate.getInstance(date));
    }

    public boolean lessThanOrEqualsTo(HelperDate date) {
        return this.calendar.getTimeInMillis() <= date.getCalendar().getTimeInMillis();
    }

    public boolean greaterThenOrEquals(Date date) {
        return this.greaterThenOrEquals(HelperDate.getInstance(date));
    }

    public boolean greaterThenOrEquals(HelperDate date) {
        return this.calendar.getTimeInMillis() >= date.getCalendar().getTimeInMillis();
    }

    public boolean greaterThen(Date date) {
        return this.greaterThen(HelperDate.getInstance(date));
    }

    public boolean greaterThen(HelperDate date) {
        return this.calendar.getTimeInMillis() > date.getCalendar().getTimeInMillis();
    }

    public HelperDate removeTime() {
        this.calendar.set(14, 0);
        this.calendar.set(13, 0);
        this.calendar.set(12, 0);
        this.calendar.set(10, 0);
        return this;
    }

    public static int countYears(Date startDate, Date endDate) {
        HelperDate date1 = HelperDate.getInstance(startDate);
        HelperDate date2 = HelperDate.getInstance(endDate);
        int count = 0;
        HelperDate lastDay = date1.clone().addYear(count + 1).addDay(-1);
        while (lastDay.lessThanOrEqualsTo(date2)) {
            lastDay = date1.clone().addYear(++count + 1).addDay(-1);
        }
        return count;
    }

    public static long countMonths(Date startDate, Date endDate) {
        HelperDate date1 = HelperDate.getInstance(startDate).setDay(1);
        HelperDate date2 = HelperDate.getInstance(endDate).setDay(1);
        int count = 0;
        while (date1.lessThanOrEqualsTo(date2)) {
            ++count;
            date1.addMonth(1);
        }
        return count;
    }

    public static long countDays(Date startDate, Date endDate) {
        HelperDate date1 = HelperDate.getInstance(startDate);
        HelperDate date2 = HelperDate.getInstance(endDate);
        return date2.subtractDays(date1);
    }

    public static List<Periodo> breakInMonths(Date startDate, Date endDate) {
        HelperDate date1 = HelperDate.getInstance(startDate);
        HelperDate date2 = HelperDate.getInstance(endDate);
        ArrayList<Periodo> list = new ArrayList<Periodo>();
        while (date1.lessThanOrEqualsTo(date2)) {
            Periodo periodo = new Periodo();
            periodo.setInicial(date1.getDate());
            HelperDate lastDay = date1.lastDayOfTheMonth();
            if (date2.lessThen(lastDay)) {
                periodo.setFinal(date2.getDate());
            } else {
                periodo.setFinal(lastDay.getDate());
            }
            list.add(periodo);
            date1.addMonth(1);
            date1.setDay(1);
        }
        return list;
    }

    public static List<Date> breakInWorkDays(Date startDate, Date endDate) {
        HelperDate date1 = HelperDate.getInstance(startDate);
        HelperDate date2 = HelperDate.getInstance(endDate);
        ArrayList<Date> list = new ArrayList<Date>();
        while (date1.lessThanOrEqualsTo(date2)) {
            if (date1.isWorkDayWithoutSaturdays()) {
                list.add(date1.getDate());
            }
            date1.addDay(1);
        }
        return list;
    }

    public HelperDate copy(HelperDate date) {
        this.calendar.setTime(date.getDate());
        return this;
    }

    public static List<Periodo> breakInYears(Date startDate, Date endDate, boolean includeRest) {
        HelperDate date1 = HelperDate.getInstance(startDate);
        HelperDate date2 = HelperDate.getInstance(endDate);
        ArrayList<Periodo> list = new ArrayList<Periodo>();
        int base = 1;
        HelperDate lastDay = date1.clone();
        while (lastDay.lessThanOrEqualsTo(date2)) {
            Periodo periodo = new Periodo();
            periodo.setInicial(lastDay.getDate());
            lastDay.copy(date1).addYear(base++).addDay(-1);
            if (date2.lessThen(lastDay)) {
                periodo.setFinal(date2.getDate());
                if (includeRest) {
                    list.add(periodo);
                }
            } else {
                periodo.setFinal(lastDay.getDate());
                list.add(periodo);
            }
            lastDay.addDay(1);
        }
        return list;
    }

    public String format(String pattern) {
        SimpleDateFormat frm = new SimpleDateFormat(pattern);
        return frm.format(this.getDate());
    }

    public int getWeekOfDay() {
        return this.calendar.get(7);
    }

    public boolean isSunday() {
        return this.getWeekOfDay() == 1;
    }

    public boolean isMonday() {
        return this.getWeekOfDay() == 2;
    }

    public boolean isHoliday() {
        if (this.getFeriado() == null) {
            return false;
        }
        return this.getFeriado().buscarFeriado(this.getDate());
    }

    public boolean isFederalHolidays() {
        if (this.getFeriado() == null) {
            return false;
        }
        return this.getFeriado().buscarFeriadoFederal(this.getDate());
    }

    public boolean isSaturday() {
        return this.getWeekOfDay() == 7;
    }

    public boolean isWorkDayWithSaturdays() {
        return new WorkDaysFilter(LogicoFuzzy.VERDADEIRO).match(HelperDate.getInstance(this.getDate()));
    }

    public boolean isWorkDayWithoutSaturdays() {
        return new WorkDaysFilter(LogicoFuzzy.FALSO).match(HelperDate.getInstance(this.getDate()));
    }

    public boolean isWorkDayWithoutSaturdaysOrFederalHolidays() {
        return new WorkDaysWithoutFederalHolidaysFilter(LogicoFuzzy.FALSO).match(HelperDate.getInstance(this.getDate()));
    }

    public int totalWorkDays(HelperDate end, LogicoFuzzy<?> logicoFuzzy) {
        return this.totalDays(end, new WorkDaysFilter(logicoFuzzy));
    }

    public int totalHolidays(HelperDate end) {
        return this.totalDays(end, new HolidaysFilter());
    }

    public int totalWeekendOrHolidays(HelperDate end, LogicoFuzzy<?> logicoFuzzy) {
        return this.totalDays(end, new WeekendOrHolidaysFilter(logicoFuzzy));
    }

    public int totalWorkDaysWithoutFederalHolidaysFilter(HelperDate end, LogicoFuzzy<?> logicoFuzzy) {
        return this.totalDays(end, new WorkDaysWithoutFederalHolidaysFilter(logicoFuzzy));
    }

    public int totalNotWorkDays(HelperDate end, LogicoFuzzy<?> logicoFuzzy) {
        return this.totalDays(end, new NotWorkDaysFilter(logicoFuzzy));
    }

    public int totalDays(HelperDate end, HelperDateFilter filter) {
        int total = 0;
        HelperDate date = HelperDate.getInstance(this.getDate());
        do {
            if (filter.match(date)) {
                ++total;
            }
            date.addDay(1);
        } while (!end.lessThen(date));
        return total;
    }

    public static Date resetHour(Date date) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(date);
        calendar.set(11, 0);
        calendar.set(12, 0);
        calendar.set(13, 0);
        calendar.set(14, 0);
        return calendar.getTime();
    }

    public static boolean dateEquals(Date dateCompared, Date dateBase) {
        return (dateCompared = HelperDate.resetHour(dateCompared)).compareTo(dateBase = HelperDate.resetHour(dateBase)) == 0;
    }

    public static boolean dateBeforeOrEquals(Date dateCompared, Date dateBase) {
        return (dateCompared = HelperDate.resetHour(dateCompared)).before(dateBase = HelperDate.resetHour(dateBase)) || HelperDate.dateEquals(dateCompared, dateBase);
    }

    public static boolean dateBefore(Date dateCompared, Date dateBase) {
        dateCompared = HelperDate.resetHour(dateCompared);
        dateBase = HelperDate.resetHour(dateBase);
        return dateCompared.before(dateBase);
    }

    public static boolean dateAfter(Date dateCompared, Date dateBase) {
        dateCompared = HelperDate.resetHour(dateCompared);
        dateBase = HelperDate.resetHour(dateBase);
        return dateCompared.after(dateBase);
    }

    public static boolean dateAfterOrEquals(Date dateCompared, Date dateBase) {
        return (dateCompared = HelperDate.resetHour(dateCompared)).after(dateBase = HelperDate.resetHour(dateBase)) || HelperDate.dateEquals(dateCompared, dateBase);
    }

    public static HelperDate getCurrentCompetence(Date currentDate) {
        Calendar calendario = Calendar.getInstance();
        calendario.setTime(currentDate);
        calendario.set(5, 1);
        return HelperDate.getInstance(HelperDate.resetHour(calendario.getTime()));
    }

    public static List<HelperDate> getCompetenceListForPeriod(Date startDate, Date endDate) {
        HelperDate start = HelperDate.getCurrentCompetence(startDate);
        ArrayList<HelperDate> list = new ArrayList<HelperDate>();
        do {
            list.add(start);
            start = HelperDate.getCurrentCompetence(start.getDate());
            start.addMonth(1);
        } while (HelperDate.dateBeforeOrEquals(start.getDate(), endDate));
        return list;
    }

    public boolean compareMonthAndYear(Date dateToCompare) {
        HelperDate otherDate = HelperDate.getCurrentCompetence(dateToCompare);
        return this.getMonth() == otherDate.getMonth() && this.getYear() == otherDate.getYear();
    }

    public boolean compareDate(Date date) {
        if (date == null) {
            return false;
        }
        HelperDate otherDate = HelperDate.getInstance(date);
        return this.getDay() == otherDate.getDay() && this.getMonth() == otherDate.getMonth() && this.getYear() == otherDate.getYear();
    }

    public boolean compareYear(Date dateToCompare) {
        HelperDate otherDate = HelperDate.getCurrentCompetence(dateToCompare);
        return this.getYear() == otherDate.getYear();
    }

    public boolean belongsToLastTwelveMonths(Date referenceDate) {
        HelperDate reference = HelperDate.getCurrentCompetence(referenceDate);
        boolean belongs = false;
        for (int count = 0; count < 12; ++count) {
            reference.addMonth(-1);
            if (this.getYear() != reference.getYear() || this.getMonth() != reference.getMonth()) continue;
            belongs = true;
        }
        return belongs;
    }

    public boolean between(Date date1, Date date2) {
        return this.between(HelperDate.getInstance(date1), HelperDate.getInstance(date2));
    }

    public boolean between(HelperDate date1, HelperDate date2) {
        return this.lessThanOrEqualsTo(date2) && date1.lessThanOrEqualsTo(this);
    }

    public boolean isBetweenEndExclusive(Date date1, Date date2) {
        return this.isBetweenEndExclusive(HelperDate.getInstance(date1), HelperDate.getInstance(date2));
    }

    public boolean isBetweenEndExclusive(HelperDate date1, HelperDate date2) {
        return this.lessThen(date2) && date1.lessThanOrEqualsTo(this);
    }

    public static List<Periodo> breakInMonths(Date startDate, Date endDate, Integer monthSelected) {
        List<Periodo> months = HelperDate.breakInMonths(startDate, endDate);
        ArrayList<Periodo> monthsSelected = new ArrayList<Periodo>();
        for (Periodo month : months) {
            if (month.obterDataInicialHelper().getMonth() != monthSelected.intValue()) continue;
            monthsSelected.add(month);
        }
        return monthsSelected;
    }

    public String getTipoDeDia(boolean considerarFeriado) {
        String tipo;
        if (considerarFeriado && this.isHoliday()) {
            tipo = "Feriado";
        } else {
            switch (this.getWeekOfDay()) {
                case 7: {
                    tipo = "S\u00e1bado";
                    break;
                }
                case 1: {
                    tipo = "Domingo";
                    break;
                }
                case 2: {
                    tipo = "Segunda";
                    break;
                }
                case 3: {
                    tipo = "Ter\u00e7a";
                    break;
                }
                case 4: {
                    tipo = "Quarta";
                    break;
                }
                case 5: {
                    tipo = "Quinta";
                    break;
                }
                case 6: {
                    tipo = "Sexta";
                    break;
                }
                default: {
                    tipo = "";
                }
            }
        }
        return tipo;
    }

    public static boolean compareMonthAndYear(Date date1, Date date2) {
        if (Utils.nulo(date1) || Utils.nulo(date2)) {
            return false;
        }
        return HelperDate.getInstance(date1).compareMonthAndYear(date2);
    }

    public Feriado getFeriado() {
        try {
            return (Feriado)Component.getInstance((String)"repositorioDeFeriado");
        }
        catch (IllegalStateException e) {
            LOGGER.error((Object)e.getMessage(), (Throwable)e, new Object[0]);
            return null;
        }
    }

    public static XMLGregorianCalendar converterParaXMLGregorianCalendar(Date date) throws DatatypeConfigurationException {
        GregorianCalendar gCalendar = new GregorianCalendar();
        gCalendar.setTime(date);
        return DatatypeFactory.newInstance().newXMLGregorianCalendar(gCalendar);
    }

    public static String formatarCompetencia(HelperDate date) {
        return HelperDate.formatarCompetencia(date.getDate());
    }

    public static String formatarCompetencia(Date date) {
        return new SimpleDateFormat(FORMATO_COMPETENCIA).format(date);
    }

    public static long obterQuantidadeDiasNoMes(HelperDate date) {
        date.setDay(1);
        HelperDate dataFim = HelperDate.getInstance(date.getDate());
        if (dataFim != null) {
            dataFim = dataFim.lastDayOfTheMonth();
            return HelperDate.obterQuantidadeDiasNoPeriodo(date, dataFim);
        }
        return 0L;
    }

    public static long obterQuantidadeDiasNoPeriodo(HelperDate inicio, HelperDate fim) {
        return 1L + HelperDate.countDays(inicio.getDate(), fim.getDate());
    }

    public static long obterQuantidadeDiasUteisNoMes(HelperDate date) {
        date.setDay(1);
        HelperDate dataFim = HelperDate.getInstance(date.getDate());
        if (dataFim != null) {
            dataFim = dataFim.lastDayOfTheMonth();
            return HelperDate.obterQuantidadeDiasUteisNoPeriodo(date, dataFim);
        }
        return 0L;
    }

    public static long obterQuantidadeDiasUteisNoPeriodo(HelperDate inicio, HelperDate fim) {
        return inicio.totalWorkDaysWithoutFederalHolidaysFilter(fim, LogicoFuzzy.FALSO);
    }

    public String toString() {
        if (Utils.nulo(this.calendar)) {
            return "";
        }
        return this.calendar.getTime().toString();
    }

    class HolidaysFilter
    implements HelperDateFilter {
        @Override
        public boolean match(HelperDate date) {
            return date.isHoliday();
        }
    }

    class WeekendOrHolidaysFilter
    implements HelperDateFilter {
        private LogicoFuzzy<?> logicoFuzzy;

        public WeekendOrHolidaysFilter(LogicoFuzzy<?> includeSaturday) {
            this.logicoFuzzy = includeSaturday;
        }

        @Override
        public boolean match(HelperDate date) {
            return !this.logicoFuzzy.isValido(date) && date.isSaturday() || date.isSunday() || date.isHoliday();
        }
    }

    class NotWorkDaysFilter
    implements HelperDateFilter {
        private LogicoFuzzy<?> logicoFuzzy;

        public NotWorkDaysFilter(LogicoFuzzy<?> includeSaturday) {
            this.logicoFuzzy = includeSaturday;
        }

        @Override
        public boolean match(HelperDate date) {
            return !this.logicoFuzzy.isValido(date) && date.isSaturday() || date.isSunday();
        }
    }

    class WorkDaysWithoutFederalHolidaysFilter
    implements HelperDateFilter {
        private LogicoFuzzy<?> logicoFuzzy;

        public WorkDaysWithoutFederalHolidaysFilter(LogicoFuzzy<?> logicoFuzzy) {
            this.logicoFuzzy = logicoFuzzy;
        }

        @Override
        public boolean match(HelperDate date) {
            return (this.logicoFuzzy.isValido(date) || !date.isSaturday()) && !date.isSunday() && !date.isFederalHolidays();
        }
    }

    class WorkDaysFilter
    implements HelperDateFilter {
        private LogicoFuzzy<?> logicoFuzzy;

        public WorkDaysFilter(LogicoFuzzy<?> logicoFuzzy) {
            this.logicoFuzzy = logicoFuzzy;
        }

        @Override
        public boolean match(HelperDate date) {
            return (this.logicoFuzzy.isValido(date) || !date.isSaturday()) && !date.isSunday() && !date.isHoliday();
        }
    }
}

