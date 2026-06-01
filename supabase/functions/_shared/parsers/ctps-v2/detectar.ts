/**
 * Detector de emissor da Ficha de Anotações CTPS.
 *
 * Heurística por marca d'água / footer:
 *   - ADP-Web: cabeçalho "Ficha de Anotações e Atualizações da CTPS"
 *     + rodapé com domínio adpweb.com.br
 *   - SAP: cabeçalho "Grupo Casas Bahia" + "Ficha de Anotações"
 *   - CTPS-Digital: "CTPS Digital" ou domínio servicos.gov.br
 *
 * Pure function — input é o texto layout-preservado, output é uma tag.
 */
export type CtpsEmitter = 'ADP-Web' | 'SAP' | 'CTPS-Digital' | 'outro';

export function detectarEmissor(texto: string): CtpsEmitter | null {
  const temCabecalho =
    /Ficha de Anota[çc][õo]es e Atualiza[çc][õo]es da CTPS/i.test(texto);

  // SAP (Grupo Casas Bahia) — mesmo cabeçalho do ADP, mas subtipo próprio.
  // Checado ANTES do ADP-Web pra não ser capturado pelo fallback de cabeçalho.
  if (/Grupo Casas Bahia[\s\S]*Ficha de Anota[çc][õo]es/i.test(texto)) {
    return 'SAP';
  }
  // ADP-Web — o rodapé adpweb.com.br confirma, mas NEM SEMPRE é capturado
  // pelo pdfjs (depende do layout do PDF). O cabeçalho-assinatura "Ficha de
  // Anotações e Atualizações da CTPS" já é específico o bastante do formato
  // ADP (Via Varejo / Via S.A. / Casas Bahia) pra valer como sinal sozinho.
  // FIX 2026-06-01: antes exigia cabeçalho E adpweb.com.br — CTPS "VIA S/A"
  // (empresa renomeada, sem o rodapé) caía em emissor=null e o parser V2
  // abortava mesmo com TODAS as seções essenciais já extraídas. Caso real:
  // Priscila Caldeira Prado. Manter o adpweb como sinal redundante é
  // desnecessário; o cabeçalho basta.
  if (temCabecalho) {
    return 'ADP-Web';
  }
  if (/CTPS\s+Digital|servicos\.gov\.br/i.test(texto)) {
    return 'CTPS-Digital';
  }
  return null;
}

export function isFichaAnotacoes(texto: string): boolean {
  const emissor = detectarEmissor(texto);
  return emissor === 'ADP-Web' || emissor === 'SAP';
}
