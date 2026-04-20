// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const styles = {
  nav: {
    background: '#1a1a2e',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '56px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: { color: '#fff', fontSize: '20px', fontWeight: '600', textDecoration: 'none', letterSpacing: '1px' },
  links: { display: 'flex', gap: '4px' },
  link: (active) => ({
    color: active ? '#fff' : '#aaa',
    textDecoration: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '14px',
    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
  }),
  right: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: '#534AB7', color: '#fff', fontSize: '13px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '500',
  },
  logoutBtn: {
    background: 'transparent', border: '0.5px solid rgba(255,255,255,0.3)',
    color: '#aaa', padding: '5px 12px', borderRadius: '6px',
    fontSize: '13px', cursor: 'pointer',
  },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/accounts',  label: 'Accounts'  },
    { to: '/transfer',  label: 'Transfer'  },
    { to: '/history',   label: 'History'   },
  ];

  return (
    <nav style={styles.nav}>
      <Link to="/dashboard" style={styles.logo}>VjCloudBank</Link>
      <div style={styles.links}>
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            style={styles.link(location.pathname === link.to)}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div style={styles.right}>
        <span style={{ color: '#aaa', fontSize: '13px' }}>{user?.full_name}</span>
        <div style={styles.avatar}>{initials}</div>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
