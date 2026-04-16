/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.constantes.CustasDevidasFixasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeConhecimentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeLiquidacaoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.Armazenamento;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.AutoJudicial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustaPaga;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CustaJRAdapter;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Set;

public class CustasJRAdapterPadrao
extends CustaJRAdapter {
    private CustaJRAdapter.CustaPeloReclamante custaPeloReclamante;
    private CustaJRAdapter.CustaPeloReclamado custaPeloReclamado;
    private String composicaoBase = "";

    public CustasJRAdapterPadrao() {
    }

    public CustasJRAdapterPadrao(Calculo calculo) {
        this();
        this.custaPeloReclamante = new CustaPeloReclamantePadrao(calculo.getCustasJudiciais());
        this.custaPeloReclamado = new CustaPeloReclamadoPadrao(calculo.getCustasJudiciais());
        this.composicaoBase = calculo.getCustasJudiciais().getBaseParaCustasCalculadas().getNome();
    }

    @Override
    public CustaJRAdapter.CustaPeloReclamante getCustaPeloReclamante() {
        return this.custaPeloReclamante;
    }

    @Override
    public CustaJRAdapter.CustaPeloReclamado getCustaPeloReclamado() {
        return this.custaPeloReclamado;
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    public class CustaInformadaPadrao
    extends CustaPadrao
    implements CustaJRAdapter.ICustaInformada {
        private BigDecimal indiceDeCorrecao;
        private BigDecimal valorCorrigido;
        private BigDecimal juros;

        private CustaInformadaPadrao(Date ocorrencia, BigDecimal baseOuValor, BigDecimal pisoOuTeto, BigDecimal total, BigDecimal indiceDeCorrecao, BigDecimal valorCorrigido, BigDecimal juros) {
            super(ocorrencia, baseOuValor, pisoOuTeto, total);
            this.indiceDeCorrecao = indiceDeCorrecao;
            this.valorCorrigido = valorCorrigido;
            this.juros = juros;
        }

        private CustaInformadaPadrao(CustasJudiciais custasJudiciais, boolean ehReclamante) {
            super(custasJudiciais, ehReclamante);
            this.indiceDeCorrecao = ehReclamante ? custasJudiciais.getIndiceCorrecaoCustasConhecimentoReclamante() : custasJudiciais.getIndiceCorrecaoCustasConhecimentoReclamado();
            this.valorCorrigido = ehReclamante ? custasJudiciais.getValorCorrigidoCustasConhecimentoReclamante() : custasJudiciais.getValorCorrigidoCustasConhecimentoReclamado();
            this.juros = ehReclamante ? custasJudiciais.getJurosCustasConhecimentoReclamante() : custasJudiciais.getJurosCustasConhecimentoReclamado();
        }

        @Override
        public BigDecimal getIndiceDeCorrecao() {
            return this.indiceDeCorrecao;
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.valorCorrigido;
        }

        @Override
        public BigDecimal getJuros() {
            return this.juros;
        }
    }

    public class CustaCalculadaPadrao
    extends CustaPadrao
    implements CustaJRAdapter.ICustaCalculada {
        private BigDecimal taxa;

        private CustaCalculadaPadrao(Date ocorrencia, BigDecimal baseOuValor, BigDecimal pisoOuTeto, BigDecimal total, BigDecimal taxa) {
            super(ocorrencia, baseOuValor, pisoOuTeto, total);
            this.taxa = taxa;
        }

        private CustaCalculadaPadrao(Date ocorrencia, BigDecimal baseOuValor, BigDecimal pisoOuTeto, BigDecimal teto, BigDecimal total, BigDecimal taxa) {
            super(ocorrencia, baseOuValor, pisoOuTeto, teto, total);
            this.taxa = taxa;
        }

        @Override
        public BigDecimal getTaxa() {
            return Utils.dividir(this.taxa, new BigDecimal("100"));
        }

        @Override
        public String getComposicaoBase() {
            return CustasJRAdapterPadrao.this.composicaoBase;
        }
    }

    public class CustaPadrao
    implements CustaJRAdapter.ICustas {
        private Date ocorrencia;
        private BigDecimal baseOuValor;
        private BigDecimal pisoOuTeto;
        private BigDecimal teto;
        private BigDecimal total;

        private CustaPadrao(Date ocorrencia, BigDecimal baseOuValor, BigDecimal pisoOuTeto, BigDecimal total) {
            this.ocorrencia = ocorrencia;
            this.baseOuValor = baseOuValor;
            this.pisoOuTeto = pisoOuTeto;
            this.total = total;
        }

        private CustaPadrao(Date ocorrencia, BigDecimal baseOuValor, BigDecimal pisoOuTeto, BigDecimal teto, BigDecimal total) {
            this.ocorrencia = ocorrencia;
            this.baseOuValor = baseOuValor;
            this.pisoOuTeto = pisoOuTeto;
            this.teto = teto;
            this.total = total;
        }

        private CustaPadrao(CustasJudiciais custasJudiciais, boolean ehReclamante) {
            this.ocorrencia = ehReclamante ? custasJudiciais.getDataVencimentoConhecimentoDoReclamante() : custasJudiciais.getDataVencimentoConhecimentoDoReclamado();
            this.baseOuValor = ehReclamante ? custasJudiciais.getValorDeConhecimentoDoReclamante() : custasJudiciais.getValorConhecimentoDoReclamado();
            this.pisoOuTeto = ehReclamante ? custasJudiciais.getPisoCustasConhecimentoReclamante() : custasJudiciais.getPisoCustasConhecimentoReclamado();
            this.teto = ehReclamante ? custasJudiciais.getTetoCustasConhecimentoReclamante() : custasJudiciais.getTetoCustasConhecimentoReclamado();
            this.total = ehReclamante ? custasJudiciais.getTotalCustasConhecimentoReclamanteInformada() : custasJudiciais.getTotalCustasConhecimentoReclamadoInformada();
        }

        @Override
        public Date getOcorrencia() {
            return this.ocorrencia;
        }

        @Override
        public BigDecimal getBaseOuValor() {
            return this.baseOuValor;
        }

        @Override
        public BigDecimal getPisoOuTeto() {
            return this.pisoOuTeto;
        }

        @Override
        public BigDecimal getTotal() {
            return this.total;
        }

        @Override
        public BigDecimal getTeto() {
            return this.teto;
        }
    }

    public class CustaRecolhidasOcorrenciaPadraoAdapter
    extends CustaJRAdapter.CustaRecolhidasOcorrenciaAdapter {
        private CustaPaga custaPaga;

        @Override
        public JRAdapter adapt(Object adapted) {
            this.custaPaga = (CustaPaga)adapted;
            return this;
        }

        @Override
        public Date getOcorrencia() {
            return this.custaPaga.getDataVencimento();
        }

        @Override
        public BigDecimal getValor() {
            return this.custaPaga.getValor();
        }

        @Override
        public BigDecimal getIndiceDeCorrecao() {
            return this.custaPaga.getIndiceCorrecao();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.custaPaga.getValorCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.custaPaga.getJuros();
        }

        @Override
        public BigDecimal getTotal() {
            return this.custaPaga.getTotal();
        }
    }

    public class CustaDiferencaPadrao
    extends CustaJRAdapter.CustaDiferenca {
        private CustasJudiciais custasJudiciais;
        private BigDecimal devido;
        private BigDecimal recolhido;

        private CustaDiferencaPadrao(CustasJudiciais custasJudiciais) {
            this.custasJudiciais = custasJudiciais;
            this.devido = BigDecimal.ZERO;
            this.recolhido = BigDecimal.ZERO;
        }

        public BigDecimal somarDevido(BigDecimal devido) {
            this.devido = Utils.somar(this.getDevido(), devido, this.getDevido());
            return this.devido;
        }

        public BigDecimal somarRecolhido(BigDecimal recolhido) {
            this.recolhido = Utils.somar(this.getRecolhido(), recolhido, this.getRecolhido());
            return this.recolhido;
        }

        @Override
        public Date getOcorrencia() {
            return this.custasJudiciais.getCalculo().getDataDeLiquidacao();
        }

        @Override
        public BigDecimal getDevido() {
            return this.devido;
        }

        @Override
        public BigDecimal getRecolhido() {
            return this.recolhido;
        }

        @Override
        public BigDecimal getDiferenca() {
            BigDecimal diferenca = Utils.subtrair(this.devido, this.recolhido);
            if (BigDecimal.ZERO.compareTo(diferenca) > 0) {
                return BigDecimal.ZERO;
            }
            return diferenca;
        }
    }

    public class CustaRecolhidasPadrao
    extends CustaJRAdapter.CustaRecolhidas {
        private Set<CustaPaga> custasPagas;

        private CustaRecolhidasPadrao(Set<CustaPaga> custasPagas) {
            this.custasPagas = custasPagas;
        }

        @Override
        public JRAdapterDataSource<CustaJRAdapter.CustaRecolhidasOcorrenciaAdapter> getOcorrencias() {
            return new JRAdapterDataSource<CustaJRAdapter.CustaRecolhidasOcorrenciaAdapter>(new CustaRecolhidasOcorrenciaPadraoAdapter(), this.custasPagas);
        }
    }

    public class CustaPeloReclamadoDevidasDeArmazenamentoOcorrenciaPadraoAdapter
    extends CustaJRAdapter.CustaPeloReclamadoDevidasDeArmazenamentoOcorrenciaAdapter {
        private Armazenamento armazenamento;
        private BigDecimal taxa = new BigDecimal("0.1");

        @Override
        public JRAdapter adapt(Object adapted) {
            this.armazenamento = (Armazenamento)adapted;
            return this;
        }

        @Override
        public Date getDataInicio() {
            return this.armazenamento.getDataInicioArmazenamento();
        }

        @Override
        public Date getDataFim() {
            return Utils.naoNulo(this.armazenamento.getDataTerminoArmazenamento()) ? this.armazenamento.getDataTerminoArmazenamento() : this.armazenamento.getCustasJudiciais().getCalculo().getDataDeLiquidacao();
        }

        @Override
        public BigDecimal getBase() {
            return this.armazenamento.getValorAvaliacaoArmazenamento();
        }

        @Override
        public BigDecimal getTaxa() {
            return Utils.dividir(this.taxa, new BigDecimal("100"));
        }

        @Override
        public Integer getQuantidade() {
            return this.armazenamento.getQtdeDias();
        }

        @Override
        public BigDecimal getValor() {
            return this.armazenamento.getValorCustasArmazenamento();
        }

        @Override
        public BigDecimal getIndiceDeCorrecao() {
            return this.armazenamento.getIndiceCorrecao();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.armazenamento.getValorCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.armazenamento.getJuros();
        }

        @Override
        public BigDecimal getTotal() {
            return this.armazenamento.getTotal();
        }
    }

    public class CustaPeloReclamadoDevidasDeAutosOcorrenciaPadraoAdapter
    extends CustaJRAdapter.CustaPeloReclamadoDevidasDeAutosOcorrenciaAdapter {
        private AutoJudicial autoJudicial;
        private BigDecimal taxa = new BigDecimal("5.0");

        @Override
        public JRAdapter adapt(Object adapted) {
            this.autoJudicial = (AutoJudicial)adapted;
            return this;
        }

        @Override
        public Date getOcorrencia() {
            return this.autoJudicial.getDataVencimentoAuto();
        }

        @Override
        public String getTipo() {
            return this.autoJudicial.getTipoDeAuto().getNome();
        }

        @Override
        public BigDecimal getBase() {
            return this.autoJudicial.getValorAvaliacaoAuto();
        }

        @Override
        public BigDecimal getTaxa() {
            return Utils.dividir(this.taxa, new BigDecimal("100"));
        }

        @Override
        public BigDecimal getValor() {
            return this.autoJudicial.getValorCustasAuto();
        }

        @Override
        public BigDecimal getIndiceDeCorrecao() {
            return this.autoJudicial.getIndiceCorrecao();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.autoJudicial.getValorCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.autoJudicial.getJuros();
        }

        @Override
        public BigDecimal getTeto() {
            return this.autoJudicial.getValorTeto();
        }

        @Override
        public BigDecimal getTotal() {
            return this.autoJudicial.getTotal();
        }
    }

    public class CustaPeloReclamadoDevidasFixasOcorrenciaPadraoAdapter
    extends CustaJRAdapter.CustaPeloReclamadoDevidasFixasOcorrenciaAdapter {
        private CustaPeloReclamadoDevidasFixasOcorrenciaPadraoWrapper custa;

        @Override
        public JRAdapter adapt(Object adapted) {
            this.custa = (CustaPeloReclamadoDevidasFixasOcorrenciaPadraoWrapper)adapted;
            return this;
        }

        @Override
        public Date getOcorrencia() {
            return this.custa.getOcorrencia();
        }

        @Override
        public String getTipo() {
            return this.custa.getTipo();
        }

        @Override
        public BigDecimal getBase() {
            return this.custa.getBase();
        }

        @Override
        public Integer getQuantidade() {
            return this.custa.getQuantidade();
        }

        @Override
        public BigDecimal getValor() {
            return this.custa.getValor();
        }

        @Override
        public BigDecimal getIndiceDeCorrecao() {
            return this.custa.getIndiceDeCorrecao();
        }

        @Override
        public BigDecimal getValorCorrigido() {
            return this.custa.getValorCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.custa.getJuros();
        }

        @Override
        public BigDecimal getTotal() {
            return this.custa.getTotal();
        }
    }

    public class CustaPeloReclamadoDevidasFixasOcorrenciaPadraoWrapper {
        private Date ocorrencia;
        private String tipo;
        private BigDecimal base;
        private Integer quantidade;
        private BigDecimal valor;
        private BigDecimal indiceDeCorrecao;
        private BigDecimal taxaDeJuros;

        public CustaPeloReclamadoDevidasFixasOcorrenciaPadraoWrapper(Date ocorrencia, String tipo, BigDecimal base, Integer quantidade, BigDecimal valor, BigDecimal indiceDeCorrecao, BigDecimal taxaDeJuros) {
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

    public class CustaPeloReclamadoDevidasDeArmazenamentoPadrao
    extends CustaJRAdapter.CustaPeloReclamadoDevidasDeArmazenamento {
        private CustasJudiciais custasJudiciais;

        private CustaPeloReclamadoDevidasDeArmazenamentoPadrao(CustasJudiciais custasJudiciais) {
            this.custasJudiciais = custasJudiciais;
        }

        @Override
        public JRAdapterDataSource<CustaJRAdapter.CustaPeloReclamadoDevidasDeArmazenamentoOcorrenciaAdapter> getOcorrencias() {
            return new JRAdapterDataSource<CustaJRAdapter.CustaPeloReclamadoDevidasDeArmazenamentoOcorrenciaAdapter>(new CustaPeloReclamadoDevidasDeArmazenamentoOcorrenciaPadraoAdapter(), this.custasJudiciais.getArmazenamentosDoCalculo());
        }
    }

    public class CustaPeloReclamadoDevidasDeAutosPadrao
    extends CustaJRAdapter.CustaPeloReclamadoDevidasDeAutos {
        private CustasJudiciais custasJudiciais;

        private CustaPeloReclamadoDevidasDeAutosPadrao(CustasJudiciais custasJudiciais) {
            this.custasJudiciais = custasJudiciais;
        }

        @Override
        public JRAdapterDataSource<CustaJRAdapter.CustaPeloReclamadoDevidasDeAutosOcorrenciaAdapter> getOcorrencias() {
            return new JRAdapterDataSource<CustaJRAdapter.CustaPeloReclamadoDevidasDeAutosOcorrenciaAdapter>(new CustaPeloReclamadoDevidasDeAutosOcorrenciaPadraoAdapter(), this.custasJudiciais.getAutosJudiciaisDoCalculo());
        }
    }

    public class CustaPeloReclamadoDevidasFixasPadrao
    extends CustaJRAdapter.CustaPeloReclamadoDevidasFixas {
        private List<CustaPeloReclamadoDevidasFixasOcorrenciaPadraoWrapper> custasDevidasFixas = new ArrayList<CustaPeloReclamadoDevidasFixasOcorrenciaPadraoWrapper>();

        private CustaPeloReclamadoDevidasFixasPadrao() {
        }

        public List<CustaPeloReclamadoDevidasFixasOcorrenciaPadraoWrapper> getCustasDevidasFixas() {
            return this.custasDevidasFixas;
        }

        @Override
        public JRAdapterDataSource<CustaJRAdapter.CustaPeloReclamadoDevidasFixasOcorrenciaAdapter> getOcorrencias() {
            return new JRAdapterDataSource<CustaJRAdapter.CustaPeloReclamadoDevidasFixasOcorrenciaAdapter>(new CustaPeloReclamadoDevidasFixasOcorrenciaPadraoAdapter(), this.custasDevidasFixas);
        }
    }

    public class CustaPeloReclamadoDevidasPadrao
    extends CustaJRAdapter.CustaPeloReclamadoDevidas {
        private CustasJudiciais custasJudiciais;
        private CustaJRAdapter.ICustas custaDeConhecimento;
        private CustaJRAdapter.ICustas custaDeLiquidacao;
        private CustaJRAdapter.CustaPeloReclamadoDevidasFixas custaDevidasFixas;
        private CustaJRAdapter.CustaPeloReclamadoDevidasDeAutos custaDevidasDeAutos;
        private CustaPeloReclamadoDevidasDeArmazenamentoPadrao custaDevidasDeArmazenamento;

        public CustaPeloReclamadoDevidasPadrao(CustasJudiciais custasJudiciais, CustaDiferencaPadrao custaDiferenca) {
            this.custasJudiciais = custasJudiciais;
            if (this.getMostrarConhecimentoCalculada().booleanValue()) {
                this.custaDeConhecimento = new CustaCalculadaPadrao(custasJudiciais.getDataVencimentoConhecimentoDoReclamado(), custasJudiciais.getValorBaseCustasCalculadas(), custasJudiciais.getPisoCustasConhecimentoReclamado(), custasJudiciais.getTetoCustasConhecimentoReclamado(), custasJudiciais.getTotalCustasConhecimentoReclamadoCalculada(), CustasJudiciais.TAXA_RECLAMADO_CONHECIMENTO);
                custaDiferenca.somarDevido(custasJudiciais.getTotalCustasConhecimentoReclamadoCalculada());
            } else if (this.getMostrarConhecimentoInformada().booleanValue()) {
                this.custaDeConhecimento = new CustaInformadaPadrao(custasJudiciais, Boolean.FALSE);
                custaDiferenca.somarDevido(custasJudiciais.getTotalCustasConhecimentoReclamadoInformada());
            }
            if (this.getMostrarLiquidacaoCalculada().booleanValue()) {
                this.custaDeLiquidacao = new CustaCalculadaPadrao(custasJudiciais.getDataVencimentoCustasDeLiquidacao(), custasJudiciais.getValorBaseCustasCalculadas(), custasJudiciais.getTetoCustasLiquidacao(), custasJudiciais.getTotalCustasLiquidacaoReclamadoCalculada(), CustasJudiciais.TAXA_RECLAMADO_LIQUIDACAO);
                custaDiferenca.somarDevido(custasJudiciais.getTotalCustasLiquidacaoReclamadoCalculada());
            } else if (this.getMostrarLiquidacaoInformada().booleanValue()) {
                this.custaDeLiquidacao = new CustaInformadaPadrao(custasJudiciais.getDataVencimentoCustasDeLiquidacao(), custasJudiciais.getValorCustasDeLiquidacao(), custasJudiciais.getTetoCustasLiquidacao(), custasJudiciais.getTotalCustasLiquidacaoReclamadoInformada(), custasJudiciais.getIndiceCorrecaoCustasLiquidacao(), custasJudiciais.getValorCorrigidoCustasLiquidacao(), custasJudiciais.getJurosCustasLiquidacao());
                custaDiferenca.somarDevido(custasJudiciais.getTotalCustasLiquidacaoReclamadoInformada());
            }
            this.custaDevidasFixas = new CustaPeloReclamadoDevidasFixasPadrao();
            for (CustasDevidasFixasEnum custasDevidasFixasEnum : CustasDevidasFixasEnum.values()) {
                CustaPeloReclamadoDevidasFixasOcorrenciaPadraoWrapper fixa = new CustaPeloReclamadoDevidasFixasOcorrenciaPadraoWrapper(custasJudiciais.getDataVencimentoCustasFixas(), custasDevidasFixasEnum.getDescricao(), custasDevidasFixasEnum.getBase(custasJudiciais), custasDevidasFixasEnum.getQuantidade(custasJudiciais), custasDevidasFixasEnum.getValor(custasJudiciais), custasJudiciais.getIndiceCorrecaoCustasFixas(), custasJudiciais.getTaxaJurosCustasFixas());
                if (fixa.getTotal() == null || fixa.getTotal().compareTo(BigDecimal.ZERO) == 0) continue;
                ((CustaPeloReclamadoDevidasFixasPadrao)this.custaDevidasFixas).getCustasDevidasFixas().add(fixa);
                custaDiferenca.somarDevido(fixa.getTotal());
            }
            this.custaDevidasDeAutos = new CustaPeloReclamadoDevidasDeAutosPadrao(custasJudiciais);
            for (AutoJudicial autoJudicial : custasJudiciais.getAutosJudiciaisDoCalculo()) {
                custaDiferenca.somarDevido(autoJudicial.getTotal());
            }
            this.custaDevidasDeArmazenamento = new CustaPeloReclamadoDevidasDeArmazenamentoPadrao(custasJudiciais);
            for (Armazenamento armazenamento : custasJudiciais.getArmazenamentosDoCalculo()) {
                custaDiferenca.somarDevido(armazenamento.getTotal());
            }
        }

        @Override
        public Boolean getMostrarConhecimentoCalculada() {
            return TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamado());
        }

        @Override
        public Boolean getMostrarConhecimentoInformada() {
            return TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamado());
        }

        @Override
        public Boolean getMostrarLiquidacaoCalculada() {
            return TipoDeCustasDeLiquidacaoEnum.CALCULADA_MEIO_POR_CENTO.equals((Object)this.custasJudiciais.getTipoDeCustasDeLiquidacao());
        }

        @Override
        public Boolean getMostrarLiquidacaoInformada() {
            return TipoDeCustasDeLiquidacaoEnum.INFORMADA.equals((Object)this.custasJudiciais.getTipoDeCustasDeLiquidacao());
        }

        @Override
        public CustaJRAdapter.CustaPeloReclamadoDevidasFixas getFixas() {
            return this.custaDevidasFixas;
        }

        @Override
        public CustaJRAdapter.CustaPeloReclamadoDevidasDeAutos getDeAutos() {
            return this.custaDevidasDeAutos;
        }

        @Override
        public CustaJRAdapter.CustaPeloReclamadoDevidasDeArmazenamento getDeArmazenamento() {
            return this.custaDevidasDeArmazenamento;
        }

        @Override
        public CustaJRAdapter.ICustas getDeConhecimento() {
            return this.custaDeConhecimento;
        }

        @Override
        public CustaJRAdapter.ICustas getDeLiquidacao() {
            return this.custaDeLiquidacao;
        }
    }

    public class CustaPeloReclamadoPadrao
    extends CustaJRAdapter.CustaPeloReclamado {
        private CustaJRAdapter.CustaPeloReclamadoDevidas custaDevidasPadrao;
        private CustaJRAdapter.CustaRecolhidas custaRecolhidas;
        private CustaDiferencaPadrao custaDiferenca;

        public CustaPeloReclamadoPadrao(CustasJudiciais custasJudiciais) {
            this.custaDiferenca = new CustaDiferencaPadrao(custasJudiciais);
            this.custaDevidasPadrao = new CustaPeloReclamadoDevidasPadrao(custasJudiciais, this.custaDiferenca);
            this.custaRecolhidas = new CustaRecolhidasPadrao(custasJudiciais.getCustasPagasDoReclamado());
            for (CustaPaga custaPaga : custasJudiciais.getCustasPagasDoReclamado()) {
                this.custaDiferenca.somarRecolhido(custaPaga.getTotal());
            }
        }

        @Override
        public CustaJRAdapter.CustaPeloReclamadoDevidas getDevidas() {
            return this.custaDevidasPadrao;
        }

        @Override
        public CustaJRAdapter.CustaRecolhidas getRecolhidas() {
            return this.custaRecolhidas;
        }

        @Override
        public CustaJRAdapter.CustaDiferenca getDiferenca() {
            return this.custaDiferenca;
        }
    }

    public class CustaPeloReclamantePadrao
    extends CustaJRAdapter.CustaPeloReclamante {
        private CustasJudiciais custasJudiciais;
        private CustaJRAdapter.ICustas devidas;
        private CustaJRAdapter.CustaRecolhidas custaRecolhidas;
        private CustaDiferencaPadrao custaDiferenca;

        public CustaPeloReclamantePadrao(CustasJudiciais custasJudiciais) {
            this.custasJudiciais = custasJudiciais;
            this.custaDiferenca = new CustaDiferencaPadrao(custasJudiciais);
            if (this.getMostrarCalculada().booleanValue()) {
                this.devidas = new CustaCalculadaPadrao(custasJudiciais.getDataVencimentoConhecimentoDoReclamante(), custasJudiciais.getValorBaseCustasCalculadas(), custasJudiciais.getPisoCustasConhecimentoReclamante(), custasJudiciais.getTetoCustasConhecimentoReclamante(), custasJudiciais.getTotalCustasConhecimentoReclamanteCalculada(), CustasJudiciais.TAXA_RECLAMANTE_CONHECIMENTO);
                this.custaDiferenca.somarDevido(custasJudiciais.getTotalCustasConhecimentoReclamanteCalculada());
            } else if (this.getMostrarInformada().booleanValue()) {
                this.devidas = new CustaInformadaPadrao(custasJudiciais, Boolean.TRUE);
                this.custaDiferenca.somarDevido(custasJudiciais.getTotalCustasConhecimentoReclamanteInformada());
            }
            this.custaRecolhidas = new CustaRecolhidasPadrao(custasJudiciais.getCustasPagasDoReclamante());
            for (CustaPaga custaPaga : custasJudiciais.getCustasPagasDoReclamante()) {
                this.custaDiferenca.somarRecolhido(custaPaga.getTotal());
            }
        }

        @Override
        public Boolean getNaoSeAplica() {
            return TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA.equals((Object)this.custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamante());
        }

        @Override
        public Boolean getMostrarCalculada() {
            return TipoDeCustasDeConhecimentoEnum.CALCULADA_2_POR_CENTO.equals((Object)this.custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamante());
        }

        @Override
        public Boolean getMostrarInformada() {
            return TipoDeCustasDeConhecimentoEnum.INFORMADA.equals((Object)this.custasJudiciais.getTipoDeCustasDeConhecimentoDoReclamante());
        }

        @Override
        public CustaJRAdapter.ICustas getDevidas() {
            return this.devidas;
        }

        @Override
        public CustaJRAdapter.CustaRecolhidas getRecolhidas() {
            return this.custaRecolhidas;
        }

        @Override
        public CustaJRAdapter.CustaDiferenca getDiferenca() {
            return this.custaDiferenca;
        }
    }
}

