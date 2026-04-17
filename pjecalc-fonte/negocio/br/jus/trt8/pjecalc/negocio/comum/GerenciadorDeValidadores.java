/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.validator.ClassValidator
 *  org.hibernate.validator.InvalidValue
 *  org.jboss.seam.Component
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Create
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 *  org.jboss.seam.core.ResourceBundle
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.validadores.CustomClassValidator;
import br.jus.trt8.pjecalc.base.comum.validadores.GroupValidation;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;
import org.hibernate.validator.ClassValidator;
import org.hibernate.validator.InvalidValue;
import org.jboss.seam.Component;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Create;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;
import org.jboss.seam.core.ResourceBundle;

@Name(value="gerenciadorDeValidadores")
@Scope(value=ScopeType.APPLICATION)
public class GerenciadorDeValidadores
implements GroupValidation,
Serializable {
    private static final long serialVersionUID = -1351887686935343819L;
    private Map<Object, ClassValidator<? extends EntidadeBase>> validadores;
    private byte grupo;

    @Create
    public void inicicar() {
        this.validadores = new HashMap<Object, ClassValidator<? extends EntidadeBase>>();
    }

    private <E extends EntidadeBase> ClassValidator<E> getClassValidator(Class<E> clazz) {
        ClassValidator<? extends EntidadeBase> resultado = this.validadores.get(clazz);
        if (resultado == null) {
            resultado = new CustomClassValidator<E>(clazz, ResourceBundle.instance());
            this.validadores.put(clazz, resultado);
        }
        return resultado;
    }

    public static GerenciadorDeValidadores getInstance() {
        try {
            return (GerenciadorDeValidadores)Component.getInstance(GerenciadorDeValidadores.class);
        }
        catch (IllegalStateException e) {
            return new GerenciadorDeValidadores();
        }
    }

    public <E extends EntidadeBase> void validarUmAtributo(Class<E> clazz, E entidade, String nomeDoAtributo) {
        this.validarUmAtributo(clazz, entidade, (byte)0, nomeDoAtributo);
    }

    public <E extends EntidadeBase> void validarUmAtributo(Class<E> clazz, E entidade, byte grupo, String nomeDoAtributo) {
        this.validar(clazz, entidade, grupo, nomeDoAtributo);
    }

    public <E extends EntidadeBase> void validar(Class<E> clazz, E entidade) {
        this.validar(clazz, entidade, (byte)0, null);
    }

    public <E extends EntidadeBase> void validar(Class<E> clazz, E entidade, byte grupo) {
        this.validar(clazz, entidade, grupo, null);
    }

    public <E extends EntidadeBase> void validar(Class<E> clazz, E entidade, byte grupo, String nomeDoAtributo) {
        if (Utils.nulo(this.validadores)) {
            return;
        }
        this.grupo = grupo;
        ClassValidator<E> classValidator = this.getClassValidator(clazz);
        ValidadorGenerico<E> validadorGenerico = new ValidadorGenerico<E>(classValidator);
        validadorGenerico.validar(entidade, nomeDoAtributo);
    }

    @Override
    public byte getGroup() {
        return this.grupo;
    }

    public class ValidadorGenerico<E extends EntidadeBase> {
        private ClassValidator<E> classValidator;

        public ValidadorGenerico(ClassValidator<E> classValidator) {
            this.classValidator = classValidator;
        }

        public void validar(E entidade) {
            this.validar(entidade, null);
        }

        public void validar(E entidade, String propertyName) {
            InvalidValue[] invalidValues = null;
            invalidValues = Utils.nulo(propertyName) ? this.classValidator.getInvalidValues(entidade) : this.classValidator.getInvalidValues(entidade, propertyName);
            if (invalidValues.length == 0) {
                return;
            }
            NegocioException exception = new NegocioException();
            for (InvalidValue invalidValue : invalidValues) {
                String[] properties = invalidValue.getPropertyName().split(",");
                Object[] parameters = new Object[properties.length];
                for (int i = 0; i < properties.length; ++i) {
                    String key = Utils.formatarNomeDeAtributo(invalidValue.getBeanClass().getSimpleName(), properties[i]);
                    parameters[i] = Utils.obterLegendaDoRecurso(key);
                }
                MensagemDeRecurso mensagemDeRecurso = new MensagemDeRecurso((EntidadeBase)entidade, invalidValue.getPropertyPath(), null, parameters);
                mensagemDeRecurso.setMensagem(invalidValue.getMessage());
                exception.adicionarMensagemDeRecurso(mensagemDeRecurso);
            }
            if (!exception.getMensagensDeRecurso().isEmpty()) {
                throw exception;
            }
        }
    }
}

