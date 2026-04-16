/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.google.common.collect.Sets
 *  com.google.common.collect.Sets$SetView
 */
package br.jus.trt8.pjecalc.negocio.constantes;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.TipoRelatorioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosCobrarDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import com.google.common.collect.Sets;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public enum RelatorioPagamentoEnum {
    RESUMO_PRECATORIO(TipoRelatorioEnum.PAGAMENTO_CONSOLIDADO, "Resumo da Atualiza\u00e7\u00e3o Precat\u00f3rio / RPV", new String[]{"relatorios/atualizacao/resumo/precatorio/atualizacao-resumo.jrxml", "relatorios/atualizacao/resumo/precatorio/ocorrencias-resumo-debito-reclamado.jrxml", "relatorios/atualizacao/resumo/precatorio/ocorrencias-resumo-debito-cobrar-reclamante.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !Utils.nulo(calculo.getAtualizacao()) && calculo.getAtualizacao().getAtualizarRegraPrecatorio() != false;
        }
    }
    ,
    DEMONSTRATIVO_PRECATORIO(TipoRelatorioEnum.PAGAMENTO_CONSOLIDADO, "Atualiza\u00e7\u00e3o Precat\u00f3rio / RPV", new String[]{"relatorios/atualizacao/precatorio/atualizacao-precatorio.jrxml", "relatorios/atualizacao/precatorio/atualizacao-evento-precatorio.jrxml", "relatorios/atualizacao/precatorio/atualizacao-precatorio-grupos.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !Utils.nulo(calculo.getAtualizacao()) && calculo.getAtualizacao().getAtualizarRegraPrecatorio() != false;
        }
    }
    ,
    RESUMO_PAGAMENTO(TipoRelatorioEnum.PAGAMENTO_CONSOLIDADO, "Resumo da Atualiza\u00e7\u00e3o", new String[]{"relatorios/atualizacao/resumo/atualizacao-resumo.jrxml", "relatorios/atualizacao/resumo/ocorrencias-resumo-debito-reclamado.jrxml", "relatorios/atualizacao/resumo/ocorrencias-resumo-debito-cobrar-reclamante.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !Utils.nulo(calculo.getAtualizacao()) && calculo.getAtualizacao().getAtualizarRegraPrecatorio() == false;
        }
    }
    ,
    JUSTIFICATIVA(TipoRelatorioEnum.PAGAMENTO_CONSOLIDADO, "Crit\u00e9rio da Atualiza\u00e7\u00e3o e Fundamenta\u00e7\u00e3o Legal", new String[]{"relatorios/atualizacao/atualizacao-justificativas.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !Utils.nulo(calculo.getAtualizacao());
        }
    }
    ,
    DEMONSTRATIVO_PAGAMENTO(TipoRelatorioEnum.PAGAMENTO_CONSOLIDADO, "Atualiza\u00e7\u00e3o", new String[]{"relatorios/atualizacao/atualizacao-evento/atualizacao.jrxml", "relatorios/atualizacao/atualizacao-evento/atualizacao-evento.jrxml", "relatorios/atualizacao/atualizacao-evento/atualizacao-evento-credito-debito-outrodebito.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            return !Utils.nulo(calculo.getAtualizacao()) && calculo.getAtualizacao().getAtualizarRegraPrecatorio() == false;
        }
    }
    ,
    CONTRIBUICAO_SOCIAL_PAGAMENTO(TipoRelatorioEnum.PAGAMENTO_CONSOLIDADO, "Contribui\u00e7\u00e3o Social", new String[]{"relatorios/atualizacao/atualizacao-inss.jrxml", "relatorios/atualizacao/atualizacao-inss-evento.jrxml", "relatorios/atualizacao/atualizacao-inss-evento-ocorrencia.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            if (Utils.nulo(calculo.getAtualizacao()) || calculo.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                return false;
            }
            return calculo.getInss().existemDadosParaRelatorio();
        }
    }
    ,
    ESOCIAL_PAGAMENTO(TipoRelatorioEnum.PAGAMENTO_CONSOLIDADO, "eSocial - Evento S-2501", new String[]{"relatorios/atualizacao/atualizacao-esocial.jrxml", "relatorios/atualizacao/atualizacao-esocial-evento.jrxml", "relatorios/atualizacao/atualizacao-esocial-evento-ocorrencia.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            if (Utils.nulo(calculo.getAtualizacao()) || Utils.nulo(calculo.getPagamentos()) || calculo.getPagamentos().isEmpty() || calculo.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                return false;
            }
            return calculo.getInss().existemDadosParaRelatorio();
        }
    }
    ,
    IMPOSTO_DE_RENDA_PAGAMENTO(TipoRelatorioEnum.PAGAMENTO_CONSOLIDADO, "Imposto de Renda", new String[]{"relatorios/atualizacao/atualizacao-irpf.jrxml", "relatorios/atualizacao/atualizacao-irpf-evento.jrxml", "relatorios/atualizacao/atualizacao-irpf-evento-liquidacao.jrxml", "relatorios/atualizacao/atualizacao-irpf-evento-pagamento.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            if (Utils.nulo(calculo.getAtualizacao()) || calculo.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                return false;
            }
            if (calculo.getIrpf().getAbrangenciaDaApuracao() == -1 || !calculo.getIrpf().getApurarImpostoRenda().booleanValue()) {
                return Boolean.FALSE;
            }
            BigDecimal valorPrincipal = calculo.calculaValorVerbaParaCreditoDoReclamante(Boolean.TRUE);
            return Utils.naoNulo(valorPrincipal) && BigDecimal.ZERO.compareTo(valorPrincipal) != 0;
        }
    }
    ,
    IMPOSTO_DE_RENDA_HONORARIOS_PAGAMENTO(TipoRelatorioEnum.PAGAMENTO_CONSOLIDADO, "Imposto de Renda sobre Honor\u00e1rios", new String[]{"relatorios/atualizacao/atualizacao-irpf-honorarios.jrxml", "relatorios/atualizacao/atualizacao-irpf-honorarios-ocorrencia.jrxml", "relatorios/atualizacao/atualizacao-irpf-honorarios-ocorrencia-saldo.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            if (Utils.nulo(calculo.getAtualizacao()) || calculo.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                return false;
            }
            List<DebitosDoReclamante> todosDebitosDoReclamante = DebitosDoReclamante.obterTodos(calculo.getAtualizacao());
            for (DebitosDoReclamante debitosDoReclamante : todosDebitosDoReclamante) {
                Sets.SetView union = Sets.union(debitosDoReclamante.getHonorariosDaAtualizacaoCalculado(), debitosDoReclamante.getHonorariosDaAtualizacaoInformado());
                for (Object h : union) {
                    if (!((HonorarioDaAtualizacao)h).getHonorario().getApurarIRRF().booleanValue()) continue;
                    return true;
                }
            }
            List<OutrosDebitosReclamado> todosOutrosDebitosDoReclamado = OutrosDebitosReclamado.obterTodos(calculo.getAtualizacao());
            for (OutrosDebitosReclamado outrosDebitosDoReclamado : todosOutrosDebitosDoReclamado) {
                Sets.SetView union = Sets.union(outrosDebitosDoReclamado.getHonorariosDaAtualizacaoCalculado(), outrosDebitosDoReclamado.getHonorariosDaAtualizacaoInformado());
                for (HonorarioDaAtualizacao h : union) {
                    if (!h.getHonorario().getApurarIRRF().booleanValue()) continue;
                    return true;
                }
            }
            List<DebitosCobrarDoReclamante> list = DebitosCobrarDoReclamante.obterTodos(calculo.getAtualizacao());
            for (DebitosCobrarDoReclamante dcdr : list) {
                Sets.SetView union = Sets.union(dcdr.getHonorariosDaAtualizacaoCalculado(), dcdr.getHonorariosDaAtualizacaoInformado());
                for (HonorarioDaAtualizacao h : union) {
                    if (!h.getHonorario().getApurarIRRF().booleanValue()) continue;
                    return true;
                }
            }
            return false;
        }
    }
    ,
    CUSTAS_INCLUSAO(TipoRelatorioEnum.PAGAMENTO_CONSOLIDADO, "Custas Judiciais", new String[]{"relatorios/atualizacao/custa/atualizacao-custas.jrxml", "relatorios/atualizacao/custa/ocorrencias-custa-conhecimento.jrxml", "relatorios/atualizacao/custa/ocorrencias-custa-liquidacao.jrxml", "relatorios/atualizacao/custa/ocorrencias-custa-fixas.jrxml", "relatorios/atualizacao/custa/ocorrencias-custa-autos.jrxml", "relatorios/atualizacao/custa/ocorrencias-custa-armazenamento.jrxml"}){

        @Override
        public boolean isSelecionado(Calculo calculo) {
            if (Utils.nulo(calculo.getAtualizacao()) || calculo.getAtualizacao().getAtualizarRegraPrecatorio().booleanValue()) {
                return false;
            }
            List<CustasJudiciaisDaAtualizacao> custasDaAtualizacao = CustasJudiciaisDaAtualizacao.obterTodos(calculo.getAtualizacao());
            if (Utils.naoNulo(custasDaAtualizacao.isEmpty()) && !custasDaAtualizacao.isEmpty()) {
                for (CustasJudiciaisDaAtualizacao ca : custasDaAtualizacao) {
                    if (!ca.existemDadosParaRelatorio()) continue;
                    return true;
                }
            }
            return calculo.getCustasJudiciais().existemDadosParaRelatorio();
        }
    };

    private TipoRelatorioEnum tipo;
    private String nome;
    private String[] uri;
    private static final List<RelatorioPagamentoEnum> RELATORIOS_PAGAMENTO;

    private RelatorioPagamentoEnum(TipoRelatorioEnum tipo, String nome, String[] uri) {
        this.nome = nome;
        this.uri = uri;
        this.tipo = tipo;
    }

    public String getNome() {
        return this.nome;
    }

    public String[] getUri() {
        return this.uri;
    }

    public TipoRelatorioEnum getTipo() {
        return this.tipo;
    }

    public abstract boolean isSelecionado(Calculo var1);

    public boolean isTipoPagamentoConsolidado() {
        return this.tipo.equals((Object)TipoRelatorioEnum.PAGAMENTO_CONSOLIDADO);
    }

    public static List<RelatorioPagamentoEnum> getRelatoriosPagamento() {
        return RELATORIOS_PAGAMENTO;
    }

    static {
        RELATORIOS_PAGAMENTO = new ArrayList<RelatorioPagamentoEnum>();
        for (RelatorioPagamentoEnum r : RelatorioPagamentoEnum.values()) {
            if (!r.isTipoPagamentoConsolidado()) continue;
            RELATORIOS_PAGAMENTO.add(r);
        }
    }
}

