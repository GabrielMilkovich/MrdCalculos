/**
 * Regressão: timestamps de rodapé jurídico PJe NÃO devem virar batidas.
 *
 * Bug original (diagnóstico em /tmp/auditoria-ocr.md):
 *   Linhas como "Documento assinado digitalmente por X em DD/MM/YYYY HH:MM:SS",
 *   "Protocolado em DD/MM/YYYY HH:MM:SS" e "Juntada de petição em DD/MM/YYYY
 *   HH:MM:SS" estavam vazando pelos filtros do parser genérico (camada 4d) —
 *   nesses casos a data já existia como apuração legítima, e o horário do
 *   timestamp (ex. 17:42, 09:23, 14:05) entrava reordenando/sobrescrevendo
 *   batidas reais (NÃO adicionava linhas espúrias; corrompia as existentes).
 *
 * Cobertura: 3 fixtures adversariais — variação sem "às" (PJe canônico),
 * "Protocolado" e "Juntada de petição".
 */
import { describe, expect, it } from "vitest";
import { parseCartaoPonto } from "../../parsers/cartao-ponto";

describe("parseCartaoPonto — rodapé jurídico PJe (regressão bug 2026-05-18)", () => {
  it("Caso A: 'Documento assinado digitalmente por X em DD/MM/YYYY HH:MM:SS' (sem 'às') não vira batida", () => {
    const ocr = `Período 01/03/2024 a 31/03/2024
| 14/03/2024 - Qui | 08:00 | 12:00 | 13:00 | 17:00 | Horas Trabalhadas : 08:00 |
| 15/03/2024 - Sex | 08:00 | 12:00 | 13:00 | 17:00 | Horas Trabalhadas : 08:00 |

Documento assinado digitalmente por FULANO em 15/03/2024 17:42:33`;

    const r = parseCartaoPonto(ocr);
    expect(r.apuracoes).toHaveLength(2);

    const dia15 = r.apuracoes.find((a) => a.data === "2024-03-15");
    expect(dia15).toBeDefined();
    expect(dia15!.marcacoes).toEqual([
      { e: "08:00", s: "12:00" },
      { e: "13:00", s: "17:00" },
    ]);

    // Nenhuma marcação espúria com 17:42
    const todasMarcacoes = r.apuracoes.flatMap((a) => a.marcacoes);
    for (const m of todasMarcacoes) {
      expect(m.e).not.toBe("17:42");
      expect(m.s).not.toBe("17:42");
    }
  });

  it("Caso B: 'Protocolado em DD/MM/YYYY HH:MM:SS - Protocolo N' não vira batida", () => {
    const ocr = `Período 01/06/2025 a 30/06/2025
| 09/06/2025 - Seg | 08:00 | 12:00 | 13:00 | 17:00 | Horas Trabalhadas : 08:00 |
| 10/06/2025 - Ter | 08:00 | 12:00 | 13:00 | 17:00 | Horas Trabalhadas : 08:00 |

Protocolado em 10/06/2025 09:23:15 - Protocolo 1234567`;

    const r = parseCartaoPonto(ocr);
    expect(r.apuracoes).toHaveLength(2);

    const dia10 = r.apuracoes.find((a) => a.data === "2025-06-10");
    expect(dia10).toBeDefined();
    expect(dia10!.marcacoes).toEqual([
      { e: "08:00", s: "12:00" },
      { e: "13:00", s: "17:00" },
    ]);

    const todasMarcacoes = r.apuracoes.flatMap((a) => a.marcacoes);
    for (const m of todasMarcacoes) {
      expect(m.e).not.toBe("09:23");
      expect(m.s).not.toBe("09:23");
    }
  });

  it("Caso C: 'Juntada de petição em DD/MM/YYYY HH:MM:SS por X' não vira batida", () => {
    const ocr = `Período 01/08/2024 a 31/08/2024
| 21/08/2024 - Qua | 08:00 | 12:00 | 13:00 | 17:00 | Horas Trabalhadas : 08:00 |
| 22/08/2024 - Qui | 08:00 | 12:00 | 13:00 | 17:00 | Horas Trabalhadas : 08:00 |

Juntada de petição em 22/08/2024 14:05:00 por Beltrano`;

    const r = parseCartaoPonto(ocr);
    expect(r.apuracoes).toHaveLength(2);

    const dia22 = r.apuracoes.find((a) => a.data === "2024-08-22");
    expect(dia22).toBeDefined();
    expect(dia22!.marcacoes).toEqual([
      { e: "08:00", s: "12:00" },
      { e: "13:00", s: "17:00" },
    ]);

    const todasMarcacoes = r.apuracoes.flatMap((a) => a.marcacoes);
    for (const m of todasMarcacoes) {
      expect(m.e).not.toBe("14:05");
      expect(m.s).not.toBe("14:05");
    }
  });
});
