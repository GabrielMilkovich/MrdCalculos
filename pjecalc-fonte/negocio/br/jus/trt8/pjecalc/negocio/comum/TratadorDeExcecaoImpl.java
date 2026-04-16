/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.ManyToOne
 *  javax.persistence.Table
 *  org.jboss.seam.Component
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Create
 *  org.jboss.seam.annotations.In
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.TratadorDeExcecao;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.SystemDeploymentStrategy;
import br.jus.trt8.pjecalc.negocio.comum.annotations.ExcecaoMapeada;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.InfraException;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.MapeadaException;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import org.jboss.seam.Component;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Create;
import org.jboss.seam.annotations.In;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Name(value="tratadorDeExcecao")
@Scope(value=ScopeType.APPLICATION)
public class TratadorDeExcecaoImpl
implements TratadorDeExcecao {
    private List<MapeadaException> excecoesRegistradas;
    private Map<String, Class<?>> classesMapeadas;
    @In
    private SystemDeploymentStrategy systemDeploymentStrategy;
    private static final String TBVERBABASE = "TBVERBABASE";

    @Create
    public void inicicar() {
        this.excecoesRegistradas = new ArrayList<MapeadaException>();
        this.classesMapeadas = new HashMap();
        try {
            this.scanearExcecoesMapeada();
            this.scanearClassesMapeada();
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }

    private boolean isMapeadaException(Class<?> clazz) {
        if (clazz.equals(MapeadaException.class)) {
            return true;
        }
        if (clazz.getSuperclass() != null) {
            return this.isMapeadaException(clazz.getSuperclass());
        }
        return false;
    }

    private void scanearClassesMapeada() throws Exception {
        Set<Class<?>> classes = this.systemDeploymentStrategy.getClassesAnnotedWith(Table.class);
        for (Class<?> clazz : classes) {
            Table table = clazz.getAnnotation(Table.class);
            if (!Utils.naoNulo(table)) continue;
            this.classesMapeadas.put(table.name(), clazz);
        }
        this.classesMapeadas.put(TBVERBABASE, Verba.class);
    }

    private void scanearExcecoesMapeada() throws Exception {
        Set<Class<?>> exceptions = this.systemDeploymentStrategy.getClassesAnnotedWith(ExcecaoMapeada.class);
        for (Class<?> clazz : exceptions) {
            if (!this.isMapeadaException(clazz)) continue;
            try {
                Constructor<?> construtor = clazz.getConstructor(Throwable.class);
                MapeadaException matcher = (MapeadaException)construtor.newInstance(new Object[]{null});
                this.excecoesRegistradas.add(matcher);
            }
            catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    public void tratarExcecao(RuntimeException re, EntidadeBase entidade) {
        if (re instanceof NegocioException) {
            throw re;
        }
        for (MapeadaException me : this.excecoesRegistradas) {
            if (!me.casar(re)) continue;
            MapeadaException excecao = null;
            try {
                ExcecaoMapeada anotacao = me.getClass().getAnnotation(ExcecaoMapeada.class);
                Constructor<?> construtor = me.getClass().getConstructor(Throwable.class);
                excecao = (MapeadaException)construtor.newInstance(re);
                MensagemDeRecurso mensagem = new MensagemDeRecurso(entidade, null, anotacao.mensagem(), new Object[0]);
                excecao.tratarMensagem(mensagem, re);
                excecao.adicionarMensagemDeRecurso(mensagem);
            }
            catch (Exception e) {
                throw new InfraException(re, new MensagemDeRecurso(Mensagens.MSG0013, new Object[0]));
            }
            if (excecao == null) continue;
            throw excecao;
        }
        throw new InfraException(re, new MensagemDeRecurso(Mensagens.MSG0013, new Object[0]));
    }

    @Override
    public String buscarLegendaDaClasse(String nomeDaTabela) {
        Class<?> clazz = this.classesMapeadas.get(nomeDaTabela);
        String nomeDeInstancia = Utils.obterNomeDeInstancia(clazz);
        String legendaDaClasse = Utils.obterLegendaDoRecurso(nomeDeInstancia, null);
        if (Utils.naoNulo(legendaDaClasse)) {
            return legendaDaClasse;
        }
        ManyToOne manyToOne = null;
        for (Field field : clazz.getDeclaredFields()) {
            manyToOne = field.getAnnotation(ManyToOne.class);
            if (!Utils.naoNulo(manyToOne)) continue;
            clazz = field.getType();
            this.classesMapeadas.put(nomeDaTabela, clazz);
            nomeDeInstancia = Utils.obterNomeDeInstancia(clazz);
            return Utils.obterLegendaDoRecurso(nomeDeInstancia, String.format("{%s}", nomeDeInstancia));
        }
        return String.format("{%s}", nomeDeInstancia);
    }

    public static TratadorDeExcecao instance() {
        return (TratadorDeExcecao)Component.getInstance(TratadorDeExcecaoImpl.class);
    }
}

