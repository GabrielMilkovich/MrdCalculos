/**
 * Sanitização de PII (LGPD) para metadata.v6_text_preview.
 *
 * `v6_text_preview` captura primeiros 4KB do `textoCompleto` produzido pelo
 * extrator V6 (unpdf), usado como evidência técnica para calibrar
 * detectores/mappers contra texto REAL de produção. Holerites/contracheques
 * contêm dados sensíveis: CPF, PIS, CNPJ (do empregado quando MEI), nome,
 * salário, conta bancária, email, telefone.
 *
 * LGPD Art. 5º, II: dado pessoal sensível inclui dados financeiros. Mesmo
 * em campo de "evidência técnica", PII bruta armazenada sem propósito
 * específico viola princípio da minimização (Art. 6º, III).
 *
 * Esta função aplica máscara em padrões cristalizados. Operador continua
 * verificando layout/valores/datas (que importam pra calibração) sem
 * acessar identificação direta da pessoa.
 *
 * Aplicada antes de gravar v6_text_preview em:
 *   - process-document-ocr/index.ts
 *   - reprocess-v6/index.ts
 */
export function sanitizePII(s: string): string {
  if (!s) return s;
  return s
    // CPF formatado: 123.456.789-01
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[CPF]')
    // CNPJ formatado: 12.345.678/0001-90 (CNPJ do empregador é público, mas
    // CNPJ de MEI é PII — mascaramos por princípio de minimização).
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '[CNPJ]')
    // PIS formatado: 123.45678.90-1
    .replace(/\b\d{3}\.\d{5}\.\d{2}-\d{1}\b/g, '[PIS]')
    // Email
    .replace(/[\w._%+-]+@[\w.-]+\.\w+/gi, '[EMAIL]')
    // Telefone BR (com ou sem DDD, com ou sem 9 nono dígito)
    .replace(/\b\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, (m) => {
      // Não mascarar quando há / ou : próximo (provável data/horário).
      if (/[\/.\-:]/.test(m)) return m;
      return '[TEL]';
    })
    // 14 dígitos consecutivos = CNPJ não-formatado
    .replace(/\b\d{14}\b/g, '[14DIG]')
    // 11 dígitos consecutivos = CPF/PIS não-formatado (por último, evita
    // sobrescrever matches anteriores).
    .replace(/\b\d{11}\b/g, '[11DIG]');
}
