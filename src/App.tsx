import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { supabaseMisconfigured } from "./integrations/supabase/client";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Casos from "./pages/Casos";
import CasoDetalhe from "./pages/CasoDetalhe";
import Tabelas from "./pages/Tabelas";
import PjeCalcPage from "./pages/PjeCalcPage";
import NovoCalculo from "./pages/NovoCalculo";
import PJCAnalyzer from "./pages/admin/PJCAnalyzer";
import Configuracoes from "./pages/Configuracoes";
import Busca from "./pages/Busca";
import Documentos from "./pages/Documentos";
import RegrasTabelas from "./pages/RegrasTabelas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ConfigError() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center', background: '#fef2f2' }}>
      <h1 style={{ color: '#dc2626', fontSize: '1.5rem', marginBottom: '1rem' }}>⚠️ Configuração Supabase ausente</h1>
      <p style={{ color: '#374151', maxWidth: 500, lineHeight: 1.6 }}>
        As variáveis de ambiente <code style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>VITE_SUPABASE_URL</code> e{' '}
        <code style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>VITE_SUPABASE_PUBLISHABLE_KEY</code> não estão definidas.
      </p>
      <p style={{ color: '#6b7280', marginTop: '1rem', maxWidth: 500, lineHeight: 1.6 }}>
        <strong>Local:</strong> copie <code>.env.example</code> → <code>.env</code> e preencha.<br />
        <strong>Vercel:</strong> vá em Settings → Environment Variables e adicione ambas.
      </p>
    </div>
  );
}

const App = () => {
  if (supabaseMisconfigured) return <ConfigError />;

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/casos" element={<ProtectedRoute><Casos /></ProtectedRoute>} />
            <Route path="/casos/:id" element={<ProtectedRoute><CasoDetalhe /></ProtectedRoute>} />
            <Route path="/tabelas" element={<ProtectedRoute><Tabelas /></ProtectedRoute>} />
            <Route path="/tabelas/:tipo" element={<ProtectedRoute><Tabelas /></ProtectedRoute>} />
            <Route path="/pjecalc/:id" element={<ProtectedRoute><PjeCalcPage /></ProtectedRoute>} />
            <Route path="/novo-calculo" element={<ProtectedRoute><NovoCalculo /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="/busca" element={<ProtectedRoute><Busca /></ProtectedRoute>} />
            <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
            <Route path="/regras" element={<ProtectedRoute><RegrasTabelas /></ProtectedRoute>} />
            <Route path="/admin/pjc-analyzer" element={<ProtectedRoute><PJCAnalyzer /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
