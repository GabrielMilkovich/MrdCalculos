/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import java.math.BigDecimal;
import java.util.Date;

public abstract class CustaJRAdapter
extends JRAdapter {
    public abstract CustaPeloReclamante getCustaPeloReclamante();

    public abstract CustaPeloReclamado getCustaPeloReclamado();

    public static interface ICustaInformada
    extends ICustas {
        public BigDecimal getIndiceDeCorrecao();

        public BigDecimal getValorCorrigido();

        public BigDecimal getJuros();
    }

    public static interface ICustaCalculada
    extends ICustas {
        public BigDecimal getTaxa();

        public String getComposicaoBase();
    }

    public static interface ICustas {
        public Date getOcorrencia();

        public BigDecimal getBaseOuValor();

        public BigDecimal getPisoOuTeto();

        public BigDecimal getTeto();

        public BigDecimal getTotal();
    }

    public abstract class CustaPeloReclamadoDevidasDeArmazenamentoOcorrenciaAdapter
    extends JRAdapter {
        public abstract Date getDataInicio();

        public abstract Date getDataFim();

        public abstract BigDecimal getBase();

        public abstract BigDecimal getTaxa();

        public abstract Integer getQuantidade();

        public abstract BigDecimal getValor();

        public abstract BigDecimal getIndiceDeCorrecao();

        public abstract BigDecimal getValorCorrigido();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getTotal();
    }

    public abstract class CustaPeloReclamadoDevidasDeAutosOcorrenciaAdapter
    extends JRAdapter {
        public abstract Date getOcorrencia();

        public abstract String getTipo();

        public abstract BigDecimal getBase();

        public abstract BigDecimal getTaxa();

        public abstract BigDecimal getValor();

        public abstract BigDecimal getIndiceDeCorrecao();

        public abstract BigDecimal getValorCorrigido();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getTeto();

        public abstract BigDecimal getTotal();
    }

    public abstract class CustaPeloReclamadoDevidasFixasOcorrenciaAdapter
    extends JRAdapter {
        public abstract Date getOcorrencia();

        public abstract String getTipo();

        public abstract BigDecimal getBase();

        public abstract Integer getQuantidade();

        public abstract BigDecimal getValor();

        public abstract BigDecimal getIndiceDeCorrecao();

        public abstract BigDecimal getValorCorrigido();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getTotal();
    }

    public abstract class CustaRecolhidasOcorrenciaAdapter
    extends JRAdapter {
        public abstract Date getOcorrencia();

        public abstract BigDecimal getValor();

        public abstract BigDecimal getIndiceDeCorrecao();

        public abstract BigDecimal getValorCorrigido();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getTotal();
    }

    public abstract class CustaPeloReclamadoDevidasDeArmazenamento {
        public abstract JRAdapterDataSource<CustaPeloReclamadoDevidasDeArmazenamentoOcorrenciaAdapter> getOcorrencias();
    }

    public abstract class CustaPeloReclamadoDevidasDeAutos {
        public abstract JRAdapterDataSource<CustaPeloReclamadoDevidasDeAutosOcorrenciaAdapter> getOcorrencias();
    }

    public abstract class CustaPeloReclamadoDevidasFixas {
        public abstract JRAdapterDataSource<CustaPeloReclamadoDevidasFixasOcorrenciaAdapter> getOcorrencias();
    }

    public abstract class CustaDiferenca {
        public abstract Date getOcorrencia();

        public abstract BigDecimal getDevido();

        public abstract BigDecimal getRecolhido();

        public abstract BigDecimal getDiferenca();
    }

    public abstract class CustaRecolhidas {
        public abstract JRAdapterDataSource<CustaRecolhidasOcorrenciaAdapter> getOcorrencias();
    }

    public abstract class CustaPeloReclamadoDevidas {
        public abstract Boolean getMostrarConhecimentoCalculada();

        public abstract Boolean getMostrarConhecimentoInformada();

        public abstract Boolean getMostrarLiquidacaoCalculada();

        public abstract Boolean getMostrarLiquidacaoInformada();

        public abstract ICustas getDeConhecimento();

        public abstract ICustas getDeLiquidacao();

        public abstract CustaPeloReclamadoDevidasFixas getFixas();

        public abstract CustaPeloReclamadoDevidasDeAutos getDeAutos();

        public abstract CustaPeloReclamadoDevidasDeArmazenamento getDeArmazenamento();
    }

    public abstract class CustaPeloReclamado {
        public abstract CustaPeloReclamadoDevidas getDevidas();

        public abstract CustaRecolhidas getRecolhidas();

        public abstract CustaDiferenca getDiferenca();
    }

    public abstract class CustaPeloReclamante {
        public abstract Boolean getMostrarCalculada();

        public abstract Boolean getMostrarInformada();

        public abstract ICustas getDevidas();

        public abstract CustaRecolhidas getRecolhidas();

        public abstract CustaDiferenca getDiferenca();

        public abstract Boolean getNaoSeAplica();
    }
}

