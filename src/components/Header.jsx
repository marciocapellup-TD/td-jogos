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
          <img src="/logo-td.jpg" alt="Tributo Devido" className="td-logo-img" />
          <div className="td-brand-text">
            <h2>Jogos Internos</h2>
          </div>
        </div>
        <nav className="td-nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/meus-posts">Meus posts</NavLink>
          <NavLink to="/regras">Regras</NavLink>
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="td-user">
          <div className="td-user-info">
            <span className="td-user-name">{profile?.nome_exibicao}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sair</button>
        </div>
      </div>
    </header>
  );
}
