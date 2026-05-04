/**
 * CaseCoverageBanner — exibe gaps de cobertura semântica entre documentos
 * de um case já processados (OCR + extração aplicada).
 *
 * Recebe diretamente um `CaseCoverageReport` calculado pelo
 * `analisarCobertura()` — separar a lógica do render facilita testes e
 * permite plug-and-play em diferentes telas (workspace do caso, dashboard,
 * relatório pré-cálculo).
 *
 * Severidades:
 *   - alta  → vermelho (impacta cálculo financeiro)
 *   - media → âmbar  (provavelmente impacta, vale revisar)
 *   - baixa → cinza  (informativo)
 */
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { CaseCoverageReport, Severidade } from "@/features/data-extraction";

interface Props {
  report: CaseCoverageReport;
}

const ICON_BY_SEVERIDADE: Record<Severidade, JSX.Element> = {
  alta: <XCircle className="h-3.5 w-3.5 text-rose-700 dark:text-rose-300" />,
  media: <AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />,
  baixa: <Info className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />,
};

const TONE_BY_SEVERIDADE: Record<Severidade, string> = {
  alta: "border-rose-300 bg-rose-50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100",
  media:
    "border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100",
  baixa:
    "border-slate-300 bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200",
};

export function CaseCoverageBanner({ report }: Props) {
  if (report.gaps.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-100">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>
          Cobertura semântica do caso OK — sem gaps detectados entre os{" "}
          {report.resumo.cartoes_ponto +
            report.resumo.holerites +
            report.resumo.ferias +
            report.resumo.faltas}{" "}
          documentos.
        </span>
      </div>
    );
  }

  // Ordena por severidade (alta → media → baixa).
  const ordemSeveridade: Record<Severidade, number> = {
    alta: 0,
    media: 1,
    baixa: 2,
  };
  const ordenados = [...report.gaps].sort(
    (a, b) => ordemSeveridade[a.severidade] - ordemSeveridade[b.severidade],
  );

  const altas = ordenados.filter((g) => g.severidade === "alta").length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span>
            Cobertura do caso: {report.gaps.length} gap(s)
            {altas > 0 && (
              <span className="text-rose-700 dark:text-rose-300 font-semibold">
                {" "}
                — {altas} crítico(s)
              </span>
            )}
          </span>
          {report.rangeCompetencias && (
            <span className="text-muted-foreground font-normal ml-2">
              · período {report.rangeCompetencias.inicio} a{" "}
              {report.rangeCompetencias.fim}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{report.resumo.cartoes_ponto} cartão-ponto</span>
          <span>·</span>
          <span>{report.resumo.holerites} holerite(s)</span>
          <span>·</span>
          <span>{report.resumo.ferias} férias</span>
          <span>·</span>
          <span>{report.resumo.faltas} faltas</span>
        </div>
      </div>

      <ul className="space-y-1">
        {ordenados.map((gap, i) => (
          <li
            key={i}
            className={`flex items-start gap-2 rounded border px-2.5 py-1.5 text-xs ${TONE_BY_SEVERIDADE[gap.severidade]}`}
          >
            <span className="pt-0.5">{ICON_BY_SEVERIDADE[gap.severidade]}</span>
            <div className="min-w-0">
              <p>{gap.mensagem}</p>
              {gap.detalhes?.competencias &&
                gap.detalhes.competencias.length > 0 && (
                  <p className="mt-0.5 text-[10px] opacity-80 font-mono">
                    Competências:{" "}
                    {gap.detalhes.competencias.slice(0, 8).join(", ")}
                    {gap.detalhes.competencias.length > 8 &&
                      ` … +${gap.detalhes.competencias.length - 8}`}
                  </p>
                )}
              {gap.detalhes?.datas && gap.detalhes.datas.length > 0 && (
                <p className="mt-0.5 text-[10px] opacity-80 font-mono">
                  {gap.detalhes.datas.slice(0, 6).join(", ")}
                  {gap.detalhes.datas.length > 6 &&
                    ` … +${gap.detalhes.datas.length - 6}`}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
