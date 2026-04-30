/**
 * DataExtractionValidationTab — única tab de trabalho do modo
 * `data_extraction` após o upload. Responsabilidades:
 *
 *   1. Listar documentos do caso (OCR concluído)
 *   2. Permitir o usuário classificar cada doc em uma categoria
 *      (historico_salarial / ferias / faltas)
 *   3. Disparar extração estruturada via Edge Function (OpenAI)
 *   4. Mostrar tabela editável das linhas extraídas
 *   5. Marcar doc como validado
 *   6. Botão "Exportar CSVs PJe-Calc" — abre modal de merge/conflito
 *      e gera ZIP final
 *
 * Estado: derivado via React Query (`useQuery`/`invalidate`). Sem
 * client store global (mantém alinhado ao resto do app).
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
  Download, FileSpreadsheet, Loader2, RotateCcw, Sparkles, X,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { supabase } from '@/integrations/supabase/client';
import {
  CATEGORY_LABEL,
  type ExtractionCategory,
  type FaltasRow,
  type FeriasRow,
  type HistoricoSalarialRow,
  applyResolutions,
  countPendingConflicts,
  countValidLines,
  downloadExportZip,
  extractDocument,
  loadExtractedRows,
  markValidated,
  mergeFaltas,
  mergeFerias,
  mergeHistoricoSalarial,
} from '@/features/data-extraction';
import type {
  DocumentExtractedData,
  ConflictResolution,
} from '@/features/data-extraction';

interface DocumentMin {
  id: string;
  file_name?: string | null;
  ocr_text?: string | null;
  status?: string | null;
}

interface Props {
  caseId: string;
  caseLabel: string;
  documents: DocumentMin[];
}

const CATEGORIES: ExtractionCategory[] = ['historico_salarial', 'ferias', 'faltas'];

export function DataExtractionValidationTab({ caseId, caseLabel, documents }: Props) {
  const queryClient = useQueryClient();
  const [exportOpen, setExportOpen] = useState(false);

  const ocrDoneDocs = useMemo(
    () => documents.filter(d => d.ocr_text && d.ocr_text.trim().length >= 10),
    [documents],
  );

  const ocrPendingCount = documents.length - ocrDoneDocs.length;

  // Carrega document_extracted_data de TODOS os docs
  const { data: extractions = {}, isLoading } = useQuery({
    queryKey: ['extracted-data', caseId, ocrDoneDocs.map(d => d.id).sort().join(',')],
    queryFn: async () => {
      const ids = ocrDoneDocs.map(d => d.id);
      if (ids.length === 0) return {};
      const { data, error } = await supabase
        .from('document_extracted_data')
        .select('*')
        .in('document_id', ids);
      if (error) throw error;
      const map: Record<string, DocumentExtractedData> = {};
      for (const row of (data ?? []) as DocumentExtractedData[]) map[row.document_id] = row;
      return map;
    },
    staleTime: 5_000,
  });

  const totalDocs = ocrDoneDocs.length;
  const validatedCount = ocrDoneDocs.filter(d => extractions[d.id]?.validation_status === 'validated').length;
  const allValidated = totalDocs > 0 && validatedCount === totalDocs;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Validação de Dados Extraídos
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Classifique cada documento, dispare extração via IA, revise as linhas e exporte CSVs do PJe-Calc Cidadão.
              </p>
            </div>
            <Button
              onClick={() => setExportOpen(true)}
              disabled={!allValidated}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSVs PJe-Calc
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="secondary">{validatedCount}/{totalDocs} documentos validados</Badge>
            {ocrPendingCount > 0 && (
              <Badge variant="outline" className="text-amber-700 border-amber-400">
                {ocrPendingCount} aguardando OCR
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Pre-import warnings */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Antes de importar no PJe-Calc Cidadão</AlertTitle>
        <AlertDescription className="text-xs space-y-1.5 mt-2">
          <p><strong>Férias:</strong> os períodos aquisitivos (ex: <code>2023/2024</code>) precisam estar cadastrados no PJe-Calc <em>antes</em> de importar o CSV.</p>
          <p><strong>Histórico Salarial:</strong> flags FGTS/INSS extraídas com defaults S/S/S/S — revise se há rubricas não-tributáveis.</p>
          <p><strong>Faltas:</strong> campo <em>Justificativa</em> truncado em 200 chars e sanitizado (remove <code>;</code> <code>"</code> quebras de linha).</p>
        </AlertDescription>
      </Alert>

      {/* Empty state */}
      {totalDocs === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum documento com OCR concluído. Faça upload na aba Documentos e aguarde a conclusão do OCR.
          </CardContent>
        </Card>
      )}

      {/* Documents list */}
      {ocrDoneDocs.map(doc => (
        <DocumentExtractionCard
          key={doc.id}
          doc={doc}
          extraction={extractions[doc.id]}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ['extracted-data', caseId] })}
        />
      ))}

      {/* Export modal */}
      <ExportPjeCalcModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        caseLabel={caseLabel}
        extractions={extractions}
      />
    </div>
  );
}

// =====================================================
// Card por documento
// =====================================================
interface CardProps {
  doc: DocumentMin;
  extraction?: DocumentExtractedData;
  onChanged: () => void;
}

function DocumentExtractionCard({ doc, extraction, onChanged }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState<ExtractionCategory | ''>(extraction?.category ?? '');
  const [extracting, setExtracting] = useState(false);

  const status = extraction?.validation_status ?? 'pending';
  const extractStatus = extraction?.extraction_status ?? 'pending';
  const rowsCount = Array.isArray(extraction?.rows) ? extraction!.rows.length : 0;

  async function handleExtract() {
    if (!category) {
      toast.error('Escolha uma categoria antes de extrair.');
      return;
    }
    setExtracting(true);
    try {
      const result = await extractDocument(doc.id, category);
      if (!result.ok) {
        toast.error(`Falha ao extrair: ${result.error ?? 'erro desconhecido'}`);
        return;
      }
      toast.success(`Extração concluída: ${result.rows_extracted} linha(s).`);
      onChanged();
      setExpanded(true);
    } finally {
      setExtracting(false);
    }
  }

  async function handleValidate(newStatus: 'validated' | 'rejected') {
    const r = await markValidated(doc.id, newStatus);
    if (!r.ok) {
      toast.error(r.error ?? 'Erro ao atualizar status');
      return;
    }
    toast.success(newStatus === 'validated' ? 'Documento validado.' : 'Documento rejeitado.');
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-2 text-left text-sm font-medium hover:text-primary transition"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="truncate">{doc.file_name ?? doc.id.slice(0, 8)}</span>
          </button>

          <div className="flex items-center gap-2">
            {extraction && (
              <Badge variant={statusVariant(status)} className="gap-1">
                {status === 'validated' && <CheckCircle2 className="h-3 w-3" />}
                {status === 'rejected' && <X className="h-3 w-3" />}
                {status === 'pending' && <AlertCircle className="h-3 w-3" />}
                {statusLabel(status)} • {rowsCount} linhas
              </Badge>
            )}
            {!extraction && (
              <Badge variant="outline">Não extraído</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground block mb-1">Categoria</label>
              <Select value={category} onValueChange={v => setCategory(v as ExtractionCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleExtract} disabled={!category || extracting} size="sm" className="gap-1">
              {extracting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Extraindo...</>
                : extraction
                  ? <><RotateCcw className="h-4 w-4" /> Re-extrair</>
                  : <><Sparkles className="h-4 w-4" /> Extrair com IA</>}
            </Button>
          </div>

          {extractStatus === 'failed' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Falha na extração</AlertTitle>
              <AlertDescription className="text-xs whitespace-pre-wrap">
                {extraction?.extraction_error ?? 'Erro desconhecido'}
              </AlertDescription>
            </Alert>
          )}

          {extraction && rowsCount > 0 && (
            <ExtractedRowsTable extraction={extraction} />
          )}

          {extraction && rowsCount > 0 && status !== 'validated' && (
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button size="sm" variant="ghost" onClick={() => handleValidate('rejected')}>
                Rejeitar
              </Button>
              <Button size="sm" onClick={() => handleValidate('validated')} className="gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Validar este documento
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function statusVariant(s: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'validated') return 'default';
  if (s === 'rejected') return 'destructive';
  return 'outline';
}
function statusLabel(s: string): string {
  if (s === 'validated') return 'Validado';
  if (s === 'rejected') return 'Rejeitado';
  return 'Pendente';
}

// =====================================================
// Tabela de linhas extraídas (read-only inicialmente — edição via re-extrair)
// =====================================================

function ExtractedRowsTable({ extraction }: { extraction: DocumentExtractedData }) {
  const rows = (extraction.rows ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return null;

  // Pega chaves do primeiro item (excluindo _source).
  const keys = Object.keys(rows[0] ?? {}).filter(k => k !== '_source');

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/40">
          <tr>
            {keys.map(k => (
              <th key={k} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, idx) => (
            <tr key={idx} className="border-t hover:bg-accent/30 transition">
              {keys.map(k => (
                <td key={k} className="px-2 py-1.5 whitespace-nowrap font-mono">
                  {formatCell(row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 50 && (
        <div className="px-2 py-1.5 text-[11px] text-muted-foreground bg-muted/20 border-t">
          Mostrando 50 de {rows.length} linhas. CSV final inclui todas.
        </div>
      )}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// =====================================================
// Modal de export — merge + conflitos + download
// =====================================================

interface ExportModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseLabel: string;
  extractions: Record<string, DocumentExtractedData>;
}

function ExportPjeCalcModal({ open, onOpenChange, caseLabel, extractions }: ExportModalProps) {
  // Junta linhas de cada categoria a partir de TODAS as extrações validadas.
  const buckets = useMemo(() => {
    const historico: HistoricoSalarialRow[] = [];
    const ferias: FeriasRow[] = [];
    const faltas: FaltasRow[] = [];
    for (const ext of Object.values(extractions)) {
      if (ext.validation_status !== 'validated') continue;
      if (!Array.isArray(ext.rows)) continue;
      if (ext.category === 'historico_salarial') {
        historico.push(...(ext.rows as HistoricoSalarialRow[]));
      } else if (ext.category === 'ferias') {
        ferias.push(...(ext.rows as FeriasRow[]));
      } else if (ext.category === 'faltas') {
        faltas.push(...(ext.rows as FaltasRow[]));
      }
    }
    return { historico, ferias, faltas };
  }, [extractions]);

  const mergedRaw = useMemo(() => ({
    historico: mergeHistoricoSalarial(buckets.historico),
    ferias: mergeFerias(buckets.ferias),
    faltas: mergeFaltas(buckets.faltas),
  }), [buckets]);

  // Resoluções por categoria.
  const [resHistorico, setResHistorico] = useState<ConflictResolution>(new Map());
  const [resFerias, setResFerias] = useState<ConflictResolution>(new Map());
  const [resFaltas, setResFaltas] = useState<ConflictResolution>(new Map());

  const pendingTotal =
    countPendingConflicts(mergedRaw.historico, resHistorico) +
    countPendingConflicts(mergedRaw.ferias, resFerias) +
    countPendingConflicts(mergedRaw.faltas, resFaltas);

  const finalHistorico = applyResolutions(mergedRaw.historico, resHistorico).merged;
  const finalFerias = applyResolutions(mergedRaw.ferias, resFerias).merged;
  const finalFaltas = applyResolutions(mergedRaw.faltas, resFaltas).merged;

  async function handleDownload() {
    if (pendingTotal > 0) {
      toast.error('Resolva todos os conflitos antes de baixar.');
      return;
    }
    try {
      const filename = `pjecalc_export_${slug(caseLabel)}_${new Date().toISOString().slice(0, 10)}.zip`;
      await downloadExportZip({
        historicoSalarial: finalHistorico,
        ferias: finalFerias,
        faltas: finalFaltas,
        caseLabel,
      }, filename);
      toast.success('ZIP gerado e download iniciado.');
      onOpenChange(false);
    } catch (err) {
      toast.error(`Erro ao gerar ZIP: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar CSVs PJe-Calc Cidadão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <SummaryCard label="Histórico Salarial" count={countValidLines('historico_salarial', finalHistorico)} />
            <SummaryCard label="Férias" count={countValidLines('ferias', finalFerias)} />
            <SummaryCard label="Faltas" count={countValidLines('faltas', finalFaltas)} />
          </div>

          {/* Conflitos */}
          {pendingTotal > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{pendingTotal} conflito(s) pendente(s)</AlertTitle>
              <AlertDescription className="text-xs">
                Documentos divergem em algumas linhas. Escolha qual valor manter para cada uma antes de baixar.
              </AlertDescription>
            </Alert>
          )}

          <ConflictsSection
            title="Histórico Salarial"
            conflicts={mergedRaw.historico.conflicts}
            resolution={resHistorico}
            onResolve={(k, idx) => setResHistorico(m => new Map(m).set(k, idx))}
            renderCandidate={r => `Comp ${(r as HistoricoSalarialRow).competencia} — R$ ${(r as HistoricoSalarialRow).valor.toFixed(2)} • FGTS:${(r as HistoricoSalarialRow).incideFgts ? 'S' : 'N'} INSS:${(r as HistoricoSalarialRow).incideInss ? 'S' : 'N'}`}
          />
          <ConflictsSection
            title="Férias"
            conflicts={mergedRaw.ferias.conflicts}
            resolution={resFerias}
            onResolve={(k, idx) => setResFerias(m => new Map(m).set(k, idx))}
            renderCandidate={r => {
              const f = r as FeriasRow;
              const gozo = f.gozo1 ? `gozo1: ${f.gozo1.inicio}–${f.gozo1.fim}` : 'sem gozo';
              return `Relativa ${f.relativa} • ${f.situacao} • prazo ${f.prazo} • abono ${f.abono ? `${f.diasAbono}d` : 'não'} • ${gozo}`;
            }}
          />
          <ConflictsSection
            title="Faltas"
            conflicts={mergedRaw.faltas.conflicts}
            resolution={resFaltas}
            onResolve={(k, idx) => setResFaltas(m => new Map(m).set(k, idx))}
            renderCandidate={r => {
              const f = r as FaltasRow;
              return `${f.dataInicio}–${f.dataFim} • justificada:${f.justificada ? 'S' : 'N'} • reinicia:${f.reiniciarPeriodoAquisitivo ? 'S' : 'N'}${f.justificativa ? ` • "${f.justificativa.slice(0, 40)}"` : ''}`;
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleDownload} disabled={pendingTotal > 0} className="gap-2">
            <Download className="h-4 w-4" />
            Confirmar e baixar ZIP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-md border p-3 bg-muted/20">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-0.5">{count}</div>
      <div className="text-[11px] text-muted-foreground">{count === 1 ? 'linha' : 'linhas'}</div>
    </div>
  );
}

interface ConflictsSectionProps<T> {
  title: string;
  conflicts: { key: string; candidates: T[] }[];
  resolution: ConflictResolution;
  onResolve: (key: string, candidateIdx: number) => void;
  renderCandidate: (r: T) => string;
}

function ConflictsSection<T>({ title, conflicts, resolution, onResolve, renderCandidate }: ConflictsSectionProps<T>) {
  if (conflicts.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{title} — {conflicts.length} conflito(s)</h4>
      {conflicts.map(c => {
        const chosen = resolution.get(c.key);
        return (
          <div key={c.key} className="rounded-md border p-2 space-y-1.5">
            <div className="text-[11px] text-muted-foreground font-mono">Chave: {c.key}</div>
            {c.candidates.map((cand, idx) => {
              const source = (cand as { _source?: { documentName?: string } })._source;
              return (
                <label
                  key={idx}
                  className={`flex items-start gap-2 rounded p-1.5 cursor-pointer hover:bg-accent/40 transition ${chosen === idx ? 'bg-primary/10 border-primary border' : 'border border-transparent'}`}
                >
                  <input
                    type="radio"
                    name={`conflict-${c.key}`}
                    checked={chosen === idx}
                    onChange={() => onResolve(c.key, idx)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-mono">{renderCandidate(cand)}</div>
                    {source?.documentName && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Fonte: {source.documentName}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'caso';
}

// Dummy export pra evitar `loadExtractedRows` unused warning
// (mantém na API pra futuro uso de "carregar uma linha específica").
void loadExtractedRows;
