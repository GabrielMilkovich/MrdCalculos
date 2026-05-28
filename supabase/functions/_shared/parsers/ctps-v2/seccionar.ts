/**
 * Section splitter para Ficha de Anotações CTPS.
 *
 * Estratégia:
 *   1. Itera linhas. Cada linha cujo conteúdo (após trim) bate um dos
 *      regexes de header é o início de uma seção.
 *   2. Acumula linhas no buffer da seção atual.
 *   3. Filtra linhas que são rodapé/cabeçalho de página (URL, "Assinado
 *      eletronicamente", linha de CNPJ matriz, etc.).
 *   4. Quando o mesmo header reaparece (continuação de seção em página
 *      nova), o buffer NOVO é APENDADO ao existente — preserva todas as
 *      linhas de seções que cruzam quebra de página.
 *
 * Pure function — input string, output Map. Sem I/O, sem side effects.
 */

export type NomeSecao =
  | 'LOCAL_TRABALHO'
  | 'DADOS_PESSOAIS'
  | 'ENDERECO_RESIDENCIAL'
  | 'DEPENDENTES'
  | 'DADOS_EMPREGADO'
  | 'FUNCAO_ATUAL'
  | 'INFORMACOES_SINDICAIS'
  | 'HISTORICO_SALARIAL'
  | 'FUNCOES_EXERCIDAS'
  | 'HISTORICO_LOTACAO'
  | 'AFASTAMENTOS'
  | 'AFASTAMENTOS_OUTROS'
  | 'HISTORICO_FERIAS';

// Headers em ordem de prioridade. AFASTAMENTOS_OUTROS vem ANTES de AFASTAMENTOS
// pra evitar match prematuro (regex de AFASTAMENTOS faria match em "AFASTAMENTOS OUTROS").
const HEADERS: Array<{ regex: RegExp; nome: NomeSecao }> = [
  { regex: /^\s*LOCAL\s+DE\s+TRABALHO\s*$/i, nome: 'LOCAL_TRABALHO' },
  { regex: /^\s*DADOS\s+PESSOAIS\s*$/i, nome: 'DADOS_PESSOAIS' },
  { regex: /^\s*ENDERE[ÇC]O\s+RESIDENCIAL\s*$/i, nome: 'ENDERECO_RESIDENCIAL' },
  { regex: /^\s*DEPENDENTES\s*$/i, nome: 'DEPENDENTES' },
  { regex: /^\s*DADOS\s+DE\s+EMPREGADO\s*$/i, nome: 'DADOS_EMPREGADO' },
  { regex: /^\s*FUN[ÇC][ÃA]O\s+ATUAL\s*$/i, nome: 'FUNCAO_ATUAL' },
  { regex: /^\s*INFORMA[ÇC][ÕO]ES\s+SINDICAIS\s*$/i, nome: 'INFORMACOES_SINDICAIS' },
  { regex: /^\s*HIST[ÓO]RICO\s+SALARIAL\s*$/i, nome: 'HISTORICO_SALARIAL' },
  { regex: /^\s*AFASTAMENTOS\s+OUTROS\s*$/i, nome: 'AFASTAMENTOS_OUTROS' },
  { regex: /^\s*FUN[ÇC][ÕO]ES\s+EXERCIDAS\s*$/i, nome: 'FUNCOES_EXERCIDAS' },
  { regex: /^\s*HIST[ÓO]RICO\s+DE\s+LOTA[ÇC][ÃA]O\s*$/i, nome: 'HISTORICO_LOTACAO' },
  { regex: /^\s*AFASTAMENTOS\s*$/i, nome: 'AFASTAMENTOS' },
  { regex: /^\s*HIST[ÓO]RICO\s+DE\s+F[ÉE]RIAS\s*$/i, nome: 'HISTORICO_FERIAS' },
];

// Linha de separador (¯¯¯¯¯...) — descartada porque não traz informação
// útil pros parsers de seção (eles redetectam colunas a partir do header).
const LINHA_SEPARADOR = /^\s*¯{20,}/;

// Rodapé ADP-Web / PJe: URL, assinatura eletrônica, número de processo,
// identificador interno "NNNN / NNN / L / ..." (auditoria SAP/ADP),
// "Portarias MTE" usado por algumas variantes.
const LINHA_RODAPE = new RegExp(
  [
    '^\\s*https?:\\/\\/',
    '^\\s*Assinado eletronicamente',
    '^\\s*N[úu]mero do processo',
    '^\\s*N[úu]mero do documento',
    '^\\s*Portarias\\s+MTE',
    '^\\s*\\d{4}\\s*\\/\\s*\\d{3}\\s*\\/\\s*[A-Z]\\s*\\/',
  ].join('|'),
);

// Cabeçalho de página ADP-Web (repetido em cada página):
//   "DD/MM/AAAA  Programa de detalhe  Fls.: N"
//   "VIA VAREJO SA  Ficha de Anotações...  Página"
//   "NN.NNN.NNN/NNNN-NN     N"  (CNPJ matriz + número da página)
//   "Página" ou "Página N" sozinhos
const LINHA_CABECALHO_PAGINA = new RegExp(
  [
    '^\\s*\\d{2}\\/\\d{2}\\/\\d{4}.*Programa\\s+de\\s+detalhe.*Fls\\.?:?\\s*\\d+',
    '^\\s*VIA\\s+VAREJO.*Ficha\\s+de\\s+Anota',
    '^\\s*[A-ZÀ-Ú][A-ZÀ-Ú\\s]+\\s+Ficha\\s+de\\s+Anota[çc][õo]es',
    '^\\s*\\d{2}\\.\\d{3}\\.\\d{3}\\/\\d{4}-\\d{2}(\\s+\\d+)?\\s*$',
    '^\\s*P[áa]gina(\\s+\\d+)?\\s*$',
  ].join('|'),
);

function ehLinhaDescartavel(linha: string): boolean {
  if (LINHA_SEPARADOR.test(linha)) return true;
  if (LINHA_RODAPE.test(linha)) return true;
  if (LINHA_CABECALHO_PAGINA.test(linha)) return true;
  return false;
}

export function seccionar(texto: string): Map<NomeSecao, string[]> {
  const linhas = texto.split('\n');
  const secoes = new Map<NomeSecao, string[]>();
  let secaoAtual: NomeSecao | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (secaoAtual && buffer.length > 0) {
      const limpas = buffer.filter((l) => !ehLinhaDescartavel(l) && l.trim().length > 0);
      if (limpas.length > 0) {
        const prev = secoes.get(secaoAtual) ?? [];
        secoes.set(secaoAtual, [...prev, ...limpas]);
      }
    }
    buffer = [];
  };

  for (const linha of linhas) {
    let isNovoHeader = false;
    for (const { regex, nome } of HEADERS) {
      if (regex.test(linha)) {
        flush();
        secaoAtual = nome;
        isNovoHeader = true;
        break;
      }
    }
    if (isNovoHeader) continue;
    if (secaoAtual) buffer.push(linha);
  }
  flush();

  return secoes;
}
