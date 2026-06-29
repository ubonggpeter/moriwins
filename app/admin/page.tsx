'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  balance: number;
  referralEarnings: number;
  totalGameWinnings: number;
  isAdmin: boolean;
  createdAt: string;
}

interface AdminWithdrawal {
  id: string;
  username: string;
  email: string;
  amount: number;
  status: string;
  adminNote: string | null;
  bankName: string;
  accountNumber: string;
  accountName: string;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'users' | 'withdrawals' | 'settings'>('users');
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [balanceEdit, setBalanceEdit] = useState<Record<string, string>>({});

  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [noteEdit, setNoteEdit] = useState<Record<string, string>>({});

  const [threshold, setThreshold] = useState('10000');
  const [depositInfo, setDepositInfo] = useState('[]');
  const [leaderboardMin, setLeaderboardMin] = useState('0');
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => {
        if (!d.isAdmin) { router.replace('/dashboard'); return; }
        setAuthorized(true);
        loadUsers();
        loadWithdrawals();
        loadSettings();
      })
      .catch(() => router.replace('/dashboard'));
  }, [router]);

  function loadUsers() {
    fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(d.users ?? [])).catch(() => {});
  }
  function loadWithdrawals() {
    fetch('/api/admin/withdrawals').then(r => r.json()).then(d => setWithdrawals(d.withdrawals ?? [])).catch(() => {});
  }
  function loadSettings() {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (d.threshold !== undefined) setThreshold(String(d.threshold));
      if (d.depositInfo !== undefined) setDepositInfo(JSON.stringify(d.depositInfo, null, 2));
      if (d.leaderboardMinEarnings !== undefined) setLeaderboardMin(String(d.leaderboardMinEarnings));
    }).catch(() => {});
  }

  async function adjustBalance(userId: string) {
    const val = parseFloat(balanceEdit[userId] ?? '');
    if (isNaN(val) || val < 0) return;
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance: val }),
    });
    loadUsers();
    setBalanceEdit(prev => { const n = { ...prev }; delete n[userId]; return n; });
  }

  async function processWithdrawal(id: string, action: 'approve' | 'reject') {
    const note = noteEdit[id] ?? '';
    await fetch(`/api/admin/withdrawals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, adminNote: note || null }),
    });
    loadWithdrawals();
  }

  async function saveSettings() {
    let parsed;
    try { parsed = JSON.parse(depositInfo || '[]'); } catch { alert('Invalid JSON in deposit info'); return; }
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threshold: parseInt(threshold, 10),
        depositInfo: parsed,
        leaderboardMinEarnings: parseInt(leaderboardMin, 10) || 0,
      }),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/30 text-sm">Loading...</p>
      </div>
    );
  }

  const TABS = [
    { key: 'users' as const, label: 'Users' },
    { key: 'withdrawals' as const, label: 'Withdrawals' },
    { key: 'settings' as const, label: 'Settings' },
  ];

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const totalBalance = users.reduce((s, u) => s + u.balance, 0);

  return (
    <div className="min-h-screen bg-black pb-28">
      <div className="max-w-[900px] mx-auto px-5">
        <div className="pt-10 pb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
            <span className="text-black text-sm font-black">A</span>
          </div>
          <div>
            <h1 className="text-white font-black text-xl">Admin Dashboard</h1>
            <p className="text-white/30 text-xs">MoriWins Control Panel</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#111111] rounded-2xl p-4 text-center">
            <p className="text-white font-black text-2xl">{users.length}</p>
            <p className="text-white/30 text-xs mt-1 uppercase tracking-wider">Users</p>
          </div>
          <div className="bg-[#111111] rounded-2xl p-4 text-center">
            <p className="text-yellow-400 font-black text-2xl">{pendingCount}</p>
            <p className="text-white/30 text-xs mt-1 uppercase tracking-wider">Pending</p>
          </div>
          <div className="bg-[#111111] rounded-2xl p-4 text-center">
            <p className="text-green-400 font-black text-lg">${totalBalance.toLocaleString()}</p>
            <p className="text-white/30 text-xs mt-1 uppercase tracking-wider">Total Bal</p>
          </div>
        </div>

        <div className="flex border-b border-white/[0.06] mb-6">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-bold tracking-wide transition-colors ${
                tab === t.key ? 'text-white border-b-2 border-white -mb-px' : 'text-white/30 hover:text-white/60'
              }`}
            >
              {t.label}
              {t.key === 'withdrawals' && pendingCount > 0 && (
                <span className="ml-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="space-y-3">
            {users.length === 0 && <p className="text-white/20 text-sm text-center py-8">No users yet</p>}
            {users.map(u => (
              <div key={u.id} className="bg-[#111111] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-[#1c1c1c] flex items-center justify-center text-white font-bold text-sm">
                        {u.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{u.username}</p>
                        <p className="text-white/30 text-xs">{u.email}</p>
                      </div>
                      {u.isAdmin && (
                        <span className="text-[9px] bg-yellow-400/15 text-yellow-400 px-2 py-0.5 rounded-full font-bold">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-wider">Balance</p>
                        <p className="text-yellow-400 font-mono font-bold text-sm">${u.balance.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-wider">Winnings</p>
                        <p className="text-green-400 font-mono text-sm">${u.totalGameWinnings.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-wider">Referrals</p>
                        <p className="text-blue-400 font-mono text-sm">${u.referralEarnings.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="New balance"
                      value={balanceEdit[u.id] ?? ''}
                      onChange={e => setBalanceEdit(prev => ({ ...prev, [u.id]: e.target.value }))}
                      className="bg-[#1c1c1c] text-white text-sm font-mono rounded-xl px-3 py-2 w-28 border border-white/[0.08] focus:outline-none focus:border-white/20"
                    />
                    <button
                      onClick={() => adjustBalance(u.id)}
                      disabled={!balanceEdit[u.id]}
                      className="bg-white text-black font-bold text-xs px-4 py-2 rounded-full disabled:opacity-30"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'withdrawals' && (
          <div className="space-y-3">
            {withdrawals.length === 0 && <p className="text-white/20 text-sm text-center py-8">No withdrawal requests</p>}
            {withdrawals.map(w => (
              <div
                key={w.id}
                className={`bg-[#111111] rounded-2xl p-5 border-l-4 ${
                  w.status === 'pending' ? 'border-yellow-500' : w.status === 'approved' ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-bold text-sm">{w.username}</p>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          w.status === 'pending'
                            ? 'bg-yellow-400/15 text-yellow-400'
                            : w.status === 'approved'
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {w.status}
                      </span>
                    </div>
                    <p className="text-yellow-400 font-mono font-black text-xl">${w.amount.toLocaleString()}</p>
                    <p className="text-white/30 text-xs mt-1">
                      {w.bankName} · {w.accountNumber} · {w.accountName}
                    </p>
                    {w.adminNote && <p className="text-white/40 text-xs mt-1 italic">Note: {w.adminNote}</p>}
                    <p className="text-white/20 text-xs mt-1">{new Date(w.createdAt).toLocaleString()}</p>
                  </div>
                  {w.status === 'pending' && (
                    <div className="flex flex-col gap-2">
                      <input
                        placeholder="Admin note (optional)"
                        value={noteEdit[w.id] ?? ''}
                        onChange={e => setNoteEdit(prev => ({ ...prev, [w.id]: e.target.value }))}
                        className="bg-[#1c1c1c] text-white text-xs rounded-xl px-3 py-2 border border-white/[0.08] focus:outline-none w-48"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => processWithdrawal(w.id, 'approve')}
                          className="flex-1 bg-green-500 text-black font-bold text-xs py-2 rounded-full"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => processWithdrawal(w.id, 'reject')}
                          className="flex-1 bg-red-500/80 text-white font-bold text-xs py-2 rounded-full"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div className="bg-[#111111] rounded-2xl p-6 space-y-6">
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">
                Withdrawal Threshold ($)
              </label>
              <input
                type="number"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-mono text-sm w-full focus:outline-none focus:border-white/20"
              />
              <p className="text-white/20 text-xs mt-1">
                Users must have at least this balance to request a withdrawal
              </p>
            </div>
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">
                Leaderboard Minimum Earnings ($)
              </label>
              <input
                type="number"
                min="0"
                value={leaderboardMin}
                onChange={e => setLeaderboardMin(e.target.value)}
                className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-mono text-sm w-full focus:outline-none focus:border-white/20"
              />
              <p className="text-white/20 text-xs mt-1">
                Only users with earnings at or above this amount appear on the leaderboard
              </p>
            </div>
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">
                Deposit Info (JSON)
              </label>
              <textarea
                value={depositInfo}
                onChange={e => setDepositInfo(e.target.value)}
                rows={6}
                placeholder='[{"method":"Bank Transfer","details":"Account: 1234567890"}]'
                className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-xs font-mono w-full focus:outline-none focus:border-white/20 resize-none"
              />
              <p className="text-white/20 text-xs mt-1">
                Array of payment method objects shown on the deposit page
              </p>
            </div>
            <button
              onClick={saveSettings}
              className={`w-full font-bold py-3.5 rounded-full text-sm transition-colors ${
                settingsSaved ? 'bg-green-500 text-black' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              {settingsSaved ? '✓ Saved!' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
