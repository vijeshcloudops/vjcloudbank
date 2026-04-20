// src/pages/HistoryPage.jsx
import { useState, useEffect } from 'react';
import { accountsAPI, transactionsAPI } from '../api/apiClient';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

const typeLabel = (type) => ({
  DEPOSIT: 'Deposit', WITHDRAWAL: 'Withdrawal',
  TRANSFER_DEBIT: 'Transfer out', TRANSFER_CREDIT: 'Transfer in',
}[type] || type);

const typeColor = (type) =>
  type.includes('DEBIT') || type === 'WITHDRAWAL' ? '#e74c3c' : '#27ae60';

const typeBg = (type) =>
  type.includes('DEBIT') || type === 'WITHDRAWAL' ? '#fce4e4' : '#e8f5e9';

const typeIcon = (type) => ({
  DEPOSIT: '+', WITHDRAWAL: '-', TRANSFER_DEBIT: '→', TRANSFER_CREDIT: '←',
}[type] || '•');

const s = {
  page:    { padding: '24px', maxWidth: '900px', margin: '0 auto' },
  topRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  title:   { fontSize: '20px', fontWeight: '600', color: '#1a1a2e' },
  select:  { padding: '8px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', background: '#fff', outline: 'none' },
  table:   { background: '#fff', borderRadius: '10px', border: '0.5px solid #e0e0e0', overflow: 'hidden' },
  thead:   { background: '#f8f8f8', borderBottom: '0.5px solid #e8e8e8' },
  th:      { padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#888', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr:      { borderBottom: '0.5px solid #f5f5f5', transition: 'background 0.1s' },
  td:      { padding: '14px 16px', fontSize: '14px', color: '#333', verticalAlign: 'middle' },
  icon:    (type) => ({ width: '32px', height: '32px', borderRadius: '50%', background: typeBg(type), color: typeColor(type), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', marginRight: '10px', flexShrink: 0 }),
  badge:   (status) => ({ display: 'inline-block', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', background: status === 'COMPLETED' ? '#e8f5e9' : '#fce4e4', color: status === 'COMPLETED' ? '#27ae60' : '#e74c3c' }),
  loading: { padding: '60px', textAlign: 'center', color: '#888' },
  empty:   { padding: '60px', textAlign: 'center', color: '#aaa', fontSize: '15px' },
  pagination:{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' },
  pageBtn: (active) => ({ padding: '7px 14px', border: '0.5px solid #ddd', borderRadius: '6px', background: active ? '#1a1a2e' : '#fff', color: active ? '#fff' : '#555', cursor: 'pointer', fontSize: '13px' }),
};

export default function HistoryPage() {
  const [accounts, setAccounts]     = useState([]);
  const [selectedAcc, setSelected]  = useState('');
  const [transactions, setTx]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [page, setPage]             = useState(0);

  useEffect(() => {
    accountsAPI.list().then(res => {
      const accs = res.data.data || [];
      setAccounts(accs);
      if (accs.length > 0) setSelected(accs[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedAcc) return;
    setLoading(true);
    transactionsAPI.history(selectedAcc, page, 10)
      .then(res => setTx(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAcc, page]);

  return (
    <div style={s.page}>
      <div style={s.topRow}>
        <div style={s.title}>Transaction history</div>
        <select style={s.select} value={selectedAcc} onChange={e => { setSelected(e.target.value); setPage(0); }}>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.account_type} — {acc.account_number}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={s.loading}>Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div style={s.empty}>No transactions found for this account.</div>
      ) : (
        <>
          <div style={s.table}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={s.thead}>
                <tr>
                  {['Type', 'Description', 'Amount', 'Balance after', 'Status', 'Date'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} style={s.tr}>
                    <td style={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={s.icon(tx.type)}>{typeIcon(tx.type)}</div>
                        <span>{typeLabel(tx.type)}</span>
                      </div>
                    </td>
                    <td style={s.td}>{tx.description || '—'}</td>
                    <td style={{ ...s.td, color: typeColor(tx.type), fontWeight: '600' }}>
                      {tx.type.includes('DEBIT') || tx.type === 'WITHDRAWAL' ? '-' : '+'}{fmt(tx.amount)}
                    </td>
                    <td style={s.td}>{fmt(tx.balanceAfter)}</td>
                    <td style={s.td}><span style={s.badge(tx.status)}>{tx.status}</span></td>
                    <td style={{ ...s.td, color: '#888', fontSize: '13px' }}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={s.pagination}>
            <button style={s.pageBtn(false)} onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}>← Prev</button>
            <button style={s.pageBtn(true)}>{page + 1}</button>
            <button style={s.pageBtn(false)} onClick={() => setPage(p => p+1)} disabled={transactions.length < 10}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}
