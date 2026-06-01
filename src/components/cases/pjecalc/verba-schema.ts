/**
 * Validação — Verba de Cálculo (paridade PJe-Calc v2.15.1, modelo flattened MRD).
 *
 * Regras de VerbaDeCalculo/Calculada/Reflexo.validar() (Java) traduzidas ao nível
 * achatado do MRD (pjecalc_verba_base). Ver docs/specs/cadastro-de-verbas.md:
 *  - descrição/nome obrigatório (@NotNull).
 *  - período fim ≥ início (consistirPeriodoFinal, MSG0008).
 *  - divisor ≠ 0 (proteção numérica); multiplicador/quantidade numéricos.
 *  - se base de cálculo referencia HISTÓRICO, exigir histórico vinculado
 *    (Calculada.validar:116-118 → MSG0003 "Histórico Salarial").
 *
 * O agregado 3-camadas do Java (Verba+Formula+Termos) é achatado no MRD; aqui
 * validamos os campos do form. Strings numéricas aceitam vírgula pt-BR.
 */
import { z } from "zod";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

/** Bases tabeladas que referenciam o histórico salarial (exigem vínculo). */
export const BASES_REQUEREM_HISTORICO = new Set<string>([
  "historico_salarial",
  "remuneracao",
  "remuneracao_media",
]);

/** Parse numérico tolerante. null se vazio; NaN se inválido. Aceita "1,5" e "1.5". */
function parseNum(v: string | undefined | null): number | null {
  const s = (v ?? "").trim();
  if (s === "") return null;
  return Number(s.replace(",", "."));
}

export const verbaSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe o nome da verba."),
    caracteristica: z.string().trim().default("COMUM"),
    base_tabelada: z.string().trim().default(""),
    hist_salarial_nome: z.string().trim().default(""),
    periodo_inicio: z.string().trim().default(""),
    periodo_fim: z.string().trim().default(""),
    multiplicador: z.string().trim().default("1"),
    divisor: z.string().trim().default("1"),
    quantidade_valor: z.string().trim().default(""),
  })
  .superRefine((v, ctx) => {
    // período fim ≥ início (ambos opcionais; valida quando os dois preenchidos)
    if (dateRe.test(v.periodo_inicio) && dateRe.test(v.periodo_fim) && v.periodo_fim < v.periodo_inicio) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["periodo_fim"], message: "Período fim não pode ser anterior ao início." });
    }
    // multiplicador numérico (quando preenchido)
    if (v.multiplicador.trim() !== "") {
      const m = parseNum(v.multiplicador);
      if (m == null || Number.isNaN(m)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["multiplicador"], message: "Multiplicador inválido." });
      }
    }
    // divisor numérico e ≠ 0 (quando preenchido)
    if (v.divisor.trim() !== "") {
      const d = parseNum(v.divisor);
      if (d == null || Number.isNaN(d)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["divisor"], message: "Divisor inválido." });
      } else if (d === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["divisor"], message: "Divisor não pode ser zero." });
      }
    }
    // quantidade ≥ 0 (quando preenchida)
    if (v.quantidade_valor.trim() !== "") {
      const q = parseNum(v.quantidade_valor);
      if (q == null || Number.isNaN(q) || q < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quantidade_valor"], message: "Quantidade inválida (deve ser ≥ 0)." });
      }
    }
    // base histórico ⇒ exige histórico vinculado (MSG0003 "Histórico Salarial")
    if (BASES_REQUEREM_HISTORICO.has(v.base_tabelada) && v.hist_salarial_nome.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hist_salarial_nome"],
        message: "Base de cálculo por histórico exige um histórico salarial vinculado.",
      });
    }
  });

export type VerbaForm = z.infer<typeof verbaSchema>;
