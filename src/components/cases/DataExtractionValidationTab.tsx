import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import {
  loadCategorias,
  setTipoExtracao,
  type TipoExtracao,
} from '@/features/data-extraction';
import {
  DocumentExtractionCard,
  type DocSummary,
} from './data-extraction/DocumentExtractionCard';
import { ExtractionTypeSelector } from './data-extraction/ExtractionTypeSelector';
import { ComposicaoCsvDialog } from './data-extraction/ComposicaoCsvDialog';

interface Props {
  caseId: string;
  caseSlug: string;
  numeroProcesso: string | null;
  /** Modo de operação do caso. Se calculation, render mensagem amigável. */
  mode: 'calculation' | 'data_extraction';
}

type Doc = DocSummary & {
  ocr_text: string | null;
  status: string;
};

export function DataExtractionValidationTab({
  caseId,
  caseSlug,
  numeroProcesso,
  mode,
}: Props) {
  const qc = useQueryClient();
  const [openCompose, setOpenCompose] = useState(false);

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-rubrica'],
    queryFn: loadCategorias,
    staleTime: 5 * 60 * 1000,
  });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents-extraction', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(
          'id, file_name, ocr_text, status, tipo_extracao, extracao_status, extracao_error, competencia_referencia, validation_status',
        )
        .eq('case_id', caseId)
        .order('uploaded_em', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as Array<Record<string, unknown>>).map((d) => ({
        id: d.id as string,
        case_id: caseId,
        file_name: (d.file_name as string | null) ?? null,
        ocr_text: (d.ocr_text as string | null) ?? null,
        status: (d.status as string) ?? 'uploaded',
        tipo_extracao: ((d.tipo_extracao as string) ?? 'nao_extrair') as DocSummary['tipo_extracao'],
        extracao_status: ((d.extracao_status as string) ?? 'pending') as DocSummary['extracao_status'],
        extracao_error: (d.extracao_error as string | null) ?? null,
        competencia_referencia: (d.competencia_referencia as string | null) ?? null,
        validation_status: ((d.validation_status as string) ?? 'pending') as DocSummary['validation_status'],
      })) as Doc[];
    },
  });

  // Realtime: refresh quando extração muda
  useEffect(() => {
    const channel = supabase
      .channel(`docs-extr-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `case_id=eq.${caseId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['documents-extraction', caseId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, qc]);

  const docsToExtract = useMemo(
    () => docs.filter((d) => d.tipo_extracao !== 'nao_extrair'),
    [docs],
  );
  const totalToValidate = docsToExtract.length;
  const validated = docsToExtract.filter(
    (d) => d.validation_status === 'validated',
  ).length;
  const allValidated = totalToValidate > 0 && validated === totalToValidate;

  const handleSetTipo = async (docId: string, tipo: TipoExtracao) => {
    try {
      await setTipoExtracao(docId, tipo);
      qc.invalidateQueries({ queryKey: ['documents-extraction', caseId] });
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  if (mode !== 'data_extraction') {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Este caso não está em modo "Extração de Dados".
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </CardContent>
      </Card>
    );
  }

  if (docs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Nenhum documento neste caso. Vá para a aba <strong>Documentos</strong>{' '}
              e faça upload primeiro.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Validação de Extração</CardTitle>
              <CardDescription className="text-xs">
                Marque o tipo de extração de cada documento, extraia, classifique
                rubricas e valide.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={allValidated ? 'default' : 'secondary'} className="gap-1">
                {allValidated && <CheckCircle2 className="h-3 w-3" />}
                {validated} / {totalToValidate} validado(s)
              </Badge>
              <Button
                size="sm"
                onClick={() => setOpenCompose(true)}
                disabled={!allValidated}
                className="gap-1.5"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Compor CSVs PJe-Calc
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <DocsParaConfigurar
        docs={docs.filter((d) => d.tipo_extracao === 'nao_extrair')}
        onSetTipo={handleSetTipo}
      />

      {docsToExtract.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Documentos para extração ({docsToExtract.length})
          </h3>
          {docsToExtract.map((doc) => (
            <DocumentExtractionCard key={doc.id} doc={doc} categorias={categorias} />
          ))}
        </div>
      )}

      <ComposicaoCsvDialog
        open={openCompose}
        onOpenChange={setOpenCompose}
        caseId={caseId}
        caseSlug={caseSlug}
        numeroProcesso={numeroProcesso}
      />
    </div>
  );
}

function DocsParaConfigurar({
  docs,
  onSetTipo,
}: {
  docs: Doc[];
  onSetTipo: (id: string, t: TipoExtracao) => Promise<void>;
}) {
  if (docs.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          Documentos sem tipo de extração ({docs.length})
        </CardTitle>
        <CardDescription className="text-xs">
          Selecione o tipo de extração para cada documento que deve ser
          processado pela extração de dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {docs.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm"
          >
            <div className="min-w-0 flex-1 truncate">
              <span className="font-medium">{d.file_name ?? d.id}</span>
              {!d.ocr_text && (
                <span className="ml-2 text-[11px] text-muted-foreground">
                  (OCR ainda não disponível)
                </span>
              )}
            </div>
            <ExtractionTypeSelector
              value={d.tipo_extracao}
              onChange={(v) => void onSetTipo(d.id, v)}
              disabled={!d.ocr_text}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
