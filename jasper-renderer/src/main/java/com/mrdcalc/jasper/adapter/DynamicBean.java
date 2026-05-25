package com.mrdcalc.jasper.adapter;

import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

import java.math.BigDecimal;
import java.util.*;

/**
 * Wraps a Map to provide JavaBean-like property access for JasperReports.
 * Lists of objects are auto-wrapped as JRBeanCollectionDataSource so they
 * can be passed directly to subreport dataSourceExpressions.
 */
public class DynamicBean extends HashMap<String, Object> {

    public DynamicBean() {
        super();
    }

    @SuppressWarnings("unchecked")
    public DynamicBean(Map<String, ?> source) {
        super();
        if (source == null) return;
        for (Map.Entry<String, ?> entry : source.entrySet()) {
            Object val = entry.getValue();
            if (val instanceof Map) {
                put(entry.getKey(), wrapMap((Map<String, Object>) val));
            } else if (val instanceof List) {
                put(entry.getKey(), wrapList((List<?>) val));
            } else if (val instanceof Number && isMonetaryKey(entry.getKey())) {
                put(entry.getKey(), toBigDecimal(val));
            } else {
                put(entry.getKey(), val);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Object wrapMap(Map<String, Object> map) {
        if (map.containsKey("inicial") || map.containsKey("fim") ||
            map.containsKey("dataInicial") || map.containsKey("dataFinal")) {
            return toPeriodo(map);
        }
        return new DynamicBean(map);
    }

    @SuppressWarnings("unchecked")
    private Object wrapList(List<?> list) {
        if (list.isEmpty()) {
            return new JRBeanCollectionDataSource(Collections.emptyList());
        }
        Object first = list.get(0);
        if (first instanceof Map) {
            List<DynamicBean> beans = new ArrayList<>(list.size());
            for (Object item : list) {
                if (item instanceof Map) {
                    beans.add(new DynamicBean((Map<String, Object>) item));
                }
            }
            return new JRBeanCollectionDataSource(beans);
        }
        return list;
    }

    private Periodo toPeriodo(Map<String, Object> map) {
        String ini = coerceString(map.getOrDefault("inicial",
                map.get("dataInicial")));
        String fim = coerceString(map.getOrDefault("fim",
                map.getOrDefault("dataFinal", map.get("final"))));
        Periodo p = new Periodo(ini, fim);
        if (map.containsKey("labelDataIncial"))
            p.setLabelDataIncial(String.valueOf(map.get("labelDataIncial")));
        if (map.containsKey("labelDataFinal"))
            p.setLabelDataFinal(String.valueOf(map.get("labelDataFinal")));
        return p;
    }

    public BigDecimal getBigDecimal(String key) {
        Object val = get(key);
        return toBigDecimal(val);
    }

    public Periodo getPeriodo(String key) {
        Object val = get(key);
        if (val instanceof Periodo) return (Periodo) val;
        if (val instanceof Map) return toPeriodo((Map<String, Object>) val);
        if (val instanceof String) return new Periodo((String) val, (String) val);
        return new Periodo();
    }

    private static BigDecimal toBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal) return (BigDecimal) val;
        if (val instanceof Number) return BigDecimal.valueOf(((Number) val).doubleValue());
        try { return new BigDecimal(val.toString()); }
        catch (Exception e) { return BigDecimal.ZERO; }
    }

    private static boolean isMonetaryKey(String key) {
        String lower = key.toLowerCase();
        return lower.contains("valor") || lower.contains("total") ||
               lower.contains("base") || lower.contains("devido") ||
               lower.contains("pago") || lower.contains("diferenca") ||
               lower.contains("corrigido") || lower.contains("juros") ||
               lower.contains("aliquota") || lower.contains("indice") ||
               lower.contains("divisor") || lower.contains("multiplicador");
    }

    private String coerceString(Object val) {
        return val != null ? val.toString() : null;
    }
}
