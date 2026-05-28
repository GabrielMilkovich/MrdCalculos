/**
 * Helpers compartilhados pelos 13 parsers de seção da CTPS V2.
 *
 * Convenção de número:
 *   - `parseNumeroBR`        — vazio/inválido → 0. Use quando 0 é o
 *                              default semanticamente correto.
 *   - `parseNumeroBROuNull`  — vazio/"?"/"-" → null. Use quando vazio ≠
 *                              zero (ex.: min_garantido, perc_reajuste).
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

// Caracteres aceitos no nome da chave (sem dots iniciais ou colon final).
// Inclui acentos, dígitos, º/ª, barras, parênteses, vírgula, ponto interno
// (Sal.Tarefa, Insc.Estadual), espaço (Estado Civil, Grau Instrução).
//
// IMPORTANTE: ancorado em ^ OU (?<=\s{2,}) pra evitar backtracking através
// de valores multi-palavra. Body permite SINGLE space entre palavras (Estado
// Civil, Grau Instrução), mas NÃO permite 2+ espaços consecutivos no nome
// da chave — isso seria o boundary com o próximo campo.
//
// `\.{0,}` aceita 0+ dots → cobre "Data Desligamento:" (0 dots), "Grau
// Instrução.:" (1 dot) e "CNPJ...........:" (11 dots).
const RE_CHAVE_DOTTED =
  /(?:^|(?<=\s{2,}))([A-ZÀ-Ú1º][A-Za-zÀ-ÿ0-9º²ª\/\(\),\.]*(?:\s[A-Za-zÀ-ÿ0-9º²ª\/\(\),\.]+)*)\.{0,}:/g;

// Pra linha que começa com "Estabelecimento:" (sem dots antes do colon).
const RE_CHAVE_SEM_DOTS_INICIO = /^\s*([A-ZÀ-Ú1º][A-Za-zÀ-ÿ0-9º²ª\/\(\),\.]+?):/;

// Pós-processamento: dentro de um VALOR já extraído, detecta chave embedded
// com SEPARADOR DE 1 ESPAÇO SÓ (caso CTPS...:009144100598PR CPF............:35925701968).
// Aqui exigimos `\.{2,}` pra ser conservador — chave embedded sem 2+ pontos
// é arriscada (valor + texto que parece chave).
const RE_KV_EMBEDDED = /^(.*?)\s+([A-ZÀ-Ú1º][A-Za-zÀ-ÿ0-9º²ª\/\(\),\.\s]*?)\.{2,}:(.*)$/;

interface MarcadorKV {
  keyStart: number;
  valueStart: number;
  key: string;
}

/**
 * Extrai pares `chave...........:valor` de uma linha.
 * Funciona pra linhas com múltiplos pares alinhados em colunas.
 *
 * Estratégia: localiza TODAS as posições onde aparece `<KEY>\.{2,}:` (o
 * marker mais forte — chave com 2+ pontos antes do colon), mais a chave
 * sem-pontos no início da linha (caso "Estabelecimento:"). O valor de
 * cada marker é o trecho entre seu colon e o próximo marker (ou fim de linha).
 *
 * Robusto a:
 *   - 1 espaço só entre valor e próxima chave (`CTPS...:009144100598PR CPF...:...`)
 *   - vírgulas dentro de chave (`End(Rua,Av)....:`)
 *   - valor com múltiplas palavras (`VIA VAREJO SA`)
 *   - valor vazio (`Complemento....:`)
 */
export function extrairCamposKV(linha: string): Map<string, string> {
  const resultado = new Map<string, string>();
  const markers: MarcadorKV[] = [];

  // 1) Tier principal: chaves dot-prefixed (\.{2,}:)
  RE_CHAVE_DOTTED.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_CHAVE_DOTTED.exec(linha)) !== null) {
    const chaveRaw = m[1].trim();
    if (!chaveRaw) continue;
    markers.push({
      keyStart: m.index,
      valueStart: m.index + m[0].length,
      key: normalizarChave(chaveRaw),
    });
  }

  // 2) Tier complementar: chave no início da linha sem dots.
  // Só adiciona se ainda não houver marker antes dela.
  const startM = linha.match(RE_CHAVE_SEM_DOTS_INICIO);
  if (startM) {
    const keyStart = linha.indexOf(startM[1]);
    if (!markers.some((mk) => mk.keyStart <= keyStart)) {
      markers.unshift({
        keyStart,
        valueStart: keyStart + startM[1].length + 1, // +1 pelo ":"
        key: normalizarChave(startM[1]),
      });
    }
  }

  // 3) Ordena por posição e atribui valores (do colon até o próximo keyStart).
  markers.sort((a, b) => a.keyStart - b.keyStart);
  for (let i = 0; i < markers.length; i++) {
    const fim = markers[i + 1]?.keyStart ?? linha.length;
    let valor = linha.substring(markers[i].valueStart, fim).trim();

    // 3b) Pós-processamento: detecta chave embedded com 1 espaço de separador.
    // Loop pra cobrir cadeia (raro mas possível em linhas muito densas).
    while (true) {
      const embedded = valor.match(RE_KV_EMBEDDED);
      if (!embedded) break;
      const valorAtual = embedded[1].trim();
      const chaveEmbeddedRaw = embedded[2].trim();
      const valorEmbedded = embedded[3].trim();
      if (!chaveEmbeddedRaw) break;
      valor = valorAtual;
      const chaveEmbedded = normalizarChave(chaveEmbeddedRaw);
      if (chaveEmbedded && !resultado.has(chaveEmbedded)) {
        resultado.set(chaveEmbedded, valorEmbedded);
      }
      // continua scanning o valor embedded em busca de mais chaves
      valor = valorAtual;
      // Re-aponta loop pro valorEmbedded pra scan adicional
      const nextEmbedded = valorEmbedded.match(RE_KV_EMBEDDED);
      if (nextEmbedded) {
        // raro, mas suporta cadeia A...:V1 B...:V2 C...:V3 com 1 espaço
        let restante = valorEmbedded;
        let chaveAtual = chaveEmbedded;
        while (true) {
          const more = restante.match(RE_KV_EMBEDDED);
          if (!more) break;
          // atualiza o valor da última chave inserida
          resultado.set(chaveAtual, more[1].trim());
          const cNew = normalizarChave(more[2].trim());
          if (cNew && !resultado.has(cNew)) {
            resultado.set(cNew, more[3].trim());
          }
          restante = more[3];
          chaveAtual = cNew;
        }
      }
      break;
    }

    if (markers[i].key && !resultado.has(markers[i].key)) {
      resultado.set(markers[i].key, valor);
    }
  }

  return resultado;
}

/**
 * Aplica `extrairCamposKV` a múltiplas linhas e merge o resultado num único Map.
 * Conveniência pros parsers de seção key-value (local_trabalho, dados_pessoais, etc.).
 */
export function mergeCamposKV(linhas: string[]): Map<string, string> {
  const merged = new Map<string, string>();
  for (const linha of linhas) {
    for (const [k, v] of extrairCamposKV(linha)) {
      if (!merged.has(k)) merged.set(k, v);
    }
  }
  return merged;
}

/**
 * Variante WHITELIST de `extrairCamposKV`. Recebe a lista de chaves esperadas
 * da seção e marca posições onde cada uma aparece, separadas por 0+ dots e ":".
 * Valor de cada chave = trecho até a próxima chave conhecida ou fim de linha.
 *
 * Robusto a texto em formato `extrairGeometrico` (1 espaço entre campos) e a
 * `pdftotext -layout` (multi-espaço alinhado em colunas). Necessário porque o
 * `extrairCamposKV` genérico não consegue distinguir "VAREJO SA Matriz/Filial..:"
 * (valor + chave) de uma chave composta sem âncora de espaço duplo.
 *
 * Caso a mesma chave apareça 2+ vezes na seção (pouco comum), só o primeiro
 * valor é mantido.
 */
export function extrairCamposKVConhecidos(
  linha: string,
  chavesConhecidas: readonly string[],
): Map<string, string> {
  type Hit = { start: number; valueStart: number; key: string };

  // Ordena chaves por comprimento desc — chaves longas (ex.: "Data Desligamento
  // com Projeção Aviso Prévio") devem ser detectadas antes das curtas que são
  // prefixo delas (ex.: "Data Desligamento").
  const chavesOrdenadas = [...chavesConhecidas].sort((a, b) => b.length - a.length);

  const hits: Hit[] = [];
  for (const chave of chavesOrdenadas) {
    const escaped = chave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|\\s)(${escaped})\\.{0,}:`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(linha)) !== null) {
      const prefixoLen = m[1].length;
      const start = m.index + prefixoLen;
      hits.push({
        start,
        valueStart: m.index + m[0].length,
        key: normalizarChave(chave),
      });
    }
  }

  // Ordena por posição; descarta hits sobrepostos (preferindo o que foi
  // adicionado primeiro = chave mais longa, pois ordenamos desc por length).
  hits.sort((a, b) => a.start - b.start);
  const filtered: Hit[] = [];
  for (const h of hits) {
    const last = filtered[filtered.length - 1];
    if (!last || h.start >= last.valueStart) {
      filtered.push(h);
    }
  }

  const resultado = new Map<string, string>();
  for (let i = 0; i < filtered.length; i++) {
    const fim = filtered[i + 1]?.start ?? linha.length;
    const valor = linha.substring(filtered[i].valueStart, fim).trim();
    if (!resultado.has(filtered[i].key)) {
      resultado.set(filtered[i].key, valor);
    }
  }
  return resultado;
}

/**
 * Aplica `extrairCamposKVConhecidos` a múltiplas linhas e merge num Map único.
 */
export function mergeCamposKVConhecidos(
  linhas: string[],
  chavesConhecidas: readonly string[],
): Map<string, string> {
  const merged = new Map<string, string>();
  for (const linha of linhas) {
    for (const [k, v] of extrairCamposKVConhecidos(linha, chavesConhecidas)) {
      if (!merged.has(k)) merged.set(k, v);
    }
  }
  return merged;
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
  if (['não', 'nao', 'n', 'false', '0'].includes(t)) return false;
  if (t === '-') return null;
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
 * marcado como `?` pelo ADP-Web).
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
 * Cada célula é o trim do substring até o início da próxima coluna.
 */
export function extrairCelulas(
  linha: string,
  colunas: Array<{ start: number; end: number }>,
): string[] {
  return colunas.map((col, idx) => {
    if (col.start >= linha.length) return '';
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
