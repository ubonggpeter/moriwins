'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

interface User {
  username: string;
  email: string;
  balance: number;
}

const GAMES = [
  {
    title: 'MINES',
    subtitle: 'Minesweeper · Bet-based',
    icon: '💎',
    href: '/games/mines',
    desc: 'Reveal cells and avoid mines. Cash out anytime before you explode.',
    tag: 'HIGH RISK',
    tagColor: 'text-red-400 border-red-400/20',
  },
  {
    title: 'MEMORY',
    subtitle: 'Card Match · Skill-based',
    icon: '🃏',
    href: '/games/memory',
    desc: 'Memorize the card layout and match all pairs to win.',
    tag: 'SKILL',
    tagColor: 'text-blue-400 border-blue-400/20',
  },
  {
    title: 'DEPOSIT',
    subtitle: 'Add Funds',
    icon: '💰',
    href: '/deposit',
    desc: 'Add credits to your account via your preferred payment method.',
    tag: 'SECURE',
    tagColor: 'text-green-400 border-green-400/20',
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

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        {/* Balance hero */}
        <div className="border border-white/8 rounded-xl p-8 bg-gradient-to-br from-white/4 to-transparent mb-8">
          <p className="text-white/30 text-xs tracking-widest uppercase mb-2">Your Balance</p>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-black text-yellow-400 font-mono">
              ${user?.balance.toLocaleString() ?? '—'}
            </span>
            <span className="text-white/20 text-sm mb-1.5 font-mono">CREDITS</span>
          </div>
          {user && (
            <p className="text-white/30 text-sm mt-3">
              Welcome back, <span className="text-white font-semibold">{user.username}</span>
            </p>
          )}
        </div>

        {/* Game cards */}
        <div className="mb-4">
          <p className="text-white/20 text-xs tracking-widest uppercase mb-4">Choose a Game</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {GAMES.map(g => (
              <Link
                key={g.title}
                href={g.href}
                className="group border border-white/8 rounded-lg p-5 bg-white/2 hover:bg-white/5 hover:border-white/25 transition-all flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{g.icon}</span>
                  <span className={`text-[10px] tracking-widest border px-2 py-0.5 rounded ${g.tagColor}`}>
                    {g.tag}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-bold tracking-widest text-sm">{g.title}</h3>
                  <p className="text-white/30 text-[10px] tracking-wider mt-0.5">{g.subtitle}</p>
                </div>
                <p className="text-white/35 text-xs leading-relaxed flex-1">{g.desc}</p>
                <div className="flex items-center gap-1 text-white/40 group-hover:text-white transition-colors text-xs font-medium">
                  Play now <span className="text-base leading-none">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { label: 'Balance', value: `$${user?.balance.toLocaleString() ?? 0}`, color: 'text-yellow-400' },
            { label: 'Status', value: 'Active', color: 'text-green-400' },
            { label: 'Games', value: '2', color: 'text-white' },
          ].map(s => (
            <div key={s.label} className="border border-white/8 rounded-lg p-4 text-center">
              <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-white/30 text-xs tracking-wider mt-1 uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
