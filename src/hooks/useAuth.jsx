import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const Ctx = createContext(null);
const DOMINIO_PERMITIDO = 'tributodevido.com.br';

async function emailPermitido(email) {
  if (!email) return false;
  if (email.toLowerCase().endsWith(`@${DOMINIO_PERMITIDO}`)) return true;
  // Consulta whitelist (admin pode cadastrar emails externos tipo Dr. Fabricio)
  const { data } = await supabase.rpc('email_allowed', { p_email: email });
  return data === true;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dominioBloqueado, setDominioBloqueado] = useState(false);

  useEffect(() => {
    (async () => {
      // Fallback manual: se detectSessionInUrl não processou, parse o hash aqui.
      if (window.location.hash.includes('access_token=')) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) console.error('[auth] setSession erro:', error);
          // limpa o hash da URL
          window.history.replaceState({}, '', window.location.pathname + window.location.search);
        }
      }

      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (s?.user?.email) {
        const ok = await emailPermitido(s.user.email);
        if (!ok) {
          await supabase.auth.signOut();
          setDominioBloqueado(true);
          setSession(null);
          return;
        }
      }
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    (async () => {
      let { data: prof } = await supabase
        .from('profiles')
        .select('*, groups(id, nome, cor)')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!prof) {
        const nome = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email;
        await supabase.rpc('claim_pending_profile', { p_nome: nome, p_email: session.user.email });
        const res = await supabase
          .from('profiles')
          .select('*, groups(id, nome, cor)')
          .eq('id', session.user.id)
          .maybeSingle();
        prof = res.data;
      }
      setProfile(prof);
    })();
  }, [session?.user?.id]);

  const signIn = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: { hd: 'tributodevido.com.br', prompt: 'select_account' },
    },
  });

  const signOut = () => supabase.auth.signOut();

  return (
    <Ctx.Provider value={{
      session,
      profile,
      loading,
      signIn,
      signOut,
      isAdmin: ['admin','superadmin'].includes(profile?.role),
      isSuperAdmin: profile?.role === 'superadmin',
      dominioBloqueado,
      limparDominioBloqueado: () => setDominioBloqueado(false),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
