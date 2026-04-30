/**
 * Mini event-bus do "estado da última mutação" — alimentado pelo MutationCache global
 * e consumido pelo RunningTasksIndicator. Evita prop drilling.
 */
type Listener = (hasError: boolean) => void;

let lastError = false;
const listeners = new Set<Listener>();

export function setLastMutationError(err: boolean): void {
  lastError = err;
  listeners.forEach((l) => l(err));
}

export function getLastMutationError(): boolean {
  return lastError;
}

export function subscribeLastMutationError(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
