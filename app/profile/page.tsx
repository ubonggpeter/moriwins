'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

interface User {
  username: string;
  email: string;
  balance: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => { if (d.username) setUser(d); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-[430px] mx-auto px-5">

        <div className="pt-12 pb-6">
          <h1 className="text-white font-bold text-lg">Profile</h1>
          <p className="text-white/30 text-xs mt-0.5">Your account</p>
        </div>

        <div className="bg-[#111111] rounded-2xl p-6 flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#1c1c1c] border border-white/10 flex items-center justify-center">
            <span className="text-white font-black text-xl">{initial}</span>
          </div>
          <div>
            <p className="text-white font-bold text-base">{user?.username ?? '—'}</p>
            <p className="text-white/40 text-xs mt-0.5">{user?.email ?? '—'}</p>
          </div>
        </div>

        <div className="bg-[#111111] rounded-2xl p-5 mb-4">
          <p className="text-white/40 text-xs tracking-wider mb-1">Cash Balance</p>
          <p className="text-yellow-400 font-mono font-black text-3xl">
            ${user?.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#111111] rounded-2xl p-4 text-center">
            <p className="text-white font-bold text-lg font-mono">2</p>
            <p className="text-white/30 text-[10px] tracking-wider mt-1 uppercase">Games Available</p>
          </div>
          <div className="bg-[#111111] rounded-2xl p-4 text-center">
            <p className="text-green-400 font-bold text-lg font-mono">Active</p>
            <p className="text-white/30 text-[10px] tracking-wider mt-1 uppercase">Account Status</p>
          </div>
        </div>

        <div className="bg-[#111111] rounded-2xl p-5 mb-4 space-y-3">
          <p className="text-white/30 text-xs tracking-widest uppercase">Account</p>
          <div className="space-y-3 divide-y divide-white/5">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Username</span>
              <span className="text-white text-sm font-mono">{user?.username ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-white/50 text-sm">Email</span>
              <span className="text-white text-sm font-mono truncate max-w-[180px]">{user?.email ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-white/50 text-sm">Account Type</span>
              <span className="text-white text-sm">Demo</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-full text-sm hover:bg-red-500/15 transition-all disabled:opacity-50"
        >
          {loggingOut ? 'Signing out...' : 'Sign Out'}
        </button>

      </div>
      <BottomNav />
    </div>
  );
}
