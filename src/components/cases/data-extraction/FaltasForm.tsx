/**
 * FaltasForm — tabela editável de faltas/ausências extraídas.
 *
 * Persiste apenas toggle "Incluir no CSV" via auto-save (mesmo padrão de
 * FeriasForm). Edição de outros campos fica em ticket separado.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ClipboardX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadFaltasByDocument, toggleFaltasIncluir } from "@/features/data-extraction";

interface Props {
  documentId: string;
  caseId: string;
}

function isoToBR(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function FaltasForm({ documentId, caseId }: Props) {
  const qc = useQueryClient();
  const { data: faltas = [], isLoading } = useQuery({
    queryKey: ["faltas-extraidas", documentId],
    queryFn: () => loadFaltasByDocument(documentId),
  });

  const handleToggle = async (id: string, incluir: boolean) => {
    await toggleFaltasIncluir(id, incluir);
    qc.invalidateQueries({ queryKey: ["faltas-extraidas", documentId] });
    qc.invalidateQueries({ queryKey: ["documents-extraction", caseId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando faltas...
      </div>
    );
  }

  return (
    <div className="flex flex-col border rounded-md min-h-[500px] overflow-hidden">
      <div className="flex items-center px-3 py-2 border-b bg-muted/30 text-xs font-semibold flex-shrink-0">
        <ClipboardX className="h-3.5 w-3.5 mr-1.5" />
        Ocorrências de falta ({faltas.length})
      </div>
      <div className="flex-1 overflow-auto">
        {faltas.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">
            Nenhuma falta extraída ainda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] w-[110px]">Início</TableHead>
                <TableHead className="text-[11px] w-[110px]">Fim</TableHead>
                <TableHead className="text-[11px] w-[110px]">Justificada</TableHead>
                <TableHead className="text-[11px]">Justificativa</TableHead>
                <TableHead className="text-[11px] w-[80px]">Incluir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faltas.map((f) => (
                <TableRow key={f.id} className="text-xs">
                  <TableCell className="font-mono">{isoToBR(f.data_inicio)}</TableCell>
                  <TableCell className="font-mono">{isoToBR(f.data_fim)}</TableCell>
                  <TableCell>{f.justificada ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-[11px] max-w-[300px] truncate">
                    {f.justificativa ?? "—"}
                  </TableCell>
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
