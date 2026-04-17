/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class LegendaDaFormulaDoIrpf
implements Serializable {
    public static final int INDICE_ANOS_ANTERIORES = 1;
    public static final int INDICE_SEPARADO = 2;
    public static final int INDICE_EXCLUSIVA = 3;
    public static final int INDICE_NORMAL = 4;
    private static final long serialVersionUID = -7779898373287857594L;
    private Irpf irpf;
    private List<String> basesAnosAnteriores;
    private List<String> basesExclusiva;
    private List<String> basesSeparado;
    private List<String> basesNormal;

    public LegendaDaFormulaDoIrpf(Irpf irpf) {
        this.irpf = irpf;
        this.basesAnosAnteriores = new ArrayList<String>();
        this.basesExclusiva = new ArrayList<String>();
        this.basesSeparado = new ArrayList<String>();
        this.basesNormal = new ArrayList<String>();
        this.iniciar();
    }

    private void iniciar() {
        HelperDate dataLimiteAnosAnteriores = HelperDate.getInstance(this.irpf.getCalculo().getDataDeLiquidacao());
        dataLimiteAnosAnteriores.setMonth(0);
        dataLimiteAnosAnteriores.setDay(1);
        for (VerbaDeCalculo verba : this.irpf.getCalculo().getVerbas()) {
            if (!verba.getAtivo().booleanValue() || !verba.getIncidenciaIRPF().booleanValue()) continue;
            for (OcorrenciaDeVerba ocorrenciaVerbas : verba.getOcorrenciasAtivas()) {
                if (this.identificarTipoBaseCorreta(dataLimiteAnosAnteriores, verba, ocorrenciaVerbas)) break;
            }
        }
    }

    private boolean identificarTipoBaseCorreta(HelperDate dataLimiteAnosAnteriores, VerbaDeCalculo verba, OcorrenciaDeVerba ocorrenciaVerbas) {
        boolean identificou = false;
        BigDecimal valorOcorrenciaCorrigida = Utils.arredondarValorMonetario(ocorrenciaVerbas.getDiferencaCorrigida());
        if (!this.basesAnosAnteriores.contains(verba.getNome()) && HelperDate.dateBefore(ocorrenciaVerbas.getDataInicial(), dataLimiteAnosAnteriores.getDate())) {
            BigDecimal base;
            if (BigDecimal.ZERO.compareTo(valorOcorrenciaCorrigida) != 0 && Utils.naoNulo(base = ocorrenciaVerbas.getDiferencaCorrigidaParaCalculoDasIncidencias())) {
                this.basesAnosAnteriores.add(verba.getNome());
            }
        } else {
            switch (verba.getCaracteristica()) {
                case DECIMO_TERCEIRO_SALARIO: {
                    this.tratarCasoDecimoTerceiro(verba.getNome());
                    break;
                }
                case FERIAS: {
                    this.tratarCasoFerias(verba.getNome());
                    break;
                }
                case AVISO_PREVIO: 
                case COMUM: {
                    this.basesNormal.add(verba.getNome());
                }
            }
            identificou = true;
        }
        return identificou;
    }

    private void tratarCasoDecimoTerceiro(String nomeDaVerba) {
        if (this.irpf.getConsiderarTributacaoExclusiva().booleanValue()) {
            this.basesExclusiva.add(nomeDaVerba);
        } else {
            this.basesNormal.add(nomeDaVerba);
        }
    }

    private void tratarCasoFerias(String nomeDaVerba) {
        if (this.irpf.getConsiderarTributacaoEmSeparado().booleanValue()) {
            this.basesSeparado.add(nomeDaVerba);
        } else {
            this.basesNormal.add(nomeDaVerba);
        }
    }

    public List<String> getBasesAnosAnteriores() {
        return this.basesAnosAnteriores;
    }

    public List<String> getBasesSeparado() {
        return this.basesSeparado;
    }

    public List<String> getBasesExclusiva() {
        return this.basesExclusiva;
    }

    public List<String> getBasesNormal() {
        return this.basesNormal;
    }

    public String getLegenda(int tipo) {
        List<String> bases;
        StringBuilder str = new StringBuilder();
        switch (tipo) {
            case 1: {
                bases = this.basesAnosAnteriores;
                break;
            }
            case 2: {
                bases = this.basesSeparado;
                break;
            }
            case 3: {
                bases = this.basesExclusiva;
                break;
            }
            default: {
                bases = this.basesNormal;
            }
        }
        if (!bases.isEmpty()) {
            for (String nomeDaVerba : bases) {
                if (bases.indexOf(nomeDaVerba) == 0) {
                    str.append(nomeDaVerba);
                    continue;
                }
                str.append(" + ").append(nomeDaVerba);
            }
        }
        return str.toString();
    }
}

