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
  if (
    /Ficha de Anota[çc][õo]es e Atualiza[çc][õo]es da CTPS/i.test(texto) &&
    /adpweb\.com\.br/i.test(texto)
  ) {
    return 'ADP-Web';
  }
  if (/Grupo Casas Bahia[\s\S]*Ficha de Anota[çc][õo]es/i.test(texto)) {
    return 'SAP';
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
