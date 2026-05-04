import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import PostCard from '../components/PostCard';

export default function MeusPosts() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    supabase.from('posts')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setPosts(data || []); setLoading(false); });
  }, [profile?.id]);

  const totalAprovado = posts.filter(p => p.status === 'approved').reduce((a, p) => a + (p.pontos || 0), 0);

  return (
    <div>
      <div className="label">Histórico pessoal</div>
      <h1 style={{ marginBottom: 6 }}>Meus registros</h1>
      <div style={{ fontSize: 13, color: 'var(--branco-70)', marginBottom: 22 }}>
        Total aprovado: <strong style={{ color: 'var(--amarelo)', fontSize: 16 }}>{totalAprovado} pts</strong>
        {' · '} {posts.length} registro{posts.length !== 1 ? 's' : ''}
      </div>

      {loading && <div style={{ color: 'var(--branco-45)' }}>Carregando...</div>}
      {!loading && posts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--branco-45)' }}>
          Nenhum registro ainda. Volte pra home e comece!
        </div>
      )}

      <div className="grid-cards">
        {posts.map(p => (
          <PostCard key={p.id} post={p}>
            {p.status !== 'rejected' && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '6px 12px', marginTop: 4 }}
                onClick={() => navigate(`/editar/${p.id}`)}
              >
                ✏️ Editar
              </button>
            )}
          </PostCard>
        ))}
      </div>
    </div>
  );
}
