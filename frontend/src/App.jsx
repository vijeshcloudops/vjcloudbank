// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar       from './components/Navbar';
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AccountsPage  from './pages/AccountsPage';
import TransferPage  from './pages/TransferPage';
import HistoryPage   from './pages/HistoryPage';

// Protected route — redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

// Layout with navbar for authenticated pages
const AppLayout = ({ children }) => (
  <>
    <Navbar />
    <main>{children}</main>
  </>
);

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/"         element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="/login"    element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/accounts"  element={<ProtectedRoute><AppLayout><AccountsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/transfer"  element={<ProtectedRoute><AppLayout><TransferPage /></AppLayout></ProtectedRoute>} />
      <Route path="/history"   element={<ProtectedRoute><AppLayout><HistoryPage /></AppLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
