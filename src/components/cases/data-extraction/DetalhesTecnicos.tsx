import { ChevronDown, Settings2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Props {
  items: Array<{ label: string; value: string | number; tooltip?: string }>;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

export function DetalhesTecnicos({ items, children, defaultOpen = false }: Props) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-t mt-4 pt-3">
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition group">
        <Settings2 className="h-3 w-3" />
        <span>Detalhes técnicos</span>
        <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {items.map((it, i) => (
            <div key={i} className="contents">
              <dt className="text-muted-foreground" title={it.tooltip}>{it.label}</dt>
              <dd className="font-mono text-foreground">{it.value}</dd>
            </div>
          ))}
        </dl>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
