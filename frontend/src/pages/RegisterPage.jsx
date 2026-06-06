// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f7' },
  card: { background: '#fff', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '420px', border: '0.5px solid #e0e0e0' },
  logo: { textAlign: 'center', marginBottom: '24px' },
  logoText: { fontSize: '26px', fontWeight: '700', color: '#1a1a2e', letterSpacing: '2px' },
  logoSub: { fontSize: '13px', color: '#888', marginTop: '4px' },
  label: { display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px', fontWeight: '500' },
  input: { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', outline: 'none', marginBottom: '14px', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', marginTop: '8px' },
  error: { background: '#fce4e4', color: '#c0392b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' },
  success: { background: '#e8f5e9', color: '#27ae60', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' },
  footer: { textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#888' },
  link: { color: '#534AB7', textDecoration: 'none', fontWeight: '500' },
  hint: { fontSize: '11px', color: '#aaa', marginTop: '-10px', marginBottom: '14px' },
};

export default function RegisterPage() {
  const [form, setForm]       = useState({ full_name: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register }          = useAuth();
  const navigate              = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await register(form);
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      // Surface the actual backend error instead of a generic message
      const resp = err.response?.data;
      let msg = 'Registration failed.';

      if (resp?.errors && Array.isArray(resp.errors) && resp.errors.length > 0) {
        // express-validator errors: array of { msg, path, ... }
        msg = resp.errors.map(e => e.msg).join(' ');
      } else if (resp?.message) {
        msg = resp.message;
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoText}>VjCloudBank</div>
          <div style={s.logoSub}>Create your account</div>
        </div>

        {error   && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Full name</label>
          <input style={s.input} name="full_name" value={form.full_name} onChange={handleChange} required />

          <label style={s.label}>Email address</label>
          <input style={s.input} type="email" name="email" value={form.email} onChange={handleChange} required />

          <label style={s.label}>Password</label>
          <input style={s.input} type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} />
          <div style={s.hint}>Min 8 chars, must include 1 uppercase letter and 1 number. e.g. SecurePass1</div>

          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div style={s.footer}>
          Already have an account? <Link to="/login" style={s.link}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
