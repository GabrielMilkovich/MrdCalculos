package com.mrdcalc.jasper.adapter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.sf.jasperreports.engine.JRDataSource;
import net.sf.jasperreports.engine.JREmptyDataSource;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

public class DataMapper {

    private static final Logger log = LoggerFactory.getLogger(DataMapper.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @SuppressWarnings("unchecked")
    public static MappedData map(String templateName, Map<String, Object> params, String jsonData)
            throws Exception {

        Map<String, Object> resolvedParams = new HashMap<>();
        if (params != null) {
            for (Map.Entry<String, Object> entry : params.entrySet()) {
                resolvedParams.put(entry.getKey(), wrapValue(entry.getValue()));
            }
        }

        JRDataSource dataSource;
        DynamicBean dataBean = null;

        if (jsonData != null && !jsonData.isBlank()) {
            Object parsed = objectMapper.readValue(jsonData, Object.class);

            if (parsed instanceof List) {
                List<Map<String, Object>> rows = objectMapper.readValue(jsonData,
                        new TypeReference<List<Map<String, Object>>>() {});
                List<DynamicBean> beans = rows.stream()
                        .map(DynamicBean::new)
                        .collect(Collectors.toList());
                dataSource = new JRBeanCollectionDataSource(beans);
            } else if (parsed instanceof Map) {
                dataBean = new DynamicBean((Map<String, Object>) parsed);

                if (dataBean.containsKey("_rows") && dataBean.get("_rows") instanceof List) {
                    List<?> rawRows = (List<?>) dataBean.remove("_rows");
                    List<DynamicBean> beans = new ArrayList<>();
                    for (Object r : rawRows) {
                        if (r instanceof Map) beans.add(new DynamicBean((Map<String, Object>) r));
                    }
                    dataSource = new JRBeanCollectionDataSource(beans);
                    resolvedParams.putAll(dataBean);
                } else {
                    dataSource = new JRBeanCollectionDataSource(List.of(dataBean));
                }
            } else {
                dataSource = new JREmptyDataSource();
            }
        } else {
            dataSource = new JREmptyDataSource();
        }

        if (dataBean != null) {
            injectTopLevelAdapters(templateName, resolvedParams, dataBean);
        }

        ensurePeriodos(resolvedParams);

        return new MappedData(resolvedParams, dataSource);
    }

    @SuppressWarnings("unchecked")
    private static void injectTopLevelAdapters(String templateName,
                                                Map<String, Object> params,
                                                DynamicBean dataBean) {
        if (templateName.contains("consolidado") || templateName.equals("calculo/calculo")) {
            if (!params.containsKey("consolidado") && !params.containsKey("calculo")) {
                String key = templateName.contains("consolidado") ? "consolidado" : "calculo";
                params.put(key, dataBean);
            }
        }

        if (templateName.contains("demonstrativo")) {
            injectIfAbsent(params, "demonstrativo", dataBean);
        }
        if (templateName.contains("fgts")) {
            injectIfAbsent(params, "fgts", dataBean);
        }
        if (templateName.contains("resumo")) {
            injectIfAbsent(params, "resumo", dataBean);
        }
        if (templateName.contains("seguro-desemprego")) {
            injectIfAbsent(params, "seguroDesemprego", dataBean);
        }
        if (templateName.contains("inss")) {
            injectIfAbsent(params, "inss", dataBean);
        }
        if (templateName.contains("honorario")) {
            injectIfAbsent(params, "honorario", dataBean);
        }
        if (templateName.contains("multa")) {
            injectIfAbsent(params, "multa", dataBean);
        }
        if (templateName.contains("custa")) {
            injectIfAbsent(params, "custas", dataBean);
        }
        if (templateName.contains("irpf")) {
            injectIfAbsent(params, "irpf", dataBean);
        }
    }

    private static void injectIfAbsent(Map<String, Object> params, String key, Object value) {
        if (!params.containsKey(key)) {
            params.put(key, value);
        }
    }

    @SuppressWarnings("unchecked")
    private static Object wrapValue(Object val) {
        if (val == null) return null;
        if (val instanceof DynamicBean || val instanceof Periodo) return val;
        if (val instanceof Map) {
            return new DynamicBean((Map<String, Object>) val);
        }
        if (val instanceof List) {
            List<?> list = (List<?>) val;
            if (!list.isEmpty() && list.get(0) instanceof Map) {
                List<DynamicBean> beans = new ArrayList<>();
                for (Object item : list) {
                    if (item instanceof Map) beans.add(new DynamicBean((Map<String, Object>) item));
                }
                return new net.sf.jasperreports.engine.data.JRBeanCollectionDataSource(beans);
            }
            return list;
        }
        return val;
    }

    @SuppressWarnings("unchecked")
    private static void ensurePeriodos(Map<String, Object> params) {
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            Object val = entry.getValue();
            if (val instanceof Map) {
                Map<String, Object> map = (Map<String, Object>) val;
                if (map.containsKey("inicial") || map.containsKey("fim") ||
                    map.containsKey("dataInicial") || map.containsKey("dataFinal")) {
                    if (!(val instanceof Periodo)) {
                        entry.setValue(new DynamicBean(map).getPeriodo("self"));
                    }
                }
            }
        }
    }

    public static class MappedData {
        public final Map<String, Object> params;
        public final JRDataSource dataSource;

        MappedData(Map<String, Object> params, JRDataSource dataSource) {
            this.params = params;
            this.dataSource = dataSource;
        }
    }
}
