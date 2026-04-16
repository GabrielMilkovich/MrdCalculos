/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javassist.util.proxy.MethodHandler
 *  org.hibernate.LazyInitializationException
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import java.io.Serializable;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import javassist.util.proxy.MethodHandler;
import org.hibernate.LazyInitializationException;

public class EntidadeMethodHandle
implements MethodHandler,
Serializable {
    private EntidadeBase entidade;
    private static final long serialVersionUID = 4728256470299201860L;

    public EntidadeMethodHandle() {
    }

    public EntidadeMethodHandle(EntidadeBase entidade) {
        this();
        this.entidade = entidade;
    }

    public Object invoke(Object self, Method m, Method proceed, Object[] args) throws Throwable {
        try {
            return proceed.invoke(self, args);
        }
        catch (InvocationTargetException e) {
            if (e.getTargetException() instanceof LazyInitializationException) {
                EntidadeBase entidadeAtachada = this.entidade.restaurar();
                Method proceedAtachado = entidadeAtachada.getClass().getDeclaredMethod(proceed.getName(), proceed.getParameterTypes());
                return proceedAtachado.invoke((Object)entidadeAtachada, args);
            }
            throw e;
        }
    }

    public EntidadeBase getEntidade() {
        return this.entidade;
    }

    public void setEntidade(EntidadeBase entidade) {
        this.entidade = entidade;
    }
}

