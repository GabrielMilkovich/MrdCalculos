export const DISCLAIMER_JURIDICO = `Os valores apresentados são estimativas geradas pelo motor de cálculo MRD. ` +
  `Podem divergir do PJe-Calc oficial em casos complexos. ` +
  `Confira os valores antes de protocolar peças processuais.`;

export function disclaimerHtml(dataGeracao?: string): string {
  const data = dataGeracao || new Date().toLocaleString('pt-BR');
  return `<div style="margin-top:10px;padding-top:6px;border-top:1px solid #ccc;text-align:center;font-size:7pt;color:#888;font-style:italic;">
    ${DISCLAIMER_JURIDICO}<br/>Documento gerado em ${data}.
  </div>`;
}
