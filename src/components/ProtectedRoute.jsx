import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children, admin = false }) {
  const { session, profile, loading, isAdmin } = useAuth();
  if (loading) return <div style={{ padding: 40, color: '#F4CC04', fontFamily: 'Rajdhani', letterSpacing: 2 }}>CARREGANDO...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  if (session && !profile) return <div style={{ padding: 40, color: '#F4CC04', fontFamily: 'Rajdhani', letterSpacing: 2 }}>VINCULANDO PERFIL...</div>;
  return children;
}
