package com.mrdcalc.jasper.adapter;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Date;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Periodo {

    private Date inicial;
    private Date fim;
    private String labelDataIncial = "Data Inicial";
    private String labelDataFinal = "Data Final";

    public Periodo() {}

    public Periodo(Date inicial, Date fim) {
        this.inicial = inicial;
        this.fim = fim;
    }

    public Periodo(String inicialStr, String fimStr) {
        this.inicial = parseDate(inicialStr);
        this.fim = parseDate(fimStr);
    }

    public Date getInicial() { return inicial; }
    public void setInicial(Date inicial) { this.inicial = inicial; }
    public Date getFinal() { return fim; }
    public void setFinal(Date fim) { this.fim = fim; }
    public Date getFim() { return fim; }
    public void setFim(Date fim) { this.fim = fim; }
    public String getLabelDataIncial() { return labelDataIncial; }
    public void setLabelDataIncial(String v) { this.labelDataIncial = v; }
    public String getLabelDataFinal() { return labelDataFinal; }
    public void setLabelDataFinal(String v) { this.labelDataFinal = v; }

    public String formatInicial(String formato) {
        return formatDate(inicial, formato);
    }

    public String formatFinal(String formato) {
        return formatDate(fim, formato);
    }

    public boolean isCompleto() {
        return inicial != null && fim != null;
    }

    @Override
    public String toString() {
        String i = inicial != null ? formatDate(inicial, "dd/MM/yyyy") : "?";
        String f = fim != null ? formatDate(fim, "dd/MM/yyyy") : "?";
        return i + " a " + f;
    }

    private static String formatDate(Date date, String formato) {
        if (date == null) return "";
        try {
            String javaFormat = formato
                    .replace("dd", "dd")
                    .replace("MM", "MM")
                    .replace("yyyy", "yyyy")
                    .replace("yy", "yy");
            return new SimpleDateFormat(javaFormat).format(date);
        } catch (Exception e) {
            return date.toString();
        }
    }

    private static Date parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            if (s.contains("T") || s.length() > 10) {
                return Date.from(java.time.Instant.parse(s));
            }
            if (s.contains("/")) {
                String[] parts = s.split("/");
                if (parts.length == 3) {
                    if (parts[0].length() == 4) {
                        return new SimpleDateFormat("yyyy/MM/dd").parse(s);
                    } else {
                        return new SimpleDateFormat("dd/MM/yyyy").parse(s);
                    }
                }
            }
            if (s.contains("-")) {
                LocalDate ld = LocalDate.parse(s);
                return Date.from(ld.atStartOfDay(ZoneId.systemDefault()).toInstant());
            }
            return new SimpleDateFormat("dd/MM/yyyy").parse(s);
        } catch (Exception e) {
            return null;
        }
    }
}
