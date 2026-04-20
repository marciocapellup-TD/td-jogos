import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import PostCard from '../components/PostCard';
import { CATEGORIAS } from '../lib/scoring';

export default function Admin() {
  const [aba, setAba] = useState('fila');
  return (
    <div>
      <div className="label">Administração</div>
      <h1 style={{ marginBottom: 18 }}>Painel admin</h1>

      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
        {[
          ['fila', 'Fila de aprovação'],
          ['usuarios', 'Usuários'],
          ['grupos', 'Grupos'],
          ['excecoes', 'Exceções'],
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
      {aba === 'grupos' && <Grupos />}
      {aba === 'excecoes' && <Excecoes />}
      {aba === 'aprovados' && <Aprovados />}
    </div>
  );
}

function Excecoes() {
  const { profile: me } = useAuth();
  const [lista, setLista] = useState([]);
  const [novoEmail, setNovoEmail] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novaObs, setNovaObs] = useState('');
  const [erro, setErro] = useState(null);

  const carregar = () => {
    supabase.from('email_exceptions').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setLista(data || []));
  };
  useEffect(carregar, []);

  const adicionar = async (e) => {
    e.preventDefault();
    setErro(null);
    const email = novoEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) { setErro('E-mail inválido'); return; }
    const { error } = await supabase.from('email_exceptions').insert({
      email, nome_exibicao: novoNome.trim() || null, observacao: novaObs.trim() || null, criado_por: me.id,
    });
    if (error) { setErro(error.message); return; }
    setNovoEmail(''); setNovoNome(''); setNovaObs('');
    carregar();
  };

  const remover = async (email) => {
    if (!confirm(`Remover acesso de ${email}?`)) return;
    await supabase.from('email_exceptions').delete().eq('email', email);
    carregar();
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="label" style={{ marginBottom: 8 }}>Permitir acesso de e-mail externo</div>
        <div style={{ fontSize: 12, color: 'var(--branco-70)', marginBottom: 14 }}>
          Use pra convidar pessoas sem e-mail <strong>@tributodevido.com.br</strong> (ex: Dr. Fabrício Assini, consultores).
          Após cadastrar, a pessoa pode logar com Google. Depois do primeiro login, vai em <strong>Usuários</strong> e atribui o grupo.
        </div>
        <form onSubmit={adicionar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 10 }}>
          <input className="input" type="email" placeholder="email@externo.com" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} required />
          <input className="input" placeholder="Nome (opcional)" value={novoNome} onChange={e => setNovoNome(e.target.value)} />
          <input className="input" placeholder="Observação (opcional)" value={novaObs} onChange={e => setNovaObs(e.target.value)} />
          <button type="submit" className="btn btn-primary">+ Adicionar</button>
        </form>
        {erro && <div style={{ marginTop: 10, color: 'var(--vermelho)', fontSize: 12 }}>{erro}</div>}
      </div>

      <div className="card">
        <div className="label" style={{ marginBottom: 10 }}>Exceções cadastradas ({lista.length})</div>
        {lista.length === 0 && <div style={{ color: 'var(--branco-45)', fontSize: 12 }}>Nenhuma exceção.</div>}
        {lista.map(x => (
          <div key={x.email} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div>
              <div style={{ fontSize: 14 }}>
                <strong>{x.email}</strong>
                {x.nome_exibicao && <span style={{ color: 'var(--branco-70)', marginLeft: 8 }}>· {x.nome_exibicao}</span>}
              </div>
              {x.observacao && <div style={{ fontSize: 11, color: 'var(--branco-45)', marginTop: 2 }}>{x.observacao}</div>}
            </div>
            <button className="btn btn-ghost" onClick={() => remover(x.email)} style={{ fontSize: 10, padding: '4px 10px' }}>Remover</button>
          </div>
        ))}
      </div>
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
    await supabase.from('profiles').update({ group_id: gid ? Number(gid) : null }).eq('id', u.id);
    carregar();
  };

  const toggleAtivo = async (u) => {
    await supabase.from('profiles').update({ ativo: !u.ativo }).eq('id', u.id);
    carregar();
  };

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
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
          {users.map(u => {
            const ehVoce = u.id === me.id;
            const podePromover = isSuperAdmin && u.role !== 'superadmin';
            return (
              <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: 8 }}>
                  {u.nome_exibicao}
                  {ehVoce && <span style={{ color: 'var(--amarelo)', fontSize: 10, marginLeft: 6, letterSpacing: 1 }}>VOCÊ</span>}
                  <br />
                  <span style={{ color: 'var(--branco-45)', fontSize: 11 }}>{u.email}</span>
                </td>
                <td style={{ padding: 8 }}>
                  <select className="input" value={u.group_id || ''} onChange={e => mudarGrupo(u, e.target.value)}>
                    <option value="">—</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </td>
                <td style={{ padding: 8 }}>
                  <span className="badge" style={{
                    background: u.role === 'superadmin' ? 'var(--amarelo)' : u.role === 'admin' ? 'var(--azul-grupo)' : 'rgba(255,255,255,0.1)',
                    color: u.role === 'user' ? '#fff' : 'var(--azul)'
                  }}>{u.role}</span>
                </td>
                <td style={{ padding: 8 }}>{u.ativo ? '✓' : '✗'}</td>
                <td style={{ padding: 8 }}>
                  {ehVoce ? (
                    <span style={{ color: 'var(--branco-45)', fontSize: 11, fontStyle: 'italic' }}>você mesmo</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {podePromover && (u.role === 'user'
                        ? <button className="btn btn-ghost" onClick={() => promover(u, 'admin')} style={{ padding: '4px 8px', fontSize: 10 }}>→ Admin</button>
                        : <button className="btn btn-ghost" onClick={() => promover(u, 'user')} style={{ padding: '4px 8px', fontSize: 10 }}>→ User</button>
                      )}
                      <button className="btn btn-ghost" onClick={() => toggleAtivo(u)} style={{ padding: '4px 8px', fontSize: 10 }}>
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Grupos() {
  const [groups, setGroups] = useState([]);
  const [editando, setEditando] = useState(null);
  const [nomeTemp, setNomeTemp] = useState('');
  const [corTemp, setCorTemp] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [pending, setPending] = useState([]);

  const carregar = () => {
    supabase.from('groups').select('*').order('id')
      .then(({ data }) => setGroups(data || []));
    supabase.from('profiles').select('id, nome_exibicao, group_id, ativo, role').order('nome_exibicao')
      .then(({ data }) => setProfiles(data || []));
    supabase.from('pending_claims').select('id, nome_exibicao, group_id').is('claimed_by', null).order('nome_exibicao')
      .then(({ data }) => setPending(data || []));
  };
  useEffect(carregar, []);

  const iniciarEdicao = (g) => {
    setEditando(g.id);
    setNomeTemp(g.nome);
    setCorTemp(g.cor);
  };

  const cancelar = () => {
    setEditando(null);
    setNomeTemp('');
    setCorTemp('');
  };

  const salvar = async () => {
    if (!nomeTemp.trim()) { alert('Nome obrigatório'); return; }
    setSalvando(true);
    await supabase.from('groups')
      .update({ nome: nomeTemp.trim(), cor: corTemp || '#F4CC04' })
      .eq('id', editando);
    setSalvando(false);
    setEditando(null);
    carregar();
  };

  return (
    <div className="card">
      <div style={{ fontSize: 12, color: 'var(--branco-70)', marginBottom: 14 }}>
        Alterações refletem imediatamente em todo o app (rankings, dashboards, home).
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {groups.map(g => (
          <div key={g.id} style={{
            background: 'rgba(255,255,255,0.03)',
            borderLeft: `4px solid ${g.cor}`,
            padding: '14px 16px',
            borderRadius: 3,
          }}>
            {editando === g.id ? (
              <div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label>Nome do grupo</label>
                  <input
                    className="input"
                    value={nomeTemp}
                    onChange={e => setNomeTemp(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label>Cor</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={corTemp}
                      onChange={e => setCorTemp(e.target.value)}
                      style={{ width: 40, height: 32, border: 'none', borderRadius: 3, background: 'transparent' }}
                    />
                    <input
                      className="input"
                      value={corTemp}
                      onChange={e => setCorTemp(e.target.value)}
                      placeholder="#F4CC04"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost" onClick={cancelar} style={{ flex: 1, fontSize: 10 }}>Cancelar</button>
                  <button className="btn btn-primary" onClick={salvar} disabled={salvando} style={{ flex: 1, fontSize: 10 }}>
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="label" style={{ color: g.cor }}>Grupo · ID {g.id}</div>
                    <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                      {g.nome}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--branco-45)', marginTop: 2, letterSpacing: 1 }}>
                      {g.cor}
                    </div>
                  </div>
                  <button className="btn btn-ghost" onClick={() => iniciarEdicao(g)} style={{ fontSize: 10, padding: '6px 10px' }}>
                    Editar
                  </button>
                </div>

                {(() => {
                  const membrosAtivos = profiles.filter(p => p.group_id === g.id && p.ativo);
                  const membrosPending = pending.filter(p => p.group_id === g.id);
                  const total = membrosAtivos.length + membrosPending.length;

                  return (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="label" style={{ marginBottom: 8 }}>
                        Membros ({total})
                      </div>
                      {total === 0 && (
                        <div style={{ fontSize: 11, color: 'var(--branco-45)' }}>
                          Nenhum membro atribuído.
                        </div>
                      )}
                      {membrosAtivos.map(m => (
                        <div key={m.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 0',
                          fontSize: 12,
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--verde)',
                            flexShrink: 0,
                          }} title="Logado" />
                          <span style={{ color: '#fff' }}>{m.nome_exibicao}</span>
                          {m.role !== 'user' && (
                            <span style={{
                              fontSize: 9, letterSpacing: 1,
                              color: 'var(--amarelo)', textTransform: 'uppercase',
                              fontFamily: 'Rajdhani', fontWeight: 700,
                            }}>
                              · {m.role}
                            </span>
                          )}
                        </div>
                      ))}
                      {membrosPending.map(m => (
                        <div key={`pc-${m.id}`} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 0',
                          fontSize: 12,
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            flexShrink: 0,
                          }} title="Ainda não logou" />
                          <span style={{ color: 'var(--branco-45)' }}>
                            {m.nome_exibicao}
                          </span>
                          <span style={{
                            fontSize: 9, letterSpacing: 1,
                            color: 'var(--branco-45)', textTransform: 'uppercase',
                            fontFamily: 'Rajdhani', fontWeight: 700,
                          }}>
                            · pendente
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Aprovados() {
  const [posts, setPosts] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroPessoa, setFiltroPessoa] = useState('');
  const [groups, setGroups] = useState([]);

  const carregar = () => {
    supabase.from('posts')
      .select('*, profiles!posts_user_id_fkey(id, nome_exibicao, group_id, groups(nome, cor))')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => setPosts(data || []));
    supabase.from('groups').select('*').order('id').then(({ data }) => setGroups(data || []));
  };
  useEffect(carregar, []);

  // Extrai o path do arquivo no bucket a partir da URL pública
  const extractStoragePath = (url) => {
    if (!url) return null;
    const m = url.match(/\/storage\/v1\/object\/public\/postagens\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  };

  const excluir = async (p) => {
    if (!confirm('Excluir esta postagem? Pontos e foto serão removidos (irreversível).')) return;
    const path = extractStoragePath(p.foto_url);
    if (path) await supabase.storage.from('postagens').remove([path]);
    await supabase.from('posts').delete().eq('id', p.id);
    carregar();
  };

  const liberarFoto = async (p) => {
    if (!confirm('Apagar só a foto do armazenamento? O post e os pontos continuam preservados.\n\nÚtil quando o Storage está cheio.')) return;
    const path = extractStoragePath(p.foto_url);

    // Apaga do storage (se o path puder ser extraído)
    if (path) {
      const { data, error } = await supabase.storage.from('postagens').remove([path]);
      if (error) {
        console.error('[liberarFoto] storage erro:', error);
        alert('Falha ao apagar do storage: ' + error.message);
        return;
      }
      console.log('[liberarFoto] removido:', data);
    }

    // Marca no banco pra UI mostrar placeholder independente de cache do browser
    const { error: updErr } = await supabase
      .from('posts')
      .update({ foto_liberada: true })
      .eq('id', p.id);
    if (updErr) { alert('Erro ao marcar post: ' + updErr.message); return; }

    carregar();
  };

  // lista única de pessoas com posts aprovados (ordenada)
  const pessoas = useMemo(() => {
    const map = new Map();
    for (const p of posts) {
      const pid = p.profiles?.id;
      if (pid) map.set(pid, p.profiles.nome_exibicao);
    }
    return Array.from(map.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [posts]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return posts.filter(p => {
      if (filtroCategoria && p.categoria !== filtroCategoria) return false;
      if (filtroGrupo && String(p.profiles?.group_id) !== filtroGrupo) return false;
      if (filtroPessoa && p.profiles?.id !== filtroPessoa) return false;
      if (q && !p.profiles?.nome_exibicao?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [posts, busca, filtroCategoria, filtroGrupo, filtroPessoa]);

  const limparFiltros = () => {
    setBusca(''); setFiltroCategoria(''); setFiltroGrupo(''); setFiltroPessoa('');
  };

  const temFiltro = busca || filtroCategoria || filtroGrupo || filtroPessoa;

  return (
    <div>
      {/* Barra de filtros */}
      <div className="card" style={{ marginBottom: 16, borderTopColor: 'var(--amarelo)' }}>
        <div className="label" style={{ marginBottom: 10 }}>Filtros</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <input
            className="input"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="🔎 Buscar por nome..."
          />
          <select className="input" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
            <option value="">Todas categorias</option>
            {Object.entries(CATEGORIAS).map(([k, c]) => (
              <option key={k} value={k}>{c.emoji} {c.label}</option>
            ))}
          </select>
          <select className="input" value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}>
            <option value="">Todos grupos</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
          <select className="input" value={filtroPessoa} onChange={e => setFiltroPessoa(e.target.value)}>
            <option value="">Todas pessoas</option>
            {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12 }}>
          <div style={{ color: 'var(--branco-70)' }}>
            <strong style={{ color: 'var(--amarelo)' }}>{filtrados.length}</strong> de {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </div>
          {temFiltro && (
            <button className="btn btn-ghost" onClick={limparFiltros} style={{ fontSize: 10, padding: '4px 10px' }}>
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      {filtrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--branco-45)' }}>
          {posts.length === 0 ? 'Nenhum post aprovado ainda.' : 'Nenhum post bate com os filtros.'}
        </div>
      ) : (
        <div className="grid-cards">
          {filtrados.map(p => (
            <PostCard key={p.id} post={p}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 10, padding: '6px 10px' }}
                  onClick={() => liberarFoto(p)}
                  title="Remove só a foto, mantém post e pontos"
                >
                  📷 Liberar foto
                </button>
                <button
                  className="btn btn-danger"
                  style={{ fontSize: 10, padding: '6px 10px' }}
                  onClick={() => excluir(p)}
                  title="Remove tudo: post, foto e pontos"
                >
                  Excluir tudo
                </button>
              </div>
            </PostCard>
          ))}
        </div>
      )}
    </div>
  );
}
