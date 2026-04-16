/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.drools.KnowledgeBase
 *  org.drools.KnowledgeBaseFactory
 *  org.drools.builder.KnowledgeBuilder
 *  org.drools.builder.KnowledgeBuilderError
 *  org.drools.builder.KnowledgeBuilderFactory
 *  org.drools.builder.ResourceType
 *  org.drools.io.ResourceFactory
 *  org.drools.runtime.StatefulKnowledgeSession
 *  org.drools.runtime.StatelessKnowledgeSession
 *  org.drools.runtime.rule.Activation
 *  org.drools.runtime.rule.AgendaFilter
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.AutoCreate
 *  org.jboss.seam.annotations.Create
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 *  org.jboss.seam.annotations.Startup
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import java.io.Serializable;
import java.util.Map;
import org.drools.KnowledgeBase;
import org.drools.KnowledgeBaseFactory;
import org.drools.builder.KnowledgeBuilder;
import org.drools.builder.KnowledgeBuilderError;
import org.drools.builder.KnowledgeBuilderFactory;
import org.drools.builder.ResourceType;
import org.drools.io.ResourceFactory;
import org.drools.runtime.StatefulKnowledgeSession;
import org.drools.runtime.StatelessKnowledgeSession;
import org.drools.runtime.rule.Activation;
import org.drools.runtime.rule.AgendaFilter;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.AutoCreate;
import org.jboss.seam.annotations.Create;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.jboss.seam.annotations.Startup;

@Name(value="servicoDrools")
@Scope(value=ScopeType.APPLICATION)
@Startup
@AutoCreate
public class ServicoDrools
implements Serializable {
    private static final long serialVersionUID = 8157146092036171454L;
    private KnowledgeBase knowledgeBase;
    public static final String PACOTE_JUSTIFICATIVA = "pjecalc.justificativa";
    public static final String PACOTE_VALIDACAO = "pjecalc.validacao";

    @Create
    public void iniciar() {
        KnowledgeBuilder knowledgeBuilder = KnowledgeBuilderFactory.newKnowledgeBuilder();
        knowledgeBuilder.add(ResourceFactory.newClassPathResource((String)"pjecalc.justificativa.pkg"), ResourceType.PKG);
        knowledgeBuilder.add(ResourceFactory.newClassPathResource((String)"pjecalc.validacao.pkg"), ResourceType.PKG);
        if (knowledgeBuilder.hasErrors()) {
            StringBuilder str = new StringBuilder();
            for (KnowledgeBuilderError erro : knowledgeBuilder.getErrors()) {
                str.append(erro.getMessage());
            }
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0071, str.toString()));
        }
        this.knowledgeBase = KnowledgeBaseFactory.newKnowledgeBase();
        this.knowledgeBase.addKnowledgePackages(knowledgeBuilder.getKnowledgePackages());
    }

    public void executarStateless(Calculo calculo, Map<String, Object> globais) {
        StatelessKnowledgeSession knowledgeSession = this.knowledgeBase.newStatelessKnowledgeSession();
        for (Map.Entry<String, Object> entry : globais.entrySet()) {
            knowledgeSession.setGlobal(entry.getKey(), entry.getValue());
        }
        knowledgeSession.execute((Object)calculo);
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void executarStatefull(Calculo calculo, Map<String, Object> globais, String pacote) {
        StatefulKnowledgeSession knowledgeSession = this.knowledgeBase.newStatefulKnowledgeSession();
        try {
            for (Map.Entry<String, Object> entry : globais.entrySet()) {
                knowledgeSession.setGlobal(entry.getKey(), entry.getValue());
            }
            knowledgeSession.insert((Object)calculo);
            knowledgeSession.fireAllRules((AgendaFilter)new MyAgendaFilter(pacote, calculo.isRelatorioAtualizacao()));
        }
        finally {
            knowledgeSession.dispose();
        }
    }

    class MyAgendaFilter
    implements AgendaFilter {
        private String packageName;
        private boolean isAtualizacao;

        public MyAgendaFilter(String packageName, boolean isAtualizacao) {
            this.packageName = packageName;
            this.isAtualizacao = isAtualizacao;
        }

        public boolean accept(Activation activation) {
            boolean recusarNaAtualizacao = this.isAtualizacao && activation.getRule().getName().endsWith("-C-");
            return !recusarNaAtualizacao && activation.getRule().getPackageName().equals(this.packageName);
        }
    }
}

