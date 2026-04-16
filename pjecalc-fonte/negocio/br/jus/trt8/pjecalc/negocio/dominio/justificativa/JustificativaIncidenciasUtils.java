/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.justificativa;

import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.AliquotasDoEmpregadorPorPeriodo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.util.List;

public class JustificativaIncidenciasUtils {
    private static final int PENULTIMO = 2;

    public static String prepararCriterioAliquotaEmpresa(Inss inss) {
        DecimalFormat df = new DecimalFormat("#,###.####");
        StringBuilder sb = new StringBuilder();
        switch (inss.getTipoAliquotaEmpregador()) {
            case POR_ATIVIDADE_ECONOMICA: {
                sb.append("Al\u00edquota de contribui\u00e7\u00e3o social empresa estabelecida pela atividade econ\u00f4mica: ");
                sb.append(inss.getAtividadeEconomica().getDescricao());
                sb.append('.');
                break;
            }
            case POR_PERIODO: {
                JustificativaIncidenciasUtils.imprimirPeriodos(sb, inss.getAliquotasPorPeriodos());
                break;
            }
            case FIXA: {
                sb.append("Al\u00edquota de contribui\u00e7\u00e3o social empresa fixada em ");
                sb.append(df.format(inss.getAliquotaEmpresaFixa() != null ? inss.getAliquotaEmpresaFixa() : BigDecimal.ZERO));
                sb.append("% durante todo o per\u00edodo.");
            }
        }
        return sb.toString();
    }

    private static void imprimirPeriodos(StringBuilder sb, List<AliquotasDoEmpregadorPorPeriodo> aliquotasPorPeriodos) {
        SimpleDateFormat sdf = new SimpleDateFormat("MM/yyyy");
        DecimalFormat df = new DecimalFormat("#,###.####");
        int total = aliquotasPorPeriodos.size();
        if (total > 0) {
            sb.append("Al\u00edquota de contribui\u00e7\u00e3o social empresa estabelecida por per\u00edodo: ");
        }
        for (AliquotasDoEmpregadorPorPeriodo aliquota : aliquotasPorPeriodos) {
            sb.append("de ");
            sb.append(sdf.format(aliquota.getDataInicioPeriodo()));
            sb.append(" a ");
            sb.append(sdf.format(aliquota.getDataTerminoPeriodo()));
            sb.append(", ");
            sb.append(df.format(aliquota.getAliquotaEmpresa() != null ? aliquota.getAliquotaEmpresa() : BigDecimal.ZERO));
            sb.append('%');
            if (total == 1) {
                sb.append('.');
            } else if (total == 2) {
                sb.append("; e ");
            } else {
                sb.append("; ");
            }
            --total;
        }
    }
}

