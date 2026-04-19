import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { session, signIn, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate('/', { replace: true });
  }, [session, loading, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #011F36 0%, #0f1e2d 100%)',
      backgroundImage: `linear-gradient(135deg, #011F36 0%, #0f1e2d 100%),
        linear-gradient(rgba(244,204,4,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(244,204,4,0.05) 1px, transparent 1px)`,
      backgroundSize: '100%, 40px 40px, 40px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        maxWidth: 440,
        width: '100%',
        background: 'var(--azul-card)',
        borderTop: '3px solid var(--amarelo)',
        borderRadius: 4,
        padding: '40px 32px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, margin: '0 auto 16px',
          background: 'var(--amarelo)', color: 'var(--azul)',
          fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 6,
        }}>TD</div>

        <div className="label">Tributo Devido</div>
        <h1 style={{ marginTop: 6, marginBottom: 24 }}>Jogos Internos</h1>

        <p style={{ color: 'var(--branco-70)', fontSize: 13, marginBottom: 26, lineHeight: 1.6 }}>
          Desafio de 3 semanas — energia, movimento e controle mental.<br />
          Entre com seu e-mail <strong style={{ color: 'var(--amarelo)' }}>@tributodevido.com.br</strong>.
        </p>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={signIn}>
          Entrar com Google
        </button>

        <div style={{ marginTop: 20, fontSize: 10, color: 'var(--branco-45)', letterSpacing: 1 }}>
          20/04 a 10/05 · 5 grupos
        </div>
      </div>
    </div>
  );
}
