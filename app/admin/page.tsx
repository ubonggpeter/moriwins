'use client';
import { useEffect, useRef, useState } from 'react';
import { Gem, Layers, Brain, Pencil, Upload, Loader2, Check, FileText, Send, X } from 'lucide-react';
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
  const [tab, setTab] = useState<'users' | 'withdrawals' | 'settings' | 'games' | 'send'>('users');
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [balanceEdit, setBalanceEdit] = useState<Record<string, string>>({});

  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [noteEdit, setNoteEdit] = useState<Record<string, string>>({});

  const [threshold, setThreshold] = useState('10000');
  const [depositInfo, setDepositInfo] = useState('[]');
  const [leaderboardMin, setLeaderboardMin] = useState('0');
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [gameMuted, setGameMuted] = useState<Record<string, boolean>>({ mines: false, memory: false, recall: false });
  const [gameToggling, setGameToggling] = useState<Record<string, boolean>>({});

  interface RecallText { id: string; title: string; text_content: string; difficulty: string; disappears_after_reading: boolean; is_active: boolean; }
  const [recallTexts, setRecallTexts] = useState<RecallText[]>([]);
  const [showAddRecall, setShowAddRecall] = useState(false);
  const [newRecall, setNewRecall] = useState({ title: '', textContent: '', difficulty: 'Normal', disappearsAfterReading: false });
  const [recallSaving, setRecallSaving] = useState(false);
  const [recallUploadMode, setRecallUploadMode] = useState<'paste' | 'upload'>('paste');
  const [recallUploading, setRecallUploading] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: '', textContent: '', difficulty: 'Normal', disappearsAfterReading: false });
  const [editSaving, setEditSaving] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [sendEmails, setSendEmails] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  interface SendResult { credited: { email: string; username: string; amount: number }[]; notFound: string[]; }
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => {
        if (!d.isAdmin) { router.replace('/dashboard'); return; }
        setAuthorized(true);
        loadUsers();
        loadWithdrawals();
        loadSettings();
        loadGameStatus();
        loadRecallTexts();
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
  function loadGameStatus() {
    fetch('/api/games/status').then(r => r.json()).then(d => {
      setGameMuted({ mines: !!d.mines?.muted, memory: !!d.memory?.muted, recall: !!d.recall?.muted });
    }).catch(() => {});
  }
  function loadRecallTexts() {
    fetch('/api/admin/recall-texts').then(r => r.json()).then(d => setRecallTexts(d.texts ?? [])).catch(() => {});
  }
  async function uploadRecallFile(file: File, target: 'add' | 'edit' = 'add') {
    if (target === 'add') setRecallUploading(true);
    else setEditUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/recall/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (target === 'add') setRecallUploading(false);
    else setEditUploading(false);
    if (res.ok && data.text) {
      if (target === 'add') {
        const title = file.name.replace(/\.[^/.]+$/, '');
        setNewRecall(p => ({ ...p, title: p.title || title, textContent: data.text }));
      } else {
        setEditData(p => ({ ...p, textContent: data.text }));
      }
    } else {
      alert(data.error ?? 'Failed to extract text');
    }
  }

  async function sendMoney() {
    setSendLoading(true);
    setSendResult(null);
    const emails = sendEmails
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(Boolean);
    const res = await fetch('/api/admin/send-money', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails, amount: parseFloat(sendAmount) }),
    });
    const data = await res.json();
    setSendLoading(false);
    if (res.ok) setSendResult(data);
    else alert(data.error ?? 'Failed to send money');
  }
  async function addRecallText() {
    if (!newRecall.title.trim() || !newRecall.textContent.trim()) return;
    setRecallSaving(true);
    await fetch('/api/admin/recall-texts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecall),
    });
    setRecallSaving(false);
    setShowAddRecall(false);
    setRecallUploadMode('paste');
    setNewRecall({ title: '', textContent: '', difficulty: 'Normal', disappearsAfterReading: false });
    loadRecallTexts();
  }
  async function toggleTextActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/recall-texts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    loadRecallTexts();
  }
  async function updateRecallText(id: string) {
    setEditSaving(true);
    await fetch(`/api/admin/recall-texts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editData.title,
        textContent: editData.textContent,
        difficulty: editData.difficulty,
        disappearsAfterReading: editData.disappearsAfterReading,
      }),
    });
    setEditSaving(false);
    setEditingId(null);
    loadRecallTexts();
  }
  async function deleteRecallText(id: string) {
    if (!confirm('Delete this text?')) return;
    await fetch(`/api/admin/recall-texts/${id}`, { method: 'DELETE' });
    if (editingId === id) setEditingId(null);
    loadRecallTexts();
  }

  async function toggleGame(game: string, muted: boolean) {
    setGameToggling(prev => ({ ...prev, [game]: true }));
    await fetch('/api/admin/games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, muted }),
    });
    setGameMuted(prev => ({ ...prev, [game]: muted }));
    setGameToggling(prev => ({ ...prev, [game]: false }));
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
    { key: 'games' as const, label: 'Games' },
    { key: 'send' as const, label: 'Send Money' },
  ];

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const totalBalance = users.reduce((s, u) => s + u.balance, 0);

  return (
    <div className="min-h-screen bg-black pb-28 md:pb-10 md:pt-14">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-8 md:pt-6 pb-6 flex items-center gap-3">
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

        <div className="flex border-b border-white/[0.06] mb-6 overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-bold tracking-wide transition-colors whitespace-nowrap ${
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

        {tab === 'games' && (
          <div className="space-y-6">
            {/* Mute toggles */}
            <div className="space-y-3">
              <p className="text-white/40 text-xs uppercase tracking-wider">Game Availability</p>
              {[
                { key: 'mines',  label: 'Mines',       Icon: Gem,    desc: 'Minesweeper · Bet-based' },
                { key: 'memory', label: 'Memory',      Icon: Layers, desc: 'Card Match · Skill-based' },
                { key: 'recall', label: 'Text Recall', Icon: Brain,  desc: 'Fill blanks · Text-based' },
              ].map(g => {
                const isMuted = gameMuted[g.key];
                const toggling = gameToggling[g.key];
                return (
                  <div key={g.key} className="bg-[#111111] rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <g.Icon size={20} className="text-white/60" />
                      <div>
                        <p className="text-white font-bold text-sm">{g.label}</p>
                        <p className="text-white/30 text-xs">{g.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold ${isMuted ? 'text-red-400' : 'text-green-400'}`}>
                        {isMuted ? 'MUTED' : 'LIVE'}
                      </span>
                      <button
                        onClick={() => toggleGame(g.key, !isMuted)}
                        disabled={toggling}
                        className={`font-bold text-xs px-5 py-2 rounded-full transition-colors disabled:opacity-40 ${
                          isMuted ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500/80 text-white hover:bg-red-500'
                        }`}
                      >
                        {toggling ? '...' : isMuted ? 'Unmute' : 'Mute'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recall Texts management */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-xs uppercase tracking-wider">Recall Texts</p>
                <button
                  onClick={() => setShowAddRecall(v => !v)}
                  className="text-xs font-bold bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-100"
                >
                  {showAddRecall ? 'Cancel' : '+ Add Text'}
                </button>
              </div>

              {/* Hidden file input for add form */}
              <input
                ref={addFileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadRecallFile(f); e.target.value = ''; }}
              />

              {showAddRecall && (
                <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 mb-3 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Title</label>
                    <input
                      type="text"
                      value={newRecall.title}
                      onChange={e => setNewRecall(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. The Amazon River"
                      className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20"
                    />
                  </div>

                  {/* Content method toggle */}
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">Text Content</label>
                    <div className="flex gap-2 mb-3">
                      {(['paste', 'upload'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setRecallUploadMode(m)}
                          className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                            recallUploadMode === m
                              ? 'bg-white text-black'
                              : 'bg-[#1c1c1c] text-white/40 border border-white/[0.08] hover:text-white'
                          }`}
                        >
                          {m === 'paste' ? <><Pencil size={12} className="inline mr-1" />Paste</> : <><FileText size={12} className="inline mr-1" />PDF / DOCX</>}
                        </button>
                      ))}
                    </div>

                    {recallUploadMode === 'paste' ? (
                      <textarea
                        value={newRecall.textContent}
                        onChange={e => setNewRecall(p => ({ ...p, textContent: e.target.value }))}
                        rows={5}
                        placeholder="Write the passage users will read and recall..."
                        className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 resize-none"
                      />
                    ) : (
                      <div>
                        <button
                          onClick={() => addFileInputRef.current?.click()}
                          disabled={recallUploading}
                          className="w-full border-2 border-dashed border-white/15 rounded-xl p-6 text-center hover:border-white/25 transition-colors disabled:opacity-50"
                        >
                          <div className="flex justify-center mb-2">{recallUploading ? <Loader2 size={24} className="text-white/40 animate-spin" /> : newRecall.textContent ? <Check size={24} className="text-green-400" /> : <Upload size={24} className="text-white/30" />}</div>
                          <p className="text-white/50 text-sm">
                            {recallUploading ? 'Extracting...' : newRecall.textContent ? 'Extracted — tap to replace' : 'Tap to upload PDF or DOCX'}
                          </p>
                        </button>
                        {newRecall.textContent && (
                          <p className="text-white/25 text-xs mt-2 line-clamp-2">{newRecall.textContent.slice(0, 120)}…</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Difficulty + disappears */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white/40 text-xs uppercase tracking-wider block mb-1">Difficulty</label>
                      <select
                        value={newRecall.difficulty}
                        onChange={e => setNewRecall(p => ({ ...p, difficulty: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20"
                      >
                        {['Very Simple','Simple','Normal','Complex','Difficult'].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRecall.disappearsAfterReading}
                          onChange={e => setNewRecall(p => ({ ...p, disappearsAfterReading: e.target.checked }))}
                          className="w-4 h-4 accent-yellow-400"
                        />
                        <span className="text-white/60 text-xs">Disappears after reading</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={addRecallText}
                    disabled={recallSaving || recallUploading || !newRecall.title.trim() || !newRecall.textContent.trim()}
                    className="w-full bg-yellow-400 text-black font-bold text-sm py-3 rounded-full disabled:opacity-40 hover:bg-yellow-300 transition-colors"
                  >
                    {recallSaving ? 'Saving...' : 'Save Text'}
                  </button>
                </div>
              )}

              {recallTexts.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-6">No recall texts yet — add one above</p>
              ) : (
                <div className="space-y-2">
                  {recallTexts.map(t => (
                    <div key={t.id} className="bg-[#111111] rounded-2xl overflow-hidden">
                      {/* Row */}
                      <div className="p-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-white font-bold text-sm truncate">{t.title}</p>
                            <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full">{t.difficulty}</span>
                            {t.disappears_after_reading && <span className="text-[10px] text-orange-400">vanishes</span>}
                          </div>
                          <p className="text-white/30 text-xs line-clamp-2">{t.text_content}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          <button
                            onClick={() => toggleTextActive(t.id, !t.is_active)}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                              t.is_active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-white/10 text-white/40 hover:bg-white/15'
                            }`}
                          >
                            {t.is_active ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => {
                              if (editingId === t.id) { setEditingId(null); return; }
                              setEditingId(t.id);
                              setEditData({ title: t.title, textContent: t.text_content, difficulty: t.difficulty, disappearsAfterReading: t.disappears_after_reading });
                            }}
                            className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white/10 text-white/60 hover:bg-white/15 transition-colors"
                          >
                            {editingId === t.id ? 'Cancel' : 'Edit'}
                          </button>
                          <button
                            onClick={() => deleteRecallText(t.id)}
                            className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Inline edit form */}
                      {editingId === t.id && (
                        <div className="border-t border-white/[0.06] p-4 space-y-3 bg-[#0d0d0d]">
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept=".pdf,.docx"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadRecallFile(f, 'edit'); e.target.value = ''; }}
                          />
                          <div>
                            <label className="text-white/30 text-[10px] uppercase tracking-wider block mb-1">Title</label>
                            <input
                              type="text"
                              value={editData.title}
                              onChange={e => setEditData(p => ({ ...p, title: e.target.value }))}
                              className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-white/30 text-[10px] uppercase tracking-wider">Text Content</label>
                              <button
                                onClick={() => editFileInputRef.current?.click()}
                                disabled={editUploading}
                                className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
                              >
                                {editUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                                {editUploading ? 'Extracting...' : 'Upload PDF/DOCX'}
                              </button>
                            </div>
                            <textarea
                              value={editData.textContent}
                              onChange={e => setEditData(p => ({ ...p, textContent: e.target.value }))}
                              rows={4}
                              className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20 resize-none"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={editData.difficulty}
                              onChange={e => setEditData(p => ({ ...p, difficulty: e.target.value }))}
                              className="flex-1 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20"
                            >
                              {['Very Simple','Simple','Normal','Complex','Difficult'].map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                            <label className="flex items-center gap-2 cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={editData.disappearsAfterReading}
                                onChange={e => setEditData(p => ({ ...p, disappearsAfterReading: e.target.checked }))}
                                className="w-4 h-4 accent-yellow-400"
                              />
                              <span className="text-white/40 text-xs">Vanishes</span>
                            </label>
                          </div>
                          <button
                            onClick={() => updateRecallText(t.id)}
                            disabled={editSaving || !editData.title.trim() || !editData.textContent.trim()}
                            className="w-full bg-white text-black font-bold text-xs py-2.5 rounded-full disabled:opacity-40 hover:bg-gray-100 transition-colors"
                          >
                            {editSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {tab === 'send' && (
          <div className="space-y-4">
            <div className="bg-[#111111] rounded-2xl p-6 space-y-5">
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">
                  Email Addresses
                </label>
                <textarea
                  value={sendEmails}
                  onChange={e => setSendEmails(e.target.value)}
                  rows={5}
                  placeholder={"user@gmail.com\nother@gmail.com\nor comma-separated"}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-white/20 resize-none placeholder:text-white/20"
                />
                <p className="text-white/20 text-xs mt-1">One per line or comma-separated. Only existing users are credited.</p>
              </div>
              <div>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">
                  Amount to Send ($)
                </label>
                <input
                  type="number"
                  min="1"
                  value={sendAmount}
                  onChange={e => setSendAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-white/20"
                />
              </div>
              <button
                onClick={sendMoney}
                disabled={sendLoading || !sendEmails.trim() || !sendAmount || Number(sendAmount) <= 0}
                className="w-full bg-yellow-400 text-black font-bold py-4 rounded-full text-sm hover:bg-yellow-300 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {sendLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sendLoading ? 'Sending...' : 'Send Money'}
              </button>
            </div>

            {sendResult && (
              <div className="space-y-3">
                {sendResult.credited.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5">
                    <p className="text-green-400 font-bold text-sm mb-3 flex items-center gap-2">
                      <Check size={16} /> {sendResult.credited.length} user{sendResult.credited.length !== 1 ? 's' : ''} credited
                    </p>
                    <div className="space-y-2">
                      {sendResult.credited.map(c => (
                        <div key={c.email} className="flex items-center justify-between">
                          <div>
                            <p className="text-white text-sm font-bold">{c.username}</p>
                            <p className="text-white/40 text-xs">{c.email}</p>
                          </div>
                          <p className="text-green-400 font-mono font-bold text-sm">+${c.amount.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {sendResult.notFound.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
                    <p className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">
                      <X size={16} /> {sendResult.notFound.length} email{sendResult.notFound.length !== 1 ? 's' : ''} not found
                    </p>
                    <div className="space-y-1">
                      {sendResult.notFound.map(e => (
                        <p key={e} className="text-white/40 text-xs font-mono">{e}</p>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => { setSendResult(null); setSendEmails(''); setSendAmount(''); }}
                  className="w-full bg-[#111111] text-white/60 font-bold py-3 rounded-full text-sm border border-white/[0.08] hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
