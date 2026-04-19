import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './header.css';

export default function Header() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  return (
    <header className="td-header">
      <div className="td-header-inner container">
        <div className="td-brand">
          <div className="td-logo">TD</div>
          <div className="td-brand-text">
            <span className="label" style={{ color: '#F4CC04' }}>Tributo Devido</span>
            <h2>Jogos Internos</h2>
          </div>
        </div>
        <nav className="td-nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/meus-posts">Meus posts</NavLink>
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="td-user">
          <div className="td-user-info">
            <span className="td-user-name">{profile?.nome_exibicao}</span>
            {profile?.groups?.nome && (
              <span className="td-user-grupo" style={{ color: profile.groups.cor }}>
                {profile.groups.nome}
              </span>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sair</button>
        </div>
      </div>
    </header>
  );
}
