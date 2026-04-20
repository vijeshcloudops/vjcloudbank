// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accountsAPI, transactionsAPI } from '../api/apiClient';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

const s = {
  page:    { padding: '24px', maxWidth: '1100px', margin: '0 auto' },
  greeting:{ fontSize: '22px', fontWeight: '600', color: '#1a1a2e', marginBottom: '4px' },
  sub:     { fontSize: '14px', color: '#888', marginBottom: '24px' },
  statsRow:{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' },
  stat:    { background: '#fff', borderRadius: '10px', padding: '18px', border: '0.5px solid #e0e0e0' },
  statLbl: { fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  statVal: { fontSize: '24px', fontWeight: '600', color: '#1a1a2e' },
  statSub: { fontSize: '12px', color: '#27ae60', marginTop: '4px' },
  row:     { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' },
  card:    { background: '#fff', borderRadius: '10px', padding: '20px', border: '0.5px solid #e0e0e0' },
  cardTitle:{ fontSize: '15px', fontWeight: '600', color: '#1a1a2e', marginBottom: '16px' },
  account: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid #f5f5f5' },
  acctType:{ fontSize: '14px', fontWeight: '500', color: '#333' },
  acctNum: { fontSize: '12px', color: '#999', marginTop: '2px' },
  acctBal: { fontSize: '16px', fontWeight: '600', color: '#1a1a2e' },
  actions: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginTop: '16px' },
  actBtn:  { background: '#f8f8f8', border: '0.5px solid #e8e8e8', borderRadius: '8px', padding: '10px 6px', textAlign: 'center', cursor: 'pointer', textDecoration: 'none', display: 'block' },
  actIcon: { fontSize: '18px', marginBottom: '4px' },
  actLbl:  { fontSize: '11px', color: '#555', display: 'block' },
  tx:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #f5f5f5' },
  txIcon:  (type) => ({
    width: '32px', height: '32px', borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0,
    background: type.includes('DEBIT') || type === 'WITHDRAWAL' ? '#fce4e4' : '#e8f5e9',
    color:      type.includes('DEBIT') || type === 'WITHDRAWAL' ? '#e74c3c' : '#27ae60',
    marginRight: '10px',
  }),
  txDesc:  { fontSize: '13px', fontWeight: '500', color: '#333' },
  txDate:  { fontSize: '11px', color: '#aaa' },
  txAmt:   (type) => ({
    fontSize: '14px', fontWeight: '600',
    color: type.includes('DEBIT') || type === 'WITHDRAWAL' ? '#e74c3c' : '#27ae60',
  }),
  loading: { textAlign: 'center', padding: '60px', color: '#888' },
};

const typeIcon = (type) => ({
  DEPOSIT: '+', WITHDRAWAL: '-', TRANSFER_DEBIT: '→', TRANSFER_CREDIT: '←',
}[type] || '•');

const typeLabel = (type) => ({
  DEPOSIT: 'Deposit', WITHDRAWAL: 'Withdrawal',
  TRANSFER_DEBIT: 'Transfer out', TRANSFER_CREDIT: 'Transfer in',
}[type] || type);

export default function DashboardPage() {
  const { user }                    = useAuth();
  const [accounts, setAccounts]     = useState([]);
  const [transactions, setTx]       = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const accRes = await accountsAPI.list();
        const accs = accRes.data.data || [];
        setAccounts(accs);
        // Load recent transactions from first account
        if (accs.length > 0) {
          const txRes = await transactionsAPI.history(accs[0].id, 0, 5);
          setTx(txRes.data.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div style={s.loading}>Loading your dashboard...</div>;

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);
  const credits = transactions.filter(t => t.type === 'DEPOSIT' || t.type === 'TRANSFER_CREDIT');
  const debits  = transactions.filter(t => t.type === 'WITHDRAWAL' || t.type === 'TRANSFER_DEBIT');
  const totalIn  = credits.reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalOut = debits.reduce((s, t) => s + parseFloat(t.amount), 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={s.page}>
      <div style={s.greeting}>{greeting}, {user?.full_name?.split(' ')[0]}!</div>
      <div style={s.sub}>Here's your financial overview</div>

      <div style={s.statsRow}>
        <div style={s.stat}>
          <div style={s.statLbl}>Total balance</div>
          <div style={s.statVal}>{fmt(totalBalance)}</div>
          <div style={s.statSub}>Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLbl}>Recent credits</div>
          <div style={{ ...s.statVal, color: '#27ae60' }}>{fmt(totalIn)}</div>
          <div style={s.statSub}>{credits.length} transaction{credits.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLbl}>Recent debits</div>
          <div style={{ ...s.statVal, color: '#e74c3c' }}>{fmt(totalOut)}</div>
          <div style={{ ...s.statSub, color: '#e74c3c' }}>{debits.length} transaction{debits.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div style={s.row}>
        <div style={s.card}>
          <div style={s.cardTitle}>My accounts</div>
          {accounts.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: '14px', padding: '20px 0' }}>
              No accounts yet. <Link to="/accounts" style={{ color: '#534AB7' }}>Open one</Link>
            </div>
          ) : (
            accounts.map(acc => (
              <div key={acc.id} style={s.account}>
                <div>
                  <div style={s.acctType}>{acc.account_type?.charAt(0).toUpperCase() + acc.account_type?.slice(1)} account</div>
                  <div style={s.acctNum}>{acc.account_number?.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3')}</div>
                </div>
                <div style={s.acctBal}>{fmt(acc.balance)}</div>
              </div>
            ))
          )}
          <div style={s.actions}>
            {[
              { to: '/accounts', icon: '+', label: 'Deposit', bg: '#e8f5e9' },
              { to: '/accounts', icon: '-', label: 'Withdraw', bg: '#fce4e4' },
              { to: '/transfer', icon: '→', label: 'Transfer', bg: '#e3f2fd' },
              { to: '/history',  icon: '≡', label: 'History',  bg: '#fff3e0' },
            ].map(btn => (
              <Link key={btn.label} to={btn.to} style={s.actBtn}>
                <div style={{ ...s.actIcon, width: '28px', height: '28px', borderRadius: '50%', background: btn.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', fontSize: '16px' }}>{btn.icon}</div>
                <span style={s.actLbl}>{btn.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>Recent transactions</div>
          {transactions.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: '14px', padding: '20px 0' }}>No transactions yet.</div>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} style={s.tx}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={s.txIcon(tx.type)}>{typeIcon(tx.type)}</div>
                  <div>
                    <div style={s.txDesc}>{tx.description || typeLabel(tx.type)}</div>
                    <div style={s.txDate}>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN') : ''}</div>
                  </div>
                </div>
                <div style={s.txAmt(tx.type)}>
                  {tx.type.includes('DEBIT') || tx.type === 'WITHDRAWAL' ? '-' : '+'}{fmt(tx.amount)}
                </div>
              </div>
            ))
          )}
          {transactions.length > 0 && (
            <Link to="/history" style={{ display: 'block', textAlign: 'center', marginTop: '12px', fontSize: '13px', color: '#534AB7', textDecoration: 'none' }}>
              View all transactions →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
