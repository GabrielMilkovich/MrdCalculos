/**
 * PjeCalcGrid — grade densa estilo PJE-Calc.
 *
 * Padrão visual unificado dos 4 módulos de parâmetros do cálculo
 * (Histórico Salarial, Faltas, Férias, Cartão de Ponto):
 *   - Tabela compacta com linha por registro
 *   - Cabeçalho sticky com botão "+ Adicionar" no canto direito
 *   - Inputs/selects inline em cada célula (edição direta, sem dialog)
 *   - Botão 🗑 no fim da linha
 *   - Highlight de linha alterada por OCR vs INFORMADA via prop rowClassName
 *
 * Cada módulo passa o array de colunas com renderer + accessor; o componente
 * cuida apenas do layout, scroll horizontal, hover, sticky header. Nenhuma
 * lógica de persistência — o módulo controla insert/update/delete.
 */
import { memo, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PjeCalcGridColumn<Row> {
  /** Identificador estável da coluna (usado como key). */
  key: string;
  /** Cabeçalho exibido na linha do <thead>. */
  header: ReactNode;
  /** Renderiza a célula da linha. Recebe o registro inteiro. */
  cell: (row: Row, index: number) => ReactNode;
  /** Largura sugerida (Tailwind class, ex.: "w-28" ou "w-[120px]"). */
  width?: string;
  /** Alinhamento horizontal do conteúdo da célula. */
  align?: "left" | "center" | "right";
  /** Cabeçalho secundário (subtítulo) para casos como "Par 1 / E - S". */
  subheader?: ReactNode;
  /** Quando true, a coluna ocupa colSpan=2 no header principal (pares E/S). */
  pairColumn?: boolean;
}

interface Props<Row> {
  title: string;
  subtitle?: string;
  /** Linhas a renderizar. */
  rows: Row[];
  /** Função para extrair a key estável de cada linha. */
  rowKey: (row: Row) => string;
  /** Definição das colunas. */
  columns: PjeCalcGridColumn<Row>[];
  /** Disparado ao clicar em "+ Adicionar". Se ausente, botão é ocultado. */
  onAdd?: () => void;
  /** Disparado ao clicar em 🗑 na linha. Se ausente, coluna é ocultada. */
  onDelete?: (row: Row) => void;
  /** Label do botão de adicionar (default: "Adicionar"). */
  addLabel?: string;
  /** Botões extras no header (ex.: "Gerar Mês", "Fixar Jornada"). */
  headerActions?: ReactNode;
  /** className extra por linha (ex.: destacar dias OCR, finais de semana). */
  rowClassName?: (row: Row, index: number) => string | undefined;
  /** Mensagem mostrada quando rows está vazio. */
  emptyMessage?: string;
  /** Mensagem de carregamento. */
  loading?: boolean;
  /** className extra na tabela. */
  className?: string;
  /** Conteúdo extra acima da tabela (alertas, sumário). */
  beforeTable?: ReactNode;
  /** Densidade — "compact" usa text-xs com padding mínimo (default = "compact"). */
  density?: "compact" | "comfortable";
}

function PjeCalcGridImpl<Row>(props: Props<Row>) {
  const {
    title,
    subtitle,
    rows,
    rowKey,
    columns,
    onAdd,
    onDelete,
    addLabel = "Adicionar",
    headerActions,
    rowClassName,
    emptyMessage = "Nenhum registro. Clique em \"Adicionar\" para começar.",
    loading = false,
    className,
    beforeTable,
    density = "compact",
  } = props;

  const cellPad = density === "compact" ? "px-1.5 py-1" : "px-2 py-1.5";
  const textCls = density === "compact" ? "text-[11px]" : "text-xs";
  const totalCols = columns.length + (onDelete ? 1 : 0);

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {headerActions}
          {onAdd && (
            <Button size="sm" variant="default" onClick={onAdd} className="h-8 gap-1">
              <Plus className="h-3.5 w-3.5" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      {beforeTable}

      <div className="border rounded-md overflow-x-auto bg-card">
        <table className={`w-full border-collapse ${textCls}`}>
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th
                  key={c.key}
                  colSpan={c.pairColumn ? 2 : 1}
                  className={`px-1.5 py-1.5 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground ${
                    c.align === "center"
                      ? "text-center"
                      : c.align === "right"
                        ? "text-right"
                        : "text-left"
                  } ${c.width ?? ""}`}
                >
                  {c.header}
                </th>
              ))}
              {onDelete && <th className="w-8" />}
            </tr>
            {columns.some((c) => c.subheader) && (
              <tr className="border-b border-border bg-muted/30">
                {columns.flatMap((c) =>
                  c.pairColumn ? (
                    [
                      <th
                        key={`${c.key}-e`}
                        className="px-1 py-0.5 text-[9px] text-center text-muted-foreground/80 font-medium"
                      >
                        Entrada
                      </th>,
                      <th
                        key={`${c.key}-s`}
                        className="px-1 py-0.5 text-[9px] text-center text-muted-foreground/80 font-medium"
                      >
                        Saída
                      </th>,
                    ]
                  ) : (
                    <th
                      key={`${c.key}-sub`}
                      className="px-1 py-0.5 text-[9px] text-center text-muted-foreground/80 font-medium"
                    >
                      {c.subheader ?? ""}
                    </th>
                  ),
                )}
                {onDelete && <th />}
              </tr>
            )}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={totalCols} className="py-6 text-center text-xs text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="py-8 text-center text-xs text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const cls = rowClassName?.(row, i) ?? "";
                return (
                  <tr
                    key={rowKey(row)}
                    className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${cls}`}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        colSpan={c.pairColumn ? 2 : 1}
                        className={`${cellPad} ${
                          c.align === "center"
                            ? "text-center"
                            : c.align === "right"
                              ? "text-right"
                              : "text-left"
                        }`}
                      >
                        {c.cell(row, i)}
                      </td>
                    ))}
                    {onDelete && (
                      <td className="px-1 py-0.5 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(row)}
                          title="Remover linha"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// memo wrapper preservando genéricos
export const PjeCalcGrid = memo(PjeCalcGridImpl) as <Row>(
  props: Props<Row>,
) => React.ReactElement;
