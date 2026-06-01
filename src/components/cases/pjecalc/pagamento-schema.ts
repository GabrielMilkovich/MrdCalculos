/**
 * Validação — Pagamento (paridade PJe-Calc v2.15.1).
 *
 * Regras de Pagamento.validar() (Pagamento.java:376-465):
 *  - valorPagamento obrigatório (MSG0003) — e > 0 (valor de quitação).
 *  - dataPagamento obrigatória (MSG0003 / @NotNull).
 *  - data não pode ser futura (> hoje) → MSG0128 (consistirDataDoPagamento:419).
 *  - sem pagamento com data duplicada → MSG0138 (consistirRegistroDuplicado).
 *  - (data ≥ liquidação MSG0127 e rateio MSG0125 fora do escopo flat — ver spec.)
 *
 * Valor monetário via Decimal (CLAUDE.md). Ver docs/specs/pagamentos.md.
 */
import { z } from "zod";
import Decimal from "decimal.js";

Decimal.set({ precision: 20 });

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

/** Parse valor pt-BR/en → Decimal; null se vazio/ inválido. */
function parseValor(v: string | undefined | null): Decimal | null {
  const s = (v ?? "").trim();
  if (s === "") return null;
  try {
    const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
    return new Decimal(norm);
  } catch {
    return null;
  }
}

export const pagamentoSchema = z
  .object({
    valor: z.string().trim().default(""),
    data_pagamento: z.string().trim().default(""),
    competencia: z.string().trim().default(""),
    tipo: z.string().trim().default("EMPREGADOR"),
  })
  .superRefine((v, ctx) => {
    // valor obrigatório e > 0
    const d = parseValor(v.valor);
    if (d === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "Informe o valor do pagamento." });
    } else if (d.lessThanOrEqualTo(0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "Valor do pagamento deve ser maior que zero." });
    }
    // data obrigatória (MSG0003) + não futura (MSG0128)
    if (v.data_pagamento.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data_pagamento"], message: "Informe a data do pagamento." });
    } else if (dateRe.test(v.data_pagamento)) {
      const hoje = new Date().toISOString().slice(0, 10);
      if (v.data_pagamento > hoje) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data_pagamento"], message: "Data do pagamento não pode ser futura." });
      }
    }
  });

export type PagamentoForm = z.infer<typeof pagamentoSchema>;

export interface PagamentoExistente {
  id?: string;
  data_pagamento: string | null;
}

/**
 * Detecta pagamento com a MESMA data (MSG0138), excluindo o próprio (por id).
 * Retorna o id conflitante ou null.
 */
export function detectarPagamentoDuplicado(
  candidato: { id?: string; data_pagamento: string },
  lista: PagamentoExistente[],
): string | null {
  if (!candidato.data_pagamento) return null;
  for (const p of lista) {
    if (candidato.id && p.id === candidato.id) continue;
    if (p.data_pagamento === candidato.data_pagamento) return p.id ?? "conflito";
  }
  return null;
}
