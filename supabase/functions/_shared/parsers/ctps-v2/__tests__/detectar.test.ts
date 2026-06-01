import { describe, it, expect } from 'vitest';
import { detectarEmissor, isFichaAnotacoes } from '../detectar.ts';

const CABECALHO = 'Ficha de Anotações e Atualizações da CTPS';

describe('detectarEmissor — emissor da Ficha de Anotações CTPS', () => {
  it('ADP-Web: cabeçalho + rodapé adpweb.com.br (Via Varejo clássico)', () => {
    const t = `VIA VAREJO SA 33.041.260/0652-90 ${CABECALHO} Página 1 https://www.adpweb.com.br/ssonns/login.asp`;
    expect(detectarEmissor(t)).toBe('ADP-Web');
    expect(isFichaAnotacoes(t)).toBe(true);
  });

  it('SAP: Grupo Casas Bahia + cabeçalho', () => {
    const t = `Grupo Casas Bahia S.A. 33.041.260/1297-95 ${CABECALHO} LOCAL DE TRABALHO`;
    expect(detectarEmissor(t)).toBe('SAP');
    expect(isFichaAnotacoes(t)).toBe(true);
  });

  // Regressão FIX 2026-06-01: a empresa "VIA S/A" (Via Varejo renomeada) emite
  // a mesma Ficha de Anotações ADP, mas o pdfjs não captura o rodapé
  // adpweb.com.br. Antes => emissor=null => parser V2 abortava mesmo com todas
  // as seções essenciais presentes. Agora o cabeçalho-assinatura basta.
  it('ADP-Web pelo cabeçalho-assinatura, SEM rodapé adpweb (VIA S/A)', () => {
    const t = `VIA S/A 33.041.260/0979-07 ${CABECALHO} LOCAL DE TRABALHO DADOS PESSOAIS`;
    expect(detectarEmissor(t)).toBe('ADP-Web');
    expect(isFichaAnotacoes(t)).toBe(true);
  });

  it('SAP tem prioridade sobre o fallback de cabeçalho ADP', () => {
    const t = `Grupo Casas Bahia ${CABECALHO} adpweb.com.br`;
    expect(detectarEmissor(t)).toBe('SAP');
  });

  it('CTPS-Digital (gov.br) quando não há o cabeçalho ADP', () => {
    expect(detectarEmissor('Carteira de Trabalho Digital — CTPS Digital servicos.gov.br')).toBe(
      'CTPS-Digital',
    );
  });

  it('texto sem assinatura de Ficha de Anotações → null', () => {
    expect(detectarEmissor('Holerite recibo de pagamento salário líquido')).toBeNull();
    expect(isFichaAnotacoes('documento qualquer')).toBe(false);
  });
});
