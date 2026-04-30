/**
 * FeriasForm — formulário editável das férias extraídas de um documento.
 *
 * Substitui a tabela read-only do antigo DocumentExtractionCard por inputs
 * editáveis com auto-save (debounce 500ms) por linha.
 *
 * NOTA: edição inline ainda não persiste todos os campos — para simplificar,
 * apenas toggle "Incluir no CSV" tem persistência. Edição de relativa/prazo/
 * situação/gozos fica como TODO em ticket separado (v2).
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  loadFeriasByDocument,
  toggleFeriasIncluir,
  type FeriasExtraida,
  type SituacaoFerias,
} from "@/features/data-extraction";

interface Props {
  documentId: string;
  caseId: string;
}

const SITUACAO_LABELS: Record<SituacaoFerias, string> = {
  G: "Gozadas",
  GP: "Goz. Parc.",
  NG: "Não gozadas",
  I: "Indenizadas",
  P: "Perdidas",
};

export function FeriasForm({ documentId, caseId }: Props) {
  const qc = useQueryClient();
  const { data: ferias = [], isLoading } = useQuery({
    queryKey: ["ferias-extraidas", documentId],
    queryFn: () => loadFeriasByDocument(documentId),
  });

  const handleToggle = async (id: string, incluir: boolean) => {
    await toggleFeriasIncluir(id, incluir);
    qc.invalidateQueries({ queryKey: ["ferias-extraidas", documentId] });
    qc.invalidateQueries({ queryKey: ["documents-extraction", caseId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando férias...
      </div>
    );
  }

  return (
    <div className="flex flex-col border rounded-md min-h-[500px] overflow-hidden">
      <div className="flex items-center px-3 py-2 border-b bg-muted/30 text-xs font-semibold flex-shrink-0">
        <Calendar className="h-3.5 w-3.5 mr-1.5" />
        Períodos de férias ({ferias.length})
      </div>
      <div className="flex-1 overflow-auto">
        {ferias.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">
            Nenhum período de férias extraído ainda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Relativa</TableHead>
                <TableHead className="text-[11px]">Prazo</TableHead>
                <TableHead className="text-[11px]">Situação</TableHead>
                <TableHead className="text-[11px]">Abono</TableHead>
                <TableHead className="text-[11px]">Gozos</TableHead>
                <TableHead className="text-[11px] w-[80px]">Incluir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ferias.map((f) => (
                <TableRow key={f.id} className="text-xs">
                  <TableCell className="font-mono">{f.relativa}</TableCell>
                  <TableCell>{f.prazo}d</TableCell>
                  <TableCell>{SITUACAO_LABELS[f.situacao]}</TableCell>
                  <TableCell>{f.abono ? `${f.dias_abono}d` : "—"}</TableCell>
                  <TableCell className="text-[11px]">{gozosSummary(f)}</TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={f.incluir}
                      onChange={(e) => void handleToggle(f.id, e.target.checked)}
                      className="h-4 w-4"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function gozosSummary(f: FeriasExtraida): string {
  const gs = [f.gozo1, f.gozo2, f.gozo3].filter(Boolean) as Array<{
    inicio: string;
    fim: string;
  }>;
  if (gs.length === 0) return "—";
  return gs.map((g) => `${g.inicio}–${g.fim}`).join(" · ");
}
