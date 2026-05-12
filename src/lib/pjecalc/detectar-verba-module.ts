/**
 * Auto-detect de qual verba-module aplicar a uma PjeVerba com base no nome.
 *
 * Sessão 4 do roadmap pixel-perfect: o motor V3 tinha 33 verba-modules
 * implementados (com lógica jurídica refinada — Súmula 340 TST, Art. 73
 * §1° CLT, abono pecuniário, faixas específicas de cada verba) mas
 * NUNCA eram invocados. Esta função faz o bridge: do nome livre da
 * UI ("Horas Extras 50%") para o ID do módulo registrado ('HE_50').
 *
 * Quando o operador cadastrar a verba com nome livre, o nome é
 * normalizado (upper + remove acento + colapsa espaços) e comparado
 * contra padrões. O primeiro padrão que casa devolve o ID.
 *
 * Se nenhum padrão casar, retorna null e o gerador `from-scratch`
 * cai na lógica genérica (que continua funcionando para casos
 * simples).
 */
import type { PjeVerba } from "./engine-types";

interface Padrao {
  /** Regex testada contra nome normalizado. Primeiro match vence. */
  pattern: RegExp;
  /** ID do verba-module a usar. */
  moduleId: string;
  /** Modo de pagamento compatível (filtragem extra). */
  ocorrencia?: PjeVerba["ocorrencia_pagamento"][];
}

/**
 * Lista ordenada de padrões — MAIS ESPECÍFICOS PRIMEIRO. Quando dois
 * padrões podem casar, o que vier primeiro vence (ex.: "HE feriado 100%"
 * casa primeiro com FERIADOS_LABORADOS, depois com HE_100).
 */
const PADROES: Padrao[] = [
  // Multas CLT — específicas (467 / 477)
  { pattern: /\bmulta\b.*\b467\b|\bart\.?\s*467\b/i, moduleId: "MULTA_467" },
  { pattern: /\bmulta\b.*\b477\b|\bart\.?\s*477\b/i, moduleId: "MULTA_477" },

  // FGTS multa 40% (rescisória) — antes de HE para não confundir
  // "%" não é word boundary então não usamos \b ao redor.
  {
    pattern: /multa.*40\s*%.*fgts|fgts.*40\s*%|multa.*40\s+(do\s+)?fgts/i,
    moduleId: "MULTA_40_FGTS",
  },
  { pattern: /\bdiferen[çc]as?\b.*\bfgts\b|\bfgts\b.*\brescis/i, moduleId: "FGTS_DIF" },

  // DSR — ANTES das HE para "DSR sobre HE" funcionar
  {
    pattern: /\bdsr\b|\brepouso\s+semanal\b|\brsr\b/i,
    moduleId: "DSR",
  },

  // Feriados laborados (HE 100% sobre feriado, DOM/FER específico)
  {
    pattern:
      /\bferiado\b.*\b(laborado|trabalhado)\b|\bdom\b.*\bferiado\b|\bdomingo\b.*\b(laborado|trabalhado)\b/i,
    moduleId: "DOM_FER",
  },

  // Intervalos
  {
    pattern: /\bintervalo\b.*\b(intrajornada|suprimido|11\s*ª?|intra)\b/i,
    moduleId: "INTRAJORNADA",
  },
  { pattern: /\bintervalo\b.*\b(interjornada|inter)\b/i, moduleId: "INTERJORNADA" },
  { pattern: /\bart\.?\s*384\b|\barti?go?\s+384\b/i, moduleId: "ART384" },

  // Horas extras
  { pattern: /\bhoras?\s+extras?\b.*\b100\b|\bhe\b.*\b100\b/i, moduleId: "HE_100" },
  { pattern: /\bhoras?\s+extras?\b|\bhe\b\s*(\d{2,3}%)?/i, moduleId: "HE_50" },

  // Adicional Noturno
  {
    pattern: /\b(adicional|adic\.?)\s*noturno\b|\bad\s*noturno\b/i,
    moduleId: "ADIC_NOTURNO",
  },

  // Insalubridade / Periculosidade
  { pattern: /\binsalubridade\b/i, moduleId: "INSALUBRIDADE" },
  { pattern: /\bpericul(osidade)?\b/i, moduleId: "PERICULOSIDADE" },

  // Adicional de transferência (aceita "de" no meio)
  {
    pattern: /\b(adicional|adic\.?)\s+(de\s+)?transfer[êe]ncia\b/i,
    moduleId: "ADIC_TRANSFERENCIA",
  },

  // Acúmulo de função
  { pattern: /\bac[úu]mulo\s+(de\s+)?fun[çc][ãa]o\b/i, moduleId: "ACUMULO_FUNCAO" },
  // Gratificação de função
  { pattern: /\bgratifica[çc][ãa]o\s+(de\s+)?fun[çc][ãa]o\b/i, moduleId: "GRATIFICACAO_FUNCAO" },

  // 13º salário
  {
    pattern: /\b13[ºoa°]?\s*sal[áa]rio\b|\bdecimo\s+terceiro\b|\b13[ºoa°]\b/i,
    moduleId: "DECIMO_PROP",
  },

  // Férias — proporcionais vs vencidas
  {
    pattern: /\bf[ée]rias\b.*\b(proporcion|prop\.)\b/i,
    moduleId: "FERIAS_PROP",
  },
  {
    pattern: /\bf[ée]rias\b.*\b(vencidas?|indenizadas?|n[ãa]o\s*gozadas?)\b/i,
    moduleId: "FERIAS_VENC",
  },
  { pattern: /\bf[ée]rias\b/i, moduleId: "FERIAS_PROP" }, // fallback férias

  // Aviso prévio
  {
    pattern: /\baviso\s+pr[ée]vio\b|\baviso\s+indenizado\b|\baviso\s+trabalhado\b/i,
    moduleId: "AVISO_PREVIO_PROPORCIONAL",
  },

  // Diferenças salariais
  { pattern: /\bdiferen[çc]as?\s+salariais\b/i, moduleId: "DIF_SALARIAIS" },

  // Comissões / prêmios
  { pattern: /\bcomiss[õo]es?\b/i, moduleId: "COMISSAO" },
  { pattern: /\bpr[êe]mio\b/i, moduleId: "PREMIO" },

  // Gorjetas
  { pattern: /\bgorjeta(s)?\b/i, moduleId: "GORJETA" },

  // Cesta básica
  { pattern: /\bcesta\s+b[áa]sica\b|\bvale\s+aliment/i, moduleId: "CESTA_BASICA" },

  // Salário maternidade
  { pattern: /\bsal[áa]rio[\s-]*maternidade\b/i, moduleId: "SALARIO_MATERNIDADE" },

  // PLR
  { pattern: /\bplr\b|\bparticipa[çc][ãa]o\s+(nos\s+)?lucros\b/i, moduleId: "PLR_PROP" },

  // Estabilidade
  { pattern: /\bestabilidade\b/i, moduleId: "ESTABILIDADE" },

  // Reintegração
  { pattern: /\breintegra[çc][ãa]o\b/i, moduleId: "REINTEGRACAO" },

  // Equiparação salarial
  { pattern: /\bequipara[çc][ãa]o\s+salarial\b/i, moduleId: "EQUIPARACAO_SALARIAL" },

  // Danos morais/materiais
  { pattern: /\bdanos?\s+morais\b/i, moduleId: "DANOS_MORAIS" },
  { pattern: /\bdanos?\s+materiais\b/i, moduleId: "DANOS_MATERIAIS" },

  // Indenização pré-database (CCT/ACT)
  { pattern: /\bpr[ée][\s-]*data\s*[\s-]*base\b/i, moduleId: "INDENIZACAO_PRE_DATABASE" },

  // Trabalho intermitente (CLT 452-A)
  {
    pattern: /\btrabalho\s+intermitente\b|\b452[\s-]*A\b/i,
    moduleId: "TRABALHO_INTERMITENTE",
  },
];

function normalizar(nome: string): string {
  return nome
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Devolve o ID do verba-module a usar para esta verba, ou null se nenhum
 * padrão casar. O caller decide se invoca o módulo ou cai no genérico.
 */
export function detectarVerbaModuleId(verba: PjeVerba): string | null {
  const nome = normalizar(verba.nome ?? "");
  if (!nome) return null;
  for (const p of PADROES) {
    if (p.pattern.test(nome)) {
      if (p.ocorrencia && !p.ocorrencia.includes(verba.ocorrencia_pagamento)) {
        continue;
      }
      return p.moduleId;
    }
  }
  return null;
}
