/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio.resumo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CustasDevidasFixasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DestinoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCorrecaoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeConhecimentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeLiquidacaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDevedorDoHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.AutoJudicial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustaPaga;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.pensaoalimenticia.PensaoAlimenticia;
import br.jus.trt8.pjecalc.negocio.dominio.processo.relatorio.resumo.ResumoPorProcessoJRAdapter;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ResumoPorProcessoJRAdapterPadrao
extends ResumoPorProcessoJRAdapter {
    private static final String CUSTAS_DEVIDAS_RECLAMANTE = "Custas Judiciais devidas pelo Reclamante";
    private ResumoPorProcessoJRAdapter.ItensResumoAppender appender = new ResumoPorProcessoJRAdapter.ItensResumoAppender();
    private List<Calculo> calculos;
    private Map<String, String> nomesDosReclamantes;
    private Map<String, BigDecimal> brutoPorReclamante;
    private Map<String, BigDecimal> liquidoPorReclamante;
    private Map<String, BigDecimal> totalDevidoPeloReclamado;
    private Map<String, BigDecimal> debitosPorReclamante;
    private Map<Calculo, BigDecimal> depositoFgtsPorCalculo;

    public ResumoPorProcessoJRAdapterPadrao(List<Calculo> calculos) {
        this.calculos = calculos;
        this.nomesDosReclamantes = new HashMap<String, String>();
        this.brutoPorReclamante = new HashMap<String, BigDecimal>();
        this.liquidoPorReclamante = new HashMap<String, BigDecimal>();
        this.totalDevidoPeloReclamado = new HashMap<String, BigDecimal>();
        this.debitosPorReclamante = new HashMap<String, BigDecimal>();
        this.depositoFgtsPorCalculo = new HashMap<Calculo, BigDecimal>();
        this.popularReclamantes();
        this.popularItensResumoPorProcesso();
    }

    private void popularReclamantes() {
        for (Calculo calculo : this.calculos) {
            if (!this.nomesDosReclamantes.containsKey(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal())) {
                this.nomesDosReclamantes.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), calculo.getProcesso().getReclamante().getNome());
            }
            if (!this.brutoPorReclamante.containsKey(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal())) {
                this.brutoPorReclamante.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), BigDecimal.ZERO);
            }
            if (!this.liquidoPorReclamante.containsKey(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal())) {
                this.liquidoPorReclamante.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), BigDecimal.ZERO);
            }
            if (!this.totalDevidoPeloReclamado.containsKey(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal())) {
                this.totalDevidoPeloReclamado.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), BigDecimal.ZERO);
            }
            if (this.debitosPorReclamante.containsKey(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal())) continue;
            this.debitosPorReclamante.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), BigDecimal.ZERO);
        }
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    private Map<String, List<Multa>> agruparMultasPorTerceiros(Set<Multa> multas) {
        HashMap<String, List<Multa>> mapaMultas = new HashMap<String, List<Multa>>();
        for (Multa multa : multas) {
            if (!CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) && !CredorDevedorMultaEnum.TERCEIRO_RECLAMADO.equals((Object)multa.getTipoCredorDevedor())) continue;
            if (!mapaMultas.containsKey(multa.getNomeTerceiro())) {
                mapaMultas.put(multa.getNomeTerceiro(), new ArrayList());
            }
            ((List)mapaMultas.get(multa.getNomeTerceiro())).add(multa);
        }
        return mapaMultas;
    }

    private Map<String, List<Honorario>> agruparHonorariosPorCredor(Set<Honorario> honorarios) {
        HashMap<String, List<Honorario>> mapaHonorarios = new HashMap<String, List<Honorario>>();
        for (Honorario honorario : honorarios) {
            if (!mapaHonorarios.containsKey(honorario.getNomeCredor())) {
                mapaHonorarios.put(honorario.getNomeCredor(), new ArrayList());
            }
            ((List)mapaHonorarios.get(honorario.getNomeCredor())).add(honorario);
        }
        return mapaHonorarios;
    }

    @Override
    public void popularItensResumoPorProcesso() {
        this.popularSecaoCreditoReclamante();
        this.popularSecaoDebitoReclamante();
        this.popularSecaoDebitoCobrarReclamante();
        this.popularSecaoDebitoReclamado();
        this.popularSecaoReclamantes();
        this.popularSecaoVerbasForaDoPrincipal();
    }

    private void popularSecaoDebitoCobrarReclamante() {
        BigDecimal total;
        Total valorTotalDebitosPorReclamante = Total.newInstance(true);
        HashMap<String, List<Multa>> mapaMultasCobrarReclamante = new HashMap<String, List<Multa>>();
        HashMap<String, List<Honorario>> mapaHonorariosReclamante = new HashMap<String, List<Honorario>>();
        for (Calculo calculo : this.calculos) {
            Total valorTotalDebitosPorReclamantePorCalculo = Total.newInstance(true);
            Map<String, List<Multa>> multasAgrupadasPorTerceiros = this.agruparMultasPorTerceiros(calculo.getMultasDoCalculoCobrarReclamante());
            for (Map.Entry<String, List<Multa>> entry : multasAgrupadasPorTerceiros.entrySet()) {
                String terceiro = entry.getKey();
                List<Multa> multas = entry.getValue();
                if (!mapaMultasCobrarReclamante.containsKey(terceiro)) {
                    mapaMultasCobrarReclamante.putAll(multasAgrupadasPorTerceiros);
                } else {
                    this.adicionarNovasMultasAoMapa(mapaMultasCobrarReclamante, terceiro, multas);
                }
                BigDecimal total2 = this.calcularTotalMultasAgrupadasPorTerceiroACobrarDoReclamante(entry);
                valorTotalDebitosPorReclamantePorCalculo.acumular(total2);
            }
            Map<String, List<Honorario>> honorariosAgrupadosPorTerceiros = this.agruparHonorariosPorCredor(calculo.getHonorariosDoCalculoCobrarReclamante());
            for (Map.Entry<String, List<Honorario>> entry3 : honorariosAgrupadosPorTerceiros.entrySet()) {
                String credor = entry3.getKey();
                List<Honorario> honorarios = entry3.getValue();
                if (!mapaHonorariosReclamante.containsKey(credor)) {
                    mapaHonorariosReclamante.putAll(honorariosAgrupadosPorTerceiros);
                } else {
                    this.adicionarNovosHonorariosAoMapa(mapaHonorariosReclamante, credor, honorarios);
                }
                BigDecimal total3 = this.calcularTotalHonorariosAgrupadosPorTerceiroACobrarDoReclamante(entry3);
                BigDecimal totalIrpf = this.calcularTotalIrpfHonorariosAgrupadosPorTerceiroACobrarDoReclamante(entry3);
                valorTotalDebitosPorReclamantePorCalculo.acumular(total3);
                valorTotalDebitosPorReclamantePorCalculo.acumular(totalIrpf);
            }
            CustasJudiciais custasJudiciais = calculo.getCustasJudiciais();
            BigDecimal valorCustasReclamanteAcumulado = null;
            BigDecimal valorCustasReclamante = null;
            if (TipoCobrancaReclamanteEnum.COBRAR.equals((Object)custasJudiciais.getTipoCobrancaReclamante())) {
                if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamante())) {
                    valorCustasReclamante = custasJudiciais.getTotalCustasConhecimentoReclamanteInformada();
                } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamante())) {
                    valorCustasReclamante = custasJudiciais.getTotalCustasConhecimentoReclamanteCalculada();
                }
                if (valorCustasReclamante == null) continue;
                for (CustaPaga custaPaga : custasJudiciais.getCustasPagasDoReclamante()) {
                    valorCustasReclamante = Utils.subtrair(valorCustasReclamante, custaPaga.getTotal(), valorCustasReclamante);
                }
                if (BigDecimal.ZERO.compareTo(valorCustasReclamante) > 0) {
                    valorCustasReclamante = BigDecimal.ZERO;
                }
                valorCustasReclamanteAcumulado = this.acumular(Utils.arredondarValorMonetario(valorCustasReclamanteAcumulado), valorCustasReclamante);
            }
            if (Utils.naoNulo(valorCustasReclamanteAcumulado) && BigDecimal.ZERO.compareTo(valorCustasReclamanteAcumulado) < 0) {
                valorTotalDebitosPorReclamante.acumular(valorCustasReclamanteAcumulado);
                valorTotalDebitosPorReclamantePorCalculo.acumular(valorCustasReclamanteAcumulado);
                this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, CUSTAS_DEVIDAS_RECLAMANTE, valorCustasReclamanteAcumulado));
            }
            Total debitosAcumulados = Total.newInstance(true);
            debitosAcumulados.acumular(this.debitosPorReclamante.get(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal()));
            debitosAcumulados.acumular(valorTotalDebitosPorReclamantePorCalculo.getValor());
            this.debitosPorReclamante.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), debitosAcumulados.getValor());
        }
        for (Map.Entry entry : mapaMultasCobrarReclamante.entrySet()) {
            total = this.calcularTotalMultasAgrupadasPorTerceiroACobrarDoReclamante(entry);
            valorTotalDebitosPorReclamante.acumular(total);
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, "Multas / Indeniza\u00e7\u00f5es devidas para " + (String)entry.getKey(), total));
        }
        for (Map.Entry entry : mapaHonorariosReclamante.entrySet()) {
            BigDecimal totalIRPF;
            total = this.calcularTotalHonorariosAgrupadosPorTerceiroACobrarDoReclamante(entry);
            BigDecimal totalLiquido = total.subtract(totalIRPF = this.calcularTotalIrpfHonorariosAgrupadosPorTerceiroACobrarDoReclamante(entry), Utils.CONTEXTO_MATEMATICO);
            if (BigDecimal.ZERO.compareTo(totalLiquido) > 0) {
                totalLiquido = BigDecimal.ZERO;
            }
            valorTotalDebitosPorReclamante.acumular(total);
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, "Honor\u00e1rios L\u00edquidos para " + (String)entry.getKey(), totalLiquido));
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_COBRAR_RECLAMANTE, "IRPF sobre Honor\u00e1rios para " + (String)entry.getKey(), totalIRPF));
        }
    }

    private void adicionarNovasMultasAoMapa(Map<String, List<Multa>> mapaMultasCobrarReclamante, String terceiro, List<Multa> multas) {
        for (Multa m : multas) {
            if (mapaMultasCobrarReclamante.get(terceiro).contains(m)) continue;
            mapaMultasCobrarReclamante.get(terceiro).add(m);
        }
    }

    private void adicionarNovosHonorariosAoMapa(Map<String, List<Honorario>> mapaHonorariosReclamante, String credor, List<Honorario> honorarios) {
        for (Honorario h : honorarios) {
            if (mapaHonorariosReclamante.get(credor).contains(h)) continue;
            mapaHonorariosReclamante.get(credor).add(h);
        }
    }

    private BigDecimal calcularTotalHonorariosAgrupadosPorTerceiroACobrarDoReclamante(Map.Entry<String, List<Honorario>> entry) {
        BigDecimal total = BigDecimal.ZERO;
        for (Honorario honorario : entry.getValue()) {
            total = Utils.somar(total, honorario.getValorTotal(), total);
        }
        return total;
    }

    private BigDecimal calcularTotalIrpfHonorariosAgrupadosPorTerceiroACobrarDoReclamante(Map.Entry<String, List<Honorario>> entry) {
        BigDecimal totalIRPF = BigDecimal.ZERO;
        for (Honorario honorario : entry.getValue()) {
            totalIRPF = Utils.somar(totalIRPF, honorario.getValorImpostoRenda(), totalIRPF);
        }
        return totalIRPF;
    }

    private BigDecimal calcularTotalMultasAgrupadasPorTerceiroACobrarDoReclamante(Map.Entry<String, List<Multa>> entry) {
        BigDecimal total = BigDecimal.ZERO;
        for (Multa multa : entry.getValue()) {
            total = Utils.somar(total, multa.getValorTotal(), total);
        }
        return total;
    }

    private void popularSecaoCreditoReclamante() {
        BigDecimal totalVerbas = null;
        BigDecimal totalFGTS = null;
        HashMap<String, BigDecimal> multasDevidasAosReclamantes = new HashMap<String, BigDecimal>();
        HashMap<String, BigDecimal> multasDevidasAoReclamado = new HashMap<String, BigDecimal>();
        for (Calculo calculo : this.calculos) {
            BigDecimal valorAtualMulta;
            Total valorTotalCreditoReclamante = Total.newInstance(true);
            boolean existemVerbasQueCompoemPrincipal = false;
            List<VerbaDeCalculo> verbasAtivas = calculo.getVerbasParaLiquidacao();
            for (VerbaDeCalculo verba : verbasAtivas) {
                if (!LogicoEnum.SIM.equals((Object)verba.getComporPrincipal())) continue;
                existemVerbasQueCompoemPrincipal = true;
                break;
            }
            BigDecimal valorVerbas = null;
            if (existemVerbasQueCompoemPrincipal) {
                valorVerbas = calculo.getTotalDeValorCorrigidoDaApuracaoDeJuros();
                valorVerbas = Utils.somar(valorVerbas, calculo.getTotalDeJurosDaApuracaoDeJuros(), valorVerbas);
            }
            if (calculo.getSalarioFamilia().getApurarSalarioFamilia().booleanValue() && calculo.getSalarioFamilia().isComporOPrincipal()) {
                valorVerbas = this.acumular(valorVerbas, calculo.getSalarioFamilia().getTotalGeral());
            }
            if (calculo.getSeguroDesemprego().getApurarSeguroDesemprego().booleanValue() && calculo.getSeguroDesemprego().isComporOPrincipal()) {
                valorVerbas = this.acumular(valorVerbas, calculo.getSeguroDesemprego().getTotal());
            }
            if (calculo.getFgts().getMultaDoArtigo467().booleanValue() && calculo.getFgts().isComporOPrincipal()) {
                valorVerbas = this.acumular(valorVerbas, calculo.getFgts().getTotalDaMultaDoArtigo467());
            }
            if (valorVerbas != null) {
                totalVerbas = this.acumular(totalVerbas, Utils.arredondarValorMonetario(valorVerbas));
                valorTotalCreditoReclamante.acumular(valorVerbas);
            }
            BigDecimal valorFGTS = null;
            if (calculo.getFgts().isComporOPrincipal()) {
                if (!calculo.getFgts().getOcorrenciasVisiveisRelatorio().isEmpty()) {
                    valorFGTS = calculo.getFgts().getTotalDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO);
                }
                if (calculo.getFgts().getMulta().booleanValue()) {
                    valorFGTS = this.acumular(valorFGTS, calculo.getFgts().getTotalDaMultaDoFgts());
                }
                if (calculo.getFgts().getDeduzirDoFGTS().booleanValue()) {
                    valorFGTS = valorFGTS == null ? calculo.getFgts().getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate() : Utils.subtrair(valorFGTS, calculo.getFgts().getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO), valorFGTS);
                }
            }
            if (valorFGTS != null) {
                this.depositoFgtsPorCalculo.put(calculo, valorFGTS);
                totalFGTS = this.acumular(totalFGTS, Utils.arredondarValorMonetario(valorFGTS));
                valorTotalCreditoReclamante.acumular(valorFGTS);
            }
            for (Multa multa : calculo.getMultasDoCalculo()) {
                if (!CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO.equals((Object)multa.getTipoCredorDevedor())) continue;
                if (multasDevidasAosReclamantes.containsKey(multa.getDescricao())) {
                    valorAtualMulta = (BigDecimal)multasDevidasAosReclamantes.get(multa.getDescricao());
                    valorAtualMulta = this.acumular(valorAtualMulta, Utils.arredondarValorMonetario(multa.getValorTotal()));
                    multasDevidasAosReclamantes.put(multa.getDescricao(), valorAtualMulta);
                } else {
                    multasDevidasAosReclamantes.put(multa.getDescricao(), Utils.arredondarValorMonetario(multa.getValorTotal()));
                }
                valorTotalCreditoReclamante.acumular(multa.getValorTotal());
            }
            for (Multa multa : calculo.getMultasDoCalculo()) {
                if (!CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) || !multa.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO)) continue;
                if (multasDevidasAoReclamado.containsKey(multa.getDescricao())) {
                    valorAtualMulta = (BigDecimal)multasDevidasAoReclamado.get(multa.getDescricao());
                    valorAtualMulta = this.acumular(valorAtualMulta, Utils.arredondarValorMonetario(multa.getValorTotal().negate()));
                    multasDevidasAoReclamado.put(multa.getDescricao(), valorAtualMulta);
                } else {
                    multasDevidasAoReclamado.put(multa.getDescricao(), Utils.arredondarValorMonetario(multa.getValorTotal().negate()));
                }
                valorTotalCreditoReclamante.acumular(multa.getValorTotal().negate());
            }
            BigDecimal brutoAcumulado = this.brutoPorReclamante.get(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal());
            brutoAcumulado = this.acumular(brutoAcumulado, valorTotalCreditoReclamante.getValor());
            this.brutoPorReclamante.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), brutoAcumulado);
            this.liquidoPorReclamante.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), brutoAcumulado);
        }
        if (Utils.naoNulo(totalVerbas)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.CREDITO_RECLAMANTE, "Verbas", totalVerbas));
        }
        if (Utils.naoNulo(totalFGTS)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.CREDITO_RECLAMANTE, "FGTS", totalFGTS));
        }
        for (Map.Entry entry : multasDevidasAosReclamantes.entrySet()) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.CREDITO_RECLAMANTE, (String)entry.getKey(), (BigDecimal)entry.getValue()));
        }
        for (Map.Entry entry : multasDevidasAoReclamado.entrySet()) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.CREDITO_RECLAMANTE, (String)entry.getKey(), (BigDecimal)entry.getValue()));
        }
    }

    private BigDecimal acumular(BigDecimal valorAcumulado, BigDecimal valorAAcumular) {
        valorAcumulado = Utils.nulo(valorAcumulado) ? valorAAcumular : Utils.somar(valorAcumulado, valorAAcumular, valorAcumulado);
        return valorAcumulado;
    }

    /*
     * WARNING - void declaration
     */
    private void popularSecaoDebitoReclamado() {
        BigDecimal depositoFgts = null;
        BigDecimal contribuicaoSocialSalariosDevidos = null;
        BigDecimal contribuicaoSocialSalariosPagos = null;
        BigDecimal previdenciaPrivada = null;
        BigDecimal pensaoAlimenticia = null;
        HashMap<String, BigDecimal> multasDevidasATerceiros = new HashMap<String, BigDecimal>();
        HashMap<String, BigDecimal> honorariosDevidos = new HashMap<String, BigDecimal>();
        HashMap<String, BigDecimal> impostoSobreHonorariosDevidos = new HashMap<String, BigDecimal>();
        BigDecimal impostoRendaDevidoPeloReclamado = null;
        BigDecimal impostoRendaDevidoPeloReclamante = null;
        BigDecimal contribuicaoSocialDezPorcento = null;
        BigDecimal contribuicaoSocialMeioPorcento = null;
        BigDecimal custasDoReclamado = null;
        BigDecimal custasDosReclamantes = null;
        for (Calculo calculo : this.calculos) {
            PensaoAlimenticia pa;
            Total valorTotalDebitosReclamadoPorReclamante = Total.newInstance(true);
            if (DestinoDoFgtsEnum.DEPOSITAR.equals((Object)calculo.getFgts().getDestinoDoFgts()) && Utils.naoNulo(this.depositoFgtsPorCalculo.get(calculo))) {
                depositoFgts = this.acumular(depositoFgts, Utils.arredondarValorMonetario(this.depositoFgtsPorCalculo.get(calculo)));
                valorTotalDebitosReclamadoPorReclamante.acumular(this.depositoFgtsPorCalculo.get(calculo));
            }
            BigDecimal valorContribuicaoSocialSalariosDevidos = null;
            if (!calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty()) {
                valorContribuicaoSocialSalariosDevidos = Boolean.TRUE.equals(calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado()) ? calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSegurado() : BigDecimal.ZERO;
                valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssEmpresa(), valorContribuicaoSocialSalariosDevidos);
                valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssSAT(), valorContribuicaoSocialSalariosDevidos);
                valorContribuicaoSocialSalariosDevidos = Utils.somar(valorContribuicaoSocialSalariosDevidos, calculo.getInss().getInssSobreSalariosDevidos().getTotalGeralInssTerceiros(), valorContribuicaoSocialSalariosDevidos);
            }
            if (valorContribuicaoSocialSalariosDevidos != null) {
                contribuicaoSocialSalariosDevidos = this.acumular(contribuicaoSocialSalariosDevidos, Utils.arredondarValorMonetario(valorContribuicaoSocialSalariosDevidos));
                valorTotalDebitosReclamadoPorReclamante.acumular(valorContribuicaoSocialSalariosDevidos);
            }
            BigDecimal valorContribuicaoSocialSalariosPagos = null;
            if (Boolean.TRUE.equals(calculo.getInss().getApurarInssSobreSalariosPagos()) && !calculo.getInss().getInssSobreSalariosPagos().getOcorrenciasParaRelatorioSalariosPagos().isEmpty()) {
                valorContribuicaoSocialSalariosPagos = calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssSegurado();
                valorContribuicaoSocialSalariosPagos = Utils.somar(valorContribuicaoSocialSalariosPagos, calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssEmpresa(), valorContribuicaoSocialSalariosPagos);
                valorContribuicaoSocialSalariosPagos = Utils.somar(valorContribuicaoSocialSalariosPagos, calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssSAT(), valorContribuicaoSocialSalariosPagos);
                valorContribuicaoSocialSalariosPagos = Utils.somar(valorContribuicaoSocialSalariosPagos, calculo.getInss().getInssSobreSalariosPagos().getTotalGeralInssTerceiros(), valorContribuicaoSocialSalariosPagos);
            }
            if (valorContribuicaoSocialSalariosPagos != null) {
                contribuicaoSocialSalariosPagos = this.acumular(contribuicaoSocialSalariosPagos, Utils.arredondarValorMonetario(valorContribuicaoSocialSalariosPagos));
                valorTotalDebitosReclamadoPorReclamante.acumular(valorContribuicaoSocialSalariosPagos);
            }
            if (calculo.getPrevidenciaPrivada().getApurarPrevidenciaPrivada().booleanValue()) {
                previdenciaPrivada = this.acumular(previdenciaPrivada, Utils.arredondarValorMonetario(calculo.getPrevidenciaPrivada().getTotalGeral()));
                valorTotalDebitosReclamadoPorReclamante.acumular(calculo.getPrevidenciaPrivada().getTotalGeral());
            }
            if ((pa = calculo.getPensaoAlimenticiaDoCalculo()) != null && pa.getApurarPensaoAlimenticia().booleanValue()) {
                pensaoAlimenticia = this.acumular(pensaoAlimenticia, Utils.arredondarValorMonetario(pa.getValorDevido()));
                valorTotalDebitosReclamadoPorReclamante.acumular(pa.getValorDevido());
            }
            for (Multa multa : calculo.getMultasDoCalculo()) {
                if (!multa.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO) || !CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) && !CredorDevedorMultaEnum.TERCEIRO_RECLAMADO.equals((Object)multa.getTipoCredorDevedor())) continue;
                if (multasDevidasATerceiros.containsKey(multa.getNomeTerceiro())) {
                    BigDecimal valorAtualMulta = (BigDecimal)multasDevidasATerceiros.get(multa.getNomeTerceiro());
                    valorAtualMulta = this.acumular(valorAtualMulta, Utils.arredondarValorMonetario(multa.getValorTotal()));
                    multasDevidasATerceiros.put(multa.getNomeTerceiro(), valorAtualMulta);
                } else {
                    multasDevidasATerceiros.put(multa.getNomeTerceiro(), Utils.arredondarValorMonetario(multa.getValorTotal()));
                }
                valorTotalDebitosReclamadoPorReclamante.acumular(multa.getValorTotal());
            }
            for (Honorario honorario : calculo.getHonorariosDoCalculo()) {
                if (!honorario.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO)) continue;
                if (honorariosDevidos.containsKey(honorario.getNomeCredor())) {
                    BigDecimal valorAtualHonorario = (BigDecimal)honorariosDevidos.get(honorario.getNomeCredor());
                    valorAtualHonorario = this.acumular(valorAtualHonorario, Utils.arredondarValorMonetario(honorario.getValorTotal()));
                    honorariosDevidos.put(honorario.getNomeCredor(), valorAtualHonorario);
                    BigDecimal valorAtualIrpfHonorario = (BigDecimal)impostoSobreHonorariosDevidos.get(honorario.getNomeCredor());
                    valorAtualIrpfHonorario = this.acumular(valorAtualIrpfHonorario, Utils.arredondarValorMonetario(honorario.getValorImpostoRenda()));
                    impostoSobreHonorariosDevidos.put(honorario.getNomeCredor(), valorAtualIrpfHonorario);
                } else {
                    honorariosDevidos.put(honorario.getNomeCredor(), Utils.arredondarValorMonetario(honorario.getValorTotal()));
                    impostoSobreHonorariosDevidos.put(honorario.getNomeCredor(), Utils.arredondarValorMonetario(honorario.getValorImpostoRenda()));
                }
                valorTotalDebitosReclamadoPorReclamante.acumular(honorario.getValorTotal());
            }
            if (Boolean.TRUE.equals(calculo.getIrpf().getApurarImpostoRenda()) && Utils.naoNulo(calculo.getIrpf().getTotalValorDevido())) {
                if (Boolean.TRUE.equals(calculo.getIrpf().getCobrarDoReclamado())) {
                    impostoRendaDevidoPeloReclamado = this.acumular(impostoRendaDevidoPeloReclamado, Utils.arredondarValorMonetario(calculo.getIrpf().getTotalValorDevido()));
                    valorTotalDebitosReclamadoPorReclamante.acumular(calculo.getIrpf().getTotalValorDevido());
                } else {
                    impostoRendaDevidoPeloReclamante = this.acumular(impostoRendaDevidoPeloReclamante, Utils.arredondarValorMonetario(calculo.getIrpf().getTotalValorDevido()));
                    valorTotalDebitosReclamadoPorReclamante.acumular(calculo.getIrpf().getTotalValorDevido());
                }
            }
            if (Boolean.TRUE.equals(calculo.getFgts().getMulta10())) {
                contribuicaoSocialDezPorcento = this.acumular(contribuicaoSocialDezPorcento, Utils.arredondarValorMonetario(calculo.getFgts().getTotalDaMulta10Corrigida()));
                valorTotalDebitosReclamadoPorReclamante.acumular(calculo.getFgts().getTotalDaMulta10Corrigida());
            }
            if (Boolean.TRUE.equals(calculo.getFgts().getContribuicaoSocial05())) {
                contribuicaoSocialMeioPorcento = this.acumular(contribuicaoSocialMeioPorcento, Utils.arredondarValorMonetario(calculo.getFgts().getTotalDaContribuicaoSocial05()));
                valorTotalDebitosReclamadoPorReclamante.acumular(calculo.getFgts().getTotalDaContribuicaoSocial05());
            }
            BigDecimal valorCustasReclamado = null;
            if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamado())) {
                valorCustasReclamado = calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamadoInformada();
            } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamado())) {
                valorCustasReclamado = calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamadoCalculada();
            }
            if (TipoDeCustasDeLiquidacaoEnum.INFORMADA.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeLiquidacao())) {
                valorCustasReclamado = valorCustasReclamado == null ? calculo.getCustasJudiciais().getTotalCustasLiquidacaoReclamadoInformada() : Utils.somar(valorCustasReclamado, calculo.getCustasJudiciais().getTotalCustasLiquidacaoReclamadoInformada(), valorCustasReclamado);
            } else if (TipoDeCustasDeLiquidacaoEnum.CALCULADA_MEIO_POR_CENTO.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeLiquidacao())) {
                valorCustasReclamado = valorCustasReclamado == null ? calculo.getCustasJudiciais().getTotalCustasLiquidacaoReclamadoCalculada() : Utils.somar(valorCustasReclamado, calculo.getCustasJudiciais().getTotalCustasLiquidacaoReclamadoCalculada(), valorCustasReclamado);
            }
            for (CustasDevidasFixasEnum custasDevidasFixasEnum : CustasDevidasFixasEnum.values()) {
                CustasFixasWrapper fixa = new CustasFixasWrapper(calculo.getCustasJudiciais().getDataVencimentoCustasFixas(), custasDevidasFixasEnum.getDescricao(), custasDevidasFixasEnum.getBase(calculo.getCustasJudiciais()), custasDevidasFixasEnum.getQuantidade(calculo.getCustasJudiciais()), custasDevidasFixasEnum.getValor(calculo.getCustasJudiciais()), calculo.getCustasJudiciais().getIndiceCorrecaoCustasFixas(), calculo.getCustasJudiciais().getTaxaJurosCustasFixas());
                if (fixa.getTotal() == null || fixa.getTotal().compareTo(BigDecimal.ZERO) == 0) continue;
                valorCustasReclamado = valorCustasReclamado == null ? fixa.getTotal() : Utils.somar(valorCustasReclamado, fixa.getTotal(), valorCustasReclamado);
            }
            for (AutoJudicial auto : calculo.getCustasJudiciais().getAutosJudiciaisDoCalculo()) {
                if (valorCustasReclamado == null) {
                    valorCustasReclamado = auto.getTotal();
                    continue;
                }
                valorCustasReclamado = Utils.somar(valorCustasReclamado, auto.getTotal(), valorCustasReclamado);
            }
            for (Armazenamento armazenamento : calculo.getCustasJudiciais().getArmazenamentosDoCalculo()) {
                if (valorCustasReclamado == null) {
                    valorCustasReclamado = armazenamento.getTotal();
                    continue;
                }
                valorCustasReclamado = Utils.somar(valorCustasReclamado, armazenamento.getTotal(), valorCustasReclamado);
            }
            if (valorCustasReclamado != null) {
                for (CustaPaga custaPaga : calculo.getCustasJudiciais().getCustasPagasDoReclamado()) {
                    valorCustasReclamado = Utils.subtrair(valorCustasReclamado, custaPaga.getTotal(), valorCustasReclamado);
                }
                if (BigDecimal.ZERO.compareTo(valorCustasReclamado) > 0) {
                    valorCustasReclamado = BigDecimal.ZERO;
                }
                custasDoReclamado = this.acumular(custasDoReclamado, Utils.arredondarValorMonetario(valorCustasReclamado));
                valorTotalDebitosReclamadoPorReclamante.acumular(valorCustasReclamado);
            }
            if (TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)calculo.getCustasJudiciais().getTipoCobrancaReclamante())) {
                void var22_39;
                Object var22_36 = null;
                if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                    BigDecimal bigDecimal = calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteInformada();
                } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                    BigDecimal bigDecimal = calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteCalculada();
                }
                if (var22_39 != null) {
                    BigDecimal bigDecimal = this.subtrairCustasPagas(calculo.getCustasJudiciais().getCustasPagasDoReclamante(), (BigDecimal)var22_39);
                    custasDosReclamantes = this.acumular(custasDosReclamantes, Utils.arredondarValorMonetario(bigDecimal));
                    valorTotalDebitosReclamadoPorReclamante.acumular(bigDecimal);
                }
            }
            BigDecimal bigDecimal2 = this.totalDevidoPeloReclamado.get(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal());
            bigDecimal2 = this.acumular(bigDecimal2, valorTotalDebitosReclamadoPorReclamante.getValor());
            this.totalDevidoPeloReclamado.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), bigDecimal2);
        }
        this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "L\u00edquido devido aos Reclamantes", this.appender.getValorLiquidoReclamante()));
        if (Utils.naoNulo(depositoFgts)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Dep\u00f3sito FGTS", depositoFgts));
        }
        if (Utils.naoNulo(contribuicaoSocialSalariosDevidos)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Contribui\u00e7\u00e3o Social Sobre Sal\u00e1rios Devidos", contribuicaoSocialSalariosDevidos));
        }
        if (Utils.naoNulo(contribuicaoSocialSalariosPagos)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Contribui\u00e7\u00e3o Social Sobre Sal\u00e1rios Pagos", contribuicaoSocialSalariosPagos));
        }
        if (Utils.naoNulo(previdenciaPrivada)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Previd\u00eancia Privada", previdenciaPrivada));
        }
        if (Utils.naoNulo(pensaoAlimenticia)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Pens\u00e3o Aliment\u00edcia", pensaoAlimenticia));
        }
        for (Map.Entry entry : multasDevidasATerceiros.entrySet()) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Multas / Indeniza\u00e7\u00f5es devidas para " + (String)entry.getKey(), (BigDecimal)entry.getValue()));
        }
        for (Map.Entry entry : honorariosDevidos.entrySet()) {
            BigDecimal totalLiquido = (BigDecimal)entry.getValue();
            BigDecimal impostoDevido = Utils.naoNulo(impostoSobreHonorariosDevidos.get(entry.getKey())) ? (BigDecimal)impostoSobreHonorariosDevidos.get(entry.getKey()) : BigDecimal.ZERO;
            if (BigDecimal.ZERO.compareTo(totalLiquido = Utils.subtrair(totalLiquido, impostoDevido, totalLiquido)) > 0) {
                totalLiquido = BigDecimal.ZERO;
            }
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Honor\u00e1rios L\u00edquidos para " + (String)entry.getKey(), totalLiquido));
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "IRPF sobre Honor\u00e1rios para " + (String)entry.getKey(), impostoDevido));
        }
        if (Utils.naoNulo(impostoRendaDevidoPeloReclamado)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "IRPF devido pelo Reclamado", impostoRendaDevidoPeloReclamado));
        }
        if (Utils.naoNulo(impostoRendaDevidoPeloReclamante)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "IRPF devido pelos Reclamantes", impostoRendaDevidoPeloReclamante));
        }
        if (Utils.naoNulo(contribuicaoSocialDezPorcento)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Contribui\u00e7\u00e3o Social 10% (Lei Complementar 110/2001)", contribuicaoSocialDezPorcento));
        }
        if (Utils.naoNulo(contribuicaoSocialMeioPorcento)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMADO, "Contribui\u00e7\u00e3o Social 0,5% (Lei Complementar 110/2001)", contribuicaoSocialMeioPorcento));
        }
        if (Utils.naoNulo(custasDoReclamado)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.CUSTAS_DEBITO_RECLAMADO, "Custas Judiciais devidas pelo Reclamado", custasDoReclamado));
        }
        if (Utils.naoNulo(custasDosReclamantes)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.CUSTAS_DEBITO_RECLAMADO, CUSTAS_DEVIDAS_RECLAMANTE, custasDosReclamantes));
        }
    }

    private void popularSecaoDebitoReclamante() {
        BigDecimal depositoFgts = null;
        BigDecimal deducaoContribuicaoSocial = null;
        BigDecimal previdenciaPrivada = null;
        BigDecimal pensaoAlimenticia = null;
        HashMap<String, BigDecimal> multasDevidasATerceirosPelosReclamantes = new HashMap<String, BigDecimal>();
        HashMap<String, BigDecimal> honorariosDevidosPelosReclamantes = new HashMap<String, BigDecimal>();
        BigDecimal irpf = null;
        BigDecimal custas = null;
        for (Calculo calculo : this.calculos) {
            PensaoAlimenticia pa;
            Total valorTotalDebitoReclamante = Total.newInstance(true);
            if (DestinoDoFgtsEnum.DEPOSITAR.equals((Object)calculo.getFgts().getDestinoDoFgts()) && Utils.naoNulo(this.depositoFgtsPorCalculo.get(calculo))) {
                depositoFgts = this.acumular(depositoFgts, Utils.arredondarValorMonetario(this.depositoFgtsPorCalculo.get(calculo).negate()));
                valorTotalDebitoReclamante.acumular(this.depositoFgtsPorCalculo.get(calculo).negate());
            }
            if (Boolean.TRUE.equals(calculo.getInss().getInssSobreSalariosDevidos().getApurarInssSegurado()) && Boolean.TRUE.equals(calculo.getInss().getInssSobreSalariosDevidos().getCobrarInssDoReclamante()) && !calculo.getInss().getInssSobreSalariosDevidos().getOcorrenciasComValorDaVerba().isEmpty()) {
                deducaoContribuicaoSocial = this.acumular(deducaoContribuicaoSocial, Utils.arredondarValorMonetario(calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante().negate()));
                valorTotalDebitoReclamante.acumular(calculo.getInss().getInssSobreSalariosDevidos().getValorTotalInssSeguradoReclamante().negate());
            }
            if (calculo.getPrevidenciaPrivada().getApurarPrevidenciaPrivada().booleanValue()) {
                previdenciaPrivada = this.acumular(previdenciaPrivada, Utils.arredondarValorMonetario(calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido().negate()));
                valorTotalDebitoReclamante.acumular(calculo.getPrevidenciaPrivada().getTotalDoDevidoCorrigido().negate());
            }
            if ((pa = calculo.getPensaoAlimenticiaDoCalculo()) != null && pa.getApurarPensaoAlimenticia().booleanValue()) {
                pensaoAlimenticia = this.acumular(pensaoAlimenticia, Utils.arredondarValorMonetario(pa.getValorDevido().negate()));
                valorTotalDebitoReclamante.acumular(pa.getValorDevido().negate());
            }
            for (Multa multa : calculo.getMultasDoCalculo()) {
                if (!CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE.equals((Object)multa.getTipoCredorDevedor()) || !multa.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO)) continue;
                if (multasDevidasATerceirosPelosReclamantes.containsKey(multa.getDescricao())) {
                    BigDecimal valorAtualMulta = (BigDecimal)multasDevidasATerceirosPelosReclamantes.get(multa.getDescricao());
                    valorAtualMulta = this.acumular(valorAtualMulta, Utils.arredondarValorMonetario(multa.getValorTotal().negate()));
                    multasDevidasATerceirosPelosReclamantes.put(multa.getDescricao(), valorAtualMulta);
                } else {
                    multasDevidasATerceirosPelosReclamantes.put(multa.getDescricao(), Utils.arredondarValorMonetario(multa.getValorTotal().negate()));
                }
                valorTotalDebitoReclamante.acumular(multa.getValorTotal().negate());
            }
            for (Honorario honorario : calculo.getHonorariosDoCalculo()) {
                if (!TipoDeDevedorDoHonorarioEnum.RECLAMANTE.equals((Object)honorario.getTipoDeDevedor()) || !honorario.getTipoCobrancaReclamante().equals((Object)TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO)) continue;
                if (honorariosDevidosPelosReclamantes.containsKey(honorario.getDescricao())) {
                    BigDecimal valorAtualHonorario = (BigDecimal)honorariosDevidosPelosReclamantes.get(honorario.getDescricao());
                    valorAtualHonorario = this.acumular(valorAtualHonorario, Utils.arredondarValorMonetario(honorario.getValorTotal().negate()));
                    honorariosDevidosPelosReclamantes.put(honorario.getDescricao(), valorAtualHonorario);
                } else {
                    honorariosDevidosPelosReclamantes.put(honorario.getDescricao(), Utils.arredondarValorMonetario(honorario.getValorTotal().negate()));
                }
                valorTotalDebitoReclamante.acumular(honorario.getValorTotal().negate());
            }
            if (Boolean.TRUE.equals(calculo.getIrpf().getApurarImpostoRenda()) && Utils.naoNulo(calculo.getIrpf().getTotalValorDevido()) && Boolean.FALSE.equals(calculo.getIrpf().getCobrarDoReclamado())) {
                irpf = this.acumular(irpf, Utils.arredondarValorMonetario(calculo.getIrpf().getTotalValorDevido().negate()));
                valorTotalDebitoReclamante.acumular(calculo.getIrpf().getTotalValorDevido().negate());
            }
            if (TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO.equals((Object)calculo.getCustasJudiciais().getTipoCobrancaReclamante())) {
                BigDecimal valorCustasReclamante = null;
                if (TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                    valorCustasReclamante = calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteInformada();
                } else if (TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)calculo.getCustasJudiciais().getTipoDeCustasDeConhecimentoDoReclamante())) {
                    valorCustasReclamante = calculo.getCustasJudiciais().getTotalCustasConhecimentoReclamanteCalculada();
                }
                if (valorCustasReclamante != null) {
                    valorCustasReclamante = this.subtrairCustasPagas(calculo.getCustasJudiciais().getCustasPagasDoReclamante(), valorCustasReclamante);
                    custas = this.acumular(custas, Utils.arredondarValorMonetario(valorCustasReclamante.negate()));
                    valorTotalDebitoReclamante.acumular(valorCustasReclamante.negate());
                }
            }
            BigDecimal liquidoAcumulado = this.liquidoPorReclamante.get(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal());
            liquidoAcumulado = this.acumular(liquidoAcumulado, valorTotalDebitoReclamante.getValor());
            this.liquidoPorReclamante.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), liquidoAcumulado);
            this.totalDevidoPeloReclamado.put(calculo.getProcesso().getReclamante().getNumeroDocumentoFiscal(), liquidoAcumulado);
        }
        if (Utils.naoNulo(depositoFgts)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, "Dep\u00f3sito FGTS", depositoFgts));
        }
        if (Utils.naoNulo(deducaoContribuicaoSocial)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, "Dedu\u00e7\u00e3o de Contribui\u00e7\u00e3o Social", deducaoContribuicaoSocial));
        }
        if (Utils.naoNulo(previdenciaPrivada)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, "Previd\u00eancia Privada", previdenciaPrivada));
        }
        if (Utils.naoNulo(pensaoAlimenticia)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, "Pens\u00e3o Aliment\u00edcia", pensaoAlimenticia));
        }
        for (Map.Entry entry : multasDevidasATerceirosPelosReclamantes.entrySet()) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, (String)entry.getKey(), (BigDecimal)entry.getValue()));
        }
        for (Map.Entry entry : honorariosDevidosPelosReclamantes.entrySet()) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, (String)entry.getKey(), (BigDecimal)entry.getValue()));
        }
        if (Utils.naoNulo(irpf)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, "IRPF devido pelo Reclamante", irpf));
        }
        if (Utils.naoNulo(custas)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.DEBITO_RECLAMANTE, CUSTAS_DEVIDAS_RECLAMANTE, custas));
        }
    }

    private BigDecimal subtrairCustasPagas(Set<CustaPaga> custasPagas, BigDecimal valorCustasReclamante) {
        for (CustaPaga custaPaga : custasPagas) {
            valorCustasReclamante = Utils.subtrair(valorCustasReclamante, custaPaga.getTotal(), valorCustasReclamante);
        }
        if (BigDecimal.ZERO.compareTo(valorCustasReclamante) > 0) {
            valorCustasReclamante = BigDecimal.ZERO;
        }
        return valorCustasReclamante;
    }

    private void popularSecaoReclamantes() {
        for (Map.Entry<String, String> entry : this.nomesDosReclamantes.entrySet()) {
            String nome = entry.getValue();
            BigDecimal bruto = this.brutoPorReclamante.get(entry.getKey());
            BigDecimal liquido = this.liquidoPorReclamante.get(entry.getKey());
            BigDecimal totalReclamado = this.totalDevidoPeloReclamado.get(entry.getKey());
            BigDecimal debitos = this.debitosPorReclamante.get(entry.getKey());
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.RECLAMANTES, nome, bruto, liquido, totalReclamado, debitos));
        }
    }

    private void popularSecaoVerbasForaDoPrincipal() {
        HashMap<String, BigDecimal> verbasForaDoPrincipal = new HashMap<String, BigDecimal>();
        BigDecimal salarioFamilia = null;
        BigDecimal seguroDesemprego = null;
        HashMap<String, BigDecimal> fgtsForaDoPrincipal = new HashMap<String, BigDecimal>();
        BigDecimal saldoSaqueFgts = null;
        HashMap<String, BigDecimal> multaFgtsForaDoPrincipal = new HashMap<String, BigDecimal>();
        BigDecimal multaDo467 = null;
        for (Calculo calculo : this.calculos) {
            for (VerbaDeCalculo verba : calculo.getVerbasAtivas()) {
                if (verba.isComporOPrincipal()) continue;
                if (verbasForaDoPrincipal.containsKey(verba.getNome().trim())) {
                    BigDecimal valorCorrigidoAtualizado = (BigDecimal)verbasForaDoPrincipal.get(verba.getNome().trim());
                    valorCorrigidoAtualizado = valorCorrigidoAtualizado.add(verba.getValorTotalDiferencaCorrigida(), Utils.CONTEXTO_MATEMATICO);
                    verbasForaDoPrincipal.put(verba.getNome().trim(), valorCorrigidoAtualizado);
                    continue;
                }
                verbasForaDoPrincipal.put(verba.getNome().trim(), verba.getValorTotalDiferencaCorrigida());
            }
            if (calculo.getSalarioFamilia().getApurarSalarioFamilia().booleanValue() && !calculo.getSalarioFamilia().isComporOPrincipal()) {
                salarioFamilia = Utils.nulo(salarioFamilia) ? calculo.getSalarioFamilia().getTotalGeral() : salarioFamilia.add(calculo.getSalarioFamilia().getTotalGeral(), Utils.CONTEXTO_MATEMATICO);
            }
            if (calculo.getSeguroDesemprego().getApurarSeguroDesemprego().booleanValue() && !calculo.getSeguroDesemprego().isComporOPrincipal()) {
                seguroDesemprego = Utils.nulo(seguroDesemprego) ? calculo.getSeguroDesemprego().getTotal() : seguroDesemprego.add(calculo.getSeguroDesemprego().getTotal(), Utils.CONTEXTO_MATEMATICO);
            }
            if (calculo.getFgts().isComporOPrincipal()) continue;
            if (!calculo.getFgts().getOcorrenciasVisiveisRelatorio().isEmpty()) {
                if (fgtsForaDoPrincipal.containsKey(calculo.getFgts().getAliquota().getNome().trim())) {
                    BigDecimal totalFgtsAtualizado = (BigDecimal)fgtsForaDoPrincipal.get(calculo.getFgts().getAliquota().getNome().trim());
                    totalFgtsAtualizado = totalFgtsAtualizado.add(calculo.getFgts().getTotalDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO), Utils.CONTEXTO_MATEMATICO);
                    fgtsForaDoPrincipal.put(calculo.getFgts().getAliquota().getNome().trim(), totalFgtsAtualizado);
                } else {
                    fgtsForaDoPrincipal.put(calculo.getFgts().getAliquota().getNome().trim(), calculo.getFgts().getTotalDoFgts(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO));
                }
            }
            if (calculo.getFgts().getDeduzirDoFGTS().booleanValue()) {
                saldoSaqueFgts = Utils.nulo(saldoSaqueFgts) ? calculo.getFgts().getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate() : saldoSaqueFgts.add(calculo.getFgts().getTotalGeralDoDepositadoOuSacado(TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO).negate(), Utils.CONTEXTO_MATEMATICO);
            }
            if (calculo.getFgts().getMulta().booleanValue()) {
                String nomeMulta;
                String string = nomeMulta = calculo.getFgts().isMultaCalculada() ? calculo.getFgts().getMultaDoFgts().getNome().trim() : "INFORMADA";
                if (multaFgtsForaDoPrincipal.containsKey(nomeMulta)) {
                    BigDecimal totalMultaFgtsAtualizado = (BigDecimal)multaFgtsForaDoPrincipal.get(nomeMulta);
                    totalMultaFgtsAtualizado = totalMultaFgtsAtualizado.add(calculo.getFgts().getTotalDaMultaDoFgts(), Utils.CONTEXTO_MATEMATICO);
                    multaFgtsForaDoPrincipal.put(nomeMulta, totalMultaFgtsAtualizado);
                } else {
                    multaFgtsForaDoPrincipal.put(nomeMulta, calculo.getFgts().getTotalDaMultaDoFgts());
                }
            }
            if (!calculo.getFgts().getMultaDoArtigo467().booleanValue()) continue;
            if (Utils.nulo(multaDo467)) {
                multaDo467 = calculo.getFgts().getTotalDaMultaDoArtigo467();
                continue;
            }
            multaDo467 = multaDo467.add(calculo.getFgts().getTotalDaMultaDoArtigo467(), Utils.CONTEXTO_MATEMATICO);
        }
        for (Map.Entry entry : verbasForaDoPrincipal.entrySet()) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, (String)entry.getKey(), (BigDecimal)entry.getValue()));
        }
        if (Utils.naoNulo(salarioFamilia)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, "Sal\u00e1rio Fam\u00edlia", salarioFamilia));
        }
        if (Utils.naoNulo(seguroDesemprego)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, "Seguro Desemprego", seguroDesemprego));
        }
        for (Map.Entry entry : fgtsForaDoPrincipal.entrySet()) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, "FGTS " + (String)entry.getKey(), (BigDecimal)entry.getValue()));
        }
        if (Utils.naoNulo(saldoSaqueFgts)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, "Saldo e/ou Saque", saldoSaqueFgts));
        }
        for (Map.Entry entry : multaFgtsForaDoPrincipal.entrySet()) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, "Multa sobre FGTS" + ("INFORMADA".equals(entry.getKey()) ? "" : " " + (String)entry.getKey()), (BigDecimal)entry.getValue()));
        }
        if (Utils.naoNulo(multaDo467)) {
            this.appender.append(new ResumoPorProcessoJRAdapter.ItemResumo(ResumoPorProcessoJRAdapter.SecaoRelatorioResumoEnum.VERBAS_FORA_DO_PRINCIPAL, "Multa do Artigo 467 da CLT sobre Multa sobre FGTS", multaDo467));
        }
    }

    @Override
    public JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoComInformacoesAdicionaisJRAdapter> getOcorrenciasReclamantes() {
        return new JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoComInformacoesAdicionaisJRAdapter>(new OcorrenciaResumoPorProcessoComInformacoesAdicionaisPadrao(), this.appender.getItensReclamantes());
    }

    @Override
    public BigDecimal getValorTotalBrutoDosReclamantes() {
        return this.appender.getValorTotalBrutoDosReclamantes();
    }

    @Override
    public BigDecimal getValorTotalLiquidoDosReclamantes() {
        return this.appender.getValorTotalLiquidoDosReclamantes();
    }

    @Override
    public BigDecimal getValorTotalDevidoPeloReclamado() {
        return this.appender.getValorTotalDebitoReclamado();
    }

    @Override
    public BigDecimal getValorTotalDebitosDosReclamantes() {
        return this.appender.getValorTotalDebitosDosReclamantes();
    }

    @Override
    public boolean getMostrarComentarios() {
        return false;
    }

    @Override
    public String getComentarios() {
        return null;
    }

    @Override
    public JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasCreditoReclamante() {
        return new JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter>(new OcorrenciaResumoPorProcessoPadrao(), this.appender.getItensCreditoReclamante());
    }

    @Override
    public BigDecimal getValorTotalCreditoReclamante() {
        return this.appender.getValorTotalCreditoReclamante();
    }

    @Override
    public JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasDebitoReclamante() {
        return new JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter>(new OcorrenciaResumoPorProcessoPadrao(), this.appender.getItensDebitoReclamante());
    }

    @Override
    public BigDecimal getValorTotalDebitoReclamante() {
        return this.appender.getValorTotalDebitoReclamante();
    }

    @Override
    public JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasDebitoCobrarReclamante() {
        return new JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter>(new OcorrenciaResumoPorProcessoPadrao(), this.appender.getItensDebitoCobrarReclamante());
    }

    @Override
    public BigDecimal getValorTotalDebitoCobrarReclamante() {
        return this.appender.getValorTotalDebitoCobrarReclamante();
    }

    @Override
    public BigDecimal getValorLiquidoReclamante() {
        return this.appender.getValorLiquidoReclamante();
    }

    @Override
    public JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasDebitoReclamado() {
        return new JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter>(new OcorrenciaResumoPorProcessoPadrao(), this.appender.getItensDebitoReclamado());
    }

    @Override
    public BigDecimal getValorTotalDebitoReclamado() {
        return this.appender.getValorTotalDebitoReclamado();
    }

    @Override
    public JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasCustasDebitoReclamado() {
        return new JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter>(new OcorrenciaResumoPorProcessoPadrao(), this.appender.getItensCustasDebitoReclamado());
    }

    @Override
    public BigDecimal getValorSubtotalCustasDebitoReclamado() {
        return this.appender.getValorSubtotalCustasDebitoReclamado();
    }

    @Override
    public JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter> getOcorrenciasVerbasForaDoPrincipal() {
        return new JRAdapterDataSource<ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter>(new OcorrenciaResumoPorProcessoPadrao(), this.appender.getItensForaDoPrincipal());
    }

    @Override
    public BigDecimal getValorTotalVerbasForaDoPrincipal() {
        return this.appender.getValorTotalVerbasForaDoPrincipal();
    }

    @Override
    public JRAdapterDataSource<JREmptyDS> getEmptyDS() {
        return new JRAdapterDataSource<JREmptyDS>(new JREmptyDS(), Arrays.asList(new Object()));
    }

    public class CustasFixasWrapper {
        private Date ocorrencia;
        private String tipo;
        private BigDecimal base;
        private Integer quantidade;
        private BigDecimal valor;
        private BigDecimal indiceDeCorrecao;
        private BigDecimal taxaDeJuros;

        public CustasFixasWrapper(Date ocorrencia, String tipo, BigDecimal base, Integer quantidade, BigDecimal valor, BigDecimal indiceDeCorrecao, BigDecimal taxaDeJuros) {
            this.ocorrencia = ocorrencia;
            this.tipo = tipo;
            this.base = base;
            this.quantidade = quantidade;
            this.valor = valor;
            this.indiceDeCorrecao = indiceDeCorrecao;
            this.taxaDeJuros = taxaDeJuros;
        }

        public Date getOcorrencia() {
            return this.ocorrencia;
        }

        public String getTipo() {
            return this.tipo;
        }

        public BigDecimal getBase() {
            return this.base;
        }

        public Integer getQuantidade() {
            return this.quantidade;
        }

        public BigDecimal getValor() {
            return this.valor;
        }

        public BigDecimal getIndiceDeCorrecao() {
            return this.indiceDeCorrecao;
        }

        public BigDecimal getValorCorrigido() {
            return Utils.aplicarCorrecaoMonetaria(this.indiceDeCorrecao, this.valor, BigDecimal.ZERO);
        }

        public BigDecimal getJuros() {
            return Utils.aplicarJuros(this.taxaDeJuros, this.getValorCorrigido(), BigDecimal.ZERO);
        }

        public BigDecimal getTotal() {
            return this.getValorCorrigido().add(this.getJuros(), Utils.CONTEXTO_MATEMATICO);
        }
    }

    public class OcorrenciaResumoPorProcessoComInformacoesAdicionaisPadrao
    extends ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoComInformacoesAdicionaisJRAdapter {
        private ResumoPorProcessoJRAdapter.ItemResumo item;

        @Override
        public OcorrenciaResumoPorProcessoComInformacoesAdicionaisPadrao adapt(Object adapted) {
            this.item = (ResumoPorProcessoJRAdapter.ItemResumo)adapted;
            return this;
        }

        @Override
        public String getDescricao() {
            return this.item.getLabel();
        }

        @Override
        public String getValor() {
            return this.item.getValorFormatado();
        }

        @Override
        public String getLiquido() {
            return this.item.getLiquidoFormatado();
        }

        @Override
        public String getTotalReclamado() {
            return this.item.getTotalReclamadoFormatado();
        }

        @Override
        public String getDebitos() {
            return this.item.getDebitosFormatado();
        }
    }

    public class OcorrenciaResumoPorProcessoPadrao
    extends ResumoPorProcessoJRAdapter.OcorrenciaResumoPorProcessoJRAdapter {
        private ResumoPorProcessoJRAdapter.ItemResumo item;

        @Override
        public OcorrenciaResumoPorProcessoPadrao adapt(Object adapted) {
            this.item = (ResumoPorProcessoJRAdapter.ItemResumo)adapted;
            return this;
        }

        @Override
        public String getDescricao() {
            return this.item.getLabel();
        }

        @Override
        public String getValor() {
            return this.item.getValorFormatado();
        }
    }
}

