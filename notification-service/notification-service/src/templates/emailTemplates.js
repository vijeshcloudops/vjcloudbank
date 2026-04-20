// src/templates/emailTemplates.js
//
// All email templates live here.
// Each template is a function that takes data and returns
// an object with subject and HTML body.
//
// The HTML is intentionally simple — plain tables work
// best across all email clients (Gmail, Outlook etc.)

const baseStyle = `
  font-family: Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  background: #f9f9f9;
  padding: 20px;
`;

const cardStyle = `
  background: #ffffff;
  border-radius: 8px;
  padding: 30px;
  margin: 20px 0;
  border: 1px solid #e0e0e0;
`;

const headerStyle = `
  background: #1a1a2e;
  color: #ffffff;
  padding: 20px 30px;
  border-radius: 8px 8px 0 0;
  text-align: center;
`;

const footerStyle = `
  text-align: center;
  color: #999;
  font-size: 12px;
  margin-top: 20px;
`;

const formatCurrency = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

// ── Welcome Email ─────────────────────────────────────────────────
const welcomeEmail = ({ fullName, email }) => ({
  subject: 'Welcome to VjCloudBank! Your account is ready',
  html: `
    <div style="${baseStyle}">
      <div style="${headerStyle}">
        <h1 style="margin:0; font-size:24px;">Welcome to VjCloudBank</h1>
      </div>
      <div style="${cardStyle}">
        <h2 style="color:#1a1a2e;">Hello, ${fullName}!</h2>
        <p style="color:#555; line-height:1.6;">
          Your VjCloudBank account has been successfully created.
          You can now open bank accounts, deposit funds, and transfer money securely.
        </p>
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          <tr>
            <td style="padding:8px; color:#999;">Registered Email</td>
            <td style="padding:8px; font-weight:bold; color:#333;">${email}</td>
          </tr>
          <tr style="background:#f5f5f5;">
            <td style="padding:8px; color:#999;">Account Status</td>
            <td style="padding:8px; color:#27ae60; font-weight:bold;">Active</td>
          </tr>
        </table>
        <p style="color:#555;">If you did not create this account, please contact us immediately.</p>
      </div>
      <div style="${footerStyle}">
        <p>VjCloudBank — Secure Digital Banking</p>
        <p>This is an automated message. Please do not reply.</p>
      </div>
    </div>
  `,
});

// ── Transaction Alert ─────────────────────────────────────────────
const transactionAlert = ({ fullName, type, amount, currency, balanceAfter, accountNumber, description, date }) => {
  const isCredit = type === 'DEPOSIT' || type === 'TRANSFER_CREDIT';
  const typeLabel = {
    DEPOSIT: 'Money Deposited',
    WITHDRAWAL: 'Money Withdrawn',
    TRANSFER_DEBIT: 'Money Transferred Out',
    TRANSFER_CREDIT: 'Money Received',
  }[type] || type;

  const amountColor = isCredit ? '#27ae60' : '#e74c3c';
  const amountPrefix = isCredit ? '+' : '-';

  return {
    subject: `VjCloudBank Alert: ${typeLabel} of ${formatCurrency(amount, currency)}`,
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="margin:0; font-size:22px;">Transaction Alert</h1>
        </div>
        <div style="${cardStyle}">
          <h2 style="color:#1a1a2e;">Hello, ${fullName}</h2>
          <p style="color:#555;">A transaction has been processed on your account.</p>

          <div style="background:#f8f8f8; border-radius:6px; padding:20px; margin:20px 0; text-align:center;">
            <p style="margin:0; color:#999; font-size:14px;">${typeLabel}</p>
            <p style="margin:8px 0; font-size:32px; font-weight:bold; color:${amountColor};">
              ${amountPrefix}${formatCurrency(amount, currency)}
            </p>
          </div>

          <table style="width:100%; border-collapse:collapse;">
            <tr>
              <td style="padding:10px 8px; border-bottom:1px solid #eee; color:#999;">Account Number</td>
              <td style="padding:10px 8px; border-bottom:1px solid #eee; font-weight:bold;">${accountNumber}</td>
            </tr>
            <tr>
              <td style="padding:10px 8px; border-bottom:1px solid #eee; color:#999;">Available Balance</td>
              <td style="padding:10px 8px; border-bottom:1px solid #eee; font-weight:bold; color:#1a1a2e;">
                ${formatCurrency(balanceAfter, currency)}
              </td>
            </tr>
            <tr>
              <td style="padding:10px 8px; border-bottom:1px solid #eee; color:#999;">Description</td>
              <td style="padding:10px 8px; border-bottom:1px solid #eee;">${description || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding:10px 8px; color:#999;">Date & Time</td>
              <td style="padding:10px 8px;">${date || new Date().toLocaleString('en-IN')}</td>
            </tr>
          </table>

          <p style="color:#e74c3c; font-size:13px; margin-top:20px;">
            If you did not authorize this transaction, contact us immediately.
          </p>
        </div>
        <div style="${footerStyle}">
          <p>VjCloudBank — Secure Digital Banking</p>
        </div>
      </div>
    `,
  };
};

// ── Account Opened ────────────────────────────────────────────────
const accountOpenedEmail = ({ fullName, accountNumber, accountType, currency }) => ({
  subject: `VjCloudBank: Your ${accountType} account is now open`,
  html: `
    <div style="${baseStyle}">
      <div style="${headerStyle}">
        <h1 style="margin:0; font-size:22px;">Account Opened Successfully</h1>
      </div>
      <div style="${cardStyle}">
        <h2 style="color:#1a1a2e;">Hello, ${fullName}!</h2>
        <p style="color:#555;">Your new bank account is ready to use.</p>
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          <tr>
            <td style="padding:10px 8px; border-bottom:1px solid #eee; color:#999;">Account Number</td>
            <td style="padding:10px 8px; border-bottom:1px solid #eee; font-weight:bold; font-size:18px;">${accountNumber}</td>
          </tr>
          <tr>
            <td style="padding:10px 8px; border-bottom:1px solid #eee; color:#999;">Account Type</td>
            <td style="padding:10px 8px; border-bottom:1px solid #eee; text-transform:capitalize;">${accountType}</td>
          </tr>
          <tr>
            <td style="padding:10px 8px; color:#999;">Currency</td>
            <td style="padding:10px 8px;">${currency}</td>
          </tr>
        </table>
      </div>
      <div style="${footerStyle}">
        <p>VjCloudBank — Secure Digital Banking</p>
      </div>
    </div>
  `,
});

// ── Low Balance Alert ─────────────────────────────────────────────
const lowBalanceAlert = ({ fullName, accountNumber, balance, currency, threshold }) => ({
  subject: `VjCloudBank Alert: Low balance on account ${accountNumber}`,
  html: `
    <div style="${baseStyle}">
      <div style="background:#e74c3c; color:#fff; padding:20px 30px; border-radius:8px 8px 0 0; text-align:center;">
        <h1 style="margin:0; font-size:22px;">Low Balance Alert</h1>
      </div>
      <div style="${cardStyle}">
        <h2 style="color:#e74c3c;">Attention, ${fullName}</h2>
        <p style="color:#555;">Your account balance has fallen below the minimum threshold.</p>
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          <tr>
            <td style="padding:10px 8px; border-bottom:1px solid #eee; color:#999;">Account Number</td>
            <td style="padding:10px 8px; border-bottom:1px solid #eee; font-weight:bold;">${accountNumber}</td>
          </tr>
          <tr>
            <td style="padding:10px 8px; border-bottom:1px solid #eee; color:#999;">Current Balance</td>
            <td style="padding:10px 8px; border-bottom:1px solid #eee; color:#e74c3c; font-weight:bold;">
              ${formatCurrency(balance, currency)}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 8px; color:#999;">Alert Threshold</td>
            <td style="padding:10px 8px;">${formatCurrency(threshold, currency)}</td>
          </tr>
        </table>
        <p style="color:#555;">Please deposit funds to avoid transaction failures.</p>
      </div>
      <div style="${footerStyle}">
        <p>VjCloudBank — Secure Digital Banking</p>
      </div>
    </div>
  `,
});

module.exports = {
  welcomeEmail,
  transactionAlert,
  accountOpenedEmail,
  lowBalanceAlert,
};
