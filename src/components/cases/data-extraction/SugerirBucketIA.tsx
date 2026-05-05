/**
 * Botão por linha de holerite (rubricas com origem='fallback') que invoca
 * o edge function `sugerir-bucket-rubrica` e expõe duas ações:
 *   - Mostrar a sugestão (bucket PJe-Calc + justificativa + confiança)
 *   - "Salvar como regra para próximas" → insere em `rubrica_mapping`,
 *     o classificador determinístico passa a aplicar nos próximos holerites.
 *
 * Importante: NÃO altera a categoria local da linha — o operador continua
 * tendo controle total via dropdown. A IA só sugere (e opcionalmente
 * persiste a regra global).
 */
import { useState } from "react";
import { Sparkles, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  sugerirBucketRubrica,
  SugerirBucketError,
  type SugestaoBucket,
} from "@/features/rubrica-mapping/sugerir-bucket";
import {
  normalizarRubrica,
  type BucketPjeCalc,
  type RubricaLayout,
} from "@/features/rubrica-mapping/classificar";

const BUCKET_LABEL: Record<BucketPjeCalc, string> = {
  minimo_garantido: "Mínimo Garantido",
  salario_substituicao: "Salário Substituição",
  comissoes_produtos: "Comissões de Produtos",
  dsr_comissoes: "DSR sobre Comissões",
  comissoes_servicos: "Comissões de Serviços",
  premios: "Prêmios",
  desconsiderar: "Desconsiderar",
};

const CONFIANCA_TONE: Record<SugestaoBucket["confianca"], string> = {
  alta: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200",
  media: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200",
  baixa: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200",
};

interface Props {
  rubricaNome: string;
  layout?: RubricaLayout;
}

export function SugerirBucketIA({ rubricaNome, layout = "generico" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [sugestao, setSugestao] = useState<SugestaoBucket | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleAbrir = async (next: boolean) => {
    setOpen(next);
    if (!next || sugestao || loading) return;
    setLoading(true);
    setErro(null);
    try {
      const { sugestao: s } = await sugerirBucketRubrica(supabase, {
        rubrica: rubricaNome,
        layout,
      });
      setSugestao(s);
    } catch (e) {
      setErro(
        e instanceof SugerirBucketError
          ? e.message
          : `Falha ao consultar IA: ${(e as Error).message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!sugestao) return;
    setSalvando(true);
    try {
      const { error } = await supabase
        // rubrica_mapping ainda não está nos types do supabase — cast pontual
        // até a próxima geração de types. A tabela existe via migration
        // 20260506110000_rubrica_mapping.sql.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("rubrica_mapping" as any)
        .insert({
          rubrica_normalizada: normalizarRubrica(rubricaNome),
          rubrica_original: rubricaNome,
          bucket: sugestao.bucket,
          layout_aplicavel: layout,
          tipo_regra: "enumerado_explicito",
          prioridade: 100,
          excecoes: [],
          observacao: `IA: ${sugestao.justificativa} (confiança ${sugestao.confianca})`,
        });
      if (error) throw error;
      setSalvo(true);
      toast.success(
        `Regra salva — "${rubricaNome}" → ${BUCKET_LABEL[sugestao.bucket]}.`,
      );
    } catch (e) {
      const msg = (e as Error).message ?? "erro desconhecido";
      toast.error(`Falha ao salvar regra: ${msg}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleAbrir}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[10px] gap-1 text-violet-700 dark:text-violet-300 hover:bg-violet-100/50 dark:hover:bg-violet-950/30"
          title="Pedir à IA uma sugestão de bucket PJe-Calc para esta rubrica"
        >
          <Sparkles className="h-3 w-3" />
          IA
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-3 text-xs space-y-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="font-medium flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
          Sugestão para classificação PJe-Calc
        </div>
        <div className="text-muted-foreground text-[11px] truncate">
          Rubrica: <code className="font-mono">{rubricaNome}</code>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Consultando IA…
          </div>
        )}

        {erro && (
          <div className="flex items-start gap-1.5 text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {sugestao && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`${CONFIANCA_TONE[sugestao.confianca]} text-[10px]`}
              >
                {BUCKET_LABEL[sugestao.bucket]} · {sugestao.confianca}
              </Badge>
            </div>
            {sugestao.justificativa && (
              <p className="text-[11px] text-muted-foreground italic">
                {sugestao.justificativa}
              </p>
            )}
            {sugestao.confianca === "baixa" && (
              <p className="text-[10px] text-amber-700 dark:text-amber-300">
                Confiança baixa — confirme manualmente antes de salvar.
              </p>
            )}
            {salvo ? (
              <Badge
                variant="outline"
                className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] gap-1"
              >
                <Check className="h-3 w-3" /> Regra salva
              </Badge>
            ) : (
              <Button
                size="sm"
                className="w-full h-7 text-[11px] gap-1.5"
                onClick={handleSalvar}
                disabled={salvando}
              >
                {salvando ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Aceitar e salvar para próximas
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
