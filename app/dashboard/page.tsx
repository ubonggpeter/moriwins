'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

interface User {
  username: string;
  email: string;
  balance: number;
}

const GAMES = [
  {
    title: 'Mines',
    desc: 'Reveal cells and avoid mines',
    icon: '💎',
    href: '/games/mines',
    tag: 'HIGH RISK',
    tagColor: 'text-red-400',
  },
  {
    title: 'Memory',
    desc: 'Match all pairs before time runs out',
    icon: '🃏',
    href: '/games/memory',
    tag: 'SKILL',
    tagColor: 'text-blue-400',
  },
];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => { if (d.username) setUser(d); })
      .catch(() => {});
  }, []);

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="max-w-[430px] mx-auto px-5">

        {/* Header */}
        <div className="flex items-center justify-between pt-12 pb-6">
          <div>
            <p className="text-white/40 text-xs tracking-wider">Welcome back</p>
            <p className="text-white font-bold text-lg mt-0.5">{user?.username ?? '—'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-white/10 flex items-center justify-center">
            <span className="text-white font-bold text-sm">{initial}</span>
          </div>
        </div>

        {/* Balance card */}
        <div className="bg-[#111111] rounded-2xl p-6 mb-4">
          <p className="text-white/40 text-xs tracking-wider mb-1">Cash balance</p>
          <p className="text-yellow-400 font-mono font-black text-4xl mb-5">
            ${user?.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
          </p>
          <div className="flex gap-3">
            <Link
              href="/deposit"
              className="flex-1 bg-white text-black font-bold text-sm py-3 rounded-full text-center"
            >
              Add Money
            </Link>
            <button
              disabled
              className="flex-1 bg-[#1c1c1c] text-white/60 font-bold text-sm py-3 rounded-full cursor-not-allowed"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Daily goal */}
        <div className="bg-[#111111] rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/50 text-xs tracking-wider">Daily Goal</p>
            <p className="text-white/50 text-xs font-mono">$0 / $500</p>
          </div>
          <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full" style={{ width: '0%' }} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Balance', value: `$${user?.balance.toLocaleString() ?? 0}`, color: 'text-yellow-400' },
            { label: 'Status', value: 'Active', color: 'text-green-400' },
            { label: 'Games', value: '2', color: 'text-white' },
          ].map(s => (
            <div key={s.label} className="bg-[#111111] rounded-2xl p-4 text-center">
              <p className={`text-base font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-white/30 text-[10px] tracking-wider mt-1 uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Game cards */}
        <p className="text-white/30 text-xs tracking-widest uppercase mb-3">Play Now</p>
        <div className="space-y-3">
          {GAMES.map(g => (
            <Link
              key={g.title}
              href={g.href}
              className="bg-[#111111] rounded-2xl p-5 flex items-center gap-4 group"
            >
              <span className="text-3xl">{g.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-bold text-sm">{g.title}</p>
                  <span className={`text-[9px] tracking-wider ${g.tagColor}`}>{g.tag}</span>
                </div>
                <p className="text-white/35 text-xs truncate">{g.desc}</p>
              </div>
              <div className="bg-white text-black font-bold text-xs px-4 py-2 rounded-full shrink-0">
                Play
              </div>
            </Link>
          ))}
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
