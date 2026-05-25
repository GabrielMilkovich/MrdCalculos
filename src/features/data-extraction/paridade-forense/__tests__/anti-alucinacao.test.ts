import { describe, expect, it } from 'vitest';

function evidenciaApareceNoPdf(evidencia: string, pdfText: string): boolean {
  if (!evidencia || !evidencia.trim()) return false;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const pdfN = norm(pdfText);
  const evN = norm(evidencia);

  if (pdfN.includes(evN)) return true;

  if (/^-?R?\$?\s*\d{1,3}(\.\d{3})*,\d{2}$/.test(evidencia.trim())) {
    const semR = evidencia.replace(/R\$/gi, '').trim();
    const semMilhar = semR.replace(/\./g, '');
    if (pdfN.includes(norm(semMilhar))) return true;
    if (pdfN.includes(norm(semR))) return true;
  }

  if (/^\d{2}[/.\-]\d{2}[/.\-]\d{4}$/.test(evidencia)) {
    const variantes = [
      evidencia.replace(/[/.\-]/g, '/'),
      evidencia.replace(/[/.\-]/g, '-'),
      evidencia.replace(/[/.\-]/g, '.'),
    ];
    if (variantes.some((v) => pdfN.includes(norm(v)))) return true;
  }

  const palavras = evN.split(' ');
  if (palavras.length >= 5) {
    const inicio = palavras.slice(0, 5).join(' ');
    if (pdfN.includes(inicio)) return true;
  }

  return false;
}

describe('evidenciaApareceNoPdf', () => {
  const PDF = `
    FICHA FINANCEIRA Ano Competência: 2016
    Empregado: 12345 ROQUE GUERREIRO TEIXEIRA
    0620 Comissões PGTO 1.309,42 515,32 2.100,00
    0501 DSR (Comissão) PGTO 362,40 27,10
    5560 INSS DESC 125,15
    Período: 01/01/2016 a 31/12/2016
    Total Vencimentos: R$ 8.406,99
  `;

  it('match direto de texto', () => {
    expect(evidenciaApareceNoPdf('ROQUE GUERREIRO TEIXEIRA', PDF)).toBe(true);
  });

  it('match direto case-insensitive', () => {
    expect(evidenciaApareceNoPdf('roque guerreiro teixeira', PDF)).toBe(true);
  });

  it('match número BR com milhar', () => {
    expect(evidenciaApareceNoPdf('1.309,42', PDF)).toBe(true);
  });

  it('match número BR sem milhar (direto no texto)', () => {
    expect(evidenciaApareceNoPdf('515,32', PDF)).toBe(true);
  });

  it('match com R$', () => {
    expect(evidenciaApareceNoPdf('R$ 8.406,99', PDF)).toBe(true);
  });

  it('match data com barra', () => {
    expect(evidenciaApareceNoPdf('01/01/2016', PDF)).toBe(true);
  });

  it('match data com hífen quando PDF tem barra', () => {
    expect(evidenciaApareceNoPdf('01-01-2016', PDF)).toBe(true);
  });

  it('match trecho longo (5+ palavras)', () => {
    expect(evidenciaApareceNoPdf('ficha financeira ano competência: 2016 empregado:', PDF)).toBe(true);
  });

  it('NÃO match texto inventado', () => {
    expect(evidenciaApareceNoPdf('MARIA DA SILVA', PDF)).toBe(false);
  });

  it('NÃO match número inexistente', () => {
    expect(evidenciaApareceNoPdf('9.999,99', PDF)).toBe(false);
  });

  it('evidência vazia retorna false', () => {
    expect(evidenciaApareceNoPdf('', PDF)).toBe(false);
    expect(evidenciaApareceNoPdf('  ', PDF)).toBe(false);
  });

  it('normaliza whitespace', () => {
    expect(evidenciaApareceNoPdf('ROQUE  GUERREIRO   TEIXEIRA', PDF)).toBe(true);
  });
});
