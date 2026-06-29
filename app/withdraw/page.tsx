'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface WithdrawalRecord {
  id: string;
  amount: number;
  status: string;
  adminNote: string | null;
  bankName: string;
  accountNumber: string;
  createdAt: string;
}

export default function WithdrawPage() {
  const [balance, setBalance] = useState(0);
  const [threshold, setThreshold] = useState(10000);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMsg, setBankMsg] = useState('');
  const [editingBank, setEditingBank] = useState(false);

  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => { if (d.balance !== undefined) setBalance(d.balance); });
    fetch('/api/bank-account').then(r => r.json()).then(d => { if (d.account) setBankAccount(d.account); });
    fetch('/api/withdrawals').then(r => r.json()).then(d => setWithdrawals(d.withdrawals ?? []));
    fetch('/api/admin/settings').then(r => r.json()).then(d => { if (d.threshold) setThreshold(d.threshold); }).catch(() => {});
  }, []);

  async function saveBankAccount() {
    if (!bankName || !accountNumber || !accountName) { setBankMsg('All fields required'); return; }
    setBankSaving(true);
    setBankMsg('');
    const res = await fetch('/api/bank-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankName, accountNumber, accountName }),
    });
    const data = await res.json();
    if (res.ok) {
      setBankAccount({ id: data.id, bankName, accountNumber, accountName });
      setBankMsg('Bank account saved!');
      setEditingBank(false);
    } else {
      setBankMsg(data.error ?? 'Failed to save');
    }
    setBankSaving(false);
  }

  async function submitWithdrawal() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setWithdrawMsg('Enter a valid amount'); return; }
    setWithdrawing(true);
    setWithdrawMsg('');
    const res = await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.floor(amt) }),
    });
    const data = await res.json();
    if (res.ok) {
      setWithdrawSuccess(true);
      setBalance(b => b - Math.floor(amt));
      fetch('/api/withdrawals').then(r => r.json()).then(d => setWithdrawals(d.withdrawals ?? []));
      setAmount('');
    } else {
      setWithdrawMsg(data.error ?? 'Failed to submit');
    }
    setWithdrawing(false);
  }

  const canWithdraw = balance >= threshold;
  const showBankForm = !bankAccount || editingBank;

  const statusColor = (s: string) =>
    s === 'approved' ? 'text-green-400' : s === 'rejected' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="min-h-screen bg-black pb-28 md:pb-10 md:pt-14">
      <div className="max-w-lg md:max-w-2xl mx-auto px-5 md:px-8">
        <div className="flex items-center gap-3 pt-12 pb-6">
          <Link
            href="/dashboard"
            className="w-8 h-8 bg-[#111] rounded-full flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-white font-black text-xl">Withdraw</h1>
        </div>

        {/* Balance */}
        <div className="bg-[#111111] rounded-2xl p-6 mb-4">
          <p className="text-white/40 text-xs tracking-wider mb-1">Available balance</p>
          <p className="text-yellow-400 font-mono font-black text-4xl">${balance.toLocaleString()}</p>
          {canWithdraw ? (
            <p className="text-green-400 text-xs mt-2 font-medium">✓ Eligible for withdrawal</p>
          ) : (
            <p className="text-white/30 text-xs mt-3">
              Minimum balance to withdraw:{' '}
              <span className="text-yellow-400 font-mono">${threshold.toLocaleString()}</span>
            </p>
          )}
        </div>

        {/* Bank Account */}
        <div className="bg-[#111111] rounded-2xl p-5 mb-4">
          <p className="text-white font-bold text-sm mb-4">
            {bankAccount && !showBankForm ? '✓ Bank Account' : 'Bank Account'}
          </p>
          {bankAccount && !showBankForm ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-white/40 text-xs">Bank</span>
                <span className="text-white text-xs font-medium">{bankAccount.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40 text-xs">Account</span>
                <span className="text-white text-xs font-mono">{bankAccount.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40 text-xs">Name</span>
                <span className="text-white text-xs">{bankAccount.accountName}</span>
              </div>
              <button
                onClick={() => {
                  setBankName(bankAccount.bankName);
                  setAccountNumber(bankAccount.accountNumber);
                  setAccountName(bankAccount.accountName);
                  setEditingBank(true);
                }}
                className="mt-3 text-white/30 text-xs hover:text-white/60"
              >
                Edit account →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Bank Name', value: bankName, set: setBankName, ph: 'e.g. GTBank' },
                { label: 'Account Number', value: accountNumber, set: setAccountNumber, ph: 'e.g. 0123456789' },
                { label: 'Account Name', value: accountName, set: setAccountName, ph: 'e.g. John Doe' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">{f.label}</label>
                  <input
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.ph}
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-white/20"
                  />
                </div>
              ))}
              {bankMsg && (
                <p className={`text-xs ${bankMsg.includes('saved') ? 'text-green-400' : 'text-red-400'}`}>
                  {bankMsg}
                </p>
              )}
              <button
                onClick={saveBankAccount}
                disabled={bankSaving}
                className="w-full bg-white text-black font-bold py-3 rounded-full text-sm disabled:opacity-50"
              >
                {bankSaving ? 'Saving...' : 'Save Bank Account'}
              </button>
            </div>
          )}
        </div>

        {/* Withdrawal Form */}
        {bankAccount && !showBankForm && canWithdraw && (
          <div className="bg-[#111111] rounded-2xl p-5 mb-4">
            <p className="text-white font-bold text-sm mb-4">Request Withdrawal</p>
            {withdrawSuccess ? (
              <div className="text-center py-4">
                <p className="text-green-400 font-bold text-lg">Request Submitted!</p>
                <p className="text-white/30 text-xs mt-2 leading-relaxed">
                  Your withdrawal is pending admin approval.
                </p>
                <button
                  onClick={() => setWithdrawSuccess(false)}
                  className="mt-4 text-white/40 text-xs hover:text-white/60"
                >
                  Submit another →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">Amount ($)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    max={balance}
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-mono text-lg focus:outline-none focus:border-white/20"
                  />
                </div>
                {withdrawMsg && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    {withdrawMsg}
                  </p>
                )}
                <button
                  onClick={submitWithdrawal}
                  disabled={withdrawing || !amount}
                  className="w-full bg-white text-black font-bold py-4 rounded-full text-sm disabled:opacity-40"
                >
                  {withdrawing ? 'Submitting...' : 'Request Withdrawal'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Threshold Notice */}
        {!canWithdraw && (
          <div className="bg-[#111111] rounded-2xl p-5 mb-4 border border-yellow-400/10">
            <p className="text-yellow-400 font-bold text-sm mb-2">Withdrawal Locked</p>
            <p className="text-white/30 text-xs leading-relaxed">
              Your balance must reach{' '}
              <span className="text-yellow-400 font-mono font-bold">${threshold.toLocaleString()}</span> before
              you can request a withdrawal. Keep playing to increase your balance!
            </p>
            <Link
              href="/games/mines"
              className="mt-4 block text-center bg-white text-black font-bold py-3 rounded-full text-sm"
            >
              Play Mines →
            </Link>
          </div>
        )}

        {/* Withdrawal History */}
        {withdrawals.length > 0 && (
          <div className="bg-[#111111] rounded-2xl p-5">
            <p className="text-white font-bold text-sm mb-4">Withdrawal History</p>
            <div className="space-y-3">
              {withdrawals.map(w => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                  <div>
                    <p className="text-white font-mono font-bold text-sm">${w.amount.toLocaleString()}</p>
                    <p className="text-white/30 text-xs">
                      {w.bankName} · {new Date(w.createdAt).toLocaleDateString()}
                    </p>
                    {w.adminNote && <p className="text-white/20 text-xs italic">{w.adminNote}</p>}
                  </div>
                  <span className={`text-xs font-bold uppercase ${statusColor(w.status)}`}>{w.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
