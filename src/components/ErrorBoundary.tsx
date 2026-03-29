import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <h1 className="text-2xl font-bold mb-4">Erro inesperado</h1>
          <p className="text-muted-foreground mb-4">Ocorreu um erro na aplicacao. Tente recarregar a pagina.</p>
          <pre className="text-xs bg-muted p-4 rounded max-w-lg overflow-auto mb-4">{this.state.error?.message}</pre>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded">
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
