/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacao;
import java.io.Serializable;
import java.util.Date;

public class EventoAtualizacaoVO
implements Serializable,
Comparable<EventoAtualizacaoVO> {
    private static final long serialVersionUID = -3814263143020272013L;
    private Date dataEvento;
    private EventoAtualizacao evento;
    private Long id;

    public Date getDataEvento() {
        return this.dataEvento;
    }

    public void setDataEvento(Date dataEvento) {
        this.dataEvento = dataEvento;
    }

    public EventoAtualizacao getEvento() {
        return this.evento;
    }

    public void setEvento(EventoAtualizacao evento) {
        this.evento = evento;
    }

    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @Override
    public int compareTo(EventoAtualizacaoVO o) {
        if (this.getDataEvento() == null || o.getDataEvento() == null) {
            return 0;
        }
        if (this.getDataEvento().compareTo(o.getDataEvento()) == 0) {
            return this.getEvento().getPrioridade().compareTo(o.getEvento().getPrioridade());
        }
        return this.getDataEvento().compareTo(o.getDataEvento());
    }
}

