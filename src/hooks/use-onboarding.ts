import { useCallback, useEffect, useState } from "react";

/**
 * Hook de controle do tour de onboarding do MRD Calc.
 *
 * Persiste a flag `mrd-onboarding-done` no `localStorage` para não repetir
 * o walkthrough em visitas futuras. A contagem de passos é genérica — o
 * componente de tour decide o `totalSteps` ao chamar `goTo`.
 */
const STORAGE_KEY = "mrd-onboarding-done";

export interface UseOnboardingResult {
  isFirstVisit: boolean;
  isActive: boolean;
  currentStep: number;
  start: () => void;
  finish: () => void;
  skip: () => void;
  goTo: (step: number) => void;
}

function readStorageFlag(): boolean {
  try {
    return typeof window !== "undefined"
      && window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function useOnboarding(): UseOnboardingResult {
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(() => !readStorageFlag());
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Ativa automaticamente na primeira visita, após montagem.
  useEffect(() => {
    if (isFirstVisit) setIsActive(true);
  }, [isFirstVisit]);

  const persistDone = useCallback((): void => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Se localStorage estiver indisponível, apenas ignora.
    }
  }, []);

  const start = useCallback((): void => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const finish = useCallback((): void => {
    persistDone();
    setIsFirstVisit(false);
    setIsActive(false);
  }, [persistDone]);

  const skip = useCallback((): void => {
    finish();
  }, [finish]);

  const goTo = useCallback((step: number): void => {
    setCurrentStep(Math.max(0, Math.floor(step)));
  }, []);

  return { isFirstVisit, isActive, currentStep, start, finish, skip, goTo };
}
