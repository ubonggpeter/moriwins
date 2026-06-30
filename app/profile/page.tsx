'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

interface User {
  username: string;
  email: string;
  fullName: string;
  balance: number;
  totalGameWinnings: number;
  referralEarnings: number;
  avatarUrl: string | null;
}

// Compress + crop image to 200×200 JPEG via canvas
function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const SIZE = 200;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d')!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = url;
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');

  // full name state
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState('');
  const [nameOk, setNameOk] = useState(false);

  // change-password state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwOk, setPwOk] = useState(false);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => {
        if (d.username) {
          setUser(d);
          setAvatarUrl(d.avatarUrl ?? null);
          setNameInput(d.fullName ?? '');
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarMsg('');
    try {
      const compressed = await compressImage(file);
      const res = await fetch('/api/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: compressed }),
      });
      const data = await res.json();
      if (res.ok) {
        setAvatarUrl(compressed);
        setAvatarMsg('Photo updated!');
      } else {
        setAvatarMsg(data.error ?? 'Upload failed');
      }
    } catch {
      setAvatarMsg('Upload failed — please try again.');
    } finally {
      setAvatarUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameSaving(true);
    setNameMsg('');
    setNameOk(false);
    try {
      const res = await fetch('/api/user/name', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: nameInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setNameOk(true);
        setNameMsg('Name updated!');
        setUser(u => u ? { ...u, fullName: data.fullName } : u);
      } else {
        setNameMsg(data.error ?? 'Failed to save name');
      }
    } catch {
      setNameMsg('Network error — please try again.');
    } finally {
      setNameSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true);
    setPwMsg('');
    setPwOk(false);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pwForm.current,
          newPassword: pwForm.next,
          confirmPassword: pwForm.confirm,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwOk(true);
        setPwMsg('Password changed successfully!');
        setPwForm({ current: '', next: '', confirm: '' });
      } else {
        setPwMsg(data.error ?? 'Failed to change password');
      }
    } catch {
      setPwMsg('Network error — please try again.');
    } finally {
      setPwLoading(false);
    }
  }

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-black pb-28 md:pb-10 md:pt-14">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">

        <div className="pt-12 pb-6">
          <h1 className="text-white font-black text-2xl">Profile</h1>
          <p className="text-white/30 text-xs mt-0.5">Manage your account</p>
        </div>

        {/* Avatar + info */}
        <div className="bg-[#111111] rounded-2xl p-6 flex items-center gap-5 mb-4">
          <div className="relative shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="relative w-20 h-20 rounded-full overflow-hidden bg-[#1c1c1c] border-2 border-white/10 flex items-center justify-center group"
              title="Tap to change photo"
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> /* eslint-disable-line @next/next/no-img-element */
                : <span className="text-white font-black text-3xl">{initial}</span>}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <span className="text-white text-xs font-bold">{avatarUploading ? '...' : 'Edit'}</span>
              </div>
            </button>
            {/* Camera badge */}
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center pointer-events-none">
              <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg truncate">{user?.username ?? '—'}</p>
            <p className="text-white/40 text-xs mt-0.5 truncate">{user?.email ?? '—'}</p>
            {avatarMsg && (
              <p className={`text-xs mt-2 font-medium ${avatarMsg.includes('updated') ? 'text-green-400' : 'text-red-400'}`}>
                {avatarMsg}
              </p>
            )}
            <p className="text-white/20 text-xs mt-2">Tap photo to change</p>
          </div>
        </div>

        {/* Balance */}
        <div className="bg-[#111111] rounded-2xl p-5 mb-4">
          <p className="text-white/40 text-xs tracking-wider mb-1">Cash Balance</p>
          <p className="text-yellow-400 font-mono font-black text-3xl">
            ${user?.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#111111] rounded-2xl p-4 text-center">
            <p className="text-green-400 font-bold text-lg font-mono">
              ${user?.totalGameWinnings?.toLocaleString() ?? 0}
            </p>
            <p className="text-white/30 text-[10px] tracking-wider mt-1 uppercase">Game Winnings</p>
          </div>
          <div className="bg-[#111111] rounded-2xl p-4 text-center">
            <p className="text-blue-400 font-bold text-lg font-mono">
              ${user?.referralEarnings?.toLocaleString() ?? 0}
            </p>
            <p className="text-white/30 text-[10px] tracking-wider mt-1 uppercase">Referral Earned</p>
          </div>
        </div>

        {/* Account info */}
        <div className="bg-[#111111] rounded-2xl p-5 mb-4 space-y-3">
          <p className="text-white/40 text-xs tracking-widest uppercase">Account Details</p>
          <div className="space-y-3 divide-y divide-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Username</span>
              <span className="text-white text-sm font-mono">{user?.username ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-white/50 text-sm">Email</span>
              <span className="text-white text-sm font-mono truncate max-w-[180px]">{user?.email ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-white/50 text-sm">Status</span>
              <span className="text-green-400 text-sm font-medium">Active</span>
            </div>
          </div>
        </div>

        {/* Full Name */}
        <div className="bg-[#111111] rounded-2xl p-5 mb-4">
          <p className="text-white font-bold text-sm mb-4">Display Name</p>
          <form onSubmit={handleSaveName} className="space-y-3">
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">Full Name</label>
              <input
                type="text"
                maxLength={100}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="First and last name"
                className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-white/20"
              />
            </div>
            {nameMsg && (
              <p className={`text-xs px-4 py-3 rounded-xl border ${nameOk ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                {nameMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={nameSaving}
              className="w-full bg-white text-black font-bold py-3.5 rounded-full text-sm disabled:opacity-40 mt-1"
            >
              {nameSaving ? 'Saving...' : 'Save Name'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-[#111111] rounded-2xl p-5 mb-4">
          <p className="text-white font-bold text-sm mb-4">Change Password</p>
          <form onSubmit={handleChangePassword} className="space-y-3">
            {[
              { label: 'Current Password', key: 'current' as const, ph: 'Your current password' },
              { label: 'New Password', key: 'next' as const, ph: 'At least 6 characters' },
              { label: 'Confirm New Password', key: 'confirm' as const, ph: 'Repeat new password' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">{f.label}</label>
                <input
                  type="password"
                  required
                  minLength={f.key === 'current' ? 1 : 6}
                  value={pwForm[f.key]}
                  onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.ph}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 placeholder:text-white/20"
                />
              </div>
            ))}

            {pwMsg && (
              <p className={`text-xs px-4 py-3 rounded-xl border ${pwOk ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                {pwMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full bg-white text-black font-bold py-3.5 rounded-full text-sm disabled:opacity-40 mt-1"
            >
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-full text-sm hover:bg-red-500/15 transition-all disabled:opacity-50 mb-4"
        >
          {loggingOut ? 'Signing out...' : 'Sign Out'}
        </button>

      </div>
      <BottomNav />
    </div>
  );
}
