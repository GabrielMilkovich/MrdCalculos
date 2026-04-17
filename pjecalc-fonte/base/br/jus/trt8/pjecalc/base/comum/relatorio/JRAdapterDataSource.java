/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.JRException
 *  net.sf.jasperreports.engine.JRField
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 */
package br.jus.trt8.pjecalc.base.comum.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import java.util.Collection;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JRField;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

public class JRAdapterDataSource<T extends JRAdapter>
extends JRBeanCollectionDataSource {
    private T adapter;

    public JRAdapterDataSource(T adapter, Collection beanCollection) {
        super(beanCollection);
        this.adapter = adapter;
    }

    public JRAdapterDataSource(T adapter, Collection beanCollection, boolean isUseFieldDescription) {
        super(beanCollection, isUseFieldDescription);
        this.adapter = adapter;
    }

    protected Object getFieldValue(Object bean, JRField field) throws JRException {
        JRAdapter a = ((JRAdapter)this.adapter).adapt(bean);
        return super.getFieldValue((Object)a, field);
    }

    public int size() {
        return super.getData().size();
    }
}

