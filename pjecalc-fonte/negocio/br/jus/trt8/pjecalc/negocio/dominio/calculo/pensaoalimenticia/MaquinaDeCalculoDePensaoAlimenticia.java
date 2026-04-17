/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCorrecaoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;

public class MaquinaDeCalculoDePensaoAlimenticia
implements Serializable {
    private static final long serialVersionUID = 729150686817738495L;
    private PensaoAlimenticia pensaoAlimenticia;

    public MaquinaDeCalculoDePensaoAlimenticia(PensaoAlimenticia pensaoAlimenticia) {
        this.pensaoAlimenticia = pensaoAlimenticia;
    }

    public void liquidar() {
        Calculo calculo = this.pensaoAlimenticia.getCalculo();
        if (calculo.isCalculoExterno().booleanValue()) {
            this.liquidarParaCalculoExterno(calculo);
            return;
        }
        BigDecimal baseDeVerbas = BigDecimal.ZERO;
        BigDecimal baseDeVerbasTributaveis = BigDecimal.ZERO;
        for (VerbaDeCalculo verba : calculo.getVerbasAtivas()) {
            BigDecimal valorBase = BigDecimal.ZERO;
            if (!verba.getIncidenciaPensaoAlimenticia().booleanValue()) continue;
            valorBase = verba.isCaracteristicaFerias() ? valorBase.add(verba.getValorTotalDiferencaCorrigidaDeFeriasGozadas(), Utils.CONTEXTO_MATEMATICO) : valorBase.add(verba.getValorTotalDiferencaCorrigida(), Utils.CONTEXTO_MATEMATICO);
            if (Boolean.TRUE.equals(this.pensaoAlimenticia.getIncidirSobreJuros()) && verba.isCaracteristicaFerias()) {
                BigDecimal proporcao = BigDecimal.ZERO.compareTo(verba.getValorTotalDiferencaCorrigida()) == 0 ? BigDecimal.ZERO : Utils.dividir(verba.getValorTotalDiferencaCorrigidaDeFeriasGozadas(), verba.getValorTotalDiferencaCorrigida());
                valorBase = valorBase.add(Utils.arredondarValorMonetario(Utils.multiplicar(verba.getValorDeJuros(), proporcao)), Utils.CONTEXTO_MATEMATICO);
            } else if (Boolean.TRUE.equals(this.pensaoAlimenticia.getIncidirSobreJuros())) {
                valorBase = valorBase.add(verba.getValorDeJuros(), Utils.CONTEXTO_MATEMATICO);
            }
            baseDeVerbas = baseDeVerbas.add(valorBase, Utils.CONTEXTO_MATEMATICO);
            if (!verba.getIncidenciaIRPF().booleanValue()) continue;
            baseDeVerbasTributaveis = baseDeVerbasTributaveis.add(valorBase, Utils.CONTEXTO_MATEMATICO);
        }
        this.pensaoAlimenticia.setValorBaseVerbas(baseDeVerbas);
        this.pensaoAlimenticia.setValorBaseVerbasTributaveis(baseDeVerbasTributaveis);
        if (calculo.getFgts().getIncidenciaPensaoAlimenticia().booleanValue()) {
            BigDecimal baseFgts;
            if (Boolean.TRUE.equals(this.pensaoAlimenticia.getIncidirSobreJuros())) {
                baseFgts = calculo.getFgts().getTotalDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
                if (calculo.getFgts().getDeduzirDoFGTS().booleanValue()) {
                    baseFgts = baseFgts.subtract(calculo.getFgts().getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
                }
                this.pensaoAlimenticia.setValorBaseFgts(baseFgts);
            } else {
                baseFgts = calculo.getFgts().getTotalDaDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
                if (calculo.getFgts().getDeduzirDoFGTS().booleanValue()) {
                    baseFgts = baseFgts.subtract(calculo.getFgts().getTotalDoDepositadoOuSacadoCorrigido(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
                }
                this.pensaoAlimenticia.setValorBaseFgts(baseFgts);
            }
        } else {
            this.pensaoAlimenticia.setValorBaseFgts(BigDecimal.ZERO);
        }
        if (calculo.getFgts().getIncidenciaPensaoAlimenticiaSobreMulta().booleanValue()) {
            if (Boolean.TRUE.equals(this.pensaoAlimenticia.getIncidirSobreJuros())) {
                this.pensaoAlimenticia.setValorBaseMultaDoFgts(calculo.getFgts().getTotalDaMultaDoFgts());
            } else {
                this.pensaoAlimenticia.setValorBaseMultaDoFgts(calculo.getFgts().getValorDaMultaDoFgtsCorrigido());
            }
        } else {
            this.pensaoAlimenticia.setValorBaseMultaDoFgts(BigDecimal.ZERO);
        }
    }

    private void liquidarParaCalculoExterno(Calculo calculo) {
        ParcelasAtualizaveisCreditosReclamante parcelasCreditos = ParcelasAtualizaveisCreditosReclamante.obterDoCalculo(calculo);
        BigDecimal baseVerba = BigDecimal.ZERO;
        BigDecimal baseDeVerbasTributaveis = BigDecimal.ZERO;
        BigDecimal auxiliar = BigDecimal.ZERO;
        if (this.pensaoAlimenticia.getIncidirSobrePrincipalNaoTributavel().booleanValue() && Utils.naoNulos(this.pensaoAlimenticia.getPercPrincipalNaoTributavel(), parcelasCreditos.getValorParcelaVerbasNaoTributavel())) {
            baseVerba = Utils.somar(baseVerba, Utils.aplicarTaxa(this.pensaoAlimenticia.getPercPrincipalNaoTributavel(), parcelasCreditos.getValorParcelaVerbasNaoTributavel()), baseVerba);
        }
        if (this.pensaoAlimenticia.getIncidirSobrePrincipalTributavel().booleanValue() && Utils.naoNulos(this.pensaoAlimenticia.getPercPrincipalTributavel(), parcelasCreditos.getValorParcelaVerbasTributavel())) {
            auxiliar = Utils.aplicarTaxa(this.pensaoAlimenticia.getPercPrincipalTributavel(), parcelasCreditos.getValorParcelaVerbasTributavel());
            baseVerba = Utils.somar(baseVerba, auxiliar, baseVerba);
            baseDeVerbasTributaveis = Utils.somar(baseDeVerbasTributaveis, auxiliar, baseDeVerbasTributaveis);
        }
        if (this.pensaoAlimenticia.getIncidirSobreJuros().booleanValue() && this.pensaoAlimenticia.getIncidirSobrePrincipalNaoTributavel().booleanValue() && Utils.naoNulos(this.pensaoAlimenticia.getPercPrincipalNaoTributavel(), parcelasCreditos.getValorJurosVerbasNaoTributavel())) {
            baseVerba = Utils.somar(baseVerba, Utils.aplicarTaxa(this.pensaoAlimenticia.getPercPrincipalNaoTributavel(), parcelasCreditos.getValorJurosVerbasNaoTributavel()), baseVerba);
        }
        if (this.pensaoAlimenticia.getIncidirSobreJuros().booleanValue() && this.pensaoAlimenticia.getIncidirSobrePrincipalTributavel().booleanValue() && Utils.naoNulos(this.pensaoAlimenticia.getPercPrincipalTributavel(), parcelasCreditos.getValorJurosVerbasTributavel())) {
            auxiliar = Utils.aplicarTaxa(this.pensaoAlimenticia.getPercPrincipalTributavel(), parcelasCreditos.getValorJurosVerbasTributavel());
            baseVerba = Utils.somar(baseVerba, auxiliar, baseVerba);
            baseDeVerbasTributaveis = Utils.somar(baseDeVerbasTributaveis, auxiliar, baseDeVerbasTributaveis);
        }
        this.pensaoAlimenticia.setValorBaseVerbas(baseVerba);
        this.pensaoAlimenticia.setValorBaseVerbasTributaveis(baseDeVerbasTributaveis);
        if (calculo.getFgts().getIncidenciaPensaoAlimenticia().booleanValue()) {
            BigDecimal baseFgts = calculo.getFgts().getTotalDaDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
            if (Boolean.TRUE.equals(this.pensaoAlimenticia.getIncidirSobreJuros())) {
                baseFgts = Utils.somar(baseFgts, parcelasCreditos.getValorJurosFgts(), baseFgts);
            }
            this.pensaoAlimenticia.setValorBaseFgts(baseFgts);
        } else {
            this.pensaoAlimenticia.setValorBaseFgts(BigDecimal.ZERO);
        }
        if (calculo.getFgts().getIncidenciaPensaoAlimenticiaSobreMulta().booleanValue()) {
            BigDecimal baseMultaFgts = calculo.getFgts().getValorDaMultaDoFgtsCorrigido();
            if (Boolean.TRUE.equals(this.pensaoAlimenticia.getIncidirSobreJuros())) {
                baseMultaFgts = Utils.somar(baseMultaFgts, parcelasCreditos.getValorJurosMultaFgts(), baseMultaFgts);
            }
            this.pensaoAlimenticia.setValorBaseMultaDoFgts(baseMultaFgts);
        } else {
            this.pensaoAlimenticia.setValorBaseMultaDoFgts(BigDecimal.ZERO);
        }
    }

    public PensaoAlimenticia getPensaoAlimenticia() {
        return this.pensaoAlimenticia;
    }

    public void setPensaoAlimenticia(PensaoAlimenticia pensaoAlimenticia) {
        this.pensaoAlimenticia = pensaoAlimenticia;
    }
}

