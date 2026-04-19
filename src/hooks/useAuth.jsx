import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
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
    <Ctx.Provider value={{ session, profile, loading, signIn, signOut, isAdmin: ['admin','superadmin'].includes(profile?.role), isSuperAdmin: profile?.role === 'superadmin' }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
