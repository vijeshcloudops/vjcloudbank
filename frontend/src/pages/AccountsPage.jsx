// src/pages/AccountsPage.jsx
import { useState, useEffect } from 'react';
import { accountsAPI, transactionsAPI } from '../api/apiClient';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

const s = {
  page:    { padding: '24px', maxWidth: '900px', margin: '0 auto' },
  title:   { fontSize: '20px', fontWeight: '600', color: '#1a1a2e', marginBottom: '20px' },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' },
  card:    { background: '#fff', borderRadius: '10px', padding: '20px', border: '0.5px solid #e0e0e0' },
  acctHdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  acctType:{ fontSize: '16px', fontWeight: '600', color: '#1a1a2e', textTransform: 'capitalize' },
  acctNum: { fontSize: '12px', color: '#999', marginTop: '2px' },
  badge:   { background: '#e8f5e9', color: '#27ae60', fontSize: '11px', padding: '3px 8px', borderRadius: '20px' },
  bal:     { fontSize: '28px', fontWeight: '700', color: '#1a1a2e', margin: '12px 0' },
  btnRow:  { display: 'flex', gap: '8px', marginTop: '12px' },
  btn:     (color) => ({ flex: 1, padding: '9px', background: color, color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }),
  newCard: { background: '#fff', borderRadius: '10px', padding: '24px', border: '1px dashed #ccc', marginBottom: '24px' },
  newTitle:{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1a1a2e' },
  row:     { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' },
  field:   { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '160px' },
  label:   { fontSize: '12px', color: '#555', fontWeight: '500' },
  input:   { padding: '9px 12px', border: '1px solid #ddd', borderRadius: '7px', fontSize: '14px', outline: 'none' },
  select:  { padding: '9px 12px', border: '1px solid #ddd', borderRadius: '7px', fontSize: '14px', outline: 'none', background: '#fff' },
  createBtn:{ padding: '9px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' },
  modal:   { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  mCard:   { background: '#fff', borderRadius: '12px', padding: '28px', width: '360px' },
  mTitle:  { fontSize: '17px', fontWeight: '600', marginBottom: '16px', color: '#1a1a2e' },
  mInput:  { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', marginBottom: '14px', boxSizing: 'border-box' },
  mBtnRow: { display: 'flex', gap: '8px', marginTop: '8px' },
  mBtn:    (primary) => ({ flex: 1, padding: '10px', background: primary ? '#1a1a2e' : '#f0f0f0', color: primary ? '#fff' : '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }),
  msg:     (ok) => ({ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', background: ok ? '#e8f5e9' : '#fce4e4', color: ok ? '#27ae60' : '#c0392b' }),
};

export default function AccountsPage() {
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // { type: 'deposit'|'withdraw', accountId, accountNumber }
  const [amount, setAmount]       = useState('');
  const [desc, setDesc]           = useState('');
  const [msg, setMsg]             = useState(null);
  const [newAcct, setNewAcct]     = useState({ account_type: 'savings', currency: 'INR', initial_deposit: '' });

  const loadAccounts = async () => {
    try {
      const res = await accountsAPI.list();
      setAccounts(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAccounts(); }, []);

  const handleTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    try {
      if (modal.type === 'deposit') {
        await transactionsAPI.deposit({ accountId: modal.accountId, amount: parseFloat(amount), description: desc });
        setMsg({ ok: true, text: `Deposited ${fmt(amount)} successfully!` });
      } else {
        await transactionsAPI.withdraw({ accountId: modal.accountId, amount: parseFloat(amount), description: desc });
        setMsg({ ok: true, text: `Withdrawn ${fmt(amount)} successfully!` });
      }
      await loadAccounts();
      setAmount(''); setDesc(''); setModal(null);
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.message || 'Transaction failed.' });
    }
  };

  const handleCreate = async () => {
    try {
      await accountsAPI.create({ ...newAcct, initial_deposit: parseFloat(newAcct.initial_deposit) || 0 });
      setMsg({ ok: true, text: 'New account opened successfully!' });
      await loadAccounts();
      setNewAcct({ account_type: 'savings', currency: 'INR', initial_deposit: '' });
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.message || 'Failed to create account.' });
    }
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>Loading accounts...</div>;

  return (
    <div style={s.page}>
      <div style={s.title}>My Accounts</div>

      {msg && <div style={s.msg(msg.ok)}>{msg.text}</div>}

      <div style={s.grid}>
        {accounts.map(acc => (
          <div key={acc.id} style={s.card}>
            <div style={s.acctHdr}>
              <div>
                <div style={s.acctType}>{acc.account_type} account</div>
                <div style={s.acctNum}>{acc.account_number}</div>
              </div>
              <div style={s.badge}>{acc.status}</div>
            </div>
            <div style={s.bal}>{fmt(acc.balance)}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>{acc.currency} · {acc.description || 'No description'}</div>
            <div style={s.btnRow}>
              <button style={s.btn('#27ae60')} onClick={() => { setModal({ type: 'deposit', accountId: acc.id, accountNumber: acc.account_number }); setMsg(null); }}>+ Deposit</button>
              <button style={s.btn('#e74c3c')} onClick={() => { setModal({ type: 'withdraw', accountId: acc.id, accountNumber: acc.account_number }); setMsg(null); }}>- Withdraw</button>
            </div>
          </div>
        ))}
      </div>

      <div style={s.newCard}>
        <div style={s.newTitle}>Open a new account</div>
        <div style={s.row}>
          <div style={s.field}>
            <label style={s.label}>Account type</label>
            <select style={s.select} value={newAcct.account_type} onChange={e => setNewAcct({...newAcct, account_type: e.target.value})}>
              <option value="savings">Savings</option>
              <option value="current">Current</option>
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Currency</label>
            <select style={s.select} value={newAcct.currency} onChange={e => setNewAcct({...newAcct, currency: e.target.value})}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Opening deposit (optional)</label>
            <input style={s.input} type="number" placeholder="0.00" value={newAcct.initial_deposit}
              onChange={e => setNewAcct({...newAcct, initial_deposit: e.target.value})} />
          </div>
          <button style={s.createBtn} onClick={handleCreate}>Open account</button>
        </div>
      </div>

      {modal && (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.mCard} onClick={e => e.stopPropagation()}>
            <div style={s.mTitle}>{modal.type === 'deposit' ? 'Deposit money' : 'Withdraw money'}</div>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>Account: {modal.accountNumber}</div>
            <input style={s.mInput} type="number" placeholder="Amount (INR)" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
            <input style={s.mInput} type="text" placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
            <div style={s.mBtnRow}>
              <button style={s.mBtn(false)} onClick={() => setModal(null)}>Cancel</button>
              <button style={s.mBtn(true)} onClick={handleTransaction}>
                {modal.type === 'deposit' ? 'Deposit' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
