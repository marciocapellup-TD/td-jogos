import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import PostCard from '../components/PostCard';

export default function Admin() {
  const [aba, setAba] = useState('fila');
  return (
    <div>
      <div className="label">Administração</div>
      <h1 style={{ marginBottom: 18 }}>Painel admin</h1>

      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {[
          ['fila', 'Fila de aprovação'],
          ['usuarios', 'Usuários'],
          ['aprovados', 'Posts aprovados'],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className="btn"
            style={{
              background: aba === k ? 'var(--amarelo)' : 'transparent',
              color: aba === k ? 'var(--azul)' : 'var(--branco-70)',
              borderRadius: '3px 3px 0 0',
              padding: '9px 18px',
              fontSize: 11,
            }}
          >{l}</button>
        ))}
      </div>

      {aba === 'fila' && <Fila />}
      {aba === 'usuarios' && <Usuarios />}
      {aba === 'aprovados' && <Aprovados />}
    </div>
  );
}

function Fila() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejModal, setRejModal] = useState(null);
  const [motivo, setMotivo] = useState('');

  const carregar = () => {
    setLoading(true);
    supabase.from('posts')
      .select('*, profiles!posts_user_id_fkey(nome_exibicao, groups(nome, cor))')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .then(({ data }) => { setPosts(data || []); setLoading(false); });
  };
  useEffect(() => { carregar(); }, []);

  const aprovar = async (post) => {
    await supabase.from('posts').update({
      status: 'approved',
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', post.id);
    carregar();
  };

  const reprovar = async () => {
    if (!motivo.trim()) { alert('Motivo obrigatório'); return; }
    await supabase.from('posts').update({
      status: 'rejected',
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      motivo_reprovacao: motivo.trim(),
    }).eq('id', rejModal.id);
    setRejModal(null);
    setMotivo('');
    carregar();
  };

  if (loading) return <div style={{ color: 'var(--branco-45)' }}>Carregando...</div>;
  if (posts.length === 0) return <div className="card" style={{ textAlign: 'center', color: 'var(--branco-70)' }}>Nenhum post pendente 🎉</div>;

  return (
    <>
      <div className="grid-cards">
        {posts.map(p => (
          <PostCard key={p.id} post={p}>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={() => aprovar(p)}>✓ Aprovar</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { setRejModal(p); setMotivo(''); }}>✗ Reprovar</button>
            </div>
          </PostCard>
        ))}
      </div>

      {rejModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100,
        }} onClick={() => setRejModal(null)}>
          <div className="card" style={{ maxWidth: 440, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="label">Reprovar post</div>
            <h2 style={{ marginTop: 4, marginBottom: 14 }}>Qual o motivo?</h2>
            <textarea
              className="input"
              rows={3}
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: foto não mostra o app / abaixo do tempo mínimo / duplicada..."
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setRejModal(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={reprovar}>Reprovar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Usuarios() {
  const { profile: me, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);

  const carregar = () => {
    supabase.from('profiles').select('*, groups(nome, cor)').order('nome_exibicao')
      .then(({ data }) => setUsers(data || []));
    supabase.from('groups').select('*').order('id').then(({ data }) => setGroups(data || []));
  };
  useEffect(carregar, []);

  const promover = async (u, novoRole) => {
    if (!isSuperAdmin) { alert('Só superadmin promove'); return; }
    await supabase.from('profiles').update({ role: novoRole }).eq('id', u.id);
    carregar();
  };

  const mudarGrupo = async (u, gid) => {
    await supabase.from('profiles').update({ group_id: Number(gid) }).eq('id', u.id);
    carregar();
  };

  const toggleAtivo = async (u) => {
    await supabase.from('profiles').update({ ativo: !u.ativo }).eq('id', u.id);
    carregar();
  };

  return (
    <div className="card">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--amarelo)', fontFamily: 'Rajdhani', letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 11 }}>
            <th style={{ padding: 8 }}>Nome</th>
            <th style={{ padding: 8 }}>Grupo</th>
            <th style={{ padding: 8 }}>Papel</th>
            <th style={{ padding: 8 }}>Ativo</th>
            <th style={{ padding: 8 }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: 8 }}>{u.nome_exibicao}<br /><span style={{ color: 'var(--branco-45)', fontSize: 11 }}>{u.email}</span></td>
              <td style={{ padding: 8 }}>
                <select className="input" value={u.group_id || ''} onChange={e => mudarGrupo(u, e.target.value)}>
                  <option value="">—</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
              </td>
              <td style={{ padding: 8 }}>
                <span className="badge" style={{ background: u.role === 'superadmin' ? 'var(--amarelo)' : u.role === 'admin' ? 'var(--azul-grupo)' : 'rgba(255,255,255,0.1)', color: u.role === 'user' ? '#fff' : 'var(--azul)' }}>{u.role}</span>
              </td>
              <td style={{ padding: 8 }}>{u.ativo ? '✓' : '✗'}</td>
              <td style={{ padding: 8 }}>
                {isSuperAdmin && u.role !== 'superadmin' && (
                  <>
                    {u.role === 'user'
                      ? <button className="btn btn-ghost btn-sm" onClick={() => promover(u, 'admin')} style={{ padding: '4px 8px', fontSize: 10 }}>→ Admin</button>
                      : <button className="btn btn-ghost btn-sm" onClick={() => promover(u, 'user')} style={{ padding: '4px 8px', fontSize: 10 }}>→ User</button>}
                  </>
                )}
                {u.id !== me.id && (
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleAtivo(u)} style={{ padding: '4px 8px', fontSize: 10, marginLeft: 4 }}>
                    {u.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Aprovados() {
  const [posts, setPosts] = useState([]);
  const [busca, setBusca] = useState('');

  const carregar = () => {
    supabase.from('posts')
      .select('*, profiles!posts_user_id_fkey(nome_exibicao, groups(nome, cor))')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => setPosts(data || []));
  };
  useEffect(carregar, []);

  const excluir = async (p) => {
    if (!confirm('Excluir esta postagem aprovada?')) return;
    await supabase.from('posts').delete().eq('id', p.id);
    carregar();
  };

  const filtrados = posts.filter(p => {
    const q = busca.toLowerCase();
    return !q || p.profiles?.nome_exibicao?.toLowerCase().includes(q)
      || p.categoria.includes(q);
  });

  return (
    <div>
      <input
        className="input"
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por nome ou categoria..."
        style={{ marginBottom: 14 }}
      />
      <div className="grid-cards">
        {filtrados.map(p => (
          <PostCard key={p.id} post={p}>
            <button className="btn btn-danger" style={{ fontSize: 10, padding: '6px 10px' }} onClick={() => excluir(p)}>
              Excluir
            </button>
          </PostCard>
        ))}
      </div>
    </div>
  );
}
