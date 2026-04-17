/**
 * PJe-Calc v2.15.1 — JurosPadrao
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.juros.padrao.JurosPadrao
 *
 * Ref Java: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/dominio/juros/padrao/JurosPadrao.java
 *
 * Entidade para a tabela de juros "padrão" (configurada pelo administrador).
 * Historicamente 1% a.m. SIMPLES (art. 39, § 1º, Lei 8.177/91) e depois
 * SELIC-FAZENDA via EC 113/2021.
 */
import { JurosBase } from '../juros-base';

export class JurosPadrao extends JurosBase {}
