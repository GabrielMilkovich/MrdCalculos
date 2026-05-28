/**
 * Helpers compartilhados pelos 13 parsers de seção da CTPS V2.
 *
 * Convenção de número:
 *   - `parseNumeroBR`        — vazio/inválido → 0. Use quando 0 é o
 *                              default semanticamente correto (ex.: salario_tarefa
 *                              que nunca pode ser "indefinido").
 *   - `parseNumeroBROuNull`  — vazio/"?"/"-" → null. Use quando vazio ≠
 *                              zero (ex.: min_garantido, perc_reajuste).
 *                              Preserva a distinção entre "documento omisso"
 *                              e "documento afirma zero" pro engine.
 */

export function normalizarChave(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Extrai pares `chave...........:valor` de uma linha.
 * Funciona pra linhas com múltiplos pares alinhados em colunas.
 *
 * Estratégia: encontra cada ocorrência de `\.{2,}:` (sequência de pontos
 * seguida de `:`) e usa como delimitador. A chave é o texto antes dos pontos,
 * o valor é o texto entre `:` e o próximo bloco de pontos (ou fim da linha).
 *
 * Exemplo:
 *   "Estabelecimento:VIA VAREJO SA   Matriz/Filial..:Filial"
 *   → { estabelecimento: "VIA VAREJO SA", matriz_filial: "Filial" }
 *
 * Aceita também a forma sem pontos: `Chave:Valor` (alguns campos do
 * ADP-Web são assim, como "Estabelecimento:" sem pontos).
 */
export function extrairCamposKV(linha: string): Map<string, string> {
  const resultado = new Map<string, string>();
  // Regex captura grupos com pontos OU sem pontos:
  //   chave (letras/acentos/espaços/barra/parênteses/pontuação)
  //   pontos (\.{0,}) seguidos de `:`
  //   valor (lazy até 2+ espaços + próxima chave OU fim)
  //
  // Olhando linhas reais:
  //   "Estabelecimento:VIA VAREJO SA            Matriz/Filial..:Filial"
  //   "CNPJ...........:33.041.260/0778-92     Insc.Estadual..:9061532703"
  //   "Endereço.......:Jacob Macanhan         Nº.............:449   Complemento....:Salas 1 A 3"
  //
  // A chave pode ter espaços internos ("Estado Civil", "Cart.Habil.") mas
  // não múltiplos espaços. O delimitador entre pares é 2+ espaços seguido
  // por uma chave que tem 2+ pontos antes do ":".
  const regex = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9º\/\(\)\.\s]*?)\.{0,}:\s*((?:[^:\n](?!\s{2,}[A-Za-zÀ-ÿ][^:\n]{0,40}\.{1,}:))*[^:\n\s])/g;

  let match;
  while ((match = regex.exec(linha)) !== null) {
    const chaveRaw = match[1].trim();
    if (!chaveRaw) continue;
    const chave = normalizarChave(chaveRaw);
    const valor = match[2].trim();
    if (chave && !resultado.has(chave)) {
      resultado.set(chave, valor);
    }
  }
  return resultado;
}

/**
 * Converte "Sim"/"Não"/"S"/"N" pra boolean.
 * Vazio/desconhecido → null.
 */
export function parseBoolBR(s: string | undefined | null): boolean | null {
  if (s == null) return null;
  const t = s.trim().toLowerCase();
  if (t === '') return null;
  if (['sim', 's', 'true', '1'].includes(t)) return true;
  if (['não', 'nao', 'n', 'false', '0', '-'].includes(t)) return false;
  return null;
}

/**
 * Converte "1.234,56" → 1234.56. String vazia/inválida → 0.
 *
 * Use quando 0 é o default semanticamente correto.
 */
export function parseNumeroBR(s: string | undefined | null): number {
  if (s == null) return 0;
  const t = s.trim();
  if (t === '' || t === '-' || t === '?') return 0;
  const limpo = t.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

/**
 * Converte "1.234,56" → 1234.56. Vazio/"?"/"-" → null.
 *
 * Use quando vazio ≠ zero (ex.: min_garantido em comissionista, perc_reajuste
 * marcado como `?` pelo ADP-Web). Preserva a distinção entre "documento
 * omisso" e "documento afirma zero".
 */
export function parseNumeroBROuNull(s: string | undefined | null): number | null {
  if (s == null) return null;
  const t = s.trim();
  if (t === '' || t === '?' || t === '-') return null;
  const limpo = t.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isNaN(n) ? null : n;
}

/**
 * Detecta posições das colunas de uma tabela a partir da linha de
 * separadores `¯¯¯¯¯`. Devolve array em ordem.
 */
export function detectarColunasTabela(linhaSeparador: string): Array<{ start: number; end: number }> {
  const cols: Array<{ start: number; end: number }> = [];
  let i = 0;
  while (i < linhaSeparador.length) {
    if (linhaSeparador[i] === '¯') {
      const start = i;
      while (i < linhaSeparador.length && linhaSeparador[i] === '¯') i++;
      cols.push({ start, end: i });
    } else {
      i++;
    }
  }
  return cols;
}

/**
 * Extrai células de uma linha de dado baseado nas colunas detectadas.
 * Cada célula é o trim do substring(col.start, col.end + tolerância).
 *
 * Tolerância de +5 chars no fim é pra absorver overflow de células com
 * texto que excede a largura da coluna (comum em colunas de "Motivo" curtas).
 */
export function extrairCelulas(linha: string, colunas: Array<{ start: number; end: number }>): string[] {
  return colunas.map((col, idx) => {
    if (col.start >= linha.length) return '';
    // Pra última coluna, vai até fim da linha. Pra colunas intermediárias,
    // limita pela próxima coluna pra evitar invadir o vizinho.
    const proximaColStart = colunas[idx + 1]?.start ?? linha.length;
    const fim = Math.min(proximaColStart, linha.length);
    return linha.substring(col.start, fim).trim();
  });
}

/**
 * Encontra a linha de separadores (`¯¯¯¯`) DEPOIS da linha de cabeçalho.
 * Retorna índice ou -1.
 */
export function indiceLinhaSeparadorTabela(linhas: string[], inicio = 0): number {
  for (let i = inicio; i < linhas.length; i++) {
    if (/^\s*¯{10,}/.test(linhas[i])) return i;
  }
  return -1;
}
