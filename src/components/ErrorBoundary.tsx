import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError, copyToClipboard } from '@/lib/error-reporter';
import { toast } from 'sonner';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; info: ErrorInfo | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info });
    void reportError({
      message: error.message,
      stack: error.stack,
      source: 'react-boundary',
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      context: { componentStack: info.componentStack },
    });
  }

  private handleReport = (): void => {
    const { error, info } = this.state;
    if (!error) return;
    const payload = JSON.stringify(
      {
        message: error.message,
        stack: error.stack,
        componentStack: info?.componentStack,
        route: typeof window !== 'undefined' ? window.location.pathname : '',
        at: new Date().toISOString(),
      },
      null,
      2,
    );
    copyToClipboard(payload);
    toast.success('Stack copiado para a área de transferência');
  };

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <h1 className="text-2xl font-bold mb-4">Erro inesperado</h1>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            Ocorreu um erro na aplicação. Você pode tentar continuar, recarregar a página ou copiar
            o stack para reportar ao suporte.
          </p>
          <pre className="text-xs bg-muted p-4 rounded max-w-2xl max-h-72 overflow-auto mb-4 w-full">
            {this.state.error?.message}
            {this.state.error?.stack ? `\n\n${this.state.error.stack}` : ''}
          </pre>
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={this.handleReport}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded text-sm"
            >
              Copiar stack
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 border rounded text-sm"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
