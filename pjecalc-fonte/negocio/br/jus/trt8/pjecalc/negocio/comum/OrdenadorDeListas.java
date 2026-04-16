/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.Falta;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.verba.VerbaParaCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class OrdenadorDeListas {
    public static List<VerbaParaCalculo> ordenaVerbasParaCalculo(List<VerbaParaCalculo> verbas) {
        Collections.sort(verbas, new Comparator<VerbaParaCalculo>(){

            @Override
            public int compare(VerbaParaCalculo o1, VerbaParaCalculo o2) {
                return o1.getNome().compareTo(o2.getNome());
            }
        });
        return verbas;
    }

    public static List<Falta> ordenaFaltasPorVersao(List<Falta> faltas) {
        Collections.sort(faltas, new Comparator<Falta>(){

            @Override
            public int compare(Falta o1, Falta o2) {
                return o1.getVersao().compareTo(o2.getVersao());
            }
        });
        return faltas;
    }

    public static List<Ferias> ordenaFeriasPorVersao(List<Ferias> ferias) {
        Collections.sort(ferias, new Comparator<Ferias>(){

            @Override
            public int compare(Ferias o1, Ferias o2) {
                return o1.getVersao().compareTo(o2.getVersao());
            }
        });
        return ferias;
    }

    public static List<HistoricoSalarial> ordenaHistoricosSalariaisPorVersao(List<HistoricoSalarial> historicosSalariais) {
        Collections.sort(historicosSalariais, new Comparator<HistoricoSalarial>(){

            @Override
            public int compare(HistoricoSalarial o1, HistoricoSalarial o2) {
                return o1.getVersao().compareTo(o2.getVersao());
            }
        });
        return historicosSalariais;
    }

    public static List<Honorario> ordenaHonorariosPorVersao(List<Honorario> honorarios) {
        Collections.sort(honorarios, new Comparator<Honorario>(){

            @Override
            public int compare(Honorario o1, Honorario o2) {
                return o1.getVersao().compareTo(o2.getVersao());
            }
        });
        return honorarios;
    }

    public static List<Multa> ordenaMultasPorVersao(List<Multa> multas) {
        Collections.sort(multas, new Comparator<Multa>(){

            @Override
            public int compare(Multa o1, Multa o2) {
                return o1.getVersao().compareTo(o2.getVersao());
            }
        });
        return multas;
    }

    public static List<VerbaDeCalculo> ordenaVerbasDeCalculoPorVersaoENome(List<VerbaDeCalculo> verbas) {
        Collections.sort(verbas, new Comparator<VerbaDeCalculo>(){

            @Override
            public int compare(VerbaDeCalculo o1, VerbaDeCalculo o2) {
                int resultado = o1.getVersao().compareTo(o2.getVersao());
                return resultado == 0 ? o1.getNome().compareTo(o2.getNome()) : resultado;
            }
        });
        return verbas;
    }
}

