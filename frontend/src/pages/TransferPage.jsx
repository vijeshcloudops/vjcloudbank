// src/pages/TransferPage.jsx
import { useState, useEffect } from 'react';
import { accountsAPI, transactionsAPI } from '../api/apiClient';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

const s = {
  page:    { padding: '24px', maxWidth: '600px', margin: '0 auto' },
  title:   { fontSize: '20px', fontWeight: '600', color: '#1a1a2e', marginBottom: '24px' },
  card:    { background: '#fff', borderRadius: '10px', padding: '28px', border: '0.5px solid #e0e0e0' },
  label:   { display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px', fontWeight: '500' },
  input:   { width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', marginBottom: '18px', boxSizing: 'border-box', outline: 'none' },
  select:  { width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', marginBottom: '18px', background: '#fff', outline: 'none' },
  btn:     { width: '100%', padding: '13px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' },
  msg:     (ok) => ({ padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', background: ok ? '#e8f5e9' : '#fce4e4', color: ok ? '#27ae60' : '#c0392b' }),
  receipt: { background: '#f8f8f8', borderRadius: '10px', padding: '20px', marginTop: '20px', border: '0.5px solid #e0e0e0' },
  recTitle:{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e', marginBottom: '12px' },
  recRow:  { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid #eee', fontSize: '13px' },
  recLbl:  { color: '#888' },
  recVal:  { fontWeight: '500', color: '#333' },
};

export default function TransferPage() {
  const [accounts, setAccounts]   = useState([]);
  const [form, setForm]           = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState(null);
  const [receipt, setReceipt]     = useState(null);

  useEffect(() => {
    accountsAPI.list().then(res => {
      const accs = res.data.data || [];
      setAccounts(accs);
      if (accs.length > 0) setForm(f => ({ ...f, fromAccountId: accs[0].id }));
    });
  }, []);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (form.fromAccountId === form.toAccountId) {
      setMsg({ ok: false, text: 'Source and destination accounts cannot be the same.' });
      return;
    }
    setLoading(true); setMsg(null); setReceipt(null);
    try {
      const res = await transactionsAPI.transfer({
        fromAccountId: form.fromAccountId,
        toAccountId:   form.toAccountId,
        amount:        parseFloat(form.amount),
        description:   form.description,
      });
      const txs = res.data.data;
      const debit = txs.find(t => t.type === 'TRANSFER_DEBIT');
      setReceipt(debit);
      setMsg({ ok: true, text: `Transfer of ${fmt(form.amount)} completed successfully!` });
      setForm(f => ({ ...f, amount: '', description: '' }));
      // Reload accounts to show updated balances
      const accRes = await accountsAPI.list();
      setAccounts(accRes.data.data || []);
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Transfer failed.' });
    } finally {
      setLoading(false);
    }
  };

  const fromAccount = accounts.find(a => a.id === form.fromAccountId);

  return (
    <div style={s.page}>
      <div style={s.title}>Transfer money</div>
      <div style={s.card}>
        {msg && <div style={s.msg(msg.ok)}>{msg.text}</div>}
        <form onSubmit={handleTransfer}>
          <label style={s.label}>From account</label>
          <select style={s.select} value={form.fromAccountId} onChange={e => setForm({...form, fromAccountId: e.target.value})}>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.account_type} — {acc.account_number} ({fmt(acc.balance)})
              </option>
            ))}
          </select>

          <label style={s.label}>To account (destination)</label>
          <select style={s.select} value={form.toAccountId} onChange={e => setForm({...form, toAccountId: e.target.value})} required>
            <option value="">-- Select destination account --</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.account_type} — {acc.account_number} ({fmt(acc.balance)})
              </option>
            ))}
          </select>

          <label style={s.label}>Amount (INR)</label>
          <input style={s.input} type="number" placeholder="0.00" min="0.01" step="0.01"
            value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />

          {fromAccount && form.amount && (
            <div style={{ fontSize: '12px', color: '#888', marginTop: '-14px', marginBottom: '16px' }}>
              Available: {fmt(fromAccount.balance)}
              {parseFloat(form.amount) > parseFloat(fromAccount.balance) &&
                <span style={{ color: '#e74c3c', marginLeft: '8px' }}>Insufficient funds!</span>
              }
            </div>
          )}

          <label style={s.label}>Description (optional)</label>
          <input style={s.input} type="text" placeholder="e.g. Rent payment"
            value={form.description} onChange={e => setForm({...form, description: e.target.value})} />

          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Transfer now'}
          </button>
        </form>

        {receipt && (
          <div style={s.receipt}>
            <div style={s.recTitle}>Transfer receipt</div>
            {[
              ['Reference ID', receipt.referenceId],
              ['Amount',       fmt(receipt.amount)],
              ['Balance after',fmt(receipt.balanceAfter)],
              ['Status',       receipt.status],
            ].map(([l, v]) => (
              <div key={l} style={s.recRow}>
                <span style={s.recLbl}>{l}</span>
                <span style={s.recVal}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
