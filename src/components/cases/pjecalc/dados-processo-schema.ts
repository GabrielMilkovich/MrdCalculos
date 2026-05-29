/**
 * Schema de validação — Dados do Processo (paridade PJe-Calc Cidadão v2.15.1).
 *
 * Regras extraídas do Java decompilado (ver docs/specs/dados-do-processo.md):
 *  - CNJ: opcional; se preenchido, dígito verificador mod-97 deve bater
 *    (IdentificadorDoProcesso.calcularDigito — equivale à regra "tudo-ou-nada"
 *    + MSG0109). Reuso de validarProcessoCNJ (Res. CNJ 65/2008).
 *  - Reclamante Doc. Fiscal: validado por tipo SOMENTE se preenchido
 *    (Calculo.validar:722-737). CPF/CNPJ via dígito verificador.
 *  - Reclamante Doc. Previdenciário (PIS/PASEP/NIT): @DocumentoPrevidenciario
 *    (mod-11) se preenchido.
 *  - Reclamada Doc. Fiscal: **NÃO validado** no Java (parity — regra segue Java).
 *  - Valor da Causa / Autuado em: opcionais, sem validação no Java.
 *
 * Money SEMPRE via Decimal.js (regra inegociável do projeto) — nunca number nativo.
 */
import { z } from "zod";
import Decimal from "decimal.js";
import {
  validarCPF,
  validarCNPJ,
  validarPIS,
  validarProcessoCNJ,
} from "@/lib/validadores";

Decimal.set({ precision: 20 });

// Enums espelhando o Java (constantes/TipoCalculoEnum, TipoDocumentoFiscalEnum,
// TipoDocumentoPrevidenciarioEnum).
export const TIPO_CALCULO = ["ADVOGADO", "CREDOR", "DEVEDOR", "VARA", "GABINETE"] as const;
export const TIPO_DOC_FISCAL = ["CPF", "CNPJ", "CEI"] as const;
export const TIPO_DOC_PREV = ["PIS", "PASEP", "NIT"] as const;

export type TipoCalculo = (typeof TIPO_CALCULO)[number];
export type TipoDocFiscal = (typeof TIPO_DOC_FISCAL)[number];
export type TipoDocPrev = (typeof TIPO_DOC_PREV)[number];

/** Documento fiscal válido para o tipo. Vazio = válido (campo opcional). */
export function docFiscalValido(numero: string | undefined, tipo: TipoDocFiscal): boolean {
  const n = (numero ?? "").replace(/\D+/g, "");
  if (!n) return true;
  if (tipo === "CPF") return validarCPF(n);
  if (tipo === "CNPJ") return validarCNPJ(n);
  // CEI: o Java valida (TipoDocumentoFiscal.CEI), mas não há validador local
  // em validadores.ts. Aceita por ora (debt registrada na spec §6).
  return true;
}

/**
 * Converte valor monetário pt-BR → Decimal fixo (2 casas) string p/ persistir.
 * Aceita "1.234,56", "1234,56" e "1234.56". Retorna null se vazio.
 * Lança se inválido (chamador trata).
 */
export function parseValorCausa(v: string | undefined | null): string | null {
  const s = (v ?? "").trim();
  if (s === "") return null;
  // pt-BR quando há vírgula decimal: remove pontos de milhar, vírgula → ponto.
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return new Decimal(normalized).toFixed(2);
}

export const dadosProcessoSchema = z
  .object({
    // Header
    tipo_calculo: z.enum(TIPO_CALCULO),
    // Identificação do Processo
    processo_cnj: z.string().trim().default(""),
    valor_causa: z.string().trim().default(""),
    data_autuacao: z.string().trim().default(""),
    tribunal: z.string().trim().default(""),
    vara: z.string().trim().default(""),
    // Reclamante
    reclamante_nome: z.string().trim().default(""),
    reclamante_doc_tipo: z.enum(TIPO_DOC_FISCAL),
    reclamante_cpf: z.string().trim().default(""),
    reclamante_pis_nit_tipo: z.enum(TIPO_DOC_PREV),
    reclamante_pis_nit: z.string().trim().default(""),
    // Reclamada
    reclamado_nome: z.string().trim().default(""),
    reclamado_doc_tipo: z.enum(TIPO_DOC_FISCAL),
    reclamado_cnpj: z.string().trim().default(""),
    // Extras MRD (fora da paridade PJe — ADC 58 / citação)
    citacao_habilitada: z.boolean().default(false),
    data_citacao: z.string().trim().default(""),
  })
  .superRefine((v, ctx) => {
    // CNJ — opcional; se preenchido, dígito mod-97 deve bater.
    if (v.processo_cnj.replace(/\D+/g, "").length > 0 && !validarProcessoCNJ(v.processo_cnj)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["processo_cnj"],
        message: "Número CNJ inválido (formato/dígito verificador).",
      });
    }
    // Valor da causa — se preenchido, Decimal não-negativo.
    if (v.valor_causa.trim() !== "") {
      try {
        if (parseValorCausa(v.valor_causa) === null) throw new Error();
        const d = new Decimal(
          v.valor_causa.includes(",")
            ? v.valor_causa.replace(/\./g, "").replace(",", ".")
            : v.valor_causa,
        );
        if (d.isNegative()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor_causa"], message: "Valor da causa não pode ser negativo." });
        }
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor_causa"], message: "Valor da causa inválido." });
      }
    }
    // Reclamante Doc. Fiscal — validado por tipo (Java valida só reclamante).
    if (!docFiscalValido(v.reclamante_cpf, v.reclamante_doc_tipo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reclamante_cpf"],
        message: `${v.reclamante_doc_tipo} do reclamante inválido.`,
      });
    }
    // Reclamante Doc. Previdenciário — se preenchido, mod-11.
    if (v.reclamante_pis_nit.replace(/\D+/g, "").length > 0 && !validarPIS(v.reclamante_pis_nit)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reclamante_pis_nit"],
        message: "Documento previdenciário inválido (dígito verificador).",
      });
    }
    // Citação (ADC 58) — se habilitada, data obrigatória.
    if (v.citacao_habilitada && v.data_citacao.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["data_citacao"],
        message: "Data de citação obrigatória quando habilitada.",
      });
    }
    // Reclamada Doc. Fiscal — sem validação (paridade: Java não valida reclamado).
  });

export type DadosProcessoForm = z.infer<typeof dadosProcessoSchema>;

export const dadosProcessoDefaults: DadosProcessoForm = {
  tipo_calculo: "ADVOGADO",
  processo_cnj: "",
  valor_causa: "",
  data_autuacao: "",
  tribunal: "",
  vara: "",
  reclamante_nome: "",
  reclamante_doc_tipo: "CPF",
  reclamante_cpf: "",
  reclamante_pis_nit_tipo: "PIS",
  reclamante_pis_nit: "",
  reclamado_nome: "",
  reclamado_doc_tipo: "CNPJ",
  reclamado_cnpj: "",
  citacao_habilitada: false,
  data_citacao: "",
};

/** Mapeia o form → payload de colunas REAIS de pjecalc_calculos (corrige o bug
 * histórico de gravar nomes-alias inexistentes). `userId` p/ satisfazer RLS
 * (user_id = auth.uid()) no INSERT. */
export function toPjecalcCalculosPayload(
  form: DadosProcessoForm,
  caseId: string,
  userId: string | null,
): Record<string, unknown> {
  return {
    case_id: caseId,
    ...(userId ? { user_id: userId } : {}),
    tipo_calculo: form.tipo_calculo,
    processo_cnj: form.processo_cnj.trim() || null,
    valor_causa: parseValorCausa(form.valor_causa),
    data_autuacao: form.data_autuacao.trim() || null,
    tribunal: form.tribunal.trim() || null,
    vara: form.vara.trim() || null,
    reclamante_nome: form.reclamante_nome.trim() || null,
    reclamante_doc_tipo: form.reclamante_doc_tipo,
    reclamante_cpf: form.reclamante_cpf.trim() || null,
    reclamante_pis_nit_tipo: form.reclamante_pis_nit_tipo,
    reclamante_pis_nit: form.reclamante_pis_nit.trim() || null,
    reclamado_nome: form.reclamado_nome.trim() || null,
    reclamado_doc_tipo: form.reclamado_doc_tipo,
    reclamado_cnpj: form.reclamado_cnpj.trim() || null,
    data_citacao: form.data_citacao.trim() || null,
    modo_calculo: form.citacao_habilitada ? "assisted_from_pjc" : "independent",
  };
}
