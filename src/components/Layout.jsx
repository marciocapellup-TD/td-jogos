import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <>
      <Header />
      <main className="container">
        <Outlet />
      </main>
      <footer style={{
        borderTop: '2px solid var(--amarelo)',
        background: 'var(--azul)',
        padding: '14px 20px',
        textAlign: 'center',
        color: 'var(--branco-45)',
        fontSize: 11,
        marginTop: 40,
      }}>
        Tributo Devido — Jogos Internos · 20/04 a 10/05/2026
      </footer>
    </>
  );
}
