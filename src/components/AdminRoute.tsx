/**
 * AdminRoute — guarda rotas /admin/* exigindo role 'admin' em user_roles.
 *
 * Fluxo:
 *  1. Verifica sessão authenticada (igual ao ProtectedRoute).
 *  2. Chama RPC `has_role(auth.uid(), 'admin'::app_role)`.
 *  3. Se true → renderiza children. Se false → 403 (Acesso negado).
 *
 * Backend depende de:
 *  - public.user_roles (user_id, role app_role) — tabela existente
 *  - public.has_role(_user_id uuid, _role app_role) → boolean — function existente
 *
 * Hoje (2026-04-25) public.user_roles está vazia, então NENHUM usuário
 * passa pelo gate. O dono do projeto deve cadastrar pelo menos 1 admin
 * via SQL Editor:
 *   INSERT INTO public.user_roles (user_id, role)
 *   VALUES ('<uid_do_admin>', 'admin'::app_role);
 */
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

type State = 'loading' | 'unauthenticated' | 'forbidden' | 'authorized';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) setState('unauthenticated');
          return;
        }

        // RPC has_role: SECURITY DEFINER, retorna boolean.
        // Custom type `_role app_role` aceita string 'admin' (cast implícito).
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin',
        });

        if (error) {
          logger.error('AdminRoute: has_role RPC falhou', { error: error.message });
          if (!cancelled) setState('forbidden');
          return;
        }

        if (!cancelled) {
          setState(data === true ? 'authorized' : 'forbidden');
        }
      } catch (err) {
        logger.error('AdminRoute: erro inesperado', { error: String(err) });
        if (!cancelled) setState('forbidden');
      }
    }

    void check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setState('unauthenticated');
      } else {
        setState('loading');
        void check();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (state === 'unauthenticated') {
    return <Navigate to="/auth" replace />;
  }

  if (state === 'forbidden') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Acesso negado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Esta área requer permissão de administrador. Sua conta atual
              não tem essa permissão.
            </p>
            <p className="text-muted-foreground">
              Se você acredita que deveria ter acesso, peça ao dono da
              plataforma para cadastrar seu usuário com role <code>admin</code>.
            </p>
            <Button onClick={() => window.history.back()} variant="outline" size="sm">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
