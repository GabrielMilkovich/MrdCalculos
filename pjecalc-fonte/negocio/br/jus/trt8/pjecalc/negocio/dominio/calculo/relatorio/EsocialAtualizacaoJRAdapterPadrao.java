/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoOcorrenciaIrpfEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpfAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.EsocialAtualizacaoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

public class EsocialAtualizacaoJRAdapterPadrao
extends EsocialAtualizacaoJRAdapter {
    private static final int DUAS_OCORRENCIAS_IRPF = 2;
    public static final BigDecimal CEM = new BigDecimal("100");
    private InssSobreSalariosDevidos devidos;
    private InssSobreSalariosPagos pagos;
    private Calculo calculo;
    private List<OptimizerListSearch<Competencia, OcorrenciaDeVerba>> ocorrenciasDaVerba;

    public EsocialAtualizacaoJRAdapterPadrao() {
    }

    public EsocialAtualizacaoJRAdapterPadrao(Calculo calculo) {
        this.devidos = calculo.getInss().getInssSobreSalariosDevidos();
        this.pagos = calculo.getInss().getInssSobreSalariosPagos();
        this.calculo = calculo;
        this.ocorrenciasDaVerba = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>>();
    }

    private Map<Date, OcorrenciaDeInssSobreSalariosDevidos> gerarMapaDevidosCalculo(boolean isSomenteDecimoTerceiro) {
        return this.devidos.getOcorrencias().stream().filter(o -> isSomenteDecimoTerceiro ? o.getOcorrenciaDecimoTerceiro() : o.getOcorrenciaDecimoTerceiro() == false).collect(Collectors.toMap(o -> o.getDataOcorrenciaInss(), Function.identity()));
    }

    private Map<Date, OcorrenciaDeInssSobreSalariosPagos> gerarMapaPagosCalculo(boolean isSomenteDecimoTerceiro) {
        return this.pagos.getOcorrencias().stream().filter(o -> isSomenteDecimoTerceiro ? o.getOcorrenciaDecimoTerceiro() : o.getOcorrenciaDecimoTerceiro() == false).collect(Collectors.toMap(o -> o.getDataOcorrenciaInss(), Function.identity()));
    }

    private List<OcorrenciaEsocialInss> obterOcorrenciasNoEvento(Map<Date, OcorrenciaDeInssSobreSalariosDevidos> mapaDevidos, Map<Date, OcorrenciaDeInssSobreSalariosPagos> mapaPagos, List<Map<Date, OcorrenciaEsocialInss>> ocorrenciasAnteriores, List<Map<Date, OcorrenciaEsocialInss>> ocorrenciasAnterioresParaBase, BigDecimal fatorPagamentoPrincipal, boolean isDecimoTerceiro) {
        ArrayList<OcorrenciaEsocialInss> ocorrenciasNoEvento = new ArrayList<OcorrenciaEsocialInss>();
        for (Map.Entry<Date, OcorrenciaDeInssSobreSalariosDevidos> entry : mapaDevidos.entrySet()) {
            Date dataOcorrencia = entry.getKey();
            OcorrenciaDeInssSobreSalariosDevidos oDevidos = entry.getValue();
            OcorrenciaDeInssSobreSalariosPagos oPagos = mapaPagos.get(dataOcorrencia);
            OcorrenciaEsocialInss ocorrencia = this.gerarOcorrenciaEsocial(dataOcorrencia, oDevidos, oPagos, isDecimoTerceiro);
            for (Map<Date, OcorrenciaEsocialInss> ocorrenciasEmEventoAnterior : ocorrenciasAnteriores) {
                ocorrencia.setContribSegurado(Utils.subtrair(ocorrencia.getContribSegurado(), ocorrenciasEmEventoAnterior.get(ocorrencia.getCompetencia()).getContribSegurado(), ocorrencia.getContribSegurado()));
                ocorrencia.setVrRendIrrf(Utils.subtrair(ocorrencia.getVrRendIrrf(), ocorrenciasEmEventoAnterior.get(ocorrencia.getCompetencia()).getVrRendIrrf(), ocorrencia.getVrRendIrrf()));
            }
            for (Map<Date, OcorrenciaEsocialInss> ocorrenciasEmEventoAnterior : ocorrenciasAnterioresParaBase) {
                ocorrencia.setVrBcCpMensal(Utils.subtrair(ocorrencia.getVrBcCpMensal(), ocorrenciasEmEventoAnterior.get(ocorrencia.getCompetencia()).getVrBcCpMensal(), ocorrencia.getVrBcCpMensal()));
            }
            if (BigDecimal.ZERO.compareTo(fatorPagamentoPrincipal) != 0) {
                ocorrencia.setVrBcCpMensal(Utils.multiplicar(fatorPagamentoPrincipal, ocorrencia.getVrBcCpMensal()));
                ocorrencia.setContribSegurado(Utils.multiplicar(fatorPagamentoPrincipal, ocorrencia.getContribSegurado()));
                ocorrencia.setVrRendIrrf(Utils.multiplicar(fatorPagamentoPrincipal, ocorrencia.getVrRendIrrf()));
            }
            ocorrencia.setContribEmpresa(Utils.aplicarTaxa(ocorrencia.getPercentualContribEmpresa(), ocorrencia.getVrBcCpMensal()));
            ocorrencia.setSat(Utils.aplicarTaxa(ocorrencia.getPercentualSat(), ocorrencia.getVrBcCpMensal()));
            ocorrencia.setContribTerceiros(Utils.aplicarTaxa(ocorrencia.getPercentualContribTerceiros(), ocorrencia.getVrBcCpMensal()));
            if (BigDecimal.ZERO.compareTo(ocorrencia.getVrBcCpMensal()) != 0) {
                ocorrencia.setPercentualContribSegurado(Utils.multiplicar(Utils.dividir(ocorrencia.getContribSegurado(), ocorrencia.getVrBcCpMensal()), CEM));
            }
            ocorrenciasNoEvento.add(ocorrencia);
        }
        return ocorrenciasNoEvento;
    }

    @Override
    public JRBeanCollectionDataSource getEsocialPorEventos() {
        ArrayList<RelatorioS2501PorEventoAdapterPadrao> irpfPorEvento = new ArrayList<RelatorioS2501PorEventoAdapterPadrao>();
        Map<Date, OcorrenciaDeInssSobreSalariosDevidos> mapaDevidosCalculo = this.gerarMapaDevidosCalculo(false);
        Map<Date, OcorrenciaDeInssSobreSalariosDevidos> mapaDevidosCalculoDecimoTerceiro = this.gerarMapaDevidosCalculo(true);
        Map<Date, OcorrenciaDeInssSobreSalariosPagos> mapaPagosCalculo = this.gerarMapaPagosCalculo(false);
        Map<Date, OcorrenciaDeInssSobreSalariosPagos> mapaPagosCalculoDecimoTerceiro = this.gerarMapaPagosCalculo(true);
        ArrayList<OcorrenciaEsocialInss> ocorrenciasNoEvento = null;
        ArrayList<Map<Date, OcorrenciaEsocialInss>> ocorrenciasEventosAnteriores = new ArrayList<Map<Date, OcorrenciaEsocialInss>>();
        ArrayList<Map<Date, OcorrenciaEsocialInss>> ocorrenciasEventosAnterioresDecimoTerceiro = new ArrayList<Map<Date, OcorrenciaEsocialInss>>();
        ArrayList<Map<Date, OcorrenciaEsocialInss>> ocorrenciasEventosAnterioresParaBase = new ArrayList<Map<Date, OcorrenciaEsocialInss>>();
        ArrayList<Map<Date, OcorrenciaEsocialInss>> ocorrenciasEventosAnterioresDecimoTerceiroParaBase = new ArrayList<Map<Date, OcorrenciaEsocialInss>>();
        List<Pagamento> pagamentos = this.ordenarPagamentos();
        for (Pagamento pagamento : pagamentos) {
            CreditosDoReclamante creditoReclamantePagamento = null;
            for (CreditosDoReclamante cr : this.calculo.getAtualizacao().getListaCreditosDoReclamante()) {
                if (!HelperDate.dateEquals(cr.getDataFinalPeriodo(), pagamento.getDataPagamento())) continue;
                creditoReclamantePagamento = cr;
                break;
            }
            BigDecimal fatorPagamentoPrincipal = this.encontrarFatorPagamentoPrincipal(creditoReclamantePagamento);
            BigDecimal somaDevidoDevidos = BigDecimal.ZERO;
            BigDecimal somaDiferencaDevidos = BigDecimal.ZERO;
            for (OcorrenciaDeInssSobreSalariosDevidosAtualizacao o : this.devidos.getOcorrenciasAtualizacao()) {
                if (!HelperDate.dateEquals(o.getDataEvento(), pagamento.getDataPagamento())) continue;
                somaDevidoDevidos = Utils.somar(somaDevidoDevidos, o.getDevido(), somaDevidoDevidos);
                somaDiferencaDevidos = Utils.somar(somaDiferencaDevidos, o.getDevidoDiferenca(), somaDiferencaDevidos);
            }
            BigDecimal somaDevidoPagos = BigDecimal.ZERO;
            BigDecimal somaDiferencaPagos = BigDecimal.ZERO;
            for (OcorrenciaDeInssSobreSalariosPagosAtualizacao o : this.pagos.getOcorrenciasAtualizacao()) {
                if (!HelperDate.dateEquals(o.getDataEvento(), pagamento.getDataPagamento())) continue;
                somaDevidoPagos = Utils.somar(somaDevidoPagos, o.getDevido(), somaDevidoPagos);
                somaDiferencaPagos = Utils.somar(somaDiferencaPagos, o.getDevidoDiferenca(), somaDiferencaPagos);
            }
            ocorrenciasNoEvento = new ArrayList<OcorrenciaEsocialInss>();
            ocorrenciasNoEvento.addAll(this.obterOcorrenciasNoEvento(mapaDevidosCalculo, mapaPagosCalculo, ocorrenciasEventosAnteriores, ocorrenciasEventosAnterioresParaBase, fatorPagamentoPrincipal, false));
            ocorrenciasNoEvento.addAll(this.obterOcorrenciasNoEvento(mapaDevidosCalculoDecimoTerceiro, mapaPagosCalculoDecimoTerceiro, ocorrenciasEventosAnterioresDecimoTerceiro, ocorrenciasEventosAnterioresDecimoTerceiroParaBase, fatorPagamentoPrincipal, true));
            if (ocorrenciasNoEvento.isEmpty()) continue;
            Collections.sort(ocorrenciasNoEvento);
            BigDecimal irAnterior = BigDecimal.ZERO;
            BigDecimal irCorrente = BigDecimal.ZERO;
            int count = 0;
            for (OcorrenciaDeIrpfAtualizacao oIrpf : this.calculo.getIrpf().getOcorrenciasAtualizacao()) {
                if (HelperDate.dateEquals(oIrpf.getDataEvento(), pagamento.getDataPagamento())) {
                    ++count;
                    irAnterior = TipoOcorrenciaIrpfEnum.RRA_ANOS_ANTERIORES.equals((Object)oIrpf.getTipo()) ? oIrpf.getValorDevido() : irAnterior;
                    BigDecimal bigDecimal = irCorrente = !TipoOcorrenciaIrpfEnum.RRA_ANOS_ANTERIORES.equals((Object)oIrpf.getTipo()) ? oIrpf.getValorDevido() : irCorrente;
                }
                if (count != 2) continue;
                break;
            }
            irpfPorEvento.add(new RelatorioS2501PorEventoAdapterPadrao(pagamento.getDataPagamento(), ocorrenciasNoEvento, irAnterior, irCorrente));
            HashMap<Date, OcorrenciaEsocialInss> ocorrenciasNoEventoAnterior = new HashMap<Date, OcorrenciaEsocialInss>();
            HashMap<Date, OcorrenciaEsocialInss> ocorrenciasNoEventoAnteriorDecimoTerceiro = new HashMap<Date, OcorrenciaEsocialInss>();
            for (OcorrenciaEsocialInss oEsocial : ocorrenciasNoEvento) {
                if (oEsocial.isDecimoTerceiro().booleanValue()) {
                    ocorrenciasNoEventoAnteriorDecimoTerceiro.put(oEsocial.getCompetencia(), oEsocial);
                    continue;
                }
                ocorrenciasNoEventoAnterior.put(oEsocial.getCompetencia(), oEsocial);
            }
            ocorrenciasEventosAnteriores.add(ocorrenciasNoEventoAnterior);
            ocorrenciasEventosAnterioresDecimoTerceiro.add(ocorrenciasNoEventoAnteriorDecimoTerceiro);
            if (BigDecimal.ZERO.compareTo(fatorPagamentoPrincipal) == 0) continue;
            ocorrenciasEventosAnterioresParaBase.add(ocorrenciasNoEventoAnterior);
            ocorrenciasEventosAnterioresDecimoTerceiroParaBase.add(ocorrenciasNoEventoAnteriorDecimoTerceiro);
        }
        irpfPorEvento.sort((a, b) -> a.getDataEvento().compareTo(b.getDataEvento()));
        return new JRBeanCollectionDataSource(irpfPorEvento);
    }

    private BigDecimal encontrarFatorPagamentoPrincipal(CreditosDoReclamante creditoReclamantePagamento) {
        BigDecimal fatorPagamentoPrincipal = BigDecimal.ONE;
        if (Utils.naoNulo(creditoReclamantePagamento) && BigDecimal.ZERO.compareTo(creditoReclamantePagamento.getDevidoPrincipal()) < 0) {
            fatorPagamentoPrincipal = Utils.dividir(creditoReclamantePagamento.getPagoPrincipal(), creditoReclamantePagamento.getDevidoPrincipal());
        }
        return BigDecimal.ONE.compareTo(fatorPagamentoPrincipal) < 0 ? BigDecimal.ONE : fatorPagamentoPrincipal;
    }

    private List<Pagamento> ordenarPagamentos() {
        ArrayList<Pagamento> pagamentos = new ArrayList<Pagamento>();
        pagamentos.addAll(this.calculo.getPagamentos());
        Collections.sort(pagamentos, new Comparator<Pagamento>(){

            @Override
            public int compare(Pagamento p1, Pagamento p2) {
                return p1.getDataPagamento().compareTo(p2.getDataPagamento());
            }
        });
        return pagamentos;
    }

    private OcorrenciaEsocialInss gerarOcorrenciaEsocial(Date dataOcorrencia, OcorrenciaDeInssSobreSalariosDevidos oDevidos, OcorrenciaDeInssSobreSalariosPagos oPagos, Boolean isDecimoTerceiro) {
        OcorrenciaEsocialInss ocorrencia = new OcorrenciaEsocialInss();
        ocorrencia.setDecimoTerceiro(isDecimoTerceiro);
        ocorrencia.setCompetencia(dataOcorrencia);
        ocorrencia.setCompetenciaFormatada(new SimpleDateFormat("MM/YYYY").format(dataOcorrencia));
        ocorrencia.setVrBcCpMensal(oDevidos.getValorBaseVerbas());
        ocorrencia.setContribEmpresa(Utils.zerarSeNulo(oDevidos.getValorDevidoEmpresaFinal()));
        ocorrencia.setPercentualContribEmpresa(Utils.zerarSeNulo(oDevidos.getAliquotaEmpresa()));
        ocorrencia.setSat(Utils.zerarSeNulo(oDevidos.getValorDevidoSAT()));
        ocorrencia.setPercentualSat(Utils.zerarSeNulo(oDevidos.getAliquotaSAT()));
        ocorrencia.setContribTerceiros(Utils.zerarSeNulo(oDevidos.getValorDevidoTerceiros()));
        ocorrencia.setPercentualContribTerceiros(Utils.zerarSeNulo(oDevidos.getAliquotaTerceiros()));
        ocorrencia.setContribSegurado(Utils.zerarSeNulo(oDevidos.getValorDevidoSeguradoFinal()));
        ocorrencia.setPercentualContribSegurado(Utils.zerarSeNulo(oDevidos.getAliquotaDoTotalSegurado()));
        ocorrencia.setVrRendIrrf(this.encontrarBaseTributavel(dataOcorrencia, isDecimoTerceiro));
        if (this.calculo.getInss().getApurarInssSobreSalariosPagos().booleanValue() && Utils.naoNulo(oPagos)) {
            ocorrencia.setVrBcCpMensal(Utils.somar(ocorrencia.getVrBcCpMensal(), oPagos.getValorBase(), ocorrencia.getVrBcCpMensal()));
            ocorrencia.setContribEmpresa(Utils.somar(ocorrencia.getContribEmpresa(), oPagos.getValorDevidoEmpresaFinal(), ocorrencia.getContribEmpresa()));
            ocorrencia.setSat(Utils.somar(ocorrencia.getSat(), oPagos.getValorDevidoSAT(), ocorrencia.getSat()));
            ocorrencia.setContribTerceiros(Utils.somar(ocorrencia.getContribTerceiros(), oPagos.getValorDevidoTerceiros(), ocorrencia.getContribTerceiros()));
            ocorrencia.setContribSegurado(Utils.somar(ocorrencia.getContribSegurado(), oPagos.getValorDevidoSeguradoFinal(), ocorrencia.getContribSegurado()));
        }
        return ocorrencia;
    }

    private BigDecimal encontrarBaseTributavel(Date ocorrencia, Boolean isDecimoTerceiro) {
        Competencia competencia = new Competencia();
        if (Utils.nulo(this.ocorrenciasDaVerba) || this.ocorrenciasDaVerba.isEmpty()) {
            ArrayList<VerbaDeCalculo> verbas = new ArrayList<VerbaDeCalculo>();
            for (VerbaDeCalculo verbaDeCalculo : this.calculo.getVerbas()) {
                if (!verbaDeCalculo.getAtivo().booleanValue() || !verbaDeCalculo.getIncidenciaIRPF().booleanValue()) continue;
                verbas.add(verbaDeCalculo);
            }
            for (VerbaDeCalculo verbaDeCalculo : verbas) {
                this.ocorrenciasDaVerba.add(verbaDeCalculo.getOcorrenciasAtivasOptimizerListSearch());
            }
        }
        competencia.update(ocorrencia);
        BigDecimal valorBaseIR = BigDecimal.ZERO;
        for (OptimizerListSearch optimizerListSearch : this.ocorrenciasDaVerba) {
            Iterator ocorrenciasDeVerba = optimizerListSearch.search(competencia);
            while (Utils.naoNulo(ocorrenciasDeVerba) && ocorrenciasDeVerba.hasNext()) {
                BigDecimal base;
                OcorrenciaDeVerba ocorrenciaDeVerba = (OcorrenciaDeVerba)ocorrenciasDeVerba.next();
                if (Utils.nulo(ocorrenciaDeVerba) || Utils.nulo(base = ocorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias()) || isDecimoTerceiro.booleanValue() != CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO.equals((Object)ocorrenciaDeVerba.getCaracteristica())) continue;
                valorBaseIR = Utils.somar(valorBaseIR, Utils.zerarSeNegativo(base), valorBaseIR);
            }
        }
        return valorBaseIR;
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    public class OcorrenciaEsocialInss
    implements Comparable<OcorrenciaEsocialInss> {
        private Boolean decimoTerceiro = Boolean.FALSE;
        private Date competencia;
        private String competenciaFormatada;
        private BigDecimal vrBcCpMensal = BigDecimal.ZERO;
        private BigDecimal percentualContribEmpresa = BigDecimal.ZERO;
        private BigDecimal contribEmpresa = BigDecimal.ZERO;
        private BigDecimal percentualSat = BigDecimal.ZERO;
        private BigDecimal sat = BigDecimal.ZERO;
        private BigDecimal percentualContribTerceiros = BigDecimal.ZERO;
        private BigDecimal contribTerceiros = BigDecimal.ZERO;
        private BigDecimal percentualContribSegurado = BigDecimal.ZERO;
        private BigDecimal contribSegurado = BigDecimal.ZERO;
        private BigDecimal vrRendIrrf = BigDecimal.ZERO;

        public Boolean isDecimoTerceiro() {
            return this.decimoTerceiro;
        }

        public void setDecimoTerceiro(Boolean decimoTerceiro) {
            this.decimoTerceiro = decimoTerceiro;
        }

        public Date getCompetencia() {
            return this.competencia;
        }

        public void setCompetencia(Date competencia) {
            this.competencia = competencia;
        }

        public String getCompetenciaFormatada() {
            return this.competenciaFormatada;
        }

        public void setCompetenciaFormatada(String competenciaFormatada) {
            this.competenciaFormatada = competenciaFormatada;
        }

        public BigDecimal getVrBcCpMensal() {
            return this.vrBcCpMensal;
        }

        public void setVrBcCpMensal(BigDecimal vrBcCpMensal) {
            this.vrBcCpMensal = vrBcCpMensal;
        }

        public BigDecimal getContribEmpresa() {
            return this.contribEmpresa;
        }

        public void setContribEmpresa(BigDecimal contribEmpresa) {
            this.contribEmpresa = contribEmpresa;
        }

        public BigDecimal getSat() {
            return this.sat;
        }

        public void setSat(BigDecimal sat) {
            this.sat = sat;
        }

        public BigDecimal getContribTerceiros() {
            return this.contribTerceiros;
        }

        public void setContribTerceiros(BigDecimal contribTerceiros) {
            this.contribTerceiros = contribTerceiros;
        }

        public BigDecimal getContribSegurado() {
            return this.contribSegurado;
        }

        public void setContribSegurado(BigDecimal contribSegurado) {
            this.contribSegurado = contribSegurado;
        }

        public BigDecimal getVrRendIrrf() {
            return this.vrRendIrrf;
        }

        public void setVrRendIrrf(BigDecimal vrRendIrrf) {
            this.vrRendIrrf = vrRendIrrf;
        }

        public BigDecimal getPercentualContribEmpresa() {
            return this.percentualContribEmpresa;
        }

        public void setPercentualContribEmpresa(BigDecimal percentualContribEmpresa) {
            this.percentualContribEmpresa = percentualContribEmpresa;
        }

        public BigDecimal getPercentualSat() {
            return this.percentualSat;
        }

        public void setPercentualSat(BigDecimal percentualSat) {
            this.percentualSat = percentualSat;
        }

        public BigDecimal getPercentualContribTerceiros() {
            return this.percentualContribTerceiros;
        }

        public void setPercentualContribTerceiros(BigDecimal percentualContribTerceiros) {
            this.percentualContribTerceiros = percentualContribTerceiros;
        }

        public BigDecimal getPercentualContribSegurado() {
            return this.percentualContribSegurado;
        }

        public void setPercentualContribSegurado(BigDecimal percentualContribSegurado) {
            this.percentualContribSegurado = percentualContribSegurado;
        }

        @Override
        public int compareTo(OcorrenciaEsocialInss o) {
            return this.getCompetencia().compareTo(o.getCompetencia());
        }

        public int hashCode() {
            int prime = 31;
            int result = 1;
            result = 31 * result + this.getEnclosingInstance().hashCode();
            result = 31 * result + Objects.hash(this.competencia);
            return result;
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
            OcorrenciaEsocialInss other = (OcorrenciaEsocialInss)obj;
            if (!this.getEnclosingInstance().equals(other.getEnclosingInstance())) {
                return false;
            }
            return Objects.equals(this.competencia, other.competencia);
        }

        private EsocialAtualizacaoJRAdapterPadrao getEnclosingInstance() {
            return EsocialAtualizacaoJRAdapterPadrao.this;
        }
    }

    public class RelatorioS2501PorEventoAdapterPadrao
    extends EsocialAtualizacaoJRAdapter.RelatorioS2501PorEventoAdapter {
        private Date dataEvento;
        private List<? extends OcorrenciaEsocialInss> ocorrencias;
        private BigDecimal irCorrente = BigDecimal.ZERO;
        private BigDecimal irAnterior = BigDecimal.ZERO;

        public RelatorioS2501PorEventoAdapterPadrao() {
        }

        public RelatorioS2501PorEventoAdapterPadrao(Date dataEvento, List<? extends OcorrenciaEsocialInss> ocorrencias, BigDecimal irAnterior, BigDecimal irCorrente) {
            this.dataEvento = dataEvento;
            this.ocorrencias = ocorrencias;
            this.irAnterior = irAnterior;
            this.irCorrente = irCorrente;
        }

        @Override
        public Date getDataEvento() {
            return this.dataEvento;
        }

        @Override
        public JRBeanCollectionDataSource getOcorrencias() {
            return new JRBeanCollectionDataSource(this.ocorrencias);
        }

        @Override
        public BigDecimal getIrCorrente() {
            return this.irCorrente;
        }

        @Override
        public BigDecimal getIrAnterior() {
            return this.irAnterior;
        }

        @Override
        public JRAdapter adapt(Object adapted) {
            return this;
        }
    }
}

