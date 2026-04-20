// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f7' },
  card: { background: '#fff', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '400px', border: '0.5px solid #e0e0e0' },
  logo: { textAlign: 'center', marginBottom: '28px' },
  logoText: { fontSize: '28px', fontWeight: '700', color: '#1a1a2e', letterSpacing: '2px' },
  logoSub: { fontSize: '13px', color: '#888', marginTop: '4px' },
  label: { display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px', fontWeight: '500' },
  input: { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', marginTop: '8px' },
  error: { background: '#fce4e4', color: '#c0392b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' },
  footer: { textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#888' },
  link: { color: '#534AB7', textDecoration: 'none', fontWeight: '500' },
};

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoText}>VjCloudBank</div>
          <div style={s.logoSub}>Secure Digital Banking</div>
        </div>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email address</label>
          <input style={s.input} type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div style={s.footer}>
          Don't have an account? <Link to="/register" style={s.link}>Create one</Link>
        </div>
      </div>
    </div>
  );
}
