/**
 * JornadaGrid — grid editável de apurações diárias do cartão de ponto.
 *
 *   ┌─── Cartão de Ponto MM/yyyy (N apurações) ─── [+ dia] [Importar] [Salvar] ┐
 *   │ Data       | Ocorrência | E1    S1   E2    S2   E3    S3   |  Obs  |   ✕  │
 *   │ 01/03/2024 | NORMAL ▼   | 08:00 12:00 13:00 17:00 ...      | ...   |  X   │
 *   │ 02/03/2024 | FOLGA ▼    | (vazio)                          | ...   |  X   │
 *   │ ...                                                                       │
 *   └──────────────────────────────────────────────────────────────────────────┘
 *
 * Edição local (não salva a cada keystroke). "Salvar alterações" faz
 * replaceApuracoes em batch. Botão "Importar" abre ImportarJornadaDialog.
 */
import { useEffect, useMemo, useState } from "react";
import { Clock, Plus, Trash2, Upload, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCartaoPontoDoDocumento } from "@/features/data-extraction/hooks/useCartaoPontoDoDocumento";
import type {
  ApuracaoDiaria,
  Marcacao,
  OcorrenciaApuracao,
} from "@/features/data-extraction";
import { ImportarJornadaDialog } from "./ImportarJornadaDialog";

interface Props {
  documentId: string;
  caseId: string;
  competencia: string;
}

const OCORRENCIAS: OcorrenciaApuracao[] = [
  "NORMAL",
  "FALTA",
  "FERIADO",
  "FOLGA",
  "FERIAS",
  "ATESTADO",
  "LICENCA_MEDICA",
];

const MAX_PARES = 3;

type EditableRow = ApuracaoDiaria & { _key: string };

export function JornadaGrid({ documentId, caseId, competencia }: Props) {
  const { apuracoes, isLoading, replaceAll } = useCartaoPontoDoDocumento(
    documentId,
    caseId,
  );

  const [rows, setRows] = useState<EditableRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Sincroniza rows quando o servidor traz dados (e ainda não há edições locais)
  useEffect(() => {
    if (!dirty) {
      setRows(apuracoes.map((a, i) => ({ ...a, _key: `${a.data}-${i}` })));
    }
  }, [apuracoes, dirty]);

  // Sort por data
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.data.localeCompare(b.data)),
    [rows],
  );

  const updateRow = (key: string, patch: Partial<ApuracaoDiaria>) => {
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, ...patch } : r)),
    );
    setDirty(true);
  };

  const updateMarcacao = (
    key: string,
    idx: number,
    field: "e" | "s",
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        const marcs: Marcacao[] = [...r.marcacoes];
        while (marcs.length <= idx) marcs.push({ e: "", s: "" });
        marcs[idx] = { ...marcs[idx], [field]: value };
        return { ...r, marcacoes: marcs };
      }),
    );
    setDirty(true);
  };

  const addRow = () => {
    const today = new Date().toISOString().slice(0, 10);
    setRows((prev) => [
      ...prev,
      {
        data: today,
        ocorrencia: "NORMAL",
        marcacoes: [],
        observacao: null,
        _key: `new-${Date.now()}-${Math.random()}`,
      },
    ]);
    setDirty(true);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r._key !== key));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Limpa marcações vazias antes de salvar
      const clean: ApuracaoDiaria[] = rows.map((r) => ({
        data: r.data,
        ocorrencia: r.ocorrencia,
        marcacoes: r.marcacoes.filter((m) => m.e || m.s),
        observacao: r.observacao,
      }));
      const ok = await replaceAll(clean, competencia);
      if (ok) setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const handleImport = (importadas: ApuracaoDiaria[]) => {
    setRows(
      importadas.map((a, i) => ({ ...a, _key: `imp-${a.data}-${i}` })),
    );
    setDirty(true);
    setImportOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando jornada...
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col border rounded-md min-h-[500px] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 text-xs font-semibold flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Jornada {competencia} ({sortedRows.length} apuração
            {sortedRows.length === 1 ? "" : "ões"})
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-3 w-3" /> Importar/Colar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={addRow}
            >
              <Plus className="h-3 w-3" /> Dia
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={!dirty || saving}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Salvar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {sortedRows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              Nenhuma apuração. Clique em "Importar/Colar" ou em "Dia" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] w-[110px]">Data</TableHead>
                  <TableHead className="text-[11px] w-[110px]">Ocorrência</TableHead>
                  <TableHead
                    className="text-[11px] text-center"
                    colSpan={MAX_PARES * 2}
                  >
                    Entradas / Saídas (3 pares)
                  </TableHead>
                  <TableHead className="text-[11px] w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((r) => (
                  <TableRow key={r._key} className="text-xs">
                    <TableCell className="p-1">
                      <Input
                        type="date"
                        value={r.data}
                        onChange={(e) => updateRow(r._key, { data: e.target.value })}
                        className="h-7 text-xs font-mono"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Select
                        value={r.ocorrencia}
                        onValueChange={(v) =>
                          updateRow(r._key, { ocorrencia: v as OcorrenciaApuracao })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OCORRENCIAS.map((o) => (
                            <SelectItem key={o} value={o} className="text-xs">
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {Array.from({ length: MAX_PARES }).map((_, idx) => (
                      <TableCell key={`pair-${idx}`} className="p-1">
                        <div className="flex gap-0.5">
                          <Input
                            placeholder={idx === 0 ? "08:00" : ""}
                            value={r.marcacoes[idx]?.e ?? ""}
                            onChange={(e) =>
                              updateMarcacao(r._key, idx, "e", e.target.value)
                            }
                            className="h-7 text-xs font-mono w-[55px] px-1.5"
                          />
                          <Input
                            placeholder={idx === 0 ? "12:00" : ""}
                            value={r.marcacoes[idx]?.s ?? ""}
                            onChange={(e) =>
                              updateMarcacao(r._key, idx, "s", e.target.value)
                            }
                            className="h-7 text-xs font-mono w-[55px] px-1.5"
                          />
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="p-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(r._key)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {dirty && (
          <div className="border-t bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 text-[11px] text-amber-900 dark:text-amber-100 flex-shrink-0">
            Há alterações não salvas. Clique em "Salvar" para gravar.
          </div>
        )}
      </div>

      <ImportarJornadaDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        competencia={competencia}
        onImport={handleImport}
      />
    </>
  );
}
