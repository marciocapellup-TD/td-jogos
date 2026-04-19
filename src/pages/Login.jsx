import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { session, signIn, loading, dominioBloqueado, limparDominioBloqueado } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate('/', { replace: true });
  }, [session, loading, navigate]);

  const handleSignIn = () => {
    if (dominioBloqueado) limparDominioBloqueado();
    signIn();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, #011F36 0%, #0f1e2d 100%),
        linear-gradient(rgba(244,204,4,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(244,204,4,0.05) 1px, transparent 1px)`,
      backgroundSize: '100%, 40px 40px, 40px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        maxWidth: 460,
        width: '100%',
        background: 'var(--azul-card)',
        borderTop: '3px solid var(--amarelo)',
        borderRadius: 4,
        padding: '44px 36px 32px',
        textAlign: 'center',
        boxShadow: '0 18px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Logo TD estilizado */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            width: 72, height: 72, margin: '0 auto',
            background: 'linear-gradient(135deg, #F4CC04 0%, #FFD93A 100%)',
            color: 'var(--azul)',
            fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 30,
            letterSpacing: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8,
            position: 'relative',
            boxShadow: '0 6px 20px rgba(244,204,4,0.3)',
          }}>
            TD
            <div style={{
              position: 'absolute',
              top: -2, left: -2, right: -2,
              height: 3, background: 'var(--amarelo)',
              borderRadius: '8px 8px 0 0',
            }} />
          </div>
        </div>

        <div className="label" style={{ letterSpacing: 4 }}>Tributo Devido</div>
        <h1 style={{ marginTop: 8, marginBottom: 6, fontSize: 26 }}>Jogos Internos</h1>
        <div style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 10, fontWeight: 600, letterSpacing: 3,
          color: 'var(--amarelo)', textTransform: 'uppercase',
          marginBottom: 22,
        }}>
          Edição 1 · Dr. Fabrício Assini
        </div>

        <p style={{ color: 'var(--branco-70)', fontSize: 13, marginBottom: 24, lineHeight: 1.65 }}>
          Desafio de 3 semanas — <strong style={{ color: 'var(--amarelo)' }}>energia</strong>, <strong style={{ color: 'var(--amarelo)' }}>movimento</strong> e <strong style={{ color: 'var(--amarelo)' }}>controle mental</strong>.<br />
          Entre com seu e-mail <strong style={{ color: '#fff' }}>@tributodevido.com.br</strong>.
        </p>

        {dominioBloqueado && (
          <div style={{
            background: 'rgba(192,57,43,0.15)',
            border: '1px solid rgba(192,57,43,0.4)',
            borderLeft: '3px solid var(--vermelho)',
            padding: '10px 14px',
            borderRadius: 3,
            marginBottom: 16,
            fontSize: 12,
            textAlign: 'left',
          }}>
            Acesso restrito a e-mails <strong>@tributodevido.com.br</strong>. Você foi desconectado — tente de novo com sua conta corporativa.
          </div>
        )}

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSignIn}>
          Entrar com Google
        </button>

        <div style={{
          marginTop: 26,
          paddingTop: 18,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: 10, color: 'var(--branco-45)', letterSpacing: 1.5,
          fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, textTransform: 'uppercase',
        }}>
          20/04 a 10/05 · 5 grupos · 26 participantes
        </div>
      </div>
    </div>
  );
}
