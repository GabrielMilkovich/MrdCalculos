/**
 * PJe-Calc v2.15.1 — JurosFazendaPublica
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.juros.fazendapublica.JurosFazendaPublica
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/juros/fazendapublica/JurosFazendaPublica.java
 *
 * Entidade que armazena os juros aplicáveis à Fazenda Pública antes da EC
 * 113/2021 — tipicamente meio da taxa da caderneta de poupança (Lei 11.960/09),
 * substituída pela SELIC-FAZENDA a partir de 09/12/2021.
 */
import { JurosBase } from '../juros-base';

export class JurosFazendaPublica extends JurosBase {}
