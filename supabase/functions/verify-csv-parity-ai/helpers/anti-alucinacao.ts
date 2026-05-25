export function evidenciaApareceNoPdf(
  evidencia: string,
  pdfText: string,
): boolean {
  if (!evidencia || !evidencia.trim()) return false;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const pdfN = norm(pdfText);
  const evN = norm(evidencia);

  if (pdfN.includes(evN)) return true;

  if (/^-?R?\$?\s*\d{1,3}(\.\d{3})*,\d{2}$/.test(evidencia.trim())) {
    const semR = evidencia.replace(/R\$/gi, "").trim();
    const semMilhar = semR.replace(/\./g, "");
    if (pdfN.includes(norm(semMilhar))) return true;
    if (pdfN.includes(norm(semR))) return true;
  }

  if (/^\d{2}[/.\-]\d{2}[/.\-]\d{4}$/.test(evidencia)) {
    const variantes = [
      evidencia.replace(/[/.\-]/g, "/"),
      evidencia.replace(/[/.\-]/g, "-"),
      evidencia.replace(/[/.\-]/g, "."),
    ];
    if (variantes.some((v) => pdfN.includes(norm(v)))) return true;
  }

  const palavras = evN.split(" ");
  if (palavras.length >= 5) {
    const inicio = palavras.slice(0, 5).join(" ");
    if (pdfN.includes(inicio)) return true;
  }

  return false;
}
