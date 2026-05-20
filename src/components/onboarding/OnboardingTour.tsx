import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/use-onboarding";
import {
  BookOpen,
  Calculator,
  FileDown,
  PartyPopper,
  Plus,
  Sparkles,
} from "lucide-react";

/**
 * OnboardingTour — walkthrough da primeira visita ao MRD Calc.
 *
 * O tour é controlado pelo hook `useOnboarding()` que persiste a conclusão
 * no `localStorage`. Cinco passos cobrem boas-vindas, criação de caso,
 * importação PJC, módulos de cálculo e finalização com link para o manual.
 *
 * Os passos 2 e 3 renderizam "callouts" ancorados em elementos da UI via
 * seletores opcionais (`createCaseSelector`, `importPjcSelector`). Quando
 * esses elementos não existem na página atual, o tour cai de volta para o
 * modo Dialog para não quebrar o fluxo.
 */
interface OnboardingTourProps {
  onComplete?: () => void;
  /** Seletor CSS do botão "Criar Caso" para destacar no passo 2. */
  createCaseSelector?: string;
  /** Seletor CSS do botão "Importar PJC" (opcional) para o passo 3. */
  importPjcSelector?: string;
  /** URL do Manual do Usuário aberta no último passo. */
  manualUrl?: string;
}

interface StepContent {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  mode: "dialog" | "anchor";
  anchorSelector?: string;
  cta?: { label: string; href: string };
}

const DEFAULT_MANUAL_URL = "/docs/manual-usuario.pdf";

export function OnboardingTour({
  onComplete,
  createCaseSelector = '[data-tour="create-case"]',
  importPjcSelector = '[data-tour="import-pjc"]',
  manualUrl = DEFAULT_MANUAL_URL,
}: OnboardingTourProps) {
  const { isActive, currentStep, goTo, finish, skip } = useOnboarding();

  const steps = useMemo<StepContent[]>(
    () => [
      {
        title: "Bem-vindo ao MRD Calc",
        description:
          "Sua plataforma integrada para cálculos trabalhistas, previdenciários e de correção monetária, com auditoria e exportação PJC nativas.",
        icon: Sparkles,
        mode: "dialog",
      },
      {
        title: "Comece pelo primeiro caso",
        description:
          "Use o botão \"Criar Caso\" no cabeçalho para abrir uma nova análise. Cada caso agrupa documentos, validações e módulos de cálculo.",
        icon: Plus,
        mode: "anchor",
        anchorSelector: createCaseSelector,
      },
      {
        title: "Já tem um arquivo PJC?",
        description:
          "Importe diretamente pelo botão \"Importar PJC\": o sistema lê o XML original, reconstrói os parâmetros e deixa tudo pronto para recálculo.",
        icon: FileDown,
        mode: "anchor",
        anchorSelector: importPjcSelector,
      },
      {
        title: "Módulos de cálculo",
        description:
          "Dentro de cada caso você tem módulos dedicados: Resumo, Parâmetros, Períodos, Pedidos, Correção, INSS/IR, FGTS, Honorários e Memória. Os valores circulam com precisão Decimal.js em todas as etapas.",
        icon: Calculator,
        mode: "dialog",
      },
      {
        title: "Pronto para começar!",
        description:
          "Você pode reabrir este tour depois pelo menu Configurações. Para aprofundar, consulte o Manual do Usuário com exemplos completos.",
        icon: PartyPopper,
        mode: "dialog",
        cta: { label: "Abrir Manual do Usuário", href: manualUrl },
      },
    ],
    [createCaseSelector, importPjcSelector, manualUrl],
  );

  const totalSteps = steps.length;
  const safeIndex = Math.min(currentStep, totalSteps - 1);
  const step = steps[safeIndex];
  const isLast = safeIndex === totalSteps - 1;
  const isFirst = safeIndex === 0;

  const handleNext = useCallback((): void => {
    if (isLast) {
      finish();
      onComplete?.();
      return;
    }
    goTo(safeIndex + 1);
  }, [finish, goTo, isLast, onComplete, safeIndex]);

  const handlePrev = useCallback((): void => {
    if (isFirst) return;
    goTo(safeIndex - 1);
  }, [goTo, isFirst, safeIndex]);

  const handleSkip = useCallback((): void => {
    skip();
    onComplete?.();
  }, [onComplete, skip]);

  // Se o passo atual é modo "anchor" mas o elemento não existe, renderiza dialog.
  const anchorEl = useAnchorElement(
    step.mode === "anchor" ? step.anchorSelector : undefined,
    isActive,
  );
  const renderAsAnchor = step.mode === "anchor" && anchorEl !== null;

  if (!isActive) return null;

  const StepIcon = step.icon;
  const progress = `Passo ${safeIndex + 1} de ${totalSteps}`;

  const controls = (
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" size="sm" onClick={handleSkip}>
        Pular Tour
      </Button>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={isFirst}
        >
          Anterior
        </Button>
        <Button size="sm" onClick={handleNext}>
          {isLast ? "Concluir" : "Próximo"}
        </Button>
      </div>
    </div>
  );

  if (renderAsAnchor && anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const top = Math.max(16, rect.bottom + window.scrollY + 8);
    const left = Math.max(16, rect.left + window.scrollX);
    return (
      <div
        role="dialog"
        aria-label={step.title}
        className="fixed z-[60] w-80 rounded-lg border bg-background p-4 shadow-xl"
        style={{ top, left }}
      >
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <StepIcon className="h-4 w-4" />
          <span>{progress}</span>
        </div>
        <h3 className="mb-1 text-sm font-semibold">{step.title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{step.description}</p>
        {controls}
      </div>
    );
  }

  return (
    <Dialog open={isActive} onOpenChange={(open) => { if (!open) handleSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <StepIcon className="h-4 w-4" />
            <span>{progress}</span>
          </div>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>
        {step.cta ? (
          <a
            href={step.cta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <BookOpen className="h-4 w-4" />
            {step.cta.label}
          </a>
        ) : null}
        <DialogFooter className="mt-2 sm:justify-between">{controls}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook interno: resolve (e re-resolve em resize/scroll) o elemento âncora
 * indicado pelo seletor. Retorna `null` quando o elemento não existe.
 */
function useAnchorElement(
  selector: string | undefined,
  active: boolean,
): HTMLElement | null {
  const [el, setEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !selector) {
      setEl(null);
      return;
    }
    const resolve = (): void => {
      const found = document.querySelector(selector);
      setEl(found instanceof HTMLElement ? found : null);
    };
    resolve();
    window.addEventListener("resize", resolve);
    window.addEventListener("scroll", resolve, true);
    return () => {
      window.removeEventListener("resize", resolve);
      window.removeEventListener("scroll", resolve, true);
    };
  }, [active, selector]);

  return el;
}

