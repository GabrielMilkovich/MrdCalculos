import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import * as svc from "@/lib/pjecalc/service";
import { toast } from "sonner";
import { Trash2, Loader2, Calculator, Upload, Download } from "lucide-react";
import { parseCartaoPontoCSV, gerarCSVModelo } from "@/lib/pjecalc/csv-import";

interface Props { caseId: string; dataAdmissao?: string; dataDemissao?: string; }

/**
 * Cartão de Ponto — layout PJe-Calc (apuração mensal por competência).
 *
 * Colunas (conforme tela "Ocorrências do Cartão de Ponto"):
 *   Período | Dias Trabalhados | Feriados e Repousos Trab.
 *   Hs Ext Diárias | Hs Ext em Feriados | Hs Ext em Repousos | Hs Ext em F+R
 *   Hs Interjornada | Hs Interjornada Feriado | Hs Interjornada Repouso
 *   Hs Interjornada Trabalhadas | Repousos Trabalhados
 *
 * Todas as colunas são editáveis inline. Mantemos os campos legados
 * (horas_extras_50/100, dsr_horas) para retrocompatibilidade com CSVs
 * existentes; eles são derivados a partir das colunas situacionais.
 */
export function ModuloCartaoPonto({ caseId, dataAdmissao, dataDemissao }: Props) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: registros = [] } = useQuery({
    queryKey: ["pjecalc_cartao_ponto", caseId],
    queryFn: () => svc.getCartaoPonto(caseId),
  });

  const gerarCompetencias = async () => {
    if (!dataAdmissao || !dataDemissao) { toast.error("Preencha datas nos Parâmetros."); return; }
    setGenerating(true);
    try {
      await svc.deleteCartaoPonto(caseId);
      const start = new Date(dataAdmissao + "T00:00:00");
      const end = new Date(dataDemissao + "T00:00:00");
      const rows: Record<string, unknown>[] = [];
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cur <= end) {
        rows.push({
          case_id: caseId,
          competencia: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`,
          dias_uteis: 22, dias_trabalhados: 22,
        });
        cur.setMonth(cur.getMonth() + 1);
      }
      await svc.insertCartaoPontoBatch(rows);
      qc.invalidateQueries({ queryKey: ["pjecalc_cartao_ponto", caseId] });
      toast.success(`${rows.length} competências geradas`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenerating(false); }
  };

  const updateField = async (id: string, field: string, value: unknown) => {
    await svc.updateCartaoPonto(id, { [field]: value });
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const { rows, errors } = parseCartaoPontoCSV(text);
      if (errors.length > 0) {
        toast.error(`Erros no CSV: ${errors.slice(0, 3).join("; ")}`);
      }
      if (rows.length === 0) { toast.error("Nenhuma linha válida encontrada."); return; }
      await svc.deleteCartaoPonto(caseId);
      const dbRows = rows.map(r => ({ case_id: caseId, ...r }));
      await svc.insertCartaoPontoBatch(dbRows);
      qc.invalidateQueries({ queryKey: ["pjecalc_cartao_ponto", caseId] });
      toast.success(`${rows.length} competências importadas do CSV`);
    } catch (err) { toast.error((err as Error).message); }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const downloadModelo = () => {
    const csv = gerarCSVModelo();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cartao_ponto_modelo.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Colunas situacionais PJe-Calc + legadas (compatibilidade)
  const COLUMNS: Array<{ key: string; label: string; hint?: string; legacy?: boolean }> = [
    { key: 'dias_trabalhados', label: 'Dias Trab.' },
    { key: 'feriados_repousos_trabalhados', label: 'Fer. + Rep. Trab.' },
    { key: 'hs_ext_diarias', label: 'Hs Ext Diárias' },
    { key: 'hs_ext_feriados', label: 'Hs Ext em Feriados' },
    { key: 'hs_ext_repousos', label: 'Hs Ext em Repousos' },
    { key: 'hs_ext_feriados_repousos', label: 'Hs Ext em F+R' },
    { key: 'hs_interjornada', label: 'Hs Interjornada' },
    { key: 'hs_interjornada_feriado', label: 'Hs Interj. Feriado' },
    { key: 'hs_interjornada_repouso', label: 'Hs Interj. Repouso' },
    { key: 'hs_interjornada_trabalhada', label: 'Hs Interj. Trab.' },
    { key: 'repousos_trabalhados', label: 'Repousos Trab.' },
    // Legados mantidos p/ CSVs existentes; ficam colapsáveis em segunda linha
    { key: 'horas_extras_50', label: 'HE 50% (legado)', legacy: true },
    { key: 'horas_extras_100', label: 'HE 100% (legado)', legacy: true },
    { key: 'dsr_horas', label: 'DSR (legado)', legacy: true },
  ];

  const [showLegacy, setShowLegacy] = useState(false);
  const visibleColumns = COLUMNS.filter(c => !c.legacy || showLegacy);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cartão de Ponto — Ocorrências por Competência</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowLegacy(!showLegacy)} title="Mostrar/ocultar colunas legadas">
            {showLegacy ? 'Ocultar' : 'Mostrar'} legadas
          </Button>
          <Button size="sm" variant="ghost" onClick={downloadModelo} title="Baixar modelo CSV">
            <Download className="h-4 w-4 mr-1" /> Modelo
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            Importar CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleCSVImport} />
          <Button size="sm" variant="outline" onClick={gerarCompetencias} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calculator className="h-4 w-4 mr-1" />}
            Gerar
          </Button>
        </div>
      </div>
      {registros.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Clique em "Gerar" para criar o cartão de ponto.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto border border-border rounded">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-2 text-left font-medium sticky left-0 bg-muted/50 z-10">Período</th>
                {visibleColumns.map(col => (
                  <th key={col.key} className={`p-2 text-center font-medium ${col.legacy ? 'text-muted-foreground italic' : ''}`}>
                    {col.label}
                  </th>
                ))}
                <th className="p-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-2 font-mono font-medium sticky left-0 bg-background">{r.competencia}</td>
                  {visibleColumns.map(col => (
                    <td key={col.key} className="p-1 text-center">
                      <Input
                        type="number" step="0.01"
                        defaultValue={(r as Record<string, unknown>)[col.key] as number ?? 0}
                        className="h-7 text-xs w-16 text-center mx-auto"
                        onBlur={e => updateField(r.id, col.key, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                  ))}
                  <td className="p-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => { await svc.deleteCartaoPontoById(r.id); qc.invalidateQueries({ queryKey: ["pjecalc_cartao_ponto", caseId] }); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        Colunas situacionais (PJe-Calc): horas extras discriminadas por dia normal vs feriado/repouso, permitindo aplicação de
        alíquotas específicas (100% em repouso/feriado conforme Súm. 146 TST + art. 9° Lei 605/49). Colunas legadas
        (HE 50%/100%) permanecem para compatibilidade com CSVs antigos.
      </p>
    </div>
  );
}
