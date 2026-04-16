/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.CartaoDePonto;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Name(value="servicoDeParsingDeCartaoDePonto")
@Scope(value=ScopeType.STATELESS)
@AutoCreate
public class ServicoDeParsingDeCartaoDePonto
implements Serializable {
    private static final long serialVersionUID = 9056734441638325343L;
    private Integer numeroDeColunas;
    private String[] nomesColunas;
    private List<String[]> linhas = new ArrayList<String[]>();
    private static final Integer LIMITE_COLUNAS_CARTAO = 16;
    private static final Integer LIMITE_COLUNAS_JORNADA = 13;

    public void importarCartaoDePonto(String nome, byte[] dados) {
        if (!nome.toUpperCase().endsWith(".CSV")) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0120, new Object[0]));
        }
        this.parseCartaoDePonto(dados, LIMITE_COLUNAS_CARTAO);
        CartaoDePonto.gerarCartaoDePontoEOcorrenciasDoCartaoDePonto(this.getNomesColunas(), this.getLinhas());
    }

    public List<String[]> importarJornadaCartaoDePonto(String nome, byte[] dados) {
        if (!nome.toUpperCase().endsWith(".CSV")) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0120, new Object[0]));
        }
        this.parseCartaoDePonto(dados, LIMITE_COLUNAS_JORNADA);
        return this.linhas;
    }

    public void parseCartaoDePonto(byte[] dados, Integer numeroColunasMax) {
        ByteArrayInputStream in = new ByteArrayInputStream(dados);
        BufferedReader reader = null;
        String delimitador = ";";
        try {
            String line = "";
            reader = new BufferedReader(new InputStreamReader(in));
            line = reader.readLine();
            if (line != null) {
                line = this.converterDelimitadorVirgulaParaPontoEVirgula(line);
                this.setNomesColunas(line.split(";"));
                this.setNumeroDeColunas(this.getNomesColunas().length);
                if (this.getNumeroDeColunas() > numeroColunasMax) {
                    throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0121, new Object[0]));
                }
                this.setNomesColunas(Arrays.copyOfRange(this.getNomesColunas(), 1, (int)this.getNumeroDeColunas()));
            }
            while ((line = reader.readLine()) != null) {
                line = this.converterDelimitadorVirgulaParaPontoEVirgula(line);
                String[] valores = line.split(";");
                String[] valoresFiltrados = Arrays.copyOfRange(valores, 0, (int)this.getNumeroDeColunas());
                this.getLinhas().add(valoresFiltrados);
            }
        }
        catch (Exception e) {
            e.printStackTrace();
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0120, new Object[0]));
        }
        finally {
            try {
                reader.close();
                ((InputStream)in).close();
            }
            catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    private String converterDelimitadorVirgulaParaPontoEVirgula(String texto) {
        String textoTratado = texto;
        if (!texto.contains(";")) {
            textoTratado = texto.replaceAll("\"(\\d+)\\,(\\d+)\"", "\"$1.$2\"");
            textoTratado = textoTratado.replaceAll("'(\\d+)\\,(\\d+)'", "'$1.$2'");
            textoTratado = textoTratado.replaceAll(",", ";");
            textoTratado = textoTratado.replaceAll("\"(\\d+)\\.(\\d+)\"", "\"$1,$2\"");
            textoTratado = textoTratado.replaceAll("'(\\d+)\\.(\\d+)'", "'$1,$2'");
        }
        return textoTratado;
    }

    public Integer getNumeroDeColunas() {
        return this.numeroDeColunas;
    }

    public void setNumeroDeColunas(Integer numeroDeColunas) {
        this.numeroDeColunas = numeroDeColunas;
    }

    public String[] getNomesColunas() {
        return this.nomesColunas;
    }

    public void setNomesColunas(String[] nomesColunas) {
        this.nomesColunas = nomesColunas;
    }

    public List<String[]> getLinhas() {
        return this.linhas;
    }

    public void setLinhas(List<String[]> linhas) {
        this.linhas = linhas;
    }
}

