/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacao
 *  javax.persistence.EntityManager
 *  org.hibernate.Session
 *  org.jboss.seam.Component
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.In
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Observer
 *  org.jboss.seam.annotations.Scope
 *  org.jboss.seam.annotations.Synchronized
 *  org.jboss.seam.contexts.Contexts
 *  org.slf4j.Logger
 *  org.slf4j.LoggerFactory
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.base.comum.Aplicacao;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.Attachment;
import br.jus.trt8.pjecalc.integracao.dto.exporta.PJeCalcImportacao;
import br.jus.trt8.pjecalc.negocio.comum.Exportador;
import br.jus.trt8.pjecalc.negocio.comum.Importador;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.InfraException;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCalculoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCustasDeConhecimentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoRegistroCalculoWS;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.HistoricoValidacaoDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ItemPontoFacultativo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.HonorarioVerbaDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.AliquotaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCustas;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.participante.Reclamado;
import br.jus.trt8.pjecalc.negocio.dominio.participante.Reclamante;
import br.jus.trt8.pjecalc.negocio.dominio.processo.Advogado;
import br.jus.trt8.pjecalc.negocio.dominio.processo.Processo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.usuario.Usuario;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.CartaoDePontoDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.ValeTransporteDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.persistence.EntityManager;
import org.hibernate.Session;
import org.jboss.seam.Component;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Observer;
import org.jboss.seam.annotations.Scope;
import org.jboss.seam.annotations.Synchronized;
import org.jboss.seam.contexts.Contexts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Name(value="servicoDeCalculo")
@Scope(value=ScopeType.SESSION)
@AutoCreate
@Synchronized(timeout=20000L)
public class ServicoDeCalculo
implements Serializable {
    private static final long serialVersionUID = 228310209351132172L;
    private static final String NOME_CALCULO = "calculoAberto";
    private final Logger logger = LoggerFactory.getLogger(ServicoDeCalculo.class);
    @In
    private Aplicacao aplicacao;
    @In
    protected EntityManager entityManager;

    public static ServicoDeCalculo getInstancia() {
        return (ServicoDeCalculo)Component.getInstance(ServicoDeCalculo.class);
    }

    @Observer(value={"isCalculoAberto"})
    public boolean isCalculoAberto() {
        return Contexts.getSessionContext().isSet(NOME_CALCULO);
    }

    @Observer(value={"abrirCalculo"})
    public void abrirCalculo(Calculo calculo) {
        Contexts.getSessionContext().set(NOME_CALCULO, (Object)calculo);
        Usuario.registrarCalculoAberto(calculo.getId(), calculo.getProcesso().getReclamante().getNome(), calculo.getProcesso().getIdentificacao(), this.aplicacao.isVersaoOnline(), calculo.isCalculoExterno());
    }

    @Observer(value={"fecharCalculo"})
    public void fecharCalculo() {
        Contexts.getSessionContext().remove(NOME_CALCULO);
    }

    @Observer(value={"obterCalculoAberto"})
    public Calculo obterCalculoAberto() {
        Calculo calculo = (Calculo)Contexts.getSessionContext().get(NOME_CALCULO);
        if (Utils.nulo(calculo)) {
            return null;
        }
        if (!calculo.isAtachado()) {
            calculo = (Calculo)calculo.restaurar();
            Contexts.getSessionContext().set(NOME_CALCULO, (Object)calculo);
        }
        return calculo;
    }

    public Set<Ferias> obterFeriasDoCalculo() {
        Calculo calculo = this.obterCalculoAberto();
        if (Utils.nulo(calculo.getListaDeFerias())) {
            return new HashSet<Ferias>();
        }
        if (calculo.getListaDeFerias().isEmpty()) {
            calculo.gerarPeriodosDeFerias();
        }
        return calculo.getListaDeFerias();
    }

    public Fgts obterFgtsDoCalculo(boolean flush) {
        Calculo calculo = this.obterCalculoAberto();
        return calculo.criarFgtsSeNaoExistir(flush);
    }

    public Inss obterInssDoCalculo() {
        Calculo calculo = this.obterCalculoAberto();
        return calculo.getInss();
    }

    public ParametrosDeAtualizacao obterParametrosDeAtualizacao() {
        Calculo calculo = this.obterCalculoAberto();
        return calculo.getParametrosDeAtualizacao();
    }

    public CustasJudiciais obterCustasJudiciaisDoCalculo() {
        Calculo calculo = this.obterCalculoAberto();
        return calculo.getCustasJudiciais();
    }

    public Irpf obterIrpfDoCalculo() {
        Calculo calculo = this.obterCalculoAberto();
        return calculo.getIrpf();
    }

    public SalarioFamilia obterSalarioFamiliaDoCalculo() {
        Calculo calculo = this.obterCalculoAberto();
        return calculo.getSalarioFamilia();
    }

    public Attachment exportarCalculo(String nome, PJeCalcImportacao pjecalcImportacao) {
        Calculo calculo;
        calculo.setHashCalculoCorreto(Utils.naoNulo((calculo = this.obterCalculoAberto()).getHashCodeLiquidacao()) && calculo.getHashCodeLiquidacao().equals(calculo.calcularHashCodeDaLiquidacao()));
        calculo.setHashAtualizacaoCorreto(Utils.naoNulo(calculo.getAtualizacao()) && Utils.naoNulo(calculo.getAtualizacao().getHashCodeLiquidacao()) && calculo.getAtualizacao().getHashCodeLiquidacao().equals(calculo.calcularHashCodeExpandidoDoCalculo()));
        return Exportador.exportar(calculo, nome, pjecalcImportacao);
    }

    public Calculo importarCalculo(byte[] dados) {
        Calculo calculo = Importador.importar(dados);
        try {
            calculo = this.configurarCalculoParaDependencias(calculo, false);
        }
        catch (RuntimeException e) {
            new InfraException(e, new MensagemDeRecurso(Mensagens.MSG0072, new Object[0]));
        }
        try {
            this.tratarExcecoesDo(calculo);
            for (HistoricoValidacaoDoCalculo h : calculo.getHistoricosValidacao()) {
                h.setTipoValidacaoCalculo(TipoRegistroCalculoWS.CALCULO);
            }
            for (HistoricoValidacaoDoCalculo h : calculo.getHistoricosValidacaoAtualizacao()) {
                h.setTipoValidacaoCalculo(TipoRegistroCalculoWS.ATUALIZACAO);
            }
            if (Utils.naoNulo(calculo.getHashCalculoCorreto()) && calculo.getHashCalculoCorreto().booleanValue()) {
                calculo.setHashCodeLiquidacao(calculo.calcularHashCodeDaLiquidacao());
            }
            if (Utils.naoNulo(calculo.getHashAtualizacaoCorreto()) && calculo.getHashAtualizacaoCorreto().booleanValue()) {
                calculo.getAtualizacao().setHashCodeLiquidacao(calculo.calcularHashCodeExpandidoDoCalculo());
            }
            calculo.salvar();
        }
        catch (Exception e) {
            this.logger.error(e.getMessage(), (Throwable)e);
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0072, new Object[0]));
        }
        return calculo;
    }

    private void tratarExcecoesDo(Calculo calculo) {
        ArrayList<VerbaDeCalculo> verbasAAdicionar = new ArrayList<VerbaDeCalculo>();
        for (VerbaDeCalculo verba : calculo.getVerbas()) {
            this.verificarAdicaoDeVerba(calculo, verbasAAdicionar, verba);
        }
        this.tratarHonorarios(calculo, verbasAAdicionar);
        for (VerbaDeCalculo verba : verbasAAdicionar) {
            calculo.getVerbas().add(verba);
        }
        this.tratarVinculoDeCartoesDePonto(calculo);
    }

    private void verificarAdicaoDeVerba(Calculo calculo, List<VerbaDeCalculo> verbasAAdicionar, VerbaDeCalculo verba) {
        if (!verba.isInformada() && Utils.naoNulo(((FormulaReflexo)verba.getFormula()).getBaseVerba())) {
            for (ItemBaseVerba item : ((FormulaReflexo)verba.getFormula()).getBaseVerba().getItens()) {
                if (calculo.getVerbas().contains(item.getVerbaDeCalculo())) continue;
                verbasAAdicionar.add(item.getVerbaDeCalculo());
            }
        }
    }

    private void tratarVinculoDeCartoesDePonto(Calculo calculo) {
        ArrayList<CartaoDePontoDaVerba> cpvARemover = new ArrayList<CartaoDePontoDaVerba>();
        for (VerbaDeCalculo verba : calculo.getVerbas()) {
            for (CartaoDePontoDaVerba cpv : verba.getCartoesDePontoDaVerbaDivisor()) {
                if (cpv.getCartaoDePonto() != null) continue;
                cpvARemover.add(cpv);
            }
            verba.getCartoesDePontoDaVerbaDivisor().removeAll(cpvARemover);
            cpvARemover.clear();
            for (CartaoDePontoDaVerba cpv : verba.getCartoesDePontoDaVerbaQuantidade()) {
                if (cpv.getCartaoDePonto() != null) continue;
                cpvARemover.add(cpv);
            }
            verba.getCartoesDePontoDaVerbaQuantidade().removeAll(cpvARemover);
            cpvARemover.clear();
        }
    }

    private void tratarHonorarios(Calculo calculo, List<VerbaDeCalculo> verbasAAdicionar) {
        if (calculo.getHonorarios() == null) {
            return;
        }
        for (Honorario honorario : calculo.getHonorarios()) {
            if (honorario.getVerbasSelecionadas() == null || honorario.getVerbasSelecionadas().isEmpty()) continue;
            this.checarVerbasBaseDeHonorario(calculo, honorario, verbasAAdicionar);
        }
    }

    private void checarVerbasBaseDeHonorario(Calculo calculo, Honorario honorario, List<VerbaDeCalculo> verbasAAdicionar) {
        for (HonorarioVerbaDeCalculo hvc : honorario.getVerbasSelecionadas()) {
            if (calculo.getVerbas().contains(hvc.getVerbaDeCalculo())) continue;
            verbasAAdicionar.add(hvc.getVerbaDeCalculo());
        }
    }

    public Calculo importarCalculoWebService(String usuarioCriadorCPF, byte[] dados, Processo processo, Reclamante reclamante, Reclamado reclamado, Integer setor, char tipoCalculo, List<Advogado> listaDeAdvogadosReclamante, List<Advogado> listaDeAdvogadosReclamado) {
        Calculo calculo = Importador.importar(dados);
        try {
            calculo = this.configurarCalculoParaDependencias(calculo, false);
            calculo.setValidado(true);
            calculo.setUsuarioCriador(usuarioCriadorCPF);
            calculo.setProcesso(processo);
            calculo.getProcesso().setReclamante(reclamante);
            calculo.getProcesso().setReclamado(reclamado);
            calculo.getSetor().setId(setor);
            switch (tipoCalculo) {
                case 'G': {
                    calculo.setTipoCalculo(TipoCalculoEnum.GABINETE);
                    break;
                }
                case 'V': {
                    calculo.setTipoCalculo(TipoCalculoEnum.VARA);
                    break;
                }
                case 'C': {
                    calculo.setTipoCalculo(TipoCalculoEnum.CREDOR);
                    break;
                }
                case 'D': {
                    calculo.setTipoCalculo(TipoCalculoEnum.DEVEDOR);
                    break;
                }
                default: {
                    calculo.setTipoCalculo(TipoCalculoEnum.ADVOGADO);
                }
            }
            for (Advogado advogadoReclamado : listaDeAdvogadosReclamado) {
                calculo.getProcesso().adicionarAdvogadoReclamado(advogadoReclamado);
            }
            for (Advogado advogadoReclamante : listaDeAdvogadosReclamante) {
                calculo.getProcesso().adicionarAdvogadoReclamado(advogadoReclamante);
            }
            calculo.getProcesso().setAdvogadosReclamado(listaDeAdvogadosReclamado);
            calculo.getProcesso().setAdvogadosReclamante(listaDeAdvogadosReclamante);
        }
        catch (RuntimeException e) {
            new InfraException(e, new MensagemDeRecurso(Mensagens.MSG0072, new Object[0]));
        }
        try {
            calculo.salvar(true);
        }
        catch (NegocioException e) {
            this.logger.error(e.getMessage(), (Throwable)e);
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0072, new Object[0]));
        }
        return calculo;
    }

    private Calculo configurarCalculoParaDependencias(Calculo calculo, boolean resetarDadosDoProcesso) {
        if (resetarDadosDoProcesso) {
            calculo.getProcesso().setNumeroProcesso(null);
            calculo.getProcesso().setDigitoProcesso(null);
            calculo.getProcesso().setAnoProcesso(null);
            calculo.getProcesso().setRegiao(null);
            calculo.getProcesso().setVaraProcesso(null);
            calculo.getProcesso().getReclamante().setNome(null);
            calculo.getProcesso().getReclamante().setTipoDocumentoFiscal(null);
            calculo.getProcesso().getReclamante().setNumeroDocumentoFiscal(null);
            calculo.getProcesso().getReclamante().setTipoDocumentoPrevidenciario(null);
            calculo.getProcesso().getAdvogadosReclamante().clear();
            calculo.getProcesso().getReclamante().setNumeroDocumentoPrevidenciario(null);
            calculo.getProcesso().getReclamado().setNome(null);
            calculo.getProcesso().getReclamado().setTipoDocumentoFiscal(null);
            calculo.getProcesso().getReclamado().setNumeroDocumentoFiscal(null);
            calculo.getProcesso().getAdvogadosReclamado().clear();
        }
        calculo.setProcessoInformadoManualmente(Boolean.TRUE);
        calculo.getInss().setCalculo(calculo);
        calculo.getInss().getInssSobreSalariosDevidos().setInss(calculo.getInss());
        calculo.getInss().getInssSobreSalariosPagos().setInss(calculo.getInss());
        calculo.getFgts().setCalculo(calculo);
        if (Utils.nulos(calculo.getFgts().getPeriodoInicial(), calculo.getFgts().getPeriodoFinal())) {
            calculo.getFgts().sugerirValores();
        }
        calculo.getPrevidenciaPrivada().setCalculo(calculo);
        calculo.getPensaoAlimenticia().setCalculo(calculo);
        calculo.getParametrosDeAtualizacao().setCalculo(calculo);
        calculo.getIrpf().setCalculo(calculo);
        calculo.getHistoricosSalariais();
        for (VerbaDeCalculo verbaDeCalculo : calculo.getVerbas()) {
            ArrayList<ValeTransporteDaVerba> valesARemover = new ArrayList<ValeTransporteDaVerba>();
            for (ValeTransporteDaVerba valeTransporte : verbaDeCalculo.getValesTransportesDoValorDevido()) {
                if (!Utils.nulo(valeTransporte.getValeTransporte())) continue;
                valesARemover.add(valeTransporte);
            }
            for (ValeTransporteDaVerba valeTransporte : valesARemover) {
                verbaDeCalculo.getValesTransportesDoValorDevido().remove(valeTransporte);
            }
            valesARemover = new ArrayList();
            for (ValeTransporteDaVerba valeTransporte : verbaDeCalculo.getValesTransportesDoValorPago()) {
                if (!Utils.nulo(valeTransporte.getValeTransporte())) continue;
                valesARemover.add(valeTransporte);
            }
            for (ValeTransporteDaVerba valeTransporte : valesARemover) {
                verbaDeCalculo.getValesTransportesDoValorPago().remove(valeTransporte);
            }
            if (!(verbaDeCalculo instanceof Reflexo)) continue;
            for (ItemBaseVerba itemBaseVerba : ((FormulaReflexo)verbaDeCalculo.getFormula()).getBaseVerba().getItens()) {
                if (!itemBaseVerba.getVerbaDeCalculo().isPrincipal()) continue;
                valesARemover = new ArrayList();
                for (ValeTransporteDaVerba valeTransporte : itemBaseVerba.getVerbaDeCalculo().getValesTransportesDoValorDevido()) {
                    if (!Utils.nulo(valeTransporte.getValeTransporte())) continue;
                    valesARemover.add(valeTransporte);
                }
                for (ValeTransporteDaVerba valeTransporte : valesARemover) {
                    itemBaseVerba.getVerbaDeCalculo().getValesTransportesDoValorDevido().remove(valeTransporte);
                }
                valesARemover = new ArrayList();
                for (ValeTransporteDaVerba valeTransporte : itemBaseVerba.getVerbaDeCalculo().getValesTransportesDoValorPago()) {
                    if (!Utils.nulo(valeTransporte.getValeTransporte())) continue;
                    valesARemover.add(valeTransporte);
                }
                for (ValeTransporteDaVerba valeTransporte : valesARemover) {
                    itemBaseVerba.getVerbaDeCalculo().getValesTransportesDoValorPago().remove(valeTransporte);
                }
            }
        }
        calculo.getSalarioFamilia().setCalculo(calculo);
        calculo.getCustasJudiciais().setCalculo(calculo);
        ArrayList<ItemPontoFacultativo> itensARemover = new ArrayList<ItemPontoFacultativo>();
        for (ItemPontoFacultativo item : calculo.getPontosFacultativos()) {
            if (!Utils.nulo(item.getPontoFacultativo())) continue;
            itensARemover.add(item);
        }
        for (ItemPontoFacultativo item : itensARemover) {
            calculo.getPontosFacultativos().remove(item);
        }
        return calculo;
    }

    public Calculo duplicarCalculo(Calculo calculo) {
        String nome = "calculoTemp";
        Attachment calculoTemp = Exportador.exportar(calculo, nome);
        Calculo novoCalculo = Importador.importar(calculoTemp.getData());
        String hashCodeAtual = calculo.calcularHashCodeDaLiquidacao();
        boolean hashCorreto = Boolean.FALSE;
        if (Utils.naoNulo(calculo.getHashCodeLiquidacao()) && calculo.getHashCodeLiquidacao().equals(hashCodeAtual)) {
            hashCorreto = Boolean.TRUE;
        }
        String hashCodeAtualizacaoAtual = calculo.calcularHashCodeExpandidoDoCalculo();
        boolean hashAtualizacaoCorreto = Boolean.FALSE;
        if (Utils.naoNulo(calculo.getAtualizacao()) && Utils.naoNulo(calculo.getAtualizacao().getHashCodeLiquidacao()) && calculo.getAtualizacao().getHashCodeLiquidacao().equals(hashCodeAtualizacaoAtual)) {
            hashAtualizacaoCorreto = Boolean.TRUE;
        }
        novoCalculo = this.configurarCalculoParaDependencias(novoCalculo, Boolean.FALSE);
        this.tratarExcecoesDo(novoCalculo);
        novoCalculo.setValidado(Boolean.FALSE);
        novoCalculo.setHistoricosValidacao(new HashSet<HistoricoValidacaoDoCalculo>());
        novoCalculo.setCalculoExterno(calculo.isCalculoExterno());
        novoCalculo.salvar();
        if (hashCorreto) {
            calculo.setVersao(calculo.getVersao() + 1L);
            calculo.setHashCodeLiquidacao(calculo.calcularHashCodeDaLiquidacao());
            if (hashAtualizacaoCorreto) {
                calculo.getAtualizacao().setHashCodeLiquidacao(calculo.calcularHashCodeExpandidoDoCalculo());
            }
            calculo.setVersao(calculo.getVersao() - 1L);
            calculo.salvar();
        }
        return novoCalculo;
    }

    public void limparSessao() {
        if (((Session)this.entityManager.getDelegate()).isDirty()) {
            ((Session)this.entityManager.getDelegate()).clear();
        }
    }

    public void prepararCalculoExterno(Calculo calculo, ParcelasAtualizaveisCreditosReclamante creditosDoReclamante, ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosDoReclamante, ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosDoReclamado, ParcelasAtualizaveisDebitosReclamante debitosDoReclamante, Boolean salvarAutomaticamente) {
        if (!Utils.naoNulos(creditosDoReclamante, descontoCreditosDoReclamante, outrosDebitosDoReclamado, debitosDoReclamante)) {
            creditosDoReclamante = ParcelasAtualizaveisCreditosReclamante.obterDoCalculo(calculo);
            descontoCreditosDoReclamante = ParcelasAtualizaveisDescontoCreditosReclamante.obterDoCalculo(calculo);
            outrosDebitosDoReclamado = ParcelasAtualizaveisOutrosDebitosReclamado.obterDoCalculo(calculo);
            debitosDoReclamante = ParcelasAtualizaveisDebitosReclamante.obterDoCalculo(calculo);
        }
        this.removerObjetosDo(calculo);
        if (!salvarAutomaticamente.booleanValue()) {
            ParcelasAtualizaveisCustas.removerCustas(descontoCreditosDoReclamante, outrosDebitosDoReclamado, debitosDoReclamante);
            ParcelasAtualizaveisMultaIndenizacao.removerMultas(creditosDoReclamante, descontoCreditosDoReclamante, outrosDebitosDoReclamado, debitosDoReclamante);
            ParcelasAtualizaveisHonorario.removerHonorarios(descontoCreditosDoReclamante, outrosDebitosDoReclamado, debitosDoReclamante);
        } else {
            this.salvarCalculoExterno(calculo, creditosDoReclamante, descontoCreditosDoReclamante, outrosDebitosDoReclamado, debitosDoReclamante);
        }
    }

    public List<MensagemDeRecurso> salvarCalculoExterno(Calculo calculo, ParcelasAtualizaveisCreditosReclamante creditosDoReclamante, ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosDoReclamante, ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosDoReclamado, ParcelasAtualizaveisDebitosReclamante debitosDoReclamante) {
        List<MensagemDeRecurso> erros = this.consistirParcelasAtualizaveis(creditosDoReclamante, descontoCreditosDoReclamante, outrosDebitosDoReclamado, debitosDoReclamante);
        if (erros.isEmpty()) {
            ArrayList<ParcelasAtualizaveisMultaIndenizacao> multas = new ArrayList<ParcelasAtualizaveisMultaIndenizacao>();
            multas.addAll(creditosDoReclamante.getListaMultasIndenizDevReclamante());
            multas.addAll(creditosDoReclamante.getListaMultasIndenizDevReclamado());
            multas.addAll(debitosDoReclamante.getListaMultasIndenizDevReclamante());
            multas.addAll(descontoCreditosDoReclamante.getListaMultasIndenizTerceiroReclamante());
            multas.addAll(outrosDebitosDoReclamado.getListaMultasIndenizTerceiroReclamado());
            Multa.criarDeParcelasAtualizaveis(calculo, multas);
            ArrayList<ParcelasAtualizaveisHonorario> honorarios = new ArrayList<ParcelasAtualizaveisHonorario>();
            honorarios.addAll(debitosDoReclamante.getListaHonorariosDevReclamante());
            honorarios.addAll(descontoCreditosDoReclamante.getListaHonorariosDevReclamante());
            honorarios.addAll(outrosDebitosDoReclamado.getListaHonorariosDevReclamado());
            Honorario.criarDeParcelasAtualizaveis(calculo, honorarios);
            ParcelasAtualizaveisMultaIndenizacao.salvar(debitosDoReclamante.getListaMultasIndenizDevReclamante());
            ParcelasAtualizaveisHonorario.salvar(debitosDoReclamante.getListaHonorariosDevReclamante());
            ParcelasAtualizaveisMultaIndenizacao.salvar(outrosDebitosDoReclamado.getListaMultasIndenizTerceiroReclamado());
            ParcelasAtualizaveisHonorario.salvar(outrosDebitosDoReclamado.getListaHonorariosDevReclamado());
            ParcelasAtualizaveisMultaIndenizacao.salvar(descontoCreditosDoReclamante.getListaMultasIndenizTerceiroReclamante());
            ParcelasAtualizaveisHonorario.salvar(descontoCreditosDoReclamante.getListaHonorariosDevReclamante());
            ParcelasAtualizaveisMultaIndenizacao.salvar(creditosDoReclamante.getListaMultasIndenizDevReclamado());
            ParcelasAtualizaveisMultaIndenizacao.salvar(creditosDoReclamante.getListaMultasIndenizDevReclamante());
            debitosDoReclamante.salvar(true);
            outrosDebitosDoReclamado.salvar(true);
            descontoCreditosDoReclamante.salvar(true);
            creditosDoReclamante.salvar(true);
        }
        return erros;
    }

    private List<MensagemDeRecurso> consistirParcelasAtualizaveis(ParcelasAtualizaveisCreditosReclamante creditosDoReclamante, ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosDoReclamante, ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosDoReclamado, ParcelasAtualizaveisDebitosReclamante debitosDoReclamante) {
        ArrayList<MensagemDeRecurso> erros = new ArrayList<MensagemDeRecurso>();
        try {
            creditosDoReclamante.consistirDados();
        }
        catch (NegocioException e) {
            this.logger.debug(e.getMessage(), (Throwable)e);
            erros.addAll(e.getMensagensDeRecurso());
        }
        try {
            descontoCreditosDoReclamante.consistirDados();
        }
        catch (NegocioException e) {
            this.logger.debug(e.getMessage(), (Throwable)e);
            erros.addAll(e.getMensagensDeRecurso());
        }
        try {
            outrosDebitosDoReclamado.consistirDados();
        }
        catch (NegocioException e) {
            this.logger.debug(e.getMessage(), (Throwable)e);
            erros.addAll(e.getMensagensDeRecurso());
        }
        try {
            debitosDoReclamante.consistirDados();
        }
        catch (NegocioException e) {
            this.logger.debug(e.getMessage(), (Throwable)e);
            erros.addAll(e.getMensagensDeRecurso());
        }
        if (!descontoCreditosDoReclamante.getMarcarCustasConhecimentoReclamante().booleanValue() && !debitosDoReclamante.getMarcarCustasConhecimentoDevReclamante().booleanValue()) {
            descontoCreditosDoReclamante.getCalculoExterno().getCustasJudiciais().setTipoDeCustasDeConhecimentoDoReclamante(TipoDeCustasDeConhecimentoEnum.NAO_SE_APLICA);
        }
        return erros;
    }

    private void removerObjetosDo(Calculo calculo) {
        for (VerbaDeCalculo verba : calculo.getVerbas()) {
            VerbaDeCalculo.remover(verba, false);
        }
        calculo.getVerbas().clear();
        for (HistoricoSalarial historicoSalarial : calculo.getHistoricosSalariais()) {
            HistoricoSalarial.remover(historicoSalarial, false);
        }
        calculo.getHistoricosSalariais().clear();
        Fgts fgts = calculo.getFgts();
        if (Utils.naoNulo(fgts.getOcorrencias())) {
            ArrayList<OcorrenciaDeFgts> ocorrenciasDeFgts = new ArrayList<OcorrenciaDeFgts>(fgts.getOcorrencias());
            fgts.removerDeOcorrencias(ocorrenciasDeFgts, false);
            fgts.getOcorrencias().clear();
        }
        Inss inss = calculo.getInss();
        ArrayList<OcorrenciaDeInssSobreSalariosDevidos> ocorrenciasDeInssSobreSalariosDevidos = new ArrayList<OcorrenciaDeInssSobreSalariosDevidos>(inss.getInssSobreSalariosDevidos().getOcorrencias());
        inss.getInssSobreSalariosDevidos().removerDeOcorrencias(ocorrenciasDeInssSobreSalariosDevidos, false);
        inss.getInssSobreSalariosDevidos().getOcorrencias().clear();
        ArrayList<OcorrenciaDeInssSobreSalariosPagos> ocorrenciasDeInssSobreSalariosPagos = new ArrayList<OcorrenciaDeInssSobreSalariosPagos>(inss.getInssSobreSalariosPagos().getOcorrencias());
        inss.getInssSobreSalariosPagos().removerDeOcorrencias(ocorrenciasDeInssSobreSalariosPagos, false);
        inss.getInssSobreSalariosPagos().getOcorrencias().clear();
        ArrayList<AliquotaDePrevidenciaPrivada> aliquotas = new ArrayList<AliquotaDePrevidenciaPrivada>(calculo.getPrevidenciaPrivada().getAliquotas());
        for (AliquotaDePrevidenciaPrivada aliquota : aliquotas) {
            calculo.getPrevidenciaPrivada().removerDeAliquotas(aliquota);
        }
        calculo.getCustasJudiciais().removerCustasArmazenamentoDoCalculo();
    }
}

